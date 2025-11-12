/**
 * Domain Entity: Medication
 * 
 * Pure domain entity representing a medication in the system.
 * Contains business logic and invariants, independent of infrastructure.
 * 
 * DDD Principles:
 * - Entity has identity (id)
 * - Encapsulates business rules
 * - Rich domain model (not anemic)
 * - Independent of persistence layer
 */

import { DoseEntity } from './dose.entity';
import { ScheduleValueObject } from './schedule.value-object';

export interface MedicationEntityProps {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  notes?: string;
  active?: boolean;
  currentStock?: number;
  stockUnit?: string;
  manufacturer?: string;
  activeIngredient?: string;
  schedule?: DoseEntity[];
  isArchived?: boolean;
  archivedAt?: Date | null;
  lastModified: Date;
  createdAt?: Date;
}

export class MedicationEntity {
  private readonly _id: string;
  private readonly _userId: string;
  private _name!: string; // Initialized through validateAndSetName
  private _dosage: string;
  private _frequency: string;
  private _time: string;
  private _notes?: string;
  private _active: boolean;
  private _currentStock: number;
  private _stockUnit: string;
  private _manufacturer?: string;
  private _activeIngredient?: string;
  private _schedule: DoseEntity[];
  private _isArchived: boolean;
  private _archivedAt: Date | null;
  private _lastModified: Date;
  private _createdAt: Date;

  constructor(props: MedicationEntityProps) {
    // Identity
    this._id = props.id;
    this._userId = props.userId;
    
    // Required attributes with validation
    this.validateAndSetName(props.name);
    this._dosage = props.dosage;
    this._frequency = props.frequency;
    this._time = props.time;
    
    // Optional attributes
    this._notes = props.notes;
    this._active = props.active ?? true;
    this._currentStock = props.currentStock ?? 0;
    this._stockUnit = props.stockUnit ?? 'unidades';
    this._manufacturer = props.manufacturer;
    this._activeIngredient = props.activeIngredient;
    this._schedule = props.schedule ?? [];
    this._isArchived = props.isArchived ?? false;
    this._archivedAt = props.archivedAt ?? null;
    
    // Timestamps
    this._lastModified = props.lastModified;
    this._createdAt = props.createdAt ?? props.lastModified;
    
    // Validate business rules
    this.validateInvariants();
  }

  // =====================================================
  // GETTERS (Public API)
  // =====================================================

  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get name(): string { return this._name; }
  get dosage(): string { return this._dosage; }
  get frequency(): string { return this._frequency; }
  get time(): string { return this._time; }
  get notes(): string | undefined { return this._notes; }
  get active(): boolean { return this._active; }
  get currentStock(): number { return this._currentStock; }
  get stockUnit(): string { return this._stockUnit; }
  get manufacturer(): string | undefined { return this._manufacturer; }
  get activeIngredient(): string | undefined { return this._activeIngredient; }
  get schedule(): ReadonlyArray<DoseEntity> { return this._schedule; }
  get isArchived(): boolean { return this._isArchived; }
  get archivedAt(): Date | null { return this._archivedAt; }
  get lastModified(): Date { return this._lastModified; }
  get createdAt(): Date { return this._createdAt; }

  // =====================================================
  // BUSINESS LOGIC METHODS (Domain Behavior)
  // =====================================================

  /**
   * Update medication details
   * Business rule: Cannot update archived medication
   */
  updateDetails(updates: Partial<Omit<MedicationEntityProps, 'id' | 'userId'>>): void {
    if (this._isArchived) {
      throw new Error('Cannot update archived medication');
    }

    if (updates.name !== undefined) {
      this.validateAndSetName(updates.name);
    }
    if (updates.dosage !== undefined) this._dosage = updates.dosage;
    if (updates.frequency !== undefined) this._frequency = updates.frequency;
    if (updates.time !== undefined) this._time = updates.time;
    if (updates.notes !== undefined) this._notes = updates.notes;
    if (updates.manufacturer !== undefined) this._manufacturer = updates.manufacturer;
    if (updates.activeIngredient !== undefined) this._activeIngredient = updates.activeIngredient;
    if (updates.stockUnit !== undefined) this._stockUnit = updates.stockUnit;
    
    this._lastModified = new Date();
    this.validateInvariants();
  }

