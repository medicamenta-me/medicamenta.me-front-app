import { SubscriptionPlan, PlanLimits, DEFAULT_FEATURES } from './subscription.model';

// Re-export types from subscription.model for convenience
export type { SubscriptionPlan, PlanLimits, FeatureFlags, SubscriptionFeatures } from './subscription.model';

/**
 * Feature Categories for Better Organization
 */
export enum FeatureCategory {
  CORE = 'core',
  MEDICATION = 'medication',
  FAMILY = 'family',
  HEALTH = 'health',
  ANALYTICS = 'analytics',
  INTEGRATION = 'integration',
  SUPPORT = 'support',
  ENTERPRISE = 'enterprise',
}

/**
 * Feature Identifiers
 */
export type FeatureId =
  // Core Features
  | 'basic_medication_tracking'
  | 'local_reminders'
  | 'offline_sync'
  | 'basic_gamification'
  
  // Medication Features
  | 'unlimited_medications'
  | 'ocr_scanner'
  | 'interaction_checker'
  | 'smart_reminders'
  
  // Family Features
  | 'add_dependents'
  | 'add_caretakers'
  | 'family_dashboard'
  | 'caretaker_chat'
  | 'shared_calendar'
  
  // Health & Reports
  | 'generate_reports'
  | 'basic_insights'
  | 'advanced_insights'
  | 'scheduled_reports'
  | 'telehealth_consults'
  
  // Integrations
  | 'wearable_integration'
  | 'push_notifications'
  | 'api_access'
  
  // Support & Enterprise
  | 'priority_support'
  | 'white_label'
  | 'sso'
  | 'bulk_import'
  | 'audit_logs';

/**
 * Feature Access Configuration
 */
export interface FeatureAccess {
  id: FeatureId;
  name: string;
  description: string;
  category: FeatureCategory;
  requiredPlan: SubscriptionPlan;  // Minimum plan required
  isEnabled: boolean;               // Global feature toggle
  limits?: Partial<PlanLimits>;    // Specific limits for this feature
}

/**
 * Complete Plan Features and Limits Configuration
 */
export interface PlanConfiguration {
  plan: SubscriptionPlan;
  displayName: string;
  limits: PlanLimits;
  features: FeatureId[];
}

/**
 * Default Limits per Plan
 * Re-exported from subscription.model for backward compatibility
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxMedications: DEFAULT_FEATURES.free.maxMedications,
    maxDependents: DEFAULT_FEATURES.free.maxDependents,
    maxCaretakers: DEFAULT_FEATURES.free.maxCaretakers,
    reportsPerMonth: DEFAULT_FEATURES.free.reportsPerMonth,
    ocrScansPerMonth: DEFAULT_FEATURES.free.ocrScansPerMonth,
    telehealthConsultsPerMonth: DEFAULT_FEATURES.free.telehealthConsultsPerMonth,
    insightsHistoryDays: DEFAULT_FEATURES.free.insightsHistoryDays,
    maxStorageMB: DEFAULT_FEATURES.free.maxStorageMB,
  },
  premium: {
    maxMedications: DEFAULT_FEATURES.premium.maxMedications,
    maxDependents: DEFAULT_FEATURES.premium.maxDependents,
    maxCaretakers: DEFAULT_FEATURES.premium.maxCaretakers,
    reportsPerMonth: DEFAULT_FEATURES.premium.reportsPerMonth,
    ocrScansPerMonth: DEFAULT_FEATURES.premium.ocrScansPerMonth,
    telehealthConsultsPerMonth: DEFAULT_FEATURES.premium.telehealthConsultsPerMonth,
    insightsHistoryDays: DEFAULT_FEATURES.premium.insightsHistoryDays,
    maxStorageMB: DEFAULT_FEATURES.premium.maxStorageMB,
  },
  family: {
    maxMedications: DEFAULT_FEATURES.family.maxMedications,
    maxDependents: DEFAULT_FEATURES.family.maxDependents,
    maxCaretakers: DEFAULT_FEATURES.family.maxCaretakers,
    reportsPerMonth: DEFAULT_FEATURES.family.reportsPerMonth,
    ocrScansPerMonth: DEFAULT_FEATURES.family.ocrScansPerMonth,
    telehealthConsultsPerMonth: DEFAULT_FEATURES.family.telehealthConsultsPerMonth,
    insightsHistoryDays: DEFAULT_FEATURES.family.insightsHistoryDays,
    maxStorageMB: DEFAULT_FEATURES.family.maxStorageMB,
  },
  enterprise: {
    maxMedications: DEFAULT_FEATURES.enterprise.maxMedications,
    maxDependents: DEFAULT_FEATURES.enterprise.maxDependents,
    maxCaretakers: DEFAULT_FEATURES.enterprise.maxCaretakers,
    reportsPerMonth: DEFAULT_FEATURES.enterprise.reportsPerMonth,
    ocrScansPerMonth: DEFAULT_FEATURES.enterprise.ocrScansPerMonth,
    telehealthConsultsPerMonth: DEFAULT_FEATURES.enterprise.telehealthConsultsPerMonth,
    insightsHistoryDays: DEFAULT_FEATURES.enterprise.insightsHistoryDays,
    maxStorageMB: DEFAULT_FEATURES.enterprise.maxStorageMB,
  },
};

/**
 * Feature Mapping - Which features are available per plan
 */
