import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { StripePaymentService, StripeCheckoutSession, StripeSubscriptionStatus } from './stripe-payment.service';
import { LogService } from './log.service';
import { environment } from '../../environments/environment';

describe('StripePaymentService', () => {
  let service: StripePaymentService;
  let httpMock: HttpTestingController;
  let mockLogService: jasmine.SpyObj<LogService>;

  const functionsUrl = environment.production
    ? 'https://us-central1-medicamenta-me.cloudfunctions.net'
    : 'http://localhost:5001/medicamenta-me/us-central1';

  beforeEach(() => {
    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error', 'debug', 'info', 'warn', 'logs']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StripePaymentService,
        { provide: LogService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(StripePaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // SUBSCRIPTION STATUS - POSITIVE SCENARIOS (5 tests)
  // ========================================

  describe('Subscription Status - Positive Scenarios', () => {
    it('should get active subscription status', async () => {
      const mockStatus: StripeSubscriptionStatus = {
        status: 'active',
        currentPeriodEnd: Date.now() / 1000 + 2592000,
        cancelAtPeriodEnd: false,
        customerId: 'cus_123',
        subscriptionId: 'sub_123'
      };

      const promise = service.getSubscriptionStatus('sub_123');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripeSubscriptionStatus') &&
        request.params.get('subscriptionId') === 'sub_123'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockStatus);

      const result = await promise;

      expect(result.status).toBe('active');
      expect(result.subscriptionId).toBe('sub_123');
      expect(result.cancelAtPeriodEnd).toBeFalse();
    });

    it('should get trialing subscription status', async () => {
      const mockStatus: StripeSubscriptionStatus = {
        status: 'trialing',
        currentPeriodEnd: Date.now() / 1000 + 604800, // 7 days
        cancelAtPeriodEnd: false,
        customerId: 'cus_456',
        subscriptionId: 'sub_456'
      };

      const promise = service.getSubscriptionStatus('sub_456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripeSubscriptionStatus')
      );
      req.flush(mockStatus);

      const result = await promise;

      expect(result.status).toBe('trialing');
    });

    it('should get canceled subscription status', async () => {
      const mockStatus: StripeSubscriptionStatus = {
        status: 'canceled',
        currentPeriodEnd: Date.now() / 1000 + 86400,
        cancelAtPeriodEnd: true,
        customerId: 'cus_789',
        subscriptionId: 'sub_789'
      };

      const promise = service.getSubscriptionStatus('sub_789');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripeSubscriptionStatus')
      );
      req.flush(mockStatus);

      const result = await promise;

      expect(result.status).toBe('canceled');
      expect(result.cancelAtPeriodEnd).toBeTrue();
    });

    it('should cancel subscription successfully', async () => {
      const promise = service.cancelSubscription('sub_123');

      const req = httpMock.expectOne(`${functionsUrl}/cancelStripeSubscription`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.subscriptionId).toBe('sub_123');
      req.flush({});

      await promise;

      expect(mockLogService.info).toHaveBeenCalledWith(
        'StripePaymentService',
        'Subscription canceled successfully'
      );
    });

    it('should reactivate subscription successfully', async () => {
      const promise = service.reactivateSubscription('sub_123');

      const req = httpMock.expectOne(`${functionsUrl}/reactivateStripeSubscription`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.subscriptionId).toBe('sub_123');
      req.flush({});

      await promise;

      expect(mockLogService.info).toHaveBeenCalledWith(
        'StripePaymentService',
        'Subscription reactivated successfully'
      );
    });
  });

  // ========================================
  // CUSTOMER PORTAL - POSITIVE SCENARIOS (2 tests)
  // ========================================

  describe('Customer Portal - Positive Scenarios', () => {
    it('should create customer portal session with default return URL', async () => {
      const mockPortalUrl = 'https://billing.stripe.com/session/xyz';

      const promise = service.createCustomerPortalSession('cus_123');

      const req = httpMock.expectOne(`${functionsUrl}/createStripeCustomerPortal`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.customerId).toBe('cus_123');
      expect(req.request.body.returnUrl).toContain('/subscription/manage');
      req.flush({ url: mockPortalUrl });

      const result = await promise;

      expect(result).toBe(mockPortalUrl);
    });

    it('should create customer portal session with custom return URL', async () => {
      const mockPortalUrl = 'https://billing.stripe.com/session/abc';
      const customReturnUrl = 'https://example.com/custom';

      const promise = service.createCustomerPortalSession('cus_456', customReturnUrl);

      const req = httpMock.expectOne(`${functionsUrl}/createStripeCustomerPortal`);
      expect(req.request.body.returnUrl).toBe(customReturnUrl);
      req.flush({ url: mockPortalUrl });

      const result = await promise;

      expect(result).toBe(mockPortalUrl);
    });
  });

  // ========================================
  // INVOICES & PAYMENT HISTORY (3 tests)
  // ========================================

  describe('Invoices & Payment History', () => {
    it('should get upcoming invoice', async () => {
      const mockInvoice = {
        id: 'in_123',
        amount_due: 2990,
        currency: 'usd',
        period_start: Date.now() / 1000,
        period_end: Date.now() / 1000 + 2592000
      };

      const promise = service.getUpcomingInvoice('cus_123');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripeUpcomingInvoice') &&
        request.params.get('customerId') === 'cus_123'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockInvoice);

      const result = await promise;

      expect(result.id).toBe('in_123');
      expect(result.amount_due).toBe(2990);
    });

    it('should get payment history with default limit', async () => {
      const mockInvoices = [
        { id: 'in_1', amount_paid: 2990, status: 'paid' },
        { id: 'in_2', amount_paid: 2990, status: 'paid' }
      ];

      const promise = service.getPaymentHistory('cus_123');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripePaymentHistory') &&
        request.params.get('limit') === '10'
      );
      req.flush({ invoices: mockInvoices });

      const result = await promise;

      expect(result.length).toBe(2);
    });

    it('should get payment history with custom limit', async () => {
      const promise = service.getPaymentHistory('cus_123', 25);

      const req = httpMock.expectOne((request) =>
        request.params.get('limit') === '25'
      );
      req.flush({ invoices: [] });

      const result = await promise;
      
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // PRICING & COUPONS (4 tests)
  // ========================================

  describe('Pricing & Coupons', () => {
    it('should calculate price without coupon', async () => {
      const mockPrice = {
        amount: 2990,
        currency: 'usd'
      };

      const promise = service.calculatePrice('premium', 'monthly');

      const req = httpMock.expectOne(`${functionsUrl}/calculateStripePrice`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.couponCode).toBeUndefined();
      req.flush(mockPrice);

      const result = await promise;

      expect(result.amount).toBe(2990);
    });

    it('should calculate price with coupon discount', async () => {
      const mockPrice = {
        amount: 2392,
        currency: 'usd',
        discount: 598
      };

      const promise = service.calculatePrice('premium', 'monthly', 'SAVE20');

      const req = httpMock.expectOne(`${functionsUrl}/calculateStripePrice`);
      expect(req.request.body.couponCode).toBe('SAVE20');
      req.flush(mockPrice);

      const result = await promise;

      expect(result.discount).toBe(598);
    });

    it('should validate valid coupon', async () => {
      const mockCoupon = {
        valid: true,
        percentOff: 20
      };

      const promise = service.validateCoupon('SAVE20');

      const req = httpMock.expectOne(`${functionsUrl}/validateStripeCoupon`);
      req.flush(mockCoupon);

      const result = await promise;

      expect(result.valid).toBeTrue();
      expect(result.percentOff).toBe(20);
    });

    it('should return invalid for bad coupon code', async () => {
      const promise = service.validateCoupon('INVALID');

      const req = httpMock.expectOne(`${functionsUrl}/validateStripeCoupon`);
      req.error(new ProgressEvent('error'), { status: 400 });

      const result = await promise;

      expect(result.valid).toBeFalse();
      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  // ========================================
  // ERROR HANDLING (5 tests)
  // ========================================

  describe('Error Handling', () => {
    it('should handle HTTP 404 error for subscription status', async () => {
      const promise = service.getSubscriptionStatus('sub_invalid');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripeSubscriptionStatus')
      );
      req.error(new ProgressEvent('error'), { status: 404 });

      await expectAsync(promise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalled();
    });

    it('should handle HTTP 500 error for cancel subscription', async () => {
      const promise = service.cancelSubscription('sub_123');

      const req = httpMock.expectOne(`${functionsUrl}/cancelStripeSubscription`);
      req.error(new ProgressEvent('error'), { status: 500 });

      await expectAsync(promise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalled();
    });

    it('should handle network timeout', async () => {
      const promise = service.getPaymentHistory('cus_123');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripePaymentHistory')
      );
      req.error(new ProgressEvent('timeout'), { status: 0 });

      await expectAsync(promise).toBeRejected();
    });

    it('should handle missing customer portal URL', async () => {
      const promise = service.createCustomerPortalSession('cus_123');

      const req = httpMock.expectOne(`${functionsUrl}/createStripeCustomerPortal`);
      req.error(new ProgressEvent('error'), { status: 400 });

      await expectAsync(promise).toBeRejected();
    });

    it('should handle error when getting upcoming invoice', async () => {
      const promise = service.getUpcomingInvoice('cus_invalid');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripeUpcomingInvoice')
      );
      req.error(new ProgressEvent('error'), { status: 404 });

      await expectAsync(promise).toBeRejected();
    });
  });

  // ========================================
  // EDGE CASES (3 tests)
  // ========================================

  describe('Edge Cases', () => {
    it('should handle multiple concurrent requests', async () => {
      const promise1 = service.getSubscriptionStatus('sub_1');
      const promise2 = service.getSubscriptionStatus('sub_2');
      const promise3 = service.getSubscriptionStatus('sub_3');

      const reqs = httpMock.match((req) => req.url.includes('getStripeSubscriptionStatus'));
      expect(reqs.length).toBe(3);

      reqs[0].flush({
        status: 'active',
        currentPeriodEnd: Date.now() / 1000,
        cancelAtPeriodEnd: false,
        customerId: 'cus_1',
        subscriptionId: 'sub_1'
      });

      reqs[1].flush({
        status: 'trialing',
        currentPeriodEnd: Date.now() / 1000,
        cancelAtPeriodEnd: false,
        customerId: 'cus_2',
        subscriptionId: 'sub_2'
      });

      reqs[2].flush({
        status: 'canceled',
        currentPeriodEnd: Date.now() / 1000,
        cancelAtPeriodEnd: true,
        customerId: 'cus_3',
        subscriptionId: 'sub_3'
      });

      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      expect(result1.status).toBe('active');
      expect(result2.status).toBe('trialing');
      expect(result3.status).toBe('canceled');
    });

    it('should handle empty payment history', async () => {
      const promise = service.getPaymentHistory('cus_new', 10);

      const req = httpMock.expectOne((request) =>
        request.url.includes('getStripePaymentHistory')
      );
      req.flush({ invoices: [] });

      const result = await promise;

      expect(result).toEqual([]);
    });

    it('should handle large payment history limit', async () => {
      const mockInvoices = Array.from({ length: 100 }, (_, i) => ({
        id: `in_${i}`,
        amount_paid: 2990,
        status: 'paid'
      }));

      const promise = service.getPaymentHistory('cus_123', 100);

      const req = httpMock.expectOne((request) =>
        request.params.get('limit') === '100'
      );
      req.flush({ invoices: mockInvoices });

      const result = await promise;

      expect(result.length).toBe(100);
    });
  });
});
