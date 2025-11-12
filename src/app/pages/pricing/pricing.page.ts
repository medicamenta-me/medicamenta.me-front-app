import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonicModule, 
  ToastController, 
  ActionSheetController, 
  LoadingController 
} from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { SubscriptionPlan } from '../../models/subscription.model';
import { SubscriptionService } from '../../services/subscription.service';
import { StripePaymentService, BillingCycle } from '../../services/stripe-payment.service';
import { PagSeguroPaymentService } from '../../services/pagseguro-payment.service';
import { AuthService } from '../../services/auth.service';
import { PaymentConfigService } from '../../services/payment-config.service';

interface PlanFeature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
  family: boolean | string;
  enterprise: boolean | string;
}

interface PlanCard {
  plan: SubscriptionPlan;
  name: string;
  icon: string;
  color: string;
  monthlyPrice: number;
  yearlyPrice: number;
  popular?: boolean;
  recommended?: boolean;
}

@Component({
  selector: 'app-pricing',
  templateUrl: './pricing.page.html',
  styleUrls: ['./pricing.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule]
})
export class PricingPage implements OnInit {
  private readonly router = inject(Router);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly stripeService = inject(StripePaymentService);
  private readonly pagseguroService = inject(PagSeguroPaymentService);
  private readonly authService = inject(AuthService);
  private readonly paymentConfigService = inject(PaymentConfigService);
  private readonly translate = inject(TranslateService);
  private readonly toastController = inject(ToastController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly loadingController = inject(LoadingController);

  // Signals
  billingCycle = signal<BillingCycle>('monthly');
  currentPlan = signal<SubscriptionPlan>('free');
  loading = signal(false);
  paymentConfigured = signal(false);
  configStatus = signal<{ configured: boolean; message: string; providers: string[] }>({
    configured: false,
    message: '',
    providers: []
  });

  // Plan cards
  plans: PlanCard[] = [
    {
      plan: 'free',
      name: '',  // Will be translated
      icon: 'heart-outline',
      color: 'medium',
      monthlyPrice: 0,
      yearlyPrice: 0,
    },
    {
      plan: 'premium',
      name: '',  // Will be translated
      icon: 'star',
      color: 'primary',
      monthlyPrice: 29.9,
      yearlyPrice: 299.9,
      popular: true,
    },
    {
      plan: 'family',
      name: '',  // Will be translated
      icon: 'people',
      color: 'secondary',
      monthlyPrice: 49.9,
      yearlyPrice: 499.9,
      recommended: true,
    },
    {
      plan: 'enterprise',
      name: '',  // Will be translated
      icon: 'business',
      color: 'tertiary',
      monthlyPrice: 0, // Custom pricing
      yearlyPrice: 0,
    },
  ];

  // Feature comparison
  features: PlanFeature[] = [
    {
      name: 'Medicamentos',
      free: 'Ilimitado',
      premium: 'Ilimitado',
      family: 'Ilimitado',
      enterprise: 'Ilimitado',
    },
    {
      name: 'Dependentes',
      free: '1',
      premium: 'Ilimitado',
      family: 'Ilimitado',
      enterprise: 'Ilimitado',
    },
    {
      name: 'Cuidadores',
      free: '2',
      premium: 'Ilimitado',
      family: 'Ilimitado',
      enterprise: 'Ilimitado',
    },
    {
      name: 'Relatórios/mês',
      free: '3',
      premium: 'Ilimitado',
      family: 'Ilimitado',
      enterprise: 'Ilimitado',
    },
    {
      name: 'Scanner OCR',
      free: false,
      premium: '20/mês',
      family: 'Ilimitado',
      enterprise: 'Ilimitado',
    },
    {
      name: 'Teleconsultas/mês',
      free: false,
      premium: '1',
      family: '3',
      enterprise: 'Ilimitado',
    },
    {
      name: 'Verificador de Interações',
      free: false,
      premium: true,
      family: true,
      enterprise: true,
    },
    {
      name: 'Lembretes Inteligentes',
      free: false,
      premium: true,
      family: true,
      enterprise: true,
    },
    {
      name: 'Dashboard Familiar',
      free: false,
      premium: false,
      family: true,
      enterprise: true,
    },
    {
      name: 'Chat com Cuidadores',
      free: false,
      premium: false,
      family: true,
      enterprise: true,
    },
    {
      name: 'Insights Avançados',
      free: false,
      premium: true,
      family: true,
      enterprise: true,
    },
    {
      name: 'Integração Wearables',
      free: false,
      premium: false,
      family: true,
      enterprise: true,
    },
    {
      name: 'Acesso API',
      free: false,
      premium: false,
      family: false,
      enterprise: true,
    },
    {
      name: 'Armazenamento',
      free: '50 MB',
      premium: '500 MB',
      family: '2 GB',
      enterprise: 'Ilimitado',
    },
  ];

  ngOnInit() {
    this.checkPaymentConfiguration();
    this.loadCurrentPlan();
    this.translatePlanNames();
  }

  translatePlanNames() {
    this.translate.get([
      'PRICING.PLANS.FREE',
      'PRICING.PLANS.PREMIUM',
      'PRICING.PLANS.FAMILY',
      'PRICING.PLANS.ENTERPRISE'
    ]).subscribe(translations => {
      this.plans[0].name = translations['PRICING.PLANS.FREE'];
      this.plans[1].name = translations['PRICING.PLANS.PREMIUM'];
      this.plans[2].name = translations['PRICING.PLANS.FAMILY'];
      this.plans[3].name = translations['PRICING.PLANS.ENTERPRISE'];
    });
  }

  checkPaymentConfiguration() {
    const status = this.paymentConfigService.getConfigurationStatus();
    this.configStatus.set(status);
    this.paymentConfigured.set(status.configured);
  }

  async loadCurrentPlan() {
    try {
      const userId = this.authService.currentUser()?.uid;
      if (!userId) return;
      
      await this.subscriptionService.loadSubscription(userId);
      const subscription = this.subscriptionService.subscription();
      
      if (subscription) {
        this.currentPlan.set(subscription.plan);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  }

  toggleBillingCycle() {
    this.billingCycle.set(this.billingCycle() === 'monthly' ? 'yearly' : 'monthly');
  }

  getPrice(plan: PlanCard): number {
    return this.billingCycle() === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  }

  getAvailablePlans(): PlanCard[] {
    if (this.paymentConfigured()) {
      return this.plans; // Show all plans
    }
    // Only show free plan if payment is not configured
    return this.plans.filter(p => p.plan === 'free');
  }

  getSavingsPercentage(): number {
    // Yearly saves ~17%
    return 17;
  }

  async selectPlan(plan: SubscriptionPlan) {
    if (plan === 'free') {
      const message = await firstValueFrom(this.translate.get('PRICING.MESSAGES.FREE_ACCESS'));
      await this.showToast(message, 'medium');
      return;
    }

    // Check if payment is configured for paid plans
    if (!this.paymentConfigured()) {
      const message = await firstValueFrom(this.translate.get('PRICING.MESSAGES.PAYMENT_NOT_CONFIGURED'));
      await this.showToast(message, 'warning');
      return;
    }

    if (plan === 'enterprise') {
      const message = await firstValueFrom(this.translate.get('PRICING.MESSAGES.CONTACT_ENTERPRISE'));
      await this.showToast(message, 'primary');
      return;
    }

    if (plan === this.currentPlan()) {
      const message = await firstValueFrom(this.translate.get('PRICING.MESSAGES.ALREADY_SUBSCRIBED'));
      await this.showToast(message, 'primary');
      return;
    }

    // Show payment method selection
    await this.selectPaymentMethod(plan);
  }

  async selectPaymentMethod(plan: SubscriptionPlan) {
    const providers = this.configStatus().providers;
    
    // If only one provider is available, use it directly
    if (providers.length === 1) {
      if (providers[0] === 'stripe') {
        await this.proceedWithStripe(plan);
      } else {
        await this.proceedWithPagSeguro(plan);
      }
      return;
    }

    // Show payment method selection if both are available
    const translations = await firstValueFrom(this.translate.get([
      'PRICING.PAYMENT.SELECT_METHOD',
      'PRICING.PAYMENT.CREDIT_CARD',
      'PRICING.PAYMENT.PAGSEGURO',
      'PRICING.PAYMENT.CANCEL'
    ]));

    const actionSheet = await this.actionSheetController.create({
      header: translations['PRICING.PAYMENT.SELECT_METHOD'],
      subHeader: `${this.getPlanName(plan)} - ${this.getPlanPrice(plan)}`,
      buttons: [
        ...(providers.includes('stripe') ? [{
          text: translations['PRICING.PAYMENT.CREDIT_CARD'],
          icon: 'card-outline',
          handler: () => {
            this.proceedWithStripe(plan);
          },
        }] : []),
        ...(providers.includes('pagseguro') ? [{
          text: translations['PRICING.PAYMENT.PAGSEGURO'],
          icon: 'logo-paypal',
          handler: () => {
            this.proceedWithPagSeguro(plan);
          },
        }] : []),
        {
          text: translations['PRICING.PAYMENT.CANCEL'],
          icon: 'close',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async proceedWithStripe(plan: SubscriptionPlan) {
    const redirectingMessage = await firstValueFrom(this.translate.get('PRICING.PAYMENT.REDIRECTING'));
    const loading = await this.loadingController.create({
      message: redirectingMessage,
    });
    await loading.present();

    try {
      const userId = this.authService.currentUser()?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      await this.stripeService.createCheckoutSession(
        plan,
        this.billingCycle(),
        userId
      );
    } catch (error) {
      console.error('Error creating Stripe checkout:', error);
      const errorMessage = await firstValueFrom(this.translate.get('PRICING.MESSAGES.PAYMENT_ERROR'));
      await this.showToast(errorMessage, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async proceedWithPagSeguro(plan: SubscriptionPlan) {
    const redirectingMessage = await firstValueFrom(this.translate.get('PRICING.PAYMENT.REDIRECTING'));
    const loading = await this.loadingController.create({
      message: redirectingMessage,
    });
    await loading.present();

    try {
      const user = this.authService.currentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const userEmail = user.email || '';
      const userName = user.displayName || 'Usuário';
      const userPhone = user.phoneNumber || '';

      await this.pagseguroService.createSubscription(
        plan,
        this.billingCycle(),
        user.uid,
        userEmail,
        userName,
        userPhone
      );
    } catch (error) {
      console.error('Error creating PagSeguro checkout:', error);
      const errorMessage = await firstValueFrom(this.translate.get('PRICING.MESSAGES.PAYMENT_ERROR'));
      await this.showToast(errorMessage, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  getPlanName(plan: SubscriptionPlan): string {
    return this.plans.find((p) => p.plan === plan)?.name || '';
  }

  getPlanPrice(plan: SubscriptionPlan): string {
    const planCard = this.plans.find((p) => p.plan === plan);
    if (!planCard) return '';

    const price = this.getPrice(planCard);
    if (price === 0) {
      // Use translation for "Custom pricing"
      let customText = 'Sob consulta';
      this.translate.get('PRICING.BILLING.CUSTOM').subscribe(text => customText = text);
      return customText;
    }

    const cycleKey = this.billingCycle() === 'monthly' ? 'PRICING.BILLING.PER_MONTH' : 'PRICING.BILLING.PER_YEAR';
    let cycle = '/mês';
    this.translate.get(cycleKey).subscribe(text => cycle = text);
    
    return `R$ ${price.toFixed(2)}${cycle}`;
  }

  isCurrentPlan(plan: SubscriptionPlan): boolean {
    return this.currentPlan() === plan;
  }

  getFeatureValue(feature: PlanFeature, plan: SubscriptionPlan): string | boolean {
    return feature[plan];
  }

  formatFeatureValue(value: string | boolean): string {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    return value;
  }

  getFeatureColor(value: string | boolean): string {
    if (typeof value === 'boolean') {
      return value ? 'success' : 'medium';
    }
    return 'dark';
  }

  getMainFeatures(plan: SubscriptionPlan): Array<{ name: string; included: boolean | string }> {
    const featureMap: Record<SubscriptionPlan, Array<{ name: string; included: boolean | string }>> = {
      free: [
        { name: 'Medicamentos ilimitados', included: true },
        { name: '1 dependente', included: true },
        { name: '2 cuidadores', included: true },
        { name: '3 relatórios/mês', included: true },
        { name: 'Scanner OCR', included: false },
        { name: 'Teleconsultas', included: false }
      ],
      premium: [
        { name: 'Tudo do Gratuito', included: true },
        { name: 'Dependentes ilimitados', included: true },
        { name: 'Cuidadores ilimitados', included: true },
        { name: 'Scanner OCR (20/mês)', included: true },
        { name: '1 teleconsulta/mês', included: true },
        { name: 'Insights com IA', included: true }
      ],
      family: [
        { name: 'Tudo do Premium', included: true },
        { name: 'Scanner OCR ilimitado', included: true },
        { name: '3 teleconsultas/mês', included: true },
        { name: 'Dashboard familiar', included: true },
        { name: 'Chat com cuidadores', included: true },
        { name: 'Integração wearables', included: true }
      ],
      enterprise: [
        { name: 'Tudo do Família', included: true },
        { name: 'Teleconsultas ilimitadas', included: true },
        { name: 'API de integração', included: true },
        { name: 'Armazenamento ilimitado', included: true },
        { name: 'Suporte prioritário', included: true },
        { name: 'SLA garantido', included: true }
      ]
    };

    return featureMap[plan] || [];
  }

  getButtonText(plan: SubscriptionPlan): string {
    if (this.isCurrentPlan(plan)) {
      let text = 'Plano Atual';
      this.translate.get('PRICING.BUTTONS.CURRENT_PLAN').subscribe(t => text = t);
      return text;
    }

    if (plan === 'free') {
      let text = 'Começar Grátis';
      this.translate.get('PRICING.BUTTONS.START_FREE').subscribe(t => text = t);
      return text;
    }

    if (plan === 'enterprise') {
      let text = 'Falar com Vendas';
      this.translate.get('PRICING.BUTTONS.CONTACT_SALES').subscribe(t => text = t);
      return text;
    }

    if (!this.paymentConfigured()) {
      let text = 'Indisponível';
      this.translate.get('PRICING.BUTTONS.UNAVAILABLE').subscribe(t => text = t);
      return text;
    }

    let text = 'Assinar Agora';
    this.translate.get('PRICING.BUTTONS.SUBSCRIBE').subscribe(t => text = t);
    return text;
  }

  scrollToPlans() {
    const element = document.querySelector('.plans-container');
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  goBack() {
    this.router.navigate(['/tabs/profile']);
  }
}
