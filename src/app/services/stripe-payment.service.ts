import { Injectable, inject } from '@angular/core';
import { loadStripe, Stripe, StripeElements, StripeCardElement } from '@stripe/stripe-js';
import { environment } from '../../environments/environment';
import { SubscriptionPlan } from '../models/subscription.model';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LogService } from './log.service';

/**
 * Billing Cycle for Subscriptions
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Stripe Checkout Session Response
 */
export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
}

/**
 * Stripe Subscription Status Response
 */
export interface StripeSubscriptionStatus {
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'unpaid';
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  customerId: string;
  subscriptionId: string;
}

/**
 * Stripe Payment Service
 * Handles all Stripe payment integration including checkout, subscriptions, and webhooks
 */
@Injectable({
  providedIn: 'root'
})
export class StripePaymentService {
  private http = inject(HttpClient);
  private logService = inject(LogService);
  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;
  private cardElement: StripeCardElement | null = null;

  // Cloud Functions base URL
  private readonly functionsUrl = environment.production
    ? 'https://us-central1-medicamenta-me.cloudfunctions.net'
    : 'http://localhost:5001/medicamenta-me/us-central1'; // For local testing

  constructor() {
    this.initializeStripe();
  }

  /**
   * Initialize Stripe with publishable key
   */
  private async initializeStripe(): Promise<void> {
    try {
      this.stripe = await loadStripe(environment.stripe.testPublishableKey);
      
      if (!this.stripe) {
        throw new Error('Failed to load Stripe');
      }
      
      this.logService.info('StripePaymentService', 'Stripe initialized successfully');
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error initializing Stripe', error);
      throw error;
    }
  }

  /**
   * Get Stripe instance
   */
  async getStripe(): Promise<Stripe> {
    if (!this.stripe) {
      await this.initializeStripe();
    }
    
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }
    
