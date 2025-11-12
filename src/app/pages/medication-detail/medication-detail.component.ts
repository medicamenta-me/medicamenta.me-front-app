import { Component, ChangeDetectionStrategy, inject, computed, Signal, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { Medication, Dose } from '../../models/medication.model';
import { UserService } from '../../services/user.service';
import { PermissionService } from '../../services/permission.service';
import { LogService } from '../../services/log.service';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  createOutline, 
  trashOutline, 
  checkmarkCircleOutline, 
  closeCircleOutline, 
  arrowUndoOutline, 
  timeOutline,
  medical,
  medicalOutline,
  cubeOutline,
  documentTextOutline,
  calendarOutline,
  arrowBackOutline,
  checkmarkCircle,
  closeCircle,
  arrowUndo,
  eyeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-medication-detail',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">{{ 'APP.NAME' | translate }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessible-medication-detail">
      @if (medication(); as med) {
        <!-- Medication Header -->
        <div class="detail-header">
          <div class="header-icon" [class.low-stock]="med.stock <= 5">
            <ion-icon name="medical" aria-hidden="true"></ion-icon>
          </div>
          <h1>{{ med.name }}</h1>
          <p class="patient-name">{{ patientName() }}</p>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          @if (canRegister()) {
            <button class="action-btn edit-btn" [routerLink]="['/medication/edit', med.id]" [attr.aria-label]="'MEDICATION_DETAIL.EDIT' | translate">
              <ion-icon name="create-outline" aria-hidden="true"></ion-icon>
              <span>{{ 'MEDICATION_DETAIL.EDIT' | translate }}</span>
            </button>
            <button class="action-btn delete-btn" (click)="confirmDelete()" [attr.aria-label]="'MEDICATION_DETAIL.DELETE' | translate">
              <ion-icon name="trash-outline" aria-hidden="true"></ion-icon>
              <span>{{ 'MEDICATION_DETAIL.DELETE' | translate }}</span>
            </button>
          }
          <button class="action-btn back-btn" routerLink="/tabs/medications" [attr.aria-label]="'COMMON.BACK' | translate">
            <ion-icon name="arrow-back-outline" aria-hidden="true"></ion-icon>
            <span>{{ 'COMMON.BACK' | translate }}</span>
          </button>
        </div>

        <!-- Medication Info -->
        <div class="info-section">
          <h2 class="section-title">{{ 'MEDICATION_DETAIL.INFORMATION' | translate }}</h2>
          
          <div class="info-card">
            <div class="info-row">
              <div class="info-label">
                <ion-icon name="medical-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATIONS.DOSAGE' | translate }}</span>
              </div>
              <div class="info-value">{{ med.dosage }}</div>
            </div>

            <div class="info-row">
              <div class="info-label">
                <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATIONS.FREQUENCY' | translate }}</span>
              </div>
              <div class="info-value">{{ med.frequency }}</div>
            </div>

            <div class="info-row">
              <div class="info-label">
                <ion-icon name="cube-outline" aria-hidden="true"></ion-icon>
                <span>{{ 'MEDICATION_DETAIL.STOCK' | translate }}</span>
              </div>
              <div class="info-value" [class.low-stock]="med.stock <= 5">
                {{ med.stock }} {{ 'MEDICATIONS.UNITS' | translate }}
                @if (med.stock <= 5) {
                  <span class="low-stock-badge">{{ 'MEDICATIONS.LOW_STOCK' | translate }}</span>
                }
              </div>
            </div>

            @if(med.notes) {
              <div class="info-row notes-row">
                <div class="info-label">
                  <ion-icon name="document-text-outline" aria-hidden="true"></ion-icon>
                  <span>{{ 'MEDICATIONS.NOTES' | translate }}</span>
                </div>
                <div class="info-value notes-text">{{ med.notes }}</div>
              </div>
            }
          </div>
        </div>

        <!-- Today's Schedule -->
        <div class="schedule-section">
          <h2 class="section-title">{{ 'MEDICATION_DETAIL.TODAYS_SCHEDULE' | translate }}</h2>
          
          @if (todaysSchedule().length > 0) {
            @for(dose of todaysSchedule(); track dose.time) {
              <div class="dose-card-detail" [attr.data-status]="dose.status">
                <div class="dose-header">
                  <div class="dose-status-icon" [attr.data-status]="dose.status">
                    <ion-icon [name]="getIconForStatus(dose.status)" aria-hidden="true"></ion-icon>
                  </div>
                  <div class="dose-time">
                    <ion-icon name="time-outline" aria-hidden="true"></ion-icon>
                    <span>{{ dose.time }}</span>
                  </div>
                </div>

                @if(dose.administeredBy) {
                  <div class="dose-admin-info">
                    <span class="status-badge" [attr.data-status]="dose.status">
                      {{ getStatusText(dose.status) }}
                    </span>
                    <span class="admin-by">{{ 'DASHBOARD.BY' | translate }} {{ dose.administeredBy.name.split(' ')[0] }}</span>
                  </div>
                }

                @if (canAdminister()) {
                  <div class="dose-actions-detail">
                    @if (dose.status === 'upcoming') {
                      <button class="dose-action-btn taken-btn" (click)="confirmDoseStatus(dose, 'taken')" [attr.aria-label]="'DASHBOARD.MARK_AS_TAKEN' | translate">
                        <ion-icon name="checkmark-circle" aria-hidden="true"></ion-icon>
                        <span>{{ 'DASHBOARD.TOOK_IT' | translate }}</span>
                      </button>
                      <button class="dose-action-btn missed-btn" (click)="confirmDoseStatus(dose, 'missed')" [attr.aria-label]="'DASHBOARD.MARK_AS_MISSED' | translate">
                        <ion-icon name="close-circle" aria-hidden="true"></ion-icon>
                        <span>{{ 'DASHBOARD.MISSED_IT' | translate }}</span>
                      </button>
                    } @else {
                      <button class="dose-action-btn undo-btn" (click)="updateDoseStatus(dose.time, 'upcoming')" [attr.aria-label]="'DASHBOARD.UNDO' | translate">
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
            }
          } @else {
            <div class="empty-schedule">
              <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
              <p>{{ 'MEDICATION_DETAIL.NO_DOSES_TODAY' | translate }}</p>
            </div>
          }
        </div>
      } @else {
        <div class="loading-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
          <p>{{ 'MEDICATION_DETAIL.LOADING' | translate }}</p>
        </div>
      }
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner,
    TranslateModule
  ],
  styleUrls: ['./medication-detail.component.css'],
})
export class MedicationDetailComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly medicationService = inject(MedicationServiceV2);
  private readonly userService = inject(UserService);
  private readonly permissionService = inject(PermissionService);
  private readonly logService = inject(LogService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly alertController = inject(AlertController);
  private readonly translateService = inject(TranslateService);
  
  public readonly medication: Signal<Medication | undefined>;
  public readonly patientName: Signal<string>;
  public readonly todaysSchedule: Signal<Dose[]>;
  private readonly currentUser = this.userService.currentUser;
  
  // Permission checks
  public readonly canRegister = this.permissionService.canRegister;
  public readonly canAdminister = this.permissionService.canAdminister;

  constructor() {
    addIcons({ 
      createOutline, 
      trashOutline, 
      checkmarkCircleOutline, 
      closeCircleOutline, 
      arrowUndoOutline, 
      timeOutline,
      medical,
      'medical-outline': medicalOutline,
      'time-outline': timeOutline,
      'cube-outline': cubeOutline,
      'document-text-outline': documentTextOutline,
      'calendar-outline': calendarOutline,
      'arrow-back-outline': arrowBackOutline,
      checkmarkCircle,
      closeCircle,
      arrowUndo,
      eyeOutline
    });
    const medId = this.route.snapshot.paramMap.get('id');

    this.medication = computed(() => {
      if (!medId) return undefined;
      return this.medicationService.medications().find(m => m.id === medId);
    });

    this.patientName = computed(() => {
        const med = this.medication();
        if (!med) return '...';
        return this.userService.patients().find(p => p.id === med.patientId)?.name || 'Unknown Patient';
    });

    this.todaysSchedule = computed(() => this.medication()?.schedule ?? []);

    // Log caregiver views
    effect(() => {
      const patientId = this.patientSelectorService.activePatientId();
      if (patientId) {
        this.logService.logCaregiversView('medication-detail');
      }
    });
  }

  async confirmDelete() {
    const med = this.medication();
    if (!med) return;
    const alert = await this.alertController.create({
      header: this.translateService.instant('MEDICATION_DETAIL.DELETE_CONFIRM_TITLE'),
      message: this.translateService.instant('MEDICATION_DETAIL.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translateService.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translateService.instant('MEDICATION_DETAIL.DELETE'), role: 'destructive', handler: () => this.deleteMedication() }
      ]
    });
    await alert.present();
  }

  async deleteMedication() {
    const med = this.medication();
    if (!med) return;
    await this.medicationService.deleteMedication(med.id, med.name);
    this.router.navigate(['/tabs/medications']);
  }
  
  getIconForStatus(status: Dose['status']) {
      if (status === 'taken') return 'checkmark-circle-outline';
      if (status === 'missed') return 'close-circle-outline';
      return 'time-outline';
  }
  
  getColorForStatus(status: Dose['status']) {
      if (status === 'taken') return 'success';
      if (status === 'missed') return 'danger';
      return 'primary';
  }

  getStatusText(status: Dose['status']): string {
    if (status === 'taken') return 'Tomado';
    if (status === 'missed') return 'Perdido';
    return 'Pendente';
  }

  async confirmDoseStatus(dose: Dose, status: 'taken' | 'missed') {
    const alert = await this.alertController.create({
        header: `Confirm ${status === 'taken' ? 'Taken' : 'Missed'}`,
        message: 'Add any relevant notes below.',
        inputs: [{ name: 'notes', type: 'textarea', placeholder: 'Optional notes...' }],
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Confirm', handler: (data) => this.updateDoseStatus(dose.time, status, data.notes) }
        ]
    });
    await alert.present();
  }

  updateDoseStatus(time: string, status: Dose['status'], notes?: string) {
      const med = this.medication();
      const user = this.currentUser();
      if (!med || !user) return;
      
      const adminName = this.userService.patients().find(p => p.id === user.id)?.name || 'Unknown';
      this.medicationService.updateDoseStatus(med.id, time, status, adminName, notes);
  }
}