  /**
   * Update stock level
   * Business rule: Stock cannot be negative
   */
  updateStock(newStock: number): void {
    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }
    
    this._currentStock = newStock;
    this._lastModified = new Date();
  }

  /**
   * Decrease stock by amount (when dose is taken)
   * Business rule: Cannot decrease below zero
   */
  decreaseStock(amount: number = 1): void {
    if (amount <= 0) {
      throw new Error('Decrease amount must be positive');
    }
    
    const newStock = this._currentStock - amount;
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }
    
    this._currentStock = newStock;
    this._lastModified = new Date();
  }

  /**
   * Increase stock by amount (when restocking)
   */
  increaseStock(amount: number): void {
    if (amount <= 0) {
      throw new Error('Increase amount must be positive');
    }
    
    this._currentStock += amount;
    this._lastModified = new Date();
  }

  /**
   * Activate medication
   * Business rule: Cannot activate archived medication
   */
  activate(): void {
    if (this._isArchived) {
      throw new Error('Cannot activate archived medication. Unarchive first.');
    }
    
    this._active = true;
    this._lastModified = new Date();
  }

  /**
   * Deactivate medication
   */
  deactivate(): void {
    this._active = false;
    this._lastModified = new Date();
  }

  /**
   * Archive medication
   * Business rule: Can only archive if stock is zero and inactive
   */
  archive(): void {
    if (this._currentStock > 0) {
      throw new Error('Cannot archive medication with remaining stock');
    }
    
    this._isArchived = true;
    this._archivedAt = new Date();
    this._active = false;
    this._lastModified = new Date();
  }

  /**
   * Unarchive medication
   */
  unarchive(): void {
    this._isArchived = false;
    this._archivedAt = null;
    this._lastModified = new Date();
  }

  /**
   * Update schedule
   * Business rule: Schedule must contain valid doses
   */
  updateSchedule(doses: DoseEntity[]): void {
    if (this._isArchived) {
      throw new Error('Cannot update schedule for archived medication');
    }
    
    // Validate all doses
    doses.forEach((dose, index) => {
      if (!dose.isValid()) {
        throw new Error(`Invalid dose at index ${index}`);
      }
    });
    
    this._schedule = doses;
    this._lastModified = new Date();
  }

  /**
   * Record dose as taken
   * Returns updated dose or null if not found
   * Business rule: Decreases stock when dose is taken
   */
  recordDoseTaken(time: string, administeredBy: { id: string; name: string }, notes?: string): DoseEntity | null {
    const doseIndex = this._schedule.findIndex(d => d.time === time);
    if (doseIndex === -1) return null;
    
    const updatedDose = this._schedule[doseIndex].markAsTaken(administeredBy, notes);
    this._schedule[doseIndex] = updatedDose;
    
    // Decrease stock when dose is taken
    if (this._currentStock > 0) {
      this._currentStock--;
    }
    
    this._lastModified = new Date();
    
    return updatedDose;
  }

  /**
   * Record dose as missed
   * Returns updated dose or null if not found
   */
  recordDoseMissed(time: string, administeredBy: { id: string; name: string }, notes?: string): DoseEntity | null {
    const doseIndex = this._schedule.findIndex(d => d.time === time);
    if (doseIndex === -1) return null;
    
    const updatedDose = this._schedule[doseIndex].markAsMissed(administeredBy, notes);
    this._schedule[doseIndex] = updatedDose;
    this._lastModified = new Date();
    
    return updatedDose;
  }

  /**
   * Reset dose to upcoming
   * Returns updated dose or null if not found
   */
  resetDose(time: string): DoseEntity | null {
    const doseIndex = this._schedule.findIndex(d => d.time === time);
    if (doseIndex === -1) return null;
    
    const updatedDose = this._schedule[doseIndex].resetToUpcoming();
    this._schedule[doseIndex] = updatedDose;
    this._lastModified = new Date();
    
    return updatedDose;
  }

  /**
   * Check if medication needs restocking
   * Business rule: Warning when stock <= threshold
   */
  needsRestocking(threshold: number = 5): boolean {
    return this._currentStock <= threshold && !this._isArchived;
  }

  /**
   * Calculate adherence rate
   * Returns percentage (0-100)
   */
  calculateAdherenceRate(): number {
    if (this._schedule.length === 0) return 100;
    
    const completedDoses = this._schedule.filter(
      d => d.status === 'taken'
    ).length;
    
    return Math.round((completedDoses / this._schedule.length) * 100);
  }

  /**
   * Get next scheduled dose
   */
  getNextDose(): DoseEntity | null {
    const upcomingDoses = this._schedule.filter(d => d.status === 'upcoming');
    if (upcomingDoses.length === 0) return null;
    
    // Return first upcoming dose (assumes schedule is sorted)
    return upcomingDoses[0];
  }

  /**
   * Check if medication is continuous (always active)
   */
  isContinuous(): boolean {
    // Heuristic: continuous if frequency is daily or more frequent
    const freq = this._frequency.toLowerCase();
    return freq.includes('contínuo') || 
           freq.includes('continuo') ||
           freq.includes('diário') ||
           freq.includes('diario') ||
           freq.includes('daily') ||
           freq.includes('/8h') ||
           freq.includes('/12h');
  }

  // =====================================================
  // VALIDATION (Private Methods)
  // =====================================================

  private validateAndSetName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Medication name is required');
    }
    
    if (name.length > 200) {
      throw new Error('Medication name is too long (max 200 characters)');
    }
    
    this._name = name.trim();
  }

  private validateInvariants(): void {
    // Business Rule: Archived medications must be inactive
    if (this._isArchived && this._active) {
      throw new Error('Archived medications cannot be active');
    }
    
    // Business Rule: Archived medications should have zero stock
    if (this._isArchived && this._currentStock > 0) {
      console.warn(`Medication ${this._id} is archived but has stock: ${this._currentStock}`);
    }
  }

  // =====================================================
  // SERIALIZATION (for persistence layer)
  // =====================================================

  /**
   * Convert entity to plain object for persistence
   * This is the Data Transfer Object (DTO)
   */
  toPlainObject(): MedicationEntityProps {
    return {
      id: this._id,
      userId: this._userId,
      name: this._name,
      dosage: this._dosage,
      frequency: this._frequency,
      time: this._time,
      notes: this._notes,
      active: this._active,
      currentStock: this._currentStock,
      stockUnit: this._stockUnit,
      manufacturer: this._manufacturer,
      activeIngredient: this._activeIngredient,
      schedule: [...this._schedule], // Return array copy of DoseEntity instances
      isArchived: this._isArchived,
      archivedAt: this._archivedAt,
      lastModified: this._lastModified,
      createdAt: this._createdAt
    };
  }

  /**
   * Create entity from plain object (from persistence layer)
   */
  static fromPlainObject(data: MedicationEntityProps): MedicationEntity {
    return new MedicationEntity({
      ...data,
      schedule: data.schedule?.map(d => 
        new DoseEntity(d.time, d.status, d.administeredBy, d.notes)
      ) ?? []
    });
  }

  /**
   * Clone entity (useful for immutable updates)
   */
  clone(): MedicationEntity {
    return MedicationEntity.fromPlainObject(this.toPlainObject());
  }

  /**
   * Entity equality (based on identity)
   */
  equals(other: MedicationEntity): boolean {
    return this._id === other._id && this._userId === other._userId;
  }
}
