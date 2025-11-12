/**
 * Unit Tests: DeleteMedicationUseCase
 * 
 * Tests the application use case for deleting medications.
 * Uses mocked repository to isolate use case logic.
 */

import { TestBed } from '@angular/core/testing';
import { DeleteMedicationUseCase, DeleteMedicationCommand } from './delete-medication.use-case';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../../core/domain/medication/medication.entity';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

describe('DeleteMedicationUseCase', () => {
  let useCase: DeleteMedicationUseCase;
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
        DeleteMedicationUseCase,
        { provide: MedicationRepository, useValue: mockRepository }
      ]
    });

    useCase = TestBed.inject(DeleteMedicationUseCase);
  });

  const createValidCommand = (overrides: Partial<DeleteMedicationCommand> = {}): DeleteMedicationCommand => {
    return {
      medicationId: 'med-123',
      userId: 'user-123',
      medicationName: 'Paracetamol',
      confirmDeletion: true,
      ...overrides
    };
  };

  const createMedication = (overrides: any = {}): MedicationEntity => {
    return new MedicationEntity({
      id: 'med-123',
      userId: 'user-123',
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: '8 em 8 horas',
      time: '08:00',
      active: true,
      currentStock: 0,
      stockUnit: 'comprimidos',
      schedule: [],
      isArchived: false,
      archivedAt: null,
      lastModified: new Date(),
      ...overrides
    });
  };

  describe('Successful Execution', () => {

    it('should delete medication when confirmed', async () => {
      const command = createValidCommand();
      const medication = createMedication();

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.delete.and.resolveTo(undefined);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('med-123', 'user-123');
    });

    it('should delete medication with zero stock', async () => {
      const command = createValidCommand();
      const medication = createMedication({ currentStock: 0 });

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.delete.and.resolveTo(undefined);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
    });

  });

  describe('Safety Checks', () => {

    it('should require explicit confirmation', async () => {
      const command = createValidCommand({ confirmDeletion: false });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Confirmação');
      expect(result.warning).toContain('confirme');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should require confirmation even if undefined', async () => {
      const command = createValidCommand({ confirmDeletion: undefined });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

  });

  describe('Error Handling', () => {

    it('should fail when medication not found', async () => {
      const command = createValidCommand();
      mockRepository.findById.and.resolveTo(null);

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('não encontrado');
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle repository deletion errors', async () => {
      const command = createValidCommand();
      const medication = createMedication();

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.delete.and.rejectWith(new Error('Database error'));

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
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should reject empty userId', async () => {
      const command = createValidCommand({ userId: '' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'userId')).toBe(true);
    });

    it('should warn about missing medication name', async () => {
      const command = createValidCommand({ medicationName: '' });
      const medication = createMedication();

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.delete.and.resolveTo(undefined);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true); // Warning, not error
      expect(mockRepository.delete).toHaveBeenCalled();
    });

  });

  describe('Business Rules', () => {

    it('should allow deleting medication with stock', async () => {
      const command = createValidCommand();
      const medication = createMedication({ currentStock: 20 });

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.delete.and.resolveTo(undefined);

      const result = await useCase.execute(command);

      // Should succeed despite having stock
      expect(result.success).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalled();
    });

    it('should allow deleting active medication', async () => {
      const command = createValidCommand();
      const medication = createMedication({ active: true, isArchived: false });

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.delete.and.resolveTo(undefined);

      const result = await useCase.execute(command);

      // Should succeed despite being active
      expect(result.success).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalled();
    });

    it('should allow deleting archived medication', async () => {
      const command = createValidCommand();
      const medication = createMedication({ isArchived: true, active: false });

      mockRepository.findById.and.resolveTo(medication);
      mockRepository.delete.and.resolveTo(undefined);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
    });

  });

});
