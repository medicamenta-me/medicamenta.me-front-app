import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { FeatureFlagsService } from '../../services/feature-flags.service';
import { AuthService } from '../../services/auth.service';
import { StripeService } from '../../services/stripe.service';
import { SubscriptionPlan, PLAN_PRICING } from '../../models/subscription.model';
import { FeatureFlagName } from '../../models/feature-flags.model';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  checkmarkCircle,
  lockClosedOutline,
  rocketOutline,
  peopleOutline,
  briefcaseOutline,
  flashOutline
} from 'ionicons/icons';
import { DecimalPipe } from '@angular/common';

interface PlanFeature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

interface PlanCard {
  plan: SubscriptionPlan;
  name: string;
  description: string;
  icon: string;
  color: string;
  monthlyPrice: number;
  yearlyPrice: number;
  savings?: number;
  features: PlanFeature[];
  popular?: boolean;
  cta: string;
}

@Component({
  selector: 'app-upgrade',
  template: `
    <ion-header>
      <ion-toolbar [color]="'primary'">
        <ion-title>{{ lockedFeature() ? 'Recurso Premium' : 'Escolha seu Plano' }}</ion-title>
        <ion-button slot="end" fill="clear" (click)="close()">
          <ion-icon name="close-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="upgrade-container">
        @if (lockedFeature()) {
          <div class="feature-locked-banner">
            <ion-icon name="lock-closed-outline"></ion-icon>
            <h2>Recurso Premium</h2>
            <p>{{ getFeatureDescription(lockedFeature()!) }}</p>
          </div>
        }

        <!-- Billing Cycle Toggle -->
        <div class="billing-toggle">
          <ion-segment [value]="billingCycle()" (ionChange)="onBillingCycleChange($event)">
            <ion-segment-button value="monthly">
              <ion-label>Mensal</ion-label>
            </ion-segment-button>
            <ion-segment-button value="yearly">
              <ion-label>
                Anual
                <ion-badge color="success">Economize 20%</ion-badge>
              </ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <!-- Plan Cards -->
        <div class="plans-grid">
          @for (card of planCards; track card.plan) {
            <ion-card 
              [class.popular]="card.popular"
              [class.current]="card.plan === currentPlan()">
              
              @if (card.popular) {
                <div class="popular-badge">
                  <ion-icon name="flash-outline"></ion-icon>
                  Mais Popular
                </div>
              }

              <ion-card-header>
                <div class="plan-icon" [style.color]="card.color">
                  <ion-icon [name]="card.icon"></ion-icon>
                </div>
                <ion-card-title>{{ card.name }}</ion-card-title>
                <p class="plan-description">{{ card.description }}</p>
                
                <div class="price-container">
                  <div class="price">
                    <span class="currency">R$</span>
                    <span class="amount">{{ getCurrentPrice(card) | number: '1.0-0' }}</span>
                    <span class="period">/{{ billingCycle() === 'monthly' ? 'mês' : 'ano' }}</span>
                  </div>
                  
                  @if (billingCycle() === 'yearly' && card.savings) {
                    <div class="savings">
                      Economize R$ {{ card.savings | number: '1.2-2' }}/ano
                    </div>
                  }
                </div>
              </ion-card-header>

              <ion-card-content>
                <ion-list lines="none">
                  @for (feature of card.features; track feature.name) {
                    <ion-item>
                      <ion-icon 
                        slot="start" 
                        [name]="feature.included ? 'checkmark-circle' : 'close-outline'"
                        [color]="feature.included ? 'success' : 'medium'">
                      </ion-icon>
                      <ion-label [class.highlight]="feature.highlight">
                        {{ feature.name }}
                      </ion-label>
                    </ion-item>
                  }
                </ion-list>

                <ion-button 
                  expand="block" 
                  [color]="card.popular ? 'primary' : 'medium'"
                  [disabled]="card.plan === currentPlan() || isProcessing()"
                  (click)="selectPlan(card.plan)">
                  {{ getPlanButtonText(card.plan) }}
                </ion-button>
              </ion-card-content>
            </ion-card>
          }
        </div>

        <!-- FAQ Section -->
        <div class="faq-section">
          <h3>Perguntas Frequentes</h3>
          
          <ion-card>
            <ion-card-header>
              <ion-card-title>Posso cancelar a qualquer momento?</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Sim! Você pode cancelar sua assinatura a qualquer momento. Você continuará tendo acesso aos recursos premium até o final do período pago.
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>Como funciona o período de teste?</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Novos usuários têm 7 dias grátis para testar todos os recursos premium. Você pode cancelar antes do fim do período de teste sem nenhuma cobrança.
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>Posso mudar de plano depois?</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Sim! Você pode fazer upgrade ou downgrade a qualquer momento. Faremos o ajuste proporcional no valor.
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .upgrade-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .feature-locked-banner {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-secondary) 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 2rem;

      ion-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
      }

      p {
        margin: 0;
        opacity: 0.9;
      }
    }

    .billing-toggle {
      display: flex;
      justify-content: center;
      margin-bottom: 2rem;

      ion-segment {
        max-width: 400px;
      }

      ion-badge {
        margin-left: 0.5rem;
        font-size: 0.7rem;
      }
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    ion-card {
      margin: 0;
      position: relative;
      transition: transform 0.2s, box-shadow 0.2s;

      &.popular {
        border: 2px solid var(--ion-color-primary);
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(var(--ion-color-primary-rgb), 0.3);
      }

      &.current {
        opacity: 0.7;
        pointer-events: none;
      }

      &:hover:not(.current) {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }
    }

    .popular-badge {
      position: absolute;
      top: -12px;
      right: 1rem;
      background: var(--ion-color-success);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      z-index: 1;

      ion-icon {
        font-size: 1rem;
      }
    }

    .plan-icon {
      font-size: 3rem;
      text-align: center;
      margin-bottom: 0.5rem;
    }

    ion-card-title {
      text-align: center;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .plan-description {
      text-align: center;
      color: var(--ion-color-medium);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .price-container {
      text-align: center;
      margin: 1.5rem 0;
    }

    .price {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 0.25rem;

      .currency {
        font-size: 1.2rem;
        font-weight: 600;
      }

      .amount {
        font-size: 3rem;
        font-weight: 700;
        line-height: 1;
      }

      .period {
        font-size: 1rem;
        color: var(--ion-color-medium);
      }
    }

    .savings {
      margin-top: 0.5rem;
      color: var(--ion-color-success);
      font-size: 0.9rem;
      font-weight: 600;
    }

    ion-list {
      background: transparent;
      padding: 1rem 0;
    }

    ion-item {
      --background: transparent;
      --padding-start: 0;
      --inner-padding-end: 0;

      ion-label {
        font-size: 0.9rem;
        white-space: normal;

        &.highlight {
          font-weight: 600;
          color: var(--ion-color-primary);
        }
      }
    }

    .faq-section {
      margin-top: 3rem;

      h3 {
        text-align: center;
        font-size: 1.75rem;
        margin-bottom: 1.5rem;
      }

      ion-card {
        margin-bottom: 1rem;

        ion-card-title {
          text-align: left;
          font-size: 1.1rem;
        }

        ion-card-content {
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--ion-color-medium);
        }
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .plans-grid {
        grid-template-columns: 1fr;
      }

      ion-card.popular {
        transform: scale(1);
      }
    }
  `],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonList, IonItem, IonLabel, IonBadge,
    IonSegment, IonSegmentButton,
    DecimalPipe
  ]
})
export class UpgradeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly featureFlagsService = inject(FeatureFlagsService);
  private readonly alertController = inject(AlertController);
  private readonly authService = inject(AuthService);
  private readonly stripeService = inject(StripeService);

  readonly currentPlan = this.subscriptionService.currentPlan;
  readonly billingCycle = signal<'monthly' | 'yearly'>('monthly');
  readonly isProcessing = signal(false);
  readonly lockedFeature = signal<FeatureFlagName | null>(null);

  readonly planCards: PlanCard[] = [
    {
      plan: 'premium',
      name: 'Premium',
      description: 'Para quem quer mais controle',
      icon: 'rocket-outline',
      color: '#5260ff',
      monthlyPrice: PLAN_PRICING.premium.monthly.BRL,
      yearlyPrice: PLAN_PRICING.premium.yearly.BRL,
      savings: (PLAN_PRICING.premium.monthly.BRL * 12) - PLAN_PRICING.premium.yearly.BRL,
      popular: true,
      cta: 'Começar Teste Grátis',
      features: [
        { name: 'Tudo do plano Free', included: true },
        { name: '20 scans OCR por mês', included: true, highlight: true },
        { name: 'Lembretes inteligentes (ML)', included: true, highlight: true },
        { name: 'Integração com wearables', included: true, highlight: true },
        { name: 'Insights avançados', included: true },
        { name: 'Verificação de interações', included: true },
        { name: 'Notificações push remotas', included: true },
        { name: 'Relatórios ilimitados', included: true },
        { name: '1 consulta telemedicina/mês', included: true }
      ]
    },
    {
      plan: 'family',
      name: 'Family',
      description: 'Para famílias conectadas',
      icon: 'people-outline',
      color: '#2dd36f',
      monthlyPrice: PLAN_PRICING.family.monthly.BRL,
      yearlyPrice: PLAN_PRICING.family.yearly.BRL,
      savings: (PLAN_PRICING.family.monthly.BRL * 12) - PLAN_PRICING.family.yearly.BRL,
      cta: 'Começar Teste Grátis',
      features: [
        { name: 'Tudo do plano Premium', included: true },
        { name: 'Dashboard familiar agregado', included: true, highlight: true },
        { name: 'Chat entre cuidadores', included: true, highlight: true },
        { name: 'Calendário compartilhado', included: true, highlight: true },
        { name: 'OCR ilimitado', included: true },
        { name: '3 consultas telemedicina/mês', included: true },
        { name: 'Dependentes ilimitados', included: true },
        { name: 'Cuidadores ilimitados', included: true }
      ]
    },
    {
      plan: 'enterprise',
      name: 'Enterprise',
      description: 'Para organizações',
      icon: 'briefcase-outline',
      color: '#ffc409',
      monthlyPrice: 0, // Custom pricing
      yearlyPrice: 0,
      cta: 'Falar com Vendas',
      features: [
        { name: 'Tudo do plano Family', included: true },
        { name: 'SSO (SAML/OAuth)', included: true, highlight: true },
        { name: 'White-label', included: true, highlight: true },
        { name: 'API access', included: true, highlight: true },
        { name: 'Bulk import', included: true },
        { name: 'Audit logs', included: true },
        { name: 'Telemedicina ilimitada', included: true },
        { name: 'Suporte dedicado', included: true }
      ]
    }
  ];

  constructor() {
    addIcons({
      closeOutline,
      checkmarkCircle,
      lockClosedOutline,
      rocketOutline,
      peopleOutline,
      briefcaseOutline,
      flashOutline
    });

    // Check if user was redirected from a locked feature
    this.route.queryParams.subscribe(params => {
      if (params['feature']) {
        this.lockedFeature.set(params['feature'] as FeatureFlagName);
      }
    });
  }

  getCurrentPrice(card: PlanCard): number {
    if (card.plan === 'enterprise') {
      return 0; // Custom
    }
    return this.billingCycle() === 'monthly' ? card.monthlyPrice : card.yearlyPrice;
  }

  onBillingCycleChange(event: any): void {
    this.billingCycle.set(event.detail.value);
  }

  getPlanButtonText(plan: SubscriptionPlan): string {
    if (plan === this.currentPlan()) {
      return 'Plano Atual';
    }
    if (plan === 'enterprise') {
      return 'Falar com Vendas';
    }
    return 'Começar Teste Grátis';
  }

  async selectPlan(plan: SubscriptionPlan): Promise<void> {
    if (plan === 'enterprise') {
      // Open contact form or email
      globalThis.location.href = 'mailto:enterprise@medicamenta.me?subject=Interesse no Plano Enterprise';
      return;
    }

    this.isProcessing.set(true);

    try {
      // Show confirmation
      const alert = await this.alertController.create({
        header: 'Confirmar Upgrade',
        message: `Você iniciará um teste grátis de 7 dias do plano ${plan === 'premium' ? 'Premium' : 'Family'}. Após o período de teste, será cobrado ${this.billingCycle() === 'monthly' ? 'mensalmente' : 'anualmente'}.`,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Confirmar',
            handler: async () => {
              try {
                // Use Stripe for payment processing
                const billingInterval = this.billingCycle() === 'yearly' ? 'yearly' : 'monthly';
                
                await this.stripeService.createCheckoutSession(plan, billingInterval);
                
                // User will be redirected to Stripe Checkout
                // After payment, Stripe webhook will update subscription
                // Success page will handle redirect back to app
                
              } catch (error: any) {
                console.error('[Upgrade] Stripe checkout error:', error);
                
                const errorAlert = await this.alertController.create({
                  header: 'Erro no Pagamento',
                  message: error.message || 'Não foi possível processar seu pagamento. Tente novamente.',
                  buttons: ['OK']
                });
                await errorAlert.present();
              }
            }
          }
        ]
      });

      await alert.present();

    } catch (error) {
      console.error('[Upgrade] Error:', error);
      
      const errorAlert = await this.alertController.create({
        header: 'Erro',
        message: 'Não foi possível processar sua solicitação. Tente novamente.',
        buttons: ['OK']
      });
      await errorAlert.present();

    } finally {
      this.isProcessing.set(false);
    }
  }

  getFeatureDescription(feature: FeatureFlagName): string {
    const descriptions: Record<string, string> = {
      ocr_scanner: 'Escaneie receitas médicas automaticamente com OCR',
      smart_reminders: 'Receba lembretes inteligentes baseados em Machine Learning',
      wearable_integration: 'Conecte seu smartwatch para acompanhamento automático',
      advanced_insights: 'Visualize análises avançadas da sua adesão',
      interaction_checker: 'Verifique interações medicamentosas automaticamente',
      family_dashboard: 'Acompanhe a saúde de toda a família em um só lugar',
      family_chat: 'Converse com outros cuidadores em tempo real',
      shared_calendar: 'Compartilhe o calendário de medicações com cuidadores'
    };

    return descriptions[feature] || 'Este recurso está disponível apenas em planos pagos.';
  }

  close(): void {
    // Go back or to dashboard
    if (globalThis.history.length > 1) {
      globalThis.history.back();
    } else {
      this.router.navigate(['/tabs/dashboard']);
    }
  }
}
