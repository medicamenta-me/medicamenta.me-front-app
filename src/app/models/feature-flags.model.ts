/**
 * Feature Flag Names
 * All available feature flags in the system
 */
export type FeatureFlagName =
  // Core Premium Features
  | 'ocr_scanner'
  | 'advanced_insights'
  | 'wearable_integration'
  | 'scheduled_reports'
  | 'interaction_checker'
  | 'smart_reminders'
  
  // Family Features
  | 'family_dashboard'
  | 'chat_feature'
  | 'shared_calendar'
  | 'delegated_tasks'
  | 'family_reports'
  
  // Enterprise Features
  | 'enterprise_sso'
  | 'white_label'
  | 'api_access'
  | 'bulk_import'
  | 'audit_logs'
  
  // Experimental/Beta Features
  | 'p2p_sync'
  | 'voice_notifications'
  | 'assistant_integration'
  | 'ml_predictor'
  | 'sentiment_analysis'
  
  // Platform Features
  | 'push_notifications'
  | 'background_sync'
  | 'biometric_auth'
  | 'offline_mode';

/**
 * Feature Flag Configuration
 */
export interface FeatureFlag {
  name: FeatureFlagName;
  enabled: boolean;
  requiredPlan?: 'premium' | 'family' | 'enterprise';
  rolloutPercentage?: number;      // 0-100 for gradual rollout
  abTestVariant?: string;          // A/B test variant identifier
  description?: string;
  betaOnly?: boolean;              // Only for beta testers
  platformRestrictions?: ('ios' | 'android' | 'web')[]; // Platform-specific
}

/**
 * Feature Flag Defaults
 * Initial state for all feature flags
 */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagName, FeatureFlag> = {
  // Core Premium Features
  ocr_scanner: {
    name: 'ocr_scanner',
    enabled: true,
    requiredPlan: 'premium',
    description: 'Scan prescriptions with OCR',
  },
  advanced_insights: {
    name: 'advanced_insights',
    enabled: true,
    requiredPlan: 'premium',
    description: 'ML-powered medication insights',
  },
  wearable_integration: {
    name: 'wearable_integration',
    enabled: true,
    requiredPlan: 'premium',
    description: 'Apple Health & Google Fit sync',
    platformRestrictions: ['ios', 'android'],
  },
  scheduled_reports: {
    name: 'scheduled_reports',
    enabled: true,
    requiredPlan: 'premium',
    description: 'Automated email reports',
  },
  interaction_checker: {
    name: 'interaction_checker',
    enabled: true,
    requiredPlan: 'premium',
    description: 'Drug interaction warnings',
  },
  smart_reminders: {
    name: 'smart_reminders',
    enabled: true,
    requiredPlan: 'premium',
    description: 'ML-based adaptive reminders',
  },
  
  // Family Features
  family_dashboard: {
    name: 'family_dashboard',
    enabled: true,
    requiredPlan: 'family',
    description: 'Aggregated family medication view',
  },
  chat_feature: {
    name: 'chat_feature',
    enabled: true,
    requiredPlan: 'family',
    description: 'Chat between caregivers',
  },
  shared_calendar: {
    name: 'shared_calendar',
    enabled: false,
    requiredPlan: 'family',
    description: 'Shared family calendar',
    rolloutPercentage: 0, // Not ready yet
  },
  delegated_tasks: {
    name: 'delegated_tasks',
    enabled: false,
    requiredPlan: 'family',
    description: 'Assign medication tasks',
    rolloutPercentage: 0,
  },
  family_reports: {
    name: 'family_reports',
    enabled: false,
    requiredPlan: 'family',
    description: 'Aggregated family reports',
    rolloutPercentage: 0,
  },
  
  // Enterprise Features
  enterprise_sso: {
    name: 'enterprise_sso',
    enabled: false,
    requiredPlan: 'enterprise',
    description: 'SAML/OAuth SSO',
    rolloutPercentage: 0,
  },
  white_label: {
    name: 'white_label',
    enabled: false,
    requiredPlan: 'enterprise',
    description: 'Custom branding',
  },
  api_access: {
    name: 'api_access',
    enabled: false,
    requiredPlan: 'enterprise',
    description: 'REST API access',
  },
  bulk_import: {
    name: 'bulk_import',
    enabled: false,
    requiredPlan: 'enterprise',
    description: 'Bulk patient import',
  },
  audit_logs: {
    name: 'audit_logs',
    enabled: true,
    requiredPlan: 'enterprise',
    description: 'Complete audit trail',
  },
  
  // Experimental Features
  p2p_sync: {
    name: 'p2p_sync',
    enabled: false,
    description: 'Peer-to-peer device sync',
    betaOnly: true,
    rolloutPercentage: 0,
  },
  voice_notifications: {
    name: 'voice_notifications',
    enabled: false,
    description: 'TTS voice reminders',
    betaOnly: true,
  },
  assistant_integration: {
    name: 'assistant_integration',
    enabled: false,
    description: 'Alexa & Google Assistant',
    betaOnly: true,
    platformRestrictions: ['ios', 'android'],
  },
  ml_predictor: {
    name: 'ml_predictor',
    enabled: false,
    requiredPlan: 'premium',
    description: 'ML dose prediction',
    betaOnly: true,
    rolloutPercentage: 10, // 10% rollout
  },
  sentiment_analysis: {
    name: 'sentiment_analysis',
    enabled: false,
    requiredPlan: 'premium',
    description: 'Note sentiment analysis',
    betaOnly: true,
  },
  
  // Platform Features
  push_notifications: {
    name: 'push_notifications',
    enabled: true,
    requiredPlan: 'premium',
    description: 'Remote push notifications',
  },
  background_sync: {
    name: 'background_sync',
    enabled: true,
    description: 'Background data sync',
  },
  biometric_auth: {
    name: 'biometric_auth',
    enabled: false,
    description: 'Face ID / Touch ID',
    platformRestrictions: ['ios', 'android'],
    rolloutPercentage: 0, // Will enable after implementation
  },
  offline_mode: {
    name: 'offline_mode',
    enabled: true,
    description: 'Full offline support',
  },
};

/**
 * Feature Flag Check Result
 */
export interface FeatureFlagCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  requiredPlan?: string;
}
