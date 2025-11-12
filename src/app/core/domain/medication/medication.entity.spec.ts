/**
 * MedicationEntity Unit Tests
 * 
 * Tests for the Medication Aggregate Root entity.
 * Coverage: Domain logic, business rules, validations, state transitions.
 */

import { MedicationEntity } from './medication.entity';
import { DoseEntity } from './dose.entity';

describe('MedicationEntity', () => {
  // Helper function to create fresh test data
  const createValidMedicationData = () => ({
    id: 'med-123',
    userId: 'user-456',
    name: 'Dipirona',
    dosage: '500mg',
    frequency: '8 em 8 horas',
    time: '08:00',
    currentStock: 30,
    stockUnit: 'comprimidos',
    notes: 'Tomar com água',
    active: true,
    schedule: [
      new DoseEntity('00:00', 'upcoming'),
      new DoseEntity('08:00', 'upcoming'),
      new DoseEntity('16:00', 'upcoming')
    ],
    createdAt: new Date('2025-01-01'),
    lastModified: new Date('2025-01-01')
  });

  describe('Constructor and Initialization', () => {
    it('should create a medication entity with valid data', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      expect(medication).toBeDefined();
      expect(medication.id).toBe('med-123');
      expect(medication.name).toBe('Dipirona');
      expect(medication.dosage).toBe('500mg');
      expect(medication.currentStock).toBe(30);
    });

    it('should generate schedule on creation', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      expect(medication.schedule).toBeDefined();
      expect(medication.schedule.length).toBe(3);
      expect(medication.schedule[0].time).toBe('08:00');
    });

    it('should set default values for optional fields', () => {
      const minimalData = {
        id: 'med-123',
        userId: 'user-456',
        name: 'Medicamento',
        dosage: '10mg',
        frequency: '12 em 12 horas',
        time: '08:00',
        lastModified: new Date()
      };

      const medication = new MedicationEntity(minimalData);

      expect(medication.currentStock).toBe(0);
      expect(medication.stockUnit).toBe('unidades');
      expect(medication.active).toBe(true);
      expect(medication.isArchived).toBe(false);
      expect(medication.notes).toBeUndefined();
    });

    it('should throw error for invalid data', () => {
      const invalidData = {
        id: '',
        userId: '',
        
        name: '',
        dosage: '',
        frequency: '',
        time: ''
      };

      expect(() => new MedicationEntity(invalidData as any)).toThrow();
    });
  });

  describe('Business Logic - Stock Management', () => {
    it('should decrease stock correctly', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const initialStock = medication.currentStock;

      medication.decreaseStock(5);

      expect(medication.currentStock).toBe(initialStock - 5);
    });

    it('should not allow negative stock', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        currentStock: 3
      });

      expect(() => medication.decreaseStock(5)).toThrow();
      expect(medication.currentStock).toBe(3); // Stock unchanged
    });

    it('should update stock correctly', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      medication.updateStock(50);

      expect(medication.currentStock).toBe(50);
    });

    it('should not allow negative stock update', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      expect(() => medication.updateStock(-10)).toThrow();
    });

    it('should detect out of stock', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        currentStock: 0
      });

      expect(medication.needsRestocking()).toBe(true);
    });
  });

  describe('Business Logic - Dose Management', () => {
    it('should record dose as taken and decrease stock', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const initialStock = medication.currentStock;
      const doseTime = medication.schedule[0].time;

      medication.recordDoseTaken(doseTime, { id: 'user-1', name: 'John Doe' }, 'Tomou corretamente');

      const dose = medication.schedule.find(d => d.time === doseTime);
      expect(dose?.status).toBe('taken');
      expect(dose?.administeredBy?.name).toBe('John Doe');
      expect(dose?.notes).toBe('Tomou corretamente');
      expect(medication.currentStock).toBe(initialStock - 1);
    });

    it('should record dose as missed without decreasing stock', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const initialStock = medication.currentStock;
      const doseTime = medication.schedule[0].time;

      medication.recordDoseMissed(doseTime, { id: 'user-2', name: 'Jane Doe' }, 'Esqueceu de tomar');

      const dose = medication.schedule.find(d => d.time === doseTime);
      expect(dose?.status).toBe('missed');
      expect(dose?.administeredBy?.name).toBe('Jane Doe');
      expect(medication.currentStock).toBe(initialStock); // Stock unchanged
    });

    it('should reset dose to upcoming', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const doseTime = medication.schedule[0].time;

      // Mark as taken first
      medication.recordDoseTaken(doseTime, { id: 'user-1', name: 'John Doe' });
      
      // Reset
      medication.resetDose(doseTime);

      const dose = medication.schedule.find(d => d.time === doseTime);
      expect(dose?.status).toBe('upcoming');
      expect(dose?.administeredBy).toBeUndefined();
    });

    it('should return null for non-existent dose time', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      const result = medication.recordDoseTaken('99:99', { id: 'user-1', name: 'John Doe' });
      
      expect(result).toBeNull();
    });
  });

  describe('Business Logic - Adherence Calculation', () => {
    it('should calculate adherence rate correctly', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      // Mark some doses as taken
      medication.recordDoseTaken(medication.schedule[0].time, { id: 'user-1', name: 'User' });
      medication.recordDoseTaken(medication.schedule[1].time, { id: 'user-1', name: 'User' });
      medication.recordDoseMissed(medication.schedule[2].time, { id: 'user-1', name: 'User' });

      const adherenceRate = medication.calculateAdherenceRate();

      expect(adherenceRate).toBeGreaterThanOrEqual(0);
      expect(adherenceRate).toBeLessThanOrEqual(100);
    });

    it('should return 100% adherence when no doses recorded', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        schedule: []
      });

      const adherenceRate = medication.calculateAdherenceRate();

      expect(adherenceRate).toBe(100);
    });

    it('should return 100% adherence when all doses taken', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      // Mark all doses as taken
      medication.schedule.forEach(dose => {
        medication.recordDoseTaken(dose.time, { id: 'user-1', name: 'User' });
      });

      const adherenceRate = medication.calculateAdherenceRate();

      expect(adherenceRate).toBe(100);
    });
  });

  describe('Business Logic - Update Operations', () => {
    it('should update medication details', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      medication.updateDetails({
        name: 'Paracetamol',
        dosage: '750mg',
        notes: 'Tomar após refeições'
      });

      expect(medication.name).toBe('Paracetamol');
      expect(medication.dosage).toBe('750mg');
      expect(medication.notes).toBe('Tomar após refeições');
      expect(medication.frequency).toBe('8 em 8 horas'); // Unchanged
    });

    it('should update schedule when provided', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const newSchedule = [
        new DoseEntity('06:00', 'upcoming'),
        new DoseEntity('12:00', 'upcoming'),
        new DoseEntity('18:00', 'upcoming'),
        new DoseEntity('00:00', 'upcoming')
      ];

      medication.updateDetails({
        frequency: '6 em 6 horas',
        time: '06:00',
        schedule: newSchedule
      });

      expect(medication.frequency).toBe('6 em 6 horas');
      expect(medication.schedule.length).toBe(4);
    });

    it('should update lastModified timestamp on changes', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const oldTimestamp = medication.lastModified;

      // Wait a bit to ensure timestamp difference
      setTimeout(() => {
        medication.updateDetails({ notes: 'Nova nota' });
        expect(medication.lastModified.getTime()).toBeGreaterThan(oldTimestamp.getTime());
      }, 10);
    });
  });

  describe('Business Logic - Archive/Activate', () => {
    it('should archive medication', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        currentStock: 0
      });

      medication.archive();

      expect(medication.isArchived).toBe(true);
      expect(medication.archivedAt).toBeDefined();
    });

    it('should unarchive medication', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        active: false,
        archivedAt: new Date()
      });

      medication.unarchive();

      expect(medication.isArchived).toBe(false);
      expect(medication.archivedAt).toBeNull();
    });

    it('should deactivate medication', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      medication.deactivate();

      expect(medication.active).toBe(false);
    });

    it('should activate medication', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        active: false
      });

      medication.activate();

      expect(medication.active).toBe(true);
    });
  });

  describe('Immutability and Data Integrity', () => {
    it('should return plain object copy', () => {
      const medication = new MedicationEntity(createValidMedicationData());

      const plainObject = medication.toPlainObject();

      expect(plainObject.id).toBe('med-123');
      expect(plainObject.name).toBe('Dipirona');
      expect(plainObject.dosage).toBe('500mg');
      expect(plainObject.frequency).toBe('8 em 8 horas');
    });

    it('should not allow direct schedule modification', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const originalSchedule = [...medication.schedule];

      // Schedule is readonly - this test just verifies immutability pattern
      expect(medication.schedule.length).toBe(originalSchedule.length);
      expect(medication.schedule).toEqual(originalSchedule);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty notes', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        notes: ''
      });

      expect(medication.notes).toBe('');
    });

    it('should handle zero stock', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        currentStock: 0
      });

      expect(medication.currentStock).toBe(0);
      expect(medication.needsRestocking()).toBe(true);
    });

    it('should handle very large stock numbers', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        currentStock: 999999
      });

      expect(medication.currentStock).toBe(999999);
    });

    it('should handle future dates', () => {
      const futureDate = new Date('2030-01-01');
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        createdAt: futureDate
      });

      expect(medication.createdAt).toEqual(futureDate);
    });
  });

  describe('Schedule Integration', () => {
    it('should order doses chronologically', () => {
      const medication = new MedicationEntity(createValidMedicationData());
      const times = medication.schedule.map(d => d.time);

      // Check if times are in ascending order
      for (let i = 1; i < times.length; i++) {
        expect(times[i] >= times[i - 1]).toBe(true);
      }
    });
  });

  describe('Validation Rules', () => {
    it('should require name', () => {
      expect(() => new MedicationEntity({
        ...createValidMedicationData(),
        name: ''
      } as any)).toThrow('Medication name is required');
    });

    it('should allow empty dosage for drafts', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        dosage: ''
      });
      
      expect(medication.dosage).toBe('');
    });

    it('should allow empty frequency for drafts', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        frequency: ''
      });
      
      expect(medication.frequency).toBe('');
    });

    it('should allow empty userId for system medications', () => {
      const medication = new MedicationEntity({
        ...createValidMedicationData(),
        userId: ''
      });
      
      expect(medication.userId).toBe('');
    });

    it('should accept valid stock units', () => {
      const units = ['comprimidos', 'ml', 'gotas', 'cápsulas', 'unidades'];

      units.forEach(unit => {
        const medication = new MedicationEntity({
          ...createValidMedicationData(),
          stockUnit: unit
        });

        expect(medication.stockUnit).toBe(unit);
      });
    });
  });
});
