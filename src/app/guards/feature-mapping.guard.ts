import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { FeatureMappingService } from '../services/feature-mapping.service';
import { FeatureId } from '../models/feature-mapping.model';
import { SubscriptionPlan } from '../models/subscription.model';

/**
 * Guard to protect routes based on feature access
 * Usage: canActivate: [featureGuard('ocr_scanner')]
 */
export function featureGuard(featureId: FeatureId): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const featureMapping = inject(FeatureMappingService);

    const result = featureMapping.hasAccess(featureId);

    if (!result.allowed) {
      console.warn(`[FeatureGuard] Access denied to ${featureId}`, {
        currentPlan: result.currentPlan,
        requiredPlan: result.requiredPlan,
      });

      // Navigate to upgrade page with context
      featureMapping.navigateToUpgrade(featureId);
      return false;
    }

    return true;
  };
}

/**
 * Guard to protect routes based on minimum plan requirement
 * Usage: canActivate: [planGuard('premium')]
 */
export function planGuard(requiredPlan: SubscriptionPlan): CanActivateFn {
  return (route: ActivatedRouteSnapshot) => {
    const featureMapping = inject(FeatureMappingService);
    const router = inject(Router);

    const currentPlan = featureMapping.currentPlan();
    const hasAccess = featureMapping.comparePlans(currentPlan, requiredPlan) >= 0;

    if (!hasAccess) {
      console.warn(`[PlanGuard] Access denied`, {
        currentPlan,
        requiredPlan,
      });

      // Navigate to upgrade page
      router.navigate(['/upgrade'], { 
        queryParams: { plan: requiredPlan, reason: 'plan_required' } 
      });
      return false;
    }

    return true;
  };
}

/**
 * Guard to check if user is within limits before allowing action
 * Usage: canActivate: [limitGuard('maxDependents', () => getCurrentDependentCount())]
 */
export function limitGuard(
  limitKey: 'maxDependents' | 'maxCaretakers' | 'maxMedications',
  getCurrentCountFn: () => Promise<number>
): CanActivateFn {
  return async (route: ActivatedRouteSnapshot) => {
    const featureMapping = inject(FeatureMappingService);

    try {
      const currentCount = await getCurrentCountFn();
      const result = await featureMapping.checkLimit(limitKey, currentCount);

      if (!result.allowed) {
        console.warn(`[LimitGuard] Limit exceeded for ${limitKey}`, {
          currentUsage: result.currentUsage,
          limit: result.limit,
        });

        // Navigate to upgrade page with limit context
        featureMapping.handleLimitReached(limitKey);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[LimitGuard] Error checking limit for ${limitKey}`, error);
      return false;
    }
  };
}

/**
 * Combined guard - checks both feature access AND limit
 * Usage: canActivate: [featureWithLimitGuard('ocr_scanner', 'ocrScansPerMonth')]
 */
export function featureWithLimitGuard(
  featureId: FeatureId,
  limitKey?: 'reportsPerMonth' | 'ocrScansPerMonth' | 'telehealthConsultsPerMonth'
): CanActivateFn {
  return async (route: ActivatedRouteSnapshot) => {
    const featureMapping = inject(FeatureMappingService);

    // First check feature access
    const featureResult = featureMapping.hasAccess(featureId);
    if (!featureResult.allowed) {
      featureMapping.navigateToUpgrade(featureId);
      return false;
    }

    // Then check limit if specified
    if (limitKey) {
      // Get current usage based on limit type
      let currentUsage = 0;
      if (limitKey === 'reportsPerMonth') {
        const result = await featureMapping.canGenerateReport();
        currentUsage = result.currentUsage;
      } else if (limitKey === 'ocrScansPerMonth') {
        const result = await featureMapping.canUseOCR();
        currentUsage = result.currentUsage;
      } else if (limitKey === 'telehealthConsultsPerMonth') {
        const result = await featureMapping.canScheduleTelehealth();
        currentUsage = result.currentUsage;
      }

      const limitResult = await featureMapping.checkLimit(limitKey, currentUsage);

      if (!limitResult.allowed) {
        featureMapping.handleLimitReached(limitKey, featureId);
        return false;
      }
    }

    return true;
  };
}

/**
 * Guard to show paywall if not premium
 * Usage: canActivate: [premiumGuard()]
 */
export function premiumGuard(): CanActivateFn {
  return planGuard('premium');
}

/**
 * Guard to show paywall if not family
 * Usage: canActivate: [familyGuard()]
 */
export function familyGuard(): CanActivateFn {
  return planGuard('family');
}

/**
 * Guard to show paywall if not enterprise
 * Usage: canActivate: [enterpriseGuard()]
 */
export function enterpriseGuard(): CanActivateFn {
  return planGuard('enterprise');
}
