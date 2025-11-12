import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonItem,
  IonLabel,
  IonAvatar,
  IonRadio,
  IonRadioGroup,
  IonNote,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, heartOutline } from 'ionicons/icons';
import { FormsModule } from '@angular/forms';

/**
 * Patient Selector Component
 * 
 * Displays a list of patients (logged-in user + people they care for)
 * Allows selecting which patient to manage medications for
 */
@Component({
  selector: 'app-patient-selector',
  standalone: true,
  template: `
    <div class="patient-selector">
      <h3 class="selector-title">{{ 'PATIENT_SELECTOR.TITLE' | translate }}</h3>
      <p class="selector-description">{{ 'PATIENT_SELECTOR.DESCRIPTION' | translate }}</p>
      
      <ion-radio-group [(ngModel)]="selectedPatientId" (ionChange)="onPatientChange()">
        @for (patient of availablePatients(); track patient.userId) {
          <ion-item class="patient-item" [class.selected]="selectedPatientId === patient.userId">
            <ion-avatar slot="start">
              <img [src]="patient.avatarUrl" [alt]="patient.name" />
            </ion-avatar>
            <ion-label>
              <h3>{{ getShortName(patient.name) }}</h3>
              <p class="patient-email">{{ patient.email }}</p>
              @if (patient.relationship) {
                <p class="patient-relationship">
                  <ion-icon name="heart-outline"></ion-icon>
                  {{ patient.relationship }}
                </p>
              }
              @if (patient.isSelf) {
                <ion-note color="primary">{{ 'PATIENT_SELECTOR.YOU' | translate }}</ion-note>
              }
            </ion-label>
            <ion-radio slot="end" [value]="patient.userId"></ion-radio>
          </ion-item>
        }
      </ion-radio-group>
      
      @if (availablePatients().length === 0) {
        <div class="empty-state">
          <ion-icon name="person-circle-outline"></ion-icon>
          <p>{{ 'PATIENT_SELECTOR.NO_PATIENTS' | translate }}</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .patient-selector {
      padding: 1rem;
    }

    .selector-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1A1A1A;
      margin: 0 0 0.5rem 0;
    }

    .selector-description {
      font-size: 1rem;
      color: #6C757D;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }

    ion-radio-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .patient-item {
      --background: white;
      --border-radius: 12px;
      --padding-start: 1rem;
      --padding-end: 1rem;
      --min-height: 80px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      margin-bottom: 0;
    }

    .patient-item.selected {
      --background: #E7F5EF;
      border: 2px solid #34D187;
    }

    .patient-item ion-avatar {
      width: 56px;
      height: 56px;
      border: 3px solid #34D187;
    }

    .patient-item h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #1A1A1A;
      margin: 0 0 0.25rem 0;
    }

    .patient-email {
      font-size: 0.9375rem;
      color: #6C757D;
      margin: 0 0 0.25rem 0;
    }

    .patient-relationship {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: #34D187;
      font-weight: 600;
      margin: 0;
    }

    .patient-relationship ion-icon {
      font-size: 1rem;
    }

    ion-note {
      font-size: 0.875rem;
      font-weight: 600;
      margin-top: 0.25rem;
    }

    ion-radio {
      --color-checked: #34D187;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6C757D;
    }

    .empty-state ion-icon {
      font-size: 4rem;
      color: #DEE2E6;
      margin-bottom: 1rem;
    }

    .empty-state p {
      font-size: 1.125rem;
      margin: 0;
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      .patient-item {
        transition: none;
      }
    }

    @media (prefers-contrast: high) {
      .patient-item {
        border: 2px solid #DEE2E6;
      }

      .patient-item.selected {
        border: 3px solid #34D187;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TranslateModule,
    IonItem,
    IonLabel,
    IonAvatar,
    IonRadio,
    IonRadioGroup,
    IonNote,
    IonIcon
  ]
})
export class PatientSelectorComponent {
  private readonly patientSelectorService = inject(PatientSelectorService);

  availablePatients = this.patientSelectorService.availablePatients;
  selectedPatientId: string = '';

  constructor() {
    addIcons({
      personCircleOutline,
      heartOutline
    });

    // Initialize with current active patient
    this.selectedPatientId = this.patientSelectorService.activePatientId();
  }

  onPatientChange() {
    if (this.selectedPatientId) {
      this.patientSelectorService.setActivePatient(this.selectedPatientId);
    }
  }

  /**
   * Formats a full name to show only first and last name
   * Example: "João Silva Santos" -> "João Santos"
   */
  getShortName(fullName: string): string {
    if (!fullName) return '';
    
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 0) return '';
    if (nameParts.length === 1) return nameParts[0];
    
    // Return first and last name
    return `${nameParts[0]} ${nameParts.at(-1)}`;
  }
}
