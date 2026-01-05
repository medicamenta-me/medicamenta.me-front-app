import { Component, signal, inject, computed, OnInit } from '@angular/core';

import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonProgressBar,
  IonText,
  IonIcon,
  IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { statsChart, alertCircle, checkmarkCircle, camera } from 'ionicons/icons';
import { OcrService } from '../../services/ocr.service';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { RemoteConfigService } from '../../services/remote-config.service';
import { Firestore } from '@angular/fire/firestore';

interface QuotaInfo {
  current: number;
  limit: number;
  percentage: number;
  remaining: number;
  resetDate: Date;
}

@Component({
  selector: 'app-ocr-quota-panel',
  standalone: true,
  imports: [
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonProgressBar,
    IonText,
    IonIcon,
    IonButton
],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="stats-chart"></ion-icon>
          Uso do Scanner OCR
        </ion-card-title>
      </ion-card-header>
      
      <ion-card-content>
        @if (isLoading()) {
          <div class="loading-state">
            <ion-progress-bar type="indeterminate"></ion-progress-bar>
            <p>Carregando...</p>
          </div>
        } @else if (quota()) {
          <div class="quota-display">
            <!-- Usage Stats -->
            <div class="usage-stats">
              <div class="stat-large">
                <span class="number">{{ quota()?.current }}</span>
                <span class="label">/ {{ quota()?.limit }} scans</span>
              </div>
              <p class="stat-description">Usados este mês</p>
            </div>

            <!-- Progress Bar -->
            <ion-progress-bar 
              [value]="quota()?.percentage || 0"
              [color]="getProgressColor()">
            </ion-progress-bar>

            <!-- Remaining Info -->
            <div class="quota-info">
              @if (quota()?.remaining && quota()!.remaining > 0) {
                <ion-text color="success">
                  <ion-icon name="checkmark-circle"></ion-icon>
                  {{ quota()?.remaining }} scans restantes
                </ion-text>
              } @else {
                <ion-text color="danger">
                  <ion-icon name="alert-circle"></ion-icon>
                  Limite mensal atingido
                </ion-text>
              }
            </div>

            <!-- Reset Date -->
            <div class="reset-info">
              <small>Renovação: {{ getResetDateText() }}</small>
            </div>

            <!-- Upgrade CTA -->
            @if (isNearLimit() && userPlan() !== 'enterprise') {
              <div class="upgrade-cta">
                <ion-button expand="block" size="small" (click)="onUpgradeClick()">
                  <ion-icon slot="start" name="arrow-up-circle"></ion-icon>
                  Fazer Upgrade
                </ion-button>
                <p class="cta-text">
                  Plano Family: 50 scans/mês<br>
                  Plano Enterprise: Scans ilimitados
                </p>
              </div>
            }
          </div>
        } @else {
          <ion-text color="danger">
            <p>Erro ao carregar informações de quota</p>
          </ion-text>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    ion-card {
      ion-card-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        ion-icon {
          font-size: 1.5rem;
        }
      }
    }

    .loading-state {
      padding: 2rem 0;
      text-align: center;
      
      p {
        margin-top: 1rem;
        color: var(--ion-color-medium);
      }
    }

    .quota-display {
      .usage-stats {
        text-align: center;
        margin-bottom: 1.5rem;

        .stat-large {
          .number {
            font-size: 3rem;
            font-weight: 700;
            color: var(--ion-color-primary);
          }

          .label {
            font-size: 1.2rem;
            color: var(--ion-color-medium);
            margin-left: 0.5rem;
          }
        }

        .stat-description {
          margin: 0.5rem 0 0;
          color: var(--ion-color-medium);
          font-size: 0.9rem;
        }
      }

      ion-progress-bar {
        height: 8px;
        border-radius: 4px;
        margin-bottom: 1rem;
      }

      .quota-info {
        text-align: center;
        margin-bottom: 1rem;

        ion-text {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 500;

          ion-icon {
            font-size: 1.2rem;
          }
        }
      }

      .reset-info {
        text-align: center;
        margin-bottom: 1.5rem;

        small {
          color: var(--ion-color-medium);
        }
      }

      .upgrade-cta {
        border-top: 1px solid var(--ion-color-light-shade);
        padding-top: 1.5rem;
        margin-top: 1.5rem;
        text-align: center;

        ion-button {
          font-weight: 600;
        }

        .cta-text {
          margin-top: 0.75rem;
          color: var(--ion-color-medium);
          font-size: 0.85rem;
          line-height: 1.5;
        }
      }
    }
  `]
})
export class OcrQuotaPanelComponent implements OnInit {
  private ocrService = inject(OcrService);
  private subscriptionService = inject(SubscriptionService);
  private auth = inject(AuthService);
  private remoteConfig = inject(RemoteConfigService);
  private firestore = inject(Firestore);

  // State
  quota = signal<QuotaInfo | null>(null);
  isLoading = signal<boolean>(true);
  userPlan = computed(() => this.subscriptionService.currentPlan());

  constructor() {
    addIcons({ statsChart, alertCircle, checkmarkCircle, camera });
  }

  async ngOnInit(): Promise<void> {
    await this.loadQuota();
  }

  /**
   * Load quota information
   */
  private async loadQuota(): Promise<void> {
    this.isLoading.set(true);

    try {
      const userId = this.auth.currentUser()?.uid;
      if (!userId) {
        console.warn('[OCR Quota Panel] No user ID');
        return;
      }

      // Get quota from OCR service
      const quotaCheck = await this.ocrService.checkQuota(userId);
      
      // Calculate reset date (first day of next month)
      const now = new Date();
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Build quota info
      const quotaInfo: QuotaInfo = {
        current: quotaCheck.current,
        limit: quotaCheck.limit,
        percentage: quotaCheck.limit > 0 ? quotaCheck.current / quotaCheck.limit : 0,
        remaining: Math.max(0, quotaCheck.limit - quotaCheck.current),
        resetDate
      };

      this.quota.set(quotaInfo);

    } catch (err: unknown) {
      console.error('[OCR Quota Panel] Failed to load quota:', err);
      this.quota.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Get progress bar color based on usage
   */
  getProgressColor(): string {
    const percentage = this.quota()?.percentage || 0;
    if (percentage >= 0.9) return 'danger';
    if (percentage >= 0.7) return 'warning';
    return 'success';
  }

  /**
   * Check if user is near limit
   */
  isNearLimit(): boolean {
    const percentage = this.quota()?.percentage || 0;
    return percentage >= 0.7;
  }

  /**
   * Get reset date text
   */
  getResetDateText(): string {
    const resetDate = this.quota()?.resetDate;
    if (!resetDate) return 'Calculando...';

    const day = resetDate.getDate();
    const month = resetDate.toLocaleDateString('pt-BR', { month: 'long' });
    return `${day} de ${month}`;
  }

  /**
   * Handle upgrade button click
   */
  onUpgradeClick(): void {
    // Navigate to upgrade page (router integration needed)
  }

  /**
   * Refresh quota
   */
  async refresh(): Promise<void> {
    await this.loadQuota();
  }
}
