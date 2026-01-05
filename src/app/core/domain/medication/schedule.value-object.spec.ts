/**
 * Unit Tests: ScheduleValueObject
 * 
 * Tests schedule generation, dose time calculations, and business logic.
 * Coverage: generate, calculateDoseTimes, getNextDose, getOverdueDoses,
 *           adherence calculations, dose updates, immutability
 */

import { ScheduleValueObject } from './schedule.value-object';
import { DoseEntity, DoseAdministeredBy } from './dose.entity';

describe('ScheduleValueObject', () => {

  const adminUser: DoseAdministeredBy = {
    id: 'user-123',
    name: 'Test User'
  };

  // =====================================================
  // CONSTRUCTOR AND INITIALIZATION
  // =====================================================

  describe('Constructor and Initialization', () => {

    it('should create schedule with valid parameters', () => {
      const doses = [
        new DoseEntity('08:00', 'upcoming'),
        new DoseEntity('16:00', 'upcoming')
      ];

      const schedule = new ScheduleValueObject('8/8h', '08:00', doses);

      expect(schedule.frequency).toBe('8/8h');
      expect(schedule.startTime).toBe('08:00');
      expect(schedule.doses.length).toBe(2);
    });

    it('should sort doses chronologically', () => {
      const doses = [
        new DoseEntity('16:00', 'upcoming'),
        new DoseEntity('08:00', 'upcoming'),
        new DoseEntity('22:00', 'upcoming')
      ];

      const schedule = new ScheduleValueObject('8/8h', '08:00', doses);

      expect(schedule.doses[0].time).toBe('08:00');
      expect(schedule.doses[1].time).toBe('16:00');
      expect(schedule.doses[2].time).toBe('22:00');
    });

    it('should validate time format', () => {
      expect(() => {
        new ScheduleValueObject('8/8h', '25:00', []); // Invalid hour
      }).toThrowError();
    });

    it('should reject empty frequency', () => {
      expect(() => {
        new ScheduleValueObject('', '08:00', []);
      }).toThrowError();
    });

    it('should reject duplicate dose times', () => {
      const doses = [
        new DoseEntity('08:00', 'upcoming'),
        new DoseEntity('08:00', 'upcoming') // Duplicate
      ];

      expect(() => {
        new ScheduleValueObject('8/8h', '08:00', doses);
      }).toThrowError(/duplicate/);
    });

  });

  // =====================================================
  // SCHEDULE GENERATION - HOURLY PATTERNS
  // =====================================================

  describe('Schedule Generation - Hourly Patterns', () => {

    it('should generate schedule for "8/8h" (every 8 hours)', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');

      expect(schedule.doses.length).toBe(3); // 24h / 8h = 3 doses
      expect(schedule.doses[0].time).toBe('00:00');
      expect(schedule.doses[1].time).toBe('08:00');
      expect(schedule.doses[2].time).toBe('16:00');
    });

    it('should generate schedule for "6/6h" (every 6 hours)', () => {
      const schedule = ScheduleValueObject.generate('6/6h', '08:00');

      expect(schedule.doses.length).toBe(4); // 24h / 6h = 4 doses
      expect(schedule.doses[0].time).toBe('02:00');
      expect(schedule.doses[1].time).toBe('08:00');
      expect(schedule.doses[2].time).toBe('14:00');
      expect(schedule.doses[3].time).toBe('20:00');
    });

    it('should generate schedule for "12/12h" (every 12 hours)', () => {
      const schedule = ScheduleValueObject.generate('12/12h', '08:00');

      expect(schedule.doses.length).toBe(2); // 24h / 12h = 2 doses
      expect(schedule.doses[0].time).toBe('08:00');
      expect(schedule.doses[1].time).toBe('20:00');
    });

    it('should generate schedule for "24/24h" (once daily)', () => {
      const schedule = ScheduleValueObject.generate('24/24h', '08:00');

      expect(schedule.doses.length).toBe(1);
      expect(schedule.doses[0].time).toBe('08:00');
    });

    it('should handle different start times', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '10:30');

      expect(schedule.doses.length).toBe(3);
      expect(schedule.doses[0].time).toBe('02:30');
      expect(schedule.doses[1].time).toBe('10:30');
      expect(schedule.doses[2].time).toBe('18:30');
    });

  });

  // =====================================================
  // SCHEDULE GENERATION - DAILY PATTERNS
  // =====================================================

  describe('Schedule Generation - Daily Patterns', () => {

    it('should generate schedule for "1x ao dia"', () => {
      const schedule = ScheduleValueObject.generate('1x ao dia', '08:00');

      expect(schedule.doses.length).toBe(1);
      expect(schedule.doses[0].time).toBe('08:00');
    });

    it('should generate schedule for "2x ao dia"', () => {
      const schedule = ScheduleValueObject.generate('2x ao dia', '08:00');

      expect(schedule.doses.length).toBe(2);
      expect(schedule.doses[0].time).toBe('08:00');
      expect(schedule.doses[1].time).toBe('20:00');
    });

    it('should generate schedule for "3x ao dia"', () => {
      const schedule = ScheduleValueObject.generate('3x ao dia', '08:00');

      expect(schedule.doses.length).toBe(3);
      expect(schedule.doses[0].time).toBe('08:00');
      expect(schedule.doses[1].time).toBe('14:00');
      expect(schedule.doses[2].time).toBe('20:00');
    });

    it('should generate schedule for "4x ao dia"', () => {
      const schedule = ScheduleValueObject.generate('4x ao dia', '08:00');

      expect(schedule.doses.length).toBe(4);
      expect(schedule.doses[0].time).toBe('08:00');
      expect(schedule.doses[1].time).toBe('12:00');
      expect(schedule.doses[2].time).toBe('16:00');
      expect(schedule.doses[3].time).toBe('20:00');
    });

    it('should handle "2 vezes por dia" variation', () => {
      const schedule = ScheduleValueObject.generate('2 vezes por dia', '08:00');

      expect(schedule.doses.length).toBe(2);
    });

  });

  // =====================================================
  // SCHEDULE GENERATION - SPECIAL PATTERNS
  // =====================================================

  describe('Schedule Generation - Special Patterns', () => {

    it('should generate schedule for "diário"', () => {
      const schedule = ScheduleValueObject.generate('diário', '08:00');

      expect(schedule.doses.length).toBe(1);
      expect(schedule.doses[0].time).toBe('08:00');
    });

    it('should generate schedule for "diariamente"', () => {
      const schedule = ScheduleValueObject.generate('diariamente', '09:00');

      expect(schedule.doses.length).toBe(1);
      expect(schedule.doses[0].time).toBe('09:00');
    });

    it('should generate schedule for "contínuo" (default 3x/day)', () => {
      const schedule = ScheduleValueObject.generate('contínuo', '08:00');

      expect(schedule.doses.length).toBe(3);
      expect(schedule.doses[0].time).toBe('08:00');
      expect(schedule.doses[1].time).toBe('14:00');
      expect(schedule.doses[2].time).toBe('20:00');
    });

    it('should default to once daily for unknown patterns', () => {
      const schedule = ScheduleValueObject.generate('quando necessário', '08:00');

      expect(schedule.doses.length).toBe(1);
      expect(schedule.doses[0].time).toBe('08:00');
    });

  });

  // =====================================================
  // NEXT DOSE CALCULATION
  // =====================================================

  describe('getNextDose', () => {

    it('should return next upcoming dose after current time', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');
      const currentTime = new Date('2025-11-09T10:00:00');

      const nextDose = schedule.getNextDose(currentTime);

      expect(nextDose).not.toBeNull();
      expect(nextDose!.time).toBe('16:00'); // Next after 10:00
    });

    it('should return first dose if current time is before all doses', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');
      const currentTime = new Date('2025-11-09T06:00:00');

      const nextDose = schedule.getNextDose(currentTime);

      expect(nextDose).not.toBeNull();
      expect(nextDose!.time).toBe('08:00');
    });

    it('should wrap around to first dose if current time is after all doses', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');
      const currentTime = new Date('2025-11-09T23:00:00');

      const nextDose = schedule.getNextDose(currentTime);

      expect(nextDose).not.toBeNull();
      expect(nextDose!.time).toBe('00:00'); // First dose of next day
    });

    it('should return null if no upcoming doses', () => {
      const doses = [
        new DoseEntity('08:00', 'taken', adminUser),
        new DoseEntity('16:00', 'taken', adminUser)
      ];
      const schedule = new ScheduleValueObject('8/8h', '08:00', doses);

      const nextDose = schedule.getNextDose();

      expect(nextDose).toBeNull();
    });

  });

  // =====================================================
  // OVERDUE DOSES
  // =====================================================

  describe('getOverdueDoses', () => {

    it('should return doses that are past due', () => {
      const doses = [
        new DoseEntity('08:00', 'upcoming'),
        new DoseEntity('12:00', 'upcoming'),
        new DoseEntity('16:00', 'upcoming')
      ];
      const schedule = new ScheduleValueObject('4/4h', '08:00', doses);
      const currentTime = new Date('2025-11-09T14:00:00'); // 14:00

      const overdueDoses = schedule.getOverdueDoses(currentTime);

      expect(overdueDoses.length).toBe(2); // 08:00 and 12:00 are overdue
      expect(overdueDoses[0].time).toBe('08:00');
      expect(overdueDoses[1].time).toBe('12:00');
    });

    it('should not include taken or missed doses', () => {
      const doses = [
        new DoseEntity('08:00', 'taken', adminUser),
        new DoseEntity('12:00', 'missed', adminUser),
        new DoseEntity('16:00', 'upcoming')
      ];
      const schedule = new ScheduleValueObject('4/4h', '08:00', doses);
      const currentTime = new Date('2025-11-09T18:00:00');

      const overdueDoses = schedule.getOverdueDoses(currentTime);

      expect(overdueDoses.length).toBe(1); // Only 16:00
      expect(overdueDoses[0].time).toBe('16:00');
    });

    it('should return empty array if no overdue doses', () => {
      const schedule = ScheduleValueObject.generate('12/12h', '08:00'); // Generates 08:00, 20:00 (no dose before 06:00)
      const currentTime = new Date('2025-11-09T06:00:00');

      const overdueDoses = schedule.getOverdueDoses(currentTime);

      expect(overdueDoses.length).toBe(0);
    });

  });

  // =====================================================
  // ADHERENCE CALCULATION
  // =====================================================

  describe('calculateAdherenceRate', () => {

    it('should calculate 100% adherence when all doses taken', () => {
      const doses = [
        new DoseEntity('08:00', 'taken', adminUser),
        new DoseEntity('16:00', 'taken', adminUser),
        new DoseEntity('22:00', 'taken', adminUser)
      ];
      const schedule = new ScheduleValueObject('8/8h', '08:00', doses);

      const adherenceRate = schedule.calculateAdherenceRate();

      expect(adherenceRate).toBe(100);
    });

    it('should calculate 0% adherence when no doses taken', () => {
      const doses = [
        new DoseEntity('08:00', 'upcoming'),
        new DoseEntity('16:00', 'missed', adminUser),
        new DoseEntity('22:00', 'upcoming')
      ];
      const schedule = new ScheduleValueObject('8/8h', '08:00', doses);

      const adherenceRate = schedule.calculateAdherenceRate();

      expect(adherenceRate).toBe(0);
    });

    it('should calculate partial adherence correctly', () => {
      const doses = [
        new DoseEntity('08:00', 'taken', adminUser),
        new DoseEntity('16:00', 'missed', adminUser),
        new DoseEntity('22:00', 'taken', adminUser)
      ];
      const schedule = new ScheduleValueObject('8/8h', '08:00', doses);

      const adherenceRate = schedule.calculateAdherenceRate();

      expect(adherenceRate).toBe(67); // 2/3 = 66.67% rounded to 67
    });

    it('should return 100% for empty schedule', () => {
      const schedule = new ScheduleValueObject('8/8h', '08:00', []);

      const adherenceRate = schedule.calculateAdherenceRate();

      expect(adherenceRate).toBe(100);
    });

  });

  // =====================================================
  // COUNT BY STATUS
  // =====================================================

  describe('countByStatus', () => {

    it('should count doses by status correctly', () => {
      const doses = [
        new DoseEntity('08:00', 'taken', adminUser),
        new DoseEntity('12:00', 'upcoming'),
        new DoseEntity('16:00', 'missed', adminUser),
        new DoseEntity('20:00', 'upcoming')
      ];
      const schedule = new ScheduleValueObject('4/4h', '08:00', doses);

      const counts = schedule.countByStatus();

      expect(counts.taken).toBe(1);
      expect(counts.upcoming).toBe(2);
      expect(counts.missed).toBe(1);
    });

  });

  // =====================================================
  // UPDATE DOSE (IMMUTABILITY)
  // =====================================================

  describe('updateDose', () => {

    it('should return new schedule with updated dose', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');
      const adminUser = { id: 'user-123', name: 'John Doe' };

      const updatedDose = schedule.doses[1].markAsTaken(adminUser);
      const newSchedule = schedule.updateDose('08:00', updatedDose);

      expect(newSchedule).not.toBe(schedule); // Different instance
      expect(newSchedule.doses[1].status).toBe('taken');
      expect(schedule.doses[1].status).toBe('upcoming'); // Original unchanged
    });

    it('should preserve other doses when updating one', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');
      const adminUser = { id: 'user-123', name: 'John Doe' };

      const updatedDose = schedule.doses[1].markAsTaken(adminUser);
      const newSchedule = schedule.updateDose('08:00', updatedDose);

      expect(newSchedule.doses.length).toBe(schedule.doses.length);
      expect(newSchedule.doses[0]).toBe(schedule.doses[0]); // Same reference for unchanged
    });

  });

  // =====================================================
  // RESET ALL DOSES
  // =====================================================

  describe('resetAll', () => {

    it('should reset all doses to upcoming', () => {
      const doses = [
        new DoseEntity('08:00', 'taken', adminUser),
        new DoseEntity('16:00', 'missed', adminUser),
        new DoseEntity('22:00', 'upcoming')
      ];
      const schedule = new ScheduleValueObject('8/8h', '08:00', doses);

      const resetSchedule = schedule.resetAll();

      expect(resetSchedule.doses.every(d => d.status === 'upcoming')).toBe(true);
      expect(resetSchedule).not.toBe(schedule); // New instance
    });

  });

  // =====================================================
  // VALUE OBJECT SEMANTICS
  // =====================================================

  describe('Value Object Semantics', () => {

    it('should implement equality by value', () => {
      const schedule1 = ScheduleValueObject.generate('8/8h', '08:00');
      const schedule2 = ScheduleValueObject.generate('8/8h', '08:00');

      expect(schedule1.equals(schedule2)).toBe(true);
    });

    it('should not be equal if frequencies differ', () => {
      const schedule1 = ScheduleValueObject.generate('8/8h', '08:00');
      const schedule2 = ScheduleValueObject.generate('12/12h', '08:00');

      expect(schedule1.equals(schedule2)).toBe(false);
    });

    it('should not be equal if start times differ', () => {
      const schedule1 = ScheduleValueObject.generate('8/8h', '08:00');
      const schedule2 = ScheduleValueObject.generate('8/8h', '09:00');

      expect(schedule1.equals(schedule2)).toBe(false);
    });

    it('should clone correctly', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');
      const cloned = schedule.clone();

      expect(cloned).not.toBe(schedule); // Different instance
      expect(cloned.equals(schedule)).toBe(true); // But equal value
    });

    it('should convert to plain object', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');
      const plainObject = schedule.toPlainObject();

      expect(plainObject.frequency).toBe('8/8h');
      expect(plainObject.startTime).toBe('08:00');
      expect(plainObject.doses).toBeDefined();
    });

    it('should create from plain object', () => {
      const schedule1 = ScheduleValueObject.generate('8/8h', '08:00');
      const plainObject = schedule1.toPlainObject();
      const schedule2 = ScheduleValueObject.fromPlainObject(plainObject);

      expect(schedule2.frequency).toBe(schedule1.frequency);
      expect(schedule2.startTime).toBe(schedule1.startTime);
    });

  });

  // =====================================================
  // VALIDATION
  // =====================================================

  describe('Validation', () => {

    it('should validate correctly formed schedule', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '08:00');

      expect(schedule.isValid()).toBe(true);
    });

    it('should detect invalid time format in startTime', () => {
      expect(() => {
        new ScheduleValueObject('8/8h', '8:00', []); // Missing leading zero
      }).toThrowError();
    });

  });

  // =====================================================
  // EDGE CASES
  // =====================================================

  describe('Edge Cases', () => {

    it('should handle midnight (00:00) correctly', () => {
      const schedule = ScheduleValueObject.generate('8/8h', '00:00');

      expect(schedule.doses.some(d => d.time === '00:00')).toBe(true);
    });

    it('should handle end of day (23:59) start time', () => {
      const schedule = ScheduleValueObject.generate('12/12h', '23:00');

      expect(schedule.doses.length).toBe(2);
      expect(schedule.doses.some(d => d.time === '23:00')).toBe(true);
    });

    it('should handle high frequency (every hour)', () => {
      const schedule = ScheduleValueObject.generate('1/1h', '08:00');

      expect(schedule.doses.length).toBe(24);
    });

    it('should handle 5x ao dia distribution', () => {
      const schedule = ScheduleValueObject.generate('5x ao dia', '08:00');

      expect(schedule.doses.length).toBe(5);
      // Should distribute evenly
    });

  });

});
