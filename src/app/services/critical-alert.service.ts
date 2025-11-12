import { Injectable, inject, computed, signal } from '@angular/core';
import { MedicationService } from './medication.service';
import { StockService } from './stock.service';
import { PatientSelectorService } from './patient-selector.service';
import { Medication } from '../models/medication.model';

export interface CriticalAlert {
  medication: Medication;
  severity: 'critical' | 'low';
  message: string;
  daysRemaining: number | null;
  stockRemaining: number;
}

/**
 * Phase C: Critical Alert Service
 * Manages critical stock alerts and determines when to show warnings
 */
@Injectable({
  providedIn: 'root'
})
export class CriticalAlertService {
  private readonly medicationService = inject(MedicationService);
  private readonly stockService = inject(StockService);
  private readonly patientSelectorService = inject(PatientSelectorService);

  // Track if modal was shown today
  private readonly lastModalShownDate = signal<string | null>(null);

  /**
   * Get all critical alerts for active patient
   */
  public readonly criticalAlerts = computed(() => {
    const patientId = this.patientSelectorService.activePatientId();
    if (!patientId) return [];

    const medications = this.medicationService.medications();
    const patientMedications = medications.filter(
      m => m.patientId === patientId && !m.isArchived
    );

    return this.generateCriticalAlerts(patientMedications);
  });

  /**
   * Get all critical alerts for all patients (used in modal at login)
   */
  public readonly allCriticalAlerts = computed(() => {
    const medications = this.medicationService.medications();
    const activeMedications = medications.filter(m => !m.isArchived);
    return this.generateCriticalAlerts(activeMedications);
  });

  /**
   * Check if there are any critical alerts
   */
  public readonly hasCriticalAlerts = computed(() => {
    return this.criticalAlerts().length > 0;
  });

  /**
   * Check if there are any critical (out of stock) alerts
   */
  public readonly hasCriticalOutOfStock = computed(() => {
    return this.criticalAlerts().some(a => a.severity === 'critical');
  });

  /**
   * Check if modal should be shown (once per day)
   */
  public shouldShowModal(): boolean {
    const today = new Date().toDateString();
    const lastShown = this.lastModalShownDate();
    
    // Show if: has alerts AND (never shown OR not shown today)
    return this.allCriticalAlerts().length > 0 && 
           (!lastShown || lastShown !== today);
  }

  /**
   * Mark modal as shown for today
   */
  public markModalShown(): void {
    const today = new Date().toDateString();
    this.lastModalShownDate.set(today);
    localStorage.setItem('medicamenta_alert_modal_shown', today);
  }

  /**
   * Initialize service and load last shown date from storage
   */
  constructor() {
    const stored = localStorage.getItem('medicamenta_alert_modal_shown');
    if (stored) {
      this.lastModalShownDate.set(stored);
    }
  }

  /**
   * Generate critical alerts for medications
   */
  private generateCriticalAlerts(medications: Medication[]): CriticalAlert[] {
    const alerts: CriticalAlert[] = [];

    for (const med of medications) {
      const status = this.stockService.getStockStatus(med);
      
      if (status === 'critical' || status === 'low') {
        const daysRemaining = this.stockService.calculateDaysRemaining(med);
        const stockRemaining = med.currentStock || 0;

        let message = '';
        if (status === 'critical') {
          message = 'ALERTS.OUT_OF_STOCK';
        } else if (med.isContinuousUse && daysRemaining !== null) {
          message = 'ALERTS.LOW_STOCK_DAYS';
        } else {
          message = 'ALERTS.LOW_STOCK_UNITS';
        }

        alerts.push({
          medication: med,
          severity: status,
          message,
          daysRemaining,
          stockRemaining
        });
      }
    }

    // Sort: critical first, then by days/stock remaining
    return alerts.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (a.severity !== 'critical' && b.severity === 'critical') return 1;
      
      const aRemaining = a.daysRemaining ?? a.stockRemaining;
      const bRemaining = b.daysRemaining ?? b.stockRemaining;
      return aRemaining - bRemaining;
    });
  }

  /**
   * Get highest severity alert for badge display
   */
  public getHighestSeverity(): 'critical' | 'low' | null {
    const alerts = this.criticalAlerts();
    if (alerts.length === 0) return null;
    
    const hasCritical = alerts.some(a => a.severity === 'critical');
    return hasCritical ? 'critical' : 'low';
  }

  /**
   * Get alert count for badge
   */
  public getAlertCount(): number {
    return this.criticalAlerts().length;
  }
}

