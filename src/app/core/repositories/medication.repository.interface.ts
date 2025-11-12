/**
 * Repository Interface: IMedicationRepository
 * 
 * Defines contract for medication persistence without specifying implementation.
 * Allows abstraction from Firestore, IndexedDB, or any other data source.
 * 
 * DDD Principles:
 * - Repository pattern: abstracts data access
 * - Domain doesn't depend on infrastructure
 * - Interface in domain, implementation in infrastructure
 */

import { MedicationEntity } from '../domain/medication/medication.entity';
import { Observable } from 'rxjs';

export interface IMedicationRepository {
  /**
   * Find medication by ID
   * @param id Medication ID
   * @param userId User ID (owner)
   * @returns Medication entity or null if not found
   */
  findById(id: string, userId: string): Promise<MedicationEntity | null>;

  /**
   * Find all medications for a user
   * @param userId User ID
   * @param includeArchived Whether to include archived medications
   * @returns Array of medication entities
   */
  findByUserId(userId: string, includeArchived?: boolean): Promise<MedicationEntity[]>;

  /**
   * Save medication (create or update)
   * @param medication Medication entity to save
   * @returns Saved medication entity with updated metadata
   */
  save(medication: MedicationEntity): Promise<MedicationEntity>;

  /**
   * Delete medication
   * @param id Medication ID
   * @param userId User ID (owner)
   */
  delete(id: string, userId: string): Promise<void>;

  /**
   * Watch medications for a user (realtime updates)
   * @param userId User ID
   * @param includeArchived Whether to include archived medications
   * @returns Observable of medication entities
   */
  watchByUserId(userId: string, includeArchived?: boolean): Observable<MedicationEntity[]>;

  /**
   * Find active medications (not archived) for a user
   * @param userId User ID
   * @returns Array of active medication entities
   */
  findActiveByUserId(userId: string): Promise<MedicationEntity[]>;

  /**
   * Find medications needing restocking
   * @param userId User ID
   * @param threshold Stock threshold (default: 5)
   * @returns Array of medications with low stock
   */
  findLowStock(userId: string, threshold?: number): Promise<MedicationEntity[]>;

  /**
   * Batch save medications (atomic operation if supported)
   * @param medications Array of medication entities
   * @returns Array of saved medication entities
   */
  saveBatch(medications: MedicationEntity[]): Promise<MedicationEntity[]>;

  /**
   * Check if medication exists
   * @param id Medication ID
   * @param userId User ID (owner)
   * @returns True if medication exists
   */
  exists(id: string, userId: string): Promise<boolean>;
}
