import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonSelect,
  IonSelectOption,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline } from 'ionicons/icons';

/**
 * Patient Dropdown Selector Component
 * 
 * A compact dropdown selector for choosing which patient to view/manage
 * Used in Dashboard and History pages with contextual labels
 */
@Component({
  selector: 'app-patient-dropdown-selector',
  standalone: true,
  template: `
    <div class="patient-selector">
      <label class="selector-label" for="patient-select">
        <ion-icon name="person-outline" aria-hidden="true"></ion-icon>
        {{ labelKey | translate }}
      </label>
      <ion-select 
        id="patient-select"
        interface="action-sheet" 
        [value]="activePatientId()" 
        (ionChange)="selectPatient($event)"
        [attr.aria-label]="'DASHBOARD.SELECT_PATIENT' | translate">
        @for(patient of availablePatients(); track patient.userId) {
          <ion-select-option [value]="patient.userId">{{ getShortName(patient.name) }}</ion-select-option>
        }
      </ion-select>
    </div>
  `,
  styles: [`
    .patient-selector {
      padding: 1.5rem;
      background: white;
      margin: 1rem;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .selector-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: #1A1A1A;
      margin-bottom: 0.75rem;
    }

    .selector-label ion-icon {
      font-size: 1.5rem;
      color: #34D187;
    }

    ion-select {
      --background: #FFFFFF;
      --color: #1A1A1A;
      --padding-start: 1rem;
      --padding-end: 1rem;
      --padding-top: 1rem;
      --padding-bottom: 1rem;
      --border-color: #CCCCCC;
      --border-width: 2px;
      --border-radius: 12px;
      font-size: 1.125rem;
      font-weight: 600;
      min-height: 54px;
      width: 100%;
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      ion-select {
        transition: none;
      }
    }

    @media (prefers-contrast: high) {
      .patient-selector {
        border: 2px solid #DEE2E6;
      }

      .selector-label {
        font-weight: 700;
      }
    }

    /* Mobile optimization */
    @media (max-width: 576px) {
      .patient-selector {
        margin: 0.75rem;
        padding: 1rem;
      }

      .selector-label {
        font-size: 1rem;
      }

      ion-select {
        font-size: 1rem;
        min-height: 48px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    IonSelect,
    IonSelectOption,
    IonIcon
  ]
})
export class PatientDropdownSelectorComponent {
  private readonly patientSelectorService = inject(PatientSelectorService);

  /**
   * Translation key for the label text
   * Examples: 'DASHBOARD.VIEWING_SCHEDULE', 'HISTORY.VIEWING_HISTORY'
   */
  @Input() labelKey: string = 'DASHBOARD.VIEWING_SCHEDULE';

  availablePatients = this.patientSelectorService.availablePatients;
  activePatientId = this.patientSelectorService.activePatientId;

  constructor() {
    addIcons({
      personOutline
    });
  }

  selectPatient(event: any) {
    const patientId = event.detail.value;
    if (patientId) {
      this.patientSelectorService.setActivePatient(patientId);
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
