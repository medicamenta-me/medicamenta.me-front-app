import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { featureGuard, planGuard, limitGuard, featureWithLimitGuard, premiumGuard, familyGuard, enterpriseGuard } from './feature-mapping.guard';
import { FeatureMappingService } from '../services/feature-mapping.service';
import { FeatureId, FeatureAccessResult, LimitCheckResult, FeatureAccess } from '../models/feature-mapping.model';
import { SubscriptionPlan } from '../models/subscription.model';

// Helper to create FeatureAccessResult
const createFeatureAccessResult = (allowed: boolean, currentPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): FeatureAccessResult => ({
  allowed,
  currentPlan,
  requiredPlan,
  feature: {
    id: 'ocr_scanner',
    name: 'OCR Scanner',
    description: 'Scan prescriptions',
    category: 'core',
    requiredPlan,
    isEnabled: true
  } as FeatureAccess
});

// Helper to create LimitCheckResult
const createLimitCheckResult = (allowed: boolean, currentUsage: number, limit: number): LimitCheckResult => ({
  allowed,
  currentUsage,
  limit,
  remaining: Math.max(0, limit - currentUsage),
  isUnlimited: limit === -1
});

describe('feature-mapping.guard', () => {
  let featureMappingService: jasmine.SpyObj<FeatureMappingService>;
  let router: jasmine.SpyObj<Router>;
  let mockRoute: ActivatedRouteSnapshot;

  beforeEach(() => {
    featureMappingService = jasmine.createSpyObj('FeatureMappingService', [
      'hasAccess',
      'navigateToUpgrade',
      'comparePlans',
      'currentPlan',
      'checkLimit',
      'handleLimitReached',
      'canGenerateReport',
      'canUseOCR',
      'canScheduleTelehealth'
    ]);

    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

    mockRoute = {} as ActivatedRouteSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: FeatureMappingService, useValue: featureMappingService },
        { provide: Router, useValue: router }
      ]
    });
  });

  describe('featureGuard', () => {
    describe('when access is allowed', () => {
      beforeEach(() => {
        featureMappingService.hasAccess.and.returnValue(createFeatureAccessResult(true, 'premium', 'premium'));
      });

      it('should return true', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner');
          const result = guard(mockRoute, {} as any);
          expect(result).toBe(true);
        });
      });

      it('should not call navigateToUpgrade', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner');
          guard(mockRoute, {} as any);
          expect(featureMappingService.navigateToUpgrade).not.toHaveBeenCalled();
        });
      });
    });

    describe('when access is denied', () => {
      beforeEach(() => {
        featureMappingService.hasAccess.and.returnValue(createFeatureAccessResult(false, 'free', 'premium'));
      });

      it('should return false', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner');
          const result = guard(mockRoute, {} as any);
          expect(result).toBe(false);
        });
      });

      it('should call navigateToUpgrade with feature id', () => {
        TestBed.runInInjectionContext(() => {
          const guard = featureGuard('ocr_scanner');
          guard(mockRoute, {} as any);
          expect(featureMappingService.navigateToUpgrade).toHaveBeenCalledWith('ocr_scanner');
        });
      });
    });
  });

  describe('planGuard', () => {
    describe('when user has required plan', () => {
      beforeEach(() => {
        featureMappingService.currentPlan.and.returnValue('premium');
        featureMappingService.comparePlans.and.returnValue(0); // equal
      });

      it('should return true', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          const result = guard(mockRoute, {} as any);
          expect(result).toBe(true);
        });
      });

      it('should not navigate to upgrade', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          guard(mockRoute, {} as any);
          expect(router.navigate).not.toHaveBeenCalled();
        });
      });
    });

    describe('when user has higher plan', () => {
      beforeEach(() => {
        featureMappingService.currentPlan.and.returnValue('enterprise');
        featureMappingService.comparePlans.and.returnValue(1); // greater
      });

      it('should return true', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          const result = guard(mockRoute, {} as any);
          expect(result).toBe(true);
        });
      });
    });

    describe('when user has lower plan', () => {
      beforeEach(() => {
        featureMappingService.currentPlan.and.returnValue('free');
        featureMappingService.comparePlans.and.returnValue(-1); // less
      });

      it('should return false', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          const result = guard(mockRoute, {} as any);
          expect(result).toBe(false);
        });
      });

      it('should navigate to upgrade with plan info', () => {
        TestBed.runInInjectionContext(() => {
          const guard = planGuard('premium');
          guard(mockRoute, {} as any);
          expect(router.navigate).toHaveBeenCalledWith(['/upgrade'], {
            queryParams: { plan: 'premium', reason: 'plan_required' }
          });
        });
      });
    });
  });

  describe('limitGuard', () => {
    const mockGetCount = jasmine.createSpy('getCurrentCountFn');

    beforeEach(() => {
      mockGetCount.calls.reset();
    });

    describe('when within limits', () => {
      beforeEach(() => {
        mockGetCount.and.resolveTo(2);
        featureMappingService.checkLimit.and.resolveTo(createLimitCheckResult(true, 2, 5));
      });

      it('should return true', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = limitGuard('maxDependents', mockGetCount);
          const result = await guard(mockRoute, {} as any);
          expect(result).toBe(true);
        });
      });

      it('should call getCurrentCountFn', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = limitGuard('maxDependents', mockGetCount);
          await guard(mockRoute, {} as any);
          expect(mockGetCount).toHaveBeenCalled();
        });
      });

      it('should check limit with correct params', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = limitGuard('maxDependents', mockGetCount);
          await guard(mockRoute, {} as any);
          expect(featureMappingService.checkLimit).toHaveBeenCalledWith('maxDependents', 2);
        });
      });
    });

    describe('when limit exceeded', () => {
      beforeEach(() => {
        mockGetCount.and.resolveTo(5);
        featureMappingService.checkLimit.and.resolveTo(createLimitCheckResult(false, 5, 5));
      });

      it('should return false', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = limitGuard('maxDependents', mockGetCount);
          const result = await guard(mockRoute, {} as any);
          expect(result).toBe(false);
        });
      });

      it('should call handleLimitReached', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = limitGuard('maxDependents', mockGetCount);
          await guard(mockRoute, {} as any);
          expect(featureMappingService.handleLimitReached).toHaveBeenCalledWith('maxDependents');
        });
      });
    });

    describe('when getCurrentCountFn throws error', () => {
      beforeEach(() => {
        mockGetCount.and.rejectWith(new Error('Database error'));
      });

      it('should return false on error', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = limitGuard('maxDependents', mockGetCount);
          const result = await guard(mockRoute, {} as any);
          expect(result).toBe(false);
        });
      });
    });
  });

  describe('featureWithLimitGuard', () => {
    describe('when feature access denied', () => {
      beforeEach(() => {
        featureMappingService.hasAccess.and.returnValue(createFeatureAccessResult(false, 'free', 'premium'));
      });

      it('should return false immediately', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('ocr_scanner', 'ocrScansPerMonth');
          const result = await guard(mockRoute, {} as any);
          expect(result).toBe(false);
        });
      });

      it('should not check limits', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('ocr_scanner', 'ocrScansPerMonth');
          await guard(mockRoute, {} as any);
          expect(featureMappingService.checkLimit).not.toHaveBeenCalled();
        });
      });
    });

    describe('when feature allowed but no limit key', () => {
      beforeEach(() => {
        featureMappingService.hasAccess.and.returnValue(createFeatureAccessResult(true, 'premium', 'premium'));
      });

      it('should return true without checking limits', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('ocr_scanner');
          const result = await guard(mockRoute, {} as any);
          expect(result).toBe(true);
          expect(featureMappingService.checkLimit).not.toHaveBeenCalled();
        });
      });
    });

    describe('when feature allowed and within limits', () => {
      beforeEach(() => {
        featureMappingService.hasAccess.and.returnValue(createFeatureAccessResult(true, 'premium', 'premium'));
        featureMappingService.canUseOCR.and.resolveTo(createLimitCheckResult(true, 3, 10));
        featureMappingService.checkLimit.and.resolveTo(createLimitCheckResult(true, 3, 10));
      });

      it('should return true', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('ocr_scanner', 'ocrScansPerMonth');
          const result = await guard(mockRoute, {} as any);
          expect(result).toBe(true);
        });
      });
    });

    describe('when feature allowed but limit exceeded', () => {
      beforeEach(() => {
        featureMappingService.hasAccess.and.returnValue(createFeatureAccessResult(true, 'premium', 'premium'));
        featureMappingService.canUseOCR.and.resolveTo(createLimitCheckResult(false, 10, 10));
        featureMappingService.checkLimit.and.resolveTo(createLimitCheckResult(false, 10, 10));
      });

      it('should return false', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('ocr_scanner', 'ocrScansPerMonth');
          const result = await guard(mockRoute, {} as any);
          expect(result).toBe(false);
        });
      });

      it('should call handleLimitReached with limit key and feature id', async () => {
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('ocr_scanner', 'ocrScansPerMonth');
          await guard(mockRoute, {} as any);
          expect(featureMappingService.handleLimitReached).toHaveBeenCalledWith('ocrScansPerMonth', 'ocr_scanner');
        });
      });
    });

    describe('limit key routing', () => {
      beforeEach(() => {
        featureMappingService.hasAccess.and.returnValue(createFeatureAccessResult(true, 'premium', 'premium'));
        featureMappingService.checkLimit.and.resolveTo(createLimitCheckResult(true, 1, 10));
      });

      it('should call canGenerateReport for reportsPerMonth', async () => {
        featureMappingService.canGenerateReport.and.resolveTo(createLimitCheckResult(true, 1, 10));
        
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('scheduled_reports', 'reportsPerMonth');
          await guard(mockRoute, {} as any);
          expect(featureMappingService.canGenerateReport).toHaveBeenCalled();
        });
      });

      it('should call canUseOCR for ocrScansPerMonth', async () => {
        featureMappingService.canUseOCR.and.resolveTo(createLimitCheckResult(true, 1, 10));
        
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('ocr_scanner', 'ocrScansPerMonth');
          await guard(mockRoute, {} as any);
          expect(featureMappingService.canUseOCR).toHaveBeenCalled();
        });
      });

      it('should call canScheduleTelehealth for telehealthConsultsPerMonth', async () => {
        featureMappingService.canScheduleTelehealth.and.resolveTo(createLimitCheckResult(true, 1, 10));
        
        await TestBed.runInInjectionContext(async () => {
          const guard = featureWithLimitGuard('telehealth_consults', 'telehealthConsultsPerMonth');
          await guard(mockRoute, {} as any);
          expect(featureMappingService.canScheduleTelehealth).toHaveBeenCalled();
        });
      });
    });
  });

  describe('convenience guards', () => {
    beforeEach(() => {
      featureMappingService.currentPlan.and.returnValue('free');
      featureMappingService.comparePlans.and.returnValue(-1);
    });

    it('premiumGuard should be equivalent to planGuard("premium")', () => {
      TestBed.runInInjectionContext(() => {
        const guard = premiumGuard();
        guard(mockRoute, {} as any);
        expect(router.navigate).toHaveBeenCalledWith(['/upgrade'], {
          queryParams: { plan: 'premium', reason: 'plan_required' }
        });
      });
    });

    it('familyGuard should be equivalent to planGuard("family")', () => {
      TestBed.runInInjectionContext(() => {
        const guard = familyGuard();
        guard(mockRoute, {} as any);
        expect(router.navigate).toHaveBeenCalledWith(['/upgrade'], {
          queryParams: { plan: 'family', reason: 'plan_required' }
        });
      });
    });

    it('enterpriseGuard should be equivalent to planGuard("enterprise")', () => {
      TestBed.runInInjectionContext(() => {
        const guard = enterpriseGuard();
        guard(mockRoute, {} as any);
        expect(router.navigate).toHaveBeenCalledWith(['/upgrade'], {
          queryParams: { plan: 'enterprise', reason: 'plan_required' }
        });
      });
    });
  });

  describe('factory functions', () => {
    it('featureGuard should return a CanActivateFn', () => {
      const guard = featureGuard('ocr_scanner');
      expect(typeof guard).toBe('function');
    });

    it('planGuard should return a CanActivateFn', () => {
      const guard = planGuard('premium');
      expect(typeof guard).toBe('function');
    });

    it('limitGuard should return a CanActivateFn', () => {
      const guard = limitGuard('maxDependents', async () => 0);
      expect(typeof guard).toBe('function');
    });

    it('featureWithLimitGuard should return a CanActivateFn', () => {
      const guard = featureWithLimitGuard('ocr_scanner');
      expect(typeof guard).toBe('function');
    });
  });
});
