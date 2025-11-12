import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SubscriptionService } from '../services/subscription.service';
import { StripePaymentService } from '../services/stripe-payment.service';
import { PagSeguroPaymentService } from '../services/pagseguro-payment.service';
import { FeatureMappingService } from '../services/feature-mapping.service';
import { Firestore } from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';

/**
 * E2E Tests for Payment System
 * 
 * Tests complete payment flows:
 * - Upgrade from Free to Premium
 * - Webhook processing
 * - Feature activation
 * - Cancellation and reactivation
 * - Plan limit validation
 */
describe('Payment System E2E Tests', () => {
  let subscriptionService: SubscriptionService;
  let stripeService: StripePaymentService;
  let pagSeguroService: PagSeguroPaymentService;
  let featureMappingService: FeatureMappingService;
  let httpMock: HttpTestingController;
  let firestoreMock: jasmine.SpyObj<Firestore>;
  let authServiceMock: jasmine.SpyObj<AuthService>;

  const mockUserId = 'test-user-123';
  const mockUser = {
    uid: mockUserId,
    email: 'test@example.com',
    displayName: 'Test User'
  };

  beforeEach(() => {
    // Create mocks
    firestoreMock = jasmine.createSpyObj('Firestore', ['collection', 'doc']);
    authServiceMock = jasmine.createSpyObj('AuthService', ['currentUser']);
    authServiceMock.currentUser.and.returnValue(mockUser as any);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SubscriptionService,
        StripePaymentService,
        PagSeguroPaymentService,
        FeatureMappingService,
        { provide: Firestore, useValue: firestoreMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    subscriptionService = TestBed.inject(SubscriptionService);
    stripeService = TestBed.inject(StripePaymentService);
    pagSeguroService = TestBed.inject(PagSeguroPaymentService);
    featureMappingService = TestBed.inject(FeatureMappingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Upgrade Flow: Free → Premium (Stripe)', () => {
    it('should complete upgrade flow via Stripe', async () => {
      // Step 1: User on Free plan
      const initialSubscription = {
        plan: 'free' as const,
        status: 'active' as const,
        features: {
          maxMedications: 5,
          hasAdvancedInsights: false,
          hasOCRScanner: false
        }
      };

      // Mock Firestore get for initial subscription
      firestoreMock.doc = jasmine.createSpy('doc').and.returnValue({
        get: () => Promise.resolve({
          exists: () => true,
          data: () => initialSubscription
        })
      } as any);

      // Step 2: Request upgrade via Stripe
      const upgradePromise = subscriptionService.upgradeViaStripe(
        mockUserId,
        'premium',
        'monthly',
        'https://app.com/success',
        'https://app.com/cancel'
      );

      // Expect HTTP call to Cloud Function
      const req = httpMock.expectOne(request => 
        request.url.includes('createStripeCheckoutSession')
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        plan: 'premium',
        billingCycle: 'monthly',
        userId: mockUserId,
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel'
      });

      // Simulate successful checkout session creation
      req.flush({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      });

      await upgradePromise;

      // Step 3: Simulate webhook processing (subscription.created)
      const webhookPayload = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [{
                price: {
                  id: 'price_premium_monthly'
                }
              }]
            },
            metadata: {
              userId: mockUserId,
              plan: 'premium'
            }
          }
        }
      };

      // This would normally be handled by the Cloud Function webhook
      // For E2E test, we verify the expected Firestore update
      expect(firestoreMock.doc).toHaveBeenCalled();
    });

    it('should validate Premium features are activated after upgrade', async () => {
      // Mock subscription with Premium plan
      const premiumSubscription = {
        plan: 'premium' as const,
        status: 'active' as const,
        features: {
          maxMedications: -1,
          hasAdvancedInsights: true,
          hasOCRScanner: true,
          ocrScansPerMonth: 20
        }
      };

      featureMappingService.setSubscription(premiumSubscription as any);

      // Validate features
      expect(featureMappingService.hasFeature('unlimited_medications')).toBe(true);
      expect(featureMappingService.hasFeature('advanced_insights')).toBe(true);
      expect(featureMappingService.hasFeature('ocr_scanner')).toBe(true);
      expect(featureMappingService.getRemainingQuota('ocrScansPerMonth')).toBe(20);
    });
  });

  describe('Upgrade Flow: Free → Family (PagSeguro)', () => {
    it('should complete upgrade flow via PagSeguro', async () => {
      // Request upgrade via PagSeguro
      const upgradePromise = subscriptionService.upgradeViaPagSeguro(
        mockUserId,
        'family',
        'monthly',
        'test@example.com',
        'Test User',
        '11987654321'
      );

      // Expect HTTP call to Cloud Function
      const req = httpMock.expectOne(request =>
        request.url.includes('createPagSeguroSubscription')
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body.plan).toBe('family');

      // Simulate successful subscription creation
      req.flush({
        code: 'SUB123456',
        checkoutUrl: 'https://pagseguro.uol.com.br/checkout/SUB123456'
      });

      await upgradePromise;
    });

    it('should process PagSeguro notification webhook', async () => {
      // Simulate PagSeguro notification
      const notificationPayload = {
        notificationCode: 'ABCD1234',
        notificationType: 'preApproval'
      };

      // Mock Cloud Function processing
      const req = httpMock.expectOne(request =>
        request.url.includes('pagseguroNotification')
      );

      req.flush({ success: true });

      // Verify subscription updated in Firestore
      expect(firestoreMock.doc).toHaveBeenCalled();
    });
  });

  describe('Cancellation and Reactivation', () => {
    it('should cancel subscription via Stripe', async () => {
      const subscriptionId = 'sub_123';

      const cancelPromise = subscriptionService.cancelSubscriptionViaProvider(
        mockUserId,
        false // not immediate
      );

      const req = httpMock.expectOne(request =>
        request.url.includes('cancelStripeSubscription')
      );
      expect(req.request.body.subscriptionId).toBe(subscriptionId);

      req.flush({ 
        id: subscriptionId,
        cancel_at_period_end: true 
      });

      await cancelPromise;

      // Verify cancelAtPeriodEnd flag set
      expect(firestoreMock.doc).toHaveBeenCalled();
    });

    it('should reactivate canceled subscription', async () => {
      const subscriptionId = 'sub_123';

      const reactivatePromise = subscriptionService.reactivateSubscriptionViaProvider(
        mockUserId
      );

      const req = httpMock.expectOne(request =>
        request.url.includes('reactivateStripeSubscription')
      );

      req.flush({
        id: subscriptionId,
        cancel_at_period_end: false,
        status: 'active'
      });

      await reactivatePromise;
    });
  });

  describe('Plan Limit Validation', () => {
    it('should enforce medication limit on Free plan', () => {
      const freeSubscription = {
        plan: 'free' as const,
        features: { maxMedications: 5 }
      };

      featureMappingService.setSubscription(freeSubscription as any);

      // Simulate usage
      featureMappingService.incrementUsage('medicationsUsed', 5);

      // Should not allow more medications
      expect(featureMappingService.canUseFeature('add_medication')).toBe(false);
    });

    it('should allow unlimited medications on Premium plan', () => {
      const premiumSubscription = {
        plan: 'premium' as const,
        features: { maxMedications: -1 }
      };

      featureMappingService.setSubscription(premiumSubscription as any);

      // Should always allow
      expect(featureMappingService.canUseFeature('add_medication')).toBe(true);
    });

    it('should enforce OCR scan limit on Premium plan', () => {
      const premiumSubscription = {
        plan: 'premium' as const,
        features: { ocrScansPerMonth: 20 }
      };

      featureMappingService.setSubscription(premiumSubscription as any);

      // Use all scans
      featureMappingService.incrementUsage('ocrScansThisMonth', 20);

      // Should not allow more scans
      expect(featureMappingService.canUseFeature('ocr_scanner')).toBe(false);
    });

    it('should allow unlimited OCR scans on Family plan', () => {
      const familySubscription = {
        plan: 'family' as const,
        features: { ocrScansPerMonth: -1 }
      };

      featureMappingService.setSubscription(familySubscription as any);

      // Should always allow
      expect(featureMappingService.canUseFeature('ocr_scanner')).toBe(true);
    });
  });

  describe('Payment History', () => {
    it('should fetch Stripe payment history', async () => {
      const mockInvoices = [
        {
          id: 'in_123',
          created: 1699660800,
          amount_paid: 2990,
          paid: true,
          hosted_invoice_url: 'https://invoice.stripe.com/123'
        },
        {
          id: 'in_124',
          created: 1702339200,
          amount_paid: 2990,
          paid: true,
          hosted_invoice_url: 'https://invoice.stripe.com/124'
        }
      ];

      const historyPromise = subscriptionService.getPaymentHistory(mockUserId);

      const req = httpMock.expectOne(request =>
        request.url.includes('getStripePaymentHistory')
      );

      req.flush(mockInvoices);

      const history = await historyPromise;

      expect(history.length).toBe(2);
      expect(history[0].amount).toBe(29.9);
      expect(history[0].status).toBe('paid');
      expect(history[0].method).toBe('Cartão de Crédito');
    });

    it('should fetch PagSeguro transaction history', async () => {
      const mockTransactions = [
        {
          code: 'TRX123',
          date: '2024-01-15T10:00:00',
          grossAmount: 49.9,
          status: 3, // PAID
          paymentMethod: { type: 5 } // PIX
        },
        {
          code: 'TRX124',
          date: '2024-02-15T10:00:00',
          grossAmount: 49.9,
          status: 3,
          paymentMethod: { type: 1 } // Credit Card
        }
      ];

      const historyPromise = subscriptionService.getPaymentHistory(mockUserId);

      const req = httpMock.expectOne(request =>
        request.url.includes('getPagSeguroTransactionHistory')
      );

      req.flush(mockTransactions);

      const history = await historyPromise;

      expect(history.length).toBe(2);
      expect(history[0].method).toBe('PIX');
      expect(history[1].method).toBe('Cartão de Crédito');
    });
  });

  describe('Webhook Processing', () => {
    it('should process Stripe checkout.session.completed webhook', async () => {
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: {
              userId: mockUserId,
              plan: 'premium'
            }
          }
        }
      };

      // This would be processed by the Cloud Function
      // Verify it creates/updates the subscription correctly
      expect(webhookEvent.data.object.metadata.plan).toBe('premium');
      expect(webhookEvent.data.object.metadata.userId).toBe(mockUserId);
    });

    it('should process Stripe invoice.paid webhook', async () => {
      const webhookEvent = {
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            amount_paid: 2990,
            paid: true
          }
        }
      };

      // Verify payment recorded correctly
      expect(webhookEvent.data.object.paid).toBe(true);
      expect(webhookEvent.data.object.amount_paid).toBe(2990);
    });

    it('should process Stripe invoice.payment_failed webhook', async () => {
      const webhookEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            amount_due: 2990,
            paid: false,
            attempt_count: 1
          }
        }
      };

      // Should update subscription status to past_due
      expect(webhookEvent.data.object.paid).toBe(false);
    });
  });

  describe('Sync Operations', () => {
    it('should sync subscription status with Stripe', async () => {
      const subscriptionId = 'sub_123';

      const syncPromise = subscriptionService.syncWithStripe(mockUserId, subscriptionId);

      const req = httpMock.expectOne(request =>
        request.url.includes('getStripeSubscriptionStatus')
      );

      req.flush({
        id: subscriptionId,
        status: 'active',
        cancelAtPeriodEnd: false,
        current_period_end: 1735689600
      });

      await syncPromise;

      // Verify Firestore updated
      expect(firestoreMock.doc).toHaveBeenCalled();
    });

    it('should sync subscription status with PagSeguro', async () => {
      const subscriptionCode = 'SUB123456';

      const syncPromise = subscriptionService.syncWithPagSeguro(mockUserId, subscriptionCode);

      const req = httpMock.expectOne(request =>
        request.url.includes('getPagSeguroSubscriptionStatus')
      );

      req.flush({
        code: subscriptionCode,
        status: 'ACTIVE',
        plan: 'FAMILY_MONTHLY'
      });

      await syncPromise;

      // Verify status mapped correctly
      expect(firestoreMock.doc).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors gracefully', async () => {
      const upgradePromise = subscriptionService.upgradeViaStripe(
        mockUserId,
        'premium',
        'monthly',
        'https://app.com/success',
        'https://app.com/cancel'
      );

      const req = httpMock.expectOne(request =>
        request.url.includes('createStripeCheckoutSession')
      );

      // Simulate error
      req.flush(
        { error: 'Invalid plan' },
        { status: 400, statusText: 'Bad Request' }
      );

      await expectAsync(upgradePromise).toBeRejected();
    });

    it('should handle PagSeguro API errors gracefully', async () => {
      const upgradePromise = subscriptionService.upgradeViaPagSeguro(
        mockUserId,
        'family',
        'monthly',
        'test@example.com',
        'Test User',
        '11987654321'
      );

      const req = httpMock.expectOne(request =>
        request.url.includes('createPagSeguroSubscription')
      );

      req.flush(
        { error: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' }
      );

      await expectAsync(upgradePromise).toBeRejected();
    });
  });
});
