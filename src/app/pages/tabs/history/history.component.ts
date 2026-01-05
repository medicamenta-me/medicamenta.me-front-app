import { Component, ChangeDetectionStrategy, computed, inject, effect, signal } from '@angular/core';
import { LogService } from '../../../services/log.service';
import { MedicationServiceV2 } from '../../../services/medication-v2.service';
import { PatientSelectorService } from '../../../services/patient-selector.service';
import { LogEntry, LogEventType } from '../../../models/log-entry.model';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonAccordionGroup,
  IonAccordion,
  IonItem
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, addCircleOutline, createOutline, trashOutline, refreshCircleOutline, documentTextOutline, timeOutline, eyeOutline, filterOutline, statsChartOutline } from 'ionicons/icons';
import { PatientDropdownSelectorComponent } from '../../../components/patient-dropdown-selector/patient-dropdown-selector.component';
import { HistoryStatsComponent } from '../../../components/history-stats/history-stats.component';
import { ProfileTypeSwitcherComponent } from '../../../components/profile-type-switcher/profile-type-switcher.component';

interface LogGroup {
  date: string;
  logs: LogEntry[];
}

@Component({
  selector: 'app-history',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">{{ 'APP.NAME' | translate }}</span>
        </ion-title>
      </ion-toolbar>
      <app-profile-type-switcher></app-profile-type-switcher>
    </ion-header>

    <ion-content class="accessible-history">
      <div class="history-header">
        <h1>{{ 'HISTORY.TITLE' | translate }}</h1>
        <p>{{ 'HISTORY.SUBTITLE' | translate }}</p>
      </div>

      <!-- Patient Selector -->
      <app-patient-dropdown-selector labelKey="HISTORY.VIEWING_HISTORY"></app-patient-dropdown-selector>

      <!-- View Toggle: Timeline vs Stats -->
      <div class="view-toggle">
        <ion-segment [value]="currentView()" (ionChange)="onViewChange($event)">
          <ion-segment-button value="timeline">
            <ion-icon name="time-outline"></ion-icon>
            <ion-label>{{ 'HISTORY.TIMELINE' | translate }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="stats">
            <ion-icon name="stats-chart-outline"></ion-icon>
            <ion-label>{{ 'HISTORY.STATISTICS' | translate }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      @if (currentView() === 'stats') {
        <!-- Statistics View -->
        <app-history-stats></app-history-stats>
      } @else {
        <!-- Timeline View with Filters -->
        <ion-accordion-group class="filters-accordion">
          <ion-accordion value="filters">
            <ion-item slot="header">
              <ion-icon name="filter-outline" slot="start"></ion-icon>
              <ion-label>{{ 'HISTORY.FILTERS' | translate }}</ion-label>
            </ion-item>
            <div slot="content" class="filters-content">
              <!-- Event Type Filter -->
              <div class="filter-group">
                <div class="section-label" role="heading" aria-level="3">{{ 'HISTORY.FILTER_EVENT_TYPE' | translate }}</div>
                <ion-select [value]="eventTypeFilter()" (ionChange)="onEventTypeFilterChange($event)" interface="popover" [multiple]="true">
                  <ion-select-option value="all">{{ 'HISTORY.ALL_EVENTS' | translate }}</ion-select-option>
                  <ion-select-option value="taken">{{ 'HISTORY.DOSES_TAKEN' | translate }}</ion-select-option>
                  <ion-select-option value="missed">{{ 'HISTORY.DOSES_MISSED' | translate }}</ion-select-option>
                  <ion-select-option value="medication_added">{{ 'HISTORY.MEDICATIONS_ADDED' | translate }}</ion-select-option>
                  <ion-select-option value="medication_updated">{{ 'HISTORY.MEDICATIONS_UPDATED' | translate }}</ion-select-option>
                  <ion-select-option value="medication_deleted">{{ 'HISTORY.MEDICATIONS_DELETED' | translate }}</ion-select-option>
                </ion-select>
              </div>

              <!-- Medication Filter -->
              <div class="filter-group">
                <div class="section-label" role="heading" aria-level="3">{{ 'HISTORY.FILTER_MEDICATION' | translate }}</div>
                <ion-select [value]="medicationFilter()" (ionChange)="onMedicationFilterChange($event)" interface="popover">
                  <ion-select-option value="all">{{ 'HISTORY.ALL_MEDICATIONS' | translate }}</ion-select-option>
                  @for (med of medications(); track med.id) {
                    <ion-select-option [value]="med.id">{{ med.name }}</ion-select-option>
                  }
                </ion-select>
              </div>

              <!-- Period Filter -->
              <div class="filter-group">
                <div class="section-label" role="heading" aria-level="3">{{ 'HISTORY.FILTER_PERIOD' | translate }}</div>
                <ion-select [value]="periodFilter()" (ionChange)="onPeriodFilterChange($event)" interface="popover">
                  <ion-select-option value="all">{{ 'HISTORY.ALL_TIME' | translate }}</ion-select-option>
                  <ion-select-option value="today">{{ 'HISTORY.TODAY' | translate }}</ion-select-option>
                  <ion-select-option value="week">{{ 'HISTORY.LAST_7_DAYS' | translate }}</ion-select-option>
                  <ion-select-option value="month">{{ 'HISTORY.LAST_30_DAYS' | translate }}</ion-select-option>
                  <ion-select-option value="year">{{ 'HISTORY.LAST_YEAR' | translate }}</ion-select-option>
                </ion-select>
              </div>

              <ion-button expand="block" fill="clear" (click)="clearFilters()">
                {{ 'HISTORY.CLEAR_FILTERS' | translate }}
              </ion-button>
            </div>
          </ion-accordion>
        </ion-accordion-group>

        @if (groupedLogs(); as groups) {
        @if (groups.length > 0) {
          <div class="timeline-container">
            @for (group of groups; track group.date) {
              <div class="timeline-group">
                <div class="timeline-date-header">
                  <h2>{{ group.date }}</h2>
                </div>
                
                <div class="timeline-items">
                  @for (log of group.logs; track log.id) {
                    <div class="timeline-item" [attr.data-type]="log.eventType">
                      <div class="timeline-marker" [class.marker-taken]="log.eventType === 'taken'" [class.marker-missed]="log.eventType === 'missed'">
                        <ion-icon 
                          [name]="getIconForType(log.eventType)" 
                          [attr.aria-label]="getEventTypeLabel(log.eventType)">
                        </ion-icon>
                      </div>
                      
                      <div class="timeline-content">
                        <div class="timeline-time">
                          {{ log.timestamp | date:'shortTime' }}
                        </div>
                        <div class="timeline-message">
                          {{ log.message }}
                        </div>

                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
           <div class="empty-state">
              <ion-icon name="time-outline" class="empty-icon"></ion-icon>
              <h3>{{ 'HISTORY.NO_ACTIVITY' | translate }}</h3>
              <p>{{ 'HISTORY.HISTORY_APPEAR' | translate }}</p>
          </div>
        }
        } @else {
          <div class="empty-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <p>{{ 'HISTORY.LOADING' | translate }}</p>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
    /* ============================================
       ACCESSIBLE HISTORY - Timeline Layout
       Otimizado para idosos, deficientes visuais, autistas e daltônicos
       ============================================ */
    
    .accessible-history {
      --background: #f8f9fa;
    }

    /* Cabeçalho da página */
    .history-header {
      background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      padding: 2rem 1.5rem;
      color: white;
      text-align: center;
    }

    .history-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .history-header p {
      font-size: 1.125rem;
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
      font-weight: 500;
    }

    /* View Toggle */
    .view-toggle {
      padding: 16px;
      background: white;
      border-bottom: 1px solid var(--ion-color-light);
    }

    .view-toggle ion-segment {
      max-width: 400px;
      margin: 0 auto;
    }

    /* Filters Accordion */
    .filters-accordion {
      margin: 0;
    }

    .filters-content {
      padding: 16px;
      background: var(--ion-color-light);
    }

    .filter-group {
      margin-bottom: 16px;
    }

    .filter-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
      color: var(--ion-color-dark);
    }

    .filter-group ion-select {
      width: 100%;
    }

    /* Container do Timeline */
    .timeline-container {
      padding: 1.5rem 1rem;
      max-width: 800px;
      margin: 0 auto;
    }

    /* Grupo de data */
    .timeline-group {
      margin-bottom: 2.5rem;
    }

    /* Cabeçalho de data */
    .timeline-date-header {
      background: #34D187;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      box-shadow: none;
      border: none;
    }

    .timeline-date-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.3px;
    }

    /* Container dos itens */
    .timeline-items {
      position: relative;
      padding-left: 3.5rem;
    }

    /* Linha vertical do timeline */
    .timeline-items::before {
      content: '';
      position: absolute;
      left: 1.5rem;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #34D187;
      border-radius: 2px;
    }

    /* Item individual do timeline */
    .timeline-item {
      position: relative;
      margin-bottom: 1.25rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    /* Marcador (círculo com ícone) */
    .timeline-marker {
      position: relative;
      z-index: 2;
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #34D187;
      border: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s ease;
      margin-left: -3rem;
    }

    .timeline-marker:focus-visible {
      outline: 3px solid #000000;
      outline-offset: 3px;
    }

    .timeline-marker ion-icon {
      font-size: 1.5rem;
      color: white;
    }

    /* Marcador para medicamento tomado */
    .marker-taken {
      background: #34D187;
    }

    .marker-taken ion-icon {
      color: white;
    }

    /* Marcador para medicamento perdido */
    .marker-missed {
      background: #B3001B;
    }

    .marker-missed ion-icon {
      color: white;
    }

    /* Conteúdo do item */
    .timeline-content {
      flex: 1;
      background: white;
      padding: 1.25rem 1.5rem;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      transition: all 0.2s ease;
      margin-top: 0.5rem;
    }

    .timeline-content:hover {
      border-color: #34D187;
      box-shadow: 0 3px 10px rgba(52, 209, 135, 0.2);
      transform: translateY(-2px);
    }

    .timeline-content:focus-visible {
      outline: 3px solid #000000;
      outline-offset: 2px;
      border-color: #34D187;
    }

    /* Horário */
    .timeline-time {
      font-size: 1.125rem;
      font-weight: 700;
      color: #34D187;
      margin-bottom: 0.5rem;
      letter-spacing: 0.3px;
    }

    /* Mensagem */
    .timeline-message {
      font-size: 1.125rem;
      line-height: 1.6;
      color: #333333;
      font-weight: 500;
    }

    /* Estado vazio */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(100vh - 200px);
      text-align: center;
      padding: 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      color: #34D187;
      margin-bottom: 1.25rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333333;
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      font-size: 1.125rem;
      color: #666666;
      margin: 0;
      font-weight: 400;
    }

    .empty-state ion-spinner {
      transform: scale(1.3);
      margin-bottom: 1.25rem;
    }

    /* Modo escuro */
    @media (prefers-color-scheme: dark) {
      .accessible-history {
        --background: #1e1e1e;
      }

      .history-header {
        background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      }

      .history-header h1,
      .history-header p {
        color: white;
      }

      .timeline-items::before {
        background: #34D187;
      }

      .timeline-marker {
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
      }

      .marker-taken {
        background: #34D187;
      }

      .marker-missed {
        background: #B3001B;
      }

      .timeline-content {
        background: #2a2a2a;
        border-color: #444444;
      }

      .timeline-content:hover {
        border-color: #34D187;
      }

      .timeline-message {
        color: #e0e0e0;
      }

      .empty-state h3 {
        color: #e0e0e0;
      }

      .empty-state p {
        color: #999999;
      }
    }

    /* Responsividade mobile */
    @media (max-width: 576px) {
      .history-header {
        padding: 1.5rem 1rem;
      }

      .history-header h1 {
        font-size: 1.75rem;
      }

      .history-header p {
        font-size: 1rem;
      }

      .timeline-container {
        padding: 1rem 0.75rem;
      }

      .timeline-date-header {
        padding: 0.875rem 1.125rem;
      }

      .timeline-date-header h2 {
        font-size: 1.25rem;
      }

      .timeline-marker {
        width: 44px;
        height: 44px;
      }

      .timeline-marker ion-icon {
        font-size: 1.375rem;
      }

      .timeline-items {
        padding-left: 3rem;
      }

      .timeline-items::before {
        left: 1.25rem;
      }

      .timeline-content {
        padding: 1rem 1.25rem;
      }

      .timeline-time {
        font-size: 1rem;
      }

      .timeline-message {
        font-size: 1rem;
      }
    }

    /* Acessibilidade - Alto contraste */
    @media (prefers-contrast: high) {
      .timeline-content {
        border-width: 3px;
      }

      .timeline-marker {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .timeline-message {
        color: #000000;
        font-weight: 700;
      }
    }

    /* Reduzir movimento para usuários sensíveis */
    @media (prefers-reduced-motion: reduce) {
      .timeline-content,
      .timeline-marker {
        transition: none;
      }

      .timeline-content:hover {
        transform: none;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    PatientDropdownSelectorComponent,
    HistoryStatsComponent,
    ProfileTypeSwitcherComponent
  ],
})
export class HistoryComponent {
  private readonly logService = inject(LogService);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly translate = inject(TranslateService);
  private readonly datePipe = new DatePipe('en-US');

  // Filters
  currentView = signal<'timeline' | 'stats'>('timeline');
  eventTypeFilter = signal<string[]>(['all']);
  medicationFilter = signal<string>('all');
  periodFilter = signal<string>('all');

  public readonly patients = this.patientSelectorService.availablePatients;
  public readonly activePatientId = this.patientSelectorService.activePatientId;
  public readonly medications = this.medicationService.medications;
  
  private readonly allLogs = this.logService.logs;

  // Computed filtered logs
  public readonly logs = computed(() => {
    const allLogs = this.allLogs();
    if (!allLogs) return null;

    let filtered = [...allLogs];

    // Filter by event type
    const eventTypes = this.eventTypeFilter();
    if (!eventTypes.includes('all')) {
      filtered = filtered.filter(log => eventTypes.includes(log.eventType));
    }

    // Filter by medication
    const medId = this.medicationFilter();
    if (medId !== 'all') {
      filtered = filtered.filter(log => (log as any).medicationId === medId);
    }

    // Filter by period
    const period = this.periodFilter();
    if (period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'year':
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(log => {
        const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
        return logDate >= startDate;
      });
    }

    return filtered;
  });

  public readonly groupedLogs = computed(() => {
    const logs = this.logs();
    if (!logs) return null; // Loading state

    const groups: { [key: string]: LogEntry[] } = {};
    for (const log of logs) {
      const dateKey = this.getRelativeDate(log.timestamp);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    }

    return Object.keys(groups).map(date => ({
      date,
      logs: groups[date]
    }));
  });



  private getRelativeDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.datePipe.transform(date, 'yyyy-MM-dd') === this.datePipe.transform(today, 'yyyy-MM-dd')) {
        return this.translate.instant('HISTORY.TODAY');
    }
    if (this.datePipe.transform(date, 'yyyy-MM-dd') === this.datePipe.transform(yesterday, 'yyyy-MM-dd')) {
        return this.translate.instant('HISTORY.YESTERDAY');
    }
    return this.datePipe.transform(date, 'fullDate') || 'Unknown Date';
  }

  getIconForType(type: LogEventType): string {
    switch (type) {
      case 'taken': return 'checkmark-circle';
      case 'missed': return 'close-circle';
      case 'add_med': return 'add-circle-outline';
      case 'update_med': return 'create-outline';
      case 'delete_med': return 'trash-outline';
      case 'restock': return 'refresh-circle-outline';
      case 'note': return 'document-text-outline';
      case 'view': return 'eye-outline';
      default: return 'time-outline';
    }
  }

  getColorForType(type: LogEventType): string {
    switch (type) {
      case 'taken': return 'success';
      case 'missed': return 'danger';
      case 'add_med':
      case 'update_med':
      case 'restock': 
        return 'primary';
      case 'delete_med': return 'warning';
      case 'view': return 'medium';
      default: return 'medium';
    }
  }

  getEventTypeLabel(type: LogEventType): string {
    switch (type) {
      case 'taken': return this.translate.instant('HISTORY.TAKEN');
      case 'missed': return this.translate.instant('HISTORY.MISSED');
      case 'add_med': return this.translate.instant('MEDICATIONS.ADD');
      case 'update_med': return this.translate.instant('MEDICATIONS.EDIT');
      case 'delete_med': return this.translate.instant('COMMON.DELETE');
      case 'restock': return 'Restock';
      case 'note': return 'Note';
      case 'view': return this.translate.instant('HISTORY.VIEW');
      default: return 'Event';
    }
  }

  // Filter methods
  onViewChange(event: any) {
    this.currentView.set(event.detail.value);
  }

  onEventTypeFilterChange(event: any) {
    this.eventTypeFilter.set(event.detail.value);
  }

  onMedicationFilterChange(event: any) {
    this.medicationFilter.set(event.detail.value);
  }

  onPeriodFilterChange(event: any) {
    this.periodFilter.set(event.detail.value);
  }

  clearFilters() {
    this.eventTypeFilter.set(['all']);
    this.medicationFilter.set('all');
    this.periodFilter.set('all');
  }

  constructor() {
    addIcons({ 
      checkmarkCircle, 
      closeCircle, 
      addCircleOutline, 
      createOutline, 
      trashOutline, 
      refreshCircleOutline, 
      documentTextOutline, 
      timeOutline, 
      eyeOutline,
      filterOutline,
      statsChartOutline
    });

    // Log caregiver views
    effect(() => {
      const patientId = this.activePatientId();
      if (patientId) {
        this.logService.logCaregiversView('history');
      }
    });
  }
}
