import { Injectable, inject, signal } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Firestore, doc, setDoc, getDoc, Timestamp } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { getStripeConfig, getStripePriceId, STRIPE_FEATURES } from '../config/stripe.config';
import {
  StripeCustomer,
  StripeSubscription
} from '../models/stripe.model';
import { SubscriptionPlan, BillingInterval } from '../models/subscription.model';
import { LogService } from './log.service';

/**
 * Stripe Payment Service
 * Handles all Stripe-related payment operations
 * 
 * IMPORTANT: This service handles client-side operations only.
 * Server-side operations (webhooks, subscription management) must be
 * handled by Firebase Cloud Functions for security.
 */
@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly logService = inject(LogService);
  
  private readonly config = getStripeConfig();
  private stripeInstance = signal<Stripe | null>(null);
  private readonly isInitialized = signal(false);
  private readonly isLoading = signal(false);

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Stripe SDK
   */
  private async initialize(): Promise<void> {
    try {
      const stripe = await loadStripe(this.config.publishableKey);
      
      if (!stripe) {
        throw new Error('Failed to load Stripe SDK');
      }

      this.stripeInstance.set(stripe);
      this.isInitialized.set(true);
      this.logService.info('StripeService', 'Initialized successfully', { mode: this.config.mode });

    } catch (error: any) {
      this.logService.error('StripeService', 'Initialization error', error as Error);
      throw error;
    }
  }

  /**
   * Create Checkout Session for subscription
   * This creates a session in Firestore that will be processed by Cloud Function
   */
  async createCheckoutSession(
    plan: SubscriptionPlan,
    billingInterval: BillingInterval
  ): Promise<void> {
    if (plan === 'free' || plan === 'enterprise') {
      throw new Error(`Cannot create checkout session for ${plan} plan`);
    }

    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    this.isLoading.set(true);

    try {
      // Get price ID
      const priceId = getStripePriceId(
        plan,
        billingInterval,
        this.config.mode
      );

      // Create checkout session document in Firestore
      // Cloud Function will detect this and create the actual Stripe checkout session
      const sessionRef = doc(
        this.firestore,
        `users/${user.uid}/checkout_sessions/${Date.now()}`
      );

      const sessionData = {
        priceId,
        plan,
        billingInterval,
        email: user.email,
        userId: user.uid,
        successUrl: this.config.successUrl,
        cancelUrl: this.config.cancelUrl,
        trialPeriodDays: STRIPE_FEATURES.enableTrial ? this.config.trialPeriodDays : 0,
        createdAt: Timestamp.now(),
        status: 'pending'
      };

      await setDoc(sessionRef, sessionData);

      this.logService.info('StripeService', 'Checkout session created', { sessionId: sessionRef.id });

      // Track checkout started
      this.analytics.trackCheckoutStarted(plan, billingInterval, 'stripe');
      this.analytics.trackStripeCheckoutOpened(plan, billingInterval);

      // Wait for Cloud Function to process and add sessionId
      await this.waitForCheckoutSession(sessionRef.id, user.uid);

    } catch (error: any) {
      this.logService.error('StripeService', 'Error creating checkout session', error as Error);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Wait for Cloud Function to create Stripe session and return URL
   */
  private async waitForCheckoutSession(
    sessionId: string,
    userId: string,
    maxAttempts = 10
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s

      const sessionRef = doc(this.firestore, `users/${userId}/checkout_sessions/${sessionId}`);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();

      if (sessionData?.['url']) {
        // Redirect to Stripe Checkout
        globalThis.window.location.href = sessionData['url'];
        return;
      }

      if (sessionData?.['error']) {
        throw new Error(sessionData['error']);
      }
    }

    throw new Error('Timeout waiting for checkout session');
  }

  /**
   * Create Billing Portal Session
   * Allows customers to manage their subscription, payment methods, etc.
   */
  async createBillingPortalSession(): Promise<void> {
    if (!STRIPE_FEATURES.enableBillingPortal) {
      throw new Error('Billing portal is disabled');
    }

    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    this.isLoading.set(true);

    try {
      // Create billing portal session in Firestore
      // Cloud Function will detect this and create the actual Stripe portal session
      const portalRef = doc(
        this.firestore,
        `users/${user.uid}/billing_portal_sessions/${Date.now()}`
      );

      const portalData = {
        userId: user.uid,
        returnUrl: globalThis.window.location.origin + '/tabs/profile',
        createdAt: Timestamp.now(),
        status: 'pending'
      };

      await setDoc(portalRef, portalData);

      this.logService.info('StripeService', 'Billing portal session created', { sessionId: portalRef.id });

      // Track billing portal opened
      this.analytics.trackStripeBillingPortalOpened();

      // Wait for Cloud Function to process
      await this.waitForBillingPortalSession(portalRef.id, user.uid);

    } catch (error: any) {
      this.logService.error('StripeService', 'Error creating billing portal session', error as Error);
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Wait for Cloud Function to create portal session and return URL
   */
  private async waitForBillingPortalSession(
    sessionId: string,
    userId: string,
    maxAttempts = 10
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const sessionRef = doc(this.firestore, `users/${userId}/billing_portal_sessions/${sessionId}`);
      const sessionSnap = await getDoc(sessionRef);
      const sessionData = sessionSnap.data();

      if (sessionData?.['url']) {
        // Redirect to Stripe Billing Portal
        globalThis.window.location.href = sessionData['url'];
        return;
      }

      if (sessionData?.['error']) {
        throw new Error(sessionData['error']);
      }
    }

    throw new Error('Timeout waiting for billing portal session');
  }

  /**
   * Get Stripe customer for current user
   */
  async getCustomer(): Promise<StripeCustomer | null> {
    const user = this.authService.currentUser();
    if (!user) return null;

    try {
      const customerRef = doc(this.firestore, `users/${user.uid}/stripe_customer/data`);
      const customerSnap = await getDoc(customerRef);

      if (!customerSnap.exists()) {
        return null;
      }

      return customerSnap.data() as StripeCustomer;

    } catch (error: any) {
      this.logService.error('StripeService', 'Error getting customer', error as Error);
      return null;
    }
  }

  /**
   * Get active subscription for current user
   */
  async getActiveSubscription(): Promise<StripeSubscription | null> {
    const user = this.authService.currentUser();
    if (!user) return null;

    try {
      const subscriptionRef = doc(this.firestore, `users/${user.uid}/stripe_subscription/active`);
      const subscriptionSnap = await getDoc(subscriptionRef);

      if (!subscriptionSnap.exists()) {
        return null;
      }

      return subscriptionSnap.data() as StripeSubscription;

    } catch (error: any) {
      this.logService.error('StripeService', 'Error getting subscription', error as Error);
      return null;
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(): Promise<boolean> {
    const subscription = await this.getActiveSubscription();
    return subscription?.status === 'active' || subscription?.status === 'trialing';
  }

  /**
   * Get loading state
   */
  isProcessing(): boolean {
    return this.isLoading();
  }

  /**
   * Get initialization state
   */
  ready(): boolean {
    return this.isInitialized();
  }
}

