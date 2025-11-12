/**
 * Medication Service V2 (DDD Facade)
 * 
 * Facade pattern that maintains backward compatibility with existing API
 * while delegating to DDD use cases and domain services internally.
 * 
 * Migration Strategy (Strangler Fig Pattern):
 * 1. This service coexists with original MedicationService
 * 2. New code uses MedicationServiceV2
 * 3. Gradually migrate existing code
 * 4. Eventually replace original MedicationService
 * 
 * Architecture:
 * - Presentation Layer → MedicationServiceV2 (Facade)
 * - MedicationServiceV2 → Use Cases (Application Layer)
 * - Use Cases → Domain Entities + Services + Repository
 */

import { Injectable, signal, effect, inject, Injector } from '@angular/core';

// Domain
import { MedicationEntity } from '../core/domain/medication/medication.entity';
import { StockService } from '../core/domain/medication/services/stock.service';
import { ValidationService } from '../core/domain/medication/services/validation.service';

// Infrastructure
import { IMedicationRepository } from '../core/repositories/medication.repository.interface';
import { MedicationRepository } from '../infrastructure/repositories/medication.repository';

// Use Cases
import {
  AddMedicationUseCase,
  UpdateMedicationUseCase,
  DeleteMedicationUseCase,
  RecordDoseUseCase
} from '../application/use-cases/medication';

// Legacy models (for backward compatibility)
import { Medication, Dose } from '../models/medication.model';

// Services
import { AuthService } from './auth.service';
import { PatientSelectorService } from './patient-selector.service';
import { LogService } from './log.service';
import { TranslationService } from './translation.service';
import { AnalyticsService } from './analytics.service';

/**
 * Medication Service V2 - DDD Facade
 * 
 * Maintains same public API as original MedicationService
 * but uses DDD architecture internally.
 */
@Injectable({
  providedIn: 'root'
})
export class MedicationServiceV2 {
  // Dependencies (Use Cases)
  private readonly addMedicationUseCase = inject(AddMedicationUseCase);
  private readonly updateMedicationUseCase = inject(UpdateMedicationUseCase);
  private readonly deleteMedicationUseCase = inject(DeleteMedicationUseCase);
  private readonly recordDoseUseCase = inject(RecordDoseUseCase);
  
  // Dependencies (Repository)
  private readonly repository: IMedicationRepository = inject(MedicationRepository);
  
  // Dependencies (Services)
  private readonly authService = inject(AuthService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly logService = inject(LogService);
  private readonly translationService = inject(TranslationService);
  private readonly analytics = inject(AnalyticsService);
  private readonly injector = inject(Injector);

  // State (Signal-based reactive state)
  private readonly _medications = signal<Medication[]>([]);
  private readonly _medicationEntities = signal<MedicationEntity[]>([]);
  
  /**
   * Medications for the currently active patient (backward compatible)
   */
  public readonly medications = this._medications.asReadonly();
  
  /**
   * Medication entities (new DDD API)
   */
  public readonly medicationEntities = this._medicationEntities.asReadonly();

  constructor() {
    // Listen to active patient changes and load their medications
    effect(() => {
      const activePatientId = this.patientSelectorService.activePatientId();
      
      if (activePatientId) {
        this.loadMedications(activePatientId);
      } else {
        this._medications.set([]);
        this._medicationEntities.set([]);
      }
    });
  }

  // =====================================================
  // PUBLIC API (Backward Compatible with original)
  // =====================================================

  /**
   * Get medication by ID (backward compatible)
   */
  getMedicationById(id: string): Medication | undefined {
    return this.medications().find(med => med.id === id);
  }

  /**
   * Get medication entity by ID (new DDD API)
   */
  async getMedicationEntityById(id: string): Promise<MedicationEntity | null> {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) return null;
    
    return await this.repository.findById(id, activePatientId);
  }

  /**
   * Add medication (backward compatible)
   * Delegates to AddMedicationUseCase internally
   */
  async addMedication(medicationData: Omit<Medication, 'id'>): Promise<{ id: string }> {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");

    // Convert DTO to Command
    const command = {
      userId: activePatientId,
      name: medicationData.name,
      dosage: medicationData.dosage,
      frequency: medicationData.frequency,
      startTime: medicationData.schedule?.[0]?.time || '08:00',
      notes: medicationData.notes,
      currentStock: medicationData.currentStock ?? medicationData.stock ?? 0,
      stockUnit: medicationData.stockUnit ?? 'unidades'
    };

    // Execute use case
    const result = await this.addMedicationUseCase.execute(command);

    if (!result.success) {
      // Log error
      this.logService.error('MedicationServiceV2', 'Add medication failed', new Error(result.error || 'Unknown error'));
      
      // Track analytics
      this.analytics.logEvent('medication_add_failed', {
        error: result.error,
        validation_errors: result.validation?.errors.length ?? 0
      });
      
      throw new Error(result.error || 'Falha ao adicionar medicamento');
    }

    // Log success (backward compatibility)
    const message = this.translationService.instant('HISTORY.EVENTS.ADD_MED', { 
      medication: medicationData.name,
      patient: activePatient.name
    });
    await this.logService.addLog('add_med', message, activePatientId);

    // Track analytics
    this.analytics.logEvent('medication_added', {
      medication_name: medicationData.name,
      has_stock: (medicationData.currentStock ?? 0) > 0,
      frequency: medicationData.frequency
    });

    // Update family notifications (backward compatibility)
    await this.updateFamilyNotifications();

    return { id: result.medication!.id };
  }

