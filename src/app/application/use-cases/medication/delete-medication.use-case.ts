/**
 * Use Case: Delete Medication
 * 
 * Application layer use case that orchestrates deleting a medication.
 * Handles validation and cleanup.
 * 
 * CQRS Pattern: Command (mutates state)
 */

import { Injectable, inject } from '@angular/core';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { ValidationResult } from '../../../core/domain/medication/services/validation.service';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

export interface DeleteMedicationCommand {
  medicationId: string;
  userId: string;
  medicationName: string; // For logging purposes
  confirmDeletion?: boolean; // Safety check
}

export interface DeleteMedicationResult {
  success: boolean;
  validation?: ValidationResult;
  error?: string;
  warning?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeleteMedicationUseCase {
  private readonly repository: IMedicationRepository = inject(MedicationRepository);

  async execute(command: DeleteMedicationCommand): Promise<DeleteMedicationResult> {
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

      // 2. Safety check: require explicit confirmation
      if (!command.confirmDeletion) {
        return {
          success: false,
          error: 'Confirmação de exclusão necessária',
          warning: 'Por segurança, confirme a exclusão antes de prosseguir'
        };
      }

      // 3. Load medication to check existence and get details
      const medication = await this.repository.findById(command.medicationId, command.userId);
      
      if (!medication) {
        return {
          success: false,
          error: 'Medicamento não encontrado'
        };
      }

      // 4. Business rule: Warn if deleting medication with stock
      if (medication.currentStock > 0) {
        const warnings: any[] = [{
          field: 'currentStock',
          code: 'HAS_STOCK',
          message: `Medicamento possui estoque (${medication.currentStock} ${medication.stockUnit})`,
          severity: 'warning'
        }];

        // Return warning but allow deletion
        // (User might have already acknowledged this)
      }

      // 5. Business rule: Warn if deleting active medication
      if (medication.active && !medication.isArchived) {
        const warnings: any[] = [{
          field: 'active',
          code: 'ACTIVE_MEDICATION',
          message: 'Medicamento está ativo. Considere arquivar ao invés de excluir.',
          severity: 'warning'
        }];

        // Return warning but allow deletion
      }

      // 6. Delete from repository
      await this.repository.delete(command.medicationId, command.userId);

      return {
        success: true
      };
    } catch (error) {
      console.error('[DeleteMedicationUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao excluir medicamento'
      };
    }
  }

  private validateInput(command: DeleteMedicationCommand): ValidationResult {
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

    if (!command.medicationName || command.medicationName.trim().length === 0) {
      warnings.push({
        field: 'medicationName',
        code: 'MISSING_NAME',
        message: 'Nome do medicamento não fornecido para log',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
