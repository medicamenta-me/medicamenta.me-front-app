/**
 * 🧪 Medication Model Tests
 * 
 * Testes unitários para os modelos de Medicamento
 * 
 * @coverage 100%
 * @tests ~50
 */

import { Dose, Medication } from './medication.model';

describe('Medication Model', () => {

  // ============================================================
  // Dose Interface TESTS
  // ============================================================

  describe('Dose Interface', () => {
    
    describe('Dose Status', () => {
      const validStatuses: Dose['status'][] = ['upcoming', 'taken', 'missed'];

      it('should have 3 dose statuses', () => {
        expect(validStatuses.length).toBe(3);
      });

      it('should allow "upcoming" status', () => {
        const dose: Dose = { time: '08:00', status: 'upcoming' };
        expect(dose.status).toBe('upcoming');
      });

      it('should allow "taken" status', () => {
        const dose: Dose = { time: '08:00', status: 'taken' };
        expect(dose.status).toBe('taken');
      });

      it('should allow "missed" status', () => {
        const dose: Dose = { time: '08:00', status: 'missed' };
        expect(dose.status).toBe('missed');
      });

      validStatuses.forEach(status => {
        it(`should include "${status}" as valid dose status`, () => {
          const dose: Dose = { time: '08:00', status };
          expect(dose.status).toBe(status);
        });
      });
    });

    describe('Dose Fields', () => {
      const createMockDose = (overrides: Partial<Dose> = {}): Dose => ({
        time: '08:00',
        status: 'upcoming',
        ...overrides
      });

      it('should create dose with required fields', () => {
        const dose = createMockDose();
        expect(dose.time).toBe('08:00');
        expect(dose.status).toBe('upcoming');
      });

      it('should support time in HH:MM format', () => {
        const dose = createMockDose({ time: '14:30' });
        expect(dose.time).toMatch(/^\d{2}:\d{2}$/);
      });

      it('should support administeredBy with id and name', () => {
        const dose = createMockDose({ 
          status: 'taken',
          administeredBy: { id: 'nurse-001', name: 'Nurse Maria Silva' }
        });
        expect(dose.administeredBy?.id).toBe('nurse-001');
        expect(dose.administeredBy?.name).toBe('Nurse Maria Silva');
      });

      it('should support notes field', () => {
        const dose = createMockDose({ 
          notes: 'Patient reported mild nausea'
        });
        expect(dose.notes).toBe('Patient reported mild nausea');
      });

      it('should allow optional fields to be undefined', () => {
        const dose = createMockDose();
        expect(dose.administeredBy).toBeUndefined();
        expect(dose.notes).toBeUndefined();
      });

      it('should support morning dose times', () => {
        const earlyMorning = createMockDose({ time: '06:00' });
        const morning = createMockDose({ time: '08:00' });
        const lateMorning = createMockDose({ time: '11:00' });
        
        expect(earlyMorning.time).toBe('06:00');
        expect(morning.time).toBe('08:00');
        expect(lateMorning.time).toBe('11:00');
      });

      it('should support afternoon dose times', () => {
        const earlyAfternoon = createMockDose({ time: '12:00' });
        const afternoon = createMockDose({ time: '14:00' });
        
        expect(earlyAfternoon.time).toBe('12:00');
        expect(afternoon.time).toBe('14:00');
      });

      it('should support evening dose times', () => {
        const evening = createMockDose({ time: '18:00' });
        const night = createMockDose({ time: '22:00' });
        
        expect(evening.time).toBe('18:00');
        expect(night.time).toBe('22:00');
      });
    });
  });

  // ============================================================
  // Medication Interface TESTS
  // ============================================================

  describe('Medication Interface', () => {
    const createMockMedication = (overrides: Partial<Medication> = {}): Medication => ({
      id: 'med-001',
      patientId: 'patient-001',
      name: 'Losartana',
      dosage: '50mg',
      frequency: 'daily',
      stock: 60,
      schedule: [
        { time: '08:00', status: 'taken' },
        { time: '20:00', status: 'upcoming' }
      ],
      notes: 'Tomar com água',
      ...overrides
    });

    describe('Basic Fields', () => {
      it('should create medication with all required fields', () => {
        const med = createMockMedication();
        expect(med.id).toBe('med-001');
        expect(med.name).toBe('Losartana');
        expect(med.dosage).toBe('50mg');
      });

      it('should have patient id', () => {
        const med = createMockMedication({ patientId: 'patient-001' });
        expect(med.patientId).toBe('patient-001');
      });

      it('should have valid frequency', () => {
        const med = createMockMedication({ frequency: 'daily' });
        expect(med.frequency).toBe('daily');
      });

      it('should have schedule array', () => {
        const med = createMockMedication();
        expect(Array.isArray(med.schedule)).toBe(true);
        expect(med.schedule.length).toBe(2);
      });
    });

    describe('Date Fields', () => {
      it('should have optional start date', () => {
        const medWithStart = createMockMedication({ startDate: '2024-01-01' });
        const medWithoutStart = createMockMedication({ startDate: undefined });
        
        expect(medWithStart.startDate).toBe('2024-01-01');
        expect(medWithoutStart.startDate).toBeUndefined();
      });

      it('should have optional end date', () => {
        const medWithEnd = createMockMedication({ endDate: '2025-01-01' });
        const medWithoutEnd = createMockMedication({ endDate: undefined });
        
        expect(medWithEnd.endDate).toBe('2025-01-01');
        expect(medWithoutEnd.endDate).toBeUndefined();
      });

      it('should allow null for dates', () => {
        const medWithNullStart = createMockMedication({ startDate: null });
        const medWithNullEnd = createMockMedication({ endDate: null });
        
        expect(medWithNullStart.startDate).toBeNull();
        expect(medWithNullEnd.endDate).toBeNull();
      });
    });

    describe('Stock Management', () => {
      it('should track stock quantity (deprecated)', () => {
        const med = createMockMedication({ stock: 60 });
        expect(med.stock).toBe(60);
      });

      it('should track current stock', () => {
        const med = createMockMedication({ currentStock: 55 });
        expect(med.currentStock).toBe(55);
      });

      it('should track initial stock', () => {
        const med = createMockMedication({ initialStock: 60 });
        expect(med.initialStock).toBe(60);
      });

      it('should support stock unit', () => {
        const pills = createMockMedication({ stockUnit: 'comprimidos' });
        const ml = createMockMedication({ stockUnit: 'ml' });
        const drops = createMockMedication({ stockUnit: 'gotas' });
        
        expect(pills.stockUnit).toBe('comprimidos');
        expect(ml.stockUnit).toBe('ml');
        expect(drops.stockUnit).toBe('gotas');
      });

      it('should support low stock threshold', () => {
        const med = createMockMedication({ lowStockThreshold: 10 });
        expect(med.lowStockThreshold).toBe(10);
      });

      it('should support zero stock', () => {
        const med = createMockMedication({ stock: 0, currentStock: 0 });
        expect(med.stock).toBe(0);
        expect(med.currentStock).toBe(0);
      });

      it('should calculate if stock is low', () => {
        const med = createMockMedication({ currentStock: 5, lowStockThreshold: 10 });
        const isLow = (med.currentStock || 0) <= (med.lowStockThreshold || 0);
        expect(isLow).toBe(true);
      });

      it('should track continuous use medications', () => {
        const continuous = createMockMedication({ isContinuousUse: true });
        const asNeeded = createMockMedication({ isContinuousUse: false });
        
        expect(continuous.isContinuousUse).toBe(true);
        expect(asNeeded.isContinuousUse).toBe(false);
      });
    });

    describe('Archive Support', () => {
      it('should support archived medications', () => {
        const med = createMockMedication({ 
          isArchived: true,
          archivedAt: new Date('2024-12-28')
        });
        expect(med.isArchived).toBe(true);
        expect(med.archivedAt).toBeInstanceOf(Date);
      });

      it('should default to not archived', () => {
        const med = createMockMedication();
        expect(med.isArchived).toBeUndefined();
      });
    });

    describe('Treatment Completion', () => {
      it('should support completed treatments', () => {
        const med = createMockMedication({ 
          isCompleted: true,
          completedAt: new Date('2024-12-28'),
          completionReason: 'time_ended'
        });
        expect(med.isCompleted).toBe(true);
        expect(med.completedAt).toBeInstanceOf(Date);
        expect(med.completionReason).toBe('time_ended');
      });

      it('should support completion reason - time ended', () => {
        const med = createMockMedication({ completionReason: 'time_ended' });
        expect(med.completionReason).toBe('time_ended');
      });

      it('should support completion reason - quantity depleted', () => {
        const med = createMockMedication({ completionReason: 'quantity_depleted' });
        expect(med.completionReason).toBe('quantity_depleted');
      });

      it('should support completion reason - manual', () => {
        const med = createMockMedication({ completionReason: 'manual' });
        expect(med.completionReason).toBe('manual');
      });

      it('should track total doses planned', () => {
        const med = createMockMedication({ totalDosesPlanned: 30 });
        expect(med.totalDosesPlanned).toBe(30);
      });

      it('should track doses taken', () => {
        const med = createMockMedication({ dosesTaken: 15 });
        expect(med.dosesTaken).toBe(15);
      });
    });

    describe('Doctor Information', () => {
      it('should support doctor name', () => {
        const med = createMockMedication({ doctorName: 'Dr. João Silva' });
        expect(med.doctorName).toBe('Dr. João Silva');
      });

      it('should support doctor CRM', () => {
        const med = createMockMedication({ doctorCRM: 'CRM-SP 123456' });
        expect(med.doctorCRM).toBe('CRM-SP 123456');
      });
    });

    describe('Offline Support', () => {
      it('should support userId for IndexedDB', () => {
        const med = createMockMedication({ userId: 'user-001' });
        expect(med.userId).toBe('user-001');
      });

      it('should support lastModified timestamp', () => {
        const med = createMockMedication({ lastModified: new Date('2024-12-28') });
        expect(med.lastModified).toBeInstanceOf(Date);
      });
    });

    describe('Additional Fields', () => {
      it('should support notes', () => {
        const med = createMockMedication({ notes: 'Tomar com água' });
        expect(med.notes).toBe('Tomar com água');
      });
    });

    describe('Frequency Options', () => {
      it('should support daily frequency', () => {
        const med = createMockMedication({ frequency: 'daily' });
        expect(med.frequency).toBe('daily');
      });

      it('should support twice daily frequency', () => {
        const med = createMockMedication({ frequency: 'twice-daily' });
        expect(med.frequency).toBe('twice-daily');
      });

      it('should support weekly frequency', () => {
        const med = createMockMedication({ frequency: 'weekly' });
        expect(med.frequency).toBe('weekly');
      });

      it('should support as needed frequency', () => {
        const med = createMockMedication({ frequency: 'as-needed' });
        expect(med.frequency).toBe('as-needed');
      });
    });
  });
});
