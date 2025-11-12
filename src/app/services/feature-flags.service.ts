import { Injectable, computed, inject, signal } from '@angular/core';
import { 
  FeatureFlagName, 
  FeatureFlag, 
  DEFAULT_FEATURE_FLAGS, 
  FeatureFlagCheckResult 
} from '../models/feature-flags.model';
import { SubscriptionService } from './subscription.service';
import { RemoteConfigService } from './remote-config.service';
import { LogService } from './log.service';
import { Capacitor } from '@capacitor/core';

/**
 * Feature Flags Service
 * Controls access to features based on subscription plan, rollout percentage, and platform.
 * Integrates with Firebase Remote Config for dynamic feature control without app updates.
 */
@Injectable({
  providedIn: 'root'
})
export class FeatureFlagsService {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly remoteConfigService = inject(RemoteConfigService);
  private readonly logService = inject(LogService);

  // Signals
  private readonly flags = signal<Record<FeatureFlagName, FeatureFlag>>(DEFAULT_FEATURE_FLAGS);
  private readonly isBetaTester = signal<boolean>(false);
  
  // Computed
  readonly currentPlatform = computed(() => {
    const platform = Capacitor.getPlatform();
    return platform as 'ios' | 'android' | 'web';
  });

  constructor() {
    // Sync with Remote Config when it updates
    this.syncWithRemoteConfig();
  }

  /**
   * Sync feature flags with Firebase Remote Config
   * Uses Remote Config values when available, falls back to local defaults
   */
  private syncWithRemoteConfig(): void {
    // Initial sync
    const remoteFlags = this.remoteConfigService.getAllFeatureFlags();
    this.flags.set({
      ...DEFAULT_FEATURE_FLAGS,
      ...remoteFlags
    });

    this.logService.info('FeatureFlagsService', 'Synced with Remote Config');
  }

  /**
   * Manual refresh from Remote Config
   */
  async refreshFromRemoteConfig(): Promise<void> {
    const activated = await this.remoteConfigService.fetchAndActivate();
    if (activated) {
      this.syncWithRemoteConfig();
      this.logService.info('FeatureFlagsService', 'Refreshed feature flags from Remote Config');
    }
  }

  /**
   * Check if user has access to a feature
   */
  hasAccess(featureName: FeatureFlagName): FeatureFlagCheckResult {
    const flag = this.flags()[featureName];
    
    if (!flag) {
      return {
        allowed: false,
        reason: 'Feature not found',
      };
    }

    // Check if feature is globally enabled
    if (!flag.enabled) {
      return {
        allowed: false,
        reason: 'Feature is currently disabled',
      };
    }

    // Check beta-only features
    if (flag.betaOnly && !this.isBetaTester()) {
      return {
        allowed: false,
        reason: 'Feature is in beta testing',
      };
    }

    // Check platform restrictions
    if (flag.platformRestrictions && flag.platformRestrictions.length > 0) {
      const currentPlatform = this.currentPlatform();
      if (!flag.platformRestrictions.includes(currentPlatform)) {
        return {
          allowed: false,
          reason: `Feature not available on ${currentPlatform}`,
        };
      }
    }

    // Check plan requirements
    if (flag.requiredPlan) {
      const currentPlan = this.subscriptionService.currentPlan();
      const planHierarchy = { free: 0, premium: 1, family: 2, enterprise: 3 };
      const requiredLevel = planHierarchy[flag.requiredPlan];
      const currentLevel = planHierarchy[currentPlan];

      if (currentLevel < requiredLevel) {
        return {
          allowed: false,
          reason: `Feature requires ${flag.requiredPlan} plan`,
          upgradeRequired: true,
          requiredPlan: flag.requiredPlan,
        };
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      // Simple deterministic rollout based on user ID hash
      // In production, use proper user ID
      const randomValue = Math.random() * 100;
      if (randomValue > flag.rolloutPercentage) {
        return {
          allowed: false,
          reason: 'Feature not yet available to you',
        };
      }
    }

    // All checks passed
    return {
      allowed: true,
    };
  }

  /**
   * Simple boolean check (convenience method)
   */
  isEnabled(featureName: FeatureFlagName): boolean {
    return this.hasAccess(featureName).allowed;
  }

  /**
   * Get feature flag details
   */
  getFlag(featureName: FeatureFlagName): FeatureFlag | undefined {
    return this.flags()[featureName];
  }

  /**
   * Get all enabled features for current user
   */
  getEnabledFeatures(): FeatureFlagName[] {
    const allFlags = this.flags();
    return Object.keys(allFlags).filter(flagName => 
      this.isEnabled(flagName as FeatureFlagName)
    ) as FeatureFlagName[];
  }

  /**
   * Set beta tester status (for testing purposes)
   */
  setBetaTester(isBeta: boolean): void {
    this.isBetaTester.set(isBeta);
    this.logService.info('FeatureFlagsService', 'Beta tester status', { isBeta });
  }

  /**
   * Update a feature flag (admin only, for testing)
   */
  updateFlag(featureName: FeatureFlagName, updates: Partial<FeatureFlag>): void {
    const currentFlags = this.flags();
    const flag = currentFlags[featureName];
    
    if (flag) {
      this.flags.set({
        ...currentFlags,
        [featureName]: { ...flag, ...updates },
      });
      this.logService.info('FeatureFlagsService', 'Updated flag', { featureName, updates });
    }
  }
}

