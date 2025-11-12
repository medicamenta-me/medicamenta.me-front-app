import { environment } from '../../environments/environment';

/**
 * Stripe Configuration
 * Centralized configuration for Stripe integration
 */

export interface StripeConfig {
  publishableKey: string;
  mode: 'test' | 'live';
  apiVersion: string;
  webhookSecret: string;
  trialPeriodDays: number;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Get Stripe configuration based on environment
 */
export function getStripeConfig(): StripeConfig {
  const hasWindow = globalThis.window !== undefined;
  const baseUrl = hasWindow ? globalThis.window.location.origin : 'https://medicamenta.me';
  
  return {
    // Use test key in development, live key in production
    publishableKey: environment.production
      ? (environment as any).stripe?.livePublishableKey || ''
      : (environment as any).stripe?.testPublishableKey || 'pk_test_YOUR_KEY_HERE',
    
    mode: environment.production ? 'live' : 'test',
    
    // Stripe API version (keep in sync with backend)
    apiVersion: '2023-10-16',
    
    // Webhook secret (different for test/live)
    webhookSecret: environment.production
      ? (environment as any).stripe?.liveWebhookSecret || ''
      : (environment as any).stripe?.testWebhookSecret || 'whsec_YOUR_SECRET_HERE',
    
    // Trial period in days
    trialPeriodDays: 7,
    
    // Redirect URLs after checkout
    successUrl: `${baseUrl}/payment/success`,
    cancelUrl: `${baseUrl}/payment/cancel`
  };
}

/**
 * Stripe Price IDs (must match Stripe Dashboard)
 * These should be configured in Stripe Dashboard and kept in sync
 * Future: Move to Firebase Remote Config for dynamic updates
 */
export const STRIPE_PRICES = {
  premium: {
    monthly: {
      test: 'price_test_premium_monthly_brl',
      live: 'price_live_premium_monthly_brl'
    },
    yearly: {
      test: 'price_test_premium_yearly_brl',
      live: 'price_live_premium_yearly_brl'
    }
  },
  family: {
    monthly: {
      test: 'price_test_family_monthly_brl',
      live: 'price_live_family_monthly_brl'
    },
    yearly: {
      test: 'price_test_family_yearly_brl',
      live: 'price_live_family_yearly_brl'
    }
  }
} as const;

/**
 * Get price ID for plan and billing interval
 */
export function getStripePriceId(
  plan: 'premium' | 'family',
  interval: 'monthly' | 'yearly',
  mode: 'test' | 'live' = 'test'
): string {
  return STRIPE_PRICES[plan][interval][mode];
}

/**
 * Stripe feature flags
 */
export const STRIPE_FEATURES = {
  // Enable Stripe Billing Portal
  enableBillingPortal: true,
  
  // Enable trial period for new subscriptions
  enableTrial: true,
  
  // Allow customers to change payment method
  allowPaymentMethodUpdate: true,
  
  // Allow customers to cancel subscription
  allowCancellation: true,
  
  // Send receipt emails
  sendReceipts: true,
  
  // Enable promotional codes
  enablePromoCodes: true
} as const;

/**
 * Currency settings
 */
export const CURRENCY_SETTINGS = {
  default: 'BRL',
  supported: ['BRL', 'USD'] as const,
  symbols: {
    BRL: 'R$',
    USD: '$'
  }
} as const;
