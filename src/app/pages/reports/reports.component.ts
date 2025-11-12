import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  downloadOutline,
  analyticsOutline,
  chevronBackOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  informationCircleOutline
} from 'ionicons/icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InsightsService } from '../../services/insights.service';
import { ReportGeneratorService, ReportConfig } from '../../services/report-generator.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBackButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonBadge,
    TranslateModule
  ]
})
export class ReportsComponent {
  private readonly insightsService = inject(InsightsService);
  private readonly reportGenerator = inject(ReportGeneratorService);
  private readonly translateService = inject(TranslateService);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  // Signals
  public readonly insights = this.insightsService.insights;
  public readonly criticalInsights = this.insightsService.criticalInsights;
  public readonly highPriorityInsights = this.insightsService.highPriorityInsights;

  // Current view: 'insights' | 'reports'
  public currentView = signal<'insights' | 'reports'>('insights');

  // Report configuration
  public reportConfig = signal<ReportConfig>({
    type: 'complete',
    period: 'month',
    includeGraphs: true,
    includeMedications: true,
    includeAdherence: true,
    includePatterns: true,
    includeStock: true,
    notes: ''
  });

  constructor() {
    addIcons({
      documentTextOutline,
      downloadOutline,
      analyticsOutline,
      chevronBackOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      informationCircleOutline
    });
  }

  /**
   * Switch between insights and reports view
   */
  onViewChange(event: any): void {
    this.currentView.set(event.detail.value);
  }

  /**
   * Navigate to insight action
   */
  onInsightAction(insight: any): void {
    if (insight.actionRoute) {
      this.router.navigate([insight.actionRoute]);
    }
  }

  /**
   * Get insights by priority
   */
  getInsightsByPriority(priority: string) {
    return this.insights().filter(i => i.priority === priority);
  }

  /**
   * Update report configuration
   */
  updateReportConfig(key: keyof ReportConfig, value: any): void {
    const currentConfig = this.reportConfig();
    this.reportConfig.set({ ...currentConfig, [key]: value });
  }

  /**
   * Generate and download HTML report
   */
  async downloadHTMLReport(): Promise<void> {
    try {
      this.reportGenerator.downloadHTMLReport(this.reportConfig());
      await this.showToast(
        this.translateService.instant('REPORTS.DOWNLOAD_SUCCESS'),
        'success'
      );
    } catch (error) {
      console.error('Error generating HTML report:', error);
      await this.showToast(
        this.translateService.instant('REPORTS.DOWNLOAD_ERROR'),
        'danger'
      );
    }
  }

  /**
   * Generate and download CSV report
   */
  async downloadCSVReport(): Promise<void> {
    try {
      this.reportGenerator.downloadCSVReport(this.reportConfig());
      await this.showToast(
        this.translateService.instant('REPORTS.DOWNLOAD_SUCCESS'),
        'success'
      );
    } catch (error) {
      console.error('Error generating CSV report:', error);
      await this.showToast(
        this.translateService.instant('REPORTS.DOWNLOAD_ERROR'),
        'danger'
      );
    }
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Get priority badge color
   */
  getPriorityBadgeColor(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'primary';
      case 'low':
        return 'success';
      default:
        return 'medium';
    }
  }

  /**
   * Get priority label translation key
   */
  getPriorityLabel(priority: string): string {
    return `INSIGHTS.PRIORITY_${priority.toUpperCase()}`;
  }
}
