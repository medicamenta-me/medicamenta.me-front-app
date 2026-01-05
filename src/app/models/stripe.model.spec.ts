/**
 * @file stripe.model.spec.ts
 * @description Testes unitários para o modelo Stripe
 * @coverage 100% target
 */

import {
  StripeCustomer,
  StripeSubscription,
  StripeSubscriptionStatus,
  StripeSubscriptionItem,
  STRIPE_PRICE_IDS,
  StripeCheckoutSession,
  CreateCheckoutSessionRequest,
  StripePaymentIntent,
  StripePaymentIntentStatus,
  StripeInvoice,
  StripeWebhookEvent,
  StripeWebhookEventType,
  StripeBillingPortalSession,
  StripeErrorResponse,
  StripePaymentMethod,
  UpdateSubscriptionRequest,
  CancelSubscriptionRequest
} from './stripe.model';

describe('Stripe Model', () => {

  // ==========================================================================
  // STRIPE_PRICE_IDS CONSTANT TESTS
  // ==========================================================================

  describe('STRIPE_PRICE_IDS', () => {
    describe('Premium plan', () => {
      it('should have monthly price ID', () => {
        expect(STRIPE_PRICE_IDS.premium.monthly).toBe('price_premium_monthly_brl');
      });

      it('should have yearly price ID', () => {
        expect(STRIPE_PRICE_IDS.premium.yearly).toBe('price_premium_yearly_brl');
      });
    });

    describe('Family plan', () => {
      it('should have monthly price ID', () => {
        expect(STRIPE_PRICE_IDS.family.monthly).toBe('price_family_monthly_brl');
      });

      it('should have yearly price ID', () => {
        expect(STRIPE_PRICE_IDS.family.yearly).toBe('price_family_yearly_brl');
      });
    });

    it('should have all price IDs as strings', () => {
      expect(typeof STRIPE_PRICE_IDS.premium.monthly).toBe('string');
      expect(typeof STRIPE_PRICE_IDS.premium.yearly).toBe('string');
      expect(typeof STRIPE_PRICE_IDS.family.monthly).toBe('string');
      expect(typeof STRIPE_PRICE_IDS.family.yearly).toBe('string');
    });

    it('should have non-empty price IDs', () => {
      expect(STRIPE_PRICE_IDS.premium.monthly.length).toBeGreaterThan(0);
      expect(STRIPE_PRICE_IDS.premium.yearly.length).toBeGreaterThan(0);
      expect(STRIPE_PRICE_IDS.family.monthly.length).toBeGreaterThan(0);
      expect(STRIPE_PRICE_IDS.family.yearly.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // StripeCustomer INTERFACE TESTS
  // ==========================================================================

  describe('StripeCustomer Interface', () => {
    it('should create valid customer', () => {
      const customer: StripeCustomer = {
        id: 'cus_123456789',
        userId: 'firebase-uid-123',
        email: 'user@example.com',
        name: 'João Silva',
        created: Date.now() / 1000,
        metadata: {
          firebaseUid: 'firebase-uid-123',
          plan: 'premium'
        }
      };

      expect(customer.id).toContain('cus_');
      expect(customer.userId).toBe('firebase-uid-123');
      expect(customer.email).toContain('@');
    });

    it('should create customer with default payment method', () => {
      const customer: StripeCustomer = {
        id: 'cus_987654321',
        userId: 'firebase-uid-456',
        email: 'user2@example.com',
        name: 'Maria Santos',
        created: Date.now() / 1000,
        defaultPaymentMethod: 'pm_card_visa',
        metadata: {
          firebaseUid: 'firebase-uid-456',
          plan: 'family'
        }
      };

      expect(customer.defaultPaymentMethod).toBe('pm_card_visa');
    });
  });

  // ==========================================================================
  // StripeSubscription INTERFACE TESTS
  // ==========================================================================

  describe('StripeSubscription Interface', () => {
    it('should create active subscription', () => {
      const subscription: StripeSubscription = {
        id: 'sub_123456789',
        customerId: 'cus_123456789',
        status: 'active',
        currentPeriodStart: Math.floor(Date.now() / 1000),
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancelAtPeriodEnd: false,
        items: [
          {
            id: 'si_123',
            priceId: 'price_premium_monthly_brl',
            quantity: 1
          }
        ],
        metadata: {
          firebaseUid: 'firebase-uid-123',
          plan: 'premium'
        }
      };

      expect(subscription.id).toContain('sub_');
      expect(subscription.status).toBe('active');
      expect(subscription.cancelAtPeriodEnd).toBe(false);
    });

    it('should create canceled subscription', () => {
      const subscription: StripeSubscription = {
        id: 'sub_canceled',
        customerId: 'cus_123',
        status: 'canceled',
        currentPeriodStart: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
        currentPeriodEnd: Math.floor(Date.now() / 1000),
        cancelAtPeriodEnd: false,
        canceledAt: Math.floor(Date.now() / 1000),
        items: [],
        metadata: {
          firebaseUid: 'firebase-uid',
          plan: 'premium'
        }
      };

      expect(subscription.status).toBe('canceled');
      expect(subscription.canceledAt).toBeDefined();
    });

    it('should create subscription pending cancellation', () => {
      const subscription: StripeSubscription = {
        id: 'sub_pending_cancel',
        customerId: 'cus_456',
        status: 'active',
        currentPeriodStart: Math.floor(Date.now() / 1000),
        currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancelAtPeriodEnd: true,
        items: [],
        metadata: {
          firebaseUid: 'firebase-uid',
          plan: 'family'
        }
      };

      expect(subscription.status).toBe('active');
      expect(subscription.cancelAtPeriodEnd).toBe(true);
    });

    it('should handle all subscription statuses', () => {
      const statuses: StripeSubscriptionStatus[] = [
        'active',
        'past_due',
        'unpaid',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'trialing'
      ];

      statuses.forEach(status => {
        const subscription: StripeSubscription = {
          id: `sub_${status}`,
          customerId: 'cus_test',
          status,
          currentPeriodStart: 0,
          currentPeriodEnd: 0,
          cancelAtPeriodEnd: false,
          items: [],
          metadata: { firebaseUid: 'uid', plan: 'premium' }
        };
        expect(subscription.status).toBe(status);
      });
    });
  });

  // ==========================================================================
  // StripeCheckoutSession INTERFACE TESTS
  // ==========================================================================

  describe('StripeCheckoutSession Interface', () => {
    it('should create open checkout session', () => {
      const session: StripeCheckoutSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        status: 'open',
        metadata: {
          firebaseUid: 'firebase-uid',
          plan: 'premium',
          billingInterval: 'monthly'
        }
      };

      expect(session.id).toContain('cs_');
      expect(session.url).toContain('stripe.com');
      expect(session.status).toBe('open');
    });

    it('should create complete checkout session', () => {
      const session: StripeCheckoutSession = {
        id: 'cs_live_456',
        url: 'https://checkout.stripe.com/pay/cs_live_456',
        customerId: 'cus_123',
        subscriptionId: 'sub_456',
        status: 'complete',
        metadata: {
          firebaseUid: 'firebase-uid',
          plan: 'family',
          billingInterval: 'yearly'
        }
      };

      expect(session.status).toBe('complete');
      expect(session.customerId).toBeDefined();
      expect(session.subscriptionId).toBeDefined();
    });

    it('should create expired checkout session', () => {
      const session: StripeCheckoutSession = {
        id: 'cs_expired',
        url: 'https://checkout.stripe.com/pay/cs_expired',
        status: 'expired',
        metadata: {
          firebaseUid: 'firebase-uid',
          plan: 'premium',
          billingInterval: 'monthly'
        }
      };

      expect(session.status).toBe('expired');
    });
  });

  // ==========================================================================
  // CreateCheckoutSessionRequest INTERFACE TESTS
  // ==========================================================================

  describe('CreateCheckoutSessionRequest Interface', () => {
    it('should create basic request', () => {
      const request: CreateCheckoutSessionRequest = {
        userId: 'user-123',
        email: 'user@example.com',
        plan: 'premium',
        billingInterval: 'monthly',
        successUrl: 'https://app.medicamenta.me/success',
        cancelUrl: 'https://app.medicamenta.me/cancel'
      };

      expect(request.userId).toBe('user-123');
      expect(request.plan).toBe('premium');
      expect(request.billingInterval).toBe('monthly');
    });

    it('should create request with trial period', () => {
      const request: CreateCheckoutSessionRequest = {
        userId: 'user-456',
        email: 'user2@example.com',
        plan: 'family',
        billingInterval: 'yearly',
        successUrl: 'https://app.medicamenta.me/success',
        cancelUrl: 'https://app.medicamenta.me/cancel',
        trialPeriodDays: 7
      };

      expect(request.trialPeriodDays).toBe(7);
    });

    it('should create request with custom trial period', () => {
      const request: CreateCheckoutSessionRequest = {
        userId: 'user-789',
        email: 'user3@example.com',
        plan: 'premium',
        billingInterval: 'monthly',
        successUrl: 'https://app.medicamenta.me/success',
        cancelUrl: 'https://app.medicamenta.me/cancel',
        trialPeriodDays: 14
      };

      expect(request.trialPeriodDays).toBe(14);
    });
  });

  // ==========================================================================
  // StripePaymentIntent INTERFACE TESTS
  // ==========================================================================

  describe('StripePaymentIntent Interface', () => {
    it('should create payment intent', () => {
      const paymentIntent: StripePaymentIntent = {
        id: 'pi_123456',
        amount: 2990,
        currency: 'brl',
        status: 'succeeded',
        customerId: 'cus_123',
        receiptEmail: 'user@example.com',
        metadata: {
          firebaseUid: 'firebase-uid',
          plan: 'premium'
        }
      };

      expect(paymentIntent.id).toContain('pi_');
      expect(paymentIntent.amount).toBe(2990);
      expect(paymentIntent.currency).toBe('brl');
      expect(paymentIntent.status).toBe('succeeded');
    });

    it('should handle all payment intent statuses', () => {
      const statuses: StripePaymentIntentStatus[] = [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'succeeded',
        'canceled'
      ];

      statuses.forEach(status => {
        const pi: StripePaymentIntent = {
          id: `pi_${status}`,
          amount: 1000,
          currency: 'brl',
          status,
          metadata: { firebaseUid: 'uid' }
        };
        expect(pi.status).toBe(status);
      });
    });
  });

  // ==========================================================================
  // StripeInvoice INTERFACE TESTS
  // ==========================================================================

  describe('StripeInvoice Interface', () => {
    it('should create paid invoice', () => {
      const invoice: StripeInvoice = {
        id: 'in_123456',
        customerId: 'cus_123',
        subscriptionId: 'sub_123',
        status: 'paid',
        amountDue: 2990,
        amountPaid: 2990,
        currency: 'brl',
        created: Math.floor(Date.now() / 1000),
        periodStart: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
        periodEnd: Math.floor(Date.now() / 1000),
        hostedInvoiceUrl: 'https://invoice.stripe.com/in_123456',
        invoicePdf: 'https://invoice.stripe.com/in_123456.pdf'
      };

      expect(invoice.id).toContain('in_');
      expect(invoice.status).toBe('paid');
      expect(invoice.amountPaid).toBe(invoice.amountDue);
    });

    it('should create open invoice', () => {
      const invoice: StripeInvoice = {
        id: 'in_open',
        customerId: 'cus_456',
        subscriptionId: 'sub_456',
        status: 'open',
        amountDue: 4990,
        amountPaid: 0,
        currency: 'brl',
        created: Math.floor(Date.now() / 1000),
        periodStart: Math.floor(Date.now() / 1000),
        periodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      };

      expect(invoice.status).toBe('open');
      expect(invoice.amountPaid).toBe(0);
    });

    it('should handle all invoice statuses', () => {
      const statuses: Array<'draft' | 'open' | 'paid' | 'uncollectible' | 'void'> = [
        'draft',
        'open',
        'paid',
        'uncollectible',
        'void'
      ];

      statuses.forEach(status => {
        const invoice: StripeInvoice = {
          id: `in_${status}`,
          customerId: 'cus_test',
          subscriptionId: 'sub_test',
          status,
          amountDue: 1000,
          amountPaid: status === 'paid' ? 1000 : 0,
          currency: 'brl',
          created: 0,
          periodStart: 0,
          periodEnd: 0
        };
        expect(invoice.status).toBe(status);
      });
    });
  });

  // ==========================================================================
  // StripeWebhookEvent INTERFACE TESTS
  // ==========================================================================

  describe('StripeWebhookEvent Interface', () => {
    it('should create webhook event', () => {
      const event: StripeWebhookEvent = {
        id: 'evt_123456',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            customer: 'cus_123'
          }
        },
        created: Math.floor(Date.now() / 1000)
      };

      expect(event.id).toContain('evt_');
      expect(event.type).toBe('checkout.session.completed');
    });

    it('should handle all webhook event types', () => {
      const eventTypes: StripeWebhookEventType[] = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'customer.subscription.trial_will_end',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed'
      ];

      eventTypes.forEach(type => {
        const event: StripeWebhookEvent = {
          id: 'evt_test',
          type,
          data: { object: {} },
          created: 0
        };
        expect(event.type).toBe(type);
      });
    });
  });

  // ==========================================================================
  // StripeBillingPortalSession INTERFACE TESTS
  // ==========================================================================

  describe('StripeBillingPortalSession Interface', () => {
    it('should create billing portal session', () => {
      const session: StripeBillingPortalSession = {
        id: 'bps_123456',
        url: 'https://billing.stripe.com/session/bps_123456'
      };

      expect(session.id).toContain('bps_');
      expect(session.url).toContain('billing.stripe.com');
    });
  });

  // ==========================================================================
  // StripeErrorResponse INTERFACE TESTS
  // ==========================================================================

  describe('StripeErrorResponse Interface', () => {
    it('should create basic error response', () => {
      const error: StripeErrorResponse = {
        error: {
          type: 'card_error',
          message: 'Your card was declined'
        }
      };

      expect(error.error.type).toBe('card_error');
      expect(error.error.message).toBe('Your card was declined');
    });

    it('should create error with code', () => {
      const error: StripeErrorResponse = {
        error: {
          type: 'invalid_request_error',
          code: 'invalid_email',
          message: 'Invalid email address'
        }
      };

      expect(error.error.code).toBe('invalid_email');
    });

    it('should create error with param', () => {
      const error: StripeErrorResponse = {
        error: {
          type: 'invalid_request_error',
          message: 'Invalid parameter',
          param: 'customer_email'
        }
      };

      expect(error.error.param).toBe('customer_email');
    });
  });

  // ==========================================================================
  // StripePaymentMethod INTERFACE TESTS
  // ==========================================================================

  describe('StripePaymentMethod Interface', () => {
    it('should create card payment method', () => {
      const pm: StripePaymentMethod = {
        id: 'pm_card_123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2025
        },
        billingDetails: {
          name: 'João Silva',
          email: 'joao@example.com'
        }
      };

      expect(pm.type).toBe('card');
      expect(pm.card?.brand).toBe('visa');
      expect(pm.card?.last4).toBe('4242');
    });

    it('should create PIX payment method', () => {
      const pm: StripePaymentMethod = {
        id: 'pm_pix_123',
        type: 'pix',
        billingDetails: {
          name: 'Maria Santos',
          email: 'maria@example.com'
        }
      };

      expect(pm.type).toBe('pix');
      expect(pm.card).toBeUndefined();
    });

    it('should create boleto payment method', () => {
      const pm: StripePaymentMethod = {
        id: 'pm_boleto_123',
        type: 'boleto',
        billingDetails: {
          name: 'Pedro Oliveira'
        }
      };

      expect(pm.type).toBe('boleto');
    });

    it('should handle different card brands', () => {
      const brands = ['visa', 'mastercard', 'amex', 'elo', 'hipercard'];
      
      brands.forEach(brand => {
        const pm: StripePaymentMethod = {
          id: `pm_${brand}`,
          type: 'card',
          card: {
            brand,
            last4: '0000',
            expMonth: 1,
            expYear: 2030
          },
          billingDetails: {}
        };
        expect(pm.card?.brand).toBe(brand);
      });
    });
  });

  // ==========================================================================
  // UpdateSubscriptionRequest INTERFACE TESTS
  // ==========================================================================

  describe('UpdateSubscriptionRequest Interface', () => {
    it('should create request to update price', () => {
      const request: UpdateSubscriptionRequest = {
        subscriptionId: 'sub_123',
        priceId: 'price_family_monthly_brl'
      };

      expect(request.subscriptionId).toBe('sub_123');
      expect(request.priceId).toBeDefined();
    });

    it('should create request to cancel at period end', () => {
      const request: UpdateSubscriptionRequest = {
        subscriptionId: 'sub_456',
        cancelAtPeriodEnd: true
      };

      expect(request.cancelAtPeriodEnd).toBe(true);
    });

    it('should create request with both options', () => {
      const request: UpdateSubscriptionRequest = {
        subscriptionId: 'sub_789',
        priceId: 'price_premium_yearly_brl',
        cancelAtPeriodEnd: false
      };

      expect(request.priceId).toBeDefined();
      expect(request.cancelAtPeriodEnd).toBe(false);
    });
  });

  // ==========================================================================
  // CancelSubscriptionRequest INTERFACE TESTS
  // ==========================================================================

  describe('CancelSubscriptionRequest Interface', () => {
    it('should create immediate cancel request', () => {
      const request: CancelSubscriptionRequest = {
        subscriptionId: 'sub_123',
        immediately: true
      };

      expect(request.subscriptionId).toBe('sub_123');
      expect(request.immediately).toBe(true);
    });

    it('should create cancel at period end request', () => {
      const request: CancelSubscriptionRequest = {
        subscriptionId: 'sub_456',
        immediately: false
      };

      expect(request.immediately).toBe(false);
    });

    it('should create cancel request with reason', () => {
      const request: CancelSubscriptionRequest = {
        subscriptionId: 'sub_789',
        reason: 'Too expensive'
      };

      expect(request.reason).toBe('Too expensive');
    });

    it('should create complete cancel request', () => {
      const request: CancelSubscriptionRequest = {
        subscriptionId: 'sub_complete',
        immediately: false,
        reason: 'Switching to a different plan'
      };

      expect(request.subscriptionId).toBe('sub_complete');
      expect(request.immediately).toBe(false);
      expect(request.reason).toContain('Switching');
    });
  });
});
