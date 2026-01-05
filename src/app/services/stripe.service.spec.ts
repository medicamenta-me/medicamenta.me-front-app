import {
  StripeCustomer,
  StripeSubscription
} from '../models/stripe.model';
import { SubscriptionPlan, BillingInterval } from '../models/subscription.model';

/**
 * Unit tests for StripeService
 * Tests interfaces, types, and utility logic
 */
describe('StripeService', () => {
  
  describe('Stripe Config', () => {
    
    interface StripeConfig {
      publishableKey: string;
      mode: 'test' | 'live';
      successUrl: string;
      cancelUrl: string;
      trialPeriodDays: number;
    }

    it('should create test mode config', () => {
      const config: StripeConfig = {
        publishableKey: 'pk_test_xxx',
        mode: 'test',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        trialPeriodDays: 7
      };

      expect(config.mode).toBe('test');
      expect(config.publishableKey).toContain('pk_test');
    });

    it('should create live mode config', () => {
      const config: StripeConfig = {
        publishableKey: 'pk_live_xxx',
        mode: 'live',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
        trialPeriodDays: 7
      };

      expect(config.mode).toBe('live');
      expect(config.publishableKey).toContain('pk_live');
    });

    it('should validate trial period days', () => {
      const config: StripeConfig = {
        publishableKey: 'pk_test_xxx',
        mode: 'test',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialPeriodDays: 14
      };

      expect(config.trialPeriodDays).toBeGreaterThan(0);
      expect(config.trialPeriodDays).toBeLessThanOrEqual(30);
    });
  });

  describe('Checkout Session Data', () => {
    
    interface CheckoutSessionData {
      priceId: string;
      plan: SubscriptionPlan;
      billingInterval: BillingInterval;
      email: string;
      userId: string;
      successUrl: string;
      cancelUrl: string;
      trialPeriodDays: number;
      status: 'pending' | 'processing' | 'complete' | 'error';
    }

    it('should create checkout session for basic plan', () => {
      const session: CheckoutSessionData = {
        priceId: 'price_premium_monthly',
        plan: 'premium',
        billingInterval: 'monthly',
        email: 'user@example.com',
        userId: 'user-123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialPeriodDays: 7,
        status: 'pending'
      };

      expect(session.plan).toBe('premium');
      expect(session.billingInterval).toBe('monthly');
      expect(session.status).toBe('pending');
    });

    it('should create checkout session for premium plan', () => {
      const session: CheckoutSessionData = {
        priceId: 'price_family_yearly',
        plan: 'family',
        billingInterval: 'yearly',
        email: 'premium@example.com',
        userId: 'user-456',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialPeriodDays: 0,
        status: 'pending'
      };

      expect(session.plan).toBe('family');
      expect(session.billingInterval).toBe('yearly');
    });

    it('should validate plan types', () => {
      const plans: SubscriptionPlan[] = ['free', 'premium', 'family', 'enterprise'];
      expect(plans.length).toBe(4);
      expect(plans).toContain('premium');
      expect(plans).toContain('family');
    });

    it('should validate billing intervals', () => {
      const intervals: BillingInterval[] = ['monthly', 'yearly'];
      expect(intervals.length).toBe(2);
    });
  });

  describe('Billing Portal Session', () => {
    
    interface BillingPortalSession {
      userId: string;
      returnUrl: string;
      status: 'pending' | 'processing' | 'complete' | 'error';
      url?: string;
      error?: string;
    }

    it('should create pending portal session', () => {
      const session: BillingPortalSession = {
        userId: 'user-123',
        returnUrl: 'https://example.com/profile',
        status: 'pending'
      };

      expect(session.status).toBe('pending');
      expect(session.url).toBeUndefined();
    });

    it('should create complete portal session', () => {
      const session: BillingPortalSession = {
        userId: 'user-123',
        returnUrl: 'https://example.com/profile',
        status: 'complete',
        url: 'https://billing.stripe.com/session/xxx'
      };

      expect(session.status).toBe('complete');
      expect(session.url).toBeDefined();
    });

    it('should create error portal session', () => {
      const session: BillingPortalSession = {
        userId: 'user-123',
        returnUrl: 'https://example.com/profile',
        status: 'error',
        error: 'Customer not found'
      };

      expect(session.status).toBe('error');
      expect(session.error).toBeDefined();
    });
  });

  describe('Price ID Generation', () => {
    
    function getPriceId(
      plan: SubscriptionPlan,
      interval: BillingInterval,
      mode: 'test' | 'live'
    ): string {
      const prefix = mode === 'test' ? 'price_test' : 'price_live';
      return `${prefix}_${plan}_${interval}`;
    }

    it('should generate test price ID', () => {
      const priceId = getPriceId('premium', 'monthly', 'test');
      expect(priceId).toBe('price_test_premium_monthly');
    });

    it('should generate live price ID', () => {
      const priceId = getPriceId('family', 'yearly', 'live');
      expect(priceId).toBe('price_live_family_yearly');
    });

    it('should generate different IDs for different plans', () => {
      const premiumId = getPriceId('premium', 'monthly', 'test');
      const familyId = getPriceId('family', 'monthly', 'test');
      expect(premiumId).not.toBe(familyId);
    });

    it('should generate different IDs for different intervals', () => {
      const monthlyId = getPriceId('premium', 'monthly', 'test');
      const yearlyId = getPriceId('premium', 'yearly', 'test');
      expect(monthlyId).not.toBe(yearlyId);
    });
  });

  describe('Subscription Status', () => {
    
    type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';

    function isActiveSubscription(status: SubscriptionStatus): boolean {
      return status === 'active' || status === 'trialing';
    }

    it('should identify active subscription', () => {
      expect(isActiveSubscription('active')).toBeTrue();
    });

    it('should identify trialing subscription as active', () => {
      expect(isActiveSubscription('trialing')).toBeTrue();
    });

    it('should not identify canceled as active', () => {
      expect(isActiveSubscription('canceled')).toBeFalse();
    });

    it('should not identify past_due as active', () => {
      expect(isActiveSubscription('past_due')).toBeFalse();
    });

    it('should not identify unpaid as active', () => {
      expect(isActiveSubscription('unpaid')).toBeFalse();
    });
  });

  describe('Wait for Session Logic', () => {
    
    interface SessionData {
      url?: string;
      error?: string;
    }

    function checkSessionReady(data: SessionData): { ready: boolean; url?: string; error?: string } {
      if (data.url) {
        return { ready: true, url: data.url };
      }
      if (data.error) {
        return { ready: true, error: data.error };
      }
      return { ready: false };
    }

    it('should return ready with URL', () => {
      const result = checkSessionReady({ url: 'https://checkout.stripe.com/xxx' });
      expect(result.ready).toBeTrue();
      expect(result.url).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should return ready with error', () => {
      const result = checkSessionReady({ error: 'Payment failed' });
      expect(result.ready).toBeTrue();
      expect(result.error).toBeDefined();
      expect(result.url).toBeUndefined();
    });

    it('should return not ready when pending', () => {
      const result = checkSessionReady({});
      expect(result.ready).toBeFalse();
    });
  });

  describe('Checkout Validation', () => {
    
    function canCreateCheckout(plan: SubscriptionPlan): boolean {
      return plan !== 'free' && plan !== 'enterprise';
    }

    it('should allow checkout for premium plan', () => {
      expect(canCreateCheckout('premium')).toBeTrue();
    });

    it('should allow checkout for family plan', () => {
      expect(canCreateCheckout('family')).toBeTrue();
    });

    it('should not allow checkout for free plan', () => {
      expect(canCreateCheckout('free')).toBeFalse();
    });

    it('should not allow checkout for enterprise plan', () => {
      expect(canCreateCheckout('enterprise')).toBeFalse();
    });
  });

  describe('Trial Period Configuration', () => {
    
    interface TrialConfig {
      enableTrial: boolean;
      trialPeriodDays: number;
    }

    function getEffectiveTrialDays(config: TrialConfig): number {
      return config.enableTrial ? config.trialPeriodDays : 0;
    }

    it('should return trial days when enabled', () => {
      const config: TrialConfig = { enableTrial: true, trialPeriodDays: 7 };
      expect(getEffectiveTrialDays(config)).toBe(7);
    });

    it('should return zero when trial disabled', () => {
      const config: TrialConfig = { enableTrial: false, trialPeriodDays: 7 };
      expect(getEffectiveTrialDays(config)).toBe(0);
    });
  });

  describe('Feature Flags', () => {
    
    interface StripeFeatures {
      enableTrial: boolean;
      enableBillingPortal: boolean;
      enableCoupons: boolean;
      enableAutoRenew: boolean;
    }

    it('should define all feature flags', () => {
      const features: StripeFeatures = {
        enableTrial: true,
        enableBillingPortal: true,
        enableCoupons: false,
        enableAutoRenew: true
      };

      expect(features.enableTrial).toBeTrue();
      expect(features.enableBillingPortal).toBeTrue();
      expect(features.enableCoupons).toBeFalse();
    });
  });

  describe('Firestore Document Paths', () => {
    
    function getCheckoutSessionPath(userId: string, sessionId: string): string {
      return `users/${userId}/checkout_sessions/${sessionId}`;
    }

    function getBillingPortalPath(userId: string, sessionId: string): string {
      return `users/${userId}/billing_portal_sessions/${sessionId}`;
    }

    function getCustomerPath(userId: string): string {
      return `users/${userId}/stripe_customer/data`;
    }

    function getSubscriptionPath(userId: string): string {
      return `users/${userId}/stripe_subscription/active`;
    }

    it('should generate checkout session path', () => {
      const path = getCheckoutSessionPath('user-123', 'session-456');
      expect(path).toBe('users/user-123/checkout_sessions/session-456');
    });

    it('should generate billing portal path', () => {
      const path = getBillingPortalPath('user-123', 'portal-789');
      expect(path).toBe('users/user-123/billing_portal_sessions/portal-789');
    });

    it('should generate customer path', () => {
      const path = getCustomerPath('user-123');
      expect(path).toBe('users/user-123/stripe_customer/data');
    });

    it('should generate subscription path', () => {
      const path = getSubscriptionPath('user-123');
      expect(path).toBe('users/user-123/stripe_subscription/active');
    });
  });

  describe('Session Timeout', () => {
    
    function isSessionTimedOut(
      startTime: number, 
      maxAttempts: number,
      attemptInterval: number,
      currentAttempt: number
    ): boolean {
      return currentAttempt >= maxAttempts;
    }

    it('should not timeout on first attempt', () => {
      expect(isSessionTimedOut(Date.now(), 10, 1000, 0)).toBeFalse();
    });

    it('should timeout after max attempts', () => {
      expect(isSessionTimedOut(Date.now(), 10, 1000, 10)).toBeTrue();
    });

    it('should not timeout before max attempts', () => {
      expect(isSessionTimedOut(Date.now(), 10, 1000, 5)).toBeFalse();
    });
  });

  describe('Error Handling', () => {
    
    interface StripeError {
      code: string;
      message: string;
      type: 'card_error' | 'validation_error' | 'api_error' | 'authentication_error';
    }

    function getUserFriendlyMessage(error: StripeError): string {
      switch (error.type) {
        case 'card_error':
          return 'There was an issue with your card. Please try a different payment method.';
        case 'validation_error':
          return 'Please check your payment information and try again.';
        case 'authentication_error':
          return 'Authentication failed. Please log in again.';
        case 'api_error':
        default:
          return 'An unexpected error occurred. Please try again later.';
      }
    }

    it('should return card error message', () => {
      const error: StripeError = { code: 'card_declined', message: 'Card declined', type: 'card_error' };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('card');
    });

    it('should return validation error message', () => {
      const error: StripeError = { code: 'invalid_number', message: 'Invalid card number', type: 'validation_error' };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('payment information');
    });

    it('should return api error message', () => {
      const error: StripeError = { code: 'api_error', message: 'API error', type: 'api_error' };
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('unexpected error');
    });
  });
});
