import { Timestamp } from '@angular/fire/firestore';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingInterval,
  PaymentMethod,
  PlanLimits,
  FeatureFlags,
  SubscriptionFeatures,
  BillingInfo,
  UserSubscription,
  DEFAULT_FEATURES,
  PLAN_PRICING
} from './subscription.model';

describe('SubscriptionModel', () => {
  describe('SubscriptionPlan type', () => {
    it('should accept valid plan types', () => {
      const plans: SubscriptionPlan[] = ['free', 'premium', 'family', 'enterprise'];
      
      plans.forEach((plan) => {
        expect(['free', 'premium', 'family', 'enterprise']).toContain(plan);
      });
    });
  });

  describe('SubscriptionStatus type', () => {
    it('should accept valid status types', () => {
      const statuses: SubscriptionStatus[] = [
        'active',
        'trialing',
        'past_due',
        'canceled',
        'incomplete',
        'incomplete_expired'
      ];

      expect(statuses.length).toBe(6);
    });
  });

  describe('BillingInterval type', () => {
    it('should accept monthly and yearly', () => {
      const intervals: BillingInterval[] = ['monthly', 'yearly'];

      expect(intervals.length).toBe(2);
      expect(intervals).toContain('monthly');
      expect(intervals).toContain('yearly');
    });
  });

  describe('PaymentMethod interface', () => {
    it('should create valid payment method', () => {
      const paymentMethod: PaymentMethod = {
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025
      };

      expect(paymentMethod.brand).toBe('visa');
      expect(paymentMethod.last4).toBe('4242');
      expect(paymentMethod.expiryMonth).toBe(12);
      expect(paymentMethod.expiryYear).toBe(2025);
    });

    it('should support different card brands', () => {
      const brands = ['visa', 'mastercard', 'amex', 'discover', 'elo'];

      brands.forEach((brand) => {
        const pm: PaymentMethod = {
          brand,
          last4: '1234',
          expiryMonth: 1,
          expiryYear: 2030
        };
        expect(pm.brand).toBe(brand);
      });
    });

    it('should have valid expiry month range', () => {
      for (let month = 1; month <= 12; month++) {
        const pm: PaymentMethod = {
          brand: 'visa',
          last4: '1234',
          expiryMonth: month,
          expiryYear: 2025
        };
        expect(pm.expiryMonth).toBe(month);
      }
    });
  });

  describe('DEFAULT_FEATURES', () => {
    it('should have features for all plans', () => {
      const plans: SubscriptionPlan[] = ['free', 'premium', 'family', 'enterprise'];
      
      plans.forEach((plan) => {
        expect(DEFAULT_FEATURES[plan]).toBeDefined();
      });
    });

    describe('free plan defaults', () => {
      const free = DEFAULT_FEATURES.free;

      it('should have unlimited medications', () => {
        expect(free.maxMedications).toBe(-1);
      });

      it('should allow 1 dependent', () => {
        expect(free.maxDependents).toBe(1);
      });

      it('should allow 2 caretakers', () => {
        expect(free.maxCaretakers).toBe(2);
      });

      it('should allow 3 reports per month', () => {
        expect(free.reportsPerMonth).toBe(3);
      });

      it('should have 30 days insights history', () => {
        expect(free.insightsHistoryDays).toBe(30);
      });

      it('should have 0 OCR scans', () => {
        expect(free.ocrScansPerMonth).toBe(0);
      });

      it('should have 0 telehealth consults', () => {
        expect(free.telehealthConsultsPerMonth).toBe(0);
      });

      it('should have 50MB storage', () => {
        expect(free.maxStorageMB).toBe(50);
      });

      it('should not have premium features', () => {
        expect(free.hasAdvancedInsights).toBe(false);
        expect(free.hasWearableIntegration).toBe(false);
        expect(free.hasPushNotifications).toBe(false);
        expect(free.hasChat).toBe(false);
        expect(free.hasFamilyDashboard).toBe(false);
        expect(free.hasScheduledReports).toBe(false);
        expect(free.hasInteractionChecker).toBe(false);
        expect(free.hasPrioritySupport).toBe(false);
        expect(free.hasWhiteLabel).toBe(false);
        expect(free.hasSSO).toBe(false);
        expect(free.hasAPIAccess).toBe(false);
      });
    });

    describe('premium plan defaults', () => {
      const premium = DEFAULT_FEATURES.premium;

      it('should have unlimited medications', () => {
        expect(premium.maxMedications).toBe(-1);
      });

      it('should have unlimited dependents', () => {
        expect(premium.maxDependents).toBe(-1);
      });

      it('should have unlimited caretakers', () => {
        expect(premium.maxCaretakers).toBe(-1);
      });

      it('should have unlimited reports', () => {
        expect(premium.reportsPerMonth).toBe(-1);
      });

      it('should have unlimited insights history', () => {
        expect(premium.insightsHistoryDays).toBe(-1);
      });

      it('should have 20 OCR scans per month', () => {
        expect(premium.ocrScansPerMonth).toBe(20);
      });

      it('should have 1 telehealth consult per month', () => {
        expect(premium.telehealthConsultsPerMonth).toBe(1);
      });

      it('should have 500MB storage', () => {
        expect(premium.maxStorageMB).toBe(500);
      });

      it('should have premium features enabled', () => {
        expect(premium.hasAdvancedInsights).toBe(true);
        expect(premium.hasWearableIntegration).toBe(true);
        expect(premium.hasPushNotifications).toBe(true);
        expect(premium.hasScheduledReports).toBe(true);
        expect(premium.hasInteractionChecker).toBe(true);
        expect(premium.hasPrioritySupport).toBe(true);
      });

      it('should not have family features', () => {
        expect(premium.hasChat).toBe(false);
        expect(premium.hasFamilyDashboard).toBe(false);
      });

      it('should not have enterprise features', () => {
        expect(premium.hasWhiteLabel).toBe(false);
        expect(premium.hasSSO).toBe(false);
        expect(premium.hasAPIAccess).toBe(false);
      });
    });

    describe('family plan defaults', () => {
      const family = DEFAULT_FEATURES.family;

      it('should have all premium features', () => {
        expect(family.hasAdvancedInsights).toBe(true);
        expect(family.hasWearableIntegration).toBe(true);
        expect(family.hasPushNotifications).toBe(true);
        expect(family.hasScheduledReports).toBe(true);
        expect(family.hasInteractionChecker).toBe(true);
        expect(family.hasPrioritySupport).toBe(true);
      });

      it('should have family-specific features', () => {
        expect(family.hasChat).toBe(true);
        expect(family.hasFamilyDashboard).toBe(true);
      });

      it('should have unlimited OCR scans', () => {
        expect(family.ocrScansPerMonth).toBe(-1);
      });

      it('should have 3 telehealth consults per month', () => {
        expect(family.telehealthConsultsPerMonth).toBe(3);
      });

      it('should have 2GB storage', () => {
        expect(family.maxStorageMB).toBe(2000);
      });

      it('should not have enterprise features', () => {
        expect(family.hasWhiteLabel).toBe(false);
        expect(family.hasSSO).toBe(false);
        expect(family.hasAPIAccess).toBe(false);
      });
    });

    describe('enterprise plan defaults', () => {
      const enterprise = DEFAULT_FEATURES.enterprise;

      it('should have all unlimited limits', () => {
        expect(enterprise.maxMedications).toBe(-1);
        expect(enterprise.maxDependents).toBe(-1);
        expect(enterprise.maxCaretakers).toBe(-1);
        expect(enterprise.reportsPerMonth).toBe(-1);
        expect(enterprise.insightsHistoryDays).toBe(-1);
        expect(enterprise.ocrScansPerMonth).toBe(-1);
        expect(enterprise.telehealthConsultsPerMonth).toBe(-1);
        expect(enterprise.maxStorageMB).toBe(-1);
      });

      it('should have all feature flags enabled', () => {
        expect(enterprise.hasAdvancedInsights).toBe(true);
        expect(enterprise.hasWearableIntegration).toBe(true);
        expect(enterprise.hasPushNotifications).toBe(true);
        expect(enterprise.hasChat).toBe(true);
        expect(enterprise.hasFamilyDashboard).toBe(true);
        expect(enterprise.hasScheduledReports).toBe(true);
        expect(enterprise.hasInteractionChecker).toBe(true);
        expect(enterprise.hasPrioritySupport).toBe(true);
        expect(enterprise.hasWhiteLabel).toBe(true);
        expect(enterprise.hasSSO).toBe(true);
        expect(enterprise.hasAPIAccess).toBe(true);
      });
    });

    describe('plan feature progression', () => {
      it('should have increasing storage limits', () => {
        expect(DEFAULT_FEATURES.free.maxStorageMB).toBeLessThan(
          DEFAULT_FEATURES.premium.maxStorageMB
        );
        expect(DEFAULT_FEATURES.premium.maxStorageMB).toBeLessThan(
          DEFAULT_FEATURES.family.maxStorageMB
        );
      });

      it('should have increasing OCR scans', () => {
        expect(DEFAULT_FEATURES.free.ocrScansPerMonth).toBe(0);
        expect(DEFAULT_FEATURES.premium.ocrScansPerMonth).toBeGreaterThan(0);
        expect(DEFAULT_FEATURES.family.ocrScansPerMonth).toBe(-1); // Unlimited
      });

      it('should have increasing telehealth consults', () => {
        expect(DEFAULT_FEATURES.free.telehealthConsultsPerMonth).toBe(0);
        expect(DEFAULT_FEATURES.premium.telehealthConsultsPerMonth).toBe(1);
        expect(DEFAULT_FEATURES.family.telehealthConsultsPerMonth).toBe(3);
        expect(DEFAULT_FEATURES.enterprise.telehealthConsultsPerMonth).toBe(-1);
      });
    });
  });

  describe('PLAN_PRICING', () => {
    describe('premium pricing', () => {
      it('should have monthly BRL pricing', () => {
        expect(PLAN_PRICING.premium.monthly.BRL).toBe(1490);
      });

      it('should have monthly USD pricing', () => {
        expect(PLAN_PRICING.premium.monthly.USD).toBe(399);
      });

      it('should have yearly BRL pricing', () => {
        expect(PLAN_PRICING.premium.yearly.BRL).toBe(14900);
      });

      it('should have yearly USD pricing', () => {
        expect(PLAN_PRICING.premium.yearly.USD).toBe(3999);
      });

      it('should have yearly discount (10 months for price of 12)', () => {
        const monthlyBRL = PLAN_PRICING.premium.monthly.BRL;
        const yearlyBRL = PLAN_PRICING.premium.yearly.BRL;
        
        // Yearly should be 10x monthly (2 months free)
        expect(yearlyBRL).toBe(monthlyBRL * 10);
      });
    });

    describe('family pricing', () => {
      it('should have monthly BRL pricing', () => {
        expect(PLAN_PRICING.family.monthly.BRL).toBe(2990);
      });

      it('should have monthly USD pricing', () => {
        expect(PLAN_PRICING.family.monthly.USD).toBe(799);
      });

      it('should have yearly BRL pricing', () => {
        expect(PLAN_PRICING.family.yearly.BRL).toBe(29900);
      });

      it('should have yearly USD pricing', () => {
        expect(PLAN_PRICING.family.yearly.USD).toBe(7999);
      });

      it('should have yearly discount (10 months for price of 12)', () => {
        const monthlyBRL = PLAN_PRICING.family.monthly.BRL;
        const yearlyBRL = PLAN_PRICING.family.yearly.BRL;
        
        // Yearly should be 10x monthly (2 months free)
        expect(yearlyBRL).toBe(monthlyBRL * 10);
      });

      it('should be more expensive than premium', () => {
        expect(PLAN_PRICING.family.monthly.BRL).toBeGreaterThan(
          PLAN_PRICING.premium.monthly.BRL
        );
        expect(PLAN_PRICING.family.yearly.BRL).toBeGreaterThan(
          PLAN_PRICING.premium.yearly.BRL
        );
      });
    });

    describe('enterprise pricing', () => {
      it('should have monthly BRL pricing', () => {
        expect(PLAN_PRICING.enterprise.monthly.BRL).toBeDefined();
        expect(PLAN_PRICING.enterprise.monthly.BRL).toBeGreaterThan(0);
      });

      it('should have yearly BRL pricing', () => {
        expect(PLAN_PRICING.enterprise.yearly.BRL).toBeDefined();
        expect(PLAN_PRICING.enterprise.yearly.BRL).toBeGreaterThan(0);
      });

      it('should be more expensive than family', () => {
        expect(PLAN_PRICING.enterprise.monthly.BRL).toBeGreaterThan(
          PLAN_PRICING.family.monthly.BRL
        );
        expect(PLAN_PRICING.enterprise.yearly.BRL).toBeGreaterThan(
          PLAN_PRICING.family.yearly.BRL
        );
      });
    });

    describe('currency consistency', () => {
      it('should have both BRL and USD for all plans', () => {
        const plans = ['premium', 'family', 'enterprise'] as const;
        const intervals = ['monthly', 'yearly'] as const;
        const currencies = ['BRL', 'USD'] as const;

        plans.forEach((plan) => {
          intervals.forEach((interval) => {
            currencies.forEach((currency) => {
              expect(PLAN_PRICING[plan][interval][currency]).toBeDefined();
              expect(PLAN_PRICING[plan][interval][currency]).toBeGreaterThan(0);
            });
          });
        });
      });
    });
  });

  describe('UserSubscription interface', () => {
    it('should create valid subscription object', () => {
      const now = Timestamp.now();
      const subscription: UserSubscription = {
        plan: 'premium',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: now,
        cancelAtPeriodEnd: false,
        features: DEFAULT_FEATURES.premium,
        billing: {
          interval: 'monthly',
          amount: 1490,
          currency: 'BRL',
          nextBillingDate: now
        },
        createdAt: now,
        updatedAt: now
      };

      expect(subscription.plan).toBe('premium');
      expect(subscription.status).toBe('active');
      expect(subscription.cancelAtPeriodEnd).toBe(false);
    });

    it('should support trial subscription', () => {
      const now = Timestamp.now();
      const subscription: UserSubscription = {
        plan: 'premium',
        status: 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: now,
        trialEnd: now,
        cancelAtPeriodEnd: false,
        features: DEFAULT_FEATURES.premium,
        billing: {
          interval: 'monthly',
          amount: 1490,
          currency: 'BRL',
          nextBillingDate: now
        },
        createdAt: now,
        updatedAt: now
      };

      expect(subscription.status).toBe('trialing');
      expect(subscription.trialEnd).toBeDefined();
    });

    it('should support Stripe integration', () => {
      const now = Timestamp.now();
      const subscription: UserSubscription = {
        plan: 'premium',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: now,
        cancelAtPeriodEnd: false,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_456',
        paymentMethod: {
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2025
        },
        features: DEFAULT_FEATURES.premium,
        billing: {
          interval: 'monthly',
          amount: 1490,
          currency: 'BRL',
          nextBillingDate: now
        },
        createdAt: now,
        updatedAt: now
      };

      expect(subscription.stripeCustomerId).toBe('cus_123');
      expect(subscription.stripeSubscriptionId).toBe('sub_456');
      expect(subscription.paymentMethod?.brand).toBe('visa');
    });

    it('should support PagSeguro integration', () => {
      const now = Timestamp.now();
      const subscription: UserSubscription = {
        plan: 'premium',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: now,
        cancelAtPeriodEnd: false,
        pagseguroCustomerId: 'CUST_123',
        pagseguroSubscriptionId: 'SUBS_456',
        features: DEFAULT_FEATURES.premium,
        billing: {
          interval: 'monthly',
          amount: 1490,
          currency: 'BRL',
          nextBillingDate: now
        },
        createdAt: now,
        updatedAt: now
      };

      expect(subscription.pagseguroCustomerId).toBe('CUST_123');
      expect(subscription.pagseguroSubscriptionId).toBe('SUBS_456');
    });

    it('should support usage tracking', () => {
      const now = Timestamp.now();
      const subscription: UserSubscription = {
        plan: 'premium',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: now,
        cancelAtPeriodEnd: false,
        features: DEFAULT_FEATURES.premium,
        billing: {
          interval: 'monthly',
          amount: 1490,
          currency: 'BRL',
          nextBillingDate: now
        },
        usage: {
          reportsThisMonth: 5,
          ocrScansThisMonth: 10,
          telehealthConsultsThisMonth: 1,
          lastResetDate: now
        },
        createdAt: now,
        updatedAt: now
      };

      expect(subscription.usage?.reportsThisMonth).toBe(5);
      expect(subscription.usage?.ocrScansThisMonth).toBe(10);
      expect(subscription.usage?.telehealthConsultsThisMonth).toBe(1);
    });

    it('should support canceled subscription', () => {
      const now = Timestamp.now();
      const subscription: UserSubscription = {
        plan: 'premium',
        status: 'canceled',
        currentPeriodStart: now,
        currentPeriodEnd: now,
        canceledAt: now,
        cancelAtPeriodEnd: true,
        features: DEFAULT_FEATURES.premium,
        billing: {
          interval: 'monthly',
          amount: 1490,
          currency: 'BRL',
          nextBillingDate: now
        },
        createdAt: now,
        updatedAt: now
      };

      expect(subscription.status).toBe('canceled');
      expect(subscription.canceledAt).toBeDefined();
      expect(subscription.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('BillingInfo interface', () => {
    it('should create valid monthly billing', () => {
      const billing: BillingInfo = {
        interval: 'monthly',
        amount: 1490,
        currency: 'BRL',
        nextBillingDate: Timestamp.now()
      };

      expect(billing.interval).toBe('monthly');
      expect(billing.amount).toBe(1490);
      expect(billing.currency).toBe('BRL');
    });

    it('should create valid yearly billing', () => {
      const billing: BillingInfo = {
        interval: 'yearly',
        amount: 14900,
        currency: 'BRL',
        nextBillingDate: Timestamp.now()
      };

      expect(billing.interval).toBe('yearly');
      expect(billing.amount).toBe(14900);
    });

    it('should support USD currency', () => {
      const billing: BillingInfo = {
        interval: 'monthly',
        amount: 399,
        currency: 'USD',
        nextBillingDate: Timestamp.now()
      };

      expect(billing.currency).toBe('USD');
      expect(billing.amount).toBe(399);
    });
  });

  describe('PlanLimits interface', () => {
    it('should have all required properties', () => {
      const limits: PlanLimits = {
        maxMedications: 10,
        maxDependents: 2,
        maxCaretakers: 3,
        reportsPerMonth: 5,
        ocrScansPerMonth: 10,
        telehealthConsultsPerMonth: 2,
        insightsHistoryDays: 90,
        maxStorageMB: 200
      };

      expect(limits.maxMedications).toBe(10);
      expect(limits.maxDependents).toBe(2);
      expect(limits.maxCaretakers).toBe(3);
      expect(limits.reportsPerMonth).toBe(5);
      expect(limits.ocrScansPerMonth).toBe(10);
      expect(limits.telehealthConsultsPerMonth).toBe(2);
      expect(limits.insightsHistoryDays).toBe(90);
      expect(limits.maxStorageMB).toBe(200);
    });

    it('should support unlimited values (-1)', () => {
      const limits: PlanLimits = {
        maxMedications: -1,
        maxDependents: -1,
        maxCaretakers: -1,
        reportsPerMonth: -1,
        ocrScansPerMonth: -1,
        telehealthConsultsPerMonth: -1,
        insightsHistoryDays: -1,
        maxStorageMB: -1
      };

      Object.values(limits).forEach((value) => {
        expect(value).toBe(-1);
      });
    });
  });

  describe('FeatureFlags interface', () => {
    it('should have all boolean flags', () => {
      const flags: FeatureFlags = {
        hasAdvancedInsights: true,
        hasWearableIntegration: true,
        hasPushNotifications: true,
        hasChat: true,
        hasFamilyDashboard: true,
        hasScheduledReports: true,
        hasInteractionChecker: true,
        hasPrioritySupport: true,
        hasWhiteLabel: true,
        hasSSO: true,
        hasAPIAccess: true
      };

      Object.values(flags).forEach((value) => {
        expect(typeof value).toBe('boolean');
      });
    });

    it('should allow mixed true/false values', () => {
      const flags: FeatureFlags = {
        hasAdvancedInsights: true,
        hasWearableIntegration: false,
        hasPushNotifications: true,
        hasChat: false,
        hasFamilyDashboard: false,
        hasScheduledReports: true,
        hasInteractionChecker: true,
        hasPrioritySupport: false,
        hasWhiteLabel: false,
        hasSSO: false,
        hasAPIAccess: false
      };

      expect(flags.hasAdvancedInsights).toBe(true);
      expect(flags.hasWearableIntegration).toBe(false);
    });
  });
});
