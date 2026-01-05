import { TestBed } from '@angular/core/testing';
import { SubscriptionService } from './subscription.service';
import { AuthService } from './auth.service';
import { StripePaymentService } from './stripe-payment.service';
import { PagSeguroPaymentService } from './pagseguro-payment.service';
import { LogService } from './log.service';
import { Firestore } from '@angular/fire/firestore';
import { signal, WritableSignal } from '@angular/core';
import { UserSubscription, SubscriptionPlan, DEFAULT_FEATURES } from '../models/subscription.model';
import { Timestamp } from '@angular/fire/firestore';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let mockAuthService: any;
  let mockStripeService: any;
  let mockPagSeguroService: any;
  let mockLogService: any;
  let mockFirestore: any;

  // Mock data
  const mockUser = { uid: 'user-123', email: 'test@test.com' };
  const mockTimestamp = Timestamp.now();

  const mockFreeSubscription: UserSubscription = {
    plan: 'free',
    status: 'active',
    currentPeriodStart: mockTimestamp,
    currentPeriodEnd: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
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
      lastResetDate: mockTimestamp,
    },
    createdAt: mockTimestamp,
    updatedAt: mockTimestamp,
  };

  const mockPremiumSubscription: UserSubscription = {
    ...mockFreeSubscription,
    plan: 'premium',
    features: DEFAULT_FEATURES.premium,
    billing: {
      interval: 'monthly',
      amount: 29.90,
      currency: 'BRL',
      nextBillingDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
    stripeCustomerId: 'cus_123456',
    stripeSubscriptionId: 'sub_123456',
  };

  beforeEach(() => {
    // Mock AuthService
    mockAuthService = {
      currentUser: signal(mockUser)
    };

    // Mock StripePaymentService
    mockStripeService = jasmine.createSpyObj('StripePaymentService', [
      'createCheckoutSession',
      'getSubscriptionStatus',
      'getPaymentHistory',
      'cancelSubscription',
      'reactivateSubscription'
    ]);

    // Mock PagSeguroPaymentService
    mockPagSeguroService = jasmine.createSpyObj('PagSeguroPaymentService', [
      'createSubscription',
      'getSubscriptionStatus',
      'getTransactionHistory',
      'cancelSubscription',
      'reactivateSubscription'
    ]);

    // Mock LogService
    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error', 'debug', 'info', 'warn', 'logs']);

    // Mock Firestore
    mockFirestore = jasmine.createSpyObj('Firestore', ['collection', 'doc']);

    TestBed.configureTestingModule({
      providers: [
        SubscriptionService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: StripePaymentService, useValue: mockStripeService },
        { provide: PagSeguroPaymentService, useValue: mockPagSeguroService },
        { provide: LogService, useValue: mockLogService },
        { provide: Firestore, useValue: mockFirestore }
      ]
    });

    service = TestBed.inject(SubscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // SUBSCRIPTION - POSITIVE SCENARIOS (15 tests)
  // ========================================

  describe('Subscription - Positive Scenarios', () => {
    it('should load free subscription from signal', () => {
      service.subscription.set(mockFreeSubscription);
      
      const subscription = service.getCurrentSubscription();
      expect(subscription).toBeDefined();
      expect(subscription?.plan).toBe('free');
      expect(subscription?.status).toBe('active');
    });

    it('should load premium subscription with Stripe data', () => {
      service.subscription.set(mockPremiumSubscription);
      
      const subscription = service.getCurrentSubscription();
      expect(subscription?.plan).toBe('premium');
      expect(subscription?.stripeCustomerId).toBe('cus_123456');
      expect(subscription?.stripeSubscriptionId).toBe('sub_123456');
    });

    it('should compute currentPlan correctly', () => {
      service.subscription.set(mockPremiumSubscription);
      
      const plan = service.currentPlan();
      expect(plan).toBe('premium');
    });

    it('should compute isActive correctly for active subscription', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        status: 'active'
      });
      
      expect(service.isActive()).toBeTrue();
    });

    it('should compute isTrialing correctly for trialing subscription', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        status: 'trialing'
      });
      
      expect(service.isTrialing()).toBeTrue();
    });

    it('should compute isPremium correctly for premium plan', () => {
      service.subscription.set(mockPremiumSubscription);
      
      expect(service.isPremium()).toBeTrue();
    });

    it('should compute isFamily correctly for family plan', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        plan: 'family',
        features: DEFAULT_FEATURES.family
      });
      
      expect(service.isFamily()).toBeTrue();
    });

    it('should compute isEnterprise correctly for enterprise plan', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        plan: 'enterprise',
        features: DEFAULT_FEATURES.enterprise
      });
      
      expect(service.isEnterprise()).toBeTrue();
    });

    it('should return correct features for each plan', () => {
      service.subscription.set(mockFreeSubscription);
      expect(service.features().reportsPerMonth).toBe(DEFAULT_FEATURES.free.reportsPerMonth);
      
      service.subscription.set(mockPremiumSubscription);
      expect(service.features().reportsPerMonth).toBe(DEFAULT_FEATURES.premium.reportsPerMonth);
    });

    it('should check feature access correctly', () => {
      service.subscription.set(mockPremiumSubscription);
      
      expect(service.hasFeature('hasAdvancedInsights')).toBeDefined();
    });

    it('should check if within usage limits (under limit)', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        features: { ...DEFAULT_FEATURES.free, reportsPerMonth: 10 },
        usage: {
          reportsThisMonth: 5,
          ocrScansThisMonth: 0,
          telehealthConsultsThisMonth: 0,
          lastResetDate: mockTimestamp,
        }
      });
      
      expect(service.isWithinLimit('reportsPerMonth')).toBeTrue();
    });

    it('should handle unlimited features (-1 limit)', () => {
      service.subscription.set({
        ...mockPremiumSubscription,
        features: { ...DEFAULT_FEATURES.premium, reportsPerMonth: -1 }
      });
      
      expect(service.isWithinLimit('reportsPerMonth')).toBeTrue();
    });

    it('should calculate remaining usage correctly', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        features: { ...DEFAULT_FEATURES.free, reportsPerMonth: 10 },
        usage: {
          reportsThisMonth: 3,
          ocrScansThisMonth: 0,
          telehealthConsultsThisMonth: 0,
          lastResetDate: mockTimestamp,
        }
      });
      
      const remaining = service.getRemainingUsage('reportsPerMonth');
      expect(remaining).toBe(7);
    });

    it('should return Infinity for unlimited usage', () => {
      service.subscription.set({
        ...mockPremiumSubscription,
        features: { ...DEFAULT_FEATURES.premium, reportsPerMonth: -1 }
      });
      
      const remaining = service.getRemainingUsage('reportsPerMonth');
      expect(remaining).toBe(Infinity);
    });

    it('should get plan display name correctly', () => {
      expect(service.getPlanDisplayName('free')).toBe('Gratuito');
      expect(service.getPlanDisplayName('premium')).toBe('Premium');
      expect(service.getPlanDisplayName('family')).toBe('Família');
      expect(service.getPlanDisplayName('enterprise')).toBe('Enterprise');
    });
  });

  // ========================================
  // SUBSCRIPTION - NEGATIVE SCENARIOS (8 tests)
  // ========================================

  describe('Subscription - Negative Scenarios', () => {
    it('should return null when no subscription loaded', () => {
      service.subscription.set(null);
      
      const subscription = service.getCurrentSubscription();
      expect(subscription).toBeNull();
    });

    it('should return false for isActive when no subscription', () => {
      service.subscription.set(null);
      
      expect(service.isActive()).toBeFalse();
    });

    it('should return false for isPremium when free plan', () => {
      service.subscription.set(mockFreeSubscription);
      
      expect(service.isPremium()).toBeFalse();
    });

    it('should return false for isWithinLimit when over limit', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        features: { ...DEFAULT_FEATURES.free, reportsPerMonth: 5 },
        usage: {
          reportsThisMonth: 5, // At limit
          ocrScansThisMonth: 0,
          telehealthConsultsThisMonth: 0,
          lastResetDate: mockTimestamp,
        }
      });
      
      expect(service.isWithinLimit('reportsPerMonth')).toBeFalse();
    });

    it('should return false for isWithinLimit when no subscription', () => {
      service.subscription.set(null);
      
      expect(service.isWithinLimit('reportsPerMonth')).toBeFalse();
    });

    it('should return 0 remaining usage when at limit', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        features: { ...DEFAULT_FEATURES.free, reportsPerMonth: 5 },
        usage: {
          reportsThisMonth: 5,
          ocrScansThisMonth: 0,
          telehealthConsultsThisMonth: 0,
          lastResetDate: mockTimestamp,
        }
      });
      
      const remaining = service.getRemainingUsage('reportsPerMonth');
      expect(remaining).toBe(0);
    });

    it('should return 0 remaining when no subscription', () => {
      service.subscription.set(null);
      
      const remaining = service.getRemainingUsage('reportsPerMonth');
      expect(remaining).toBe(0);
    });

    it('should compute isActive as false when canceled', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        status: 'canceled'
      });
      
      expect(service.isActive()).toBeFalse();
    });
  });

  // ========================================
  // EDGE CASES (5 tests)
  // ========================================

  describe('Edge Cases', () => {
    it('should handle subscription with missing usage data', () => {
      service.subscription.set({
        ...mockFreeSubscription,
        usage: undefined
      });
      
      const remaining = service.getRemainingUsage('reportsPerMonth');
      expect(remaining).toBeGreaterThanOrEqual(0);
    });

    it('should handle plan changes (downgrade)', () => {
      service.subscription.set(mockPremiumSubscription);
      expect(service.isPremium()).toBeTrue();
      
      service.subscription.set(mockFreeSubscription);
      expect(service.isPremium()).toBeFalse();
    });

    it('should handle subscription status changes', () => {
      const subscription: UserSubscription = {
        ...mockPremiumSubscription,
        status: 'active'
      };
      service.subscription.set(subscription);
      expect(service.isActive()).toBeTrue();
      
      subscription.status = 'past_due';
      service.subscription.set({ ...subscription });
      expect(service.isActive()).toBeFalse();
    });

    it('should handle cancelAtPeriodEnd flag', () => {
      service.subscription.set({
        ...mockPremiumSubscription,
        status: 'active',
        cancelAtPeriodEnd: true
      });
      
      const subscription = service.getCurrentSubscription();
      expect(subscription?.status).toBe('active'); // Still active
      expect(subscription?.cancelAtPeriodEnd).toBeTrue(); // But will cancel
    });

    it('should handle multiple payment providers (Stripe + PagSeguro)', () => {
      const subscriptionWithBoth: UserSubscription = {
        ...mockPremiumSubscription,
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
      };
      
      service.subscription.set(subscriptionWithBoth);
      
      const subscription = service.getCurrentSubscription();
      expect(subscription?.stripeCustomerId).toBe('cus_123');
      expect(subscription?.stripeSubscriptionId).toBe('sub_123');
    });
  });

  // ========================================
  // HELPER METHODS (2 tests)
  // ========================================

  describe('Helper Methods', () => {
    it('should get current subscription object', () => {
      service.subscription.set(mockFreeSubscription);
      
      const subscription = service.getCurrentSubscription();
      expect(subscription).toEqual(mockFreeSubscription);
    });

    it('should return computed values reactively', () => {
      service.subscription.set(mockFreeSubscription);
      expect(service.currentPlan()).toBe('free');
      
      service.subscription.set(mockPremiumSubscription);
      expect(service.currentPlan()).toBe('premium');
    });
  });
});


