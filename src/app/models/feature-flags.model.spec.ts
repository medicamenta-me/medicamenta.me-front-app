/**
 * Feature Flags Model Tests
 * Tests for feature flag types, interfaces and constants
 */
import { 
  FeatureFlagName,
  FeatureFlag,
  DEFAULT_FEATURE_FLAGS,
  FeatureFlagCheckResult
} from './feature-flags.model';

describe('Feature Flags Model', () => {
  describe('FeatureFlagName type', () => {
    // Core Premium Features
    it('should include ocr_scanner flag', () => {
      const flag: FeatureFlagName = 'ocr_scanner';
      expect(flag).toBe('ocr_scanner');
    });

    it('should include advanced_insights flag', () => {
      const flag: FeatureFlagName = 'advanced_insights';
      expect(flag).toBe('advanced_insights');
    });

    it('should include wearable_integration flag', () => {
      const flag: FeatureFlagName = 'wearable_integration';
      expect(flag).toBe('wearable_integration');
    });

    it('should include scheduled_reports flag', () => {
      const flag: FeatureFlagName = 'scheduled_reports';
      expect(flag).toBe('scheduled_reports');
    });

    it('should include interaction_checker flag', () => {
      const flag: FeatureFlagName = 'interaction_checker';
      expect(flag).toBe('interaction_checker');
    });

    it('should include smart_reminders flag', () => {
      const flag: FeatureFlagName = 'smart_reminders';
      expect(flag).toBe('smart_reminders');
    });

    // Family Features
    it('should include family_dashboard flag', () => {
      const flag: FeatureFlagName = 'family_dashboard';
      expect(flag).toBe('family_dashboard');
    });

    it('should include chat_feature flag', () => {
      const flag: FeatureFlagName = 'chat_feature';
      expect(flag).toBe('chat_feature');
    });

    it('should include shared_calendar flag', () => {
      const flag: FeatureFlagName = 'shared_calendar';
      expect(flag).toBe('shared_calendar');
    });

    it('should include delegated_tasks flag', () => {
      const flag: FeatureFlagName = 'delegated_tasks';
      expect(flag).toBe('delegated_tasks');
    });

    it('should include family_reports flag', () => {
      const flag: FeatureFlagName = 'family_reports';
      expect(flag).toBe('family_reports');
    });

    // Enterprise Features
    it('should include enterprise_sso flag', () => {
      const flag: FeatureFlagName = 'enterprise_sso';
      expect(flag).toBe('enterprise_sso');
    });

    it('should include white_label flag', () => {
      const flag: FeatureFlagName = 'white_label';
      expect(flag).toBe('white_label');
    });

    it('should include api_access flag', () => {
      const flag: FeatureFlagName = 'api_access';
      expect(flag).toBe('api_access');
    });

    it('should include bulk_import flag', () => {
      const flag: FeatureFlagName = 'bulk_import';
      expect(flag).toBe('bulk_import');
    });

    it('should include audit_logs flag', () => {
      const flag: FeatureFlagName = 'audit_logs';
      expect(flag).toBe('audit_logs');
    });

    // Experimental Features
    it('should include p2p_sync flag', () => {
      const flag: FeatureFlagName = 'p2p_sync';
      expect(flag).toBe('p2p_sync');
    });

    it('should include voice_notifications flag', () => {
      const flag: FeatureFlagName = 'voice_notifications';
      expect(flag).toBe('voice_notifications');
    });

    it('should include assistant_integration flag', () => {
      const flag: FeatureFlagName = 'assistant_integration';
      expect(flag).toBe('assistant_integration');
    });

    it('should include ml_predictor flag', () => {
      const flag: FeatureFlagName = 'ml_predictor';
      expect(flag).toBe('ml_predictor');
    });

    it('should include sentiment_analysis flag', () => {
      const flag: FeatureFlagName = 'sentiment_analysis';
      expect(flag).toBe('sentiment_analysis');
    });

    // Platform Features
    it('should include push_notifications flag', () => {
      const flag: FeatureFlagName = 'push_notifications';
      expect(flag).toBe('push_notifications');
    });

    it('should include background_sync flag', () => {
      const flag: FeatureFlagName = 'background_sync';
      expect(flag).toBe('background_sync');
    });

    it('should include biometric_auth flag', () => {
      const flag: FeatureFlagName = 'biometric_auth';
      expect(flag).toBe('biometric_auth');
    });

    it('should include offline_mode flag', () => {
      const flag: FeatureFlagName = 'offline_mode';
      expect(flag).toBe('offline_mode');
    });
  });

  describe('FeatureFlag interface', () => {
    it('should have required properties', () => {
      const flag: FeatureFlag = {
        name: 'ocr_scanner',
        enabled: true
      };
      expect(flag.name).toBe('ocr_scanner');
      expect(flag.enabled).toBeTrue();
    });

    it('should allow optional requiredPlan', () => {
      const flag: FeatureFlag = {
        name: 'advanced_insights',
        enabled: true,
        requiredPlan: 'premium'
      };
      expect(flag.requiredPlan).toBe('premium');
    });

    it('should allow premium plan requirement', () => {
      const flag: FeatureFlag = {
        name: 'ocr_scanner',
        enabled: true,
        requiredPlan: 'premium'
      };
      expect(flag.requiredPlan).toBe('premium');
    });

    it('should allow family plan requirement', () => {
      const flag: FeatureFlag = {
        name: 'family_dashboard',
        enabled: true,
        requiredPlan: 'family'
      };
      expect(flag.requiredPlan).toBe('family');
    });

    it('should allow enterprise plan requirement', () => {
      const flag: FeatureFlag = {
        name: 'enterprise_sso',
        enabled: false,
        requiredPlan: 'enterprise'
      };
      expect(flag.requiredPlan).toBe('enterprise');
    });

    it('should allow optional rolloutPercentage', () => {
      const flag: FeatureFlag = {
        name: 'ml_predictor',
        enabled: false,
        rolloutPercentage: 10
      };
      expect(flag.rolloutPercentage).toBe(10);
    });

    it('should allow rolloutPercentage of 0', () => {
      const flag: FeatureFlag = {
        name: 'biometric_auth',
        enabled: false,
        rolloutPercentage: 0
      };
      expect(flag.rolloutPercentage).toBe(0);
    });

    it('should allow rolloutPercentage of 100', () => {
      const flag: FeatureFlag = {
        name: 'offline_mode',
        enabled: true,
        rolloutPercentage: 100
      };
      expect(flag.rolloutPercentage).toBe(100);
    });

    it('should allow optional abTestVariant', () => {
      const flag: FeatureFlag = {
        name: 'smart_reminders',
        enabled: true,
        abTestVariant: 'variant_a'
      };
      expect(flag.abTestVariant).toBe('variant_a');
    });

    it('should allow optional description', () => {
      const flag: FeatureFlag = {
        name: 'ocr_scanner',
        enabled: true,
        description: 'Scan prescriptions with OCR'
      };
      expect(flag.description).toBe('Scan prescriptions with OCR');
    });

    it('should allow optional betaOnly', () => {
      const flag: FeatureFlag = {
        name: 'p2p_sync',
        enabled: false,
        betaOnly: true
      };
      expect(flag.betaOnly).toBeTrue();
    });

    it('should allow optional platformRestrictions for iOS', () => {
      const flag: FeatureFlag = {
        name: 'biometric_auth',
        enabled: false,
        platformRestrictions: ['ios']
      };
      expect(flag.platformRestrictions).toContain('ios');
    });

    it('should allow optional platformRestrictions for Android', () => {
      const flag: FeatureFlag = {
        name: 'biometric_auth',
        enabled: false,
        platformRestrictions: ['android']
      };
      expect(flag.platformRestrictions).toContain('android');
    });

    it('should allow optional platformRestrictions for Web', () => {
      const flag: FeatureFlag = {
        name: 'offline_mode',
        enabled: true,
        platformRestrictions: ['web']
      };
      expect(flag.platformRestrictions).toContain('web');
    });

    it('should allow multiple platformRestrictions', () => {
      const flag: FeatureFlag = {
        name: 'wearable_integration',
        enabled: true,
        platformRestrictions: ['ios', 'android']
      };
      expect(flag.platformRestrictions).toEqual(['ios', 'android']);
    });

    it('should have all optional properties', () => {
      const flag: FeatureFlag = {
        name: 'ml_predictor',
        enabled: false,
        requiredPlan: 'premium',
        rolloutPercentage: 10,
        abTestVariant: 'test_variant',
        description: 'ML dose prediction',
        betaOnly: true,
        platformRestrictions: ['ios', 'android', 'web']
      };
      expect(flag.name).toBe('ml_predictor');
      expect(flag.enabled).toBeFalse();
      expect(flag.requiredPlan).toBe('premium');
      expect(flag.rolloutPercentage).toBe(10);
      expect(flag.abTestVariant).toBe('test_variant');
      expect(flag.description).toBe('ML dose prediction');
      expect(flag.betaOnly).toBeTrue();
      expect(flag.platformRestrictions).toEqual(['ios', 'android', 'web']);
    });
  });

  describe('DEFAULT_FEATURE_FLAGS constant', () => {
    it('should be defined', () => {
      expect(DEFAULT_FEATURE_FLAGS).toBeDefined();
    });

    it('should be an object', () => {
      expect(typeof DEFAULT_FEATURE_FLAGS).toBe('object');
    });

    it('should have 25 feature flags', () => {
      const flagCount = Object.keys(DEFAULT_FEATURE_FLAGS).length;
      expect(flagCount).toBe(25);
    });

    // Core Premium Features
    describe('Core Premium Features', () => {
      it('should have ocr_scanner enabled with premium plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.ocr_scanner;
        expect(flag.name).toBe('ocr_scanner');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('premium');
      });

      it('should have advanced_insights enabled with premium plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.advanced_insights;
        expect(flag.name).toBe('advanced_insights');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('premium');
      });

      it('should have wearable_integration enabled with platform restrictions', () => {
        const flag = DEFAULT_FEATURE_FLAGS.wearable_integration;
        expect(flag.name).toBe('wearable_integration');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('premium');
        expect(flag.platformRestrictions).toEqual(['ios', 'android']);
      });

      it('should have scheduled_reports enabled with premium plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.scheduled_reports;
        expect(flag.name).toBe('scheduled_reports');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('premium');
      });

      it('should have interaction_checker enabled with premium plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.interaction_checker;
        expect(flag.name).toBe('interaction_checker');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('premium');
      });

      it('should have smart_reminders enabled with premium plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.smart_reminders;
        expect(flag.name).toBe('smart_reminders');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('premium');
      });
    });

    // Family Features
    describe('Family Features', () => {
      it('should have family_dashboard enabled with family plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.family_dashboard;
        expect(flag.name).toBe('family_dashboard');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('family');
      });

      it('should have chat_feature enabled with family plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.chat_feature;
        expect(flag.name).toBe('chat_feature');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('family');
      });

      it('should have shared_calendar disabled with family plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.shared_calendar;
        expect(flag.name).toBe('shared_calendar');
        expect(flag.enabled).toBeFalse();
        expect(flag.requiredPlan).toBe('family');
        expect(flag.rolloutPercentage).toBe(0);
      });

      it('should have delegated_tasks disabled with family plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.delegated_tasks;
        expect(flag.name).toBe('delegated_tasks');
        expect(flag.enabled).toBeFalse();
        expect(flag.requiredPlan).toBe('family');
      });

      it('should have family_reports disabled with family plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.family_reports;
        expect(flag.name).toBe('family_reports');
        expect(flag.enabled).toBeFalse();
        expect(flag.requiredPlan).toBe('family');
      });
    });

    // Enterprise Features
    describe('Enterprise Features', () => {
      it('should have enterprise_sso disabled with enterprise plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.enterprise_sso;
        expect(flag.name).toBe('enterprise_sso');
        expect(flag.enabled).toBeFalse();
        expect(flag.requiredPlan).toBe('enterprise');
      });

      it('should have white_label disabled with enterprise plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.white_label;
        expect(flag.name).toBe('white_label');
        expect(flag.enabled).toBeFalse();
        expect(flag.requiredPlan).toBe('enterprise');
      });

      it('should have api_access disabled with enterprise plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.api_access;
        expect(flag.name).toBe('api_access');
        expect(flag.enabled).toBeFalse();
        expect(flag.requiredPlan).toBe('enterprise');
      });

      it('should have bulk_import disabled with enterprise plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.bulk_import;
        expect(flag.name).toBe('bulk_import');
        expect(flag.enabled).toBeFalse();
        expect(flag.requiredPlan).toBe('enterprise');
      });

      it('should have audit_logs enabled with enterprise plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.audit_logs;
        expect(flag.name).toBe('audit_logs');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('enterprise');
      });
    });

    // Experimental Features
    describe('Experimental/Beta Features', () => {
      it('should have p2p_sync disabled as beta', () => {
        const flag = DEFAULT_FEATURE_FLAGS.p2p_sync;
        expect(flag.name).toBe('p2p_sync');
        expect(flag.enabled).toBeFalse();
        expect(flag.betaOnly).toBeTrue();
      });

      it('should have voice_notifications disabled as beta', () => {
        const flag = DEFAULT_FEATURE_FLAGS.voice_notifications;
        expect(flag.name).toBe('voice_notifications');
        expect(flag.enabled).toBeFalse();
        expect(flag.betaOnly).toBeTrue();
      });

      it('should have assistant_integration disabled as beta with platform restrictions', () => {
        const flag = DEFAULT_FEATURE_FLAGS.assistant_integration;
        expect(flag.name).toBe('assistant_integration');
        expect(flag.enabled).toBeFalse();
        expect(flag.betaOnly).toBeTrue();
        expect(flag.platformRestrictions).toEqual(['ios', 'android']);
      });

      it('should have ml_predictor disabled as beta with rollout', () => {
        const flag = DEFAULT_FEATURE_FLAGS.ml_predictor;
        expect(flag.name).toBe('ml_predictor');
        expect(flag.enabled).toBeFalse();
        expect(flag.betaOnly).toBeTrue();
        expect(flag.rolloutPercentage).toBe(10);
      });

      it('should have sentiment_analysis disabled as beta', () => {
        const flag = DEFAULT_FEATURE_FLAGS.sentiment_analysis;
        expect(flag.name).toBe('sentiment_analysis');
        expect(flag.enabled).toBeFalse();
        expect(flag.betaOnly).toBeTrue();
      });
    });

    // Platform Features
    describe('Platform Features', () => {
      it('should have push_notifications enabled with premium plan', () => {
        const flag = DEFAULT_FEATURE_FLAGS.push_notifications;
        expect(flag.name).toBe('push_notifications');
        expect(flag.enabled).toBeTrue();
        expect(flag.requiredPlan).toBe('premium');
      });

      it('should have background_sync enabled', () => {
        const flag = DEFAULT_FEATURE_FLAGS.background_sync;
        expect(flag.name).toBe('background_sync');
        expect(flag.enabled).toBeTrue();
      });

      it('should have biometric_auth disabled with platform restrictions', () => {
        const flag = DEFAULT_FEATURE_FLAGS.biometric_auth;
        expect(flag.name).toBe('biometric_auth');
        expect(flag.enabled).toBeFalse();
        expect(flag.platformRestrictions).toEqual(['ios', 'android']);
        expect(flag.rolloutPercentage).toBe(0);
      });

      it('should have offline_mode enabled', () => {
        const flag = DEFAULT_FEATURE_FLAGS.offline_mode;
        expect(flag.name).toBe('offline_mode');
        expect(flag.enabled).toBeTrue();
      });
    });

    // Validation Tests
    describe('Validation', () => {
      it('should have name property matching the key for all flags', () => {
        Object.entries(DEFAULT_FEATURE_FLAGS).forEach(([key, flag]) => {
          expect(flag.name).toBe(key);
        });
      });

      it('should have enabled property for all flags', () => {
        Object.values(DEFAULT_FEATURE_FLAGS).forEach(flag => {
          expect(typeof flag.enabled).toBe('boolean');
        });
      });

      it('should have description for all flags', () => {
        Object.values(DEFAULT_FEATURE_FLAGS).forEach(flag => {
          expect(flag.description).toBeDefined();
          expect(flag.description!.length).toBeGreaterThan(0);
        });
      });

      it('should not have any enabled enterprise features', () => {
        const enterpriseFlags = Object.values(DEFAULT_FEATURE_FLAGS)
          .filter(flag => flag.requiredPlan === 'enterprise');
        
        const enabledEnterprise = enterpriseFlags.filter(flag => flag.enabled);
        // Only audit_logs should be enabled
        expect(enabledEnterprise.length).toBe(1);
        expect(enabledEnterprise[0].name).toBe('audit_logs');
      });

      it('should have all beta flags disabled by default', () => {
        const betaFlags = Object.values(DEFAULT_FEATURE_FLAGS)
          .filter(flag => flag.betaOnly === true);
        
        betaFlags.forEach(flag => {
          expect(flag.enabled).toBeFalse();
        });
      });
    });
  });

  describe('FeatureFlagCheckResult interface', () => {
    it('should have required allowed property', () => {
      const result: FeatureFlagCheckResult = {
        allowed: true
      };
      expect(result.allowed).toBeTrue();
    });

    it('should allow denied result', () => {
      const result: FeatureFlagCheckResult = {
        allowed: false
      };
      expect(result.allowed).toBeFalse();
    });

    it('should allow optional reason', () => {
      const result: FeatureFlagCheckResult = {
        allowed: false,
        reason: 'Feature requires premium plan'
      };
      expect(result.reason).toBe('Feature requires premium plan');
    });

    it('should allow optional upgradeRequired flag', () => {
      const result: FeatureFlagCheckResult = {
        allowed: false,
        upgradeRequired: true
      };
      expect(result.upgradeRequired).toBeTrue();
    });

    it('should allow optional requiredPlan', () => {
      const result: FeatureFlagCheckResult = {
        allowed: false,
        requiredPlan: 'premium'
      };
      expect(result.requiredPlan).toBe('premium');
    });

    it('should have all optional properties for denied result', () => {
      const result: FeatureFlagCheckResult = {
        allowed: false,
        reason: 'Upgrade required for OCR Scanner',
        upgradeRequired: true,
        requiredPlan: 'premium'
      };
      expect(result.allowed).toBeFalse();
      expect(result.reason).toBe('Upgrade required for OCR Scanner');
      expect(result.upgradeRequired).toBeTrue();
      expect(result.requiredPlan).toBe('premium');
    });

    it('should work for allowed result without optional properties', () => {
      const result: FeatureFlagCheckResult = {
        allowed: true
      };
      expect(result.allowed).toBeTrue();
      expect(result.reason).toBeUndefined();
      expect(result.upgradeRequired).toBeUndefined();
      expect(result.requiredPlan).toBeUndefined();
    });
  });
});
