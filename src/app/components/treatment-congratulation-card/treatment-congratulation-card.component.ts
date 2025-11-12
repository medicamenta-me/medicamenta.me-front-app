import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonButton, 
  IonIcon 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircle, 
  trophy, 
  time, 
  medkit,
  close 
} from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';
import { Medication } from '../../models/medication.model';
import { CompletionDetectionService } from '../../services/completion-detection.service';

/**
 * Congratulation card shown for completed treatments (3-day window)
 * Displays celebration message, completion reason, and action buttons
 * 
 * Features:
 * - Celebration animation
 * - Color-coded by completion reason
 * - Displays days since completion
 * - "View Details" and "Dismiss" actions
 */
@Component({
  selector: 'app-treatment-congratulation-card',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon
  ],
  template: `
    <ion-card 
      class="congratulation-card" 
      [class.time-ended]="medication().completionReason === 'time_ended'"
      [class.quantity-depleted]="medication().completionReason === 'quantity_depleted'"
      [class.manual]="medication().completionReason === 'manual'"
    >
      <!-- Header with icon and title -->
      <ion-card-header class="card-header">
        <div class="header-content">
          <ion-icon 
            [name]="completionIcon()" 
            class="completion-icon"
          ></ion-icon>
          <div class="header-text">
            <ion-card-title class="card-title">
              {{ 'COMPLETION.CONGRATULATIONS' | translate }}
            </ion-card-title>
            <p class="completion-subtitle">
              {{ 'COMPLETION.TREATMENT_COMPLETED' | translate }}
            </p>
          </div>
          <ion-button 
            fill="clear" 
            size="small" 
            class="dismiss-button"
            (click)="onDismiss()"
          >
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </div>
      </ion-card-header>

      <!-- Content with medication details -->
      <ion-card-content class="card-content">
        <!-- Medication name -->
        <div class="medication-name">
          <ion-icon name="medkit" class="med-icon"></ion-icon>
          <strong>{{ medication().name }}</strong>
        </div>

        <!-- Completion info -->
        <div class="completion-info">
          <!-- Reason badge -->
          <div class="reason-badge" [class]="medication().completionReason">
            {{ completionReasonText() | translate }}
          </div>

          <!-- Days ago -->
          @if (daysAgo() !== null && daysAgo()! > 0) {
            <div class="days-ago">
              {{ 'COMPLETION.DAYS_AGO' | translate: { days: daysAgo() } }}
            </div>
          }
          @else if (daysAgo() === 0) {
            <div class="days-ago today">
              {{ 'COMPLETION.COMPLETED_TODAY' | translate }}
            </div>
          }
        </div>

        <!-- Completion date -->
        <div class="completion-date">
          <ion-icon name="time"></ion-icon>
          {{ 'COMPLETION.COMPLETED_ON' | translate: { date: formattedDate() } }}
        </div>

        <!-- Actions -->
        <div class="actions">
          <ion-button 
            expand="block" 
            (click)="onViewDetails()"
            color="success"
          >
            {{ 'COMPLETION.VIEW_DETAILS' | translate }}
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .congratulation-card {
      margin: 16px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      animation: slideInUp 0.5s ease-out, pulse 2s ease-in-out infinite;
      position: relative;
    }

    .congratulation-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      animation: shimmer 2s infinite;
    }

    .congratulation-card.time-ended {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .congratulation-card.quantity-depleted {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .congratulation-card.manual {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .card-header {
      padding: 16px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .completion-icon {
      font-size: 48px;
      color: #fff;
      animation: bounce 1s ease-in-out infinite;
    }

    .header-text {
      flex: 1;
    }

    .card-title {
      color: #fff;
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .completion-subtitle {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin: 4px 0 0 0;
    }

    .dismiss-button {
      --color: rgba(255, 255, 255, 0.8);
      --padding-start: 8px;
      --padding-end: 8px;
    }

    .dismiss-button ion-icon {
      font-size: 24px;
    }

    .card-content {
      padding: 16px;
      background: #fff;
    }

    .medication-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      margin-bottom: 16px;
      color: var(--ion-color-dark);
    }

    .med-icon {
      font-size: 24px;
      color: var(--ion-color-primary);
    }

    .completion-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .reason-badge {
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .reason-badge.time_ended {
      background: rgba(102, 126, 234, 0.2);
      color: #667eea;
    }

    .reason-badge.quantity_depleted {
      background: rgba(245, 87, 108, 0.2);
      color: #f5576c;
    }

    .reason-badge.manual {
      background: rgba(79, 172, 254, 0.2);
      color: #4facfe;
    }

    .days-ago {
      font-size: 12px;
      color: var(--ion-color-medium);
      font-weight: 500;
    }

    .days-ago.today {
      color: var(--ion-color-success);
      font-weight: 600;
    }

    .completion-date {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
    }

    .completion-date ion-icon {
      font-size: 18px;
    }

    .actions {
      margin-top: 16px;
    }

    /* Animations */
    @keyframes slideInUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }
      50% {
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
      }
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-10px);
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

    /* Mobile adjustments */
    @media (max-width: 576px) {
      .congratulation-card {
        margin: 12px;
      }

      .card-title {
        font-size: 20px;
      }

      .medication-name {
        font-size: 16px;
      }
    }
  `]
})
export class TreatmentCongratulationCardComponent {
  private readonly completionService = inject(CompletionDetectionService);

  // Input: medication that was completed
  medication = input.required<Medication>();

  // Outputs
  viewDetails = output<Medication>();
  dismiss = output<Medication>();

  constructor() {
    addIcons({ checkmarkCircle, trophy, time, medkit, close });
  }

  /**
   * Icon based on completion reason
   */
  completionIcon = computed(() => {
    const reason = this.medication().completionReason;
    switch (reason) {
      case 'time_ended':
        return 'time';
      case 'quantity_depleted':
        return 'checkmark-circle';
      case 'manual':
        return 'trophy';
      default:
        return 'checkmark-circle';
    }
  });

  /**
   * Translation key for completion reason
   */
  completionReasonText = computed(() => {
    const reason = this.medication().completionReason;
    switch (reason) {
      case 'time_ended':
        return 'COMPLETION.TIME_ENDED';
      case 'quantity_depleted':
        return 'COMPLETION.QUANTITY_DEPLETED';
      case 'manual':
        return 'COMPLETION.MANUAL';
      default:
        return 'COMPLETION.COMPLETED';
    }
  });

  /**
   * Days since completion
   */
  daysAgo = computed(() => {
    return this.completionService.getDaysCompletedAgo(this.medication());
  });

  /**
   * Formatted completion date
   */
  formattedDate = computed(() => {
    const completedAt = this.medication().completedAt;
    if (!completedAt) return '';

    const date = completedAt instanceof Date 
      ? completedAt 
      : new Date(completedAt);

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  });

  /**
   * Handle view details button
   */
  onViewDetails(): void {
    this.viewDetails.emit(this.medication());
  }

  /**
   * Handle dismiss button
   */
  onDismiss(): void {
    this.dismiss.emit(this.medication());
  }
}
