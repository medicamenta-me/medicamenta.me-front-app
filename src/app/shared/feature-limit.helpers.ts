import { inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { FeatureMappingService } from '../services/feature-mapping.service';
import { FeatureId, PlanLimits } from '../models/feature-mapping.model';
import { LimitReachedModalComponent } from '../components/limit-reached-modal/limit-reached-modal.component';

/**
 * Helper functions for feature and limit validation
 * Use these in components for quick access control
 */
export class FeatureLimitHelpers {
  private static readonly featureMapping = inject(FeatureMappingService);
  private static readonly modalController = inject(ModalController);
  private static readonly toastController = inject(ToastController);

  /**
   * Check feature access and show modal if blocked
   * Returns true if user has access, false if blocked (and shows modal)
   */
  static async checkFeatureAccess(featureId: FeatureId, showModal = true): Promise<boolean> {
    const result = this.featureMapping.hasAccess(featureId);

    if (!result.allowed && showModal) {
      await this.showUpgradeModal(undefined, featureId);
    }

    return result.allowed;
  }

  /**
   * Check limit and show modal if exceeded
   * Returns true if within limit, false if exceeded (and shows modal)
   */
  static async checkLimit(
    limitKey: keyof PlanLimits,
    currentUsage: number,
    showModal = true
  ): Promise<boolean> {
    const result = await this.featureMapping.checkLimit(limitKey, currentUsage);

    if (!result.allowed && showModal) {
      await this.showUpgradeModal(limitKey);
    }

    return result.allowed;
  }

  /**
   * Validate and add dependent
   */
  static async canAddDependent(currentCount: number): Promise<boolean> {
    const result = await this.featureMapping.canAddDependent(currentCount);

    if (!result.allowed) {
      await this.showUpgradeModal('maxDependents', 'add_dependents');
    }

    return result.allowed;
  }

  /**
   * Validate and add caretaker
   */
  static async canAddCaretaker(currentCount: number): Promise<boolean> {
    const result = await this.featureMapping.canAddCaretaker(currentCount);

    if (!result.allowed) {
      await this.showUpgradeModal('maxCaretakers', 'add_caretakers');
    }

    return result.allowed;
  }

  /**
   * Validate and add medication
   */
  static async canAddMedication(currentCount: number): Promise<boolean> {
    const result = await this.featureMapping.canAddMedication(currentCount);

    if (!result.allowed) {
      await this.showUpgradeModal('maxMedications', 'unlimited_medications');
    }

    return result.allowed;
  }

  /**
   * Validate and generate report
   */
  static async canGenerateReport(): Promise<boolean> {
    const result = await this.featureMapping.canGenerateReport();

    if (!result.allowed) {
      await this.showUpgradeModal('reportsPerMonth', 'generate_reports');
    }

    return result.allowed;
  }

  /**
   * Validate and use OCR scanner
   */
  static async canUseOCR(): Promise<boolean> {
    const result = await this.featureMapping.canUseOCR();

    if (!result.allowed) {
      await this.showUpgradeModal('ocrScansPerMonth', 'ocr_scanner');
    }

    return result.allowed;
  }

  /**
   * Validate and schedule telehealth
   */
  static async canScheduleTelehealth(): Promise<boolean> {
    const result = await this.featureMapping.canScheduleTelehealth();

    if (!result.allowed) {
      await this.showUpgradeModal('telehealthConsultsPerMonth', 'telehealth_consults');
    }

    return result.allowed;
  }

  /**
   * Show upgrade modal with context
   */
  private static async showUpgradeModal(
    limitKey?: keyof PlanLimits,
    featureId?: FeatureId
  ): Promise<void> {
    const modal = await this.modalController.create({
      component: LimitReachedModalComponent,
      componentProps: {
        limitKey,
        featureId,
      },
      cssClass: 'limit-reached-modal',
    });

    await modal.present();
  }

  /**
   * Show simple toast notification for limit reached
   */
  static async showLimitToast(message: string, duration = 3000): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      color: 'warning',
      buttons: [
        {
          text: 'Upgrade',
          handler: () => {
            this.featureMapping.navigateToUpgrade();
          },
        },
        {
          text: 'Fechar',
          role: 'cancel',
        },
      ],
    });

    await toast.present();
  }

  /**
   * Get usage display string
   */
  static getUsageDisplay(currentUsage: number, limitKey: keyof PlanLimits): string {
    return this.featureMapping.getUsageDisplay(currentUsage, limitKey);
  }

  /**
   * Get usage percentage
   */
  static getUsagePercentage(currentUsage: number, limitKey: keyof PlanLimits): number {
    return this.featureMapping.getUsagePercentage(currentUsage, limitKey);
  }

  /**
   * Check if near limit (80% or more)
   */
  static isNearLimit(currentUsage: number, limitKey: keyof PlanLimits): boolean {
    const percentage = this.getUsagePercentage(currentUsage, limitKey);
    return percentage >= 80 && percentage < 100;
  }

  /**
   * Show warning when approaching limit
   */
  static async showApproachingLimitWarning(
    currentUsage: number,
    limitKey: keyof PlanLimits
  ): Promise<void> {
    const display = this.getUsageDisplay(currentUsage, limitKey);
    await this.showLimitToast(
      `Atenção: Você está próximo do limite (${display}). Considere fazer upgrade.`,
      5000
    );
  }
}

