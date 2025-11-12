/**
 * Unit Tests: UpdateMedicationUseCase
 * 
 * Tests the application use case for updating medications.
 * Uses mocked repository to isolate use case logic.
 */

import { TestBed } from '@angular/core/testing';
import { UpdateMedicationUseCase, UpdateMedicationCommand } from './update-medication.use-case';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../../core/domain/medication/medication.entity';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

describe('UpdateMedicationUseCase', () => {
  let useCase: UpdateMedicationUseCase;
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
        UpdateMedicationUseCase,
        { provide: MedicationRepository, useValue: mockRepository }
      ]
    });

    useCase = TestBed.inject(UpdateMedicationUseCase);
  });

  const createExistingMedication = (): MedicationEntity => {
    return new MedicationEntity({
      id: 'med-123',
      userId: 'user-123',
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: '8 em 8 horas',
      time: '08:00',
      notes: 'Tomar com água',
      active: true,
      currentStock: 30,
      stockUnit: 'comprimidos',
      schedule: [],
      isArchived: false,
      archivedAt: null,
      lastModified: new Date()
    });
  };

  const createValidCommand = (updates: any = {}): UpdateMedicationCommand => {
    return {
      medicationId: 'med-123',
      userId: 'user-123',
      updates: {
        name: 'Ibuprofeno',
        dosage: '600mg',
        ...updates
      }
    };
  };

  describe('Successful Execution', () => {

    it('should update medication name and dosage', async () => {
      const existing = createExistingMedication();
      const command = createValidCommand();

      mockRepository.findById.and.resolveTo(existing);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.name).toBe('Ibuprofeno');
      expect(result.medication!.dosage).toBe('600mg');
    });

    it('should update stock separately', async () => {
      const existing = createExistingMedication();
      const command = createValidCommand({ currentStock: 50 });

      mockRepository.findById.and.resolveTo(existing);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(50);
    });

    it('should regenerate schedule when frequency changes', async () => {
      const existing = createExistingMedication();
      const command = createValidCommand({ frequency: '12 em 12 horas' });
      command.regenerateSchedule = true;

      mockRepository.findById.and.resolveTo(existing);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.frequency).toBe('12 em 12 horas');
    });

    it('should activate medication', async () => {
      const existing = createExistingMedication();
      existing.deactivate();
      const command = createValidCommand({ active: true });

      mockRepository.findById.and.resolveTo(existing);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.active).toBe(true);
    });

    it('should deactivate medication', async () => {
      const existing = createExistingMedication();
      const command = createValidCommand({ active: false });

      mockRepository.findById.and.resolveTo(existing);
      mockRepository.save.and.callFake(async (med: MedicationEntity) => med);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.active).toBe(false);
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

    it('should handle repository errors', async () => {
      const existing = createExistingMedication();
      const command = createValidCommand();

      mockRepository.findById.and.resolveTo(existing);
      mockRepository.save.and.rejectWith(new Error('Database error'));

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

  });

  describe('Input Validation', () => {

    it('should reject empty medicationId', async () => {
      const command = createValidCommand();
      command.medicationId = '';

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'medicationId')).toBe(true);
    });

    it('should reject empty userId', async () => {
      const command = createValidCommand();
      command.userId = '';

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'userId')).toBe(true);
    });

  });

});
