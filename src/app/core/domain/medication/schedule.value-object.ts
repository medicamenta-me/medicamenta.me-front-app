/**
 * Value Object: Schedule
 * 
 * Represents a medication schedule with business logic for time calculations.
 * Value Object = immutable, no identity, defined by attributes.
 * 
 * DDD Principles:
 * - Immutable
 * - Equality by value
 * - Contains schedule-specific business logic
 */

import { DoseEntity } from './dose.entity';

export interface ScheduleConfig {
  frequency: string; // "8/8h", "12/12h", "1x ao dia", etc.
  startTime: string; // First dose time "08:00"
  doses: DoseEntity[];
}

export class ScheduleValueObject {
  private readonly _frequency: string;
  private readonly _startTime: string;
  private readonly _doses: ReadonlyArray<DoseEntity>;

  constructor(frequency: string, startTime: string, doses: DoseEntity[] = []) {
    this._frequency = frequency;
    this._startTime = startTime;
    this._doses = [...doses].sort((a, b) => a.compareTo(b));
    
    this.validateInvariants();
  }

  // =====================================================
  // GETTERS
  // =====================================================

  get frequency(): string { return this._frequency; }
  get startTime(): string { return this._startTime; }
  get doses(): ReadonlyArray<DoseEntity> { return this._doses; }

  // =====================================================
  // BUSINESS LOGIC
  // =====================================================

  /**
   * Generate schedule based on frequency
   * Business logic: Calculate dose times based on frequency pattern
   */
  static generate(frequency: string, startTime: string): ScheduleValueObject {
    const doses = ScheduleValueObject.calculateDoseTimes(frequency, startTime);
    return new ScheduleValueObject(frequency, startTime, doses);
  }

  /**
   * Calculate dose times based on frequency pattern
   * Examples:
   * - "8/8h" -> ["08:00", "16:00", "00:00"]
   * - "12/12h" -> ["08:00", "20:00"]
   * - "1x ao dia" -> ["08:00"]
   * - "2x ao dia" -> ["08:00", "20:00"]
   * - "3x ao dia" -> ["08:00", "14:00", "20:00"]
   */
  private static calculateDoseTimes(frequency: string, startTime: string): DoseEntity[] {
    const doses: DoseEntity[] = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);

    // Pattern: X/Xh (every X hours)
    const hourlyPattern = /(\d+)\/(\d+)h/i;
    const hourlyMatch = frequency.match(hourlyPattern);
    if (hourlyMatch) {
      const intervalHours = Number.parseInt(hourlyMatch[2], 10);
      const dosesPerDay = 24 / intervalHours;
      
      for (let i = 0; i < dosesPerDay; i++) {
        const hour = (startHour + (i * intervalHours)) % 24;
        const timeStr = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
        doses.push(new DoseEntity(timeStr, 'upcoming'));
      }
      
      return doses.sort((a, b) => a.compareTo(b));
    }