    return this.stripe;
  }

  /**
   * Create checkout session and redirect to Stripe Checkout
   * @param plan Subscription plan to purchase
   * @param billingCycle Monthly or yearly billing
   * @param userId User ID for tracking
   * @param successUrl URL to redirect after successful payment
   * @param cancelUrl URL to redirect if user cancels
   */
  async createCheckoutSession(
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    userId: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<void> {
    try {
      if (plan === 'free') {
        throw new Error('Cannot create checkout session for free plan');
      }

      if (plan === 'enterprise') {
        throw new Error('Enterprise plan requires custom pricing. Please contact sales.');
      }

      // Get price ID from environment
      const priceId = this.getPriceId(plan, billingCycle);

      if (!priceId || priceId.includes('REPLACE')) {
        throw new Error(
          'Stripe price ID not configured. Please update environment.ts with your Stripe price IDs.'
        );
      }

      // Default URLs
      const defaultSuccessUrl = `${globalThis.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = `${globalThis.location.origin}/subscription/cancel`;

      // Call Cloud Function to create checkout session
      const response = await firstValueFrom(
        this.http.post<StripeCheckoutSession>(
          `${this.functionsUrl}/createStripeCheckoutSession`,
          {
            priceId,
            userId,
            plan,
            billingCycle,
            successUrl: successUrl || defaultSuccessUrl,
            cancelUrl: cancelUrl || defaultCancelUrl
          }
        )
      );

      // Redirect to Stripe Checkout
      if (response.url) {
        globalThis.location.href = response.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error creating checkout session', error);
      throw error;
    }
  }

  /**
   * Get price ID for plan and billing cycle
   */
  private getPriceId(plan: SubscriptionPlan, billingCycle: BillingCycle): string {
    const prices = environment.stripe.prices;
    
    if (plan === 'premium') {
      return billingCycle === 'monthly' ? prices.premium.monthly : prices.premium.yearly;
    } else if (plan === 'family') {
      return billingCycle === 'monthly' ? prices.family.monthly : prices.family.yearly;
    }
    
    throw new Error(`Invalid plan: ${plan}`);
  }

  /**
   * Get subscription status from Stripe
   * @param subscriptionId Stripe subscription ID
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<StripeSubscriptionStatus> {
    try {
      return await firstValueFrom(
        this.http.get<StripeSubscriptionStatus>(
          `${this.functionsUrl}/getStripeSubscriptionStatus`,
          { params: { subscriptionId } }
        )
      );
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error getting subscription status', error);
      throw error;
    }
  }

  /**
   * Cancel subscription at period end
   * @param subscriptionId Stripe subscription ID
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.functionsUrl}/cancelStripeSubscription`,
          { subscriptionId }
        )
      );
      
      this.logService.info('StripePaymentService', 'Subscription canceled successfully');
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error canceling subscription', error);
      throw error;
    }
  }

  /**
   * Reactivate canceled subscription
   * @param subscriptionId Stripe subscription ID
   */
  async reactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.functionsUrl}/reactivateStripeSubscription`,
          { subscriptionId }
        )
      );
      
      this.logService.info('StripePaymentService', 'Subscription reactivated successfully');
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error reactivating subscription', error);
      throw error;
    }
  }

  /**
   * Create customer portal session for managing subscription
   * @param customerId Stripe customer ID
   * @param returnUrl URL to return to after portal
   */
  async createCustomerPortalSession(customerId: string, returnUrl?: string): Promise<string> {
    try {
      const defaultReturnUrl = `${globalThis.location.origin}/subscription/manage`;
      
      const response = await firstValueFrom(
        this.http.post<{ url: string }>(
          `${this.functionsUrl}/createStripeCustomerPortal`,
          {
            customerId,
            returnUrl: returnUrl || defaultReturnUrl
          }
        )
      );
      
      return response.url;
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error creating customer portal session', error);
      throw error;
    }
  }

  /**
   * Update payment method
   * Opens Stripe Customer Portal for payment method management
   * @param customerId Stripe customer ID
   */
  async updatePaymentMethod(customerId: string): Promise<void> {
    try {
      const portalUrl = await this.createCustomerPortalSession(customerId);
      globalThis.location.href = portalUrl;
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error updating payment method', error);
      throw error;
    }
  }

  /**
   * Get upcoming invoice preview
   * @param customerId Stripe customer ID
   */
  async getUpcomingInvoice(customerId: string): Promise<any> {
    try {
      return await firstValueFrom(
        this.http.get(
          `${this.functionsUrl}/getStripeUpcomingInvoice`,
          { params: { customerId } }
        )
      );
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error getting upcoming invoice', error);
      throw error;
    }
  }

  /**
   * Get payment history
   * @param customerId Stripe customer ID
   * @param limit Number of invoices to retrieve
   */
  async getPaymentHistory(customerId: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ invoices: any[] }>(
          `${this.functionsUrl}/getStripePaymentHistory`,
          { params: { customerId, limit: limit.toString() } }
        )
      );
      
      return response.invoices;
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error getting payment history', error);
      throw error;
    }
  }

  /**
   * Calculate price with discount (if any)
   * @param plan Subscription plan
   * @param billingCycle Monthly or yearly
   * @param couponCode Optional coupon code
   */
  async calculatePrice(
    plan: SubscriptionPlan,
    billingCycle: BillingCycle,
    couponCode?: string
  ): Promise<{ amount: number; currency: string; discount?: number }> {
    try {
      const priceId = this.getPriceId(plan, billingCycle);
      
      return await firstValueFrom(
        this.http.post<{ amount: number; currency: string; discount?: number }>(
          `${this.functionsUrl}/calculateStripePrice`,
          { priceId, couponCode }
        )
      );
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error calculating price', error);
      throw error;
    }
  }

  /**
   * Validate coupon code
   * @param couponCode Coupon code to validate
   */
  async validateCoupon(couponCode: string): Promise<{ valid: boolean; percentOff?: number; amountOff?: number }> {
    try {
      return await firstValueFrom(
        this.http.post<{ valid: boolean; percentOff?: number; amountOff?: number }>(
          `${this.functionsUrl}/validateStripeCoupon`,
          { couponCode }
        )
      );
    } catch (error: any) {
      this.logService.error('StripePaymentService', 'Error validating coupon', error);
      return { valid: false };
    }
  }
}

