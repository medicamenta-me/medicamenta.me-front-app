/**
 * Example Integration: Report Generator Service
 * This example shows how to integrate feature mapping with the report generation service
 */

import { Injectable, inject } from '@angular/core';
import { FeatureMappingService } from './feature-mapping.service';
import { SubscriptionService } from './subscription.service';
import { useFeatureLimitHelpers } from '../shared/feature-limit.helpers';

@Injectable({
  providedIn: 'root'
})
export class ReportGeneratorServiceExample {
  private featureMapping = inject(FeatureMappingService);
  private subscriptionService = inject(SubscriptionService);
  private helpers = useFeatureLimitHelpers();

  /**
   * Generate a report with limit validation
   */
  async generateReport(reportData: any): Promise<void> {
    // Check if user has access to generate reports feature
    const hasFeature = await this.helpers.checkFeatureAccess('generate_reports');
    if (!hasFeature) {
      return; // Modal already shown by helper
    }

    // Check monthly limit
    const canGenerate = await this.helpers.canGenerateReport();
    if (!canGenerate) {
      return; // Modal already shown by helper
    }

    try {
      // Generate the report
      await this.doGenerateReport(reportData);

      // Increment usage counter
      const userId = this.getCurrentUserId();
      await this.subscriptionService.incrementUsage(userId, 'reportsThisMonth');
    } catch (error) {
      console.error('[ReportGenerator] Error generating report', error);
      throw error;
    }
  }

  /**
   * Check if user can generate more reports (for UI display)
   */
  async canGenerateMoreReports(): Promise<{ allowed: boolean; remaining: number; message?: string }> {
    const result = await this.featureMapping.canGenerateReport();
    
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      message: result.message,
    };
  }

  private async doGenerateReport(reportData: any): Promise<void> {
    // Actual report generation logic
  }

  private getCurrentUserId(): string {
    // Get current user ID
    return 'user-id';
  }
}

/**
 * Example Integration: Medication Service
 * Shows how to validate medication limits before adding
 */
@Injectable({
  providedIn: 'root'
})
export class MedicationServiceExample {
  private featureMapping = inject(FeatureMappingService);
  private helpers = useFeatureLimitHelpers();

  /**
   * Add a new medication with limit validation
   */
  async addMedication(medicationData: any): Promise<boolean> {
    // Get current medication count
    const currentCount = await this.getCurrentMedicationCount();

    // Check limit (medications are unlimited by default, but we validate anyway)
    const result = await this.featureMapping.canAddMedication(currentCount);
    
    if (!result.allowed) {
      // Show upgrade modal
      await this.helpers.checkFeatureAccess('unlimited_medications');
      return false;
    }

    // Add the medication
    try {
      await this.doAddMedication(medicationData);
      return true;
    } catch (error) {
      console.error('[MedicationService] Error adding medication', error);
      throw error;
    }
  }

  /**
   * Get medication limit info for UI
   */
  getMedicationLimitInfo(): { current: number; limit: number; display: string } {
    const limits = this.featureMapping.getCurrentPlanLimits();
    const current = 0; // Get from database
    
    return {
      current,
      limit: limits.maxMedications,
      display: this.helpers.getUsageDisplay(current, 'maxMedications'),
    };
  }

  private async getCurrentMedicationCount(): Promise<number> {
    // Get count from database
    return 0;
  }

  private async doAddMedication(medicationData: any): Promise<void> {
    // Actual add logic
  }
}

/**
 * Example Integration: Dependent Service
 * Shows how to validate dependent limits
 */
@Injectable({
  providedIn: 'root'
})
export class DependentServiceExample {
  private featureMapping = inject(FeatureMappingService);
  private helpers = useFeatureLimitHelpers();

  /**
   * Add a new dependent with limit validation
   */
  async addDependent(dependentData: any): Promise<boolean> {
    // Get current dependent count
    const currentCount = await this.getCurrentDependentCount();

    // Check if user can add more dependents
    const canAdd = await this.helpers.canAddDependent(currentCount);
    
    if (!canAdd) {
      return false; // Modal already shown
    }

    // Add the dependent
    try {
      await this.doAddDependent(dependentData);
      return true;
    } catch (error) {
      console.error('[DependentService] Error adding dependent', error);
      throw error;
    }
  }

