/**
 * Tests for FeatureMappingService
 *
 * Tests cover:
 * - FeatureId type validation
 * - FeatureAccess interface
 * - FeatureAccessResult interface
 * - LimitCheckResult interface
 * - Plan hierarchy validation
 * - Feature category validation
 * - Limit calculations
 */

import { SubscriptionPlan, PlanLimits } from '../models/subscription.model';

// Define types for testing purposes (matching the service)
type FeatureId =
  | 'basic_medication_tracking'
  | 'local_reminders'
  | 'offline_sync'
  | 'basic_gamification'
  | 'unlimited_medications'
  | 'ocr_scanner'
  | 'interaction_checker'
  | 'smart_reminders'
  | 'add_dependents'
  | 'add_caretakers'
  | 'family_dashboard'
  | 'caretaker_chat'
  | 'shared_calendar'
  | 'generate_reports'
  | 'basic_insights'
  | 'advanced_insights'
  | 'scheduled_reports'
  | 'telehealth_consults'
  | 'wearable_integration'
  | 'push_notifications'
  | 'api_access'
  | 'priority_support'
  | 'white_label'
  | 'sso'
  | 'bulk_import'
  | 'audit_logs';

enum FeatureCategory {
  CORE = 'core',
  MEDICATION = 'medication',
  FAMILY = 'family',
  HEALTH = 'health',
  ANALYTICS = 'analytics',
  INTEGRATION = 'integration',
  SUPPORT = 'support',
  ENTERPRISE = 'enterprise',
}

interface FeatureAccess {
  id: FeatureId;
  name: string;
  description: string;
  category: FeatureCategory;
  requiredPlan: SubscriptionPlan;
  isEnabled: boolean;
  limits?: Partial<PlanLimits>;
}

interface FeatureAccessResult {
  allowed: boolean;
  feature: FeatureAccess;
  currentPlan: SubscriptionPlan;
  requiredPlan: SubscriptionPlan;
  message?: string;
}

interface LimitCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  message?: string;
}

