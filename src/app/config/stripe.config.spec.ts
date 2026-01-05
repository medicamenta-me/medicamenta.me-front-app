import {
  getStripeConfig,
  getStripePriceId,
  STRIPE_PRICES,
  STRIPE_FEATURES,
  CURRENCY_SETTINGS,
  StripeConfig
} from './stripe.config';

describe('StripeConfig', () => {
  describe('getStripeConfig', () => {
    it('should return a valid configuration object', () => {
      const config = getStripeConfig();

      expect(config).toBeDefined();
      expect(config.publishableKey).toBeDefined();
      expect(config.mode).toMatch(/^(test|live)$/);
      expect(config.apiVersion).toBeDefined();
    });

    it('should have valid API version format', () => {
      const config = getStripeConfig();

      // Stripe API versions follow YYYY-MM-DD format
      expect(config.apiVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should have trial period days', () => {
      const config = getStripeConfig();

      expect(config.trialPeriodDays).toBeDefined();
      expect(config.trialPeriodDays).toBe(7);
    });

    it('should have success URL', () => {
      const config = getStripeConfig();

      expect(config.successUrl).toBeDefined();
      expect(config.successUrl).toContain('/payment/success');
    });

    it('should have cancel URL', () => {
      const config = getStripeConfig();

      expect(config.cancelUrl).toBeDefined();
      expect(config.cancelUrl).toContain('/payment/cancel');
    });

    it('should have webhook secret', () => {
      const config = getStripeConfig();

      expect(config.webhookSecret).toBeDefined();
    });

    it('should return test mode in development', () => {
      const config = getStripeConfig();
      // In test environment, should be test mode
      if (config.publishableKey.includes('test') || config.publishableKey.includes('pk_test')) {
        expect(config.mode).toBe('test');
      }
    });

    it('should have all required properties', () => {
      const config = getStripeConfig();
      const requiredKeys: (keyof StripeConfig)[] = [
        'publishableKey',
        'mode',
        'apiVersion',
        'webhookSecret',
        'trialPeriodDays',
        'successUrl',
        'cancelUrl'
      ];

      requiredKeys.forEach((key) => {
        expect(config[key]).toBeDefined();
      });
    });

    it('should have non-negative trial period', () => {
      const config = getStripeConfig();

      expect(config.trialPeriodDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStripePriceId', () => {
    describe('premium plan', () => {
      it('should return premium monthly test price ID', () => {
        const priceId = getStripePriceId('premium', 'monthly', 'test');

        expect(priceId).toBe(STRIPE_PRICES.premium.monthly.test);
        expect(priceId).toContain('test');
        expect(priceId).toContain('premium');
        expect(priceId).toContain('monthly');
      });

      it('should return premium yearly test price ID', () => {
        const priceId = getStripePriceId('premium', 'yearly', 'test');

        expect(priceId).toBe(STRIPE_PRICES.premium.yearly.test);
        expect(priceId).toContain('test');
        expect(priceId).toContain('premium');
        expect(priceId).toContain('yearly');
      });

      it('should return premium monthly live price ID', () => {
        const priceId = getStripePriceId('premium', 'monthly', 'live');

        expect(priceId).toBe(STRIPE_PRICES.premium.monthly.live);
        expect(priceId).toContain('live');
        expect(priceId).toContain('premium');
        expect(priceId).toContain('monthly');
      });

      it('should return premium yearly live price ID', () => {
        const priceId = getStripePriceId('premium', 'yearly', 'live');

        expect(priceId).toBe(STRIPE_PRICES.premium.yearly.live);
        expect(priceId).toContain('live');
        expect(priceId).toContain('premium');
        expect(priceId).toContain('yearly');
      });
    });

    describe('family plan', () => {
      it('should return family monthly test price ID', () => {
        const priceId = getStripePriceId('family', 'monthly', 'test');

        expect(priceId).toBe(STRIPE_PRICES.family.monthly.test);
        expect(priceId).toContain('test');
        expect(priceId).toContain('family');
        expect(priceId).toContain('monthly');
      });

      it('should return family yearly test price ID', () => {
        const priceId = getStripePriceId('family', 'yearly', 'test');

        expect(priceId).toBe(STRIPE_PRICES.family.yearly.test);
        expect(priceId).toContain('test');
        expect(priceId).toContain('family');
        expect(priceId).toContain('yearly');
      });

      it('should return family monthly live price ID', () => {
        const priceId = getStripePriceId('family', 'monthly', 'live');

        expect(priceId).toBe(STRIPE_PRICES.family.monthly.live);
        expect(priceId).toContain('live');
        expect(priceId).toContain('family');
        expect(priceId).toContain('monthly');
      });

      it('should return family yearly live price ID', () => {
        const priceId = getStripePriceId('family', 'yearly', 'live');

        expect(priceId).toBe(STRIPE_PRICES.family.yearly.live);
        expect(priceId).toContain('live');
        expect(priceId).toContain('family');
        expect(priceId).toContain('yearly');
      });
    });

    it('should default to test mode', () => {
      const priceId = getStripePriceId('premium', 'monthly');

      expect(priceId).toBe(STRIPE_PRICES.premium.monthly.test);
    });
  });

  describe('STRIPE_PRICES', () => {
    it('should have premium monthly prices', () => {
      expect(STRIPE_PRICES.premium.monthly).toBeDefined();
      expect(STRIPE_PRICES.premium.monthly.test).toBeDefined();
      expect(STRIPE_PRICES.premium.monthly.live).toBeDefined();
    });

    it('should have premium yearly prices', () => {
      expect(STRIPE_PRICES.premium.yearly).toBeDefined();
      expect(STRIPE_PRICES.premium.yearly.test).toBeDefined();
      expect(STRIPE_PRICES.premium.yearly.live).toBeDefined();
    });

    it('should have family monthly prices', () => {
      expect(STRIPE_PRICES.family.monthly).toBeDefined();
      expect(STRIPE_PRICES.family.monthly.test).toBeDefined();
      expect(STRIPE_PRICES.family.monthly.live).toBeDefined();
    });

    it('should have family yearly prices', () => {
      expect(STRIPE_PRICES.family.yearly).toBeDefined();
      expect(STRIPE_PRICES.family.yearly.test).toBeDefined();
      expect(STRIPE_PRICES.family.yearly.live).toBeDefined();
    });

    it('should have price_ prefix for all price IDs', () => {
      expect(STRIPE_PRICES.premium.monthly.test).toMatch(/^price_/);
      expect(STRIPE_PRICES.premium.monthly.live).toMatch(/^price_/);
      expect(STRIPE_PRICES.premium.yearly.test).toMatch(/^price_/);
      expect(STRIPE_PRICES.premium.yearly.live).toMatch(/^price_/);
      expect(STRIPE_PRICES.family.monthly.test).toMatch(/^price_/);
      expect(STRIPE_PRICES.family.monthly.live).toMatch(/^price_/);
      expect(STRIPE_PRICES.family.yearly.test).toMatch(/^price_/);
      expect(STRIPE_PRICES.family.yearly.live).toMatch(/^price_/);
    });

    it('should have unique price IDs', () => {
      const allPriceIds = [
        STRIPE_PRICES.premium.monthly.test,
        STRIPE_PRICES.premium.monthly.live,
        STRIPE_PRICES.premium.yearly.test,
        STRIPE_PRICES.premium.yearly.live,
        STRIPE_PRICES.family.monthly.test,
        STRIPE_PRICES.family.monthly.live,
        STRIPE_PRICES.family.yearly.test,
        STRIPE_PRICES.family.yearly.live
      ];
      const uniqueIds = new Set(allPriceIds);

      expect(allPriceIds.length).toBe(uniqueIds.size);
    });
  });

  describe('STRIPE_FEATURES', () => {
    it('should have billing portal enabled', () => {
      expect(STRIPE_FEATURES.enableBillingPortal).toBe(true);
    });

    it('should have trial enabled', () => {
      expect(STRIPE_FEATURES.enableTrial).toBe(true);
    });

    it('should allow payment method update', () => {
      expect(STRIPE_FEATURES.allowPaymentMethodUpdate).toBe(true);
    });

    it('should allow cancellation', () => {
      expect(STRIPE_FEATURES.allowCancellation).toBe(true);
    });

    it('should send receipts', () => {
      expect(STRIPE_FEATURES.sendReceipts).toBe(true);
    });

    it('should enable promo codes', () => {
      expect(STRIPE_FEATURES.enablePromoCodes).toBe(true);
    });

    it('should have all features as boolean', () => {
      expect(typeof STRIPE_FEATURES.enableBillingPortal).toBe('boolean');
      expect(typeof STRIPE_FEATURES.enableTrial).toBe('boolean');
      expect(typeof STRIPE_FEATURES.allowPaymentMethodUpdate).toBe('boolean');
      expect(typeof STRIPE_FEATURES.allowCancellation).toBe('boolean');
      expect(typeof STRIPE_FEATURES.sendReceipts).toBe('boolean');
      expect(typeof STRIPE_FEATURES.enablePromoCodes).toBe('boolean');
    });
  });

  describe('CURRENCY_SETTINGS', () => {
    it('should have BRL as default currency', () => {
      expect(CURRENCY_SETTINGS.default).toBe('BRL');
    });

    it('should support BRL and USD', () => {
      expect(CURRENCY_SETTINGS.supported).toContain('BRL');
      expect(CURRENCY_SETTINGS.supported).toContain('USD');
    });

    it('should have exactly 2 supported currencies', () => {
      expect(CURRENCY_SETTINGS.supported.length).toBe(2);
    });

    it('should have symbol for BRL', () => {
      expect(CURRENCY_SETTINGS.symbols.BRL).toBe('R$');
    });

    it('should have symbol for USD', () => {
      expect(CURRENCY_SETTINGS.symbols.USD).toBe('$');
    });

    it('should have symbols for all supported currencies', () => {
      CURRENCY_SETTINGS.supported.forEach((currency) => {
        expect(CURRENCY_SETTINGS.symbols[currency]).toBeDefined();
      });
    });
  });

  describe('Configuration consistency', () => {
    it('should have matching structure between premium and family plans', () => {
      expect(Object.keys(STRIPE_PRICES.premium)).toEqual(Object.keys(STRIPE_PRICES.family));
      expect(Object.keys(STRIPE_PRICES.premium.monthly)).toEqual(
        Object.keys(STRIPE_PRICES.family.monthly)
      );
      expect(Object.keys(STRIPE_PRICES.premium.yearly)).toEqual(
        Object.keys(STRIPE_PRICES.family.yearly)
      );
    });

    it('should have test and live variants for all prices', () => {
      const variants = ['test', 'live'];

      variants.forEach((variant) => {
        expect((STRIPE_PRICES.premium.monthly as any)[variant]).toBeDefined();
        expect((STRIPE_PRICES.premium.yearly as any)[variant]).toBeDefined();
        expect((STRIPE_PRICES.family.monthly as any)[variant]).toBeDefined();
        expect((STRIPE_PRICES.family.yearly as any)[variant]).toBeDefined();
      });
    });
  });
});
