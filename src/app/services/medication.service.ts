import { Injectable, signal, effect, inject, Injector } from '@angular/core';
import { Medication, Dose } from '../models/medication.model';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { PatientSelectorService } from './patient-selector.service';
import { LogService } from './log.service';
import { TranslationService } from './translation.service';
import { CareNetworkService } from './care-network.service';
import { IndexedDBService } from './indexed-db.service';
import { OfflineSyncService } from './offline-sync.service';
import { collection, Firestore, addDoc, onSnapshot, Unsubscribe, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class MedicationService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly logService = inject(LogService);
  private readonly translationService = inject(TranslationService);
  private readonly careNetworkService = inject(CareNetworkService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly offlineSync = inject(OfflineSyncService);
  private readonly injector = inject(Injector);
  private readonly firestore: Firestore;

  private readonly _medications = signal<Medication[]>([]);
  private medicationSubscription: Unsubscribe | null = null;
  
  /**
   * Medications for the currently active patient
   */
  public readonly medications = this._medications.asReadonly();

  constructor() {
    this.firestore = this.firebaseService.firestore;

    // Listen to active patient changes and load their medications
    effect((onCleanup) => {
        const activePatientId = this.patientSelectorService.activePatientId();
        const permissionsSynced = this.careNetworkService.permissionsSynced();
        const isOnline = this.offlineSync.isOnline();
        
        this.logService.debug('MedicationService', `Effect triggered - activePatientId: ${activePatientId}, permissionsSynced: ${permissionsSynced}, isOnline: ${isOnline}`);
        
        this.cleanupSubscription();

        if (activePatientId) {
            // Load from cache first
            this.loadFromCache(activePatientId);

            // CRITICAL: Wait for permissions to be synced before accessing Firestore
            if (permissionsSynced && isOnline) {
                this.logService.debug('MedicationService', `✅ Starting Firestore listener for patient: ${activePatientId}`);
                // Load medications from the ACTIVE PATIENT's document
                const medsCol = collection(this.firestore, `users/${activePatientId}/medications`);
                
                this.medicationSubscription = onSnapshot(medsCol, async (snapshot) => {
                    const meds = snapshot.docs.map(doc => ({ 
                        ...doc.data(),
                        id: doc.id, 
                        userId: activePatientId,
                        lastModified: new Date()
                    } as Medication));
                    this.logService.debug('MedicationService', `Received ${meds.length} medications from Firestore`);
                    this._medications.set(meds);
                    
                    // Cache medications in IndexedDB
                    await this.cacheToIndexedDB(meds);
                }, (error) => {
                    this.logService.error('MedicationService', 'Firestore listener error', error);
                    // Fallback to cache on error
                    this.loadFromCache(activePatientId);
                });
            } else if (!permissionsSynced) {
                this.logService.debug('MedicationService', '⏸️ Waiting for permissions to sync...');
            } else if (!isOnline) {
                this.logService.info('MedicationService', '📴 Offline mode - using cached data');
            }
        } else {
            this.logService.debug('MedicationService', '⏸️ Waiting for active patient ID');
            this._medications.set([]);
        }

        onCleanup(() => this.cleanupSubscription());
    });
  }

  private cleanupSubscription() {
      if (this.medicationSubscription) {
          this.medicationSubscription();
          this.medicationSubscription = null;
      }
  }

  getMedicationById(id: string): Medication | undefined {
    return this.medications().find(med => med.id === id);
  }

  /**
   * Load medications from IndexedDB cache
   */
  private async loadFromCache(userId: string): Promise<void> {
    try {
      const cachedMeds = await this.indexedDB.getByIndex<Medication>('medications', 'userId', userId);
      if (cachedMeds.length > 0) {
        this.logService.debug('MedicationService', `Loaded ${cachedMeds.length} medications from cache`);
        this._medications.set(cachedMeds);
      }
    } catch (error: any) {
      this.logService.error('MedicationService', 'Failed to load from cache', error as Error);
    }
  }

  /**
   * Cache medications to IndexedDB
   */
  private async cacheToIndexedDB(medications: Medication[]): Promise<void> {
    try {
      await this.indexedDB.putBatch('medications', medications);
      this.logService.debug('MedicationService', `Cached ${medications.length} medications to IndexedDB`);
    } catch (error: any) {
      this.logService.error('MedicationService', 'Failed to cache to IndexedDB', error as Error);
    }
  }

  /**
   * Add medication to the currently active patient's document
   */
  async addMedication(medicationData: Omit<Medication, 'id'>) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");
    
    const isOnline = this.offlineSync.isOnline();
    
    if (isOnline) {
      // Online: Save to Firestore
      const medsCol = collection(this.firestore, `users/${activePatientId}/medications`);
      const docRef = await addDoc(medsCol, medicationData);
      
      const message = this.translationService.instant('HISTORY.EVENTS.ADD_MED', { 
        medication: medicationData.name,
        patient: activePatient.name
      });
      await this.logService.addLog('add_med', message, activePatientId);
      
      // Update family notifications
      await this.updateFamilyNotifications();
      
      return docRef;
    }
    
    // Offline: Queue operation
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const tempMed: Medication = {
      id: tempId,
      userId: activePatientId,
      lastModified: new Date(),
      ...medicationData
    } as Medication;
    
    // Add to local cache
    await this.indexedDB.put('medications', tempMed);
    
    // Update signal
    const currentMeds = this._medications();
    this._medications.set([...currentMeds, tempMed]);
    
    // Queue for sync
    this.offlineSync.queueOperation(
      'create',
      `users/${activePatientId}/medications`,
      tempId,
      medicationData,
      'high'
    );
    
    this.logService.debug('MedicationService', `Medication queued for sync: ${medicationData.name}`);
    
    // Update family notifications
    await this.updateFamilyNotifications();
    
    return { id: tempId } as any;
  }

  /**
   * Update medication in the currently active patient's document
   */
  async updateMedication(medId: string, medicationData: Partial<Medication>) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");
    
    const isOnline = this.offlineSync.isOnline();
    
    if (isOnline) {
      // Online: Update Firestore
      const medDocRef = doc(this.firestore, `users/${activePatientId}/medications`, medId);
      await updateDoc(medDocRef, medicationData);
      
      const message = this.translationService.instant('HISTORY.EVENTS.UPDATE_MED', { 
        medication: medicationData.name || 'details',
        patient: activePatient.name
      });
      await this.logService.addLog('update_med', message, activePatientId);
      
      // Update family notifications
      await this.updateFamilyNotifications();
    } else {
      // Offline: Update cache and queue
      const cachedMed = await this.indexedDB.get<Medication>('medications', medId);
      if (cachedMed) {
        const updatedMed = { ...cachedMed, ...medicationData, lastModified: new Date() };
        await this.indexedDB.put('medications', updatedMed);
        
        // Update signal
        const currentMeds = this._medications();
        const index = currentMeds.findIndex(m => m.id === medId);
        if (index !== -1) {
          const newMeds = [...currentMeds];
          newMeds[index] = updatedMed;
          this._medications.set(newMeds);
        }
      }
      
      // Queue for sync
      this.offlineSync.queueOperation(
        'update',
        `users/${activePatientId}/medications`,
        medId,
        medicationData,
        'high'
      );
      
      this.logService.debug('MedicationService', `Medication update queued for sync: ${medId}`);
      
      // Update family notifications
      await this.updateFamilyNotifications();
    }
  }

  /**
   * Delete medication from the currently active patient's document
   */
  async deleteMedication(medId: string, medName: string) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");
    
    const isOnline = this.offlineSync.isOnline();
    
    if (isOnline) {
      // Online: Delete from Firestore
      const medDocRef = doc(this.firestore, `users/${activePatientId}/medications`, medId);
      await deleteDoc(medDocRef);
      
      const message = this.translationService.instant('HISTORY.EVENTS.DELETE_MED', { 
        medication: medName,
        patient: activePatient.name
      });
      await this.logService.addLog('delete_med', message, activePatientId);
    } else {
      // Offline: Delete from cache and queue
      await this.indexedDB.delete('medications', medId);
      
      // Update signal
      const currentMeds = this._medications();
      this._medications.set(currentMeds.filter(m => m.id !== medId));
      
      // Queue for sync
      this.offlineSync.queueOperation(
        'delete',
        `users/${activePatientId}/medications`,
        medId,
        undefined,
        'high'
      );
      
      this.logService.debug('MedicationService', `Medication deletion queued for sync: ${medId}`);
      
      // Update family notifications
      await this.updateFamilyNotifications();
    }
  }
  
  /**
   * Update dose status for a medication in the active patient's document
   */
  async updateDoseStatus(medId: string, time: string, status: Dose['status'], adminName: string, notes?: string) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");
    
    const user = this.authService.currentUser();
    if (!user) throw new Error("No user logged in");

    const isOnline = this.offlineSync.isOnline();
    
    // Get medication (from cache or Firestore)
    let medication: Medication | undefined;
    if (isOnline) {
      const medDocRef = doc(this.firestore, `users/${activePatientId}/medications`, medId);
      const medDoc = await getDoc(medDocRef);
      if (!medDoc.exists()) throw new Error("Medication not found");
      medication = medDoc.data() as Medication;
    } else {
      medication = await this.indexedDB.get<Medication>('medications', medId);
      if (!medication) throw new Error("Medication not found in cache");
    }

    const schedule = medication.schedule.map(dose => {
        if (dose.time === time) {
            const updatedDose: Dose = { ...dose, status };
            if (status === 'taken' || status === 'missed') {
                updatedDose.administeredBy = { id: user.uid, name: adminName };
                if (notes) {
                    updatedDose.notes = notes;
                }
            } else { // upcoming
                delete updatedDose.administeredBy;
                delete updatedDose.notes;
            }
            return updatedDose;
        }
        return dose;
    });

    if (isOnline) {
      // Online: Update Firestore
      const medDocRef = doc(this.firestore, `users/${activePatientId}/medications`, medId);
      await updateDoc(medDocRef, { schedule });
      
      if (status === 'taken' || status === 'missed') {
        const translationKey = status === 'taken' ? 'HISTORY.EVENTS.TAKEN' : 'HISTORY.EVENTS.MISSED';
        const message = this.translationService.instant(translationKey, { 
          medication: medication.name, 
          patient: activePatient.name 
        });
        await this.logService.addLog(status, message, activePatientId);
      }
    } else {
      // Offline: Update cache and queue (CRITICAL OPERATION)
      const updatedMed = { ...medication, schedule, lastModified: new Date() };
      await this.indexedDB.put('medications', updatedMed);
      
      // Update signal
      const currentMeds = this._medications();
      const index = currentMeds.findIndex(m => m.id === medId);
      if (index !== -1) {
        const newMeds = [...currentMeds];
        newMeds[index] = updatedMed;
        this._medications.set(newMeds);
      }
      
      // Queue for sync with CRITICAL priority
      this.offlineSync.queueOperation(
        'update',
        `users/${activePatientId}/medications`,
        medId,
        { schedule },
        'critical'
      );
      
      this.logService.info('MedicationService', `Dose status update queued (CRITICAL): ${medId} - ${status}`);
    }
  }

  /**
   * Phase B: Update medication stock
   * @param medId Medication ID
   * @param newStock New stock value
   */
  async updateMedicationStock(medId: string, newStock: number) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient");

    const medDocRef = doc(this.firestore, `users/${activePatientId}/medications`, medId);
    await updateDoc(medDocRef, { 
      currentStock: newStock,
      stock: newStock // Also update deprecated field for backward compatibility
    });
  }

  /**
   * Phase B: Archive medication (non-continuous with zero stock)
   * @param medId Medication ID
   */
  async archiveMedication(medId: string) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient");

    const medDocRef = doc(this.firestore, `users/${activePatientId}/medications`, medId);
    await updateDoc(medDocRef, { 
      isArchived: true,
      archivedAt: new Date()
    });
  }

  /**
   * Phase B: Unarchive medication
   * @param medId Medication ID
   */
  async unarchiveMedication(medId: string) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient");

    const medDocRef = doc(this.firestore, `users/${activePatientId}/medications`, medId);
    await updateDoc(medDocRef, { 
      isArchived: false,
      archivedAt: null
    });
  }

  /**
   * Update family notifications when medications change
   * Silently fails if FamilyNotificationService is not available
   * Uses lazy injection to avoid circular dependency
   */
  private async updateFamilyNotifications(): Promise<void> {
    try {
      // Lazy inject to break circular dependency
      const { FamilyNotificationService } = await import('./family-notification.service');
      const familyNotificationService = this.injector.get(FamilyNotificationService);
      await familyNotificationService.updateNotifications();
      this.logService.debug('MedicationService', 'Family notifications updated');
    } catch (error: any) {
      this.logService.warn('MedicationService', 'Failed to update family notifications', error as Error);
      // Don't throw - family notifications are optional
    }
  }
}