export const FEATURE_MAP: Record<FeatureId, FeatureAccess> = {
  // Core Features (All Plans)
  basic_medication_tracking: {
    id: 'basic_medication_tracking',
    name: 'Rastreamento de Medicações',
    description: 'Adicionar e gerenciar medicações',
    category: FeatureCategory.CORE,
    requiredPlan: 'free',
    isEnabled: true,
  },
  local_reminders: {
    id: 'local_reminders',
    name: 'Lembretes Locais',
    description: 'Notificações locais de medicações',
    category: FeatureCategory.CORE,
    requiredPlan: 'free',
    isEnabled: true,
  },
  offline_sync: {
    id: 'offline_sync',
    name: 'Sincronização Offline',
    description: 'Acesso offline aos dados',
    category: FeatureCategory.CORE,
    requiredPlan: 'free',
    isEnabled: true,
  },
  basic_gamification: {
    id: 'basic_gamification',
    name: 'Gamificação Básica',
    description: '6 conquistas básicas',
    category: FeatureCategory.CORE,
    requiredPlan: 'free',
    isEnabled: true,
  },

  // Medication Features
  unlimited_medications: {
    id: 'unlimited_medications',
    name: 'Medicações Ilimitadas',
    description: 'Sem limite de medicações cadastradas',
    category: FeatureCategory.MEDICATION,
    requiredPlan: 'free',
    isEnabled: true,
  },
  ocr_scanner: {
    id: 'ocr_scanner',
    name: 'Scanner OCR de Receitas',
    description: 'Digitalize receitas médicas automaticamente',
    category: FeatureCategory.MEDICATION,
    requiredPlan: 'premium',
    isEnabled: true,
    limits: {
      ocrScansPerMonth: 20, // Premium limit
    },
  },
  interaction_checker: {
    id: 'interaction_checker',
    name: 'Verificador de Interações',
    description: 'Alerta sobre interações medicamentosas',
    category: FeatureCategory.MEDICATION,
    requiredPlan: 'premium',
    isEnabled: true,
  },
  smart_reminders: {
    id: 'smart_reminders',
    name: 'Lembretes Inteligentes',
    description: 'Lembretes com ML baseados em padrões',
    category: FeatureCategory.MEDICATION,
    requiredPlan: 'premium',
    isEnabled: true,
  },

  // Family Features
  add_dependents: {
    id: 'add_dependents',
    name: 'Adicionar Dependentes',
    description: 'Gerencie medicações de familiares',
    category: FeatureCategory.FAMILY,
    requiredPlan: 'free',
    isEnabled: true,
    limits: {
      maxDependents: 1, // Free limit
    },
  },
  add_caretakers: {
    id: 'add_caretakers',
    name: 'Adicionar Cuidadores',
    description: 'Compartilhe acesso com cuidadores',
    category: FeatureCategory.FAMILY,
    requiredPlan: 'free',
    isEnabled: true,
    limits: {
      maxCaretakers: 2, // Free limit
    },
  },
  family_dashboard: {
    id: 'family_dashboard',
    name: 'Dashboard Familiar',
    description: 'Visão agregada de toda a família',
    category: FeatureCategory.FAMILY,
    requiredPlan: 'family',
    isEnabled: true,
  },
  caretaker_chat: {
    id: 'caretaker_chat',
    name: 'Chat entre Cuidadores',
    description: 'Comunicação entre cuidadores',
    category: FeatureCategory.FAMILY,
    requiredPlan: 'family',
    isEnabled: true,
  },
  shared_calendar: {
    id: 'shared_calendar',
    name: 'Calendário Compartilhado',
    description: 'Calendário sincronizado para a família',
    category: FeatureCategory.FAMILY,
    requiredPlan: 'family',
    isEnabled: true,
  },

  // Health & Reports
  generate_reports: {
    id: 'generate_reports',
    name: 'Gerar Relatórios',
    description: 'Relatórios de adesão e histórico',
    category: FeatureCategory.ANALYTICS,
    requiredPlan: 'free',
    isEnabled: true,
    limits: {
      reportsPerMonth: 3, // Free limit
    },
  },
  basic_insights: {
    id: 'basic_insights',
    name: 'Insights Básicos',
    description: 'Estatísticas de adesão (30 dias)',
    category: FeatureCategory.ANALYTICS,
    requiredPlan: 'free',
    isEnabled: true,
    limits: {
      insightsHistoryDays: 30,
    },
  },
  advanced_insights: {
    id: 'advanced_insights',
    name: 'Insights Avançados',
    description: 'Análises com ML e histórico ilimitado',
    category: FeatureCategory.ANALYTICS,
    requiredPlan: 'premium',
    isEnabled: true,
  },
  scheduled_reports: {
    id: 'scheduled_reports',
    name: 'Relatórios Agendados',
    description: 'Envio automático de relatórios por email',
    category: FeatureCategory.ANALYTICS,
    requiredPlan: 'premium',
    isEnabled: true,
  },
  telehealth_consults: {
    id: 'telehealth_consults',
    name: 'Consultas de Telemedicina',
    description: 'Agende consultas online',
    category: FeatureCategory.HEALTH,
    requiredPlan: 'premium',
    isEnabled: true,
    limits: {
      telehealthConsultsPerMonth: 1, // Premium limit
    },
  },

  // Integrations
  wearable_integration: {
    id: 'wearable_integration',
    name: 'Integração com Wearables',
    description: 'Apple Health, Google Fit, Fitbit',
    category: FeatureCategory.INTEGRATION,
    requiredPlan: 'premium',
    isEnabled: true,
  },
  push_notifications: {
    id: 'push_notifications',
    name: 'Notificações Push Remotas',
    description: 'Push notifications via Firebase',
    category: FeatureCategory.INTEGRATION,
    requiredPlan: 'premium',
    isEnabled: true,
  },
  api_access: {
    id: 'api_access',
    name: 'Acesso à API REST',
    description: 'Integração via API REST',
    category: FeatureCategory.ENTERPRISE,
    requiredPlan: 'enterprise',
    isEnabled: true,
  },

  // Support & Enterprise
  priority_support: {
    id: 'priority_support',
    name: 'Suporte Prioritário',
    description: 'SLA de resposta em 4h',
    category: FeatureCategory.SUPPORT,
    requiredPlan: 'premium',
    isEnabled: true,
  },
  white_label: {
    id: 'white_label',
    name: 'White Label',
    description: 'Personalização de marca completa',
    category: FeatureCategory.ENTERPRISE,
    requiredPlan: 'enterprise',
    isEnabled: true,
  },
  sso: {
    id: 'sso',
    name: 'SSO (Single Sign-On)',
    description: 'SAML 2.0 / OAuth 2.0',
    category: FeatureCategory.ENTERPRISE,
    requiredPlan: 'enterprise',
    isEnabled: true,
  },
  bulk_import: {
    id: 'bulk_import',
    name: 'Importação em Massa',
    description: 'Importar dados via CSV/Excel',
    category: FeatureCategory.ENTERPRISE,
    requiredPlan: 'enterprise',
    isEnabled: true,
  },
  audit_logs: {
    id: 'audit_logs',
    name: 'Logs de Auditoria',
    description: 'Rastreamento completo de ações',
    category: FeatureCategory.ENTERPRISE,
    requiredPlan: 'enterprise',
    isEnabled: true,
  },
};

/**
 * Plan Hierarchy for upgrade checks
 */
export const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  free: 0,
  premium: 1,
  family: 2,
  enterprise: 3,
};

/**
 * Limit Validation Result
 */
export interface LimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  message?: string;
}

/**
 * Feature Access Result
 */
export interface FeatureAccessResult {
  allowed: boolean;
  feature: FeatureAccess;
  currentPlan: SubscriptionPlan;
  requiredPlan: SubscriptionPlan;
  message?: string;
}
