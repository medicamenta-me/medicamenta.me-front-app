import { Timestamp } from '@angular/fire/firestore';

/**
 * Subscription Plans
 */
export type SubscriptionPlan = 'free' | 'premium' | 'family' | 'enterprise';

/**
 * Subscription Status
 */
export type SubscriptionStatus = 
  | 'active'          // Active subscription
  | 'trialing'        // In trial period
  | 'past_due'        // Payment failed
  | 'canceled'        // Canceled by user
  | 'incomplete'      // Initial payment pending
  | 'incomplete_expired'; // Initial payment failed

/**
 * Billing Interval
 */
export type BillingInterval = 'monthly' | 'yearly';

/**
 * Payment Method
 */
export interface PaymentMethod {
  brand: string;           // visa, mastercard, etc
  last4: string;           // Last 4 digits
  expiryMonth: number;     // 1-12
  expiryYear: number;      // YYYY
}

/**
 * Quantitative Limits per Plan
 * Imported from feature-mapping system for consistency
 */
export interface PlanLimits {
  maxMedications: number;          // -1 = unlimited
  maxDependents: number;           // FREE: 1, PREMIUM: -1
  maxCaretakers: number;           // FREE: 2, PREMIUM: -1
  reportsPerMonth: number;         // FREE: 3, PREMIUM: -1
  ocrScansPerMonth: number;        // FREE: 0, PREMIUM: 20, FAMILY: -1
  telehealthConsultsPerMonth: number; // FREE: 0, PREMIUM: 1, FAMILY: 3, ENTERPRISE: -1
  insightsHistoryDays: number;     // FREE: 30, PREMIUM: -1
  maxStorageMB: number;            // Storage limit in MB
}

/**
 * Feature Flags per Plan
 * Boolean flags for premium features
 */
export interface FeatureFlags {
  hasAdvancedInsights: boolean;    // ML-powered insights
  hasWearableIntegration: boolean; // Apple Health / Google Fit
  hasPushNotifications: boolean;   // Remote push (FCM)
  hasChat: boolean;                // Family chat
  hasFamilyDashboard: boolean;     // Aggregated family view
  hasScheduledReports: boolean;    // Automated email reports
  hasInteractionChecker: boolean;  // Drug interaction warnings
  hasPrioritySupport: boolean;     // Support SLA
  hasWhiteLabel: boolean;          // Custom branding (Enterprise)
  hasSSO: boolean;                 // SAML/OAuth (Enterprise)
  hasAPIAccess: boolean;           // REST API (Enterprise)
}

/**
 * Combined Subscription Features (Limits + Flags)
 * This combines quantitative limits with boolean feature flags
 */
export interface SubscriptionFeatures extends PlanLimits, FeatureFlags {}

/**
 * Billing Information
 */
export interface BillingInfo {
  interval: BillingInterval;
  amount: number;                  // In cents (e.g., 1490 = R$ 14.90)
  currency: string;                // BRL, USD, etc
  nextBillingDate: Timestamp;
}

/**
 * User Subscription
 */
export interface UserSubscription {
  // Plan Info
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  
  // Timestamps
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  trialEnd?: Timestamp;            // If in trial
  canceledAt?: Timestamp;
  cancelAtPeriodEnd: boolean;      // Downgrade scheduled
  
  // Payment Provider Data
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  pagseguroCustomerId?: string;
  pagseguroSubscriptionId?: string;
  paymentMethod?: PaymentMethod;
  
  // Features & Limits
  features: SubscriptionFeatures;
  
  // Billing
  billing: BillingInfo;
  
  // Usage Tracking (reset monthly)
  usage?: {
    reportsThisMonth: number;
    ocrScansThisMonth: number;
    telehealthConsultsThisMonth: number;
    lastResetDate: Timestamp;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Default Features by Plan
 */
export const DEFAULT_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  free: {
    // Limits
    maxMedications: -1,              // Unlimited for all plans
    maxDependents: 1,
    maxCaretakers: 2,
    reportsPerMonth: 3,
    insightsHistoryDays: 30,
    ocrScansPerMonth: 0,
    telehealthConsultsPerMonth: 0,
    maxStorageMB: 50,
    // Feature Flags
    hasAdvancedInsights: false,
    hasWearableIntegration: false,
    hasPushNotifications: false,
    hasChat: false,
    hasFamilyDashboard: false,
    hasScheduledReports: false,
    hasInteractionChecker: false,
    hasPrioritySupport: false,
    hasWhiteLabel: false,
    hasSSO: false,
    hasAPIAccess: false,
  },
  premium: {
    // Limits
    maxMedications: -1,
    maxDependents: -1,
    maxCaretakers: -1,
    reportsPerMonth: -1,
    insightsHistoryDays: -1,
    ocrScansPerMonth: 20,
    telehealthConsultsPerMonth: 1,
    maxStorageMB: 500,
    // Feature Flags
    hasAdvancedInsights: true,
    hasWearableIntegration: true,
    hasPushNotifications: true,
    hasChat: false,
    hasFamilyDashboard: false,
    hasScheduledReports: true,
    hasInteractionChecker: true,
    hasPrioritySupport: true,
    hasWhiteLabel: false,
    hasSSO: false,
    hasAPIAccess: false,
  },
  family: {
    // Limits
    maxMedications: -1,
    maxDependents: -1,
    maxCaretakers: -1,
    reportsPerMonth: -1,
    insightsHistoryDays: -1,
    ocrScansPerMonth: -1,
    telehealthConsultsPerMonth: 3,
    maxStorageMB: 2000,              // 2GB
    // Feature Flags
    hasAdvancedInsights: true,
    hasWearableIntegration: true,
    hasPushNotifications: true,
    hasChat: true,
    hasFamilyDashboard: true,
    hasScheduledReports: true,
    hasInteractionChecker: true,
    hasPrioritySupport: true,
    hasWhiteLabel: false,
    hasSSO: false,
    hasAPIAccess: false,
  },
  enterprise: {
    // Limits
    maxMedications: -1,
    maxDependents: -1,
    maxCaretakers: -1,
    reportsPerMonth: -1,
    insightsHistoryDays: -1,
    ocrScansPerMonth: -1,
    telehealthConsultsPerMonth: -1,
    maxStorageMB: -1,                // Unlimited
    // Feature Flags
    hasAdvancedInsights: true,
    hasWearableIntegration: true,
    hasPushNotifications: true,
    hasChat: true,
    hasFamilyDashboard: true,
    hasScheduledReports: true,
    hasInteractionChecker: true,
    hasPrioritySupport: true,
    hasWhiteLabel: true,
    hasSSO: true,
    hasAPIAccess: true,
  },
};

/**
 * Plan Pricing (in cents)
 */
export const PLAN_PRICING = {
  premium: {
    monthly: { BRL: 1490, USD: 399 },   // R$ 14.90 / $3.99
    yearly: { BRL: 14900, USD: 3999 },  // R$ 149.00 / $39.99 (2 months free)
  },
  family: {
    monthly: { BRL: 2990, USD: 799 },   // R$ 29.90 / $7.99
    yearly: { BRL: 29900, USD: 7999 },  // R$ 299.00 / $79.99 (2 months free)
  },
  enterprise: {
    // Custom pricing - contact sales
    monthly: { BRL: 49900, USD: 9999 },
    yearly: { BRL: 499000, USD: 99999 },
  },
};
