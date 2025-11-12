import { Injectable, inject } from '@angular/core';
import { Analytics, logEvent, setUserId, setUserProperties } from '@angular/fire/analytics';
import { SubscriptionPlan } from '../models/subscription.model';
import { FeatureFlagName } from '../models/feature-flags.model';
import { LogService } from './log.service';

/**
 * Plan types for analytics tracking
 */
export type PlanType = 'free' | 'premium' | 'family';
export type FeatureName = string;

/**
 * Analytics Event Names - Centralized event naming for consistency
 */
export const ANALYTICS_EVENTS = {
  // Onboarding & Authentication
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  LOGOUT: 'logout',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  BIOMETRIC_DISABLED: 'biometric_disabled',

  // Feature Access & Gating
  FEATURE_ACCESS_ATTEMPT: 'feature_access_attempt',
  FEATURE_ACCESS_GRANTED: 'feature_access_granted',
  FEATURE_ACCESS_DENIED: 'feature_access_denied',
  PAYWALL_VIEWED: 'paywall_viewed',

  // Upgrade & Conversion
  UPGRADE_CLICK: 'upgrade_click',
  PLAN_SELECTED: 'plan_selected',
  BILLING_INTERVAL_CHANGED: 'billing_interval_changed',

  // Checkout & Payment
  CHECKOUT_STARTED: 'checkout_started',
  PAYMENT_METHOD_SELECTED: 'payment_method_selected',
  PAYMENT_INFO_SUBMITTED: 'payment_info_submitted',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_CANCELED: 'payment_canceled',

  // Subscription Management
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_UPDATED: 'subscription_updated',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  TRIAL_STARTED: 'trial_started',
  TRIAL_ENDED: 'trial_ended',

  // Stripe Specific
  STRIPE_CHECKOUT_OPENED: 'stripe_checkout_opened',
  STRIPE_BILLING_PORTAL_OPENED: 'stripe_billing_portal_opened',

  // PagSeguro Specific
  PAGSEGURO_PIX_GENERATED: 'pagseguro_pix_generated',
  PAGSEGURO_PIX_COPIED: 'pagseguro_pix_copied',
  PAGSEGURO_BOLETO_GENERATED: 'pagseguro_boleto_generated',
  PAGSEGURO_BOLETO_DOWNLOADED: 'pagseguro_boleto_downloaded',
  PAGSEGURO_CARD_SUBMITTED: 'pagseguro_card_submitted',
  PAGSEGURO_INSTALLMENTS_SELECTED: 'pagseguro_installments_selected',

  // Medication Management
  MEDICATION_CREATED: 'medication_created',
  MEDICATION_UPDATED: 'medication_updated',
  DOSE_LOGGED: 'dose_logged',
  DOSE_SKIPPED: 'dose_skipped',
  STOCK_UPDATED: 'stock_updated',
  STOCK_LOW_WARNING: 'stock_low_warning',

  // OCR Scanner
  OCR_SCAN_STARTED: 'ocr_scan_started',
  OCR_SCAN_SUCCESS: 'ocr_scan_success',
  OCR_SCAN_FAILED: 'ocr_scan_failed',
  OCR_LIMIT_REACHED: 'ocr_limit_reached',

  // Reports
  REPORT_GENERATED: 'report_generated',
  REPORT_DOWNLOADED: 'report_downloaded',
  REPORT_LIMIT_REACHED: 'report_limit_reached',

  // Gamification (existing)
  ACHIEVEMENT_UNLOCK: 'achievement_unlock',
  LEVEL_UP: 'level_up',
  COINS_EARNED: 'coins_earned',
  SHOP_ITEM_PURCHASED: 'shop_item_purchased',

  // Family & Caregivers
  DEPENDENT_ADDED: 'dependent_added',
  CAREGIVER_INVITED: 'caregiver_invited',
  FAMILY_DASHBOARD_VIEWED: 'family_dashboard_viewed',

  // App Usage (existing)
  SCREEN_VIEW: 'screen_view',
  SHARE: 'share',
  APP_OPENED: 'app_opened',
  ERROR_OCCURRED: 'error_occurred',

  // A/B Testing
  EXPERIMENT_VIEWED: 'experiment_viewed',
  EXPERIMENT_CONVERSION: 'experiment_conversion'
} as const;

/**
 * User Properties - Custom user properties for segmentation
 */
