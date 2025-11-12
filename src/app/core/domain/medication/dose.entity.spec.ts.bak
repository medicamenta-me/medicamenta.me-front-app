/**
 * DoseEntity Unit Tests
 * 
 * Tests for the Dose entity - immutable entity representing a scheduled dose.
 * Coverage: State transitions, validation, immutability.
 */

import { DoseEntity, DoseAdministeredBy } from './dose.entity';

describe('DoseEntity', () => {
  const adminUser: DoseAdministeredBy = {
    id: 'user-123',
    name: 'John Doe'
  };

  describe('Constructor and Initialization', () => {
    it('should create a dose entity with valid data', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      expect(dose).toBeDefined();
      expect(dose.time).toBe('08:00');
      expect(dose.status).toBe('upcoming');
    });

    it('should initialize without optional fields', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      expect(dose.administeredBy).toBeUndefined();
      expect(dose.timestamp).toBeUndefined();
      expect(dose.notes).toBeUndefined();
    });

    it('should accept all valid statuses', () => {
      const upcomingDose = new DoseEntity('08:00', 'upcoming');
      const takenDose = new DoseEntity('08:00', 'taken', adminUser);
      const missedDose = new DoseEntity('08:00', 'missed', adminUser);

      expect(upcomingDose.status).toBe('upcoming');
      expect(takenDose.status).toBe('taken');
      expect(missedDose.status).toBe('missed');
    });

    it('should throw error for invalid time format', () => {
      expect(() => new DoseEntity('25:00', 'upcoming')).toThrow();
      expect(() => new DoseEntity('08:60', 'upcoming')).toThrow();
      expect(() => new DoseEntity('', 'upcoming')).toThrow();
    });
  });

  describe('State Transitions - Mark as Taken', () => {
    it('should mark dose as taken with administrator info', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsTaken(adminUser, 'Tomou com água');

      expect(updatedDose.status).toBe('taken');
      expect(updatedDose.administeredBy).toEqual(adminUser);
      expect(updatedDose.notes).toBe('Tomou com água');
      expect(updatedDose.timestamp).toBeDefined();
    });

    it('should mark dose as taken without notes', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsTaken(adminUser);

      expect(updatedDose.status).toBe('taken');
      expect(updatedDose.notes).toBeUndefined();
    });

    it('should return new instance (immutability)', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsTaken(adminUser);

      expect(updatedDose).not.toBe(dose);
      expect(dose.status).toBe('upcoming'); // Original unchanged
      expect(updatedDose.status).toBe('taken');
    });

    it('should throw error when marking already taken dose', () => {
      const dose = new DoseEntity('08:00', 'taken', adminUser);

      expect(() => dose.markAsTaken(adminUser)).toThrow();
    });
  });

  describe('State Transitions - Mark as Missed', () => {
    it('should mark dose as missed with administrator info', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsMissed(adminUser, 'Esqueceu de tomar');

      expect(updatedDose.status).toBe('missed');
      expect(updatedDose.administeredBy).toEqual(adminUser);
      expect(updatedDose.notes).toBe('Esqueceu de tomar');
      expect(updatedDose.timestamp).toBeDefined();
    });

    it('should mark dose as missed without notes', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsMissed(adminUser);

      expect(updatedDose.status).toBe('missed');
      expect(updatedDose.notes).toBeUndefined();
    });

    it('should return new instance (immutability)', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsMissed(adminUser);

      expect(updatedDose).not.toBe(dose);
      expect(dose.status).toBe('upcoming');
      expect(updatedDose.status).toBe('missed');
    });

    it('should throw error when marking already missed dose', () => {
      const dose = new DoseEntity('08:00', 'missed', adminUser);

      expect(() => dose.markAsMissed(adminUser)).toThrow();
    });

    it('should throw error when marking taken dose as missed', () => {
      const dose = new DoseEntity('08:00', 'taken', adminUser);

      expect(() => dose.markAsMissed(adminUser)).toThrow();
    });
  });

  describe('State Transitions - Reset', () => {
    it('should reset taken dose to upcoming', () => {
      const dose = new DoseEntity('08:00', 'taken', adminUser, 'Tomado');

      const resetDose = dose.resetToUpcoming();

      expect(resetDose.status).toBe('upcoming');
      expect(resetDose.administeredBy).toBeUndefined();
      expect(resetDose.timestamp).toBeUndefined();
      expect(resetDose.notes).toBeUndefined();
    });

    it('should reset missed dose to upcoming', () => {
      const dose = new DoseEntity('08:00', 'missed', adminUser);

      const resetDose = dose.resetToUpcoming();

      expect(resetDose.status).toBe('upcoming');
      expect(resetDose.administeredBy).toBeUndefined();
    });

    it('should return new instance (immutability)', () => {
      const dose = new DoseEntity('08:00', 'taken', adminUser);

      const resetDose = dose.resetToUpcoming();

      expect(resetDose).not.toBe(dose);
      expect(dose.status).toBe('taken');
      expect(resetDose.status).toBe('upcoming');
    });
  });

  describe('Immutability', () => {
    it('should not modify original when marking as taken', () => {
      const dose = new DoseEntity('08:00', 'upcoming');
      const originalStatus = dose.status;

      dose.markAsTaken(adminUser);

      expect(dose.status).toBe(originalStatus);
    });

    it('should not modify original when marking as missed', () => {
      const dose = new DoseEntity('08:00', 'upcoming');
      const originalStatus = dose.status;

      dose.markAsMissed(adminUser);

      expect(dose.status).toBe(originalStatus);
    });

    it('should not modify original when resetting', () => {
      const dose = new DoseEntity('08:00', 'taken', adminUser);
      const originalStatus = dose.status;

      dose.resetToUpcoming();

      expect(dose.status).toBe(originalStatus);
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight time correctly', () => {
      const dose = new DoseEntity('00:00', 'upcoming');

      expect(dose.time).toBe('00:00');
    });

    it('should handle 23:59 time correctly', () => {
      const dose = new DoseEntity('23:59', 'upcoming');

      expect(dose.time).toBe('23:59');
    });

    it('should handle very long notes', () => {
      const longNote = 'A'.repeat(1000);
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsTaken(adminUser, longNote);

      expect(updatedDose.notes).toBe(longNote);
    });

    it('should handle special characters in notes', () => {
      const specialNote = 'Tomou com água 💊 às 08:00 ✓';
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsTaken(adminUser, specialNote);

      expect(updatedDose.notes).toBe(specialNote);
    });
  });

  describe('Data Integrity', () => {
    it('should preserve time through transitions', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const taken = dose.markAsTaken(adminUser);
      const reset = taken.resetToUpcoming();

      expect(taken.time).toBe('08:00');
      expect(reset.time).toBe('08:00');
    });

    it('should record timestamp when marking as taken', () => {
      const dose = new DoseEntity('08:00', 'upcoming');
      const beforeTime = new Date();

      const updatedDose = dose.markAsTaken(adminUser);

      const afterTime = new Date();

      expect(updatedDose.timestamp).toBeDefined();
      expect(updatedDose.timestamp!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(updatedDose.timestamp!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should record timestamp when marking as missed', () => {
      const dose = new DoseEntity('08:00', 'upcoming');

      const updatedDose = dose.markAsMissed(adminUser);

      expect(updatedDose.timestamp).toBeDefined();
    });
  });
});
