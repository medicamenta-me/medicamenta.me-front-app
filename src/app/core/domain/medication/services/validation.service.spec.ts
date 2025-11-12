/**
 * Unit Tests: ValidationService
 * 
 * Tests all validation business rules for medications.
 * Coverage: validateMedication, validateSchedule, validateMedicationList,
 *           validateDosageFormat, validateFrequencyFormat, validateTimeFormat,
 *           utility methods
 */

import { ValidationService, ValidationResult } from './validation.service';
import { MedicationEntity } from '../medication.entity';
import { DoseEntity } from '../dose.entity';

describe('ValidationService', () => {

  // =====================================================
  // TEST DATA HELPERS
  // =====================================================

  const createValidMedication = (overrides: any = {}): MedicationEntity => {
    return new MedicationEntity({
      id: 'med-123',
      userId: 'user-123',
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: '8 em 8 horas',
      time: '08:00',
      currentStock: 10,
      stockUnit: 'comprimidos',
      notes: 'Tomar com água',
      active: true,
      isArchived: false,
      archivedAt: null,
      schedule: [],
      lastModified: new Date('2025-01-01'),
      createdAt: new Date('2025-01-01'),
      ...overrides
    });
  };

  const createValidDose = (time: string = '08:00'): DoseEntity => {
    return new DoseEntity(time, 'upcoming');
  };

  // =====================================================
  // VALIDATE MEDICATION
  // =====================================================

  describe('validateMedication', () => {

    it('should return valid for a complete medication', () => {
      const medication = createValidMedication();
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should require medication name', () => {
      const medication = createValidMedication({ name: '' });
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD');
      expect(result.errors[0].field).toBe('name');
    });

    it('should warn when dosage is missing', () => {
      const medication = createValidMedication({ dosage: '' });
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('MISSING_DOSAGE');
    });

    it('should require frequency', () => {
      const medication = createValidMedication({ frequency: '' });
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'frequency')).toBe(true);
    });

    it('should reject negative stock', () => {
      const medication = createValidMedication({ currentStock: -5 });
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_STOCK')).toBe(true);
    });

    it('should reject archived medication that is active', () => {
      const medication = createValidMedication({ isArchived: true, active: true });
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'ARCHIVED_ACTIVE_CONFLICT')).toBe(true);
    });

    it('should warn when archived medication has stock', () => {
      const medication = createValidMedication({ 
        isArchived: true, 
        active: false, 
        currentStock: 10 
      });
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.warnings.some(w => w.code === 'ARCHIVED_WITH_STOCK')).toBe(true);
    });

    it('should warn when schedule is empty', () => {
      const medication = createValidMedication({ schedule: [] });
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.warnings.some(w => w.code === 'EMPTY_SCHEDULE')).toBe(true);
    });

    it('should warn when stock is low', () => {
      const medication = createValidMedication({ currentStock: 3 }); // Below lowStockThreshold of 5
      
      const result = ValidationService.validateMedication(medication);
      
      expect(result.warnings.some(w => w.code === 'LOW_STOCK')).toBe(true);
    });

  });

  // =====================================================
  // VALIDATE SCHEDULE
  // =====================================================

  describe('validateSchedule', () => {

    it('should return valid for non-duplicate times', () => {
      const doses = [
        createValidDose('08:00'),
        createValidDose('16:00'),
        createValidDose('22:00')
      ];
      
      const result = ValidationService.validateSchedule(doses);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect duplicate times', () => {
      const doses = [
        createValidDose('08:00'),
        createValidDose('08:00'), // Duplicate
        createValidDose('16:00')
      ];
      
      const result = ValidationService.validateSchedule(doses);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_TIMES')).toBe(true);
    });

    it('should warn when doses are too close (less than 1 hour)', () => {
      const doses = [
        createValidDose('08:00'),
        createValidDose('08:30'), // 30 minutes apart
        createValidDose('16:00')
      ];
      
      const result = ValidationService.validateSchedule(doses);
      
      expect(result.warnings.some(w => w.code === 'CLOSE_DOSES')).toBe(true);
    });

    it('should accept doses exactly 1 hour apart', () => {
      const doses = [
        createValidDose('08:00'),
        createValidDose('09:00'),
        createValidDose('10:00')
      ];
      
      const result = ValidationService.validateSchedule(doses);
      
      expect(result.warnings.some(w => w.code === 'CLOSE_DOSES')).toBe(false);
    });

  });

  // =====================================================
  // VALIDATE MEDICATION LIST
  // =====================================================

  describe('validateMedicationList', () => {

    it('should return valid for unique medications', () => {
      const medications = [
        createValidMedication({ name: 'Paracetamol' } as any),
        createValidMedication({ name: 'Ibuprofeno' } as any),
        createValidMedication({ name: 'Dipirona' } as any)
      ];
      
      const result = ValidationService.validateMedicationList(medications);
      
      expect(result.isValid).toBe(true);
    });

    it('should warn about duplicate medication names (case-insensitive)', () => {
      const medications = [
        createValidMedication({ name: 'Paracetamol' } as any),
        createValidMedication({ name: 'paracetamol' } as any), // Duplicate
        createValidMedication({ name: 'Ibuprofeno' } as any)
      ];
      
      const result = ValidationService.validateMedicationList(medications);
      
      expect(result.warnings.some(w => w.code === 'DUPLICATE_MEDICATION')).toBe(true);
      expect(result.warnings[0].message).toContain('2 vezes');
    });

    it('should warn when more than 3 medications at same time', () => {
      const medications = [
        createValidMedication({ name: 'Med1' } as any),
        createValidMedication({ name: 'Med2' } as any),
        createValidMedication({ name: 'Med3' } as any),
        createValidMedication({ name: 'Med4' } as any)
      ];
      
      // All have same default schedule time
      const result = ValidationService.validateMedicationList(medications);
      
      expect(result.warnings.some(w => w.code === 'MANY_CONCURRENT_MEDS')).toBe(true);
    });

    it('should skip archived medications when checking time conflicts', () => {
      const med1 = createValidMedication({ name: 'Med1' } as any);
      const med2 = createValidMedication({ name: 'Med2', isArchived: true, active: false } as any);
      
      const medications = [med1, med2];
      
      const result = ValidationService.validateMedicationList(medications);
      
      // Should not count archived medication in time conflicts
      expect(result.warnings.some(w => w.code === 'MANY_CONCURRENT_MEDS')).toBe(false);
    });

  });

  // =====================================================
  // VALIDATE DOSAGE FORMAT
  // =====================================================

  describe('validateDosageFormat', () => {

    it('should accept valid dosage formats', () => {
      const validDosages = [
        '500mg',
        '1 comprimido',
        '5ml',
        '250mcg',
        '10 UI',
        '2 cápsulas',
        '20 gotas',
        '250/5ml', // Fraction
        '2.5mg' // Decimal
      ];

      for (const dosage of validDosages) {
        const result = ValidationService.validateDosageFormat(dosage);
        expect(result.isValid).toBe(true);
      }
    });

    it('should warn for empty dosage', () => {
      const result = ValidationService.validateDosageFormat('');
      
      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings.some(w => w.code === 'EMPTY_DOSAGE')).toBe(true);
    });

    it('should warn for unusual dosage format', () => {
      const result = ValidationService.validateDosageFormat('Meia colher');
      
      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings.some(w => w.code === 'UNUSUAL_FORMAT')).toBe(true);
    });

  });

  // =====================================================
  // VALIDATE FREQUENCY FORMAT
  // =====================================================

  describe('validateFrequencyFormat', () => {

    it('should accept valid frequency formats', () => {
      const validFrequencies = [
        '8/8h',
        '12/12h',
        '24/24h',
        '3x ao dia',
        '2 vezes ao dia',
        'diário',
        'diariamente',
        'contínuo',
        'quando necessário'
      ];

      for (const frequency of validFrequencies) {
        const result = ValidationService.validateFrequencyFormat(frequency);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject empty frequency', () => {
      const result = ValidationService.validateFrequencyFormat('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'EMPTY_FREQUENCY')).toBe(true);
    });

    it('should warn for unusual frequency format', () => {
      const result = ValidationService.validateFrequencyFormat('De vez em quando');
      
      expect(result.isValid).toBe(true); // Warning, not error
      expect(result.warnings.some(w => w.code === 'UNUSUAL_FREQUENCY')).toBe(true);
    });

  });

  // =====================================================
  // VALIDATE TIME FORMAT
  // =====================================================

  describe('validateTimeFormat', () => {

    it('should accept valid time formats', () => {
      const validTimes = [
        '00:00',
        '08:00',
        '12:30',
        '23:59'
      ];

      for (const time of validTimes) {
        const result = ValidationService.validateTimeFormat(time);
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      }
    });

    it('should reject invalid hours (>23)', () => {
      const result = ValidationService.validateTimeFormat('24:00');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TIME_FORMAT')).toBe(true);
    });

    it('should reject invalid minutes (>59)', () => {
      const result = ValidationService.validateTimeFormat('08:60');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TIME_FORMAT')).toBe(true);
    });

    it('should reject wrong format', () => {
      const invalidTimes = [
        '8:00', // Missing leading zero
        '08:0', // Missing trailing zero
        '8:0',
        '800',
        '08-00',
        'invalid'
      ];

      for (const time of invalidTimes) {
        const result = ValidationService.validateTimeFormat(time);
        expect(result.isValid).toBe(false);
      }
    });

  });

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  describe('combineResults', () => {

    it('should combine multiple validation results', () => {
      const result1: ValidationResult = {
        isValid: false,
        errors: [{ field: 'name', code: 'ERROR1', message: 'Error 1', severity: 'error' }],
        warnings: []
      };

      const result2: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [{ field: 'dosage', code: 'WARN1', message: 'Warning 1', severity: 'warning' }]
      };

      const combined = ValidationService.combineResults(result1, result2);

      expect(combined.isValid).toBe(false);
      expect(combined.errors.length).toBe(1);
      expect(combined.warnings.length).toBe(1);
    });

    it('should return valid when all results are valid', () => {
      const result1: ValidationResult = { isValid: true, errors: [], warnings: [] };
      const result2: ValidationResult = { isValid: true, errors: [], warnings: [] };

      const combined = ValidationService.combineResults(result1, result2);

      expect(combined.isValid).toBe(true);
    });

  });

  describe('hasIssues', () => {

    it('should return true when there are errors', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [{ field: 'name', code: 'ERROR', message: 'Error', severity: 'error' }],
        warnings: []
      };

      expect(ValidationService.hasIssues(result)).toBe(true);
    });

    it('should return true when there are warnings', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [{ field: 'dosage', code: 'WARN', message: 'Warning', severity: 'warning' }]
      };

      expect(ValidationService.hasIssues(result)).toBe(true);
    });

    it('should return false when no issues', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      expect(ValidationService.hasIssues(result)).toBe(false);
    });

  });

  describe('getErrorMessages', () => {

    it('should extract all error messages', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [
          { field: 'name', code: 'ERROR1', message: 'Error 1', severity: 'error' },
          { field: 'dosage', code: 'ERROR2', message: 'Error 2', severity: 'error' }
        ],
        warnings: []
      };

      const messages = ValidationService.getErrorMessages(result);

      expect(messages.length).toBe(2);
      expect(messages).toContain('Error 1');
      expect(messages).toContain('Error 2');
    });

  });

  describe('getWarningMessages', () => {

    it('should extract all warning messages', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [
          { field: 'stock', code: 'WARN1', message: 'Warning 1', severity: 'warning' },
          { field: 'schedule', code: 'WARN2', message: 'Warning 2', severity: 'warning' }
        ]
      };

      const messages = ValidationService.getWarningMessages(result);

      expect(messages.length).toBe(2);
      expect(messages).toContain('Warning 1');
      expect(messages).toContain('Warning 2');
    });

  });

  describe('getAllMessages', () => {

    it('should combine error and warning messages', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [
          { field: 'name', code: 'ERROR', message: 'Error message', severity: 'error' }
        ],
        warnings: [
          { field: 'dosage', code: 'WARN', message: 'Warning message', severity: 'warning' }
        ]
      };

      const messages = ValidationService.getAllMessages(result);

      expect(messages.length).toBe(2);
      expect(messages).toContain('Error message');
      expect(messages).toContain('Warning message');
    });

  });

});
