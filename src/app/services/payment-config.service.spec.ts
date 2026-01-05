import { TestBed } from '@angular/core/testing';
import { PaymentConfigService } from './payment-config.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

describe('PaymentConfigService', () => {
  let service: PaymentConfigService;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;
  let originalStripe: any;
  let originalPagSeguro: any;

  beforeEach(() => {
    // Save original environment values
    originalStripe = environment.stripe;
    originalPagSeguro = environment.pagseguro;
    
    // Mock environment with placeholder keys for testing
    environment.stripe = {
      testPublishableKey: 'REPLACE_WITH_YOUR_STRIPE_TEST_KEY',
      prices: {
        premium: { monthly: 'REPLACE_PRICE_ID', yearly: 'REPLACE_PRICE_ID' },
        family: { monthly: 'REPLACE_PRICE_ID', yearly: 'REPLACE_PRICE_ID' }
      }
    };
    
    environment.pagseguro = {
      testPublicKey: 'REPLACE_WITH_YOUR_PAGSEGURO_PUBLIC_KEY',
      plans: {
        premium: { monthly: 'PLAN_TEST', yearly: 'PLAN_TEST' },
        family: { monthly: 'PLAN_TEST', yearly: 'PLAN_TEST' }
      }
    };

    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant', 'get', 'stream', 'addLangs', 'setDefaultLang', 'use'], {
      onTranslationChange: { subscribe: () => {} },
      onLangChange: { subscribe: () => {} },
      onDefaultLangChange: { subscribe: () => {} },
      currentLang: 'pt',
      defaultLang: 'pt'
    });
    translateServiceSpy.instant.and.callFake((key: string) => {
      if (key === 'PRICING.WARNING.MESSAGE') return 'Sistema de pagamento não configurado';
      return key;
    });
    translateServiceSpy.get.and.callFake((key: string) => ({
      subscribe: (fn: any) => fn(key === 'PRICING.WARNING.MESSAGE' ? 'Sistema de pagamento não configurado' : key)
    } as any));
    translateServiceSpy.stream.and.callFake((key: string) => ({ subscribe: (fn: any) => fn(key) } as any));
    translateServiceSpy.use.and.returnValue({ subscribe: () => {} } as any);
    translateServiceSpy.addLangs.and.stub();
    translateServiceSpy.setDefaultLang.and.stub();

    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useValue: translateServiceSpy }
      ]
    });
    service = TestBed.inject(PaymentConfigService);
  });
  
  afterEach(() => {
    // Restore original environment values
    environment.stripe = originalStripe;
    environment.pagseguro = originalPagSeguro;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isStripeConfigured', () => {
    it('should return false when Stripe key contains REPLACE', () => {
      expect(service.isStripeConfigured()).toBeFalsy();
    });
  });

  describe('isPagSeguroConfigured', () => {
    it('should return false when PagSeguro key contains REPLACE', () => {
      expect(service.isPagSeguroConfigured()).toBeFalsy();
    });
  });

  describe('isPaymentConfigured', () => {
    it('should return false when no payment provider is configured', () => {
      expect(service.isPaymentConfigured()).toBeFalsy();
    });
  });

  describe('getConfigurationStatus', () => {
    it('should return unconfigured status with appropriate message', () => {
      const status = service.getConfigurationStatus();
      expect(status.configured).toBeFalsy();
      expect(status.message).toContain('não configurado');
      expect(status.providers.length).toBe(0);
    });
  });
});
