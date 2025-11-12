import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, Timestamp } from '@angular/fire/firestore';
import { 
  UserSubscription, 
  SubscriptionPlan,
  DEFAULT_FEATURES,
  SubscriptionFeatures 
} from '../models/subscription.model';
import { AuthService } from './auth.service';
import { StripePaymentService } from './stripe-payment.service';
import { PagSeguroPaymentService } from './pagseguro-payment.service';
import { LogService } from './log.service';

/**
 * Subscription Service
 * Manages user subscriptions, plan limits, and billing
 * Integrates with Stripe and PagSeguro payment providers
 */
@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly stripeService = inject(StripePaymentService);
  private readonly pagSeguroService = inject(PagSeguroPaymentService);
  private readonly logService = inject(LogService);

  // Signals (public for component access)
  readonly subscription = signal<UserSubscription | null>(null);
  
  // Computed
  readonly currentPlan = computed(() => this.subscription()?.plan || 'free');
  readonly isActive = computed(() => this.subscription()?.status === 'active');
  readonly isTrialing = computed(() => this.subscription()?.status === 'trialing');
  readonly isPremium = computed(() => {
    const plan = this.currentPlan();
    return plan === 'premium' || plan === 'family' || plan === 'enterprise';
  });
  readonly isFamily = computed(() => {
    const plan = this.currentPlan();
    return plan === 'family' || plan === 'enterprise';
  });
  readonly isEnterprise = computed(() => this.currentPlan() === 'enterprise');
  readonly features = computed(() => this.subscription()?.features || DEFAULT_FEATURES.free);

  constructor() {
    // Auto-load subscription when user changes
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadSubscription(user.uid);
      } else {
        this.subscription.set(null);
      }
    });
  }

  /**
   * Load user subscription from Firestore
   */
  async loadSubscription(userId: string): Promise<void> {
    try {
      const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
      const snapshot = await getDoc(subscriptionDoc);

      if (snapshot.exists()) {
        const data = snapshot.data() as UserSubscription;
        this.subscription.set(data);
        this.logService.debug('SubscriptionService', 'Loaded subscription', { plan: data.plan });
      } else {
        // Create default free subscription
        await this.createFreeSubscription(userId);
      }
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error loading subscription', error as Error);
      throw error;
    }
  }

  /**
   * Create default free subscription for new users
   */
  private async createFreeSubscription(userId: string): Promise<void> {
    const now = Timestamp.now();
    const freeSubscription: UserSubscription = {
      plan: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), // 1 year
      cancelAtPeriodEnd: false,
      features: DEFAULT_FEATURES.free,
      billing: {
        interval: 'monthly',
        amount: 0,
        currency: 'BRL',
        nextBillingDate: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
      },
      usage: {
        reportsThisMonth: 0,
        ocrScansThisMonth: 0,
        telehealthConsultsThisMonth: 0,
        lastResetDate: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
    await setDoc(subscriptionDoc, freeSubscription);
    this.subscription.set(freeSubscription);
    
    this.logService.debug('SubscriptionService', 'Created free subscription', { userId });
  }

  /**
   * Check if user has access to a specific feature
   */
  hasFeature(featureName: keyof SubscriptionFeatures): boolean {
    const features = this.features();
    return features[featureName] === true || features[featureName] === -1;
  }

  /**
   * Check if user is within usage limits
   */
  isWithinLimit(limitName: 'reportsPerMonth' | 'ocrScansPerMonth' | 'telehealthConsultsPerMonth'): boolean {
    const subscription = this.subscription();
    if (!subscription) return false;

    const limit = subscription.features[limitName];
    if (limit === -1) return true; // Unlimited

    const usage = subscription.usage || {
      reportsThisMonth: 0,
      ocrScansThisMonth: 0,
      telehealthConsultsThisMonth: 0,
      lastResetDate: Timestamp.now(),
    };

    const usageMap = {
      reportsPerMonth: usage.reportsThisMonth,
      ocrScansPerMonth: usage.ocrScansThisMonth,
      telehealthConsultsPerMonth: usage.telehealthConsultsThisMonth,
    };

    return usageMap[limitName] < limit;
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(
    userId: string,
    counter: 'reportsThisMonth' | 'ocrScansThisMonth' | 'telehealthConsultsThisMonth'
  ): Promise<void> {
    const subscription = this.subscription();
    if (!subscription) return;

    // Check if usage needs reset (new month)
    const now = new Date();
    const lastReset = subscription.usage?.lastResetDate?.toDate() || new Date(0);
    const shouldReset = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();

    if (shouldReset) {
      subscription.usage = {
        reportsThisMonth: 0,
        ocrScansThisMonth: 0,
        telehealthConsultsThisMonth: 0,
        lastResetDate: Timestamp.now(),
      };
    }

    // Increment counter
    if (subscription.usage) {
      subscription.usage[counter]++;
      subscription.updatedAt = Timestamp.now();

      // Save to Firestore
      const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
      await setDoc(subscriptionDoc, subscription, { merge: true });
      this.subscription.set(subscription);

      this.logService.debug('SubscriptionService', 'Usage incremented', { counter, value: subscription.usage[counter] });
    }
  }

  /**
   * Get remaining usage for a counter
   */
  getRemainingUsage(limitName: 'reportsPerMonth' | 'ocrScansPerMonth' | 'telehealthConsultsPerMonth'): number {
    const subscription = this.subscription();
    if (!subscription) return 0;

    const limit = subscription.features[limitName];
    if (limit === -1) return Infinity; // Unlimited

    const usage = subscription.usage || {
      reportsThisMonth: 0,
      ocrScansThisMonth: 0,
      telehealthConsultsThisMonth: 0,
      lastResetDate: Timestamp.now(),
    };

    const usageMap = {
      reportsPerMonth: usage.reportsThisMonth,
      ocrScansPerMonth: usage.ocrScansThisMonth,
      telehealthConsultsPerMonth: usage.telehealthConsultsThisMonth,
    };

    return Math.max(0, limit - usageMap[limitName]);
  }

  /**
   * Upgrade subscription
   * NOTE: Payment processing integration pending (Stripe/PagSeguro)
   */
  async upgradeSubscription(
    userId: string,
    newPlan: SubscriptionPlan,
    paymentMethodId?: string
  ): Promise<void> {
    // Payment processing will be integrated in separate epic
    // For now, just update the subscription structure
    const subscription = this.subscription();
    if (!subscription) throw new Error('No subscription found');

    const now = Timestamp.now();
    subscription.plan = newPlan;
    subscription.status = 'active';
    subscription.features = DEFAULT_FEATURES[newPlan];
    subscription.updatedAt = now;

    const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
    await setDoc(subscriptionDoc, subscription, { merge: true });
    this.subscription.set(subscription);

    this.logService.info('SubscriptionService', 'Subscription upgraded', { newPlan });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, immediate: boolean = false): Promise<void> {
    const subscription = this.subscription();
    if (!subscription) throw new Error('No subscription found');

    const now = Timestamp.now();

    if (immediate) {
      subscription.status = 'canceled';
      subscription.canceledAt = now;
      subscription.plan = 'free';
      subscription.features = DEFAULT_FEATURES.free;
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    subscription.updatedAt = now;

    const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
    await setDoc(subscriptionDoc, subscription, { merge: true });
    this.subscription.set(subscription);

    this.logService.info('SubscriptionService', 'Subscription canceled', { immediate });
  }

  /**
   * Get plan display name
   */
  getPlanDisplayName(plan: SubscriptionPlan): string {
    const names = {
      free: 'Gratuito',
      premium: 'Premium',
      family: 'Família',
      enterprise: 'Enterprise',
    };
    return names[plan];
  }

  /**
   * Get current subscription object
   */
  getCurrentSubscription(): UserSubscription | null {
    return this.subscription();
  }

  /**
   * Upgrade subscription via Stripe
   */
  async upgradeViaStripe(
    userId: string,
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string
  ): Promise<void> {
    try {
      this.logService.debug('SubscriptionService', 'Upgrading via Stripe', { plan, billingCycle });
      
      // Stripe service will handle checkout session creation and redirect
      await this.stripeService.createCheckoutSession(
        plan,
        billingCycle,
        userId,
        successUrl,
        cancelUrl
      );
      
      // Note: Actual subscription update happens via webhook
      // after successful payment
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error upgrading via Stripe', error as Error);
      throw error;
    }
  }

  /**
   * Upgrade subscription via PagSeguro
   */
  async upgradeViaPagSeguro(
    userId: string,
    plan: SubscriptionPlan,
    billingCycle: 'monthly' | 'yearly',
    userEmail: string,
    userName: string,
    userPhone: string
  ): Promise<void> {
    try {
      this.logService.debug('SubscriptionService', 'Upgrading via PagSeguro', { plan, billingCycle });
      
      // PagSeguro service will handle subscription creation and redirect
      await this.pagSeguroService.createSubscription(
        plan,
        billingCycle,
        userId,
        userEmail,
        userName,
        userPhone
      );
      
      // Note: Actual subscription update happens via notification webhook
      // after successful payment
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error upgrading via PagSeguro', error as Error);
      throw error;
    }
  }

  /**
   * Sync subscription status with Stripe
   * Useful for manual reconciliation or status checks
   */
  async syncWithStripe(userId: string, subscriptionId: string): Promise<void> {
    try {
      this.logService.debug('SubscriptionService', 'Syncing with Stripe', { subscriptionId });
      
      const stripeStatus = await this.stripeService.getSubscriptionStatus(subscriptionId);
      
      // Update local subscription based on Stripe data
      const subscription = this.subscription();
      if (subscription) {
        const statusMap: Record<string, UserSubscription['status']> = {
          'active': 'active',
          'trialing': 'trialing',
          'past_due': 'past_due',
          'canceled': 'canceled',
          'unpaid': 'past_due'
        };
        
        subscription.status = statusMap[stripeStatus.status] || 'active';
        subscription.cancelAtPeriodEnd = stripeStatus.cancelAtPeriodEnd;
        subscription.updatedAt = Timestamp.now();
        
        const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
        await setDoc(subscriptionDoc, subscription, { merge: true });
        this.subscription.set(subscription);
        
        this.logService.debug('SubscriptionService', 'Synced with Stripe', { status: stripeStatus.status });
      }
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error syncing with Stripe', error as Error);
      throw error;
    }
  }

  /**
   * Sync subscription status with PagSeguro
   */
  async syncWithPagSeguro(userId: string, subscriptionCode: string): Promise<void> {
    try {
      this.logService.debug('SubscriptionService', 'Syncing with PagSeguro', { subscriptionCode });
      
      const pagSeguroStatus = await this.pagSeguroService.getSubscriptionStatus(subscriptionCode);
      
      // Update local subscription based on PagSeguro data
      const subscription = this.subscription();
      if (subscription) {
        // Map PagSeguro status to our status
        const statusMap: Record<string, UserSubscription['status']> = {
          'ACTIVE': 'active',
          'CANCELLED': 'canceled',
          'SUSPENDED': 'past_due',
          'EXPIRED': 'canceled'
        };
        
        subscription.status = statusMap[pagSeguroStatus.status] || 'active';
        subscription.updatedAt = Timestamp.now();
        
        const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
        await setDoc(subscriptionDoc, subscription, { merge: true });
        this.subscription.set(subscription);
        
        this.logService.debug('SubscriptionService', 'Synced with PagSeguro', { status: pagSeguroStatus.status });
      }
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error syncing with PagSeguro', error as Error);
      throw error;
    }
  }

  /**
   * Get payment history from active payment provider
   * Returns unified payment history interface
   */
  async getPaymentHistory(userId: string): Promise<Array<{
    id: string;
    date: Date;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    method: string;
    invoice?: string;
  }>> {
    try {
      const subscription = this.subscription();
      if (!subscription) {
        return [];
      }

      // Determine payment provider based on subscription data
      const hasStripeCustomer = subscription.stripeCustomerId;
      const hasPagSeguroCode = (subscription as any).pagSeguroCode; // Add to model if needed
      
      if (hasStripeCustomer) {
        this.logService.debug('SubscriptionService', 'Fetching Stripe payment history');
        const customerId = subscription.stripeCustomerId!;
        const stripeHistory = await this.stripeService.getPaymentHistory(customerId);
        
        return stripeHistory.map(invoice => ({
          id: invoice.id,
          date: new Date(invoice.created * 1000),
          amount: invoice.amount_paid / 100,
          status: invoice.paid ? 'paid' : 'pending',
          method: 'Cartão de Crédito',
          invoice: invoice.hosted_invoice_url || undefined
        }));
      } else if (hasPagSeguroCode) {
        this.logService.debug('SubscriptionService', 'Fetching PagSeguro payment history');
        const pagSeguroHistory = await this.pagSeguroService.getTransactionHistory(hasPagSeguroCode);
        
        return pagSeguroHistory.map(transaction => {
          let status: 'paid' | 'pending' | 'failed';
          if (transaction.status === 3) {
            status = 'paid';
          } else if (transaction.status === 1 || transaction.status === 2) {
            status = 'pending';
          } else {
            status = 'failed';
          }
          
          return {
            id: transaction.code,
            date: new Date(transaction.date),
            amount: transaction.grossAmount,
            status,
            method: this.getPagSeguroMethodName(transaction.paymentMethod.type)
          };
        });
      }

      return [];
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error fetching payment history', error as Error);
      return [];
    }
  }

  /**
   * Helper to map PagSeguro payment method type to friendly name
   */
  private getPagSeguroMethodName(type: number): string {
    const methods: Record<number, string> = {
      1: 'Cartão de Crédito',
      2: 'Boleto',
      3: 'Débito Online',
      4: 'Saldo PagSeguro',
      5: 'PIX'
    };
    return methods[type] || 'Outro';
  }

  /**
   * Cancel subscription via payment provider
   */
  async cancelSubscriptionViaProvider(userId: string, immediate: boolean = false): Promise<void> {
    const subscription = this.subscription();
    if (!subscription) throw new Error('No subscription found');

    try {
      if (subscription.stripeSubscriptionId) {
        this.logService.debug('SubscriptionService', 'Canceling Stripe subscription');
        await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      } else if ((subscription as any).pagSeguroCode) {
        this.logService.debug('SubscriptionService', 'Canceling PagSeguro subscription');
        await this.pagSeguroService.cancelSubscription((subscription as any).pagSeguroCode);
      }

      // Update local subscription
      await this.cancelSubscription(userId, immediate);
      
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error canceling via provider', error as Error);
      throw error;
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscriptionViaProvider(userId: string): Promise<void> {
    const subscription = this.subscription();
    if (!subscription) throw new Error('No subscription found');

    try {
      if (subscription.stripeSubscriptionId) {
        this.logService.debug('SubscriptionService', 'Reactivating Stripe subscription');
        await this.stripeService.reactivateSubscription(subscription.stripeSubscriptionId);
      } else if ((subscription as any).pagSeguroCode) {
        this.logService.debug('SubscriptionService', 'Reactivating PagSeguro subscription');
        await this.pagSeguroService.reactivateSubscription((subscription as any).pagSeguroCode);
      }

      // Update local subscription
      const now = Timestamp.now();
      subscription.cancelAtPeriodEnd = false;
      subscription.status = 'active';
      subscription.updatedAt = now;

      const subscriptionDoc = doc(this.firestore, `users/${userId}/subscription/current`);
      await setDoc(subscriptionDoc, subscription, { merge: true });
      this.subscription.set(subscription);
      
      this.logService.info('SubscriptionService', 'Subscription reactivated');
    } catch (error: any) {
      this.logService.error('SubscriptionService', 'Error reactivating via provider', error as Error);
      throw error;
    }
  }
}

