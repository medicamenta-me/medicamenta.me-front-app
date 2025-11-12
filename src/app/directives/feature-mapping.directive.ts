import { Directive, Input, TemplateRef, ViewContainerRef, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { FeatureMappingService } from '../services/feature-mapping.service';
import { FeatureId } from '../models/feature-mapping.model';
import { SubscriptionPlan } from '../models/subscription.model';

/**
 * Structural directive to conditionally render content based on feature access
 * 
 * Usage:
 * <div *hasFeature="'ocr_scanner'">
 *   Feature content here
 * </div>
 * 
 * With else template:
 * <div *hasFeature="'ocr_scanner'; else upgradePrompt">
 *   Feature content here
 * </div>
 * <ng-template #upgradePrompt>
 *   <p>Upgrade to access this feature</p>
 * </ng-template>
 */
@Directive({
  selector: '[hasFeature]',
  standalone: true
})
export class HasFeatureDirective implements OnInit, OnDestroy {
  private featureMapping = inject(FeatureMappingService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  @Input() hasFeature!: FeatureId;
  @Input() hasFeatureElse?: TemplateRef<any>;

  private hasView = false;
  private effectRef: any;

  ngOnInit() {
    // React to plan changes
    this.effectRef = effect(() => {
      const result = this.featureMapping.hasAccess(this.hasFeature);
      this.updateView(result.allowed);
    });
  }

  ngOnDestroy() {
    if (this.effectRef) {
      this.effectRef.destroy();
    }
  }

  private updateView(hasAccess: boolean) {
    if (hasAccess && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
      if (this.hasFeatureElse) {
        this.viewContainer.createEmbeddedView(this.hasFeatureElse);
      }
    } else if (!hasAccess && !this.hasView && this.hasFeatureElse) {
      this.viewContainer.createEmbeddedView(this.hasFeatureElse);
    }
  }
}

/**
 * Structural directive to conditionally render content based on plan requirement
 * 
 * Usage:
 * <div *requiresPlan="'premium'">
 *   Premium content here
 * </div>
 */
@Directive({
  selector: '[requiresPlan]',
  standalone: true
})
export class RequiresPlanDirective implements OnInit, OnDestroy {
  private featureMapping = inject(FeatureMappingService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  @Input() requiresPlan!: SubscriptionPlan;
  @Input() requiresPlanElse?: TemplateRef<any>;

  private hasView = false;
  private effectRef: any;

  ngOnInit() {
    this.effectRef = effect(() => {
      const currentPlan = this.featureMapping.currentPlan();
      const hasAccess = this.featureMapping.comparePlans(currentPlan, this.requiresPlan) >= 0;
      this.updateView(hasAccess);
    });
  }

  ngOnDestroy() {
    if (this.effectRef) {
      this.effectRef.destroy();
    }
  }

  private updateView(hasAccess: boolean) {
    if (hasAccess && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
      if (this.requiresPlanElse) {
        this.viewContainer.createEmbeddedView(this.requiresPlanElse);
      }
    } else if (!hasAccess && !this.hasView && this.requiresPlanElse) {
      this.viewContainer.createEmbeddedView(this.requiresPlanElse);
    }
  }
}

/**
 * Structural directive to show upgrade prompt for locked features
 * Opposite of hasFeature - shows content when feature is NOT available
 * 
 * Usage:
 * <div *featureLocked="'ocr_scanner'">
 *   <p>Upgrade to Premium to use OCR Scanner</p>
 * </div>
 */
@Directive({
  selector: '[featureLocked]',
  standalone: true
})
export class FeatureLockedDirective implements OnInit, OnDestroy {
  private featureMapping = inject(FeatureMappingService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  @Input() featureLocked!: FeatureId;

  private hasView = false;
  private effectRef: any;

  ngOnInit() {
    this.effectRef = effect(() => {
      const result = this.featureMapping.hasAccess(this.featureLocked);
      this.updateView(!result.allowed); // Show when NOT allowed
    });
  }

  ngOnDestroy() {
    if (this.effectRef) {
      this.effectRef.destroy();
    }
  }

  private updateView(isLocked: boolean) {
    if (isLocked && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isLocked && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}

/**
 * Structural directive to show/hide based on premium status
 * Shortcut for *requiresPlan="'premium'"
 * 
 * Usage:
 * <div *isPremium>
 *   Premium content here
 * </div>
 */
@Directive({
  selector: '[isPremium]',
  standalone: true
})
export class IsPremiumDirective implements OnInit, OnDestroy {
  private featureMapping = inject(FeatureMappingService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  @Input() isPremiumElse?: TemplateRef<any>;

  private hasView = false;
  private effectRef: any;

  ngOnInit() {
    this.effectRef = effect(() => {
      const currentPlan = this.featureMapping.currentPlan();
      const isPremium = this.featureMapping.comparePlans(currentPlan, 'premium') >= 0;
      this.updateView(isPremium);
    });
  }

  ngOnDestroy() {
    if (this.effectRef) {
      this.effectRef.destroy();
    }
  }

  private updateView(isPremium: boolean) {
    if (isPremium && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isPremium && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
      if (this.isPremiumElse) {
        this.viewContainer.createEmbeddedView(this.isPremiumElse);
      }
    } else if (!isPremium && !this.hasView && this.isPremiumElse) {
      this.viewContainer.createEmbeddedView(this.isPremiumElse);
    }
  }
}

/**
 * Structural directive to show/hide based on family plan status
 * Shortcut for *requiresPlan="'family'"
 * 
 * Usage:
 * <div *isFamily>
 *   Family content here
 * </div>
 */
@Directive({
  selector: '[isFamily]',
  standalone: true
})
export class IsFamilyDirective implements OnInit, OnDestroy {
  private featureMapping = inject(FeatureMappingService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  @Input() isFamilyElse?: TemplateRef<any>;

  private hasView = false;
  private effectRef: any;

  ngOnInit() {
    this.effectRef = effect(() => {
      const currentPlan = this.featureMapping.currentPlan();
      const isFamily = this.featureMapping.comparePlans(currentPlan, 'family') >= 0;
      this.updateView(isFamily);
    });
  }

  ngOnDestroy() {
    if (this.effectRef) {
      this.effectRef.destroy();
    }
  }

  private updateView(isFamily: boolean) {
    if (isFamily && !this.hasView) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!isFamily && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
      if (this.isFamilyElse) {
        this.viewContainer.createEmbeddedView(this.isFamilyElse);
      }
    } else if (!isFamily && !this.hasView && this.isFamilyElse) {
      this.viewContainer.createEmbeddedView(this.isFamilyElse);
    }
  }
}
