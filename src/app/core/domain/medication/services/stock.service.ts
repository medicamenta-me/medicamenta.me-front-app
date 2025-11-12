/**
 * Domain Service: StockService
 * 
 * Encapsulates business logic related to medication stock management.
 * Pure domain logic, no dependencies on infrastructure.
 * 
 * DDD Principles:
 * - Domain Service (not entity method because spans multiple entities or calculations)
 * - Stateless
 * - Pure business logic
 */

import { MedicationEntity } from '../medication.entity';

export interface StockAnalysis {
  currentStock: number;
  stockUnit: string;
  daysRemaining: number | null;
  needsRestocking: boolean;
  estimatedDepletionDate: Date | null;
  dailyConsumption: number;
  recommendedRestockAmount: number;
}

export interface RestockRecommendation {
  medicationId: string;
  medicationName: string;
  currentStock: number;
  recommendedAmount: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  daysUntilDepletion: number | null;
  reason: string;
}

export class StockService {
  /**
   * Calculate daily consumption based on schedule
   * Example: 3 doses per day = 3 units per day
   */
  static calculateDailyConsumption(medication: MedicationEntity): number {
    // Parse frequency string to determine daily consumption
    const frequency = medication.frequency.toLowerCase();
    
    // Pattern: "X em X horas" -> calculate doses per day
    const hoursMatch = frequency.match(/(\d+)\s*em\s*(\d+)\s*horas?/);
    if (hoursMatch) {
      const intervalHours = parseInt(hoursMatch[2], 10);
      return Math.floor(24 / intervalHours);
    }
    
    // Pattern: "X vez(es) ao dia" -> direct count
    const timesMatch = frequency.match(/(\d+)\s*vez(es)?\s*ao\s*dia/);
    if (timesMatch) {
      return parseInt(timesMatch[1], 10);
    }
    
    // Fallback: use schedule length if available
    if (medication.schedule && medication.schedule.length > 0) {
      return medication.schedule.length;
    }
    
    // Default: assume 1 dose per day
    return 1;
  }

  /**
   * Estimate days remaining based on current stock and consumption
   */
  static estimateDaysRemaining(medication: MedicationEntity): number | null {
    const currentStock = medication.currentStock;
    const dailyConsumption = this.calculateDailyConsumption(medication);

    if (dailyConsumption === 0) return null; // No consumption = infinite stock
    if (currentStock === 0) return 0;

    return Math.floor(currentStock / dailyConsumption);
  }

  /**
   * Estimate depletion date based on current stock and consumption
   */
  static estimateDepletionDate(medication: MedicationEntity): Date | null {
    const daysRemaining = this.estimateDaysRemaining(medication);
    
    if (daysRemaining === null) return null;
    
    const depletionDate = new Date();
    depletionDate.setDate(depletionDate.getDate() + daysRemaining);
    
    return depletionDate;
  }

  /**
   * Check if medication needs restocking
   * Default threshold: 7 days for continuous use, 5 units for as-needed
   */
  static needsRestocking(medication: MedicationEntity, thresholdDays = 7): boolean {
    if (medication.isArchived) return false;

    const daysRemaining = this.estimateDaysRemaining(medication);
    
    if (daysRemaining === null) return false;
    
    return daysRemaining <= thresholdDays;
  }

  /**
   * Calculate recommended restock amount
   * Business rule: Enough for 30 days
   */
  static calculateRestockAmount(medication: MedicationEntity, targetDays = 30): number {
    const dailyConsumption = this.calculateDailyConsumption(medication);
    const currentStock = medication.currentStock;
    const targetStock = dailyConsumption * targetDays;
    
    // Recommend amount to reach target stock
    const recommendedAmount = Math.max(0, targetStock - currentStock);
    
    // Round up to nearest 10 for convenience
    return Math.ceil(recommendedAmount / 10) * 10;
  }

  /**
   * Analyze stock status comprehensively
   */
  static analyzeStock(medication: MedicationEntity): StockAnalysis {
    const daysRemaining = this.estimateDaysRemaining(medication);
    const depletionDate = this.estimateDepletionDate(medication);
    const dailyConsumption = this.calculateDailyConsumption(medication);
    const needsRestocking = this.needsRestocking(medication);
    const recommendedRestockAmount = this.calculateRestockAmount(medication);

    return {
      currentStock: medication.currentStock,
      stockUnit: medication.stockUnit,
      daysRemaining,
      needsRestocking,
      estimatedDepletionDate: depletionDate,
      dailyConsumption,
      recommendedRestockAmount
    };
  }

  /**
   * Get restock recommendations for multiple medications
   * Sorted by urgency
   */
  static getRestockRecommendations(
    medications: MedicationEntity[],
    thresholdDays = 7
  ): RestockRecommendation[] {
    const recommendations: RestockRecommendation[] = [];

    for (const med of medications) {
      if (med.isArchived) continue;

      const daysRemaining = this.estimateDaysRemaining(med);
      
      if (daysRemaining !== null && daysRemaining <= thresholdDays) {
        const urgency = this.determineUrgency(daysRemaining);
        const recommendedAmount = this.calculateRestockAmount(med);

        recommendations.push({
          medicationId: med.id,
          medicationName: med.name,
          currentStock: med.currentStock,
          recommendedAmount,
          urgency,
          daysUntilDepletion: daysRemaining,
          reason: this.getRestockReason(daysRemaining)
        });
      }
    }

    // Sort by urgency (critical > high > medium > low)
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return recommendations;
  }

  /**
   * Determine urgency level based on days remaining
   */
  private static determineUrgency(daysRemaining: number): 'critical' | 'high' | 'medium' | 'low' {
    if (daysRemaining === 0) return 'critical';
    if (daysRemaining <= 2) return 'high';
    if (daysRemaining <= 5) return 'medium';
    return 'low';
  }

  /**
   * Get human-readable restock reason
   */
  private static getRestockReason(daysRemaining: number): string {
    if (daysRemaining === 0) return 'Estoque esgotado';
    if (daysRemaining === 1) return 'Estoque termina amanhã';
    if (daysRemaining <= 2) return `Estoque termina em ${daysRemaining} dias`;
    if (daysRemaining <= 7) return `Estoque baixo (${daysRemaining} dias restantes)`;
    return `Reabastecimento recomendado`;
  }

  /**
   * Simulate stock consumption over time
   * Useful for planning and forecasting
   */
  static simulateConsumption(
    medication: MedicationEntity,
    days: number
  ): Array<{ date: Date; stock: number }> {
    const dailyConsumption = this.calculateDailyConsumption(medication);
    const simulation: Array<{ date: Date; stock: number }> = [];
    
    let currentStock = medication.currentStock;
    const today = new Date();

    for (let i = 0; i <= days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      simulation.push({
        date,
        stock: Math.max(0, currentStock)
      });

      currentStock -= dailyConsumption;
    }

    return simulation;
  }

  /**
   * Check if medication can last until target date
   */
  static canLastUntil(medication: MedicationEntity, targetDate: Date): boolean {
    const today = new Date();
    const daysUntilTarget = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysRemaining = this.estimateDaysRemaining(medication);
    
    if (daysRemaining === null) return true;
    
    return daysRemaining >= daysUntilTarget;
  }

  /**
   * Calculate required stock for a period
   */
  static calculateRequiredStock(medication: MedicationEntity, days: number): number {
    const dailyConsumption = this.calculateDailyConsumption(medication);
    return dailyConsumption * days;
  }
}