export const USER_PROPERTIES = {
  PLAN: 'plan',
  SUBSCRIPTION_STATUS: 'subscription_status',
  PAYMENT_PROVIDER: 'payment_provider',
  BILLING_INTERVAL: 'billing_interval',
  TRIAL_STATUS: 'trial_status',
  ADHERENCE_RATE: 'adherence_rate',
  HAS_ENABLED_BIOMETRICS: 'has_enabled_biometrics',
  TOTAL_MEDICATIONS: 'total_medications',
  TOTAL_DEPENDENTS: 'total_dependents'
} as const;

/**
 * Analytics Service
 * 
 * Centralized service for tracking user behavior, conversions, and engagement.
 * Integrates with Firebase Analytics for event tracking and user properties.
 * 
 * Events tracked include:
 * - Monetization: checkout, payments, subscriptions, trials
 * - Feature access: paywall views, feature gating, upgrade clicks
 * - User behavior: screen views, shares, errors
 * - Gamification: achievements, level-ups, coins
 * - Medical tracking: medications, doses, reports
 * 
 * @example
 * ```typescript
 * // Track feature access
 * this.analytics.trackFeatureAccess('ocr_scanner', true, 'premium');
 * 
 * // Track payment conversion
 * this.analytics.trackCheckoutStarted('premium', 'monthly', 'stripe');
 * this.analytics.trackPaymentSuccess('premium', 1490, 'stripe', true);
 * 
 * // Set user properties
 * this.analytics.setUserPlan('premium');
 * this.analytics.setSubscriptionStatus('active');
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly analytics = inject(Analytics, { optional: true });
  private readonly logService = inject(LogService);
  private readonly enabled = true; // Can be controlled by environment config
  
  /**
   * Log a custom event with optional parameters
   * @param eventName - Name of the event (e.g., 'share_achievement')
   * @param params - Optional event parameters
   */
  logEvent(eventName: string, params?: Record<string, unknown>): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    
    // Use Firebase Analytics if available
    if (this.analytics) {
      try {
        logEvent(this.analytics, eventName, params);
        this.logService.debug('AnalyticsService', 'Firebase event logged', { eventName, timestamp });
      } catch (error: any) {
        this.logService.error('AnalyticsService', 'Error logging to Firebase', error as Error);
        this.fallbackLog(eventName, params, timestamp);
      }
    } else {
      // Fallback to console + localStorage for development
      this.fallbackLog(eventName, params, timestamp);
    }
  }
  
  /**
   * Fallback logging when Firebase Analytics is not available
   */
  private fallbackLog(eventName: string, params?: Record<string, unknown>, timestamp?: string): void {
    this.logService.debug('AnalyticsService', 'Fallback event logged', { 
      eventName, 
      timestamp: timestamp || new Date().toISOString() 
    });
    
    // Store in localStorage for debugging
    this.storeEventLocally(eventName, params);
  }
  
  /**
   * Store events locally for debugging purposes
   */
  private storeEventLocally(eventName: string, params?: Record<string, unknown>): void {
    try {
      const key = 'analytics_events';
      const stored = localStorage.getItem(key);
      const events = stored ? JSON.parse(stored) : [];
      
      events.push({
        eventName,
        params,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 100 events
      const trimmed = events.slice(-100);
      localStorage.setItem(key, JSON.stringify(trimmed));
    } catch (error: any) {
      this.logService.error('AnalyticsService', 'Error storing analytics event', error as Error);
    }
  }
  
  /**
   * Track user screen views
   */
  logScreenView(screenName: string, screenClass?: string): void {
    this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass || screenName
    });
  }
  
  /**
   * Track achievement unlocks
   */
  logAchievementUnlock(achievementId: string, tier: string): void {
    this.logEvent('achievement_unlock', {
      achievement_id: achievementId,
      tier
    });
  }
  
  /**
   * Track level ups
   */
  logLevelUp(level: number, character: string): void {
    this.logEvent('level_up', {
      level,
      character
    });
  }
  
  /**
   * Track social shares
   */
  logShare(contentType: string, method: string, itemId?: string): void {
    this.logEvent('share', {
      content_type: contentType,
      method,
      item_id: itemId
    });
  }
  
  /**
   * Set user ID for analytics
   */
  setUserId(userId: string | null): void {
    if (this.analytics) {
      try {
        setUserId(this.analytics, userId);
        this.logService.debug('AnalyticsService', 'User ID set', { userId });
      } catch (error: any) {
        this.logService.error('AnalyticsService', 'Error setting user ID', error as Error);
      }
    }
  }
  
  /**
   * Set user properties for analytics
   */
  setUserProperties(properties: Record<string, unknown>): void {
    if (this.analytics) {
      try {
        setUserProperties(this.analytics, properties);
        this.logService.debug('AnalyticsService', 'User properties set', properties);
      } catch (error: any) {
        this.logService.error('AnalyticsService', 'Error setting user properties', error as Error);
      }
    }
  }
  
  /**
   * Get all stored analytics events (for debugging)
   */
  getStoredEvents(): Array<{ eventName: string; params?: Record<string, unknown>; timestamp: string }> {
    try {
      const stored = localStorage.getItem('analytics_events');
      return stored ? JSON.parse(stored) : [];
    } catch (error: any) {
      this.logService.error('AnalyticsService', 'Error retrieving analytics events', error as Error);
      return [];
    }
  }
  
  /**
   * Clear stored analytics events
   */
  clearStoredEvents(): void {
    localStorage.removeItem('analytics_events');
  }

  // ==================== User Properties Helpers ====================

  setUserPlan(plan: PlanType): void {
    this.setUserProperties({ [USER_PROPERTIES.PLAN]: plan });
  }

  setSubscriptionStatus(status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'): void {
    this.setUserProperties({ [USER_PROPERTIES.SUBSCRIPTION_STATUS]: status });
  }

  setPaymentProvider(provider: 'stripe' | 'pagseguro' | null): void {
    this.setUserProperties({ [USER_PROPERTIES.PAYMENT_PROVIDER]: provider || 'none' });
  }

  setBillingInterval(interval: 'monthly' | 'yearly'): void {
    this.setUserProperties({ [USER_PROPERTIES.BILLING_INTERVAL]: interval });
  }

  setTrialStatus(status: 'active' | 'ended' | 'converted' | 'expired'): void {
    this.setUserProperties({ [USER_PROPERTIES.TRIAL_STATUS]: status });
  }

  setAdherenceRate(rate: number): void {
    this.setUserProperties({ [USER_PROPERTIES.ADHERENCE_RATE]: Math.round(rate) });
  }

  setBiometricsEnabled(enabled: boolean): void {
    this.setUserProperties({ [USER_PROPERTIES.HAS_ENABLED_BIOMETRICS]: enabled });
  }

  // ==================== Onboarding & Authentication ====================

  trackSignUp(method: 'email' | 'google' | 'apple' | 'sso'): void {
    this.logEvent(ANALYTICS_EVENTS.SIGN_UP, { method });
  }

  trackLogin(method: 'email' | 'google' | 'apple' | 'sso' | 'biometric'): void {
    this.logEvent(ANALYTICS_EVENTS.LOGIN, { method });
  }

  trackLogout(): void {
    this.logEvent(ANALYTICS_EVENTS.LOGOUT);
  }

  trackBiometricEnabled(): void {
    this.logEvent(ANALYTICS_EVENTS.BIOMETRIC_ENABLED);
    this.setBiometricsEnabled(true);
  }

  trackBiometricDisabled(): void {
    this.logEvent(ANALYTICS_EVENTS.BIOMETRIC_DISABLED);
    this.setBiometricsEnabled(false);
  }

  // ==================== Feature Access & Gating ====================

  trackFeatureAccessAttempt(featureName: FeatureName, allowed: boolean, requiredPlan?: PlanType): void {
    this.logEvent(ANALYTICS_EVENTS.FEATURE_ACCESS_ATTEMPT, {
      feature_name: featureName,
      allowed,
      required_plan: requiredPlan || 'none'
    });

    if (allowed) {
      this.logEvent(ANALYTICS_EVENTS.FEATURE_ACCESS_GRANTED, { feature_name: featureName });
    } else {
      this.logEvent(ANALYTICS_EVENTS.FEATURE_ACCESS_DENIED, { 
        feature_name: featureName,
        required_plan: requiredPlan 
      });
    }
  }

  trackPaywallViewed(fromFeature?: FeatureName): void {
    this.logEvent(ANALYTICS_EVENTS.PAYWALL_VIEWED, {
      from_feature: fromFeature || 'direct'
    });
  }

  // ==================== Upgrade & Conversion ====================

  trackUpgradeClick(fromPlan: PlanType, toPlan: PlanType, source: string = 'unknown'): void {
    this.logEvent(ANALYTICS_EVENTS.UPGRADE_CLICK, {
      from_plan: fromPlan,
      to_plan: toPlan,
      source
    });
  }

  trackPlanSelected(plan: PlanType, billingInterval: 'monthly' | 'yearly'): void {
    this.logEvent(ANALYTICS_EVENTS.PLAN_SELECTED, {
      plan,
      billing_interval: billingInterval
    });
  }

  trackBillingIntervalChanged(from: 'monthly' | 'yearly', to: 'monthly' | 'yearly', plan: PlanType): void {
    this.logEvent(ANALYTICS_EVENTS.BILLING_INTERVAL_CHANGED, {
      from,
      to,
      plan
    });
  }

  // ==================== Checkout & Payment ====================

  trackCheckoutStarted(
    plan: PlanType, 
    billingInterval: 'monthly' | 'yearly', 
    paymentMethod: 'stripe' | 'pagseguro_pix' | 'pagseguro_boleto' | 'pagseguro_card'
  ): void {
    this.logEvent(ANALYTICS_EVENTS.CHECKOUT_STARTED, {
      plan,
      billing_interval: billingInterval,
      payment_method: paymentMethod
    });
  }

  trackPaymentMethodSelected(method: 'stripe' | 'pix' | 'boleto' | 'credit_card'): void {
    this.logEvent(ANALYTICS_EVENTS.PAYMENT_METHOD_SELECTED, {
      payment_method: method
    });
  }

  trackPaymentInfoSubmitted(plan: PlanType, provider: 'stripe' | 'pagseguro'): void {
    this.logEvent(ANALYTICS_EVENTS.PAYMENT_INFO_SUBMITTED, {
      plan,
      provider
    });
  }

  trackPaymentSuccess(
    plan: PlanType, 
    amountCents: number, 
    provider: 'stripe' | 'pagseguro',
    isTrial: boolean = false,
    billingInterval: 'monthly' | 'yearly' = 'monthly'
  ): void {
    this.logEvent(ANALYTICS_EVENTS.PAYMENT_SUCCESS, {
      plan,
      amount: amountCents / 100,
      currency: provider === 'stripe' ? 'USD' : 'BRL',
      provider,
      is_trial: isTrial,
      billing_interval: billingInterval
    });
  }

  trackPaymentFailed(
    plan: PlanType,
    provider: 'stripe' | 'pagseguro',
    errorCode?: string,
    errorMessage?: string
  ): void {
    this.logEvent(ANALYTICS_EVENTS.PAYMENT_FAILED, {
      plan,
      provider,
      error_code: errorCode || 'unknown',
      error_message: errorMessage || 'Unknown error'
    });
  }

  trackPaymentCanceled(plan: PlanType, provider: 'stripe' | 'pagseguro', step?: string): void {
    this.logEvent(ANALYTICS_EVENTS.PAYMENT_CANCELED, {
      plan,
      provider,
      step: step || 'checkout'
    });
  }

  // ==================== Subscription Management ====================

  trackSubscriptionCreated(plan: PlanType, provider: 'stripe' | 'pagseguro', isTrial: boolean): void {
    this.logEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CREATED, {
      plan,
      provider,
      is_trial: isTrial
    });
  }

  trackSubscriptionCanceled(plan: PlanType, reason?: string): void {
    this.logEvent(ANALYTICS_EVENTS.SUBSCRIPTION_CANCELED, {
      plan,
      reason: reason || 'not_provided'
    });
  }

  trackTrialStarted(plan: PlanType): void {
    this.logEvent(ANALYTICS_EVENTS.TRIAL_STARTED, { plan });
    this.setTrialStatus('active');
  }

  trackTrialEnded(plan: PlanType, converted: boolean): void {
    this.logEvent(ANALYTICS_EVENTS.TRIAL_ENDED, {
      plan,
      converted
    });
    this.setTrialStatus(converted ? 'converted' : 'expired');
  }

  // ==================== Stripe Specific ====================

  trackStripeCheckoutOpened(plan: PlanType, billingInterval: 'monthly' | 'yearly'): void {
    this.logEvent(ANALYTICS_EVENTS.STRIPE_CHECKOUT_OPENED, {
      plan,
      billing_interval: billingInterval
    });
  }

  trackStripeBillingPortalOpened(): void {
    this.logEvent(ANALYTICS_EVENTS.STRIPE_BILLING_PORTAL_OPENED);
  }

  // ==================== PagSeguro Specific ====================

  trackPagSeguroPixGenerated(plan: PlanType, amountCents: number): void {
    this.logEvent(ANALYTICS_EVENTS.PAGSEGURO_PIX_GENERATED, {
      plan,
      amount: amountCents / 100
    });
  }

  trackPagSeguroPixCopied(): void {
    this.logEvent(ANALYTICS_EVENTS.PAGSEGURO_PIX_COPIED);
  }

  trackPagSeguroBoletoGenerated(plan: PlanType, amountCents: number): void {
    this.logEvent(ANALYTICS_EVENTS.PAGSEGURO_BOLETO_GENERATED, {
      plan,
      amount: amountCents / 100
    });
  }

  trackPagSeguroBoletoDownloaded(): void {
    this.logEvent(ANALYTICS_EVENTS.PAGSEGURO_BOLETO_DOWNLOADED);
  }

  trackPagSeguroCardSubmitted(installments: number): void {
    this.logEvent(ANALYTICS_EVENTS.PAGSEGURO_CARD_SUBMITTED, {
      installments
    });
  }

  trackPagSeguroInstallmentsSelected(quantity: number, hasInterest: boolean): void {
    this.logEvent(ANALYTICS_EVENTS.PAGSEGURO_INSTALLMENTS_SELECTED, {
      quantity,
      has_interest: hasInterest
    });
  }

  // ==================== Medication Management ====================

  trackMedicationCreated(method: 'manual' | 'ocr' | 'imported'): void {
    this.logEvent(ANALYTICS_EVENTS.MEDICATION_CREATED, { method });
  }

  trackDoseLogged(medicationId: string, onTime: boolean): void {
    this.logEvent(ANALYTICS_EVENTS.DOSE_LOGGED, {
      medication_id: medicationId,
      on_time: onTime
    });
  }

  trackStockLowWarning(medicationId: string, daysRemaining: number): void {
    this.logEvent(ANALYTICS_EVENTS.STOCK_LOW_WARNING, {
      medication_id: medicationId,
      days_remaining: daysRemaining
    });
  }

  // ==================== OCR Scanner ====================

  trackOcrScanStarted(): void {
    this.logEvent(ANALYTICS_EVENTS.OCR_SCAN_STARTED);
  }

  trackOcrScanSuccess(medicationsDetected: number, processingTimeMs: number): void {
    this.logEvent(ANALYTICS_EVENTS.OCR_SCAN_SUCCESS, {
      medications_detected: medicationsDetected,
      processing_time_ms: processingTimeMs
    });
  }

  trackOcrScanFailed(errorReason: string): void {
    this.logEvent(ANALYTICS_EVENTS.OCR_SCAN_FAILED, {
      error_reason: errorReason
    });
  }

  trackOcrLimitReached(currentCount: number, maxLimit: number): void {
    this.logEvent(ANALYTICS_EVENTS.OCR_LIMIT_REACHED, {
      current_count: currentCount,
      max_limit: maxLimit
    });
  }

  // ==================== Reports ====================

  trackReportGenerated(type: string, format: 'pdf' | 'csv'): void {
    this.logEvent(ANALYTICS_EVENTS.REPORT_GENERATED, {
      report_type: type,
      format
    });
  }

  trackReportDownloaded(type: string): void {
    this.logEvent(ANALYTICS_EVENTS.REPORT_DOWNLOADED, {
      report_type: type
    });
  }

  // ==================== Gamification (Enhanced) ====================

  trackCoinsEarned(amount: number, source: string): void {
    this.logEvent(ANALYTICS_EVENTS.COINS_EARNED, {
      amount,
      source
    });
  }

  trackShopItemPurchased(itemId: string, cost: number): void {
    this.logEvent(ANALYTICS_EVENTS.SHOP_ITEM_PURCHASED, {
      item_id: itemId,
      cost
    });
  }

  // ==================== Family & Caregivers ====================

  trackDependentAdded(): void {
    this.logEvent(ANALYTICS_EVENTS.DEPENDENT_ADDED);
  }

  trackCaregiverInvited(): void {
    this.logEvent(ANALYTICS_EVENTS.CAREGIVER_INVITED);
  }

  trackFamilyDashboardViewed(): void {
    this.logEvent(ANALYTICS_EVENTS.FAMILY_DASHBOARD_VIEWED);
  }

  // ==================== App Usage (Enhanced) ====================

  trackAppOpened(): void {
    this.logEvent(ANALYTICS_EVENTS.APP_OPENED);
  }

  trackError(errorType: string, errorMessage: string, fatal: boolean = false): void {
    this.logEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error_type: errorType,
      error_message: errorMessage,
      fatal
    });
  }

  // ==================== A/B Testing ====================

  trackExperimentViewed(experimentId: string, variantId: string): void {
    this.logEvent(ANALYTICS_EVENTS.EXPERIMENT_VIEWED, {
      experiment_id: experimentId,
      variant_id: variantId
    });
  }

  trackExperimentConversion(experimentId: string, variantId: string, value?: number): void {
    this.logEvent(ANALYTICS_EVENTS.EXPERIMENT_CONVERSION, {
      experiment_id: experimentId,
      variant_id: variantId,
      value: value || 1
    });
  }
}

