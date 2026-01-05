/**
 * FeatureFlagsService Unit Tests
 * 
 * Tests for the Feature Flags Service that manages feature access based on:
 * - Subscription plan (Free, Premium, Family, Enterprise)
 * - Rollout percentage (gradual feature releases)
 * - Platform restrictions (iOS, Android, Web)
 * - Beta testing status
 * - Firebase Remote Config integration
 * 
 * Coverage:
 * - Feature access checks
 * - Plan-based restrictions
 * - Platform restrictions
 * - Rollout percentage logic
 * - Beta features
 * - Remote Config sync
 */

import { TestBed } from '@angular/core/testing';
import { FeatureFlagsService } from './feature-flags.service';
import { SubscriptionService } from './subscription.service';
import { RemoteConfigService } from './remote-config.service';
import { LogService } from './log.service';
import { FeatureFlagName, FeatureFlag, DEFAULT_FEATURE_FLAGS } from '../models/feature-flags.model';
import { Capacitor } from '@capacitor/core';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let mockSubscriptionService: jasmine.SpyObj<SubscriptionService>;
  let mockRemoteConfigService: jasmine.SpyObj<RemoteConfigService>;
  let mockLogService: jasmine.SpyObj<LogService>;

  beforeEach(() => {
    // Mock SubscriptionService with signal
    const currentPlanSignal = jasmine.createSpy('currentPlan').and.returnValue('free');
    mockSubscriptionService = jasmine.createSpyObj('SubscriptionService', [], {
      currentPlan: currentPlanSignal
    });

    // Mock RemoteConfigService
    mockRemoteConfigService = jasmine.createSpyObj('RemoteConfigService', [
      'getAllFeatureFlags',
      'fetchAndActivate'
    ]);
    mockRemoteConfigService.getAllFeatureFlags.and.returnValue({});
    mockRemoteConfigService.fetchAndActivate.and.returnValue(Promise.resolve(true));

    // Mock LogService
    mockLogService = jasmine.createSpyObj('LogService', ['info', 'warn', 'error', 'debug']);

    // Mock Capacitor.getPlatform
    spyOn(Capacitor, 'getPlatform').and.returnValue('web');

    TestBed.configureTestingModule({
      providers: [
        FeatureFlagsService,
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: RemoteConfigService, useValue: mockRemoteConfigService },
        { provide: LogService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(FeatureFlagsService);
  });

  // ==================== INITIALIZATION ====================

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should sync with Remote Config on creation', () => {
      expect(mockRemoteConfigService.getAllFeatureFlags).toHaveBeenCalled();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'FeatureFlagsService',
        'Synced with Remote Config'
      );
    });

    it('should detect current platform', () => {
      expect(service.currentPlatform()).toBe('web');
    });

    it('should initialize with default feature flags', () => {
      const flag = service.getFlag('ocr_scanner');
      expect(flag).toBeDefined();
    });
  });

  // ==================== BASIC ACCESS CHECKS ====================

  describe('Basic Access Checks', () => {
    it('should return true for enabled feature with no restrictions', () => {
      // Use existing feature: background_sync (no plan requirement)
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');
      
      service.updateFlag('background_sync', {
        enabled: true,
        requiredPlan: undefined,
        platformRestrictions: undefined,
        rolloutPercentage: 100
      });

      const result = service.hasAccess('background_sync');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false for disabled feature', () => {
      service.updateFlag('push_notifications', {
        enabled: false
      });

      const result = service.hasAccess('push_notifications');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature is currently disabled');
    });

    it('should return false for non-existent feature', () => {
      const result = service.hasAccess('non-existent-feature' as FeatureFlagName);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature not found');
    });

    it('should use isEnabled convenience method', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');
      
      service.updateFlag('background_sync', {
        enabled: true,
        rolloutPercentage: 100
      });

      expect(service.isEnabled('background_sync')).toBe(true);
    });
  });

  // ==================== PLAN-BASED RESTRICTIONS ====================

  describe('Plan-Based Restrictions', () => {
    it('should allow free plan user to access features with no plan requirement', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');

      service.updateFlag('offline_mode', {
        enabled: true,
        requiredPlan: undefined,
        rolloutPercentage: 100
      });

      const result = service.hasAccess('offline_mode');

      expect(result.allowed).toBe(true);
    });

    it('should block free plan user from premium features', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');

      service.updateFlag('advanced_insights', {
        enabled: true,
        requiredPlan: 'premium',
        rolloutPercentage: 100
      });

      const result = service.hasAccess('advanced_insights');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature requires premium plan');
      expect(result.upgradeRequired).toBe(true);
      expect(result.requiredPlan).toBe('premium');
    });

    it('should allow premium user to access premium features', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('premium');

      service.updateFlag('advanced_insights', {
        enabled: true,
        requiredPlan: 'premium',
        rolloutPercentage: 100
      });

      const result = service.hasAccess('advanced_insights');

      expect(result.allowed).toBe(true);
    });

    it('should allow family user to access premium features', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('family');

      service.updateFlag('advanced_insights', {
        enabled: true,
        requiredPlan: 'premium',
        rolloutPercentage: 100
      });

      const result = service.hasAccess('advanced_insights');

      expect(result.allowed).toBe(true);
    });

    it('should allow enterprise user to access all features', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('enterprise');

      service.updateFlag('api_access', {
        enabled: true,
        requiredPlan: 'enterprise',
        rolloutPercentage: 100
      });

      const result = service.hasAccess('api_access');

      expect(result.allowed).toBe(true);
    });
  });

  // ==================== PLATFORM RESTRICTIONS ====================

  describe('Platform Restrictions', () => {
    it('should allow access on correct platform (web)', () => {
      (Capacitor.getPlatform as jasmine.Spy).and.returnValue('web');
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');

      service.updateFlag('background_sync', {
        enabled: true,
        platformRestrictions: ['web'],
        rolloutPercentage: 100
      });

      const result = service.hasAccess('background_sync');

      expect(result.allowed).toBe(true);
    });

    it('should block access on wrong platform (iOS when web-only)', () => {
      (Capacitor.getPlatform as jasmine.Spy).and.returnValue('ios');

      service.updateFlag('push_notifications', {
        enabled: true,
        platformRestrictions: ['web'],
        rolloutPercentage: 100
      });

      const result = service.hasAccess('push_notifications');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature not available on ios');
    });

    it('should allow access when platform is in allowed list (iOS + Android)', () => {
      (Capacitor.getPlatform as jasmine.Spy).and.returnValue('ios');
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('premium');

      service.updateFlag('wearable_integration', {
        enabled: true,
        platformRestrictions: ['ios', 'android'],
        rolloutPercentage: 100
      });

      const result = service.hasAccess('wearable_integration');

      expect(result.allowed).toBe(true);
    });

    it('should allow access when no platform restrictions', () => {
      (Capacitor.getPlatform as jasmine.Spy).and.returnValue('android');

      service.updateFlag('offline_mode', {
        enabled: true,
        platformRestrictions: undefined,
        rolloutPercentage: 100
      });

      const result = service.hasAccess('offline_mode');

      expect(result.allowed).toBe(true);
    });
  });

  // ==================== ROLLOUT PERCENTAGE ====================

  describe('Rollout Percentage', () => {
    it('should allow access with 100% rollout', () => {
      service.updateFlag('background_sync', {
        enabled: true,
        rolloutPercentage: 100
      });

      const result = service.hasAccess('background_sync');

      expect(result.allowed).toBe(true);
    });

    it('should sometimes block access with 50% rollout', () => {
      spyOn(Math, 'random').and.returnValue(0.6); // 60% - should be blocked at 50% rollout
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('premium');

      service.updateFlag('interaction_checker', {
        enabled: true,
        betaOnly: false,
        rolloutPercentage: 50
      });

      const result = service.hasAccess('interaction_checker');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature not yet available to you');
    });

    it('should sometimes allow access with 50% rollout', () => {
      spyOn(Math, 'random').and.returnValue(0.3); // 30% - should be allowed at 50% rollout
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('premium');

      service.updateFlag('interaction_checker', {
        enabled: true,
        betaOnly: false,
        rolloutPercentage: 50
      });

      const result = service.hasAccess('interaction_checker');

      expect(result.allowed).toBe(true);
    });

    it('should handle 0% rollout (blocked for everyone)', () => {
      service.updateFlag('voice_notifications', {
        enabled: true,
        rolloutPercentage: 0
      });

      const result = service.hasAccess('voice_notifications');

      expect(result.allowed).toBe(false);
    });
  });

  // ==================== BETA FEATURES ====================

  describe('Beta Features', () => {
    it('should block beta features for non-beta users', () => {
      service.setBetaTester(false);

      service.updateFlag('assistant_integration', {
        enabled: true,
        betaOnly: true,
        rolloutPercentage: 100
      });

      const result = service.hasAccess('assistant_integration');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature is in beta testing');
    });

    it('should allow beta features for beta testers', () => {
      service.setBetaTester(true);
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');

      service.updateFlag('p2p_sync', {
        enabled: true,
        betaOnly: true,
        requiredPlan: undefined,
        rolloutPercentage: 100
      });

      const result = service.hasAccess('p2p_sync');

      expect(result.allowed).toBe(true);
    });

    it('should log beta tester status change', () => {
      service.setBetaTester(true);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'FeatureFlagsService',
        'Beta tester status',
        { isBeta: true }
      );
    });
  });

  // ==================== REMOTE CONFIG INTEGRATION ====================

  describe('Remote Config Integration', () => {
    it('should fetch and activate remote config', async () => {
      mockRemoteConfigService.fetchAndActivate.and.returnValue(Promise.resolve(true));

      await service.refreshFromRemoteConfig();

      expect(mockRemoteConfigService.fetchAndActivate).toHaveBeenCalled();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'FeatureFlagsService',
        'Refreshed feature flags from Remote Config'
      );
    });

    it('should not log if remote config not activated', async () => {
      mockRemoteConfigService.fetchAndActivate.and.returnValue(Promise.resolve(false));
      mockLogService.info.calls.reset();

      await service.refreshFromRemoteConfig();

      expect(mockRemoteConfigService.fetchAndActivate).toHaveBeenCalled();
      // Should not log "Refreshed" message
      expect(mockLogService.info).not.toHaveBeenCalledWith(
        'FeatureFlagsService',
        'Refreshed feature flags from Remote Config'
      );
    });

    it('should merge remote flags with default flags', () => {
      const remoteFlags = {
        'new-feature': {
          name: 'new-feature' as FeatureFlagName,
          enabled: true,
          requiredPlan: 'premium' as const,
          rolloutPercentage: 50
        }
      };

      mockRemoteConfigService.getAllFeatureFlags.and.returnValue(remoteFlags);

      // Create new service to trigger sync in constructor
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          FeatureFlagsService,
          { provide: SubscriptionService, useValue: mockSubscriptionService },
          { provide: RemoteConfigService, useValue: mockRemoteConfigService },
          { provide: LogService, useValue: mockLogService }
        ]
      });

      const newService = TestBed.inject(FeatureFlagsService);
      const flag = newService.getFlag('new-feature' as FeatureFlagName);

      expect(flag).toBeDefined();
      expect(flag?.enabled).toBe(true);
    });
  });

  // ==================== FEATURE MANAGEMENT ====================

  describe('Feature Management', () => {
    it('should get feature flag details', () => {
      service.updateFlag('scheduled_reports', {
        enabled: true,
        requiredPlan: 'premium',
        rolloutPercentage: 75
      });

      const flag = service.getFlag('scheduled_reports');

      expect(flag).toBeDefined();
      expect(flag?.enabled).toBe(true);
      expect(flag?.requiredPlan).toBe('premium');
      expect(flag?.rolloutPercentage).toBe(75);
    });

    it('should return undefined for non-existent flag', () => {
      const flag = service.getFlag('non-existent' as FeatureFlagName);

      expect(flag).toBeUndefined();
    });

    it('should list all enabled features for current user', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('premium');

      service.updateFlag('offline_mode', {
        enabled: true,
        requiredPlan: undefined,
        rolloutPercentage: 100
      });

      service.updateFlag('ocr_scanner', {
        enabled: true,
        requiredPlan: 'premium',
        rolloutPercentage: 100
      });

      service.updateFlag('shared_calendar', {
        enabled: false,
        rolloutPercentage: 100
      });

      const enabledFeatures = service.getEnabledFeatures();

      expect(enabledFeatures).toContain('offline_mode');
      expect(enabledFeatures).toContain('ocr_scanner');
      expect(enabledFeatures).not.toContain('shared_calendar');
    });

    it('should update feature flag', () => {
      service.updateFlag('interaction_checker', {
        enabled: true,
        requiredPlan: 'premium'
      });

      expect(mockLogService.info).toHaveBeenCalledWith(
        'FeatureFlagsService',
        'Updated flag',
        jasmine.objectContaining({
          featureName: 'interaction_checker'
        })
      );
    });

    it('should not update non-existent flag', () => {
      mockLogService.info.calls.reset();

      service.updateFlag('non-existent' as FeatureFlagName, {
        enabled: true
      });

      // Should not log update for non-existent flag
      const updateCalls = mockLogService.info.calls.all().filter(call => 
        call.args[1] === 'Updated flag'
      );
      expect(updateCalls.length).toBe(0);
    });
  });

  // ==================== COMPLEX SCENARIOS ====================

  describe('Complex Scenarios', () => {
    it('should handle multiple restrictions (plan + platform + rollout)', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('premium');
      (Capacitor.getPlatform as jasmine.Spy).and.returnValue('ios');
      spyOn(Math, 'random').and.returnValue(0.4); // 40% - allowed at 50%

      service.updateFlag('wearable_integration', {
        enabled: true,
        requiredPlan: 'premium',
        platformRestrictions: ['ios', 'android'],
        rolloutPercentage: 50
      });

      const result = service.hasAccess('wearable_integration');

      expect(result.allowed).toBe(true);
    });

    it('should fail on first restriction check (disabled)', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('enterprise');
      (Capacitor.getPlatform as jasmine.Spy).and.returnValue('ios');

      service.updateFlag('biometric_auth', {
        enabled: false, // Fails here
        requiredPlan: undefined,
        platformRestrictions: ['ios'],
        rolloutPercentage: 100
      });

      const result = service.hasAccess('biometric_auth');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature is currently disabled');
    });

    it('should fail on plan check even with correct platform', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');
      (Capacitor.getPlatform as jasmine.Spy).and.returnValue('ios');

      service.updateFlag('wearable_integration', {
        enabled: true,
        requiredPlan: 'premium', // Fails here
        platformRestrictions: ['ios'],
        rolloutPercentage: 100
      });

      const result = service.hasAccess('wearable_integration');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature requires premium plan');
    });

    it('should check beta status before other checks', () => {
      service.setBetaTester(false);

      service.updateFlag('sentiment_analysis', {
        enabled: true,
        betaOnly: true, // Fails here
        requiredPlan: 'premium',
        rolloutPercentage: 100
      });

      const result = service.hasAccess('sentiment_analysis');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Feature is in beta testing');
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle undefined rollout percentage as 100%', () => {
      service.updateFlag('background_sync', {
        enabled: true,
        rolloutPercentage: undefined
      });

      const result = service.hasAccess('background_sync');

      expect(result.allowed).toBe(true);
    });

    it('should handle empty platform restrictions as no restriction', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');
      
      service.updateFlag('background_sync', {
        enabled: true,
        platformRestrictions: [],
        rolloutPercentage: 100
      });

      const result = service.hasAccess('background_sync');

      expect(result.allowed).toBe(true);
    });

    it('should handle feature with no required plan', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('free');

      service.updateFlag('offline_mode', {
        enabled: true,
        requiredPlan: undefined,
        rolloutPercentage: 100
      });

      const result = service.hasAccess('offline_mode');

      expect(result.allowed).toBe(true);
    });

    it('should handle concurrent access checks', () => {
      (mockSubscriptionService.currentPlan as jasmine.Spy).and.returnValue('premium');
      
      service.updateFlag('smart_reminders', {
        enabled: true,
        rolloutPercentage: 100
      });

      const result1 = service.hasAccess('smart_reminders');
      const result2 = service.hasAccess('smart_reminders');
      const result3 = service.hasAccess('smart_reminders');

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);
    });
  });
});
