import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PagSeguroPaymentService, PagSeguroSubscriptionStatus, PagSeguroTransaction } from './pagseguro-payment.service';
import { LogService } from './log.service';
import { environment } from '../../environments/environment';

describe('PagSeguroPaymentService', () => {
  let service: PagSeguroPaymentService;
  let httpMock: HttpTestingController;
  let mockLogService: jasmine.SpyObj<LogService>;

  const functionsUrl = environment.production
    ? 'https://us-central1-medicamenta-me.cloudfunctions.net'
    : 'http://localhost:5001/medicamenta-me/us-central1';

  beforeEach(() => {
    mockLogService = jasmine.createSpyObj('LogService', ['info', 'error', 'warn']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PagSeguroPaymentService,
        { provide: LogService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(PagSeguroPaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Subscription Creation', () => {
    // Note: Full subscription creation tests with redirect are in E2E Cypress tests
    // Here we test the HTTP request parameters only

    it('should throw error for free plan', async () => {
      await expectAsync(
        service.createSubscription(
          'free',
          'monthly',
          'user123',
          'test@example.com',
          'Test User',
          '11987654321'
        )
      ).toBeRejectedWithError('Cannot create subscription for free plan');
    });

    it('should throw error for enterprise plan', async () => {
      await expectAsync(
        service.createSubscription(
          'enterprise',
          'monthly',
          'user123',
          'test@example.com',
          'Test User',
          '11987654321'
        )
      ).toBeRejectedWithError('Enterprise plan requires custom pricing. Please contact sales.');
    });

    it('should throw error for invalid phone number (too short)', async () => {
      await expectAsync(
        service.createSubscription(
          'premium',
          'monthly',
          'user123',
          'test@example.com',
          'Test User',
          '123456789'
        )
      ).toBeRejectedWithError('Invalid phone number format. Expected format: (11) 98765-4321');
    });

    it('should throw error for invalid phone number (too long)', async () => {
      await expectAsync(
        service.createSubscription(
          'premium',
          'monthly',
          'user123',
          'test@example.com',
          'Test User',
          '123456789012'
        )
      ).toBeRejectedWithError('Invalid phone number format. Expected format: (11) 98765-4321');
    });
  });

  describe('Subscription Status', () => {
    it('should get subscription status', async () => {
      const mockStatus: PagSeguroSubscriptionStatus = {
        status: 'ACTIVE',
        code: 'SUB123456',
        reference: 'user123',
        lastEventDate: '2025-12-18T10:00:00',
        charge: 'AUTO'
      };

      const statusPromise = service.getSubscriptionStatus('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroSubscriptionStatus') &&
        request.params.get('subscriptionCode') === 'SUB123456'
      );
      expect(req.request.method).toBe('GET');

      req.flush(mockStatus);

      const result = await statusPromise;
      expect(result.status).toBe('ACTIVE');
      expect(result.code).toBe('SUB123456');
    });

    it('should get suspended subscription status', async () => {
      const mockStatus: PagSeguroSubscriptionStatus = {
        status: 'SUSPENDED',
        code: 'SUB123456',
        reference: 'user123',
        lastEventDate: '2025-12-18T10:00:00',
        charge: 'MANUAL'
      };

      const statusPromise = service.getSubscriptionStatus('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroSubscriptionStatus')
      );

      req.flush(mockStatus);

      const result = await statusPromise;
      expect(result.status).toBe('SUSPENDED');
    });

    it('should get cancelled subscription status', async () => {
      const mockStatus: PagSeguroSubscriptionStatus = {
        status: 'CANCELLED',
        code: 'SUB123456',
        reference: 'user123',
        lastEventDate: '2025-12-18T10:00:00',
        charge: 'AUTO'
      };

      const statusPromise = service.getSubscriptionStatus('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroSubscriptionStatus')
      );

      req.flush(mockStatus);

      const result = await statusPromise;
      expect(result.status).toBe('CANCELLED');
    });

    it('should handle HTTP 404 error for non-existent subscription', async () => {
      const statusPromise = service.getSubscriptionStatus('INVALID');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroSubscriptionStatus')
      );

      req.flush('Not found', { status: 404, statusText: 'Not Found' });

      await expectAsync(statusPromise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Error getting subscription status',
        jasmine.any(Object)
      );
    });
  });

  describe('Subscription Management', () => {
    it('should cancel subscription', async () => {
      const cancelPromise = service.cancelSubscription('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('cancelPagSeguroSubscription') &&
        request.body.subscriptionCode === 'SUB123456'
      );
      expect(req.request.method).toBe('POST');

      req.flush({});

      await expectAsync(cancelPromise).toBeResolved();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Subscription canceled successfully'
      );
    });

    it('should suspend subscription', async () => {
      const suspendPromise = service.suspendSubscription('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('suspendPagSeguroSubscription') &&
        request.body.subscriptionCode === 'SUB123456'
      );
      expect(req.request.method).toBe('POST');

      req.flush({});

      await expectAsync(suspendPromise).toBeResolved();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Subscription suspended successfully'
      );
    });

    it('should reactivate subscription', async () => {
      const reactivatePromise = service.reactivateSubscription('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('reactivatePagSeguroSubscription') &&
        request.body.subscriptionCode === 'SUB123456'
      );
      expect(req.request.method).toBe('POST');

      req.flush({});

      await expectAsync(reactivatePromise).toBeResolved();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Subscription reactivated successfully'
      );
    });

    it('should handle error when canceling subscription', async () => {
      const cancelPromise = service.cancelSubscription('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('cancelPagSeguroSubscription')
      );

      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      await expectAsync(cancelPromise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Error canceling subscription',
        jasmine.any(Object)
      );
    });
  });

  describe('Transaction History', () => {
    it('should get transaction history with default 30 days', async () => {
      const mockTransactions: PagSeguroTransaction[] = [
        {
          code: 'TX123',
          reference: 'user123',
          type: 1,
          status: 3,
          date: '2025-12-01T10:00:00',
          lastEventDate: '2025-12-01T10:05:00',
          grossAmount: 49.90,
          netAmount: 47.90,
          paymentMethod: { type: 1, code: 101 }
        },
        {
          code: 'TX124',
          reference: 'user123',
          type: 1,
          status: 3,
          date: '2025-11-01T10:00:00',
          lastEventDate: '2025-11-01T10:05:00',
          grossAmount: 49.90,
          netAmount: 47.90,
          paymentMethod: { type: 2, code: 202 }
        }
      ];

      const historyPromise = service.getTransactionHistory('test@example.com');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroTransactionHistory') &&
        request.params.get('email') === 'test@example.com' &&
        request.params.get('days') === '30'
      );
      expect(req.request.method).toBe('GET');

      req.flush({ transactions: mockTransactions });

      const result = await historyPromise;
      expect(result.length).toBe(2);
      expect(result[0].code).toBe('TX123');
      expect(result[1].code).toBe('TX124');
    });

    it('should get transaction history with custom days limit', async () => {
      const mockTransactions: PagSeguroTransaction[] = [];

      const historyPromise = service.getTransactionHistory('test@example.com', 90);

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroTransactionHistory') &&
        request.params.get('days') === '90'
      );

      req.flush({ transactions: mockTransactions });

      const result = await historyPromise;
      expect(result).toEqual([]);
    });

    it('should handle error when getting transaction history', async () => {
      const historyPromise = service.getTransactionHistory('test@example.com');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroTransactionHistory')
      );

      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      await expectAsync(historyPromise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Error getting transaction history',
        jasmine.any(Object)
      );
    });
  });

  describe('Plan Changes', () => {
    // Note: Full plan change with redirect will be tested in E2E Cypress tests
    // Unit tests focus on error handling without browser navigation

    it('should handle error when canceling subscription during plan change', async () => {
      const changePromise = service.changePlan(
        'SUB123456',
        'family',
        'yearly',
        'user123',
        'test@example.com',
        'Test User',
        '11987654321'
      );

      // Wait a tick
      await new Promise(resolve => setTimeout(resolve, 0));

      // Expect cancel request to fail
      const cancelReq = httpMock.expectOne((request) =>
        request.url.includes('cancelPagSeguroSubscription')
      );
      cancelReq.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      // Verify the promise rejects and error is logged
      await expectAsync(changePromise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Error changing plan',
        jasmine.any(Object)
      );
    });
  });

  describe('Customer Data Validation', () => {
    it('should validate correct email and phone', () => {
      const result = service.validateCustomerData('test@example.com', '(11) 98765-4321');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid email', () => {
      const result = service.validateCustomerData('invalid-email', '(11) 98765-4321');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email inválido');
    });

    it('should reject invalid phone (too short)', () => {
      const result = service.validateCustomerData('test@example.com', '123456789');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Telefone inválido. Formato esperado: (11) 98765-4321');
    });

    it('should reject invalid phone (too long)', () => {
      const result = service.validateCustomerData('test@example.com', '123456789012');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Telefone inválido. Formato esperado: (11) 98765-4321');
    });

    it('should reject both invalid email and phone', () => {
      const result = service.validateCustomerData('invalid', '123');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors).toContain('Email inválido');
      expect(result.errors).toContain('Telefone inválido. Formato esperado: (11) 98765-4321');
    });

    it('should accept phone without formatting', () => {
      const result = service.validateCustomerData('test@example.com', '11987654321');

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Boleto Integration', () => {
    it('should get boleto link for subscription', async () => {
      const mockResponse = {
        boletoUrl: 'https://pagseguro.uol.com.br/boleto/123456'
      };

      const boletoPromise = service.getBoletoLink('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroBoletoLink') &&
        request.params.get('subscriptionCode') === 'SUB123456'
      );
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);

      const result = await boletoPromise;
      expect(result).toBe('https://pagseguro.uol.com.br/boleto/123456');
    });

    it('should handle error when getting boleto link', async () => {
      const boletoPromise = service.getBoletoLink('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroBoletoLink')
      );

      req.flush('Error', { status: 404, statusText: 'Not Found' });

      await expectAsync(boletoPromise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Error getting boleto link',
        jasmine.any(Object)
      );
    });
  });

  describe('Overdue Payment Checks', () => {
    it('should check overdue payment (not overdue)', async () => {
      const mockResponse = { overdue: false };

      const overduePromise = service.checkOverduePayment('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('checkPagSeguroOverdue') &&
        request.params.get('subscriptionCode') === 'SUB123456'
      );
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);

      const result = await overduePromise;
      expect(result.overdue).toBe(false);
      expect(result.days).toBeUndefined();
    });

    it('should check overdue payment (overdue with days)', async () => {
      const mockResponse = { overdue: true, days: 15 };

      const overduePromise = service.checkOverduePayment('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('checkPagSeguroOverdue')
      );

      req.flush(mockResponse);

      const result = await overduePromise;
      expect(result.overdue).toBe(true);
      expect(result.days).toBe(15);
    });

    it('should handle error when checking overdue payment', async () => {
      const overduePromise = service.checkOverduePayment('SUB123456');

      const req = httpMock.expectOne((request) =>
        request.url.includes('checkPagSeguroOverdue')
      );

      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });

      await expectAsync(overduePromise).toBeRejected();
      expect(mockLogService.error).toHaveBeenCalledWith(
        'PagSeguroPaymentService',
        'Error checking overdue payment',
        jasmine.any(Object)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent status requests', async () => {
      const mockStatus1: PagSeguroSubscriptionStatus = {
        status: 'ACTIVE',
        code: 'SUB123',
        reference: 'user123',
        lastEventDate: '2025-12-18T10:00:00',
        charge: 'AUTO'
      };

      const mockStatus2: PagSeguroSubscriptionStatus = {
        status: 'SUSPENDED',
        code: 'SUB456',
        reference: 'user456',
        lastEventDate: '2025-12-18T10:00:00',
        charge: 'MANUAL'
      };

      const promise1 = service.getSubscriptionStatus('SUB123');
      const promise2 = service.getSubscriptionStatus('SUB456');

      const requests = httpMock.match((request) =>
        request.url.includes('getPagSeguroSubscriptionStatus')
      );
      expect(requests.length).toBe(2);

      requests[0].flush(mockStatus1);
      requests[1].flush(mockStatus2);

      const [result1, result2] = await Promise.all([promise1, promise2]);
      expect(result1.status).toBe('ACTIVE');
      expect(result2.status).toBe('SUSPENDED');
    });

    it('should handle empty transaction history', async () => {
      const historyPromise = service.getTransactionHistory('newuser@example.com');

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroTransactionHistory')
      );

      req.flush({ transactions: [] });

      const result = await historyPromise;
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should handle large transaction history', async () => {
      const mockTransactions: PagSeguroTransaction[] = Array.from({ length: 100 }, (_, i) => ({
        code: `TX${i}`,
        reference: 'user123',
        type: 1,
        status: 3,
        date: `2025-${String(12 - Math.floor(i / 30)).padStart(2, '0')}-01T10:00:00`,
        lastEventDate: `2025-${String(12 - Math.floor(i / 30)).padStart(2, '0')}-01T10:05:00`,
        grossAmount: 49.90,
        netAmount: 47.90,
        paymentMethod: { type: 1, code: 101 }
      }));

      const historyPromise = service.getTransactionHistory('test@example.com', 180);

      const req = httpMock.expectOne((request) =>
        request.url.includes('getPagSeguroTransactionHistory')
      );

      req.flush({ transactions: mockTransactions });

      const result = await historyPromise;
      expect(result.length).toBe(100);
    });
  });
});
