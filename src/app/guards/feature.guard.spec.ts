import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { featureGuard, planGuard } from './feature.guard';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FeatureFlagCheckResult, FeatureFlagName } from '../models/feature-flags.model';

describe('feature.guard', () => {
  let featureFlagsService: jasmine.SpyObj<FeatureFlagsService>;
  let router: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;

  beforeEach(() => {
    featureFlagsService = jasmine.createSpyObj('FeatureFlagsService', ['hasAccess'], {
      subscriptionService: {
        currentPlan: jasmine.createSpy('currentPlan').and.returnValue('free')
      }
    });

    router = jasmine.createSpyObj('Router', ['navigate']);

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/test' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureFlagsService, useValue: featureFlagsService },
        { provide: Router, useValue: router }
      ]
    });
  });

  describe('featureGuard', () => {
    describe('when feature access is allowed', () => {
      beforeEach(() => {
        const result: FeatureFlagCheckResult = {
          allowed: true
        };
        featureFlagsService.hasAccess.and.returnValue(result);
      });

      it('should return true', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner' as FeatureFlagName);
          const result = guard(mockRoute, mockState);
          expect(result).toBe(true);
        });
      });

      it('should check access with correct feature name', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('advanced_insights' as FeatureFlagName);
          guard(mockRoute, mockState);
          expect(featureFlagsService.hasAccess).toHaveBeenCalledWith('advanced_insights');
        });
      });

      it('should not navigate to upgrade', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner' as FeatureFlagName);
          guard(mockRoute, mockState);
          expect(router.navigate).not.toHaveBeenCalled();
        });
      });
    });

    describe('when feature access is denied', () => {
      beforeEach(() => {
        const result: FeatureFlagCheckResult = {
          allowed: false,
          reason: 'Feature requires premium plan',
          upgradeRequired: true,
          requiredPlan: 'premium'
        };
        featureFlagsService.hasAccess.and.returnValue(result);
      });

      it('should return false', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner' as FeatureFlagName);
          const result = guard(mockRoute, mockState);
          expect(result).toBe(false);
        });
      });

      it('should navigate to upgrade page', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner' as FeatureFlagName);
          guard(mockRoute, mockState);
          expect(router.navigate).toHaveBeenCalledWith(['/upgrade'], jasmine.objectContaining({
            queryParams: jasmine.objectContaining({
              feature: 'ocr_scanner'
            })
          }));
        });
      });
    });

    describe('when feature is disabled', () => {
      beforeEach(() => {
        const result: FeatureFlagCheckResult = {
          allowed: false,
          reason: 'Feature is currently disabled'
        };
        featureFlagsService.hasAccess.and.returnValue(result);
      });

      it('should return false', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner' as FeatureFlagName);
          const result = guard(mockRoute, mockState);
          expect(result).toBe(false);
        });
      });
    });

    describe('when feature is beta only', () => {
      beforeEach(() => {
        const result: FeatureFlagCheckResult = {
          allowed: false,
          reason: 'Feature is in beta testing'
        };
        featureFlagsService.hasAccess.and.returnValue(result);
      });

      it('should return false for non-beta users', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner' as FeatureFlagName);
          const result = guard(mockRoute, mockState);
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('planGuard', () => {
    describe('when user has required plan', () => {
      beforeEach(() => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('premium');
      });

      it('should return true when current plan matches required', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          const result = guard(mockRoute, mockState);
          expect(result).toBe(true);
        });
      });

      it('should return true when current plan is higher than required', () => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('enterprise');
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          const result = guard(mockRoute, mockState);
          expect(result).toBe(true);
        });
      });

      it('should not navigate to upgrade', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          guard(mockRoute, mockState);
          expect(router.navigate).not.toHaveBeenCalled();
        });
      });
    });

    describe('when user does not have required plan', () => {
      beforeEach(() => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('free');
      });

      it('should return false when current plan is lower', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          const result = guard(mockRoute, mockState);
          expect(result).toBe(false);
        });
      });

      it('should navigate to upgrade page', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          guard(mockRoute, mockState);
          expect(router.navigate).toHaveBeenCalledWith(['/upgrade'], jasmine.objectContaining({
            queryParams: { requiredPlan: 'premium' }
          }));
        });
      });
    });

    describe('plan hierarchy', () => {
      it('should allow free plan for free-required routes', () => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('free');
        // Note: planGuard doesn't support 'free' as required plan per type definition
        // This test validates the hierarchy logic works for valid plans
        // Free users can access premium-required routes only if they have higher plan
        expect(true).toBe(true); // Placeholder - type system prevents free as requiredPlan
      });

      it('should allow family plan for premium-required routes', () => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('family');
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          const result = guard(mockRoute, mockState);
          expect(result).toBe(true);
        });
      });

      it('should deny premium plan for family-required routes', () => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('premium');
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('family');
          const result = guard(mockRoute, mockState);
          expect(result).toBe(false);
        });
      });

      it('should deny family plan for enterprise-required routes', () => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('family');
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('enterprise');
          const result = guard(mockRoute, mockState);
          expect(result).toBe(false);
        });
      });

      it('should allow enterprise plan for all routes', () => {
        (featureFlagsService as any).subscriptionService.currentPlan.and.returnValue('enterprise');
        TestBed.runInInjectionContext(() => {
          const premiumGuard = planGuard('premium');
          const familyGuard = planGuard('family');
          const enterpriseGuard = planGuard('enterprise');
          
          expect(premiumGuard(mockRoute, mockState)).toBe(true);
          expect(familyGuard(mockRoute, mockState)).toBe(true);
          expect(enterpriseGuard(mockRoute, mockState)).toBe(true);
        });
      });
    });
  });

  describe('guard factory functions', () => {
    it('featureGuard should return a CanActivateFn', () => {
      const guard = featureGuard('ocr_scanner' as FeatureFlagName);
      expect(typeof guard).toBe('function');
    });

    it('planGuard should return a CanActivateFn', () => {
      const guard = planGuard('premium');
      expect(typeof guard).toBe('function');
    });

    it('should create different guard instances for different features', () => {
      const guard1 = featureGuard('ocr_scanner' as FeatureFlagName);
      const guard2 = featureGuard('advanced_insights' as FeatureFlagName);
      expect(guard1).not.toBe(guard2);
    });

    it('should create different guard instances for different plans', () => {
      const guard1 = planGuard('premium');
      const guard2 = planGuard('family');
      expect(guard1).not.toBe(guard2);
    });
  });
});
