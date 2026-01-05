import { Component, ChangeDetectionStrategy, inject, computed, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../services/user.service';
import { MedicationServiceV2 } from '../../../services/medication-v2.service';
import { PatientSelectorService } from '../../../services/patient-selector.service';
import { PermissionService } from '../../../services/permission.service';
import { LogService } from '../../../services/log.service';
import { StockService } from '../../../services/stock.service';
import { CriticalAlertService } from '../../../services/critical-alert.service';
import { CompletionDetectionService } from '../../../services/completion-detection.service';
import { NotificationSchedulerService } from '../../../services/notification-scheduler.service';
import { SmartRemindersService } from '../../../services/smart-reminders.service';
import { Dose } from '../../../models/medication.model';
import { StockAlertBannerComponent } from '../../../components/stock-alert-banner/stock-alert-banner.component';
import { PersistentAlertBannerComponent } from '../../../components/persistent-alert-banner/persistent-alert-banner.component';
import { CriticalAlertModalComponent } from '../../../components/critical-alert-modal/critical-alert-modal.component';
import { TreatmentCongratulationCardComponent } from '../../../components/treatment-congratulation-card/treatment-congratulation-card.component';
import { InsightsCardComponent } from '../../../components/insights-card/insights-card.component';
import { QuickStatsComponent } from '../../../components/quick-stats/quick-stats.component';
import { SyncStatusIndicatorComponent } from '../../../components/sync-status-indicator/sync-status-indicator.component';
import { SmartSuggestionsModalComponent } from '../../../components/smart-suggestions-modal/smart-suggestions-modal.component';
import { DashboardInsightsService } from '../../../services/dashboard-insights.service';
import { FamilyService } from '../../../services/family.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  IonButton,
  IonButtons,
  IonBadge,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  AlertController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { PatientDropdownSelectorComponent } from '../../../components/patient-dropdown-selector/patient-dropdown-selector.component';
import { 
  timeOutline, 
  checkmarkCircleOutline, 
  closeCircleOutline, 
  arrowUndoOutline, 
  personOutline,
  sunnyOutline,
  partlySunnyOutline,
  moonOutline,
  checkmarkDoneOutline,
  checkmarkCircle,
  closeCircle,
  arrowUndo,
  eyeOutline,
  cubeOutline,
  peopleOutline,
  bulbOutline,
  alertCircleOutline,
  sparklesOutline
} from 'ionicons/icons';

interface TodaysDose {
    medicationId: string;
    medicationName: string;
    dosage: string;
    dose: Dose;
}

@Component({
  selector: 'app-dashboard',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">{{ 'APP.NAME' | translate }}</span>
        </ion-title>
        <ion-buttons slot="end">
          <!-- Smart Suggestions Button -->
          <ion-button (click)="openSmartSuggestions()" title="Sugestões Inteligentes">
            <ion-icon slot="icon-only" name="bulb-outline"></ion-icon>
            @if (pendingSuggestionsCount() > 0) {
              <ion-badge color="danger">{{ pendingSuggestionsCount() }}</ion-badge>
            }
          </ion-button>
          
          @if (familyService.isFamilyMode()) {
            <ion-button (click)="goToFamilyDashboard()" title="Dashboard Família">
              <ion-icon slot="icon-only" name="people-outline"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessible-dashboard">
      <!-- Sync Status Indicator -->
      <app-sync-status-indicator></app-sync-status-indicator>
      
      @if(currentUser(); as user) {
        <!-- Welcome Section -->
        <div class="dashboard-header">
          <h1 class="dashboard-greeting">{{ 'DASHBOARD.GREETING' | translate:{ name: user.name.split(' ')[0] } }}</h1>
          <p class="dashboard-subtitle">{{ 'DASHBOARD.SUBTITLE' | translate }}</p>
        </div>

        <!-- Patient Selector -->
        <app-patient-dropdown-selector labelKey="DASHBOARD.VIEWING_SCHEDULE"></app-patient-dropdown-selector>
        
        <!-- High Risk Alerts (Smart Reminders) -->
        @if (highRisks().length > 0) {
          <ion-card color="danger" class="risk-alert-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="alert-circle-outline"></ion-icon>
                ⚠️ Alerta de Risco
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              @for (risk of highRisks(); track risk.medicationId) {
                <div class="risk-alert-item">
                  <p class="risk-percentage">{{ risk.riskPercentage.toFixed(0) }}% de chance de esquecer</p>
                  <p class="risk-medication">{{ getMedicationName(risk.medicationId) }} às {{ risk.scheduledTime }}</p>
                  @if (risk.reasons.length > 0) {
                    <ul class="risk-reasons">
                      @for (reason of risk.reasons; track $index) {
                        <li>{{ reason }}</li>
                      }
                    </ul>
                  }
                </div>
              }
              <ion-button expand="block" fill="outline" (click)="openSmartSuggestions()">
                <ion-icon slot="start" name="sparkles-outline"></ion-icon>
                Ver Sugestões Inteligentes
              </ion-button>
            </ion-card-content>
          </ion-card>
        }
        
        <!-- Phase C: Persistent Alert Banner -->
        <app-persistent-alert-banner></app-persistent-alert-banner>
        
        <!-- Stock Alerts (Phase B) -->
        <app-stock-alert-banner [alerts]="stockAlerts()"></app-stock-alert-banner>
        
        <!-- Phase D: Treatment Completion Congratulations -->
        @for (completedMed of recentlyCompleted(); track completedMed.id) {
          <app-treatment-congratulation-card
            [medication]="completedMed"
            (viewDetails)="viewCompletedDetails($event)"
            (dismiss)="dismissCongratulation($event)"
          ></app-treatment-congratulation-card>
        }
        
        <!-- Phase H: Quick Stats -->
        <app-quick-stats [stats]="quickStats()"></app-quick-stats>
        
        <!-- Phase H: Dashboard Insights -->
        <app-insights-card 
          [insights]="insights()"
          (insightDismissed)="onInsightDismissed($event)"
          (insightAction)="onInsightAction($event)">
        </app-insights-card>
        
        <!-- Morning Doses -->
        @if (morningDoses().length > 0) {
          <div class="dose-period-section">
            <div class="period-header morning-header">
              <ion-icon name="sunny-outline" aria-hidden="true"></ion-icon>
              <h2>{{ 'DASHBOARD.MORNING' | translate }}</h2>
            </div>
            @for(dose of morningDoses(); track (dose.medicationId + dose.dose.time)) {
              <ng-container [ngTemplateOutlet]="doseTemplate" [ngTemplateOutletContext]="{$implicit: dose}"></ng-container>
            }
          </div>
        }

        <!-- Afternoon Doses -->
        @if (afternoonDoses().length > 0) {
          <div class="dose-period-section">
            <div class="period-header afternoon-header">
              <ion-icon name="partly-sunny-outline" aria-hidden="true"></ion-icon>
              <h2>{{ 'DASHBOARD.AFTERNOON' | translate }}</h2>
            </div>
            @for(dose of afternoonDoses(); track (dose.medicationId + dose.dose.time)) {
              <ng-container [ngTemplateOutlet]="doseTemplate" [ngTemplateOutletContext]="{$implicit: dose}"></ng-container>
            }
          </div>
        }
        
        <!-- Evening Doses -->
        @if (eveningDoses().length > 0) {
          <div class="dose-period-section">
            <div class="period-header evening-header">
              <ion-icon name="moon-outline" aria-hidden="true"></ion-icon>
              <h2>{{ 'DASHBOARD.EVENING' | translate }}</h2>
            </div>
            @for(dose of eveningDoses(); track (dose.medicationId + dose.dose.time)) {
              <ng-container [ngTemplateOutlet]="doseTemplate" [ngTemplateOutletContext]="{$implicit: dose}"></ng-container>
            }
          </div>
        }

        <!-- Empty State -->
        @if(todaysDoses().length === 0) {
           <div class="empty-state-accessible">
             <ion-icon name="checkmark-done-outline" aria-hidden="true"></ion-icon>
             <h3>{{ 'DASHBOARD.NO_MEDICATIONS' | translate }}</h3>
             <p>{{ 'DASHBOARD.NO_MEDICATIONS_DESC' | translate:{ patient: selectedPatientName() } }}</p>
           </div>
        }
        
      } @else {
         <div class="loading-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>{{ 'COMMON.LOADING' | translate }}</p>
         </div>
      }

      <!-- Reusable Dose Template -->
      <ng-template #doseTemplate let-dose>
        <div class="dose-card" data-cy="dose-card" [attr.data-status]="dose.dose.status">
          <div class="dose-card-header">
            <div class="dose-status-indicator" [attr.data-status]="dose.dose.status">
              <ion-icon 
                [name]="getIconForStatus(dose.dose.status)" 
                aria-hidden="true">
              </ion-icon>
            </div>
            <div class="dose-info">
              <h3 class="medication-name">{{ dose.medicationName }}</h3>
              <p class="medication-dosage">{{ dose.dosage }}</p>
              <p class="medication-time">
                <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
                {{ dose.dose.time }}
              </p>
              <!-- Phase B: Stock indicator -->
              <p class="medication-stock" [attr.data-stock-status]="getStockStatus(dose.medicationId)">
                <ion-icon name="cube-outline" aria-hidden="true"></ion-icon>
                {{ getStockInfo(dose.medicationId) }}
              </p>
            </div>
          </div>

          @if(dose.dose.administeredBy) {
            <div class="dose-status-info">
              <span class="status-badge" [attr.data-status]="dose.dose.status">
                {{ getStatusText(dose.dose.status) }}
              </span>
              <span class="administered-by">{{ 'DASHBOARD.BY' | translate }} {{ dose.dose.administeredBy.name.split(' ')[0] }}</span>
            </div>
          }

          @if (canAdminister()) {
            <div class="dose-actions">
              @if (dose.dose.status === 'upcoming') {
                <button 
                  class="action-button action-taken" 
                  data-cy="take-dose-btn"
                  (click)="confirmDoseStatus(dose, 'taken')"
                  [attr.aria-label]="'DASHBOARD.MARK_AS_TAKEN' | translate">
                  <ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon>
                  <span>{{ 'DASHBOARD.TOOK_IT' | translate }}</span>
                </button>
                <button 
                  class="action-button action-missed" 
                  data-cy="skip-dose-btn"
                  (click)="confirmDoseStatus(dose, 'missed')"
                  [attr.aria-label]="'DASHBOARD.MARK_AS_MISSED' | translate">
                  <ion-icon name="close-circle" aria-hidden="true"></ion-icon>
                  <span>{{ 'DASHBOARD.MISSED_IT' | translate }}</span>
                </button>
              } @else {
                <button 
                  class="action-button action-undo" 
                  data-cy="undo-dose-btn"
                  (click)="updateDoseStatus(dose, 'upcoming')"
                  [attr.aria-label]="'DASHBOARD.UNDO_STATUS' | translate">
                  <ion-icon name="arrow-undo" aria-hidden="true"></ion-icon>
                  <span>{{ 'DASHBOARD.UNDO' | translate }}</span>
                </button>
              }
            </div>
          } @else {
            <div class="read-only-notice">
              <ion-icon name="eye-outline"></ion-icon>
              <span>{{ 'DASHBOARD.VIEW_ONLY_MODE' | translate }}</span>
            </div>
          }
        </div>
      </ng-template>
    </ion-content>
  `,
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonSpinner,
    IonButton,
    IonButtons,
    IonBadge,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    TranslateModule,
    PatientDropdownSelectorComponent,
    StockAlertBannerComponent,
    PersistentAlertBannerComponent,
    TreatmentCongratulationCardComponent,
    InsightsCardComponent,
    QuickStatsComponent,
    SyncStatusIndicatorComponent
  ],
})
export class DashboardComponent {
  private readonly userService = inject(UserService);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly permissionService = inject(PermissionService);
  private readonly logService = inject(LogService);
  private readonly stockService = inject(StockService);
  private readonly criticalAlertService = inject(CriticalAlertService);
  private readonly completionService = inject(CompletionDetectionService);
  private readonly notificationScheduler = inject(NotificationSchedulerService);
  private readonly dashboardInsights = inject(DashboardInsightsService);
  private readonly smartRemindersService = inject(SmartRemindersService);
  private readonly alertController = inject(AlertController);
  private readonly modalController = inject(ModalController);
  private readonly translate = inject(TranslateService);
  public readonly familyService = inject(FamilyService);
  private readonly router = inject(Router);

  public readonly currentUser = this.userService.currentUser;
  public readonly patients = this.patientSelectorService.availablePatients;
  public readonly activePatientId = this.patientSelectorService.activePatientId;
  
  // Permission checks
  public readonly canAdminister = this.permissionService.canAdminister;

  public readonly todaysDoses: Signal<TodaysDose[]>;
  public readonly morningDoses: Signal<TodaysDose[]>;
  public readonly afternoonDoses: Signal<TodaysDose[]>;
  public readonly eveningDoses: Signal<TodaysDose[]>;
  
  // Stock alerts (Phase B)
  public readonly stockAlerts = computed(() => {
    const meds = this.medicationService.medications();
    return this.stockService.getAllStockAlerts(meds);
  });
  
  // Recently completed medications (Phase D)
  public readonly recentlyCompleted = this.completionService.recentlyCompleted;
  
  // Dashboard insights (Phase H)
  public readonly insights = this.dashboardInsights.sortedInsights;
  public readonly quickStats = this.dashboardInsights.quickStats;
  
  // Smart Reminders (Phase 23)
  public readonly pendingSuggestions = this.smartRemindersService.pendingSuggestions;
  public readonly highRisks = this.smartRemindersService.highRisks;
  public readonly pendingSuggestionsCount = computed(() => this.pendingSuggestions().length);
  
  public readonly selectedPatientName = computed(() => {
    const patientId = this.activePatientId();
    return this.patients().find(p => p.userId === patientId)?.name || '...';
  });

  constructor() {
    addIcons({ 
      timeOutline, 
      checkmarkCircleOutline, 
      closeCircleOutline, 
      arrowUndoOutline,
      personOutline,
      sunnyOutline,
      partlySunnyOutline,
      moonOutline,
      checkmarkDoneOutline,
      checkmarkCircle,
      closeCircle,
      arrowUndo,
      eyeOutline,
      cubeOutline,
      peopleOutline,
      bulbOutline,
      alertCircleOutline,
      sparklesOutline
    });
    
    // Initialize smart reminders analysis using effect
    effect(() => {
      // Trigger when activePatientId changes or on init
      const patientId = this.activePatientId();
      if (patientId) {
        this.initializeSmartReminders();
      }
    }, { allowSignalWrites: true });
    
    this.todaysDoses = computed(() => {
        const today = new Date();
        const allMeds = this.medicationService.medications();
        const patientId = this.activePatientId();

        // Filter medications by the active patient ID first
        const patientMeds = allMeds.filter(med => med.patientId === patientId);

        return patientMeds
          .filter(med => {
            if (!med.startDate) return true;
            const startDate = new Date(med.startDate);
            const endDate = med.endDate ? new Date(med.endDate) : null;
            startDate.setHours(0,0,0,0);
            today.setHours(0,0,0,0);
            return startDate <= today && (!endDate || today <= endDate);
          })
          .flatMap(med => med.schedule.map(dose => ({
              medicationId: med.id,
              medicationName: med.name,
              dosage: med.dosage,
              dose
          })))
          .sort((a,b) => a.dose.time.localeCompare(b.dose.time));
    });

    this.morningDoses = computed(() => this.todaysDoses().filter(d => d.dose.time < '12:00'));
    this.afternoonDoses = computed(() => this.todaysDoses().filter(d => d.dose.time >= '12:00' && d.dose.time < '18:00'));
    this.eveningDoses = computed(() => this.todaysDoses().filter(d => d.dose.time >= '18:00'));

    // Log caregiver views
    effect(() => {
      const patientId = this.activePatientId();
      if (patientId) {
        this.logService.logCaregiversView('dashboard');
      }
    });

    // Phase C: Show critical alert modal on load
    effect(() => {
      // Wait for user to be loaded
      const user = this.currentUser();
      if (user && this.criticalAlertService.shouldShowModal()) {
        this.showCriticalAlertModal();
      }
    });

    // Phase E: Setup notification scheduler midnight reschedule
    this.notificationScheduler.setupMidnightReschedule();
    
    // Phase H: Generate insights when data changes
    effect(() => {
      const user = this.currentUser();
      const patientId = this.activePatientId();
      if (user && patientId) {
        this.refreshInsights(patientId);
      }
    });
  }
  
  /**
   * Phase H: Refresh dashboard insights
   */
  private async refreshInsights(userId: string) {
    await Promise.all([
      this.dashboardInsights.generateInsights(userId),
      this.dashboardInsights.calculateQuickStats(userId)
    ]);
  }
  
  /**
   * Phase H: Handle insight dismissed
   */
  onInsightDismissed(insightId: string) {
    this.dashboardInsights.dismissInsight(insightId);
  }
  
  /**
   * Phase H: Handle insight action
   */
  onInsightAction(insight: any) {
    // Ações customizadas podem ser tratadas aqui
  }

  /**
   * Phase C: Show critical alert modal
   */
  private async showCriticalAlertModal() {
    const modal = await this.modalController.create({
      component: CriticalAlertModalComponent,
      backdropDismiss: false
    });

    await modal.present();
  }

  getIconForStatus(status: Dose['status']): string {
    if (status === 'taken') return 'checkmark-circle-outline';
    if (status === 'missed') return 'close-circle-outline';
    return 'time-outline';
  }

  getColorForStatus(status: Dose['status']): string {
    if (status === 'taken') return 'success';
    if (status === 'missed') return 'danger';
    return 'primary';
  }

  getStatusText(status: Dose['status']): string {
    if (status === 'taken') return 'Tomado';
    if (status === 'missed') return 'Perdido';
    return 'Pendente';
  }

  // Phase B: Get stock status for medication
  getStockStatus(medicationId: string): 'critical' | 'low' | 'adequate' {
    const medication = this.medicationService.getMedicationById(medicationId);
    if (!medication) return 'adequate';
    return this.stockService.getStockStatus(medication);
  }

  getStockInfo(medicationId: string): string {
    const medication = this.medicationService.getMedicationById(medicationId);
    if (!medication) return '';
    
    const stock = medication.currentStock ?? medication.stock ?? 0;
    const unit = medication.stockUnit || 'unidades';
    const daysRemaining = this.stockService.calculateDaysRemaining(medication);
    
    if (daysRemaining !== null) {
      return `${stock} ${unit} (${daysRemaining} dias)`;
    }
    return `${stock} ${unit}`;
  }

  async confirmDoseStatus(item: TodaysDose, status: 'taken' | 'missed') {
    const alert = await this.alertController.create({
        header: this.translate.instant(`DASHBOARD.CONFIRM_${status === 'taken' ? 'TAKEN' : 'MISSED'}`),
        message: this.translate.instant('DASHBOARD.CONFIRM_MESSAGE'),
        cssClass: `accessible-alert ${status === 'taken' ? 'alert-confirm-taken' : 'alert-confirm-missed'}`,
        inputs: [{ 
          name: 'notes', 
          type: 'textarea', 
          placeholder: this.translate.instant('DASHBOARD.NOTES_PLACEHOLDER'),
          attributes: {
            'aria-label': this.translate.instant('DASHBOARD.NOTES_PLACEHOLDER'),
            maxlength: 200
          }
        }],
        buttons: [
            { 
              text: this.translate.instant('COMMON.CANCEL'), 
              role: 'cancel',
              cssClass: 'alert-button-cancel'
            },
            { 
              text: this.translate.instant('COMMON.CONFIRM'), 
              cssClass: 'alert-button-confirm',
              handler: (data) => this.updateDoseStatus(item, status, data.notes) 
            }
        ]
    });
    await alert.present();
  }

  updateDoseStatus(item: TodaysDose, status: 'taken' | 'missed' | 'upcoming', notes?: string) {
      const currentUser = this.currentUser();
      if (!currentUser) return;
      
      const administeredByName = this.patients().find(p => p.userId === currentUser.id)?.name || 'Unknown';
      
      this.medicationService.updateDoseStatus(item.medicationId, item.dose.time, status, administeredByName, notes);
      
      // Phase D: If dose was taken, increment counter and check for completion
      if (status === 'taken') {
        const medication = this.medicationService.getMedicationById(item.medicationId);
        if (medication && !medication.isContinuousUse) {
          this.completionService.incrementDoseAndCheckCompletion(medication);
        }
      }
      
      // Phase B: Deduct stock when dose is taken
      if (status === 'taken') {
        const medication = this.medicationService.getMedicationById(item.medicationId);
        if (medication) {
          const newStock = this.stockService.deductStock(medication);
          this.medicationService.updateMedicationStock(item.medicationId, newStock);
          
          // Check if should be auto-archived
          if (this.stockService.shouldAutoArchive(medication)) {
            this.medicationService.archiveMedication(item.medicationId);
          }
        }
      }
  }
  
  // Phase D: Handle view details action from congratulation card
  viewCompletedDetails(medication: any): void {
    // For now, just log - will be enhanced in Phase F (Advanced Reports)
    // Future: Open detailed view or modal with completion history
  }
  
  // Phase D: Handle dismiss action from congratulation card
  dismissCongratulation(medication: any): void {
    // Congratulation cards auto-hide after 3 days, 
    // but user can dismiss manually if they want
    // The card is controlled by the computed signal from CompletionDetectionService
    // We could add localStorage flag here to permanently hide specific completion notifications
  }

  // Navigate to Family Dashboard
  goToFamilyDashboard(): void {
    this.router.navigate(['/family-dashboard']);
  }
  
  // Smart Reminders - Initialize analysis
  private async initializeSmartReminders(): Promise<void> {
    try {
      // Run initial analysis after a short delay to avoid blocking UI
      setTimeout(async () => {
        await this.smartRemindersService.analyzeAllPatterns();
        await this.smartRemindersService.analyzeForgetfulnessRisk();
      }, 2000);
    } catch (error) {
      console.error('Error initializing smart reminders:', error);
    }
  }
  
  // Smart Reminders - Open suggestions modal
  async openSmartSuggestions(): Promise<void> {
    const modal = await this.modalController.create({
      component: SmartSuggestionsModalComponent,
      cssClass: 'smart-suggestions-modal'
    });
    
    await modal.present();
  }
  
  // Smart Reminders - Get medication name by ID
  getMedicationName(medicationId: string): string {
    const medication = this.medicationService.getMedicationById(medicationId);
    return medication?.name || 'Medicação';
  }
}
