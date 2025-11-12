/**
 * Domain Service: ValidationService
 * 
 * Centralizes all business rule validations for medications.
 * Pure domain logic, no dependencies on infrastructure.
 * 
 * DDD Principles:
 * - Domain Service (validation spans multiple entities)
 * - Stateless
 * - Returns validation results (doesn't throw exceptions)
 */

import { MedicationEntity } from '../medication.entity';
import { DoseEntity } from '../dose.entity';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  severity: 'warning';
}

export class ValidationService {
  /**
   * Validate medication entity comprehensively
   */
  static validateMedication(medication: MedicationEntity): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!medication.name || medication.name.trim().length === 0) {
      errors.push({
        field: 'name',
        code: 'REQUIRED_FIELD',
        message: 'Nome do medicamento é obrigatório',
        severity: 'error'
      });
    }

    if (!medication.dosage || medication.dosage.trim().length === 0) {
      warnings.push({
        field: 'dosage',
        code: 'MISSING_DOSAGE',
        message: 'Dosagem não especificada',
        severity: 'warning'
      });
    }

    if (!medication.frequency || medication.frequency.trim().length === 0) {
      errors.push({
        field: 'frequency',
        code: 'REQUIRED_FIELD',
        message: 'Frequência é obrigatória',
        severity: 'error'
      });
    }

    // Business Rules
    if (medication.currentStock < 0) {
      errors.push({
        field: 'currentStock',
        code: 'INVALID_STOCK',
        message: 'Estoque não pode ser negativo',
        severity: 'error'
      });
    }

    if (medication.isArchived && medication.active) {
      errors.push({
        field: 'active',
        code: 'ARCHIVED_ACTIVE_CONFLICT',
        message: 'Medicamento arquivado não pode estar ativo',
        severity: 'error'
      });
    }

    if (medication.isArchived && medication.currentStock > 0) {
      warnings.push({
        field: 'currentStock',
        code: 'ARCHIVED_WITH_STOCK',
        message: 'Medicamento arquivado com estoque disponível',
        severity: 'warning'
      });
    }

    // Schedule validation
    if (medication.schedule.length === 0) {
      warnings.push({
        field: 'schedule',
        code: 'EMPTY_SCHEDULE',
        message: 'Nenhuma dose agendada',
        severity: 'warning'
      });
    }

    // Low stock warning
    if (medication.needsRestocking(5)) {
      warnings.push({
        field: 'currentStock',
        code: 'LOW_STOCK',
        message: 'Estoque baixo - reabastecer em breve',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate schedule for conflicts and issues
   */
  static validateSchedule(doses: DoseEntity[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for duplicate times
    const times = doses.map(d => d.time);
    const uniqueTimes = new Set(times);
    
    if (times.length !== uniqueTimes.size) {
      errors.push({
        field: 'schedule',
        code: 'DUPLICATE_TIMES',
        message: 'Horários duplicados no cronograma',
        severity: 'error'
      });
    }

    // Validate each dose
    for (const [index, dose] of doses.entries()) {
      if (!dose.isValid()) {
        errors.push({
          field: `schedule[${index}]`,
          code: 'INVALID_DOSE',
          message: `Dose inválida no horário ${dose.time}`,
          severity: 'error'
        });
      }
    }

    // Check for reasonable spacing (warning if doses are too close)
    const sortedTimes = [...times].sort();
    for (let i = 1; i < sortedTimes.length; i++) {
      const [prevHour, prevMinute] = sortedTimes[i - 1].split(':').map(Number);
      const [currHour, currMinute] = sortedTimes[i].split(':').map(Number);
      
      const prevMinutes = prevHour * 60 + prevMinute;
      const currMinutes = currHour * 60 + currMinute;
      const diffMinutes = currMinutes - prevMinutes;

      if (diffMinutes < 60) { // Less than 1 hour
        warnings.push({
          field: 'schedule',
          code: 'CLOSE_DOSES',
          message: `Doses muito próximas: ${sortedTimes[i - 1]} e ${sortedTimes[i]}`,
          severity: 'warning'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate multiple medications for conflicts
   * Example: Same medication scheduled multiple times
   */
  static validateMedicationList(medications: MedicationEntity[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for duplicate medication names
    const names = medications.map(m => m.name.toLowerCase());
    const nameCounts = new Map<string, number>();
    
    for (const name of names) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }

    for (const [name, count] of nameCounts.entries()) {
      if (count > 1) {
        warnings.push({
          field: 'medications',
          code: 'DUPLICATE_MEDICATION',
          message: `Medicamento "${name}" aparece ${count} vezes`,
          severity: 'warning'
        });
      }
    }

    // Check for time conflicts (same time across different medications)
    const timeMap = new Map<string, string[]>();
    
    for (const med of medications) {
      if (med.isArchived) continue;
      
      for (const dose of med.schedule) {
        if (!timeMap.has(dose.time)) {
          timeMap.set(dose.time, []);
        }
        timeMap.get(dose.time)!.push(med.name);
      }
    }

    for (const [time, medNames] of timeMap.entries()) {
      if (medNames.length > 3) { // More than 3 medications at same time
        warnings.push({
          field: 'schedule',
          code: 'MANY_CONCURRENT_MEDS',
          message: `${medNames.length} medicamentos no horário ${time}`,
          severity: 'warning'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate dosage format
   * Examples: "500mg", "1 comprimido", "5ml"
   */
  static validateDosageFormat(dosage: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!dosage || dosage.trim().length === 0) {
      warnings.push({
        field: 'dosage',
        code: 'EMPTY_DOSAGE',
        message: 'Dosagem não especificada',
        severity: 'warning'
      });
      
      return { isValid: true, errors, warnings }; // Warning, not error
    }

    // Check for common formats
    const validPatterns = [
      /^\d+\s*(mg|g|ml|mcg|µg|UI|comprimidos?|cápsulas?|gotas?)$/i,
      /^\d+\/\d+\s*(mg|g|ml)$/i, // Fraction: 250/5ml
      /^\d+\.\d+\s*(mg|g|ml)$/i, // Decimal: 2.5mg
    ];

    const hasValidFormat = validPatterns.some(pattern => pattern.test(dosage.trim()));

    if (!hasValidFormat) {
      warnings.push({
        field: 'dosage',
        code: 'UNUSUAL_FORMAT',
        message: 'Formato de dosagem não reconhecido',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate frequency format
   * Examples: "8/8h", "12/12h", "1x ao dia"
   */
  static validateFrequencyFormat(frequency: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!frequency || frequency.trim().length === 0) {
      errors.push({
        field: 'frequency',
        code: 'EMPTY_FREQUENCY',
        message: 'Frequência é obrigatória',
        severity: 'error'
      });
      
      return { isValid: false, errors, warnings };
    }

    // Check for common formats
    const validPatterns = [
      /^\d+\/\d+h$/i, // 8/8h, 12/12h
      /^\d+x?\s*(ao|por)\s*dia$/i, // 3x ao dia
      /^di[aá]ri[oa]/i, // diário, diariamente
      /^cont[ií]nuo/i, // contínuo
      /^quando\s+necess[aá]rio/i, // quando necessário
    ];

    const hasValidFormat = validPatterns.some(pattern => pattern.test(frequency.trim()));

    if (!hasValidFormat) {
      warnings.push({
        field: 'frequency',
        code: 'UNUSUAL_FREQUENCY',
        message: 'Formato de frequência não reconhecido',
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate time format (HH:MM)
   */
  static validateTimeFormat(time: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
    
    if (!timeRegex.test(time)) {
      errors.push({
        field: 'time',
        code: 'INVALID_TIME_FORMAT',
        message: 'Horário inválido. Use formato HH:MM',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Combine multiple validation results
   */
  static combineResults(...results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationWarning[] = [];

    for (const result of results) {
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Check if validation has any issues (errors or warnings)
   */
  static hasIssues(result: ValidationResult): boolean {
    return result.errors.length > 0 || result.warnings.length > 0;
  }

  /**
   * Get all error messages
   */
  static getErrorMessages(result: ValidationResult): string[] {
    return result.errors.map(e => e.message);
  }

  /**
   * Get all warning messages
   */
  static getWarningMessages(result: ValidationResult): string[] {
    return result.warnings.map(w => w.message);
  }

  /**
   * Get all messages (errors + warnings)
   */
  static getAllMessages(result: ValidationResult): string[] {
    return [
      ...result.errors.map(e => e.message),
      ...result.warnings.map(w => w.message)
    ];
  }
}
