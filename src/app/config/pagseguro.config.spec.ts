import {
  getPagSeguroConfig,
  getPagSeguroPlanId,
  getPlanDetails,
  PAGSEGURO_PLANS,
  PAYMENT_METHOD_CONFIG,
  CURRENCY_SETTINGS,
  PAGSEGURO_FEATURES,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  TIMING_CONFIG,
  ANALYTICS_EVENTS,
  PagSeguroConfig
} from './pagseguro.config';
import { PAGSEGURO_PLAN_IDS, PagSeguroPlan } from '../models/pagseguro.model';

describe('PagSeguroConfig', () => {
  describe('getPagSeguroConfig', () => {
    it('should return a valid configuration object', () => {
      const config = getPagSeguroConfig();

      expect(config).toBeDefined();
      expect(config.publicKey).toBeDefined();
      expect(config.mode).toMatch(/^(sandbox|production)$/);
      expect(config.apiUrl).toContain('pagseguro.com');
    });

    it('should have plans configuration', () => {
      const config = getPagSeguroConfig();

      expect(config.plans).toBeDefined();
      expect(config.plans.premium).toBeDefined();
      expect(config.plans.premium.monthly).toBeDefined();
      expect(config.plans.premium.yearly).toBeDefined();
      expect(config.plans.family).toBeDefined();
      expect(config.plans.family.monthly).toBeDefined();
      expect(config.plans.family.yearly).toBeDefined();
    });

    it('should have features configuration', () => {
      const config = getPagSeguroConfig();

      expect(config.features).toBeDefined();
      expect(typeof config.features.pix).toBe('boolean');
      expect(typeof config.features.boleto).toBe('boolean');
      expect(typeof config.features.creditCard).toBe('boolean');
      expect(typeof config.features.installments).toBe('boolean');
      expect(typeof config.features.maxInstallments).toBe('number');
      expect(typeof config.features.interestFreeLimit).toBe('number');
    });

    it('should have valid URLs', () => {
      const config = getPagSeguroConfig();

      expect(config.successUrl).toContain('/payment/success');
      expect(config.cancelUrl).toContain('/payment/cancel');
    });

    it('should have valid expiration times', () => {
      const config = getPagSeguroConfig();

      expect(config.pixExpirationMinutes).toBeGreaterThan(0);
      expect(config.boletoExpirationDays).toBeGreaterThan(0);
    });

    it('should return sandbox API URL in development', () => {
      const config = getPagSeguroConfig();
      // In test environment, should be sandbox
      if (config.mode === 'sandbox') {
        expect(config.apiUrl).toContain('sandbox');
      }
    });

    it('should have interest free limit less than max installments', () => {
      const config = getPagSeguroConfig();

      expect(config.features.interestFreeLimit).toBeLessThanOrEqual(
        config.features.maxInstallments
      );
    });

    it('should have 12 as max installments', () => {
      const config = getPagSeguroConfig();

      expect(config.features.maxInstallments).toBe(12);
    });

    it('should have 3 as interest free limit', () => {
      const config = getPagSeguroConfig();

      expect(config.features.interestFreeLimit).toBe(3);
    });
  });

  describe('getPagSeguroPlanId', () => {
    it('should return premium monthly plan ID for sandbox', () => {
      const planId = getPagSeguroPlanId('premium', 'monthly', 'sandbox');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.test.premium.monthly);
    });

    it('should return premium yearly plan ID for sandbox', () => {
      const planId = getPagSeguroPlanId('premium', 'yearly', 'sandbox');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.test.premium.yearly);
    });

    it('should return family monthly plan ID for sandbox', () => {
      const planId = getPagSeguroPlanId('family', 'monthly', 'sandbox');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.test.family.monthly);
    });

    it('should return family yearly plan ID for sandbox', () => {
      const planId = getPagSeguroPlanId('family', 'yearly', 'sandbox');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.test.family.yearly);
    });

    it('should return premium monthly plan ID for production', () => {
      const planId = getPagSeguroPlanId('premium', 'monthly', 'production');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.live.premium.monthly);
    });

    it('should return premium yearly plan ID for production', () => {
      const planId = getPagSeguroPlanId('premium', 'yearly', 'production');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.live.premium.yearly);
    });

    it('should return family monthly plan ID for production', () => {
      const planId = getPagSeguroPlanId('family', 'monthly', 'production');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.live.family.monthly);
    });

    it('should return family yearly plan ID for production', () => {
      const planId = getPagSeguroPlanId('family', 'yearly', 'production');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.live.family.yearly);
    });

    it('should default to sandbox mode', () => {
      const planId = getPagSeguroPlanId('premium', 'monthly');

      expect(planId).toBe(PAGSEGURO_PLAN_IDS.test.premium.monthly);
    });
  });

  describe('getPlanDetails', () => {
    it('should return premium monthly plan details', () => {
      const plan = getPlanDetails('premium', 'monthly');

      expect(plan).toBeDefined();
      expect(plan.name).toContain('Premium');
      expect(plan.name).toContain('Mensal');
      expect(plan.interval).toBe('monthly');
      expect(plan.internalPlanId).toBe('premium');
    });

    it('should return premium yearly plan details', () => {
      const plan = getPlanDetails('premium', 'yearly');

      expect(plan).toBeDefined();
      expect(plan.name).toContain('Premium');
      expect(plan.name).toContain('Anual');
      expect(plan.interval).toBe('yearly');
      expect(plan.internalPlanId).toBe('premium');
    });

    it('should return family monthly plan details', () => {
      const plan = getPlanDetails('family', 'monthly');

      expect(plan).toBeDefined();
      expect(plan.name).toContain('Family');
      expect(plan.name).toContain('Mensal');
      expect(plan.interval).toBe('monthly');
      expect(plan.internalPlanId).toBe('family');
    });

    it('should return family yearly plan details', () => {
      const plan = getPlanDetails('family', 'yearly');

      expect(plan).toBeDefined();
      expect(plan.name).toContain('Family');
      expect(plan.name).toContain('Anual');
      expect(plan.interval).toBe('yearly');
      expect(plan.internalPlanId).toBe('family');
    });

    it('should have valid amount for premium monthly', () => {
      const plan = getPlanDetails('premium', 'monthly');

      expect(plan.amount).toBeDefined();
      expect(plan.amount.value).toBe(1490); // R$ 14,90
      expect(plan.amount.currency).toBe('BRL');
    });

    it('should have valid amount for premium yearly', () => {
      const plan = getPlanDetails('premium', 'yearly');

      expect(plan.amount).toBeDefined();
      expect(plan.amount.value).toBe(14900); // R$ 149,00
      expect(plan.amount.currency).toBe('BRL');
    });

    it('should have valid amount for family monthly', () => {
      const plan = getPlanDetails('family', 'monthly');

      expect(plan.amount).toBeDefined();
      expect(plan.amount.value).toBe(2990); // R$ 29,90
      expect(plan.amount.currency).toBe('BRL');
    });

    it('should have valid amount for family yearly', () => {
      const plan = getPlanDetails('family', 'yearly');

      expect(plan.amount).toBeDefined();
      expect(plan.amount.value).toBe(29900); // R$ 299,00
      expect(plan.amount.currency).toBe('BRL');
    });

    it('should have trial days for all plans', () => {
      const premiumMonthly = getPlanDetails('premium', 'monthly');
      const premiumYearly = getPlanDetails('premium', 'yearly');
      const familyMonthly = getPlanDetails('family', 'monthly');
      const familyYearly = getPlanDetails('family', 'yearly');

      expect(premiumMonthly.trialDays).toBe(7);
      expect(premiumYearly.trialDays).toBe(7);
      expect(familyMonthly.trialDays).toBe(7);
      expect(familyYearly.trialDays).toBe(7);
    });

    it('should have yearly price approximately 10x monthly', () => {
      const premiumMonthly = getPlanDetails('premium', 'monthly');
      const premiumYearly = getPlanDetails('premium', 'yearly');
      const familyMonthly = getPlanDetails('family', 'monthly');
      const familyYearly = getPlanDetails('family', 'yearly');

      expect(premiumYearly.amount.value).toBe(premiumMonthly.amount.value * 10);
      expect(familyYearly.amount.value).toBe(familyMonthly.amount.value * 10);
    });
  });

  describe('PAGSEGURO_PLANS', () => {
    it('should have all four plans defined', () => {
      expect(PAGSEGURO_PLANS['premium_monthly']).toBeDefined();
      expect(PAGSEGURO_PLANS['premium_yearly']).toBeDefined();
      expect(PAGSEGURO_PLANS['family_monthly']).toBeDefined();
      expect(PAGSEGURO_PLANS['family_yearly']).toBeDefined();
    });

    it('should have valid plan structure', () => {
      Object.values(PAGSEGURO_PLANS).forEach((plan: PagSeguroPlan) => {
        expect(plan.id).toBeDefined();
        expect(plan.name).toBeDefined();
        expect(plan.description).toBeDefined();
        expect(plan.amount).toBeDefined();
        expect(plan.amount.value).toBeGreaterThan(0);
        expect(plan.amount.currency).toBe('BRL');
        expect(plan.interval).toMatch(/^(monthly|yearly)$/);
        expect(plan.trialDays).toBeGreaterThanOrEqual(0);
        expect(plan.internalPlanId).toMatch(/^(premium|family)$/);
      });
    });
  });

  describe('PAYMENT_METHOD_CONFIG', () => {
    it('should have pix configuration', () => {
      expect(PAYMENT_METHOD_CONFIG.pix).toBeDefined();
      expect(PAYMENT_METHOD_CONFIG.pix.enabled).toBe(true);
      expect(PAYMENT_METHOD_CONFIG.pix.name).toBe('PIX');
      expect(PAYMENT_METHOD_CONFIG.pix.icon).toBe('qr-code-outline');
      expect(PAYMENT_METHOD_CONFIG.pix.expirationMinutes).toBe(30);
      expect(PAYMENT_METHOD_CONFIG.pix.benefits).toBeInstanceOf(Array);
      expect(PAYMENT_METHOD_CONFIG.pix.benefits.length).toBeGreaterThan(0);
    });

    it('should have boleto configuration', () => {
      expect(PAYMENT_METHOD_CONFIG.boleto).toBeDefined();
      expect(PAYMENT_METHOD_CONFIG.boleto.enabled).toBe(true);
      expect(PAYMENT_METHOD_CONFIG.boleto.name).toBe('Boleto Bancário');
      expect(PAYMENT_METHOD_CONFIG.boleto.icon).toBe('barcode-outline');
      expect(PAYMENT_METHOD_CONFIG.boleto.expirationDays).toBe(3);
      expect(PAYMENT_METHOD_CONFIG.boleto.benefits).toBeInstanceOf(Array);
      expect(PAYMENT_METHOD_CONFIG.boleto.benefits.length).toBeGreaterThan(0);
    });

    it('should have credit card configuration', () => {
      expect(PAYMENT_METHOD_CONFIG.credit_card).toBeDefined();
      expect(PAYMENT_METHOD_CONFIG.credit_card.enabled).toBe(true);
      expect(PAYMENT_METHOD_CONFIG.credit_card.name).toBe('Cartão de Crédito');
      expect(PAYMENT_METHOD_CONFIG.credit_card.icon).toBe('card-outline');
      expect(PAYMENT_METHOD_CONFIG.credit_card.maxInstallments).toBe(12);
      expect(PAYMENT_METHOD_CONFIG.credit_card.interestFreeLimit).toBe(3);
      expect(PAYMENT_METHOD_CONFIG.credit_card.benefits).toBeInstanceOf(Array);
      expect(PAYMENT_METHOD_CONFIG.credit_card.benefits.length).toBeGreaterThan(0);
    });
  });

  describe('CURRENCY_SETTINGS', () => {
    it('should have BRL configuration', () => {
      expect(CURRENCY_SETTINGS.code).toBe('BRL');
      expect(CURRENCY_SETTINGS.symbol).toBe('R$');
      expect(CURRENCY_SETTINGS.locale).toBe('pt-BR');
      expect(CURRENCY_SETTINGS.decimalPlaces).toBe(2);
    });
  });

  describe('PAGSEGURO_FEATURES', () => {
    it('should have all payment method flags', () => {
      expect(typeof PAGSEGURO_FEATURES.enablePix).toBe('boolean');
      expect(typeof PAGSEGURO_FEATURES.enableBoleto).toBe('boolean');
      expect(typeof PAGSEGURO_FEATURES.enableCreditCard).toBe('boolean');
      expect(typeof PAGSEGURO_FEATURES.enableSubscriptions).toBe('boolean');
      expect(typeof PAGSEGURO_FEATURES.enableInstallments).toBe('boolean');
      expect(typeof PAGSEGURO_FEATURES.enableSandbox).toBe('boolean');
    });

    it('should have A/B testing flags', () => {
      expect(typeof PAGSEGURO_FEATURES.showPaymentMethodComparison).toBe('boolean');
      expect(typeof PAGSEGURO_FEATURES.highlightRecommendedMethod).toBe('boolean');
    });

    it('should have pix as default payment method', () => {
      expect(PAGSEGURO_FEATURES.defaultPaymentMethod).toBe('pix');
    });

    it('should enable all payment methods by default', () => {
      expect(PAGSEGURO_FEATURES.enablePix).toBe(true);
      expect(PAGSEGURO_FEATURES.enableBoleto).toBe(true);
      expect(PAGSEGURO_FEATURES.enableCreditCard).toBe(true);
    });
  });

  describe('VALIDATION_RULES', () => {
    it('should have CPF validation rules', () => {
      expect(VALIDATION_RULES.cpf).toBeDefined();
      expect(VALIDATION_RULES.cpf.minLength).toBe(11);
      expect(VALIDATION_RULES.cpf.maxLength).toBe(11);
      expect(VALIDATION_RULES.cpf.pattern).toBeInstanceOf(RegExp);
    });

    it('should have phone validation rules', () => {
      expect(VALIDATION_RULES.phone).toBeDefined();
      expect(VALIDATION_RULES.phone.areaCodeLength).toBe(2);
      expect(VALIDATION_RULES.phone.minNumberLength).toBe(8);
      expect(VALIDATION_RULES.phone.maxNumberLength).toBe(9);
    });

    it('should have CEP validation rules', () => {
      expect(VALIDATION_RULES.cep).toBeDefined();
      expect(VALIDATION_RULES.cep.length).toBe(8);
      expect(VALIDATION_RULES.cep.pattern).toBeInstanceOf(RegExp);
    });

    it('should have credit card validation rules', () => {
      expect(VALIDATION_RULES.creditCard).toBeDefined();
      expect(VALIDATION_RULES.creditCard.minLength).toBe(13);
      expect(VALIDATION_RULES.creditCard.maxLength).toBe(19);
    });

    it('should validate CPF pattern correctly', () => {
      const pattern = VALIDATION_RULES.cpf.pattern;

      expect(pattern.test('123.456.789-01')).toBe(true);
      expect(pattern.test('12345678901')).toBe(false);
      expect(pattern.test('123.456.789-0')).toBe(false);
    });

    it('should validate CEP pattern correctly', () => {
      const pattern = VALIDATION_RULES.cep.pattern;

      expect(pattern.test('12345-678')).toBe(true);
      expect(pattern.test('12345678')).toBe(true);
      expect(pattern.test('1234-5678')).toBe(false);
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have all required error messages', () => {
      expect(ERROR_MESSAGES.INVALID_CPF).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_PHONE).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_CEP).toBeDefined();
      expect(ERROR_MESSAGES.INVALID_CARD).toBeDefined();
      expect(ERROR_MESSAGES.PAYMENT_DECLINED).toBeDefined();
      expect(ERROR_MESSAGES.INSUFFICIENT_FUNDS).toBeDefined();
      expect(ERROR_MESSAGES.EXPIRED_PIX).toBeDefined();
      expect(ERROR_MESSAGES.EXPIRED_BOLETO).toBeDefined();
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined();
    });

    it('should have messages in Portuguese', () => {
      expect(ERROR_MESSAGES.INVALID_CPF).toContain('inválido');
      expect(ERROR_MESSAGES.NETWORK_ERROR).toContain('conexão');
      expect(ERROR_MESSAGES.PAYMENT_DECLINED).toContain('recusado');
    });
  });

  describe('SUCCESS_MESSAGES', () => {
    it('should have all required success messages', () => {
      expect(SUCCESS_MESSAGES.PIX_GENERATED).toBeDefined();
      expect(SUCCESS_MESSAGES.BOLETO_GENERATED).toBeDefined();
      expect(SUCCESS_MESSAGES.CARD_AUTHORIZED).toBeDefined();
      expect(SUCCESS_MESSAGES.SUBSCRIPTION_CREATED).toBeDefined();
    });

    it('should have messages in Portuguese', () => {
      expect(SUCCESS_MESSAGES.PIX_GENERATED).toContain('sucesso');
      expect(SUCCESS_MESSAGES.BOLETO_GENERATED).toContain('sucesso');
      expect(SUCCESS_MESSAGES.CARD_AUTHORIZED).toContain('autorizado');
    });

    it('should have template placeholder for subscription message', () => {
      expect(SUCCESS_MESSAGES.SUBSCRIPTION_CREATED).toContain('{{plan}}');
    });
  });

  describe('TIMING_CONFIG', () => {
    it('should have valid polling configuration', () => {
      expect(TIMING_CONFIG.pixPollingIntervalMs).toBe(3000);
      expect(TIMING_CONFIG.maxPixPollingAttempts).toBe(60);
    });

    it('should have valid timeout configuration', () => {
      expect(TIMING_CONFIG.apiTimeoutMs).toBe(30000);
    });

    it('should have valid retry configuration', () => {
      expect(TIMING_CONFIG.maxRetries).toBe(3);
      expect(TIMING_CONFIG.retryDelayMs).toBe(1000);
    });

    it('should poll for approximately 3 minutes', () => {
      const totalPollingTime = TIMING_CONFIG.pixPollingIntervalMs * TIMING_CONFIG.maxPixPollingAttempts;

      expect(totalPollingTime).toBe(180000); // 3 minutes
    });
  });

  describe('ANALYTICS_EVENTS', () => {
    it('should have all required event names', () => {
      expect(ANALYTICS_EVENTS.PAYMENT_METHOD_SELECTED).toBeDefined();
      expect(ANALYTICS_EVENTS.PIX_CODE_GENERATED).toBeDefined();
      expect(ANALYTICS_EVENTS.PIX_CODE_COPIED).toBeDefined();
      expect(ANALYTICS_EVENTS.BOLETO_GENERATED).toBeDefined();
      expect(ANALYTICS_EVENTS.CARD_FORM_SUBMITTED).toBeDefined();
      expect(ANALYTICS_EVENTS.PAYMENT_SUCCESS).toBeDefined();
      expect(ANALYTICS_EVENTS.PAYMENT_FAILED).toBeDefined();
      expect(ANALYTICS_EVENTS.INSTALLMENT_SELECTED).toBeDefined();
    });

    it('should have pagseguro prefix for all events', () => {
      Object.values(ANALYTICS_EVENTS).forEach((event) => {
        expect(event).toMatch(/^pagseguro_/);
      });
    });

    it('should have unique event names', () => {
      const events = Object.values(ANALYTICS_EVENTS);
      const uniqueEvents = new Set(events);

      expect(events.length).toBe(uniqueEvents.size);
    });
  });
});