  /**
   * Update medication (backward compatible)
   * Delegates to UpdateMedicationUseCase internally
   */
  async updateMedication(medId: string, medicationData: Partial<Medication>): Promise<void> {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");

    // Convert DTO to Command
    const command = {
      medicationId: medId,
      userId: activePatientId,
      updates: {
        name: medicationData.name,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        notes: medicationData.notes,
        currentStock: medicationData.currentStock ?? medicationData.stock,
        stockUnit: medicationData.stockUnit
      },
      regenerateSchedule: !!medicationData.frequency
    };

    // Execute use case
    const result = await this.updateMedicationUseCase.execute(command);

    if (!result.success) {
      this.logService.error('MedicationServiceV2', 'Update medication failed', new Error(result.error || 'Unknown error'));
      
      this.analytics.logEvent('medication_update_failed', {
        error: result.error,
        medication_id: medId
      });
      
      throw new Error(result.error || 'Falha ao atualizar medicamento');
    }

    // Log success (backward compatibility)
    const message = this.translationService.instant('HISTORY.EVENTS.UPDATE_MED', { 
      medication: medicationData.name || 'details',
      patient: activePatient.name
    });
    await this.logService.addLog('update_med', message, activePatientId);

    // Track analytics
    this.analytics.logEvent('medication_updated', {
      medication_id: medId,
      fields_updated: Object.keys(medicationData).length
    });

    // Update family notifications
    await this.updateFamilyNotifications();
  }

  /**
   * Delete medication (backward compatible)
   * Delegates to DeleteMedicationUseCase internally
   */
  async deleteMedication(medId: string, medName: string): Promise<void> {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");

    // Convert to Command
    const command = {
      medicationId: medId,
      userId: activePatientId,
      medicationName: medName,
      confirmDeletion: true
    };

    // Execute use case
    const result = await this.deleteMedicationUseCase.execute(command);

    if (!result.success) {
      this.logService.error('MedicationServiceV2', 'Delete medication failed', new Error(result.error || 'Unknown error'));
      
      this.analytics.logEvent('medication_delete_failed', {
        error: result.error,
        medication_id: medId
      });
      
      throw new Error(result.error || 'Falha ao excluir medicamento');
    }

    // Log success (backward compatibility)
    const message = this.translationService.instant('HISTORY.EVENTS.DELETE_MED', { 
      medication: medName,
      patient: activePatient.name
    });
    await this.logService.addLog('delete_med', message, activePatientId);

    // Track analytics
    this.analytics.logEvent('medication_deleted', {
      medication_id: medId,
      medication_name: medName
    });

    // Update family notifications
    await this.updateFamilyNotifications();
  }

  /**
   * Update dose status (backward compatible)
   * Delegates to RecordDoseUseCase internally
   */
  async updateDoseStatus(
    medId: string,
    time: string,
    status: Dose['status'],
    adminName: string,
    notes?: string
  ): Promise<void> {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) throw new Error("No active patient selected");
    
    const activePatient = this.patientSelectorService.activePatient();
    if (!activePatient) throw new Error("Active patient not found");
    
    const user = this.authService.currentUser();
    if (!user) throw new Error("No user logged in");

    // Only record if status is taken or missed
    if (status !== 'taken' && status !== 'missed') {
      // For 'upcoming', just update directly (backward compatibility)
      await this.updateMedication(medId, {
        schedule: [] // This will be handled by the entity
      });
      return;
    }

    // Convert to Command
    const command = {
      medicationId: medId,
      userId: activePatientId,
      time,
      status,
      administeredBy: {
        id: user.uid,
        name: adminName
      },
      notes,
      decreaseStock: status === 'taken'
    };

    // Execute use case
    const result = await this.recordDoseUseCase.execute(command);

    if (!result.success) {
      this.logService.error('MedicationServiceV2', 'Record dose failed', new Error(result.error || 'Unknown error'));
      
      this.analytics.logEvent('dose_record_failed', {
        error: result.error,
        medication_id: medId,
        status
      });
      
      throw new Error(result.error || 'Falha ao registrar dose');
    }

    // Log success (backward compatibility)
    const medication = await this.getMedicationEntityById(medId);
    if (medication) {
      const translationKey = status === 'taken' ? 'HISTORY.EVENTS.TAKEN' : 'HISTORY.EVENTS.MISSED';
      const message = this.translationService.instant(translationKey, { 
        medication: medication.name, 
        patient: activePatient.name 
      });
      await this.logService.addLog(status, message, activePatientId);
    }

