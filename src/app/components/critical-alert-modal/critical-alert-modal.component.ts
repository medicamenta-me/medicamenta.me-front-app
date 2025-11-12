import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  warningOutline, 
  closeCircleOutline, 
  addCircleOutline,
  closeOutline 
} from 'ionicons/icons';
import { CriticalAlertService } from '../../services/critical-alert.service';
import { RestockModalComponent } from '../restock-modal/restock-modal.component';
import { UserService } from '../../services/user.service';

/**
 * Phase C: Critical Alert Modal
 * Blocking modal shown at login with critical stock alerts
 */
@Component({
  selector: 'app-critical-alert-modal',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem
  ],
  template: `
    <ion-header>
      <ion-toolbar [color]="hasCriticalAlerts() ? 'danger' : 'warning'">
        <ion-title>
          <div class="modal-header-content">
            <ion-icon 
              [name]="hasCriticalAlerts() ? 'close-circle-outline' : 'warning-outline'"
              class="header-icon">
            </ion-icon>
            <span>{{ 'ALERTS.CRITICAL_STOCK_ALERT' | translate }}</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="critical-alert-content">
      <div class="alert-intro">
        <p class="alert-message">
          {{ 'ALERTS.MODAL_MESSAGE' | translate }}
        </p>
        <p class="alert-count">
          <strong>{{ alerts().length }}</strong> 
          {{ alerts().length === 1 ? ('ALERTS.MEDICATION_SINGULAR' | translate) : ('ALERTS.MEDICATION_PLURAL' | translate) }}
        </p>
      </div>

      <ion-list class="alert-list">
        @for (alert of alerts(); track alert.medication.id) {
          <ion-item [class]="'alert-item alert-' + alert.severity" lines="none">
            <div class="alert-item-content">
              <div class="alert-header">
                <ion-icon 
                  [name]="alert.severity === 'critical' ? 'close-circle-outline' : 'warning-outline'"
                  [class]="'alert-icon ' + alert.severity">
                </ion-icon>
                <div class="medication-info">
                  <h3>{{ alert.medication.name }}</h3>
                  <p class="patient-name">
                    <ion-icon name="person-circle-outline"></ion-icon>
                    {{ getPatientName(alert.medication.patientId) }}
                  </p>
                </div>
              </div>

              <div class="alert-details">
                @if (alert.severity === 'critical') {
                  <div class="status-badge critical">
                    {{ 'ALERTS.OUT_OF_STOCK' | translate }}
                  </div>
                } @else {
                  <div class="status-badge low">
                    @if (alert.daysRemaining !== null) {
                      {{ 'ALERTS.DAYS_REMAINING' | translate: { days: alert.daysRemaining } }}
                    } @else {
                      {{ 'ALERTS.UNITS_REMAINING' | translate: { units: alert.stockRemaining } }}
                    }
                  </div>
                }

                <div class="medication-details">
                  <span class="dosage">{{ alert.medication.dosage }}</span>
                  @if (alert.medication.stockUnit) {
                    <span class="separator">•</span>
                    <span class="unit">{{ alert.stockRemaining }} {{ alert.medication.stockUnit }}</span>
                  }
                </div>
              </div>

              <ion-button 
                expand="block" 
                color="success" 
                size="small"
                (click)="openRestockModal(alert.medication)">
                <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                {{ 'ALERTS.RESTOCK_NOW' | translate }}
              </ion-button>
            </div>
          </ion-item>
        }
      </ion-list>

      <div class="modal-actions">
        <ion-button expand="block" fill="outline" (click)="dismiss()">
          <ion-icon slot="start" name="close-outline"></ion-icon>
          {{ 'ALERTS.CLOSE_AND_CONTINUE' | translate }}
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .modal-header-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      justify-content: center;
    }

    .header-icon {
      font-size: 1.75rem;
    }

    .critical-alert-content {
      --background: #F8F9FA;
    }

    .alert-intro {
      background: white;
      padding: 1.5rem;
      margin: 1rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      text-align: center;
    }

    .alert-message {
      font-size: 1rem;
      color: #333;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .alert-count {
      font-size: 1.125rem;
      color: #666;
      margin: 0;
    }

    .alert-count strong {
      color: #DC3545;
      font-size: 1.5rem;
    }

    .alert-list {
      background: transparent;
      padding: 0 1rem;
    }

    .alert-item {
      --background: white;
      --padding-start: 0;
      --padding-end: 0;
      --inner-padding-end: 0;
      margin-bottom: 1rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .alert-item.alert-critical {
      border-left: 4px solid #DC3545;
    }

    .alert-item.alert-low {
      border-left: 4px solid #FFC107;
    }

    .alert-item-content {
      width: 100%;
      padding: 1rem;
    }

    .alert-header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .alert-icon {
      font-size: 2rem;
      flex-shrink: 0;
      margin-top: 0.25rem;
    }

    .alert-icon.critical {
      color: #DC3545;
    }

    .alert-icon.low {
      color: #FFC107;
    }

    .medication-info {
      flex: 1;
    }

    .medication-info h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: #333;
    }

    .patient-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #666;
      margin: 0;
    }

    .patient-name ion-icon {
      font-size: 1.125rem;
      color: #34D187;
    }

    .alert-details {
      margin-bottom: 1rem;
    }

    .status-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .status-badge.critical {
      background: rgba(220, 53, 69, 0.1);
      color: #DC3545;
    }

    .status-badge.low {
      background: rgba(255, 193, 7, 0.1);
      color: #F57C00;
    }

    .medication-details {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #666;
      flex-wrap: wrap;
    }

    .separator {
      color: #CCC;
    }

    .modal-actions {
      padding: 1rem;
      background: white;
      border-top: 1px solid #E0E0E0;
    }

    .modal-actions ion-button {
      margin: 0;
    }

    /* Mobile Responsive */
    @media (max-width: 767px) {
      .alert-intro {
        margin: 0.75rem;
        padding: 1rem;
      }

      .alert-list {
        padding: 0 0.75rem;
      }

      .alert-item-content {
        padding: 0.75rem;
      }

      .medication-info h3 {
        font-size: 1rem;
      }
    }
  `]
})
export class CriticalAlertModalComponent {
  private readonly criticalAlertService = inject(CriticalAlertService);
  private readonly modalController = inject(ModalController);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  public readonly alerts = this.criticalAlertService.allCriticalAlerts;
  public readonly hasCriticalAlerts = signal(false);

  constructor() {
    addIcons({ 
      warningOutline, 
      closeCircleOutline, 
      addCircleOutline,
      closeOutline,
      personCircleOutline: 'person-circle-outline'
    });

    // Check if there are any critical (out of stock) alerts
    this.hasCriticalAlerts.set(
      this.alerts().some(a => a.severity === 'critical')
    );
  }

  /**
   * Get patient name by ID
   */
  getPatientName(patientId: string): string {
    const patients = this.userService.patients();
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || '';
  }

  /**
   * Open restock modal for medication
   */
  async openRestockModal(medication: any) {
    const modal = await this.modalController.create({
      component: RestockModalComponent,
      componentProps: { medication }
    });

    await modal.present();
    await modal.onWillDismiss();
    
    // If no more alerts, close this modal
    if (this.alerts().length === 0) {
      this.dismiss();
    }
  }

  /**
   * Dismiss modal and mark as shown
   */
  async dismiss() {
    this.criticalAlertService.markModalShown();
    await this.modalController.dismiss();
  }
}
