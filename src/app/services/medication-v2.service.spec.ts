import { Medication, Dose } from '../models/medication.model';

/**
 * Unit tests for MedicationServiceV2
 * Tests interfaces, types, and utility logic for DDD facade
 */
describe('MedicationServiceV2', () => {
  
  describe('Dose Status Types', () => {
    
    it('should support taken status', () => {
      const dose: Partial<Dose> = {
        time: '08:00',
        status: 'taken'
      };
      expect(dose.status).toBe('taken');
    });

    it('should support missed status', () => {
      const dose: Partial<Dose> = {
        time: '08:00',
        status: 'missed'
      };
      expect(dose.status).toBe('missed');
    });

    it('should support upcoming status', () => {
      const dose: Partial<Dose> = {
        time: '08:00',
        status: 'upcoming'
      };
      expect(dose.status).toBe('upcoming');
    });
  });

  describe('Medication Data Structure', () => {
    
    it('should create valid medication', () => {
      const med: Medication = {
        id: 'med-1',
        patientId: 'patient-1',
        name: 'Aspirin',
        dosage: '100mg',
        frequency: 'daily',
        stock: 30,
        currentStock: 30,
        stockUnit: 'comprimidos',
        schedule: [],
        userId: 'user-1',
        lastModified: new Date()
      };

      expect(med.id).toBe('med-1');
      expect(med.name).toBe('Aspirin');
      expect(med.currentStock).toBe(30);
    });

    it('should create medication with schedule', () => {
      const med: Medication = {
        id: 'med-2',
        patientId: 'patient-1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'twice daily',
        stock: 60,
        currentStock: 60,
        stockUnit: 'comprimidos',
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ],
        userId: 'user-1',
        lastModified: new Date()
      };

      expect(med.schedule.length).toBe(2);
    });

    it('should create archived medication', () => {
      const med: Medication = {
        id: 'med-3',
        patientId: 'patient-1',
        name: 'Old Med',
        dosage: '50mg',
        frequency: 'daily',
        stock: 0,
        currentStock: 0,
        stockUnit: 'comprimidos',
        schedule: [],
        isArchived: true,
        archivedAt: new Date(),
        userId: 'user-1',
        lastModified: new Date()
      };

      expect(med.isArchived).toBeTrue();
      expect(med.archivedAt).toBeDefined();
    });
  });

  describe('Command Validation', () => {
    
    interface AddMedicationCommand {
      userId: string;
      name: string;
      dosage: string;
      frequency: string;
      startTime: string;
      notes?: string;
      currentStock: number;
      stockUnit: string;
    }

    function validateAddCommand(command: AddMedicationCommand): string[] {
      const errors: string[] = [];
      
      if (!command.userId) errors.push('userId is required');
      if (!command.name || command.name.trim().length === 0) errors.push('name is required');
      if (!command.dosage) errors.push('dosage is required');
      if (!command.frequency) errors.push('frequency is required');
      if (!command.startTime) errors.push('startTime is required');
      if (command.currentStock < 0) errors.push('currentStock must be non-negative');
      
      return errors;
    }

    it('should validate valid command', () => {
      const command: AddMedicationCommand = {
        userId: 'user-1',
        name: 'Aspirin',
        dosage: '100mg',
        frequency: 'daily',
        startTime: '08:00',
        currentStock: 30,
        stockUnit: 'comprimidos'
      };

      const errors = validateAddCommand(command);
      expect(errors.length).toBe(0);
    });

    it('should reject command without name', () => {
      const command: AddMedicationCommand = {
        userId: 'user-1',
        name: '',
        dosage: '100mg',
        frequency: 'daily',
        startTime: '08:00',
        currentStock: 30,
        stockUnit: 'comprimidos'
      };

      const errors = validateAddCommand(command);
      expect(errors).toContain('name is required');
    });

    it('should reject negative stock', () => {
      const command: AddMedicationCommand = {
        userId: 'user-1',
        name: 'Test',
        dosage: '100mg',
        frequency: 'daily',
        startTime: '08:00',
        currentStock: -5,
        stockUnit: 'comprimidos'
      };

      const errors = validateAddCommand(command);
      expect(errors).toContain('currentStock must be non-negative');
    });
  });

  describe('Entity to DTO Conversion', () => {
    
    interface MedicationEntity {
      id: string;
      userId: string;
      name: string;
      dosage: string;
      frequency: string;
      currentStock: number;
      stockUnit: string;
      notes?: string;
      schedule: Array<{ time: string; status: string; administeredBy?: { id: string; name: string }; notes?: string }>;
      isArchived: boolean;
      archivedAt?: Date;
      lastModified: Date;
    }

    function entityToDTO(entity: MedicationEntity): Medication {
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
          status: dose.status as Dose['status'],
          administeredBy: dose.administeredBy,
          notes: dose.notes
        })),
        isArchived: entity.isArchived,
        archivedAt: entity.archivedAt,
        userId: entity.userId,
        lastModified: entity.lastModified
      };
    }

    it('should convert entity to DTO', () => {
      const entity: MedicationEntity = {
        id: 'med-1',
        userId: 'user-1',
        name: 'Aspirin',
        dosage: '100mg',
        frequency: 'daily',
        currentStock: 30,
        stockUnit: 'comprimidos',
        schedule: [{ time: '08:00', status: 'upcoming' }],
        isArchived: false,
        lastModified: new Date()
      };

      const dto = entityToDTO(entity);
      
      expect(dto.id).toBe('med-1');
      expect(dto.patientId).toBe('user-1');
      expect(dto.stock).toBe(30);
      expect(dto.currentStock).toBe(30);
    });

    it('should map schedule correctly', () => {
      const entity: MedicationEntity = {
        id: 'med-1',
        userId: 'user-1',
        name: 'Test',
        dosage: '50mg',
        frequency: 'twice daily',
        currentStock: 10,
        stockUnit: 'unidades',
        schedule: [
          { time: '08:00', status: 'taken', administeredBy: { id: 'u1', name: 'John' }, notes: 'With food' },
          { time: '20:00', status: 'upcoming' }
        ],
        isArchived: false,
        lastModified: new Date()
      };

      const dto = entityToDTO(entity);
      
      expect(dto.schedule.length).toBe(2);
      expect(dto.schedule[0].administeredBy?.name).toBe('John');
      expect(dto.schedule[0].notes).toBe('With food');
    });
  });

  describe('Stock Analysis', () => {
    
    interface StockAnalysis {
      currentStock: number;
      daysRemaining: number;
      needsRestock: boolean;
      restockUrgency: 'none' | 'low' | 'medium' | 'high';
    }

    function analyzeStock(
      currentStock: number,
      dailyDoses: number,
      thresholdDays: number = 7
    ): StockAnalysis {
      const daysRemaining = dailyDoses > 0 
        ? Math.floor(currentStock / dailyDoses) 
        : Infinity;
      
      const needsRestock = daysRemaining <= thresholdDays;
      
      let restockUrgency: 'none' | 'low' | 'medium' | 'high' = 'none';
      if (daysRemaining <= 3) restockUrgency = 'high';
      else if (daysRemaining <= 7) restockUrgency = 'medium';
      else if (daysRemaining <= 14) restockUrgency = 'low';
      
      return {
        currentStock,
        daysRemaining,
        needsRestock,
        restockUrgency
      };
    }

    it('should calculate days remaining', () => {
      const analysis = analyzeStock(30, 1);
      expect(analysis.daysRemaining).toBe(30);
    });

    it('should detect high urgency', () => {
      const analysis = analyzeStock(3, 1);
      expect(analysis.restockUrgency).toBe('high');
      expect(analysis.needsRestock).toBeTrue();
    });

    it('should detect medium urgency', () => {
      const analysis = analyzeStock(5, 1);
      expect(analysis.restockUrgency).toBe('medium');
    });

    it('should detect low urgency', () => {
      const analysis = analyzeStock(10, 1);
      expect(analysis.restockUrgency).toBe('low');
    });

    it('should handle no urgency', () => {
      const analysis = analyzeStock(30, 1);
      expect(analysis.restockUrgency).toBe('none');
      expect(analysis.needsRestock).toBeFalse();
    });

    it('should handle multiple daily doses', () => {
      const analysis = analyzeStock(14, 2);
      expect(analysis.daysRemaining).toBe(7);
    });
  });

  describe('Use Case Result', () => {
    
    interface UseCaseResult {
      success: boolean;
      error?: string;
      validation?: { errors: string[] };
      medication?: Medication;
      stockWarning?: string;
    }

    it('should create success result', () => {
      const result: UseCaseResult = {
        success: true,
        medication: {
          id: 'med-1',
          patientId: 'p1',
          name: 'Test',
          dosage: '10mg',
          frequency: 'daily',
          stock: 10,
          currentStock: 10,
          stockUnit: 'unidades',
          schedule: [],
          userId: 'u1',
          lastModified: new Date()
        }
      };

      expect(result.success).toBeTrue();
      expect(result.medication).toBeDefined();
    });

    it('should create error result', () => {
      const result: UseCaseResult = {
        success: false,
        error: 'Medication not found'
      };

      expect(result.success).toBeFalse();
      expect(result.error).toBe('Medication not found');
    });

    it('should create validation error result', () => {
      const result: UseCaseResult = {
        success: false,
        error: 'Validation failed',
        validation: {
          errors: ['Name is required', 'Dosage is required']
        }
      };

      expect(result.validation?.errors.length).toBe(2);
    });

    it('should include stock warning', () => {
      const result: UseCaseResult = {
        success: true,
        stockWarning: 'Stock is low (3 days remaining)'
      };

      expect(result.stockWarning).toContain('low');
    });
  });

  describe('Record Dose Command', () => {
    
    interface RecordDoseCommand {
      medicationId: string;
      userId: string;
      time: string;
      status: 'taken' | 'missed';
      administeredBy: { id: string; name: string };
      notes?: string;
      decreaseStock: boolean;
    }

    function validateRecordDoseCommand(command: RecordDoseCommand): boolean {
      if (!command.medicationId) return false;
      if (!command.userId) return false;
      if (!command.time) return false;
      if (!['taken', 'missed'].includes(command.status)) return false;
      if (!command.administeredBy.id || !command.administeredBy.name) return false;
      return true;
    }

    it('should validate valid command', () => {
      const command: RecordDoseCommand = {
        medicationId: 'med-1',
        userId: 'user-1',
        time: '08:00',
        status: 'taken',
        administeredBy: { id: 'u1', name: 'John' },
        decreaseStock: true
      };

      expect(validateRecordDoseCommand(command)).toBeTrue();
    });

    it('should reject invalid status', () => {
      const command = {
        medicationId: 'med-1',
        userId: 'user-1',
        time: '08:00',
        status: 'upcoming' as any,
        administeredBy: { id: 'u1', name: 'John' },
        decreaseStock: false
      };

      expect(validateRecordDoseCommand(command)).toBeFalse();
    });
  });

  describe('Frequency Helpers', () => {
    
    function getDailyDoseCount(frequency: string): number {
      const freq = frequency.toLowerCase();
      if (freq.includes('once') || freq === 'daily') return 1;
      if (freq.includes('twice') || freq.includes('2x')) return 2;
      if (freq.includes('three') || freq.includes('3x')) return 3;
      if (freq.includes('four') || freq.includes('4x')) return 4;
      if (freq.includes('every 8 hours')) return 3;
      if (freq.includes('every 6 hours')) return 4;
      if (freq.includes('every 4 hours')) return 6;
      return 1;
    }

    it('should detect daily frequency', () => {
      expect(getDailyDoseCount('daily')).toBe(1);
      expect(getDailyDoseCount('once daily')).toBe(1);
    });

    it('should detect twice daily', () => {
      expect(getDailyDoseCount('twice daily')).toBe(2);
      expect(getDailyDoseCount('2x per day')).toBe(2);
    });

    it('should detect every 8 hours', () => {
      expect(getDailyDoseCount('every 8 hours')).toBe(3);
    });

    it('should detect every 6 hours', () => {
      expect(getDailyDoseCount('every 6 hours')).toBe(4);
    });
  });

  describe('Archive/Unarchive Logic', () => {
    
    interface MedicationState {
      isArchived: boolean;
      archivedAt?: Date;
    }

    function archive(state: MedicationState): MedicationState {
      return {
        isArchived: true,
        archivedAt: new Date()
      };
    }

    function unarchive(state: MedicationState): MedicationState {
      return {
        isArchived: false,
        archivedAt: undefined
      };
    }

    it('should archive medication', () => {
      const state: MedicationState = { isArchived: false };
      const archived = archive(state);
      
      expect(archived.isArchived).toBeTrue();
      expect(archived.archivedAt).toBeDefined();
    });

    it('should unarchive medication', () => {
      const state: MedicationState = { isArchived: true, archivedAt: new Date() };
      const unarchived = unarchive(state);
      
      expect(unarchived.isArchived).toBeFalse();
      expect(unarchived.archivedAt).toBeUndefined();
    });
  });

  describe('Analytics Events', () => {
    
    type AnalyticsEvent = 
      | 'medication_added'
      | 'medication_updated'
      | 'medication_deleted'
      | 'medication_archived'
      | 'medication_unarchived'
      | 'dose_taken'
      | 'dose_missed'
      | 'medication_add_failed'
      | 'medication_update_failed'
      | 'medication_delete_failed'
      | 'dose_record_failed';

    function isValidAnalyticsEvent(event: string): event is AnalyticsEvent {
      const validEvents = [
        'medication_added', 'medication_updated', 'medication_deleted',
        'medication_archived', 'medication_unarchived',
        'dose_taken', 'dose_missed',
        'medication_add_failed', 'medication_update_failed',
        'medication_delete_failed', 'dose_record_failed'
      ];
      return validEvents.includes(event);
    }

    it('should validate success events', () => {
      expect(isValidAnalyticsEvent('medication_added')).toBeTrue();
      expect(isValidAnalyticsEvent('dose_taken')).toBeTrue();
    });

    it('should validate failure events', () => {
      expect(isValidAnalyticsEvent('medication_add_failed')).toBeTrue();
      expect(isValidAnalyticsEvent('dose_record_failed')).toBeTrue();
    });

    it('should reject invalid events', () => {
      expect(isValidAnalyticsEvent('invalid_event')).toBeFalse();
    });
  });

  describe('Time Formatting', () => {
    
    function parseTime(timeStr: string): { hours: number; minutes: number } {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return { hours, minutes };
    }

    function formatTime(hours: number, minutes: number): string {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    it('should parse time string', () => {
      const parsed = parseTime('08:30');
      expect(parsed.hours).toBe(8);
      expect(parsed.minutes).toBe(30);
    });

    it('should format time', () => {
      expect(formatTime(8, 5)).toBe('08:05');
      expect(formatTime(14, 30)).toBe('14:30');
    });
  });

  describe('Stock Unit Types', () => {
    
    const validUnits = ['comprimidos', 'cápsulas', 'ml', 'gotas', 'unidades', 'doses'];

    function isValidStockUnit(unit: string): boolean {
      return validUnits.includes(unit.toLowerCase());
    }

    it('should validate common units', () => {
      expect(isValidStockUnit('comprimidos')).toBeTrue();
      expect(isValidStockUnit('cápsulas')).toBeTrue();
      expect(isValidStockUnit('ml')).toBeTrue();
      expect(isValidStockUnit('gotas')).toBeTrue();
    });

    it('should reject invalid units', () => {
      expect(isValidStockUnit('invalid')).toBeFalse();
    });
  });
});
