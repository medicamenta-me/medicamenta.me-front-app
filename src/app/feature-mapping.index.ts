/**
 * Feature Mapping System - Public API
 * 
 * Central export file for all feature mapping components
 * Import from here instead of individual files
 * 
 * @example
 * import { 
 *   FeatureMappingService, 
 *   featureGuard,
 *   HasFeatureDirective,
 *   useFeatureLimitHelpers
 * } from '@app/feature-mapping';
 */

// Models
export * from './models/feature-mapping.model';

// Services
export { FeatureMappingService } from './services/feature-mapping.service';

// Guards
export {
  featureGuard,
  planGuard,
  limitGuard,
  featureWithLimitGuard,
  premiumGuard,
  familyGuard,
  enterpriseGuard,
} from './guards/feature-mapping.guard';

// Directives
export {
  HasFeatureDirective,
  RequiresPlanDirective,
  FeatureLockedDirective,
  IsPremiumDirective,
  IsFamilyDirective,
} from './directives/feature-mapping.directive';

// Components
export { LimitReachedModalComponent } from './components/limit-reached-modal/limit-reached-modal.component';

// Helpers
export { useFeatureLimitHelpers } from './shared/feature-limit.helpers';
