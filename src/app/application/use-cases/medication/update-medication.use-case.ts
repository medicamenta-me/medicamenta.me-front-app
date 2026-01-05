/**
 * Use Case: Update Medication
 * 
 * Application layer use case that orchestrates updating an existing medication.
 * Handles partial updates while maintaining domain invariants.
 * 
 * CQRS Pattern: Command (mutates state)
 */

import { Injectable, inject } from '@angular/core';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../../core/domain/medication/medication.entity';
import { ScheduleValueObject } from '../../../core/domain/medication/schedule.value-object';
import { ValidationService, ValidationResult } from '../../../core/domain/medication/services/validation.service';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

export interface UpdateMedicationCommand {
  medicationId: string;
  userId: string;
  updates: {
    name?: string;
    dosage?: string;
    frequency?: string;
    notes?: string;
    currentStock?: number;
    stockUnit?: string;
    active?: boolean;
  };
  regenerateSchedule?: boolean; // If frequency changed
}

export interface UpdateMedicationResult {
  success: boolean;
  medication?: MedicationEntity;
  validation?: ValidationResult;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UpdateMedicationUseCase {
  private readonly repository: IMedicationRepository = inject(MedicationRepository);

  async execute(command: UpdateMedicationCommand): Promise<UpdateMedicationResult> {
    try {
      // 1. Validate input first (before loading medication)
      const inputValidation = this.validateInput(command);
      if (!inputValidation.isValid) {
        return {
          success: false,
          validation: inputValidation,
          error: 'Dados inválidos'
        };
      }

      // 2. Load existing medication
      const existing = await this.repository.findById(command.medicationId, command.userId);
      
      if (!existing) {
        return {
          success: false,
          error: 'Medicamento não encontrado'
        };
      }

      // 3. Apply updates to entity
      const updates = command.updates;
      
      // Check if we need to regenerate schedule
      if (command.regenerateSchedule && updates.frequency) {
        const newSchedule = ScheduleValueObject.generate(
          updates.frequency,
          existing.time
        );
        updates['schedule' as keyof typeof updates] = [...newSchedule.doses] as any;
      }

      // Update entity (domain logic handles validation)
      try {
        existing.updateDetails(updates as any);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro ao atualizar medicamento'
        };
      }

      // 4. Handle stock updates separately (business rule)
      if (updates.currentStock !== undefined && updates.currentStock !== existing.currentStock) {
        try {
          existing.updateStock(updates.currentStock);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao atualizar estoque'
          };
        }
      }

      // 5. Handle active/inactive separately
      if (updates.active !== undefined && updates.active !== existing.active) {
        try {
          if (updates.active) {
            existing.activate();
          } else {
            existing.deactivate();
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao alterar status'
          };
        }
      }

      // 6. Validate updated medication
      const medicationValidation = ValidationService.validateMedication(existing);
      if (!medicationValidation.isValid) {
        return {
          success: false,
          validation: medicationValidation,
          error: 'Medicamento atualizado é inválido'
        };
      }

      // 7. Persist changes
      const savedMedication = await this.repository.save(existing);

      return {
        success: true,
        medication: savedMedication,
        validation: medicationValidation
      };
    } catch (error) {
      console.error('[UpdateMedicationUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private validateInput(command: UpdateMedicationCommand): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    if (!command.medicationId || command.medicationId.trim().length === 0) {
      errors.push({
        field: 'medicationId',
        code: 'REQUIRED_FIELD',
        message: 'ID do medicamento é obrigatório',
        severity: 'error'
      });
    }

    if (!command.userId || command.userId.trim().length === 0) {
      errors.push({
        field: 'userId',
        code: 'REQUIRED_FIELD',
        message: 'ID do usuário é obrigatório',
        severity: 'error'
      });
    }

    if (!command.updates || Object.keys(command.updates).length === 0) {
      errors.push({
        field: 'updates',
        code: 'EMPTY_UPDATES',
        message: 'Nenhuma atualização fornecida',
        severity: 'error'
      });
    }

    // Validate specific fields if provided
    if (command.updates.currentStock !== undefined && command.updates.currentStock < 0) {
      errors.push({
        field: 'currentStock',
        code: 'INVALID_STOCK',
        message: 'Estoque não pode ser negativo',
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