  /**
   * Get dependent limit info for UI
   */
  async getDependentLimitInfo(): Promise<{
    current: number;
    limit: number;
    display: string;
    percentage: number;
    canAddMore: boolean;
  }> {
    const currentCount = await this.getCurrentDependentCount();
    const limits = this.featureMapping.getCurrentPlanLimits();
    const result = await this.featureMapping.canAddDependent(currentCount);
    
    return {
      current: currentCount,
      limit: limits.maxDependents,
      display: this.helpers.getUsageDisplay(currentCount, 'maxDependents'),
      percentage: this.helpers.getUsagePercentage(currentCount, 'maxDependents'),
      canAddMore: result.allowed,
    };
  }

  private async getCurrentDependentCount(): Promise<number> {
    // Get count from database
    return 0;
  }

  private async doAddDependent(dependentData: any): Promise<void> {
    // Actual add logic
  }
}

/**
 * Example Integration: OCR Scanner Service
 * Shows how to validate OCR usage limits
 */
@Injectable({
  providedIn: 'root'
})
export class OCRScannerServiceExample {
  private featureMapping = inject(FeatureMappingService);
  private subscriptionService = inject(SubscriptionService);
  private helpers = useFeatureLimitHelpers();

  /**
   * Scan prescription with OCR
   */
  async scanPrescription(imageData: any): Promise<any> {
    // First check if user has access to OCR feature
    const hasOCR = await this.helpers.checkFeatureAccess('ocr_scanner');
    if (!hasOCR) {
      return null;
    }

    // Check monthly OCR limit
    const canUseOCR = await this.helpers.canUseOCR();
    if (!canUseOCR) {
      return null;
    }

    try {
      // Perform OCR scan
      const result = await this.doOCRScan(imageData);

      // Increment usage counter
      const userId = this.getCurrentUserId();
      await this.subscriptionService.incrementUsage(userId, 'ocrScansThisMonth');

      return result;
    } catch (error) {
      console.error('[OCRScanner] Error scanning prescription', error);
      throw error;
    }
  }

  /**
   * Get OCR usage info for UI
   */
  async getOCRUsageInfo(): Promise<{
    used: number;
    limit: number;
    remaining: number;
    display: string;
    percentage: number;
    isNearLimit: boolean;
  }> {
    const result = await this.featureMapping.canUseOCR();
    const limits = this.featureMapping.getCurrentPlanLimits();
    
    return {
      used: result.currentUsage,
      limit: limits.ocrScansPerMonth,
      remaining: result.remaining,
      display: this.helpers.getUsageDisplay(result.currentUsage, 'ocrScansPerMonth'),
      percentage: this.helpers.getUsagePercentage(result.currentUsage, 'ocrScansPerMonth'),
      isNearLimit: this.helpers.getUsagePercentage(result.currentUsage, 'ocrScansPerMonth') >= 80,
    };
  }

  private async doOCRScan(imageData: any): Promise<any> {
    // Actual OCR logic
    return {};
  }

  private getCurrentUserId(): string {
    return 'user-id';
  }
}

/**
 * Example: Component Usage
 */
/*
import { Component, inject } from '@angular/core';
import { useFeatureLimitHelpers } from '../shared/feature-limit.helpers';

@Component({
  selector: 'app-add-dependent',
  template: `
    <ion-button 
      (click)="onAddDependent()"
      [disabled]="!canAddMore">
      Adicionar Dependente
      <span *ngIf="!isUnlimited">({{ limitInfo.display }})</span>
    </ion-button>

    <!-- Progress bar showing usage -->
    <ion-progress-bar 
      *ngIf="!isUnlimited && limitInfo.percentage > 0"
      [value]="limitInfo.percentage / 100"
      [color]="limitInfo.percentage >= 80 ? 'danger' : 'primary'">
    </ion-progress-bar>

    <!-- Warning when near limit -->
    <ion-note *ngIf="limitInfo.isNearLimit" color="warning">
      Você está próximo do limite!
    </ion-note>
  `
})
export class AddDependentComponent {
  private helpers = useFeatureLimitHelpers();
  private dependentService = inject(DependentServiceExample);

  limitInfo = {
    current: 0,
    limit: -1,
    display: '0/Ilimitado',
    percentage: 0,
    canAddMore: true,
  };

  get isUnlimited() {
    return this.limitInfo.limit === -1;
  }

  get canAddMore() {
    return this.limitInfo.canAddMore;
  }

  async ngOnInit() {
    await this.loadLimitInfo();
  }

  async loadLimitInfo() {
    this.limitInfo = await this.dependentService.getDependentLimitInfo();
  }

  async onAddDependent() {
    const success = await this.dependentService.addDependent({
      name: 'New Dependent'
    });

    if (success) {
      await this.loadLimitInfo(); // Refresh limits
    }
  }
}
*/
