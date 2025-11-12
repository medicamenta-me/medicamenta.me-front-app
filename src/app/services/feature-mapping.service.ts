import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LogService } from './log.service';
import { 
  FeatureId, 
  FeatureAccess, 
  FeatureAccessResult,
  LimitCheckResult,
  PlanLimits,
  FEATURE_MAP,
  PLAN_LIMITS,
  PLAN_HIERARCHY,
  FeatureCategory,
} from '../models/feature-mapping.model';
import { SubscriptionPlan } from '../models/subscription.model';
import { SubscriptionService } from './subscription.service';

/**
 * Feature Mapping Service
 * Centralizes all feature access control and limit validation
 */
@Injectable({
  providedIn: 'root'
})
export class FeatureMappingService {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly router = inject(Router);
  private readonly logService = inject(LogService);

  // Current user plan and limits (computed from subscription)
  readonly currentPlan = computed(() => this.subscriptionService.currentPlan());
  readonly currentLimits = computed(() => PLAN_LIMITS[this.currentPlan()]);
  readonly features = computed(() => this.subscriptionService.features());

  /**
   * Check if user has access to a specific feature
   */
  hasAccess(featureId: FeatureId): FeatureAccessResult {
    const feature = FEATURE_MAP[featureId];
    const currentPlan = this.currentPlan();
    
    if (!feature) {
      this.logService.error('FeatureMapping', `Feature not found: ${featureId}`);
      return {
        allowed: false,
        feature: feature,
        currentPlan,
        requiredPlan: 'enterprise',
        message: 'Feature não encontrada',
      };
    }

    if (!feature.isEnabled) {
      return {
        allowed: false,
        feature,
        currentPlan,
        requiredPlan: feature.requiredPlan,
        message: 'Feature temporariamente desabilitada',
      };
    }

    const hasAccess = this.isPlanSufficient(currentPlan, feature.requiredPlan);

    return {
      allowed: hasAccess,
      feature,
      currentPlan,
      requiredPlan: feature.requiredPlan,
      message: hasAccess 
        ? undefined 
        : `Faça upgrade para ${this.getPlanDisplayName(feature.requiredPlan)} para acessar este recurso`,
    };
  }

  /**
   * Check if user is within a specific limit
   */
  async checkLimit(
    limitKey: keyof PlanLimits,
    currentUsage: number
  ): Promise<LimitCheckResult> {
    const limits = this.currentLimits();
    const limit = limits[limitKey];
    const isUnlimited = limit === -1;

    if (isUnlimited) {
      return {
        allowed: true,
        currentUsage,
        limit,
        remaining: Infinity,
        isUnlimited: true,
      };
    }

    const allowed = currentUsage < limit;
    const remaining = Math.max(0, limit - currentUsage);

    return {
      allowed,
      currentUsage,
      limit,
      remaining,
      isUnlimited: false,
      message: allowed 
        ? undefined 
        : `Limite atingido (${currentUsage}/${limit}). Faça upgrade para continuar.`,
    };
  }

  /**
   * Validate if user can add a new dependent
   */
  async canAddDependent(currentCount: number): Promise<LimitCheckResult> {
    return this.checkLimit('maxDependents', currentCount);
  }

  /**
   * Validate if user can add a new caretaker
   */
  async canAddCaretaker(currentCount: number): Promise<LimitCheckResult> {
    return this.checkLimit('maxCaretakers', currentCount);
  }

  /**
   * Validate if user can add a new medication
   */
  async canAddMedication(currentCount: number): Promise<LimitCheckResult> {
    return this.checkLimit('maxMedications', currentCount);
  }

  /**
   * Validate if user can generate a new report
   */
  async canGenerateReport(): Promise<LimitCheckResult> {
    const subscription = this.subscriptionService.subscription();
    const currentUsage = subscription?.usage?.reportsThisMonth || 0;
    return this.checkLimit('reportsPerMonth', currentUsage);
  }

  /**
   * Validate if user can use OCR scanner
   */
  async canUseOCR(): Promise<LimitCheckResult> {
    const subscription = this.subscriptionService.subscription();
    const currentUsage = subscription?.usage?.ocrScansThisMonth || 0;
    return this.checkLimit('ocrScansPerMonth', currentUsage);
  }

  /**
   * Validate if user can schedule telehealth consult
   */
  async canScheduleTelehealth(): Promise<LimitCheckResult> {
    const subscription = this.subscriptionService.subscription();
    const currentUsage = subscription?.usage?.telehealthConsultsThisMonth || 0;
    return this.checkLimit('telehealthConsultsPerMonth', currentUsage);
  }

  /**
   * Get all features available for current plan
   */
  getAvailableFeatures(): FeatureAccess[] {
    const currentPlan = this.currentPlan();
    return Object.values(FEATURE_MAP).filter(feature => 
      this.isPlanSufficient(currentPlan, feature.requiredPlan) && feature.isEnabled
    );
  }

  /**
   * Get features locked for current plan (requiring upgrade)
   */
  getLockedFeatures(): FeatureAccess[] {
    const currentPlan = this.currentPlan();
    return Object.values(FEATURE_MAP).filter(feature => 
      !this.isPlanSufficient(currentPlan, feature.requiredPlan) && feature.isEnabled
    );
  }

  /**
   * Get features by category
   */
  getFeaturesByCategory(category: FeatureCategory): FeatureAccess[] {
    return Object.values(FEATURE_MAP).filter(feature => 
      feature.category === category && feature.isEnabled
    );
  }

