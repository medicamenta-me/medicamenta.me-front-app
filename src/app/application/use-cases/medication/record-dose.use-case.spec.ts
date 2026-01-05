/**
 * Unit Tests: RecordDoseUseCase
 * 
 * Tests the application use case for recording doses (taken/missed).
 * Uses mocked repository to isolate use case logic.
 */

import { TestBed } from '@angular/core/testing';
import { RecordDoseUseCase, RecordDoseCommand } from './record-dose.use-case';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../../core/domain/medication/medication.entity';
import { DoseEntity } from '../../../core/domain/medication/dose.entity';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

describe('RecordDoseUseCase', () => {
  let useCase: RecordDoseUseCase;
  let mockRepository: jasmine.SpyObj<IMedicationRepository>;

  beforeEach(() => {
    mockRepository = jasmine.createSpyObj('IMedicationRepository', [
      'save',
      'findById',
      'findByUserId',
      'delete',
      'streamByUserId'
    ]);

    TestBed.configureTestingModule({
      providers: [
        RecordDoseUseCase,
        { provide: MedicationRepository, useValue: mockRepository }
      ]
    });

    useCase = TestBed.inject(RecordDoseUseCase);
  });

  const createValidCommand = (overrides: Partial<RecordDoseCommand> = {}): RecordDoseCommand => {
    return {
      medicationId: 'med-123',
      userId: 'user-123',
      time: '08:00',
      status: 'taken',
      administeredBy: {
        id: 'user-123',
        name: 'John Doe'
      },
      notes: 'Tomou com água',
      decreaseStock: true,
      ...overrides
    };
  };

  const createMedicationWithSchedule = (): MedicationEntity => {
    const medication = new MedicationEntity({
      id: 'med-123',
      userId: 'user-123',
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: '8 em 8 horas',
      time: '08:00',
      active: true,
      currentStock: 30,
      stockUnit: 'comprimidos',
      schedule: [
        new DoseEntity('08:00', 'upcoming'),
        new DoseEntity('16:00', 'upcoming'),
        new DoseEntity('22:00', 'upcoming')
      ],
      isArchived: false,
      archivedAt: null,
      lastModified: new Date()
    });
    return medication;
  };

  describe('Record Dose as Taken', () => {

    it('should record dose as taken and decrease stock', async () => {
      const command = createValidCommand();
      const medication = createMedicationWithSchedule();
      const initialStock = medication.currentStock;

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(initialStock - 1);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should record dose as taken without decreasing stock when decreaseStock=false', async () => {
      const command = createValidCommand({ decreaseStock: false });
      const medication = createMedicationWithSchedule();
      const initialStock = medication.currentStock;

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(initialStock);
    });

    it('should warn when stock becomes low', async () => {
      const command = createValidCommand();
      const medication = createMedicationWithSchedule();
      medication.updateStock(5); // Low stock - will have 4 after decrease (below threshold of 5)

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.stockWarning).toBeDefined();
      expect(result.stockWarning).toContain('baixo');
    });

    it('should warn when stock becomes critical', async () => {
      const command = createValidCommand();
      const medication = createMedicationWithSchedule();
      medication.updateStock(1); // Critical stock

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.stockWarning).toBeDefined();
    });

    it('should warn when stock is empty', async () => {
      const command = createValidCommand();
      const medication = createMedicationWithSchedule();
      medication.updateStock(1); // Will become 0 after decrease

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(0);
      expect(result.stockWarning).toBeDefined();
      expect(result.stockWarning).toContain('esgotado');
    });

  });

  describe('Record Dose as Missed', () => {

    it('should record dose as missed without decreasing stock', async () => {
      const command = createValidCommand({ status: 'missed' });
      const medication = createMedicationWithSchedule();
      const initialStock = medication.currentStock;

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(initialStock);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should not decrease stock for missed doses even if decreaseStock=true', async () => {
      const command = createValidCommand({ 
        status: 'missed',
        decreaseStock: true 
      });
      const medication = createMedicationWithSchedule();
      const initialStock = medication.currentStock;

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(initialStock);
    });

  });

  describe('Error Handling', () => {

    it('should fail when medication not found', async () => {
      const command = createValidCommand();
      mockRepository.findById.and.resolveTo(null);

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('não encontrado');
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should fail when dose time not in schedule', async () => {
      const command = createValidCommand({ time: '10:00' }); // Not in schedule
      const medication = createMedicationWithSchedule();

      mockRepository.findById.and.resolveTo(medication);

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('should handle repository errors', async () => {
      const command = createValidCommand();
      const medication = createMedicationWithSchedule();

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.rejectWith(new Error('Database error'));

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

  });

  describe('Input Validation', () => {

    it('should reject empty medicationId', async () => {
      const command = createValidCommand({ medicationId: '' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'medicationId')).toBe(true);
    });

    it('should reject empty userId', async () => {
      const command = createValidCommand({ userId: '' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'userId')).toBe(true);
    });

    it('should reject empty time', async () => {
      const command = createValidCommand({ time: '' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'time')).toBe(true);
    });

    it('should reject invalid time format', async () => {
      const command = createValidCommand({ time: '8:00' }); // Missing leading zero

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.code === 'INVALID_TIME_FORMAT')).toBe(true);
    });

    it('should reject invalid status', async () => {
      const command = createValidCommand({ status: 'invalid' as any });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'status')).toBe(true);
    });

    it('should reject missing administeredBy', async () => {
      const command = createValidCommand({ administeredBy: undefined as any });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'administeredBy')).toBe(true);
    });

  });

  describe('Business Rules', () => {

    it('should default to decrease stock for taken doses', async () => {
      const command = createValidCommand({ decreaseStock: undefined });
      const medication = createMedicationWithSchedule();
      const initialStock = medication.currentStock;

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(initialStock - 1);
    });

    it('should default to NOT decrease stock for missed doses', async () => {
      const command = createValidCommand({ 
        status: 'missed',
        decreaseStock: undefined 
      });
      const medication = createMedicationWithSchedule();
      const initialStock = medication.currentStock;

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(initialStock);
    });

  });

});