    // Track analytics
    this.analytics.logEvent(`dose_${status}`, {
      medication_id: medId,
      time,
      has_notes: !!notes,
      stock_warning: !!result.stockWarning
    });

    // Show stock warning if present
    if (result.stockWarning) {
      this.logService.warn('MedicationServiceV2', 'Stock warning', { warning: result.stockWarning });
      // UI can listen to this via toast/alert
    }
  }

  /**
   * Update medication stock (backward compatible)
   */
  async updateMedicationStock(medId: string, newStock: number): Promise<void> {
    await this.updateMedication(medId, { currentStock: newStock, stock: newStock });
  }

  /**
   * Archive medication (backward compatible)
   */
  async archiveMedication(medId: string): Promise<void> {
    const medication = await this.getMedicationEntityById(medId);
    if (!medication) throw new Error('Medication not found');
    
    // Use domain logic
    medication.archive();
    
    // Save
    await this.repository.save(medication);
    
    // Track analytics
    this.analytics.logEvent('medication_archived', {
      medication_id: medId,
      medication_name: medication.name
    });
  }

  /**
   * Unarchive medication (backward compatible)
   */
  async unarchiveMedication(medId: string): Promise<void> {
    const medication = await this.getMedicationEntityById(medId);
    if (!medication) throw new Error('Medication not found');
    
    // Use domain logic
    medication.unarchive();
    
    // Save
    await this.repository.save(medication);
    
    // Track analytics
    this.analytics.logEvent('medication_unarchived', {
      medication_id: medId,
      medication_name: medication.name
    });
  }

  // =====================================================
  // NEW DDD API (Domain Services)
  // =====================================================

  /**
   * Get stock analysis for a medication
   */
  async getStockAnalysis(medId: string) {
    const medication = await this.getMedicationEntityById(medId);
    if (!medication) return null;
    
    return StockService.analyzeStock(medication);
  }

  /**
   * Get restock recommendations for all medications
   */
  async getRestockRecommendations(thresholdDays = 7) {
    const activePatientId = this.patientSelectorService.activePatientId();
    if (!activePatientId) return [];
    
    const entities = await this.repository.findByUserId(activePatientId, false);
    return StockService.getRestockRecommendations(entities, thresholdDays);
  }

  /**
   * Validate medication before saving
   */
  validateMedicationData(medicationData: Partial<Medication>) {
    // Convert to entity for validation
    const tempEntity = new MedicationEntity({
      id: 'temp',
      userId: 'temp',
      name: medicationData.name || '',
      dosage: medicationData.dosage || '',
      frequency: medicationData.frequency || '',
      time: medicationData.schedule?.[0]?.time || '08:00',
      notes: medicationData.notes,
      active: true,
      currentStock: medicationData.currentStock ?? 0,
      stockUnit: medicationData.stockUnit ?? 'unidades',
      schedule: [],
      lastModified: new Date()
    });
    
    return ValidationService.validateMedication(tempEntity);
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  /**
   * Load medications for active patient
   */
  private async loadMedications(userId: string): Promise<void> {
    try {
      // Load entities from repository
      const entities = await this.repository.findByUserId(userId, false);
      this._medicationEntities.set(entities);
      
      // Convert to DTOs for backward compatibility
      const dtos = entities.map(entity => this.entityToDTO(entity));
      this._medications.set(dtos);
    } catch (error: any) {
      this.logService.error('MedicationServiceV2', 'Failed to load medications', error as Error);
      this._medications.set([]);
      this._medicationEntities.set([]);
    }
  }

  /**
   * Convert entity to DTO (for backward compatibility)
   */
  private entityToDTO(entity: MedicationEntity): Medication {
    return {
      id: entity.id,
      patientId: entity.userId,
      name: entity.name,
      dosage: entity.dosage,
      frequency: entity.frequency,
      stock: entity.currentStock,
      currentStock: entity.currentStock,
      stockUnit: entity.stockUnit,
      notes: entity.notes,
      schedule: entity.schedule.map(dose => ({
        time: dose.time,
        status: dose.status,
        administeredBy: dose.administeredBy,
        notes: dose.notes
      })),
      isArchived: entity.isArchived,
      archivedAt: entity.archivedAt ?? undefined,
      userId: entity.userId,
      lastModified: entity.lastModified
    };
  }

  /**
   * Update family notifications (backward compatibility)
   */
  private async updateFamilyNotifications(): Promise<void> {
    try {
      const { FamilyNotificationService } = await import('./family-notification.service');
      const familyNotificationService = this.injector.get(FamilyNotificationService);
      await familyNotificationService.updateNotifications();
    } catch (error: any) {
      this.logService.warn('MedicationServiceV2', 'Failed to update family notifications', { error });
    }
  }
}