    // Pattern: Xx ao dia / Xx por dia / X vezes por dia / X vezes ao dia
    const dailyPattern = /(\d+)\s*(?:x|vezes)?\s*(ao|por)\s*dia/i;
    const dailyMatch = frequency.match(dailyPattern);
    if (dailyMatch) {
      const timesPerDay = Number.parseInt(dailyMatch[1], 10);
      
      if (timesPerDay === 1) {
        doses.push(new DoseEntity(startTime, 'upcoming'));
      } else if (timesPerDay === 2) {
        doses.push(
          new DoseEntity(startTime, 'upcoming'),
          new DoseEntity('20:00', 'upcoming')
        );
      } else if (timesPerDay === 3) {
        doses.push(
          new DoseEntity(startTime, 'upcoming'),
          new DoseEntity('14:00', 'upcoming'),
          new DoseEntity('20:00', 'upcoming')
        );
      } else if (timesPerDay === 4) {
        doses.push(
          new DoseEntity('08:00', 'upcoming'),
          new DoseEntity('12:00', 'upcoming'),
          new DoseEntity('16:00', 'upcoming'),
          new DoseEntity('20:00', 'upcoming')
        );
      } else {
        // Distribute evenly
        const interval = 24 / timesPerDay;
        for (let i = 0; i < timesPerDay; i++) {
          const hour = (startHour + Math.floor(i * interval)) % 24;
          const timeStr = `${hour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
          doses.push(new DoseEntity(timeStr, 'upcoming'));
        }
      }
      
      return doses.sort((a, b) => a.compareTo(b));
    }

    // Pattern: diário / diariamente
    if (/di[aá]ri[oa]/i.test(frequency)) {
      doses.push(new DoseEntity(startTime, 'upcoming'));
      return doses;
    }

    // Pattern: continuous / contínuo
    if (/cont[ií]nuo/i.test(frequency)) {
      // Default to 3x per day for continuous
      doses.push(
        new DoseEntity('08:00', 'upcoming'),
        new DoseEntity('14:00', 'upcoming'),
        new DoseEntity('20:00', 'upcoming')
      );
      return doses;
    }

    // Default: once a day
    doses.push(new DoseEntity(startTime, 'upcoming'));
    return doses;
  }

  /**
   * Get next dose from current time
   */
  getNextDose(currentTime: Date = new Date()): DoseEntity | null {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    // Find first upcoming dose after current time
    const upcomingDoses = this._doses.filter(d => d.isUpcoming());
    
    for (const dose of upcomingDoses) {
      if (dose.time >= currentTimeStr) {
        return dose;
      }
    }

    // If no dose found after current time, return first dose (next day)
    return upcomingDoses.length > 0 ? upcomingDoses[0] : null;
  }

  /**
   * Get doses that should have been taken by now but are still upcoming
   */
  getOverdueDoses(currentTime: Date = new Date()): DoseEntity[] {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    return this._doses.filter(d => {
      if (!d.isUpcoming()) return false;
      
      // Only consider doses that should have been taken today
      // Doses after current time are not yet due
      if (d.time >= currentTimeStr) return false;
      
      // For doses before current time, they are overdue
      // But we need to check if they're from today's schedule
      const [doseHour] = d.time.split(':').map(Number);
      
      // If dose hour is after current hour, it's from tomorrow's schedule
      if (doseHour > currentHour) return false;
      
      return true;
    });
  }

  /**
   * Calculate adherence rate
   */
  calculateAdherenceRate(): number {
    if (this._doses.length === 0) return 100;

    const takenDoses = this._doses.filter(d => d.status === 'taken').length;
    return Math.round((takenDoses / this._doses.length) * 100);
  }

  /**
   * Count doses by status
   */
  countByStatus(): { upcoming: number; taken: number; missed: number } {
    return {
      upcoming: this._doses.filter(d => d.status === 'upcoming').length,
      taken: this._doses.filter(d => d.status === 'taken').length,
      missed: this._doses.filter(d => d.status === 'missed').length
    };
  }

  /**
   * Get total doses per day
   */
  getDosesPerDay(): number {
    return this._doses.length;
  }

  /**
   * Check if schedule is valid
   */
  isValid(): boolean {
    try {
      this.validateInvariants();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update a specific dose
   * Returns new ScheduleValueObject (immutable)
   */
  updateDose(time: string, updatedDose: DoseEntity): ScheduleValueObject {
    const newDoses = this._doses.map(d => 
      d.time === time ? updatedDose : d
    );
    
    return new ScheduleValueObject(this._frequency, this._startTime, [...newDoses]);
  }

  /**
   * Reset all doses to upcoming
   * Useful for daily reset
   */
  resetAll(): ScheduleValueObject {
    const resetDoses = this._doses.map(d => d.resetToUpcoming());
    return new ScheduleValueObject(this._frequency, this._startTime, resetDoses);
  }

  // =====================================================
  // VALIDATION
  // =====================================================

  private validateInvariants(): void {
    // Validate start time format
    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(this._startTime)) {
      throw new Error(`Invalid start time format: ${this._startTime}`);
    }

    // Validate frequency
    if (!this._frequency || this._frequency.trim().length === 0) {
      throw new Error('Frequency is required');
    }

    // Validate all doses
    for (const [index, dose] of this._doses.entries()) {
      if (!dose.isValid()) {
        throw new Error(`Invalid dose at index ${index}`);
      }
    }

    // Business Rule: No duplicate times
    const times = this._doses.map(d => d.time);
    const uniqueTimes = new Set(times);
    if (times.length !== uniqueTimes.size) {
      throw new Error('Schedule cannot have duplicate dose times');
    }
  }

  // =====================================================
  // VALUE OBJECT SEMANTICS
  // =====================================================

  /**
   * Equality by value (not identity)
   */
  equals(other: ScheduleValueObject): boolean {
    if (this._frequency !== other._frequency) return false;
    if (this._startTime !== other._startTime) return false;
    if (this._doses.length !== other._doses.length) return false;

    // Compare doses
    for (let i = 0; i < this._doses.length; i++) {
      if (!this._doses[i].equals(other._doses[i])) return false;
    }

    return true;
  }

  /**
   * Clone (returns new instance)
   */
  clone(): ScheduleValueObject {
    return new ScheduleValueObject(
      this._frequency,
      this._startTime,
      this._doses.map(d => d.clone())
    );
  }

  /**
   * Convert to plain object
   */
  toPlainObject(): ScheduleConfig {
    return {
      frequency: this._frequency,
      startTime: this._startTime,
      doses: this._doses.map(d => d.clone())
    };
  }

  /**
   * Create from plain object
   */
  static fromPlainObject(data: ScheduleConfig): ScheduleValueObject {
    return new ScheduleValueObject(
      data.frequency,
      data.startTime,
      data.doses
    );
  }
}
