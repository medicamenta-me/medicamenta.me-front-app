/**
 * Use Case: Record Dose
 * 
 * Application layer use case that orchestrates recording a dose (taken/missed).
 * Handles stock decrease, validation, and state updates.
 * 
 * CQRS Pattern: Command (mutates state)
 */

import { Injectable, inject } from '@angular/core';
import { IMedicationRepository } from '../../../core/repositories/medication.repository.interface';
import { MedicationEntity } from '../../../core/domain/medication/medication.entity';
import { ValidationService, ValidationResult } from '../../../core/domain/medication/services/validation.service';
import { StockService } from '../../../core/domain/medication/services/stock.service';
import { MedicationRepository } from '../../../infrastructure/repositories/medication.repository';

export interface RecordDoseCommand {
  medicationId: string;
  userId: string;
  time: string; // HH:MM
  status: 'taken' | 'missed';
  administeredBy: {
    id: string;
    name: string;
  };
  notes?: string;
  decreaseStock?: boolean; // Default: true for 'taken', false for 'missed'
}

export interface RecordDoseResult {
  success: boolean;
  medication?: MedicationEntity;
  validation?: ValidationResult;
  stockWarning?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecordDoseUseCase {
  private readonly repository: IMedicationRepository = inject(MedicationRepository);

  async execute(command: RecordDoseCommand): Promise<RecordDoseResult> {
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

      // 2. Load medication
      const medication = await this.repository.findById(command.medicationId, command.userId);
      
      if (!medication) {
        return {
          success: false,
          error: 'Medicamento não encontrado'
        };
      }

      // 3. Record dose using domain entity
      let updatedDose;
      const shouldDecreaseStock = command.decreaseStock ?? (command.status === 'taken');
      
      if (command.status === 'taken') {
        updatedDose = medication.recordDoseTaken(
          command.time,
          command.administeredBy,
          command.notes,
          shouldDecreaseStock
        );
      } else {
        updatedDose = medication.recordDoseMissed(
          command.time,
          command.administeredBy,
          command.notes
        );
      }

      if (!updatedDose) {
        return {
          success: false,
          error: `Dose no horário ${command.time} não encontrada no cronograma`
        };
      }

      // 4. Check for stock warnings (recordDoseTaken already decreased stock)
      let stockWarning: string | undefined;

      if (command.status === 'taken') {
        // Check if stock is low after decrease
        if (medication.needsRestocking(5)) {
          const analysis = StockService.analyzeStock(medication);
          
          if (analysis.daysRemaining === 0) {
            stockWarning = 'Estoque esgotado! Reabastecer urgentemente.';
          } else if (analysis.daysRemaining && analysis.daysRemaining <= 2) {
            stockWarning = `Estoque baixo! Restam apenas ${analysis.daysRemaining} dias.`;
          } else if (analysis.daysRemaining && analysis.daysRemaining <= 5) {
            stockWarning = `Estoque baixo. Reabastecer em breve (${analysis.daysRemaining} dias restantes).`;
          }
        }
      }

      // 5. Validate updated medication
      const medicationValidation = ValidationService.validateMedication(medication);
      
      // Warnings are OK, only errors should fail
      if (!medicationValidation.isValid) {
        return {
          success: false,
          validation: medicationValidation,
          error: 'Medicamento atualizado é inválido'
        };
      }

      // 6. Persist changes
      const savedMedication = await this.repository.save(medication);

      return {
        success: true,
        medication: savedMedication,
        validation: medicationValidation,
        stockWarning
      };
    } catch (error) {
      console.error('[RecordDoseUseCase] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao registrar dose'
      };
    }
  }

  private validateInput(command: RecordDoseCommand): ValidationResult {
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

    if (!command.time || command.time.trim().length === 0) {
      errors.push({
        field: 'time',
        code: 'REQUIRED_FIELD',
        message: 'Horário da dose é obrigatório',
        severity: 'error'
      });
    } else {
      // Validate time format
      const timeValidation = ValidationService.validateTimeFormat(command.time);
      if (!timeValidation.isValid) {
        errors.push(...timeValidation.errors);
      }
    }

    if (!command.status || !['taken', 'missed'].includes(command.status)) {
      errors.push({
        field: 'status',
        code: 'INVALID_STATUS',
        message: 'Status deve ser "taken" ou "missed"',
        severity: 'error'
      });
    }

    if (!command.administeredBy) {
      errors.push({
        field: 'administeredBy',
        code: 'REQUIRED_FIELD',
        message: 'Informação de quem administrou é obrigatória',
        severity: 'error'
      });
    } else {
      if (!command.administeredBy.id || command.administeredBy.id.trim().length === 0) {
        errors.push({
          field: 'administeredBy.id',
          code: 'REQUIRED_FIELD',
          message: 'ID de quem administrou é obrigatório',
          severity: 'error'
        });
      }
      
      if (!command.administeredBy.name || command.administeredBy.name.trim().length === 0) {
        errors.push({
          field: 'administeredBy.name',
          code: 'REQUIRED_FIELD',
          message: 'Nome de quem administrou é obrigatório',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