  /**
   * Navigate to upgrade page with context
   */
  navigateToUpgrade(featureId?: FeatureId, reason?: string): void {
    const queryParams: any = {};
    
    if (featureId) {
      const feature = FEATURE_MAP[featureId];
      queryParams.feature = featureId;
      queryParams.plan = feature?.requiredPlan;
    }
    
    if (reason) {
      queryParams.reason = reason;
    }

    this.router.navigate(['/upgrade'], { queryParams });
  }

  /**
   * Show limit reached feedback and navigate to upgrade
   */
  handleLimitReached(limitKey: keyof PlanLimits, featureId?: FeatureId): void {
    this.navigateToUpgrade(featureId, `limit_${limitKey}`);
  }

  /**
   * Get formatted limit display
   */
  getLimitDisplay(limitKey: keyof PlanLimits): string {
    const limit = this.currentLimits()[limitKey];
    
    if (limit === -1) {
      return 'Ilimitado';
    }
    
    return limit.toString();
  }

  /**
   * Get formatted usage display (e.g., "3/10" or "5/Ilimitado")
   */
  getUsageDisplay(currentUsage: number, limitKey: keyof PlanLimits): string {
    const limit = this.currentLimits()[limitKey];
    
    if (limit === -1) {
      return `${currentUsage}/Ilimitado`;
    }
    
    return `${currentUsage}/${limit}`;
  }

  /**
   * Get percentage usage (0-100, or -1 for unlimited)
   */
  getUsagePercentage(currentUsage: number, limitKey: keyof PlanLimits): number {
    const limit = this.currentLimits()[limitKey];
    
    if (limit === -1) {
      return -1; // Unlimited
    }
    
    if (limit === 0) {
      return 100;
    }
    
    return Math.min(100, Math.round((currentUsage / limit) * 100));
  }

  /**
   * Check if plan is sufficient for required plan
   */
  private isPlanSufficient(currentPlan: SubscriptionPlan, requiredPlan: SubscriptionPlan): boolean {
    return PLAN_HIERARCHY[currentPlan] >= PLAN_HIERARCHY[requiredPlan];
  }

  /**
   * Get user-friendly plan name
   */
  private getPlanDisplayName(plan: SubscriptionPlan): string {
    const names: Record<SubscriptionPlan, string> = {
      free: 'Gratuito',
      premium: 'Premium',
      family: 'Família',
      enterprise: 'Enterprise',
    };
    return names[plan] || plan;
  }

  /**
   * Get user-friendly limit name
   */
  private getLimitDisplayName(limitKey: keyof PlanLimits): string {
    const names: Record<keyof PlanLimits, string> = {
      maxMedications: 'Medicações',
      maxDependents: 'Dependentes',
      maxCaretakers: 'Cuidadores',
      reportsPerMonth: 'Relatórios por mês',
      ocrScansPerMonth: 'Scans OCR por mês',
      telehealthConsultsPerMonth: 'Consultas de telemedicina por mês',
      insightsHistoryDays: 'Histórico de insights (dias)',
      maxStorageMB: 'Armazenamento (MB)',
    };
    return names[limitKey] || limitKey;
  }

  /**
   * Get recommended upgrade plan for a feature
   */
  getRecommendedPlan(featureId: FeatureId): SubscriptionPlan {
    const feature = FEATURE_MAP[featureId];
    return feature?.requiredPlan || 'premium';
  }

  /**
   * Compare plans (useful for upgrade flow)
   */
  comparePlans(plan1: SubscriptionPlan, plan2: SubscriptionPlan): number {
    return PLAN_HIERARCHY[plan1] - PLAN_HIERARCHY[plan2];
  }

  /**
   * Check if feature requires specific plan tier
   */
  requiresPlan(featureId: FeatureId, plan: SubscriptionPlan): boolean {
    const feature = FEATURE_MAP[featureId];
    return feature?.requiredPlan === plan;
  }

  /**
   * Get all limits for current plan
   */
  getCurrentPlanLimits(): PlanLimits {
    return this.currentLimits();
  }

  /**
   * Check multiple limits at once
   */
  async checkMultipleLimits(
    checks: Array<{ limitKey: keyof PlanLimits; currentUsage: number }>
  ): Promise<Record<string, LimitCheckResult>> {
    const results: Record<string, LimitCheckResult> = {};
    
    for (const check of checks) {
      results[check.limitKey] = await this.checkLimit(check.limitKey, check.currentUsage);
    }
    
    return results;
  }

  /**
   * Get upgrade suggestions based on usage patterns
   */
  getUpgradeSuggestions(): { reason: string; recommendedPlan: SubscriptionPlan }[] {
    const currentPlan = this.currentPlan();
    const subscription = this.subscriptionService.subscription();
    const suggestions: { reason: string; recommendedPlan: SubscriptionPlan }[] = [];

    if (currentPlan === 'free') {
      const usage = subscription?.usage;
      
      if (usage && usage.reportsThisMonth >= 2) {
        suggestions.push({
          reason: 'Você está próximo do limite de relatórios mensais',
          recommendedPlan: 'premium',
        });
      }
    }

    if (currentPlan === 'premium') {
      // Suggest Family if user might benefit from family features
      suggestions.push({
        reason: 'Gerencie toda a família com o plano Family',
        recommendedPlan: 'family',
      });
    }

    return suggestions;
  }
}

