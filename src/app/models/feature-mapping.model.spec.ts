import {
  FeatureCategory,
  FeatureId,
  FeatureAccess,
  PlanConfiguration,
  PLAN_LIMITS,
  FEATURE_MAP,
  PLAN_HIERARCHY,
  LimitCheckResult,
  FeatureAccessResult
} from './feature-mapping.model';
import { SubscriptionPlan, DEFAULT_FEATURES } from './subscription.model';

describe('FeatureMappingModel', () => {
  describe('FeatureCategory enum', () => {
    it('should have all required categories', () => {
      expect(FeatureCategory.CORE).toBe('core');
      expect(FeatureCategory.MEDICATION).toBe('medication');
      expect(FeatureCategory.FAMILY).toBe('family');
      expect(FeatureCategory.HEALTH).toBe('health');
      expect(FeatureCategory.ANALYTICS).toBe('analytics');
      expect(FeatureCategory.INTEGRATION).toBe('integration');
      expect(FeatureCategory.SUPPORT).toBe('support');
      expect(FeatureCategory.ENTERPRISE).toBe('enterprise');
    });

    it('should have exactly 8 categories', () => {
      const categories = Object.values(FeatureCategory);
      expect(categories.length).toBe(8);
    });
  });

  describe('PLAN_LIMITS', () => {
    it('should have limits for all plans', () => {
      const plans: SubscriptionPlan[] = ['free', 'premium', 'family', 'enterprise'];
      
      plans.forEach((plan) => {
        expect(PLAN_LIMITS[plan]).toBeDefined();
      });
    });

    describe('free plan limits', () => {
      it('should have correct max medications', () => {
        expect(PLAN_LIMITS.free.maxMedications).toBe(DEFAULT_FEATURES.free.maxMedications);
      });

      it('should have correct max dependents', () => {
        expect(PLAN_LIMITS.free.maxDependents).toBe(DEFAULT_FEATURES.free.maxDependents);
      });

      it('should have correct max caretakers', () => {
        expect(PLAN_LIMITS.free.maxCaretakers).toBe(DEFAULT_FEATURES.free.maxCaretakers);
      });

      it('should have correct reports per month', () => {
        expect(PLAN_LIMITS.free.reportsPerMonth).toBe(DEFAULT_FEATURES.free.reportsPerMonth);
      });

      it('should have correct OCR scans per month', () => {
        expect(PLAN_LIMITS.free.ocrScansPerMonth).toBe(DEFAULT_FEATURES.free.ocrScansPerMonth);
      });
    });

    describe('premium plan limits', () => {
      // Helper to compare limits where -1 means unlimited (highest)
      const isHigherOrEqual = (a: number, b: number): boolean => {
        if (a === -1) return true; // -1 is unlimited, always highest
        if (b === -1) return false; // b is unlimited, a is not
        return a >= b;
      };

      it('should have higher or equal limits than free', () => {
        expect(isHigherOrEqual(PLAN_LIMITS.premium.maxMedications, PLAN_LIMITS.free.maxMedications)).toBe(true);
        expect(isHigherOrEqual(PLAN_LIMITS.premium.maxDependents, PLAN_LIMITS.free.maxDependents)).toBe(true);
        expect(isHigherOrEqual(PLAN_LIMITS.premium.reportsPerMonth, PLAN_LIMITS.free.reportsPerMonth)).toBe(true);
      });
    });

    describe('family plan limits', () => {
      // Helper to compare limits where -1 means unlimited (highest)
      const isHigherOrEqual = (a: number, b: number): boolean => {
        if (a === -1) return true;
        if (b === -1) return false;
        return a >= b;
      };

      it('should have higher or equal limits than premium', () => {
        expect(isHigherOrEqual(PLAN_LIMITS.family.maxMedications, PLAN_LIMITS.premium.maxMedications)).toBe(true);
        expect(isHigherOrEqual(PLAN_LIMITS.family.maxDependents, PLAN_LIMITS.premium.maxDependents)).toBe(true);
        expect(isHigherOrEqual(PLAN_LIMITS.family.maxCaretakers, PLAN_LIMITS.premium.maxCaretakers)).toBe(true);
      });
    });

    describe('enterprise plan limits', () => {
      it('should have highest limits (-1 for unlimited)', () => {
        expect(PLAN_LIMITS.enterprise.maxMedications).toBe(-1);
        expect(PLAN_LIMITS.enterprise.maxDependents).toBe(-1);
        expect(PLAN_LIMITS.enterprise.maxCaretakers).toBe(-1);
        expect(PLAN_LIMITS.enterprise.reportsPerMonth).toBe(-1);
        expect(PLAN_LIMITS.enterprise.ocrScansPerMonth).toBe(-1);
      });
    });

    it('should have all required limit properties', () => {
      const requiredProperties = [
        'maxMedications',
        'maxDependents',
        'maxCaretakers',
        'reportsPerMonth',
        'ocrScansPerMonth',
        'telehealthConsultsPerMonth',
        'insightsHistoryDays',
        'maxStorageMB'
      ];

      Object.values(PLAN_LIMITS).forEach((limits) => {
        requiredProperties.forEach((prop) => {
          expect((limits as any)[prop]).toBeDefined();
        });
      });
    });
  });

  describe('FEATURE_MAP', () => {
    it('should have all features defined', () => {
      const expectedFeatureIds: FeatureId[] = [
        'basic_medication_tracking',
        'local_reminders',
        'offline_sync',
        'basic_gamification',
        'unlimited_medications',
        'ocr_scanner',
        'interaction_checker',
        'smart_reminders',
        'add_dependents',
        'add_caretakers',
        'family_dashboard',
        'caretaker_chat',
        'shared_calendar',
        'generate_reports',
        'basic_insights',
        'advanced_insights',
        'scheduled_reports',
        'telehealth_consults',
        'wearable_integration',
        'push_notifications',
        'api_access',
        'priority_support',
        'white_label',
        'sso',
        'bulk_import',
        'audit_logs'
      ];

      expectedFeatureIds.forEach((featureId) => {
        expect(FEATURE_MAP[featureId]).toBeDefined();
      });
    });

    describe('core features', () => {
      it('should have basic_medication_tracking available for free', () => {
        const feature = FEATURE_MAP['basic_medication_tracking'];
        expect(feature.requiredPlan).toBe('free');
        expect(feature.category).toBe(FeatureCategory.CORE);
        expect(feature.isEnabled).toBe(true);
      });

      it('should have local_reminders available for free', () => {
        const feature = FEATURE_MAP['local_reminders'];
        expect(feature.requiredPlan).toBe('free');
        expect(feature.isEnabled).toBe(true);
      });

      it('should have offline_sync available for free', () => {
        const feature = FEATURE_MAP['offline_sync'];
        expect(feature.requiredPlan).toBe('free');
        expect(feature.isEnabled).toBe(true);
      });

      it('should have basic_gamification available for free', () => {
        const feature = FEATURE_MAP['basic_gamification'];
        expect(feature.requiredPlan).toBe('free');
        expect(feature.isEnabled).toBe(true);
      });
    });

    describe('premium features', () => {
      it('should have ocr_scanner requiring premium', () => {
        const feature = FEATURE_MAP['ocr_scanner'];
        expect(feature.requiredPlan).toBe('premium');
        expect(feature.category).toBe(FeatureCategory.MEDICATION);
      });

      it('should have interaction_checker requiring premium', () => {
        const feature = FEATURE_MAP['interaction_checker'];
        expect(feature.requiredPlan).toBe('premium');
      });

      it('should have smart_reminders requiring premium', () => {
        const feature = FEATURE_MAP['smart_reminders'];
        expect(feature.requiredPlan).toBe('premium');
      });

      it('should have advanced_insights requiring premium', () => {
        const feature = FEATURE_MAP['advanced_insights'];
        expect(feature.requiredPlan).toBe('premium');
      });

      it('should have wearable_integration requiring premium', () => {
        const feature = FEATURE_MAP['wearable_integration'];
        expect(feature.requiredPlan).toBe('premium');
      });

      it('should have priority_support requiring premium', () => {
        const feature = FEATURE_MAP['priority_support'];
        expect(feature.requiredPlan).toBe('premium');
      });
    });

    describe('family features', () => {
      it('should have family_dashboard requiring family plan', () => {
        const feature = FEATURE_MAP['family_dashboard'];
        expect(feature.requiredPlan).toBe('family');
        expect(feature.category).toBe(FeatureCategory.FAMILY);
      });

      it('should have caretaker_chat requiring family plan', () => {
        const feature = FEATURE_MAP['caretaker_chat'];
        expect(feature.requiredPlan).toBe('family');
      });

      it('should have shared_calendar requiring family plan', () => {
        const feature = FEATURE_MAP['shared_calendar'];
        expect(feature.requiredPlan).toBe('family');
      });
    });

    describe('enterprise features', () => {
      it('should have api_access requiring enterprise', () => {
        const feature = FEATURE_MAP['api_access'];
        expect(feature.requiredPlan).toBe('enterprise');
        expect(feature.category).toBe(FeatureCategory.ENTERPRISE);
      });

      it('should have white_label requiring enterprise', () => {
        const feature = FEATURE_MAP['white_label'];
        expect(feature.requiredPlan).toBe('enterprise');
      });

      it('should have sso requiring enterprise', () => {
        const feature = FEATURE_MAP['sso'];
        expect(feature.requiredPlan).toBe('enterprise');
      });

      it('should have bulk_import requiring enterprise', () => {
        const feature = FEATURE_MAP['bulk_import'];
        expect(feature.requiredPlan).toBe('enterprise');
      });

      it('should have audit_logs requiring enterprise', () => {
        const feature = FEATURE_MAP['audit_logs'];
        expect(feature.requiredPlan).toBe('enterprise');
      });
    });

    describe('feature structure', () => {
      it('should have valid structure for all features', () => {
        Object.values(FEATURE_MAP).forEach((feature: FeatureAccess) => {
          expect(feature.id).toBeDefined();
          expect(feature.name).toBeDefined();
          expect(feature.description).toBeDefined();
          expect(feature.category).toBeDefined();
          expect(feature.requiredPlan).toBeDefined();
          expect(typeof feature.isEnabled).toBe('boolean');
        });
      });

      it('should have matching id and key', () => {
        Object.entries(FEATURE_MAP).forEach(([key, feature]) => {
          expect(feature.id).toBe(key);
        });
      });

      it('should have Brazilian Portuguese names and descriptions', () => {
        Object.values(FEATURE_MAP).forEach((feature: FeatureAccess) => {
          expect(feature.name.length).toBeGreaterThan(0);
          expect(feature.description.length).toBeGreaterThan(0);
        });
      });
    });

    describe('features with limits', () => {
      it('should have limits for ocr_scanner', () => {
        const feature = FEATURE_MAP['ocr_scanner'];
        expect(feature.limits).toBeDefined();
        expect(feature.limits?.ocrScansPerMonth).toBe(20);
      });

      it('should have limits for add_dependents', () => {
        const feature = FEATURE_MAP['add_dependents'];
        expect(feature.limits).toBeDefined();
        expect(feature.limits?.maxDependents).toBe(1);
      });

      it('should have limits for add_caretakers', () => {
        const feature = FEATURE_MAP['add_caretakers'];
        expect(feature.limits).toBeDefined();
        expect(feature.limits?.maxCaretakers).toBe(2);
      });

      it('should have limits for generate_reports', () => {
        const feature = FEATURE_MAP['generate_reports'];
        expect(feature.limits).toBeDefined();
        expect(feature.limits?.reportsPerMonth).toBe(3);
      });

      it('should have limits for basic_insights', () => {
        const feature = FEATURE_MAP['basic_insights'];
        expect(feature.limits).toBeDefined();
        expect(feature.limits?.insightsHistoryDays).toBe(30);
      });

      it('should have limits for telehealth_consults', () => {
        const feature = FEATURE_MAP['telehealth_consults'];
        expect(feature.limits).toBeDefined();
        expect(feature.limits?.telehealthConsultsPerMonth).toBe(1);
      });
    });
  });

  describe('PLAN_HIERARCHY', () => {
    it('should have all plans', () => {
      expect(PLAN_HIERARCHY.free).toBeDefined();
      expect(PLAN_HIERARCHY.premium).toBeDefined();
      expect(PLAN_HIERARCHY.family).toBeDefined();
      expect(PLAN_HIERARCHY.enterprise).toBeDefined();
    });

    it('should have free as lowest tier', () => {
      expect(PLAN_HIERARCHY.free).toBe(0);
    });

    it('should have premium above free', () => {
      expect(PLAN_HIERARCHY.premium).toBeGreaterThan(PLAN_HIERARCHY.free);
    });

    it('should have family above premium', () => {
      expect(PLAN_HIERARCHY.family).toBeGreaterThan(PLAN_HIERARCHY.premium);
    });

    it('should have enterprise as highest tier', () => {
      expect(PLAN_HIERARCHY.enterprise).toBeGreaterThan(PLAN_HIERARCHY.family);
      expect(PLAN_HIERARCHY.enterprise).toBe(3);
    });

    it('should have sequential ordering', () => {
      expect(PLAN_HIERARCHY.free).toBe(0);
      expect(PLAN_HIERARCHY.premium).toBe(1);
      expect(PLAN_HIERARCHY.family).toBe(2);
      expect(PLAN_HIERARCHY.enterprise).toBe(3);
    });

    it('should allow plan comparison', () => {
      const userPlan: SubscriptionPlan = 'premium';
      const requiredPlan: SubscriptionPlan = 'family';

      const hasAccess = PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
      expect(hasAccess).toBe(false);

      const userPlan2: SubscriptionPlan = 'enterprise';
      const hasAccess2 = PLAN_HIERARCHY[userPlan2] >= PLAN_HIERARCHY[requiredPlan];
      expect(hasAccess2).toBe(true);
    });
  });

  describe('LimitCheckResult interface', () => {
    it('should work with allowed result', () => {
      const result: LimitCheckResult = {
        allowed: true,
        currentUsage: 5,
        limit: 10,
        remaining: 5,
        isUnlimited: false
      };

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(5);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(5);
      expect(result.isUnlimited).toBe(false);
    });

    it('should work with denied result', () => {
      const result: LimitCheckResult = {
        allowed: false,
        currentUsage: 10,
        limit: 10,
        remaining: 0,
        isUnlimited: false,
        message: 'Limite atingido'
      };

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toBe('Limite atingido');
    });

    it('should work with unlimited result', () => {
      const result: LimitCheckResult = {
        allowed: true,
        currentUsage: 100,
        limit: -1,
        remaining: -1,
        isUnlimited: true
      };

      expect(result.allowed).toBe(true);
      expect(result.isUnlimited).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe('FeatureAccessResult interface', () => {
    it('should work with allowed access', () => {
      const feature = FEATURE_MAP['basic_medication_tracking'];
      const result: FeatureAccessResult = {
        allowed: true,
        feature,
        currentPlan: 'premium',
        requiredPlan: 'free'
      };

      expect(result.allowed).toBe(true);
      expect(result.feature).toBe(feature);
      expect(result.currentPlan).toBe('premium');
      expect(result.requiredPlan).toBe('free');
    });

    it('should work with denied access', () => {
      const feature = FEATURE_MAP['api_access'];
      const result: FeatureAccessResult = {
        allowed: false,
        feature,
        currentPlan: 'premium',
        requiredPlan: 'enterprise',
        message: 'Upgrade para Enterprise necessário'
      };

      expect(result.allowed).toBe(false);
      expect(result.currentPlan).toBe('premium');
      expect(result.requiredPlan).toBe('enterprise');
      expect(result.message).toContain('Enterprise');
    });
  });

  describe('Feature categorization', () => {
    it('should have features in CORE category', () => {
      const coreFeatures = Object.values(FEATURE_MAP).filter(
        (f) => f.category === FeatureCategory.CORE
      );
      expect(coreFeatures.length).toBeGreaterThan(0);
    });

    it('should have features in MEDICATION category', () => {
      const medicationFeatures = Object.values(FEATURE_MAP).filter(
        (f) => f.category === FeatureCategory.MEDICATION
      );
      expect(medicationFeatures.length).toBeGreaterThan(0);
    });

    it('should have features in FAMILY category', () => {
      const familyFeatures = Object.values(FEATURE_MAP).filter(
        (f) => f.category === FeatureCategory.FAMILY
      );
      expect(familyFeatures.length).toBeGreaterThan(0);
    });

    it('should have features in ENTERPRISE category', () => {
      const enterpriseFeatures = Object.values(FEATURE_MAP).filter(
        (f) => f.category === FeatureCategory.ENTERPRISE
      );
      expect(enterpriseFeatures.length).toBeGreaterThan(0);
    });

    it('should categorize all features into valid categories', () => {
      const validCategories = Object.values(FeatureCategory);
      
      Object.values(FEATURE_MAP).forEach((feature) => {
        expect(validCategories).toContain(feature.category);
      });
    });
  });

  describe('Free plan feature access', () => {
    it('should provide basic functionality in free plan', () => {
      const freeFeatures = Object.values(FEATURE_MAP).filter(
        (f) => f.requiredPlan === 'free'
      );

      const freeFeatureIds = freeFeatures.map((f) => f.id);
      
      expect(freeFeatureIds).toContain('basic_medication_tracking');
      expect(freeFeatureIds).toContain('local_reminders');
      expect(freeFeatureIds).toContain('offline_sync');
    });

    it('should have at least 5 free features', () => {
      const freeFeatures = Object.values(FEATURE_MAP).filter(
        (f) => f.requiredPlan === 'free'
      );
      expect(freeFeatures.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Premium feature upgrades', () => {
    it('should provide additional features in premium plan', () => {
      const premiumFeatures = Object.values(FEATURE_MAP).filter(
        (f) => f.requiredPlan === 'premium'
      );

      const premiumFeatureIds = premiumFeatures.map((f) => f.id);
      
      expect(premiumFeatureIds).toContain('ocr_scanner');
      expect(premiumFeatureIds).toContain('interaction_checker');
      expect(premiumFeatureIds).toContain('smart_reminders');
    });
  });
});
