/**
 * Domain Entity: Dose
 * 
 * Represents a single scheduled dose of a medication.
 * Part of the Medication aggregate.
 * 
 * DDD Principles:
 * - Entity within aggregate (has identity through time)
 * - Immutable updates (returns new instance)
 * - Business logic for dose state transitions
 */

export type DoseStatus = 'upcoming' | 'taken' | 'missed';

export interface DoseAdministeredBy {
  id: string;
  name: string;
}

export class DoseEntity {
  private readonly _time: string;
  private readonly _status: DoseStatus;
  private readonly _administeredBy?: DoseAdministeredBy;
  private readonly _notes?: string;
  private readonly _timestamp?: Date; // When dose was actually taken/missed

  constructor(
    time: string,
    status: DoseStatus = 'upcoming',
    administeredBy?: DoseAdministeredBy,
    notes?: string,
    timestamp?: Date
  ) {
    this._time = time;
    this._status = status;
    this._administeredBy = administeredBy;
    this._notes = notes;
    this._timestamp = timestamp;
    
    this.validateInvariants();
  }

  // =====================================================
  // GETTERS
  // =====================================================

  get time(): string { return this._time; }
  get status(): DoseStatus { return this._status; }
  get administeredBy(): DoseAdministeredBy | undefined { return this._administeredBy; }
  get notes(): string | undefined { return this._notes; }
  get timestamp(): Date | undefined { return this._timestamp; }

  // =====================================================
  // BUSINESS LOGIC (State Transitions)
  // =====================================================

  /**
   * Mark dose as taken
   * Business rule: Can mark as taken from upcoming or missed
   */
  markAsTaken(administeredBy: DoseAdministeredBy, notes?: string): DoseEntity {
    if (this._status === 'taken') {
      throw new Error('Dose already marked as taken');
    }

    return new DoseEntity(
      this._time,
      'taken',
      administeredBy,
      notes,
      new Date()
    );
  }

  /**
   * Mark dose as missed
   * Business rule: Can mark as missed from upcoming
   */
  markAsMissed(administeredBy: DoseAdministeredBy, notes?: string): DoseEntity {
    if (this._status === 'missed') {
      throw new Error('Dose already marked as missed');
    }

    if (this._status === 'taken') {
      throw new Error('Cannot mark taken dose as missed. Reset first.');
    }

    return new DoseEntity(
      this._time,
      'missed',
      administeredBy,
      notes,
      new Date()
    );
  }

  /**
   * Reset dose to upcoming
   * Business rule: Can reset from any status
   */
  resetToUpcoming(): DoseEntity {
    return new DoseEntity(this._time, 'upcoming');
  }

  /**
   * Update notes without changing status
   */
  updateNotes(notes: string): DoseEntity {
    return new DoseEntity(
      this._time,
      this._status,
      this._administeredBy,
      notes,
      this._timestamp
    );
  }

  // =====================================================
  // QUERY METHODS
  // =====================================================

  /**
   * Check if dose is completed (taken or missed)
   */
  isCompleted(): boolean {
    return this._status === 'taken' || this._status === 'missed';
  }

  /**
   * Check if dose is upcoming
   */
  isUpcoming(): boolean {
    return this._status === 'upcoming';
  }

  /**
   * Check if dose was taken on time
   * Business rule: On time = within 30 minutes of scheduled time
   */
  wasTakenOnTime(scheduledTime: Date, toleranceMinutes: number = 30): boolean {
    if (!this._timestamp || this._status !== 'taken') return false;

    const diffMinutes = Math.abs(
      (this._timestamp.getTime() - scheduledTime.getTime()) / 1000 / 60
    );

    return diffMinutes <= toleranceMinutes;
  }

  /**
   * Get delay in minutes (positive = late, negative = early)
   */
  getDelayMinutes(scheduledTime: Date): number | null {
    if (!this._timestamp || this._status !== 'taken') return null;

    return Math.round(
      (this._timestamp.getTime() - scheduledTime.getTime()) / 1000 / 60
    );
  }

  /**
   * Validate dose entity
   */
  isValid(): boolean {
    try {
      this.validateInvariants();
      return true;
    } catch {
      return false;
    }
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  private validateInvariants(): void {
    // Time format validation (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(this._time)) {
      throw new Error(`Invalid time format: ${this._time}. Expected HH:MM`);
    }

    // Business Rule: Taken/Missed doses must have administeredBy
    if ((this._status === 'taken' || this._status === 'missed') && !this._administeredBy) {
      throw new Error(`${this._status} dose must have administeredBy information`);
    }

    // Business Rule: Upcoming doses should NOT have administeredBy
    if (this._status === 'upcoming' && this._administeredBy) {
      throw new Error('Upcoming dose should not have administeredBy information');
    }

    // Business Rule: Completed doses should have timestamp
    if ((this._status === 'taken' || this._status === 'missed') && !this._timestamp) {
      // Set current time if missing (backwards compatibility)
      (this as any)._timestamp = new Date();
    }
  }

  // =====================================================
  // SERIALIZATION
  // =====================================================

  /**
   * Convert to plain object for persistence
   */
  toPlainObject(): {
    time: string;
    status: DoseStatus;
    administeredBy?: DoseAdministeredBy;
    notes?: string;
    timestamp?: Date;
  } {
    return {
      time: this._time,
      status: this._status,
      administeredBy: this._administeredBy,
      notes: this._notes,
      timestamp: this._timestamp
    };
  }

  /**
   * Create from plain object
   */
  static fromPlainObject(data: {
    time: string;
    status: DoseStatus;
    administeredBy?: DoseAdministeredBy;
    notes?: string;
    timestamp?: Date;
  }): DoseEntity {
    return new DoseEntity(
      data.time,
      data.status,
      data.administeredBy,
      data.notes,
      data.timestamp
    );
  }

  /**
   * Clone entity
   */
  clone(): DoseEntity {
    return new DoseEntity(
      this._time,
      this._status,
      this._administeredBy,
      this._notes,
      this._timestamp
    );
  }

  /**
   * Equality based on time (within same medication)
   */
  equals(other: DoseEntity): boolean {
    return this._time === other._time;
  }

  /**
   * Compare for sorting (by time)
   */
  compareTo(other: DoseEntity): number {
    return this._time.localeCompare(other._time);
  }
}
