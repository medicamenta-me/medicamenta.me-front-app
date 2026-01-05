import { Component, inject } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import {
  IonIcon,
  IonButton,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { warningOutline, closeCircleOutline, medicalOutline } from 'ionicons/icons';
import { CriticalAlertService } from '../../services/critical-alert.service';
import { CriticalAlertModalComponent } from '../critical-alert-modal/critical-alert-modal.component';

/**
 * Phase C: Persistent Alert Banner
 * Non-dismissible banner showing critical stock alerts for selected patient
 */
@Component({
  selector: 'app-persistent-alert-banner',
  standalone: true,
  imports: [
    TranslateModule,
    IonIcon,
    IonButton
],
  template: `
    @if (hasCriticalAlerts()) {
      <div [class]="'persistent-banner ' + getSeverityClass()">
        <div class="banner-content">
          <div class="banner-icon">
            <ion-icon [name]="getIconName()"></ion-icon>
          </div>
          
          <div class="banner-message">
            <h4>{{ getTitle() | translate }}</h4>
            <p>{{ getMessage() | translate: { count: getAlertCount() } }}</p>
          </div>

          <ion-button 
            fill="clear" 
            size="small" 
            class="banner-action"
            (click)="openAlertModal()">
            {{ 'ALERTS.VIEW_DETAILS' | translate }}
            <ion-icon slot="end" name="chevron-forward"></ion-icon>
          </ion-button>
        </div>

        <div class="banner-pulse"></div>
      </div>
    }
  `,
  styles: [`
    .persistent-banner {
      position: relative;
      padding: 1rem;
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: slideDown 0.3s ease-out;
    }

    .persistent-banner.critical {
      background: linear-gradient(135deg, #DC3545 0%, #C82333 100%);
    }

    .persistent-banner.low {
      background: linear-gradient(135deg, #FFC107 0%, #F57C00 100%);
    }

    .banner-content {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .banner-icon {
      flex-shrink: 0;
    }

    .banner-icon ion-icon {
      font-size: 2.5rem;
      color: white;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
      animation: pulse 2s ease-in-out infinite;
    }

    .banner-message {
      flex: 1;
    }

    .banner-message h4 {
      margin: 0 0 0.25rem 0;
      font-size: 1rem;
      font-weight: 700;
      color: white;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }

    .banner-message p {
      margin: 0;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.95);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .banner-action {
      --color: white;
      --background-hover: rgba(255, 255, 255, 0.1);
      --padding-start: 1rem;
      --padding-end: 1rem;
      flex-shrink: 0;
      font-weight: 600;
      text-transform: none;
    }

    .banner-action ion-icon {
      margin-left: 0.25rem;
    }

    /* Animated pulse background */
    .banner-pulse {
      position: absolute;
      top: 0;
      left: -100%;
      width: 200%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0.1) 50%,
        transparent 100%
      );
      animation: shimmer 3s ease-in-out infinite;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.1);
        opacity: 0.8;
      }
    }

    @keyframes shimmer {
      0% {
        left: -100%;
      }
      100% {
        left: 100%;
      }
    }

    /* Mobile Responsive */
    @media (max-width: 767px) {
      .persistent-banner {
        padding: 0.75rem;
      }

      .banner-content {
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .banner-icon ion-icon {
        font-size: 2rem;
      }

      .banner-message {
        flex: 1 1 100%;
      }

      .banner-message h4 {
        font-size: 0.9rem;
      }

      .banner-message p {
        font-size: 0.8rem;
      }

      .banner-action {
        flex: 1 1 100%;
        margin: 0;
      }

      .banner-action ion-button {
        width: 100%;
      }
    }
  `]
})
export class PersistentAlertBannerComponent {
  private readonly criticalAlertService = inject(CriticalAlertService);
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);

  public readonly hasCriticalAlerts = this.criticalAlertService.hasCriticalAlerts;

  constructor() {
    addIcons({ 
      warningOutline, 
      closeCircleOutline, 
      medicalOutline,
      chevronForward: 'chevron-forward'
    });
  }

  /**
   * Get severity class for styling
   */
  getSeverityClass(): string {
    const severity = this.criticalAlertService.getHighestSeverity();
    return severity || 'low';
  }

  /**
   * Get icon name based on severity
   */
  getIconName(): string {
    const severity = this.criticalAlertService.getHighestSeverity();
    return severity === 'critical' ? 'close-circle-outline' : 'warning-outline';
  }

  /**
   * Get banner title based on severity
   */
  getTitle(): string {
    const severity = this.criticalAlertService.getHighestSeverity();
    return severity === 'critical' 
      ? 'ALERTS.BANNER_TITLE_CRITICAL' 
      : 'ALERTS.BANNER_TITLE_LOW';
  }

  /**
   * Get banner message
   */
  getMessage(): string {
    return 'ALERTS.BANNER_MESSAGE';
  }

  /**
   * Get alert count
   */
  getAlertCount(): number {
    return this.criticalAlertService.getAlertCount();
  }

  /**
   * Open critical alert modal
   */
  async openAlertModal() {
    const modal = await this.modalController.create({
      component: CriticalAlertModalComponent,
      backdropDismiss: false
    });

    await modal.present();
  }
}
