/**
 * Unit Tests: AddMedicationUseCase
 * 
 * Tests the application use case for adding new medications.
 * Uses mocked repository to isolate use case logic.
 */

import { TestBed } from '@angular/core/testing';
import { AddMedicationUseCase, AddMedicationCommand } from './add-medication.use-case';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../../core/domain/medication/medication.entity';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

describe('AddMedicationUseCase', () => {
  let useCase: AddMedicationUseCase;
  let mockRepository: jasmine.SpyObj<IMedicationRepository>;

  // =====================================================
  // SETUP
  // =====================================================

  beforeEach(() => {
    // Create mock repository
    mockRepository = jasmine.createSpyObj('IMedicationRepository', [
      'save',
      'findById',
      'findByUserId',
      'delete',
      'streamByUserId'
    ]);

    // Configure TestBed with concrete class mock
    TestBed.configureTestingModule({
      providers: [
        AddMedicationUseCase,
        { provide: MedicationRepository, useValue: mockRepository }
      ]
    });

    // Create use case instance from TestBed
    useCase = TestBed.inject(AddMedicationUseCase);
  });

  // =====================================================
  // TEST DATA HELPERS
  // =====================================================

  const createValidCommand = (overrides: Partial<AddMedicationCommand> = {}): AddMedicationCommand => {
    return {
      userId: 'user-123',
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: '8 em 8 horas',
      startTime: '08:00',
      notes: 'Tomar com água',
      currentStock: 30,
      stockUnit: 'comprimidos',
      ...overrides
    };
  };

  // =====================================================
  // SUCCESSFUL EXECUTION
  // =====================================================

  describe('Successful Execution', () => {

    it('should create and save a new medication', async () => {
      const command = createValidCommand();
      const savedMedication = new MedicationEntity({
        id: 'med-123',
        userId: command.userId,
        name: command.name,
        dosage: command.dosage,
        frequency: command.frequency,
        time: command.startTime!,
        notes: command.notes,
        active: true,
        currentStock: command.currentStock!,
        stockUnit: command.stockUnit!,
        schedule: [],
        isArchived: false,
        archivedAt: null,
        lastModified: new Date()
      });

      mockRepository.save.and.resolveTo(savedMedication);

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication).toBeDefined();
      expect(result.medication!.name).toBe('Paracetamol');
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should generate schedule automatically', async () => {
      const command = createValidCommand();
      
      mockRepository.save.and.callFake(async (med: MedicationEntity) => {
        return med;
      });

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.schedule.length).toBeGreaterThan(0);
    });

    it('should use default start time if not provided', async () => {
      const command = createValidCommand({ startTime: undefined });
      
      mockRepository.save.and.callFake(async (med: MedicationEntity) => {
        return med;
      });

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.time).toBe('08:00');
    });

    it('should use default stock values if not provided', async () => {
      const command = createValidCommand({ 
        currentStock: undefined,
        stockUnit: undefined 
      });
      
      mockRepository.save.and.callFake(async (med: MedicationEntity) => {
        return med;
      });

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.currentStock).toBe(0);
      expect(result.medication!.stockUnit).toBe('unidades');
    });

  });

  // =====================================================
  // INPUT VALIDATION
  // =====================================================

  describe('Input Validation', () => {

    it('should reject empty userId', async () => {
      const command = createValidCommand({ userId: '' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('inválidos');
      expect(result.validation?.errors.some(e => e.field === 'userId')).toBe(true);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should reject empty medication name', async () => {
      const command = createValidCommand({ name: '' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'name')).toBe(true);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should warn about missing dosage but not fail', async () => {
      const command = createValidCommand({ dosage: '' });
      
      mockRepository.save.and.callFake(async (med: MedicationEntity) => {
        return med;
      });

      const result = await useCase.execute(command);

      // Dosage is warning, not error - should still succeed
      expect(result.success).toBe(true);
      expect(result.validation?.warnings.some(w => w.field === 'dosage')).toBe(true);
    });

    it('should reject empty frequency', async () => {
      const command = createValidCommand({ frequency: '' });

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.validation?.errors.some(e => e.field === 'frequency')).toBe(true);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

  });

  // =====================================================
  // ERROR HANDLING
  // =====================================================

  describe('Error Handling', () => {

    it('should handle repository save errors', async () => {
      const command = createValidCommand();
      mockRepository.save.and.rejectWith(new Error('Database connection failed'));

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });

    it('should handle unknown errors gracefully', async () => {
      const command = createValidCommand();
      mockRepository.save.and.rejectWith('Unknown error');

      const result = await useCase.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

  });

  // =====================================================
  // BUSINESS RULES
  // =====================================================

  describe('Business Rules', () => {

    it('should create medication with active status by default', async () => {
      const command = createValidCommand();
      
      mockRepository.save.and.callFake(async (med: MedicationEntity) => {
        return med;
      });

      const result = await useCase.execute(command);

      expect(result.success).toBe(true);
      expect(result.medication!.active).toBe(true);
      expect(result.medication!.isArchived).toBe(false);
    });

    it('should assign temporary ID before save', async () => {
      const command = createValidCommand();
      let capturedMedication: MedicationEntity | undefined;
      
      mockRepository.save.and.callFake(async (med: MedicationEntity) => {
        capturedMedication = med;
        return med;
      });

      await useCase.execute(command);

      expect(capturedMedication!.id).toContain('temp_');
    });

    it('should set lastModified timestamp', async () => {
      const command = createValidCommand();
      
      mockRepository.save.and.callFake(async (med: MedicationEntity) => {
        return med;
      });

      const result = await useCase.execute(command);

      expect(result.medication!.lastModified).toBeDefined();
      expect(result.medication!.lastModified).toBeInstanceOf(Date);
    });

  });

});
