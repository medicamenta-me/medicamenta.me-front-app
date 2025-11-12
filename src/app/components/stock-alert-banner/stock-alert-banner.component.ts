import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import {
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { alertCircleOutline, warningOutline, refreshCircleOutline, closeOutline } from 'ionicons/icons';
import { StockAlert } from '../../services/stock.service';

@Component({
  selector: 'app-stock-alert-banner',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    IonIcon
  ],
  template: `
    @if (alerts.length > 0 && !isDismissed) {
      <div class="stock-alert-banner" [class]="'alert-' + getMostCriticalStatus()">
        <div class="alert-header">
          <div class="alert-icon">
            <ion-icon [name]="getAlertIcon()"></ion-icon>
          </div>
          <div class="alert-content">
            <h3 class="alert-title">{{ getAlertTitle() | translate }}</h3>
            <p class="alert-message">{{ getAlertMessage() | translate: {count: alerts.length} }}</p>
          </div>
          <button class="dismiss-btn" (click)="dismiss()" [attr.aria-label]="'COMMON.CLOSE' | translate">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>
        
        @if (showDetails) {
          <div class="alert-details">
            @for (alert of alerts; track alert.medicationId) {
              <div class="alert-item" [class]="'status-' + alert.status">
                <ion-icon [name]="getStatusIcon(alert.status)"></ion-icon>
                <div class="alert-item-content">
                  <strong>{{ alert.medicationName }}</strong>
                  <span class="alert-item-message">{{ alert.message }}</span>
                </div>
              </div>
            }
          </div>
        }
        
        <div class="alert-actions">
          <button class="action-btn secondary" (click)="toggleDetails()">
            {{ (showDetails ? 'STOCK.HIDE_DETAILS' : 'STOCK.SHOW_DETAILS') | translate }}
          </button>
          <button class="action-btn primary" [routerLink]="['/tabs/medications']">
            {{ 'STOCK.MANAGE_STOCK' | translate }}
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    .stock-alert-banner {
      margin: 1rem;
      padding: 1.25rem;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .alert-critical {
      background: linear-gradient(135deg, #FF5252 0%, #D32F2F 100%);
      border: 2px solid #B71C1C;
    }

    .alert-low {
      background: linear-gradient(135deg, #FFA726 0%, #F57C00 100%);
      border: 2px solid #E65100;
    }

    .alert-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      color: white;
    }

    .alert-icon {
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .alert-icon ion-icon {
      font-size: 1.75rem;
      color: white;
    }

    .alert-content {
      flex: 1;
      min-width: 0;
    }

    .alert-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 0.25rem 0;
      color: white;
    }

    .alert-message {
      font-size: 1rem;
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
      line-height: 1.4;
    }

    .dismiss-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .dismiss-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .dismiss-btn ion-icon {
      font-size: 1.5rem;
      color: white;
    }

    .alert-details {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }

    .alert-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: white;
    }

    .alert-item:last-child {
      margin-bottom: 0;
    }

    .alert-item ion-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .alert-item-content {
      flex: 1;
      min-width: 0;
    }

    .alert-item-content strong {
      display: block;
      font-size: 1.0625rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .alert-item-message {
      display: block;
      font-size: 0.9375rem;
      opacity: 0.95;
      line-height: 1.4;
    }

    .alert-actions {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .action-btn {
      flex: 1;
      padding: 0.875rem 1.25rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.primary {
      background: white;
      color: #D32F2F;
    }

    .alert-critical .action-btn.primary {
      color: #D32F2F;
    }

    .alert-low .action-btn.primary {
      color: #E65100;
    }

    .action-btn.primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .action-btn.secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Responsive */
    @media (max-width: 640px) {
      .stock-alert-banner {
        margin: 0.75rem;
        padding: 1rem;
      }

      .alert-title {
        font-size: 1.125rem;
      }

      .alert-message {
        font-size: 0.9375rem;
      }

      .alert-actions {
        flex-direction: column;
      }

      .action-btn {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockAlertBannerComponent {
  @Input() alerts: StockAlert[] = [];
  
  isDismissed = false;
  showDetails = false;

  constructor() {
    addIcons({
      'alert-circle-outline': alertCircleOutline,
      'warning-outline': warningOutline,
      'refresh-circle-outline': refreshCircleOutline,
      'close-outline': closeOutline
    });
  }

  getMostCriticalStatus(): 'critical' | 'low' {
    const hasCritical = this.alerts.some(a => a.status === 'critical');
    return hasCritical ? 'critical' : 'low';
  }

  getAlertIcon(): string {
    return this.getMostCriticalStatus() === 'critical' ? 'alert-circle-outline' : 'warning-outline';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'critical': return 'alert-circle-outline';
      case 'low': return 'warning-outline';
      default: return 'refresh-circle-outline';
    }
  }

  getAlertTitle(): string {
    const status = this.getMostCriticalStatus();
    return status === 'critical' ? 'STOCK.CRITICAL_ALERT_TITLE' : 'STOCK.LOW_ALERT_TITLE';
  }

  getAlertMessage(): string {
    const status = this.getMostCriticalStatus();
    return status === 'critical' ? 'STOCK.CRITICAL_ALERT_MESSAGE' : 'STOCK.LOW_ALERT_MESSAGE';
  }

  toggleDetails() {
    this.showDetails = !this.showDetails;
  }

  dismiss() {
    this.isDismissed = true;
  }
}
