import { Injectable, inject, computed, signal } from '@angular/core';
import { Medication } from '../models/medication.model';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';

export type StockStatus = 'critical' | 'low' | 'adequate';

export interface StockAlert {
  medicationId: string;
  medicationName: string;
  status: StockStatus;
  currentStock: number;
  daysRemaining: number | null; // null for as-needed medications
  suggestedRestockDate: Date | null;
  message: string;
}

export interface RestockEntry {
  id: string;
  medicationId: string;
  medicationName: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  restockDate: Date;
  notes?: string;
  registeredBy: string;
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);

  /**
   * All medications with stock information
   */
  private readonly medications = this.medicationService.medications;

  /**
   * Restock history (stored in localStorage)
   */
  private readonly _restockHistory = signal<RestockEntry[]>([]);
  public readonly restockHistory = this._restockHistory.asReadonly();

  /**
   * All stock alerts (critical and low)
   */
  public readonly stockAlerts = computed<StockAlert[]>(() => {
    const meds = this.medications();
    return this.getAllStockAlerts(meds);
  });

  /**
   * Critical stock alerts only
   */
  public readonly criticalAlerts = computed<StockAlert[]>(() => {
    return this.stockAlerts().filter(alert => alert.status === 'critical');
  });

  /**
   * Low stock alerts only
   */
  public readonly lowStockAlerts = computed<StockAlert[]>(() => {
    return this.stockAlerts().filter(alert => alert.status === 'low');
  });

  /**
   * Total number of alerts
   */
  public readonly alertCount = computed<number>(() => {
    return this.stockAlerts().length;
  });

  /**
   * Whether there are critical alerts
   */
  public readonly hasCriticalAlerts = computed<boolean>(() => {
    return this.criticalAlerts().length > 0;
  });

  constructor() {
    this.loadRestockHistory();
  }

  /**
   * Calculate stock status for a medication
   * @param medication The medication to check
   * @returns StockStatus: 'critical' (0 stock), 'low' (below threshold), or 'adequate'
   */
  getStockStatus(medication: Medication): StockStatus {
    const stock = medication.currentStock ?? medication.stock ?? 0;
    
    if (stock === 0) {
      return 'critical';
    }
    
    const threshold = this.getStockThreshold(medication);
    
    if (stock <= threshold) {
      return 'low';
    }
    
    return 'adequate';
  }

  /**
   * Get the stock threshold for a medication
   * Default: 7 days worth for continuous use, 5 units for as-needed
   */
  private getStockThreshold(medication: Medication): number {
    if (medication.lowStockThreshold !== undefined) {
      return medication.lowStockThreshold;
    }
    
    const isContinuous = medication.isContinuousUse ?? true;
    
    if (isContinuous) {
      // Calculate 7 days worth based on daily dose count
      const dailyDoses = medication.schedule?.length || 1;
      return dailyDoses * 7;
    } else {
      // Default threshold for as-needed medications
      return 5;
    }
  }

  /**
   * Calculate days remaining based on current stock and usage pattern
   * @param medication The medication to calculate for
   * @returns Number of days remaining, or null if as-needed medication
   */
  calculateDaysRemaining(medication: Medication): number | null {
    const isContinuous = medication.isContinuousUse ?? true;
    
    if (!isContinuous) {
      return null; // Cannot predict usage for as-needed medications
    }
    
    const stock = medication.currentStock ?? medication.stock ?? 0;
    const dailyDoses = medication.schedule?.length || 1;
    
    if (dailyDoses === 0) {
      return null;
    }
    
    return Math.floor(stock / dailyDoses);
  }

  /**
   * Suggest restock date (when stock will reach threshold)
   * @param medication The medication to calculate for
   * @returns Suggested restock date, or null if not applicable
   */
  calculateSuggestedRestockDate(medication: Medication): Date | null {
    const daysRemaining = this.calculateDaysRemaining(medication);
    
    if (daysRemaining === null) {
      return null;
    }
    
    const threshold = this.getStockThreshold(medication);
    const stock = medication.currentStock ?? medication.stock ?? 0;
    const dailyDoses = medication.schedule?.length || 1;
    
    // Calculate days until stock reaches threshold
    const daysUntilThreshold = Math.floor((stock - threshold) / dailyDoses);
    
    if (daysUntilThreshold <= 0) {
      // Already at or below threshold
      return new Date();
    }
    
    const restockDate = new Date();
    restockDate.setDate(restockDate.getDate() + daysUntilThreshold);
    
    return restockDate;
  }

  /**
   * Generate stock alert for a medication
   * @param medication The medication to check
   * @returns StockAlert object with details, or null if adequate stock
   */
  generateStockAlert(medication: Medication): StockAlert | null {
    const status = this.getStockStatus(medication);
    
    if (status === 'adequate') {
      return null;
    }
    
    const stock = medication.currentStock ?? medication.stock ?? 0;
    const daysRemaining = this.calculateDaysRemaining(medication);
    const suggestedRestockDate = this.calculateSuggestedRestockDate(medication);
    
    let message = '';
    
    if (status === 'critical') {
      message = `Estoque esgotado de ${medication.name}. Reabasteça imediatamente.`;
    } else if (daysRemaining === null) {
      message = `Estoque baixo de ${medication.name}. Restam ${stock} ${medication.stockUnit || 'unidades'}.`;
    } else {
      message = `Estoque baixo de ${medication.name}. Restam ${daysRemaining} dias (${stock} ${medication.stockUnit || 'unidades'}).`;
    }
    
    return {
      medicationId: medication.id,
      medicationName: medication.name,
      status,
      currentStock: stock,
      daysRemaining,
      suggestedRestockDate,
      message
    };
  }

  /**
   * Get all stock alerts for a list of medications
   * @param medications List of medications to check
   * @returns Array of stock alerts, sorted by severity (critical first)
   */
  getAllStockAlerts(medications: Medication[]): StockAlert[] {
    const alerts: StockAlert[] = [];
    
    for (const medication of medications) {
      // Skip archived medications
      if (medication.isArchived) {
        continue;
      }
      
      const alert = this.generateStockAlert(medication);
      if (alert) {
        alerts.push(alert);
      }
    }
    
    // Sort by severity: critical first, then low
    alerts.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (a.status !== 'critical' && b.status === 'critical') return 1;
      
      // If both are same severity, sort by days remaining (null last)
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      
      return a.daysRemaining - b.daysRemaining;
    });
    
    return alerts;
  }

  /**
   * Deduct stock when a dose is taken
   * @param medication The medication to update
   * @returns Updated stock value
   */
  deductStock(medication: Medication): number {
    const currentStock = medication.currentStock ?? medication.stock ?? 0;
    const newStock = Math.max(0, currentStock - 1);
    return newStock;
  }

  /**
   * Add stock when restocking
   * @param medication The medication to update
   * @param quantity Quantity to add
   * @returns Updated stock value
   */
  addStock(medication: Medication, quantity: number): number {
    const currentStock = medication.currentStock ?? medication.stock ?? 0;
    const newStock = currentStock + quantity;
    return newStock;
  }

  /**
   * Check if medication should be auto-archived
   * @param medication The medication to check
   * @returns true if should be archived (non-continuous with zero stock)
   */
  shouldAutoArchive(medication: Medication): boolean {
    const isContinuous = medication.isContinuousUse ?? true;
    const stock = medication.currentStock ?? medication.stock ?? 0;
    
    return !isContinuous && stock === 0;
  }

  /**
   * Get stock color for UI (used in Dashboard and Medication list)
   * @param medication The medication to check
   * @returns CSS color class: 'critical', 'low', or 'adequate'
   */
  getStockColorClass(medication: Medication): string {
    const status = this.getStockStatus(medication);
    return status; // Returns 'critical', 'low', or 'adequate'
  }

  /**
   * Register a stock replenishment
   */
  async restockMedication(
    medicationId: string,
    quantity: number,
    registeredBy: string,
    notes?: string
  ): Promise<void> {
    const medication = this.medications().find(m => m.id === medicationId);
    if (!medication) {
      throw new Error('Medication not found');
    }

    const previousStock = medication.currentStock ?? 0;
    const newStock = previousStock + quantity;

    // Update medication stock
    await this.medicationService.updateMedication(medicationId, {
      currentStock: newStock
    });

    // Create restock entry
    const restockEntry: RestockEntry = {
      id: this.generateId(),
      medicationId,
      medicationName: medication.name,
      quantity,
      previousStock,
      newStock,
      restockDate: new Date(),
      notes,
      registeredBy
    };

    // Add to history
    const history = [...this._restockHistory(), restockEntry];
    this._restockHistory.set(history);
    this.saveRestockHistory(history);

    // Log the restock event
    await this.logService.addLog(
      'stock_replenished' as any,
      `Estoque de ${medication.name} reposto: +${quantity} ${medication.stockUnit || 'unidades'}`
    );
  }

  /**
   * Get restock history for a specific medication
   */
  getRestockHistoryForMedication(medicationId: string): RestockEntry[] {
    return this._restockHistory().filter(entry => entry.medicationId === medicationId);
  }

  /**
   * Decrease stock when a dose is taken
   */
  async decreaseStock(medicationId: string, amount: number = 1): Promise<void> {
    const medication = this.medications().find(m => m.id === medicationId);
    if (!medication) return;

    const currentStock = medication.currentStock ?? 0;
    const newStock = Math.max(0, currentStock - amount);

    await this.medicationService.updateMedication(medicationId, {
      currentStock: newStock
    });
  }

  /**
   * Load restock history from localStorage
   */
  private loadRestockHistory(): void {
    try {
      const stored = localStorage.getItem('medicamenta_restock_history');
      if (stored) {
        const history = JSON.parse(stored);
        // Convert date strings back to Date objects
        const parsed = history.map((entry: any) => ({
          ...entry,
          restockDate: new Date(entry.restockDate)
        }));
        this._restockHistory.set(parsed);
      }
    } catch (error: any) {
      this.logService.error('StockService', 'Failed to load restock history', error as Error);
    }
  }

  /**
   * Save restock history to localStorage
   */
  private saveRestockHistory(history: RestockEntry[]): void {
    try {
      localStorage.setItem('medicamenta_restock_history', JSON.stringify(history));
    } catch (error: any) {
      this.logService.error('StockService', 'Failed to save restock history', error as Error);
    }
  }

  /**
   * Generate unique ID for restock entry
   */
  private generateId(): string {
    return `restock_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