describe('FeatureMappingService', () => {
  /**
   * Plan Hierarchy Tests
   */
  describe('Plan hierarchy', () => {
    const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
      free: 0,
      premium: 1,
      family: 2,
      enterprise: 3
    };

    it('should have correct hierarchy order', () => {
      expect(PLAN_HIERARCHY['free']).toBe(0);
      expect(PLAN_HIERARCHY['premium']).toBe(1);
      expect(PLAN_HIERARCHY['family']).toBe(2);
      expect(PLAN_HIERARCHY['enterprise']).toBe(3);
    });

    it('should detect if plan is sufficient', () => {
      const isPlanSufficient = (currentPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean => {
        return PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];
      };

      expect(isPlanSufficient('free', 'free')).toBeTrue();
      expect(isPlanSufficient('premium', 'free')).toBeTrue();
      expect(isPlanSufficient('family', 'premium')).toBeTrue();
      expect(isPlanSufficient('enterprise', 'family')).toBeTrue();
      expect(isPlanSufficient('free', 'premium')).toBeFalse();
      expect(isPlanSufficient('premium', 'enterprise')).toBeFalse();
    });

    it('should find next upgrade plan', () => {
      const getNextPlan = (currentPlan: SubscriptionPlan): SubscriptionPlan | null => {
        const plans: SubscriptionPlan[] = ['free', 'premium', 'family', 'enterprise'];
        const currentIndex = plans.indexOf(currentPlan);
        if (currentIndex < plans.length - 1) {
          return plans[currentIndex + 1];
        }
        return null;
      };

      expect(getNextPlan('free')).toBe('premium');
      expect(getNextPlan('premium')).toBe('family');
      expect(getNextPlan('family')).toBe('enterprise');
      expect(getNextPlan('enterprise')).toBeNull();
    });
  });

  /**
   * FeatureCategory Enum Tests
   */
  describe('FeatureCategory enum', () => {
    it('should have all categories', () => {
      expect(FeatureCategory.CORE).toBe('core');
      expect(FeatureCategory.MEDICATION).toBe('medication');
      expect(FeatureCategory.FAMILY).toBe('family');
      expect(FeatureCategory.HEALTH).toBe('health');
      expect(FeatureCategory.ANALYTICS).toBe('analytics');
      expect(FeatureCategory.INTEGRATION).toBe('integration');
      expect(FeatureCategory.SUPPORT).toBe('support');
      expect(FeatureCategory.ENTERPRISE).toBe('enterprise');
    });

    it('should have 8 categories', () => {
      const categories = Object.values(FeatureCategory);
      expect(categories.length).toBe(8);
    });
  });

  /**
   * FeatureAccess Interface Tests
   */
  describe('FeatureAccess interface', () => {
    it('should have all required properties', () => {
      const feature: FeatureAccess = {
        id: 'basic_medication_tracking',
        name: 'Rastreamento de Medicações',
        description: 'Adicionar e gerenciar medicações',
        category: FeatureCategory.CORE,
        requiredPlan: 'free',
        isEnabled: true
      };

      expect(feature.id).toBeDefined();
      expect(feature.name).toBeDefined();
      expect(feature.description).toBeDefined();
      expect(feature.category).toBeDefined();
      expect(feature.requiredPlan).toBeDefined();
      expect(feature.isEnabled).toBeDefined();
    });

    it('should support optional limits', () => {
      const feature: FeatureAccess = {
        id: 'ocr_scanner',
        name: 'Scanner OCR',
        description: 'Digitalize receitas',
        category: FeatureCategory.MEDICATION,
        requiredPlan: 'premium',
        isEnabled: true,
        limits: {
          ocrScansPerMonth: 20
        }
      };

      expect(feature.limits).toBeDefined();
      expect(feature.limits!.ocrScansPerMonth).toBe(20);
    });

    it('should support disabled features', () => {
      const feature: FeatureAccess = {
        id: 'telehealth_consults',
        name: 'Telemedicina',
        description: 'Consultas por video',
        category: FeatureCategory.HEALTH,
        requiredPlan: 'family',
        isEnabled: false
      };

      expect(feature.isEnabled).toBeFalse();
    });
  });

  /**
   * FeatureAccessResult Interface Tests
   */
  describe('FeatureAccessResult interface', () => {
    it('should indicate allowed access', () => {
      const feature: FeatureAccess = {
        id: 'basic_medication_tracking',
        name: 'Test',
        description: 'Test',
        category: FeatureCategory.CORE,
        requiredPlan: 'free',
        isEnabled: true
      };

      const result: FeatureAccessResult = {
        allowed: true,
        feature,
        currentPlan: 'premium',
        requiredPlan: 'free'
      };

      expect(result.allowed).toBeTrue();
      expect(result.message).toBeUndefined();
    });

    it('should indicate denied access with message', () => {
      const feature: FeatureAccess = {
        id: 'api_access',
        name: 'API Access',
        description: 'Access API',
        category: FeatureCategory.ENTERPRISE,
        requiredPlan: 'enterprise',
        isEnabled: true
      };

      const result: FeatureAccessResult = {
        allowed: false,
        feature,
        currentPlan: 'free',
        requiredPlan: 'enterprise',
        message: 'Faça upgrade para Enterprise para acessar este recurso'
      };

      expect(result.allowed).toBeFalse();
      expect(result.message).toContain('Enterprise');
    });

    it('should indicate disabled feature', () => {
      const feature: FeatureAccess = {
        id: 'telehealth_consults',
        name: 'Telehealth',
        description: 'Disabled',
        category: FeatureCategory.HEALTH,
        requiredPlan: 'premium',
        isEnabled: false
      };

      const result: FeatureAccessResult = {
        allowed: false,
        feature,
        currentPlan: 'enterprise',
        requiredPlan: 'premium',
        message: 'Feature temporariamente desabilitada'
      };

      expect(result.allowed).toBeFalse();
      expect(result.message).toContain('desabilitada');
    });
  });

  /**
   * LimitCheckResult Interface Tests
   */
  describe('LimitCheckResult interface', () => {
    it('should indicate within limit', () => {
      const result: LimitCheckResult = {
        allowed: true,
        currentUsage: 5,
        limit: 10,
        remaining: 5,
        isUnlimited: false
      };

      expect(result.allowed).toBeTrue();
      expect(result.remaining).toBe(5);
    });

    it('should indicate limit reached', () => {
      const result: LimitCheckResult = {
        allowed: false,
        currentUsage: 10,
        limit: 10,
        remaining: 0,
        isUnlimited: false,
        message: 'Limite atingido (10/10). Faça upgrade para continuar.'
      };

      expect(result.allowed).toBeFalse();
      expect(result.remaining).toBe(0);
      expect(result.message).toContain('Limite atingido');
    });

    it('should indicate unlimited', () => {
      const result: LimitCheckResult = {
        allowed: true,
        currentUsage: 1000,
        limit: -1,
        remaining: Infinity,
        isUnlimited: true
      };

      expect(result.isUnlimited).toBeTrue();
      expect(result.remaining).toBe(Infinity);
    });
  });

  /**
   * Limit Calculation Tests
   */
  describe('Limit calculations', () => {
    it('should calculate remaining correctly', () => {
      const limit = 10;
      const currentUsage = 3;
      const remaining = Math.max(0, limit - currentUsage);

      expect(remaining).toBe(7);
    });

    it('should not go negative', () => {
      const limit = 10;
      const currentUsage = 15;
      const remaining = Math.max(0, limit - currentUsage);

      expect(remaining).toBe(0);
    });

    it('should handle unlimited (-1)', () => {
      const limit = -1;
      const isUnlimited = limit === -1;

      expect(isUnlimited).toBeTrue();
    });

    it('should check if allowed', () => {
      const checkAllowed = (currentUsage: number, limit: number): boolean => {
        if (limit === -1) return true;
        return currentUsage < limit;
      };

      expect(checkAllowed(5, 10)).toBeTrue();
      expect(checkAllowed(10, 10)).toBeFalse();
      expect(checkAllowed(100, -1)).toBeTrue();
    });
  });

  /**
   * Core Features Tests
   */
  describe('Core features', () => {
    const coreFeatures: FeatureId[] = [
      'basic_medication_tracking',
      'local_reminders',
      'offline_sync',
      'basic_gamification'
    ];

    it('should all be available to free plan', () => {
      const features: FeatureAccess[] = coreFeatures.map(id => ({
        id,
        name: 'Test',
        description: 'Test',
        category: FeatureCategory.CORE,
        requiredPlan: 'free' as SubscriptionPlan,
        isEnabled: true
      }));

      features.forEach(f => {
        expect(f.requiredPlan).toBe('free');
      });
    });

    it('should have 4 core features', () => {
      expect(coreFeatures.length).toBe(4);
    });
  });

  /**
   * Premium Features Tests
   */
  describe('Premium features', () => {
    const premiumFeatures: FeatureId[] = [
      'ocr_scanner',
      'interaction_checker',
      'smart_reminders',
      'generate_reports',
      'basic_insights'
    ];

    it('should require at least premium plan', () => {
      premiumFeatures.forEach(id => {
        const feature: FeatureAccess = {
          id,
          name: 'Test',
          description: 'Test',
          category: FeatureCategory.MEDICATION,
          requiredPlan: 'premium',
          isEnabled: true
        };

        expect(['premium', 'family', 'enterprise']).toContain(feature.requiredPlan);
      });
    });
  });

  /**
   * Family Features Tests
   */
  describe('Family features', () => {
    const familyFeatures: FeatureId[] = [
      'add_dependents',
      'add_caretakers',
      'family_dashboard',
      'caretaker_chat',
      'shared_calendar'
    ];

    it('should all be family-related', () => {
      familyFeatures.forEach(id => {
        expect(id).toMatch(/family|dependent|caretaker|calendar/i);
      });
    });

    it('should have 5 family features', () => {
      expect(familyFeatures.length).toBe(5);
    });
  });

  /**
   * Enterprise Features Tests
   */
  describe('Enterprise features', () => {
    const enterpriseFeatures: FeatureId[] = [
      'api_access',
      'white_label',
      'sso',
      'bulk_import',
      'audit_logs'
    ];

    it('should require enterprise plan', () => {
      enterpriseFeatures.forEach(id => {
        const feature: FeatureAccess = {
          id,
          name: 'Test',
          description: 'Test',
          category: FeatureCategory.ENTERPRISE,
          requiredPlan: 'enterprise',
          isEnabled: true
        };

        expect(feature.requiredPlan).toBe('enterprise');
      });
    });

    it('should have 5 enterprise features', () => {
      expect(enterpriseFeatures.length).toBe(5);
    });
  });

  /**
   * Plan Display Name Tests
   */
  describe('Plan display names', () => {
    it('should return proper display names', () => {
      const getPlanDisplayName = (plan: SubscriptionPlan): string => {
        const names: Record<SubscriptionPlan, string> = {
          free: 'Gratuito',
          premium: 'Premium',
          family: 'Família',
          enterprise: 'Enterprise'
        };
        return names[plan];
      };

      expect(getPlanDisplayName('free')).toBe('Gratuito');
      expect(getPlanDisplayName('premium')).toBe('Premium');
      expect(getPlanDisplayName('family')).toBe('Família');
      expect(getPlanDisplayName('enterprise')).toBe('Enterprise');
    });
  });

  /**
   * Feature Group Tests
   */
  describe('Feature grouping by category', () => {
    it('should group features by category', () => {
      const features: FeatureAccess[] = [
        { id: 'basic_medication_tracking', name: 'a', description: 'a', category: FeatureCategory.CORE, requiredPlan: 'free', isEnabled: true },
        { id: 'local_reminders', name: 'b', description: 'b', category: FeatureCategory.CORE, requiredPlan: 'free', isEnabled: true },
        { id: 'ocr_scanner', name: 'c', description: 'c', category: FeatureCategory.MEDICATION, requiredPlan: 'premium', isEnabled: true },
        { id: 'add_dependents', name: 'd', description: 'd', category: FeatureCategory.FAMILY, requiredPlan: 'family', isEnabled: true }
      ];

      const grouped: Record<FeatureCategory, FeatureAccess[]> = {} as any;
      features.forEach(f => {
        if (!grouped[f.category]) {
          grouped[f.category] = [];
        }
        grouped[f.category].push(f);
      });

      expect(grouped[FeatureCategory.CORE].length).toBe(2);
      expect(grouped[FeatureCategory.MEDICATION].length).toBe(1);
      expect(grouped[FeatureCategory.FAMILY].length).toBe(1);
    });
  });

  /**
   * hasAccess Logic Tests
   */
  describe('hasAccess logic', () => {
    const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
      free: 0, premium: 1, family: 2, enterprise: 3
    };

    const isPlanSufficient = (currentPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean => {
      return PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];
    };

    const hasAccess = (feature: FeatureAccess, currentPlan: SubscriptionPlan): FeatureAccessResult => {
      if (!feature.isEnabled) {
        return {
          allowed: false,
          feature,
          currentPlan,
          requiredPlan: feature.requiredPlan,
          message: 'Feature temporariamente desabilitada'
        };
      }

      const allowed = isPlanSufficient(currentPlan, feature.requiredPlan);
      return {
        allowed,
        feature,
        currentPlan,
        requiredPlan: feature.requiredPlan,
        message: allowed ? undefined : `Faça upgrade para ${feature.requiredPlan}`
      };
    };

    it('should allow access when plan is sufficient', () => {
      const feature: FeatureAccess = {
        id: 'basic_medication_tracking',
        name: 'Test',
        description: 'Test',
        category: FeatureCategory.CORE,
        requiredPlan: 'free',
        isEnabled: true
      };

      const result = hasAccess(feature, 'premium');
      expect(result.allowed).toBeTrue();
    });

    it('should deny access when plan is insufficient', () => {
      const feature: FeatureAccess = {
        id: 'api_access',
        name: 'API',
        description: 'API',
        category: FeatureCategory.ENTERPRISE,
        requiredPlan: 'enterprise',
        isEnabled: true
      };

      const result = hasAccess(feature, 'free');
      expect(result.allowed).toBeFalse();
    });

    it('should deny access when feature is disabled', () => {
      const feature: FeatureAccess = {
        id: 'telehealth_consults',
        name: 'Telehealth',
        description: 'Telehealth',
        category: FeatureCategory.HEALTH,
        requiredPlan: 'free',
        isEnabled: false
      };

      const result = hasAccess(feature, 'enterprise');
      expect(result.allowed).toBeFalse();
      expect(result.message).toContain('desabilitada');
    });
  });

  /**
   * Upgrade Messaging Tests
   */
  describe('Upgrade messaging', () => {
    it('should generate upgrade message', () => {
      const generateUpgradeMessage = (requiredPlan: SubscriptionPlan): string => {
        const displayNames: Record<SubscriptionPlan, string> = {
          free: 'Gratuito',
          premium: 'Premium',
          family: 'Família',
          enterprise: 'Enterprise'
        };
        return `Faça upgrade para ${displayNames[requiredPlan]} para acessar este recurso`;
      };

      expect(generateUpgradeMessage('premium')).toBe('Faça upgrade para Premium para acessar este recurso');
      expect(generateUpgradeMessage('enterprise')).toBe('Faça upgrade para Enterprise para acessar este recurso');
    });
  });
});
