import { Component, inject, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SubscriptionService } from '../../services/subscription.service';
import { StripeService } from '../../services/stripe.service';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cardOutline, 
  calendarOutline, 
  trophyOutline,
  arrowUpOutline,
  settingsOutline 
} from 'ionicons/icons';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-subscription-card',
  template: `
    <ion-card>
      <ion-card-header>
        <div class="header-row">
          <ion-card-title>Minha Assinatura</ion-card-title>
          @if (isPremiumOrHigher()) {
            <ion-badge [color]="badgeColor()">{{ planBadge() }}</ion-badge>
          }
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (isLoading()) {
          <div class="loading">
            <ion-spinner></ion-spinner>
            <p>Carregando...</p>
          </div>
        } @else {
          <div class="subscription-info">
            <!-- Current Plan -->
            <div class="info-item">
              <ion-icon name="trophy-outline"></ion-icon>
              <div class="info-content">
                <span class="label">Plano Atual</span>
                <span class="value">{{ planName() }}</span>
              </div>
            </div>

            @if (isPremiumOrHigher()) {
              <!-- Billing Cycle -->
              <div class="info-item">
                <ion-icon name="calendar-outline"></ion-icon>
                <div class="info-content">
                  <span class="label">Ciclo de Cobrança</span>
                  <span class="value">{{ billingCycleName() }}</span>
                </div>
              </div>

              <!-- Next Payment -->
              @if (nextPaymentDate()) {
                <div class="info-item">
                  <ion-icon name="card-outline"></ion-icon>
                  <div class="info-content">
                    <span class="label">Próxima Cobrança</span>
                    <span class="value">{{ nextPaymentDate() | date: 'dd/MM/yyyy' }}</span>
                  </div>
                </div>
              }

              <!-- Status -->
              @if (subscriptionStatus()) {
                <div class="info-item">
                  <div class="info-content">
                    <span class="label">Status</span>
                    <span class="value">{{ statusName() }}</span>
                  </div>
                </div>
              }
            }
          </div>

          <!-- Actions -->
          <div class="actions">
            @if (currentPlan() === 'free') {
              <ion-button expand="block" color="primary" (click)="upgrade()">
                <ion-icon name="arrow-up-outline" slot="start"></ion-icon>
                Fazer Upgrade
              </ion-button>
            } @else {
              <ion-button expand="block" fill="outline" (click)="manageBilling()">
                <ion-icon name="settings-outline" slot="start"></ion-icon>
                Gerenciar Assinatura
              </ion-button>

              <ion-button 
                expand="block" 
                fill="clear" 
                color="danger"
                (click)="confirmCancel()">
                Cancelar Assinatura
              </ion-button>
            }
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    ion-card {
      margin: 1rem 0;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;

      ion-card-title {
        margin: 0;
      }
    }

    .loading {
      text-align: center;
      padding: 2rem;

      ion-spinner {
        margin-bottom: 1rem;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .subscription-info {
      margin-bottom: 1.5rem;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--ion-color-light);

      &:last-child {
        border-bottom: none;
      }

      ion-icon {
        font-size: 1.5rem;
        color: var(--ion-color-primary);
        margin-top: 0.25rem;
      }

      .info-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .label {
          font-size: 0.85rem;
          color: var(--ion-color-medium);
        }

        .value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--ion-text-color);
        }
      }
    }

    .actions {
      margin-top: 1.5rem;

      ion-button {
        margin-bottom: 0.5rem;
      }
    }
  `],
  standalone: true,
  imports: [
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonButton, IonIcon, IonBadge, IonSpinner,
    DatePipe
  ]
})
export class SubscriptionCardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly stripeService = inject(StripeService);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  readonly currentPlan = this.subscriptionService.currentPlan;
  readonly subscription = this.subscriptionService.subscription;
  readonly isLoading = computed(() => !this.subscription());

  readonly isPremiumOrHigher = computed(() => {
    const plan = this.currentPlan();
    return plan !== 'free';
  });

  readonly planName = computed(() => {
    const plan = this.currentPlan();
    const names: Record<string, string> = {
      free: 'Gratuito',
      premium: 'Premium',
      family: 'Family',
      enterprise: 'Enterprise'
    };
    return names[plan] || 'Desconhecido';
  });

  readonly planBadge = computed(() => {
    const plan = this.currentPlan();
    return plan.toUpperCase();
  });

  readonly badgeColor = computed(() => {
    const plan = this.currentPlan();
    const colors: Record<string, string> = {
      premium: 'primary',
      family: 'success',
      enterprise: 'warning'
    };
    return colors[plan] || 'medium';
  });

  readonly billingCycleName = computed(() => {
    const sub = this.subscription();
    if (!sub) return '-';
    
    // UserSubscription doesn't store billingInterval yet
    // Future: Get from Stripe subscription data
    return 'Mensal';
  });

  readonly nextPaymentDate = computed(() => {
    const sub = this.subscription();
    if (!sub?.currentPeriodEnd) return null;
    
    return sub.currentPeriodEnd.toDate();
  });

  readonly subscriptionStatus = computed(() => {
    const sub = this.subscription();
    return sub?.status;
  });

  readonly statusName = computed(() => {
    const status = this.subscriptionStatus();
    const names: Record<string, string> = {
      active: 'Ativa',
      trialing: 'Em Teste',
      past_due: 'Pagamento Pendente',
      canceled: 'Cancelada',
      incomplete: 'Incompleta'
    };
    return names[status || ''] || status || '-';
  });

  constructor() {
    addIcons({
      cardOutline,
      calendarOutline,
      trophyOutline,
      arrowUpOutline,
      settingsOutline
    });
  }

  ngOnInit() {
    console.log('[SubscriptionCard] Current plan:', this.currentPlan());
  }

  upgrade() {
    this.router.navigate(['/upgrade']);
  }

  async manageBilling() {
    try {
      await this.stripeService.createBillingPortalSession();
      // User will be redirected to Stripe Billing Portal
    } catch (error: any) {
      console.error('[SubscriptionCard] Error opening billing portal:', error);
      
      const alert = await this.alertController.create({
        header: this.translate.instant('COMMON.ERROR'),
        message: error.message || this.translate.instant('MANAGE_SUBSCRIPTION.MESSAGES.PORTAL_ERROR_GENERIC'),
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async confirmCancel() {
    const alert = await this.alertController.create({
      header: this.translate.instant('MANAGE_SUBSCRIPTION.MESSAGES.CANCEL_CONFIRM_HEADER'),
      message: this.translate.instant('MANAGE_SUBSCRIPTION.MESSAGES.CANCEL_CONFIRM_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('MANAGE_SUBSCRIPTION.MESSAGES.CANCEL_KEEP'),
          role: 'cancel'
        },
        {
          text: this.translate.instant('MANAGE_SUBSCRIPTION.MESSAGES.CANCEL_YES'),
          role: 'destructive',
          handler: () => {
            this.manageBilling(); // Opens billing portal where user can cancel
          }
        }
      ]
    });

    await alert.present();
  }
}
