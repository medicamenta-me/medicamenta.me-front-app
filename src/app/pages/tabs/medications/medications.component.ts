import { Component, ChangeDetectionStrategy, computed, inject, Signal, effect, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MedicationServiceV2 } from '../../../services/medication-v2.service';
import { UserService } from '../../../services/user.service';
import { PermissionService } from '../../../services/permission.service';
import { LogService } from '../../../services/log.service';
import { PatientSelectorService } from '../../../services/patient-selector.service';
import { PersistentAlertBannerComponent } from '../../../components/persistent-alert-banner/persistent-alert-banner.component';
import { Medication } from '../../../models/medication.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  AlertController,
  ToastController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, medicalOutline, warningOutline, medical, personCircleOutline, chevronForward, warning, archiveOutline, refreshCircleOutline, ellipsisVertical, download, funnelOutline, calendarOutline, barChartOutline, close, checkmarkCircleOutline, time, trophy } from 'ionicons/icons';

interface MedicationGroup {
  patient: { id: string, name: string };
  medications: Medication[];
}

@Component({
  selector: 'app-medications',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">{{ 'APP.NAME' | translate }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessible-medications">
      <div class="medications-header">
        <h1>{{ 'MEDICATIONS.TITLE' | translate }}</h1>
        <p>{{ 'MEDICATIONS.MANAGE_DESCRIPTION' | translate }}</p>
      </div>

      <!-- Phase C: Persistent Alert Banner -->
      <app-persistent-alert-banner></app-persistent-alert-banner>

      <!-- Phase B/D: Segment for Active/Archived/Completed medications -->
      <ion-segment [value]="activeTab()" (ionChange)="activeTab.set($any($event).detail.value)" class="medications-segment">
        <ion-segment-button value="active">
          <ion-label>{{ 'MEDICATIONS.ACTIVE' | translate }} ({{ medicationGroups().length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="archived">
          <ion-label>
            <ion-icon name="archive-outline"></ion-icon>
            {{ 'MEDICATIONS.ARCHIVED' | translate }} ({{ archivedMedicationGroups().length }})
          </ion-label>
        </ion-segment-button>
        <ion-segment-button value="completed">
          <ion-label>
            <ion-icon name="checkmark-circle-outline"></ion-icon>
            {{ 'COMPLETION.COMPLETED_TAB' | translate }} ({{ completedMedicationGroups().length }})
          </ion-label>
        </ion-segment-button>
      </ion-segment>

      @if (activeTab() === 'active') {
        @if (medicationGroups().length > 0) {
          @for (group of medicationGroups(); track group.patient.id) {
            <div class="patient-group">
              <div class="patient-header">
                <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
                <h2>{{ group.patient.name }}</h2>
              </div>
              
              @for (med of group.medications; track med.id) {
                <div class="medication-card" role="button" tabindex="0">
                  <div class="medication-main" [routerLink]="['/medication', med.id]">
                    <div class="medication-icon" [class.low-stock]="med.stock <= 5">
                      <ion-icon name="medical" aria-hidden="true"></ion-icon>
                    </div>
                    <div class="medication-info">
                      <h3>{{ med.name }}</h3>
                      <p class="dosage">{{ med.dosage }}</p>
                      <p class="frequency">{{ med.frequency }}</p>
                    </div>
                  </div>
                  
                  <div class="medication-stock" [class.low-stock]="med.stock <= 5">
                    <div class="stock-badge">
                      <span class="stock-number">{{ med.stock }}</span>
                      <span class="stock-label">{{ 'MEDICATIONS.UNITS' | translate }}</span>
                    </div>
                    @if (med.stock <= 5) {
                      <div class="stock-warning">
                        <ion-icon name="warning" aria-hidden="true"></ion-icon>
                        <span>{{ 'MEDICATIONS.LOW_STOCK' | translate }}</span>
                      </div>
                    }
                  </div>

                  <div class="medication-actions-btn">
                    <ion-button fill="clear" (click)="openMedicationOptions(med, $event)" [attr.aria-label]="'COMMON.OPTIONS' | translate">
                      <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
                    </ion-button>
                  </div>
                </div>
              }
            </div>
          }
        } @else {
          <div class="empty-state-accessible">
            <ion-icon name="medical-outline" aria-hidden="true"></ion-icon>
            <h3>{{ 'MEDICATIONS.NO_MEDICATIONS' | translate }}</h3>
            <p>{{ 'MEDICATIONS.NO_MEDICATIONS_DESC' | translate }}</p>
          </div>
        }
      } @else {
        <!-- Phase B: Archived medications tab -->
        
        <!-- Statistics and Actions Bar -->
        <div class="archived-header">
          <div class="archived-controls">
            <ion-button fill="outline" size="small" (click)="toggleStats()">
              <ion-icon slot="start" name="bar-chart-outline"></ion-icon>
              {{ 'MEDICATIONS.STATS' | translate }}
            </ion-button>
            <ion-button fill="outline" size="small" (click)="toggleFilters()">
              <ion-icon slot="start" name="funnel-outline"></ion-icon>
              {{ 'MEDICATIONS.FILTERS' | translate }}
            </ion-button>
            <ion-button fill="solid" size="small" color="success" (click)="exportArchivedMedications()">
              <ion-icon slot="start" name="download"></ion-icon>
              {{ 'MEDICATIONS.EXPORT' | translate }}
            </ion-button>
          </div>
        </div>

        <!-- Statistics Panel -->
        @if (showStats()) {
          <div class="stats-panel">
            <h3>{{ 'MEDICATIONS.STATISTICS' | translate }}</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">{{ archivedStats().total }}</div>
                <div class="stat-label">{{ 'MEDICATIONS.TOTAL_ARCHIVED' | translate }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ archivedStats().thisWeek }}</div>
                <div class="stat-label">{{ 'MEDICATIONS.ARCHIVED_THIS_WEEK' | translate }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ archivedStats().thisMonth }}</div>
                <div class="stat-label">{{ 'MEDICATIONS.ARCHIVED_THIS_MONTH' | translate }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ archivedStats().byType.continuous }}</div>
                <div class="stat-label">{{ 'MEDICATIONS.CONTINUOUS_TYPE' | translate }}</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{{ archivedStats().byType.asNeeded }}</div>
                <div class="stat-label">{{ 'MEDICATIONS.AS_NEEDED_TYPE' | translate }}</div>
              </div>
            </div>
          </div>
        }

        <!-- Filters Panel -->
        @if (showFilters()) {
          <div class="filters-panel">
            <div class="filters-header">
              <h3>{{ 'MEDICATIONS.FILTERS' | translate }}</h3>
              <ion-button fill="clear" size="small" (click)="resetFilters()">
                {{ 'MEDICATIONS.RESET' | translate }}
              </ion-button>
            </div>
            
            <div class="filter-group">
              <label>{{ 'MEDICATIONS.PERIOD' | translate }}</label>
              <div class="filter-buttons">
                <ion-button [fill]="archivedDateFilter() === 'all' ? 'solid' : 'outline'" size="small" (click)="setDateFilter('all')">
                  {{ 'MEDICATIONS.ALL' | translate }}
                </ion-button>
                <ion-button [fill]="archivedDateFilter() === 'week' ? 'solid' : 'outline'" size="small" (click)="setDateFilter('week')">
                  {{ 'MEDICATIONS.LAST_WEEK' | translate }}
                </ion-button>
                <ion-button [fill]="archivedDateFilter() === 'month' ? 'solid' : 'outline'" size="small" (click)="setDateFilter('month')">
                  {{ 'MEDICATIONS.LAST_MONTH' | translate }}
                </ion-button>
                <ion-button [fill]="archivedDateFilter() === 'year' ? 'solid' : 'outline'" size="small" (click)="setDateFilter('year')">
                  {{ 'MEDICATIONS.LAST_YEAR' | translate }}
                </ion-button>
              </div>
            </div>

            @if (patients().length > 1) {
              <div class="filter-group">
                <label>{{ 'MEDICATIONS.PATIENT' | translate }}</label>
                <div class="filter-buttons">
                  <ion-button [fill]="archivedPatientFilter() === null ? 'solid' : 'outline'" size="small" (click)="setPatientFilter(null)">
                    {{ 'MEDICATIONS.ALL_PATIENTS' | translate }}
                  </ion-button>
                  @for (patient of patients(); track patient.id) {
                    <ion-button [fill]="archivedPatientFilter() === patient.id ? 'solid' : 'outline'" size="small" (click)="setPatientFilter(patient.id)">
                      {{ patient.name }}
                    </ion-button>
                  }
                </div>
              </div>
            }
          </div>
        }

        @if (filteredArchivedGroups().length > 0) {
          @for (group of filteredArchivedGroups(); track group.patient.id) {
            <div class="patient-group archived-group">
              <div class="patient-header">
                <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
                <h2>{{ group.patient.name }}</h2>
              </div>
              
              @for (med of group.medications; track med.id) {
                <div class="medication-card archived-card">
                  <div class="medication-main">
                    <div class="medication-icon archived">
                      <ion-icon name="medical" aria-hidden="true"></ion-icon>
                    </div>
                    <div class="medication-info">
                      <h3>{{ med.name }}</h3>
                      <p class="dosage">{{ med.dosage }}</p>
                      <p class="frequency">{{ med.frequency }}</p>
                      <p class="archived-date">{{ 'MEDICATIONS.ARCHIVED_ON' | translate: { date: med.archivedAt | date: 'short' } }}</p>
                    </div>
                  </div>
                  
                  <div class="medication-actions">
                    <button class="unarchive-btn" (click)="unarchiveMedication(med)" [attr.aria-label]="'MEDICATIONS.UNARCHIVE' | translate">
                      <ion-icon name="refresh-circle-outline" aria-hidden="true"></ion-icon>
                      <span>{{ 'MEDICATIONS.UNARCHIVE' | translate }}</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        } @else {
          <div class="empty-state-accessible">
            <ion-icon name="archive-outline" aria-hidden="true"></ion-icon>
            <h3>{{ 'MEDICATIONS.NO_ARCHIVED' | translate }}</h3>
            <p>{{ 'MEDICATIONS.NO_ARCHIVED_DESC' | translate }}</p>
          </div>
        }
      }

      <!-- Phase D: Completed Medications Tab -->
      @if (activeTab() === 'completed') {
        @if (completedMedicationGroups().length > 0) {
          @for (group of completedMedicationGroups(); track group.patient.id) {
            <div class="patient-group completed-group">
              <div class="patient-header">
                <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
                <h2>{{ group.patient.name }}</h2>
              </div>
              
              @for (med of group.medications; track med.id) {
                <div class="medication-card completed-card">
                  <div class="medication-main">
                    <div class="medication-icon completed" [attr.data-reason]="med.completionReason">
                      <ion-icon [name]="getCompletionIcon(med.completionReason)" aria-hidden="true"></ion-icon>
                    </div>
                    <div class="medication-info">
                      <h3>{{ med.name }}</h3>
                      <p class="dosage">{{ med.dosage }}</p>
                      <p class="frequency">{{ med.frequency }}</p>
                      <p class="completed-date">
                        <ion-icon name="time" aria-hidden="true"></ion-icon>
                        {{ 'COMPLETION.COMPLETED_ON' | translate: { date: (med.completedAt | date: 'short') } }}
                      </p>
                      <div class="completion-reason-badge" [attr.data-reason]="med.completionReason">
                        {{ getCompletionReasonText(med.completionReason) | translate }}
                      </div>
                    </div>
                  </div>
                  
                  <div class="medication-actions">
                    <button class="reactivate-btn" (click)="reactivateTreatment(med)" [attr.aria-label]="'COMPLETION.REACTIVATE' | translate">
                      <ion-icon name="refresh-circle-outline" aria-hidden="true"></ion-icon>
                      <span>{{ 'COMPLETION.REACTIVATE' | translate }}</span>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        } @else {
          <div class="empty-state-accessible">
            <ion-icon name="checkmark-circle-outline" aria-hidden="true"></ion-icon>
            <h3>{{ 'COMPLETION.NO_COMPLETED' | translate }}</h3>
            <p>{{ 'COMPLETION.NO_COMPLETED_DESC' | translate }}</p>
          </div>
        }
      }

      @if (canRegister()) {
        <div class="fab-button-container">
          <button class="accessible-fab" routerLink="/medication/new" [attr.aria-label]="'MEDICATIONS.ADD' | translate">
            <ion-icon name="add" aria-hidden="true"></ion-icon>
            <span>{{ 'MEDICATIONS.ADD' | translate }}</span>
          </button>
        </div>
      }
    </ion-content>
  `,
  styleUrls: ['./medications.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    TranslateModule,
    PersistentAlertBannerComponent
  ],
})
export class MedicationsComponent {
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly userService = inject(UserService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly translateService = inject(TranslateService);
  private readonly permissionService = inject(PermissionService);
  private readonly logService = inject(LogService);
  private readonly patientSelectorService = inject(PatientSelectorService);

  private readonly allMedications = this.medicationService.medications;
  public readonly patients = this.userService.patients;

  // Phase B: Tab control for active/archived medications
  public readonly activeTab = signal<'active' | 'archived' | 'completed'>('active');

  // Phase B Enhancement: Filters for archived medications
  public readonly archivedDateFilter = signal<'all' | 'week' | 'month' | 'year'>('all');
  public readonly archivedPatientFilter = signal<string | null>(null);
  public readonly showFilters = signal(false);
  public readonly showStats = signal(false);

  public readonly medicationGroups: Signal<MedicationGroup[]>;
  public readonly archivedMedicationGroups: Signal<MedicationGroup[]>;
  public readonly completedMedicationGroups: Signal<MedicationGroup[]>;
  public readonly filteredArchivedGroups: Signal<MedicationGroup[]>;
  public readonly archivedStats: Signal<{
    total: number;
    thisWeek: number;
    thisMonth: number;
    byType: { continuous: number; asNeeded: number };
  }>;
  
  // Permission checks
  public readonly canRegister = this.permissionService.canRegister;

  constructor() {
    addIcons({ 
      add, 
      medicalOutline, 
      warningOutline, 
      medical, 
      personCircleOutline, 
      'chevron-forward': chevronForward, 
      warning,
      'archive-outline': archiveOutline,
      'refresh-circle-outline': refreshCircleOutline,
      'ellipsis-vertical': ellipsisVertical,
      download,
      'funnel-outline': funnelOutline,
      'calendar-outline': calendarOutline,
      'bar-chart-outline': barChartOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      time,
      trophy,
      close
    });

    this.medicationGroups = computed(() => {
      const medications = this.allMedications();
      const patients = this.patients();

      if (!medications || !patients) return [];

      // Group active medications by patient (Phase B: exclude archived)
      const activeMeds = medications.filter(m => !m.isArchived);
      const grouped = activeMeds.reduce((acc, med) => {
        const patientId = med.patientId;
        if (!acc[patientId]) {
          acc[patientId] = [];
        }
        acc[patientId].push(med);
        return acc;
      }, {} as Record<string, Medication[]>);

      // Map to patient objects
      return Object.entries(grouped).map(([patientId, meds]) => ({
        patient: patients.find(p => p.id === patientId)!,
        medications: meds,
      })).filter(group => group.patient);
    });

    // Phase B: Archived medications grouped by patient
    this.archivedMedicationGroups = computed(() => {
      const medications = this.allMedications();
      const patients = this.patients();

      if (!medications || !patients) return [];

      const archivedMeds = medications.filter(m => m.isArchived);
      const grouped = archivedMeds.reduce((acc, med) => {
        const patientId = med.patientId;
        if (!acc[patientId]) {
          acc[patientId] = [];
        }
        acc[patientId].push(med);
        return acc;
      }, {} as Record<string, Medication[]>);

      return Object.entries(grouped).map(([patientId, meds]) => ({
        patient: patients.find(p => p.id === patientId)!,
        medications: meds,
      })).filter(group => group.patient);
    });

    // Phase D: Completed medications grouped by patient
    this.completedMedicationGroups = computed(() => {
      const medications = this.allMedications();
      const patients = this.patients();

      if (!medications || !patients) return [];

      const completedMeds = medications.filter(m => m.isCompleted && !m.isArchived);
      const grouped = completedMeds.reduce((acc, med) => {
        const patientId = med.patientId;
        if (!acc[patientId]) {
          acc[patientId] = [];
        }
        acc[patientId].push(med);
        return acc;
      }, {} as Record<string, Medication[]>);

      // Sort by completion date (most recent first)
      return Object.entries(grouped).map(([patientId, meds]) => {
        const sortedMeds = [...meds].sort((a, b) => {
          const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return dateB - dateA; // Descending order
        });
        
        return {
          patient: patients.find(p => p.id === patientId)!,
          medications: sortedMeds,
        };
      }).filter(group => group.patient);
    });

    // Phase B Enhancement: Filtered archived medications
    this.filteredArchivedGroups = computed(() => {
      const groups = this.archivedMedicationGroups();
      const dateFilter = this.archivedDateFilter();
      const patientFilter = this.archivedPatientFilter();

      let filteredGroups = groups;

      // Filter by patient
      if (patientFilter) {
        filteredGroups = filteredGroups.filter(g => g.patient.id === patientFilter);
      }

      // Filter by date
      if (dateFilter !== 'all') {
        const now = new Date();
        const cutoffDate = new Date();
        
        if (dateFilter === 'week') {
          cutoffDate.setDate(now.getDate() - 7);
        } else if (dateFilter === 'month') {
          cutoffDate.setMonth(now.getMonth() - 1);
        } else if (dateFilter === 'year') {
          cutoffDate.setFullYear(now.getFullYear() - 1);
        }

        filteredGroups = filteredGroups.map(group => ({
          ...group,
          medications: group.medications.filter(med => 
            med.archivedAt && new Date(med.archivedAt) >= cutoffDate
          )
        })).filter(group => group.medications.length > 0);
      }

      return filteredGroups;
    });

    // Phase B Enhancement: Archived medications statistics
    this.archivedStats = computed(() => {
      const groups = this.archivedMedicationGroups();
      const allArchived = groups.flatMap(g => g.medications);
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      return {
        total: allArchived.length,
        thisWeek: allArchived.filter(m => 
          m.archivedAt && new Date(m.archivedAt) >= weekAgo
        ).length,
        thisMonth: allArchived.filter(m => 
          m.archivedAt && new Date(m.archivedAt) >= monthAgo
        ).length,
        byType: {
          continuous: allArchived.filter(m => m.isContinuousUse).length,
          asNeeded: allArchived.filter(m => !m.isContinuousUse).length
        }
      };
    });

    // Log caregiver views
    effect(() => {
      const patientId = this.patientSelectorService.activePatientId();
      if (patientId) {
        this.logService.logCaregiversView('medications');
      }
    });
  }

  // Phase B: Archive/Unarchive methods
  async archiveMedication(medication: Medication) {
    const alert = await this.alertController.create({
      header: this.translateService.instant('MEDICATIONS.ARCHIVE_CONFIRM'),
      message: this.translateService.instant('MEDICATIONS.ARCHIVE_MESSAGE', { name: medication.name }),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('MEDICATIONS.ARCHIVE'),
          handler: async () => {
            try {
              await this.medicationService.archiveMedication(medication.id);
              const toast = await this.toastController.create({
                message: this.translateService.instant('MEDICATIONS.ARCHIVE_SUCCESS'),
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error) {
              console.error('Error archiving medication:', error);
              const toast = await this.toastController.create({
                message: this.translateService.instant('MEDICATIONS.ARCHIVE_ERROR'),
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async unarchiveMedication(medication: Medication) {
    const alert = await this.alertController.create({
      header: this.translateService.instant('MEDICATIONS.UNARCHIVE_CONFIRM'),
      message: this.translateService.instant('MEDICATIONS.UNARCHIVE_MESSAGE', { name: medication.name }),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('MEDICATIONS.UNARCHIVE'),
          handler: async () => {
            try {
              await this.medicationService.unarchiveMedication(medication.id);
              const toast = await this.toastController.create({
                message: this.translateService.instant('MEDICATIONS.UNARCHIVE_SUCCESS'),
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error) {
              console.error('Error unarchiving medication:', error);
              const toast = await this.toastController.create({
                message: this.translateService.instant('MEDICATIONS.UNARCHIVE_ERROR'),
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Phase B Enhancement: Open action sheet for medication options
  async openMedicationOptions(medication: Medication, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const actionSheet = await this.actionSheetController.create({
      header: medication.name,
      buttons: [
        {
          text: this.translateService.instant('MEDICATIONS.ARCHIVE'),
          icon: 'archive-outline',
          handler: () => {
            this.archiveMedication(medication);
          }
        },
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  // Phase B Enhancement: Toggle filters visibility
  toggleFilters() {
    this.showFilters.set(!this.showFilters());
  }

  // Phase B Enhancement: Toggle statistics visibility
  toggleStats() {
    this.showStats.set(!this.showStats());
  }

  // Phase B Enhancement: Set date filter
  setDateFilter(filter: 'all' | 'week' | 'month' | 'year') {
    this.archivedDateFilter.set(filter);
  }

  // Phase B Enhancement: Set patient filter
  setPatientFilter(patientId: string | null) {
    this.archivedPatientFilter.set(patientId);
  }

  // Phase B Enhancement: Reset all filters
  resetFilters() {
    this.archivedDateFilter.set('all');
    this.archivedPatientFilter.set(null);
  }

  // Phase B Enhancement: Export archived medications
  async exportArchivedMedications() {
    const groups = this.filteredArchivedGroups();
    const allArchived = groups.flatMap(g => 
      g.medications.map(m => ({
        ...m,
        patientName: g.patient.name
      }))
    );

    if (allArchived.length === 0) {
      const toast = await this.toastController.create({
        message: this.translateService.instant('MEDICATIONS.NO_DATA_TO_EXPORT'),
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Create CSV content
    const headers = [
      'Paciente',
      'Medicamento',
      'Dosagem',
      'Frequência',
      'Tipo',
      'Estoque Atual',
      'Unidade',
      'Data de Arquivamento'
    ];

    const rows = allArchived.map(m => [
      m.patientName,
      m.name,
      m.dosage || '',
      m.frequency || '',
      m.isContinuousUse ? 'Contínuo' : 'Sob Demanda',
      m.currentStock?.toString() || '0',
      m.stockUnit || '',
      m.archivedAt ? new Date(m.archivedAt).toLocaleString('pt-BR') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `medicamentos-arquivados-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    link.remove();

    const toast = await this.toastController.create({
      message: this.translateService.instant('MEDICATIONS.EXPORT_SUCCESS'),
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  // Phase D: Get icon for completion reason
  getCompletionIcon(reason: 'time_ended' | 'quantity_depleted' | 'manual' | undefined): string {
    switch (reason) {
      case 'time_ended':
        return 'time';
      case 'quantity_depleted':
        return 'checkmark-circle-outline';
      case 'manual':
        return 'trophy';
      default:
        return 'checkmark-circle-outline';
    }
  }

  // Phase D: Get translation key for completion reason
  getCompletionReasonText(reason: 'time_ended' | 'quantity_depleted' | 'manual' | undefined): string {
    switch (reason) {
      case 'time_ended':
        return 'COMPLETION.TIME_ENDED';
      case 'quantity_depleted':
        return 'COMPLETION.QUANTITY_DEPLETED';
      case 'manual':
        return 'COMPLETION.MANUAL';
      default:
        return 'COMPLETION.COMPLETED';
    }
  }

  // Phase D: Reactivate a completed treatment
  async reactivateTreatment(medication: Medication): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translateService.instant('COMPLETION.REACTIVATE'),
      message: this.translateService.instant('COMPLETION.REACTIVATE_CONFIRM'),
      buttons: [
        {
          text: this.translateService.instant('COMMON.CANCEL'),
          role: 'cancel'
        },
        {
          text: this.translateService.instant('COMMON.CONFIRM'),
          handler: async () => {
            try {
              // Reset completion fields
              await this.medicationService.updateMedication(medication.id, {
                isCompleted: false,
                completedAt: undefined,
                completionReason: undefined,
                dosesTaken: 0
              });

              const toast = await this.toastController.create({
                message: this.translateService.instant('COMPLETION.REACTIVATE_SUCCESS'),
                duration: 2000,
                color: 'success'
              });
              await toast.present();
            } catch (error) {
              console.error('Error reactivating medication:', error);
              const errorToast = await this.toastController.create({
                message: this.translateService.instant('COMMON.ERROR'),
                duration: 2000,
                color: 'danger'
              });
              await errorToast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
