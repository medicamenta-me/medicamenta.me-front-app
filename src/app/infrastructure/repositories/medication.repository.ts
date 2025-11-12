/**
 * Medication Repository Implementation
 * 
 * Concrete implementation of IMedicationRepository using Firebase Firestore and IndexedDB.
 * Handles online/offline sync automatically.
 * 
 * Infrastructure Layer:
 * - Implements domain repository interface
 * - Handles persistence details (Firestore, IndexedDB)
 * - Manages online/offline scenarios
 * - Converts between domain entities and DTOs
 */

import { Injectable, inject } from '@angular/core';
import { Observable, map, from } from 'rxjs';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Firestore,
  Unsubscribe
} from 'firebase/firestore';

import { IMedicationRepository } from '../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../core/domain/medication/medication.entity';
import { DoseEntity } from '../../core/domain/medication/dose.entity';
import { FirebaseService } from '../../services/firebase.service';
import { IndexedDBService } from '../../services/indexed-db.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { Medication } from '../../models/medication.model';

@Injectable({
  providedIn: 'root'
})
export class MedicationRepository implements IMedicationRepository {
  private readonly firebaseService = inject(FirebaseService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly offlineSync = inject(OfflineSyncService);
  private readonly firestore: Firestore;

  constructor() {
    this.firestore = this.firebaseService.firestore;
  }

  // =====================================================
  // PUBLIC API (implements IMedicationRepository)
  // =====================================================

  async findById(id: string, userId: string): Promise<MedicationEntity | null> {
    const isOnline = this.offlineSync.isOnline();

    if (isOnline) {
      // Try Firestore first
      try {
        const docRef = doc(this.firestore, `users/${userId}/medications`, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Medication;
          return this.toEntity({ ...data, id: docSnap.id, userId });
        }
      } catch (error) {
        console.error('[MedicationRepository] Firestore read error, falling back to cache:', error);
      }
    }

    // Fallback to IndexedDB
    const cached = await this.indexedDB.get<Medication>('medications', id);
    if (cached && cached.userId === userId) {
      return this.toEntity(cached);
    }

    return null;
  }

  async findByUserId(userId: string, includeArchived = false): Promise<MedicationEntity[]> {
    const isOnline = this.offlineSync.isOnline();

    if (isOnline) {
      try {
        const medsCol = collection(this.firestore, `users/${userId}/medications`);
        const snapshot = await getDocs(medsCol);
        const medications = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          userId
        } as Medication));

        // Cache for offline use
        await this.cacheToIndexedDB(medications);

        return medications
          .filter(m => includeArchived || !m.isArchived)
          .map(m => this.toEntity(m));
      } catch (error) {
        console.error('[MedicationRepository] Firestore read error, falling back to cache:', error);
      }
    }

    // Fallback to IndexedDB
    const cached = await this.indexedDB.getByIndex<Medication>('medications', 'userId', userId);
    return cached
      .filter(m => includeArchived || !m.isArchived)
      .map(m => this.toEntity(m));
  }

  async save(medication: MedicationEntity): Promise<MedicationEntity> {
    const isOnline = this.offlineSync.isOnline();
    const dto = this.toDTO(medication);

    if (isOnline) {
      try {
        // Check if medication exists (has valid Firestore ID)
        const isNew = medication.id.startsWith('temp_');

        if (isNew) {
          // Create new document
          const medsCol = collection(this.firestore, `users/${medication.userId}/medications`);
          const docRef = await addDoc(medsCol, dto);

          // Create entity with real ID
          const savedEntity = new MedicationEntity({
            ...medication.toPlainObject(),
            id: docRef.id,
            lastModified: new Date()
          });

          // Update cache
          await this.indexedDB.put('medications', this.toDTO(savedEntity));

          return savedEntity;
        } else {
          // Update existing document
          const docRef = doc(this.firestore, `users/${medication.userId}/medications`, medication.id);
          await updateDoc(docRef, { ...dto, lastModified: new Date() });

          // Update entity
          const updatedEntity = new MedicationEntity({
            ...medication.toPlainObject(),
            lastModified: new Date()
          });

          // Update cache
          await this.indexedDB.put('medications', this.toDTO(updatedEntity));

          return updatedEntity;
        }
      } catch (error) {
        console.error('[MedicationRepository] Firestore save error, queuing for sync:', error);
        // Fall through to offline handling
      }
    }

    // Offline: Save to cache and queue for sync
    await this.indexedDB.put('medications', dto);

    // Queue operation for sync
    const operation = medication.id.startsWith('temp_') ? 'create' : 'update';
    this.offlineSync.queueOperation(
      operation,
      `users/${medication.userId}/medications`,
      medication.id,
      dto,
      'high'
    );

    return medication;
  }

  async delete(id: string, userId: string): Promise<void> {
    const isOnline = this.offlineSync.isOnline();

    if (isOnline) {
      try {
        const docRef = doc(this.firestore, `users/${userId}/medications`, id);
        await deleteDoc(docRef);

        // Remove from cache
        await this.indexedDB.delete('medications', id);

        return;
      } catch (error) {
        console.error('[MedicationRepository] Firestore delete error, queuing for sync:', error);
      }
    }

    // Offline: Remove from cache and queue for sync
    await this.indexedDB.delete('medications', id);

    this.offlineSync.queueOperation(
      'delete',
      `users/${userId}/medications`,
      id,
      undefined,
      'high'
    );
  }

  watchByUserId(userId: string, includeArchived = false): Observable<MedicationEntity[]> {
    return new Observable<MedicationEntity[]>(observer => {
      const medsCol = collection(this.firestore, `users/${userId}/medications`);
      
      const unsubscribe: Unsubscribe = onSnapshot(
        medsCol,
        async (snapshot) => {
          const medications = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            userId
          } as Medication));

          // Cache for offline use
          await this.cacheToIndexedDB(medications);

          const entities = medications
            .filter(m => includeArchived || !m.isArchived)
            .map(m => this.toEntity(m));

          observer.next(entities);
        },
        (error) => {
          console.error('[MedicationRepository] Firestore watch error:', error);
          // Fallback to cached data
          this.findByUserId(userId, includeArchived).then(
            entities => observer.next(entities),
            err => observer.error(err)
          );
        }
      );

      // Cleanup function
      return () => unsubscribe();
    });
  }

  async findActiveByUserId(userId: string): Promise<MedicationEntity[]> {
    const all = await this.findByUserId(userId, false);
    return all.filter(m => m.active);
  }

  async findLowStock(userId: string, threshold = 5): Promise<MedicationEntity[]> {
    const all = await this.findByUserId(userId, false);
    return all.filter(m => m.needsRestocking(threshold));
  }

  async saveBatch(medications: MedicationEntity[]): Promise<MedicationEntity[]> {
    // For now, save sequentially
    // TODO: Implement batch write for better performance
    const saved: MedicationEntity[] = [];
    
    for (const med of medications) {
      const savedMed = await this.save(med);
      saved.push(savedMed);
    }

    return saved;
  }

  async exists(id: string, userId: string): Promise<boolean> {
    const medication = await this.findById(id, userId);
    return medication !== null;
  }

  // =====================================================
  // PRIVATE HELPERS (Conversion & Caching)
  // =====================================================

  /**
   * Convert domain entity to DTO (Data Transfer Object)
   * Used for Firestore and IndexedDB storage
   */
  private toDTO(entity: MedicationEntity): Medication {
    const plain = entity.toPlainObject();

    return {
      id: plain.id,
      patientId: plain.userId, // Map userId to patientId
      userId: plain.userId, // For IndexedDB indexing
      name: plain.name,
      dosage: plain.dosage,
      frequency: plain.frequency,
      notes: plain.notes,
      currentStock: plain.currentStock ?? 0,
      stock: plain.currentStock ?? 0, // Backward compatibility
      stockUnit: plain.stockUnit,
      schedule: plain.schedule?.map(d => ({
        time: d.time,
        status: d.status,
        administeredBy: d.administeredBy,
        notes: d.notes
      })) ?? [],
      isArchived: plain.isArchived,
      archivedAt: plain.archivedAt ?? undefined,
      lastModified: plain.lastModified
    };
  }

  /**
   * Convert DTO to domain entity
   * Used when loading from Firestore or IndexedDB
   */
  private toEntity(dto: Medication): MedicationEntity {
    return new MedicationEntity({
      id: dto.id,
      userId: dto.patientId || dto.userId || '',
      name: dto.name,
      dosage: dto.dosage,
      frequency: dto.frequency,
      time: dto.schedule?.[0]?.time || '08:00', // Use first dose time or default
      notes: dto.notes,
      active: !dto.isArchived, // Active if not archived
      currentStock: dto.currentStock ?? dto.stock ?? 0,
      stockUnit: dto.stockUnit ?? 'unidades',
      manufacturer: undefined, // Not in current model
      activeIngredient: undefined, // Not in current model
      schedule: dto.schedule?.map(d => 
        new DoseEntity(d.time, d.status, d.administeredBy, d.notes)
      ) ?? [],
      isArchived: dto.isArchived ?? false,
      archivedAt: dto.archivedAt ?? null,
      lastModified: dto.lastModified ?? new Date(),
      createdAt: dto.lastModified // Use lastModified as createdAt
    });
  }

  /**
   * Cache medications to IndexedDB
   */
  private async cacheToIndexedDB(medications: Medication[]): Promise<void> {
    try {
      await this.indexedDB.putBatch('medications', medications);
      console.log(`[MedicationRepository] Cached ${medications.length} medications to IndexedDB`);
    } catch (error) {
      console.error('[MedicationRepository] Failed to cache to IndexedDB:', error);
    }
  }
}