/**
 * Injectable version of helpers for use in components
 */
export function useFeatureLimitHelpers() {
  const featureMapping = inject(FeatureMappingService);
  const modalController = inject(ModalController);
  const toastController = inject(ToastController);

  return {
    featureMapping,
    modalController,
    toastController,

    async checkFeatureAccess(featureId: FeatureId, showModal = true): Promise<boolean> {
      const result = featureMapping.hasAccess(featureId);

      if (!result.allowed && showModal) {
        const modal = await modalController.create({
          component: LimitReachedModalComponent,
          componentProps: { featureId },
        });
        await modal.present();
      }

      return result.allowed;
    },

    async canAddDependent(currentCount: number): Promise<boolean> {
      const result = await featureMapping.canAddDependent(currentCount);

      if (!result.allowed) {
        const modal = await modalController.create({
          component: LimitReachedModalComponent,
          componentProps: {
            limitKey: 'maxDependents',
            featureId: 'add_dependents',
            currentUsage: currentCount,
          },
        });
        await modal.present();
      }

      return result.allowed;
    },

    async canAddCaretaker(currentCount: number): Promise<boolean> {
      const result = await featureMapping.canAddCaretaker(currentCount);

      if (!result.allowed) {
        const modal = await modalController.create({
          component: LimitReachedModalComponent,
          componentProps: {
            limitKey: 'maxCaretakers',
            featureId: 'add_caretakers',
            currentUsage: currentCount,
          },
        });
        await modal.present();
      }

      return result.allowed;
    },

    async canGenerateReport(): Promise<boolean> {
      const result = await featureMapping.canGenerateReport();

      if (!result.allowed) {
        const modal = await modalController.create({
          component: LimitReachedModalComponent,
          componentProps: {
            limitKey: 'reportsPerMonth',
            featureId: 'generate_reports',
            currentUsage: result.currentUsage,
          },
        });
        await modal.present();
      }

      return result.allowed;
    },

    async canUseOCR(): Promise<boolean> {
      const result = await featureMapping.canUseOCR();

      if (!result.allowed) {
        const modal = await modalController.create({
          component: LimitReachedModalComponent,
          componentProps: {
            limitKey: 'ocrScansPerMonth',
            featureId: 'ocr_scanner',
            currentUsage: result.currentUsage,
          },
        });
        await modal.present();
      }

      return result.allowed;
    },

    getUsageDisplay(currentUsage: number, limitKey: keyof PlanLimits): string {
      return featureMapping.getUsageDisplay(currentUsage, limitKey);
    },

    getUsagePercentage(currentUsage: number, limitKey: keyof PlanLimits): number {
      return featureMapping.getUsagePercentage(currentUsage, limitKey);
    },
  };
}
