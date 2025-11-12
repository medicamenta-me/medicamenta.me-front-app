/**
 * Use Case: Add Medication
 * 
 * Application layer use case that orchestrates adding a new medication.
 * Coordinates domain entities, repositories, and services.
 * 
 * CQRS Pattern: Command (mutates state)
 * 
 * Responsibilities:
 * - Validate input
 * - Create domain entity
 * - Persist through repository
 * - Return result
 */

import { Injectable, inject } from '@angular/core';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../../core/domain/medication/medication.entity';
import { ScheduleValueObject } from '../../../core/domain/medication/schedule.value-object';
import { ValidationService, ValidationResult } from '../../../core/domain/medication/services/validation.service';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

export interface AddMedicationCommand {
  userId: string;
  name: string;
  dosage: string;
  frequency: string;
  startTime?: string;
  notes?: string;
  currentStock?: number;
  stockUnit?: string;
}

export interface AddMedicationResult {
  success: boolean;
  medication?: MedicationEntity;
  validation?: ValidationResult;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddMedicationUseCase {
  private readonly repository: IMedicationRepository = inject(MedicationRepository);

  async execute(command: AddMedicationCommand): Promise<AddMedicationResult> {
    try {
      // 1. Validate input
      const inputValidation = this.validateInput(command);
      if (!inputValidation.isValid) {
        return {
          success: false,
          validation: inputValidation,
          error: 'Dados inválidos'
        };
      }

      // 2. Generate schedule
      const startTime = command.startTime || '08:00';
      const schedule = ScheduleValueObject.generate(command.frequency, startTime);

      // 3. Create domain entity
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const medication = new MedicationEntity({
        id: tempId,
        userId: command.userId,
        name: command.name,
        dosage: command.dosage,
        frequency: command.frequency,
        time: startTime,
        notes: command.notes,
        active: true,
        currentStock: command.currentStock ?? 0,
        stockUnit: command.stockUnit ?? 'unidades',
        schedule: [...schedule.doses], // Convert readonly to mutable array
        isArchived: false,
        archivedAt: null,
        lastModified: new Date()
      });

      // 4. Validate medication entity
      const medicationValidation = ValidationService.validateMedication(medication);
      if (!medicationValidation.isValid) {
        return {
          success: false,
          validation: medicationValidation,
          error: 'Medicamento inválido'
        };
      }

      // 5. Persist through repository
      const savedMedication = await this.repository.save(medication);

      return {
        success: true,
        medication: savedMedication,
        validation: medicationValidation
      };
    } catch (error) {
      console.error('[AddMedicationUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private validateInput(command: AddMedicationCommand): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!command.userId || command.userId.trim().length === 0) {
      errors.push({
        field: 'userId',
        code: 'REQUIRED_FIELD',
        message: 'ID do usuário é obrigatório',
        severity: 'error'
      });
    }

    if (!command.name || command.name.trim().length === 0) {
      errors.push({
        field: 'name',
        code: 'REQUIRED_FIELD',
        message: 'Nome do medicamento é obrigatório',
        severity: 'error'
      });
    }

    if (!command.dosage || command.dosage.trim().length === 0) {
      warnings.push({
        field: 'dosage',
        code: 'MISSING_DOSAGE',
        message: 'Dosagem não especificada',
        severity: 'warning'
      });
    }

    if (!command.frequency || command.frequency.trim().length === 0) {
      errors.push({
        field: 'frequency',
        code: 'REQUIRED_FIELD',
        message: 'Frequência é obrigatória',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
