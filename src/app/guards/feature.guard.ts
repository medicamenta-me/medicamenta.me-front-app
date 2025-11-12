import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FeatureFlagName } from '../models/feature-flags.model';

/**
 * Feature Guard
 * Protects routes that require specific feature access
 * 
 * Usage:
 * {
 *   path: 'scanner',
 *   component: ScannerPage,
 *   canActivate: [featureGuard('ocr_scanner')]
 * }
 */
export function featureGuard(featureName: FeatureFlagName): CanActivateFn {
  return () => {
    const featureFlags = inject(FeatureFlagsService);
    const router = inject(Router);

    const accessCheck = featureFlags.hasAccess(featureName);

    if (accessCheck.allowed) {
      return true;
    }

    console.warn(`[FeatureGuard] Access denied to ${featureName}:`, accessCheck.reason);

    // Redirect based on reason
    if (accessCheck.upgradeRequired) {
      // Redirect to upgrade/paywall page
      router.navigate(['/upgrade'], {
        queryParams: {
          feature: featureName,
          requiredPlan: accessCheck.requiredPlan,
        },
      });
    } else {
      // Redirect to home or show error
      router.navigate(['/tabs/dashboard']);
    }

    return false;
  };
}

/**
 * Plan Guard
 * Protects routes that require specific subscription plan
 * 
 * Usage:
 * {
 *   path: 'family-dashboard',
 *   component: FamilyDashboardPage,
 *   canActivate: [planGuard('family')]
 * }
 */
export function planGuard(requiredPlan: 'premium' | 'family' | 'enterprise'): CanActivateFn {
  return () => {
    const featureFlags = inject(FeatureFlagsService);
    const router = inject(Router);

    const planHierarchy = { free: 0, premium: 1, family: 2, enterprise: 3 };
    const currentPlan = featureFlags['subscriptionService'].currentPlan();
    const requiredLevel = planHierarchy[requiredPlan];
    const currentLevel = planHierarchy[currentPlan];

    if (currentLevel >= requiredLevel) {
      return true;
    }

    console.warn(`[PlanGuard] Plan upgrade required: ${currentPlan} → ${requiredPlan}`);

    router.navigate(['/upgrade'], {
      queryParams: {
        requiredPlan,
      },
    });

    return false;
  };
}
