import { TestBed } from '@angular/core/testing';
import { PaymentConfigService } from './payment-config.service';

describe('PaymentConfigService', () => {
  let service: PaymentConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentConfigService);
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
