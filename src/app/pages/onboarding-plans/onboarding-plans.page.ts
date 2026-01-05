import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ActionSheetController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { StripePaymentService } from '../../services/stripe-payment.service';
import { PagSeguroPaymentService } from '../../services/pagseguro-payment.service';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { SubscriptionPlan } from '../../models/feature-mapping.model';

interface OnboardingPlan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  priceYearly: number;
  icon: string;
  color: string;
  badge?: string;
  tagline: string;
  ctaText: string;
  highlights: string[];
  popularFeatures: Array<{
    icon: string;
    text: string;
    exclusive?: boolean;
  }>;
}

@Component({
  selector: 'app-onboarding-plans',
  templateUrl: './onboarding-plans.page.html',
  styleUrls: ['./onboarding-plans.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, TranslateModule]
})
export class OnboardingPlansPage implements OnInit {
  private readonly stripeService = inject(StripePaymentService);
  private readonly pagSeguroService = inject(PagSeguroPaymentService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly authService = inject(AuthService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly loadingController = inject(LoadingController);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  // Signals
  isYearly = signal<boolean>(false);
  loading = signal<boolean>(false);
  selectedPlan = signal<SubscriptionPlan | null>(null);

  // Plans Configuration - Optimized for onboarding conversion
  plans: OnboardingPlan[] = [
    {
      id: 'free',
      name: '',
      price: 0,
      priceYearly: 0,
      icon: 'gift',
      color: 'medium',
      tagline: '',
      ctaText: '',
      highlights: [],
      popularFeatures: []
    },
    {
      id: 'premium',
      name: '',
      price: 29.9,
      priceYearly: 24.9,
      icon: 'star',
      color: 'primary',
      badge: '',
      tagline: '',
      ctaText: '',
      highlights: [],
      popularFeatures: []
    },
    {
      id: 'family',
      name: '',
      price: 49.9,
      priceYearly: 41.6,
      icon: 'people',
      color: 'secondary',
      badge: '',
      tagline: '',
      ctaText: '',
      highlights: [],
      popularFeatures: []
    }
  ];

  // Computed
  filteredPlans = computed(() => {
    // Remove Free plan after initial screen to focus on conversion
    return this.plans.filter(p => p.id !== 'free');
  });

  displayedPlans = computed(() => {
    return this.plans; // Show all plans including Free
  });

  savings = computed(() => {
    if (!this.isYearly()) return 0;
    return Math.round(((29.9 - 24.9) / 29.9) * 100);
  });

  ngOnInit() {
    // Load translations for plans
    this.loadPlanTranslations();
    // Track onboarding page view for analytics
    this.trackPageView();
  }

  async loadPlanTranslations() {
    // Free plan
    this.plans[0].name = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.NAME'));
    this.plans[0].tagline = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.TAGLINE'));
    this.plans[0].ctaText = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.CTA'));
    this.plans[0].highlights = [
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.HIGHLIGHT_1')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.HIGHLIGHT_2')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.HIGHLIGHT_3'))
    ];
    this.plans[0].popularFeatures = [
      { icon: 'medkit-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.FEATURE_1')) },
      { icon: 'alarm-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.FEATURE_2')) },
      { icon: 'cloud-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FREE.FEATURE_3')) }
    ];

    // Premium plan
    this.plans[1].name = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.NAME'));
    this.plans[1].badge = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.BADGE'));
    this.plans[1].tagline = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.TAGLINE'));
    this.plans[1].ctaText = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.CTA'));
    this.plans[1].highlights = [
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.HIGHLIGHT_1')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.HIGHLIGHT_2')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.HIGHLIGHT_3')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.HIGHLIGHT_4'))
    ];
    this.plans[1].popularFeatures = [
      { icon: 'infinite-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.FEATURE_1')), exclusive: true },
      { icon: 'scan-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.FEATURE_2')), exclusive: true },
      { icon: 'people-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.FEATURE_3')) },
      { icon: 'bulb-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.FEATURE_4')), exclusive: true },
      { icon: 'shield-checkmark-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.FEATURE_5')), exclusive: true },
      { icon: 'notifications-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.PREMIUM.FEATURE_6')) }
    ];

    // Family plan
    this.plans[2].name = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.NAME'));
    this.plans[2].badge = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.BADGE'));
    this.plans[2].tagline = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.TAGLINE'));
    this.plans[2].ctaText = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.CTA'));
    this.plans[2].highlights = [
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.HIGHLIGHT_1')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.HIGHLIGHT_2')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.HIGHLIGHT_3')),
      await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.HIGHLIGHT_4'))
    ];
    this.plans[2].popularFeatures = [
      { icon: 'people-circle-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.FEATURE_1')), exclusive: true },
      { icon: 'scan-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.FEATURE_2')), exclusive: true },
      { icon: 'chatbubbles-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.FEATURE_3')), exclusive: true },
      { icon: 'videocam-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.FEATURE_4')), exclusive: true },
      { icon: 'analytics-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.FEATURE_5')), exclusive: true },
      { icon: 'calendar-outline', text: await firstValueFrom(this.translate.get('ONBOARDING_PLANS.PLANS.FAMILY.FEATURE_6')), exclusive: true }
    ];
  }

  trackPageView() {
  }

  getPrice(plan: OnboardingPlan): number {
    return this.isYearly() ? plan.priceYearly : plan.price;
  }

  toggleBilling() {
    this.isYearly.update(v => !v);
  }

  async selectPlan(plan: OnboardingPlan) {
    this.selectedPlan.set(plan.id);

    if (plan.id === 'free') {
      await this.skipToApp();
      return;
    }

    // Show payment method options
    await this.showPaymentOptions(plan);
  }

  async showPaymentOptions(plan: OnboardingPlan) {
    const choosePaymentMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.ACTIONS.CHOOSE_PAYMENT'));
    const stripeMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.ACTIONS.STRIPE'));
    const pagSeguroMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.ACTIONS.PAGSEGURO'));
    const cancelMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.ACTIONS.CANCEL'));

    const actionSheet = await this.actionSheetController.create({
      header: `${plan.name} - ${this.formatCurrency(this.getPrice(plan))}/mês`,
      subHeader: choosePaymentMsg,
      buttons: [
        {
          text: stripeMsg,
          icon: 'card-outline',
          handler: () => this.proceedWithStripe(plan)
        },
        {
          text: pagSeguroMsg,
          icon: 'wallet-outline',
          handler: () => this.proceedWithPagSeguro(plan)
        },
        {
          text: cancelMsg,
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async proceedWithStripe(plan: OnboardingPlan) {
    const processingMessage = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.PROCESSING'));
    const loading = await this.loadingController.create({
      message: processingMessage
    });
    await loading.present();

    try {
      const userId = this.authService.currentUser()?.uid;
      if (!userId) {
        const errorMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.USER_NOT_AUTH'));
        throw new Error(errorMsg);
      }

      await this.stripeService.createCheckoutSession(
        plan.id,
        this.isYearly() ? 'yearly' : 'monthly',
        userId,
        `${globalThis.location.origin}/onboarding/complete`,
        `${globalThis.location.origin}/onboarding/plans`
      );

      // Stripe will redirect, so we keep loading visible
    } catch (error) {
      console.error('Error creating Stripe checkout:', error);
      const errorMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.PAYMENT_ERROR'));
      this.showToast(errorMsg, 'danger');
      loading.dismiss();
    }
  }

  async proceedWithPagSeguro(plan: OnboardingPlan) {
    const processingMessage = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.PROCESSING'));
    const loading = await this.loadingController.create({
      message: processingMessage
    });
    await loading.present();

    try {
      const userId = this.authService.currentUser()?.uid;
      const user = this.authService.currentUser();
      
      if (!userId || !user?.email) {
        const errorMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.USER_NOT_AUTH'));
        throw new Error(errorMsg);
      }

      const userName = user.displayName || 'Usuário';
      const userEmail = user.email;
      const userPhone = ''; // Will be collected in checkout form
      
      await this.pagSeguroService.createSubscription(
        plan.id,
        this.isYearly() ? 'yearly' : 'monthly',
        userId,
        userEmail,
        userName,
        userPhone
      );

      // PagSeguro service handles redirect

    } catch (error) {
      console.error('Error creating PagSeguro subscription:', error);
      const errorMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.PAYMENT_ERROR'));
      this.showToast(errorMsg, 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async skipToApp() {
    // User chose Free plan or clicked "Skip"
    const configuringMessage = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.CONFIGURING'));
    const loading = await this.loadingController.create({
      message: configuringMessage
    });
    await loading.present();

    try {
      const userId = this.authService.currentUser()?.uid;
      if (userId) {
        // Initialize subscription with Free plan
        await this.subscriptionService.loadSubscription(userId);
      }

      // Navigate to main app
      await this.router.navigate(['/tabs/home'], { replaceUrl: true });
      
      const welcomeMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.WELCOME'));
      this.showToast(welcomeMsg, 'success');
    } catch (error) {
      console.error('Error initializing app:', error);
      const errorMsg = await firstValueFrom(this.translate.get('ONBOARDING_PLANS.MESSAGES.CONFIG_ERROR'));
      this.showToast(errorMsg, 'danger');
    } finally {
      loading.dismiss();
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
