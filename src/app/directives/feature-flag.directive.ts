import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FeatureFlagName } from '../models/feature-flags.model';

/**
 * Feature Flag Directive
 * Conditionally renders content based on feature access
 * 
 * Usage:
 * <div *hasFeature="'ocr_scanner'">
 *   <button>Scan Prescription</button>
 * </div>
 * 
 * With else template:
 * <div *hasFeature="'ocr_scanner'; else upgradePrompt">
 *   <button>Scan Prescription</button>
 * </div>
 * <ng-template #upgradePrompt>
 *   <button (click)="showUpgrade()">Upgrade to Premium</button>
 * </ng-template>
 */
@Directive({
  selector: '[hasFeature]',
  standalone: true,
})
export class HasFeatureDirective {
  private featureFlags = inject(FeatureFlagsService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private featureName: FeatureFlagName | null = null;
  private elseTemplateRef: TemplateRef<any> | null = null;

  constructor() {
    // React to changes in feature flags or subscription
    effect(() => {
      this.updateView();
    });
  }

  @Input()
  set hasFeature(featureName: FeatureFlagName) {
    this.featureName = featureName;
    this.updateView();
  }

  @Input()
  set hasFeatureElse(templateRef: TemplateRef<any>) {
    this.elseTemplateRef = templateRef;
    this.updateView();
  }

  private updateView(): void {
    if (!this.featureName) return;

    const hasAccess = this.featureFlags.isEnabled(this.featureName);

    this.viewContainer.clear();

    if (hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else if (this.elseTemplateRef) {
      this.viewContainer.createEmbeddedView(this.elseTemplateRef);
    }
  }
}

/**
 * Plan Directive
 * Conditionally renders content based on subscription plan
 * 
 * Usage:
 * <div *requiresPlan="'premium'">
 *   <h3>Premium Features</h3>
 * </div>
 */
@Directive({
  selector: '[requiresPlan]',
  standalone: true,
})
export class RequiresPlanDirective {
  private featureFlags = inject(FeatureFlagsService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  private requiredPlan: 'premium' | 'family' | 'enterprise' | null = null;

  constructor() {
    effect(() => {
      this.updateView();
    });
  }

  @Input()
  set requiresPlan(plan: 'premium' | 'family' | 'enterprise') {
    this.requiredPlan = plan;
    this.updateView();
  }

  private updateView(): void {
    if (!this.requiredPlan) return;

    const planHierarchy = { free: 0, premium: 1, family: 2, enterprise: 3 };
    const currentPlan = this.featureFlags['subscriptionService'].currentPlan();
    const requiredLevel = planHierarchy[this.requiredPlan];
    const currentLevel = planHierarchy[currentPlan];

    this.viewContainer.clear();

    if (currentLevel >= requiredLevel) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
