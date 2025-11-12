import { SubscriptionPlan, BillingInterval } from './subscription.model';

/**
 * Stripe Payment Models
 * Types and interfaces for Stripe integration
 */

/**
 * Stripe Customer
 */
export interface StripeCustomer {
  id: string; // Stripe customer ID (cus_xxx)
  userId: string; // Firebase user ID
  email: string;
  name: string;
  created: number; // Unix timestamp
  defaultPaymentMethod?: string;
  metadata: {
    firebaseUid: string;
    plan: SubscriptionPlan;
  };
}

/**
 * Stripe Subscription
 */
export interface StripeSubscription {
  id: string; // Stripe subscription ID (sub_xxx)
  customerId: string;
  status: StripeSubscriptionStatus;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt?: number;
  items: StripeSubscriptionItem[];
  metadata: {
    firebaseUid: string;
    plan: SubscriptionPlan;
  };
}

export type StripeSubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing';

export interface StripeSubscriptionItem {
  id: string;
  priceId: string;
  quantity: number;
}

/**
 * Stripe Price IDs (configured in Stripe Dashboard)
 */
export const STRIPE_PRICE_IDS = {
  premium: {
    monthly: 'price_premium_monthly_brl', // Replace with actual Stripe price ID
    yearly: 'price_premium_yearly_brl'
  },
  family: {
    monthly: 'price_family_monthly_brl',
    yearly: 'price_family_yearly_brl'
  }
  // Enterprise is custom, handled separately
} as const;

/**
 * Stripe Checkout Session
 */
export interface StripeCheckoutSession {
  id: string;
  url: string; // Redirect user to this URL
  customerId?: string;
  subscriptionId?: string;
  status: 'open' | 'complete' | 'expired';
  metadata: {
    firebaseUid: string;
    plan: SubscriptionPlan;
    billingInterval: BillingInterval;
  };
}

/**
 * Create Checkout Session Request
 */
export interface CreateCheckoutSessionRequest {
  userId: string;
  email: string;
  plan: SubscriptionPlan;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number; // Default 7 days
}

/**
 * Stripe Payment Intent
 */
export interface StripePaymentIntent {
  id: string;
  amount: number; // In cents
  currency: string;
  status: StripePaymentIntentStatus;
  customerId?: string;
  receiptEmail?: string;
  metadata: {
    firebaseUid: string;
    plan?: SubscriptionPlan;
  };
}

export type StripePaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'canceled';

/**
 * Stripe Invoice
 */
export interface StripeInvoice {
  id: string;
  customerId: string;
  subscriptionId: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  hostedInvoiceUrl?: string; // URL to view invoice
  invoicePdf?: string; // URL to download PDF
}

/**
 * Stripe Webhook Event
 */
export interface StripeWebhookEvent {
  id: string;
  type: StripeWebhookEventType;
  data: {
    object: any; // Type depends on event type
  };
  created: number;
}

export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed';

/**
 * Billing Portal Session
 */
export interface StripeBillingPortalSession {
  id: string;
  url: string; // Redirect user to this URL
}

/**
 * Stripe Error Response
 */
export interface StripeErrorResponse {
  error: {
    type: string;
    code?: string;
    message: string;
    param?: string;
  };
}

/**
 * Payment Method
 */
export interface StripePaymentMethod {
  id: string;
  type: 'card' | 'boleto' | 'pix';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails: {
    name?: string;
    email?: string;
  };
}

/**
 * Subscription Update Request
 */
export interface UpdateSubscriptionRequest {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
}

/**
 * Cancel Subscription Request
 */
export interface CancelSubscriptionRequest {
  subscriptionId: string;
  immediately?: boolean; // If false, cancel at period end
  reason?: string;
}
