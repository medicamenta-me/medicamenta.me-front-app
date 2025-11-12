import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonSegment, 
  IonSegmentButton, 
  IonLabel, 
  IonIcon,
  IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, peopleOutline } from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';
import { ProfileTypeService } from '../../services/profile-type.service';

@Component({
  selector: 'app-profile-type-switcher',
  standalone: true,
  imports: [
    CommonModule,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonChip,
    TranslateModule
  ],
  template: `
    <div class="profile-switcher" *ngIf="profileTypeService.canSwitchProfile()">
      <ion-segment 
        [value]="profileTypeService.activeProfileType()" 
        (ionChange)="onProfileTypeChange($event)"
        mode="md">
        <ion-segment-button value="patient">
          <ion-icon name="person-outline" slot="start"></ion-icon>
          <ion-label>{{ 'PROFILE_TYPE.PATIENT_MODE' | translate }}</ion-label>
        </ion-segment-button>
        <ion-segment-button value="caregiver">
          <ion-icon name="people-outline" slot="start"></ion-icon>
          <ion-label>{{ 'PROFILE_TYPE.CAREGIVER_MODE' | translate }}</ion-label>
        </ion-segment-button>
      </ion-segment>
      
      <div class="profile-description">
        <ion-chip color="primary" class="description-chip">
          <ion-icon 
            [name]="profileTypeService.activeProfileType() === 'patient' ? 'person-outline' : 'people-outline'">
          </ion-icon>
          <ion-label>{{ getProfileDescription() | translate }}</ion-label>
        </ion-chip>
      </div>
    </div>

    <div class="single-mode-message" *ngIf="!profileTypeService.canSwitchProfile()">
      <ion-chip color="medium">
        <ion-icon name="person-outline"></ion-icon>
        <ion-label>{{ 'PROFILE_TYPE.PATIENT_MODE_ONLY' | translate }}</ion-label>
      </ion-chip>
    </div>
  `,
  styles: [`
    .profile-switcher {
      width: 100%;
      padding: 12px 16px;
      background: var(--ion-background-color);
      border-bottom: 1px solid var(--ion-border-color, #e0e0e0);
    }

    ion-segment {
      width: 100%;
      max-width: 500px;
      margin: 0 auto;
      --background: var(--ion-color-light);
    }

    ion-segment-button {
      --indicator-color: var(--ion-color-primary);
      --color: var(--ion-color-medium);
      --color-checked: var(--ion-color-primary-contrast);
      min-height: 40px;
    }

    ion-segment-button ion-icon {
      margin-right: 4px;
    }

    ion-segment-button ion-label {
      font-size: 14px;
      font-weight: 500;
    }

    .profile-description {
      margin-top: 8px;
      text-align: center;
    }

    .description-chip {
      font-size: 12px;
      height: 28px;
    }

    .description-chip ion-icon {
      font-size: 16px;
      margin-right: 4px;
    }

    .single-mode-message {
      padding: 12px 16px;
      text-align: center;
      background: var(--ion-background-color);
      border-bottom: 1px solid var(--ion-border-color, #e0e0e0);
    }

    .single-mode-message ion-chip {
      font-size: 13px;
    }

    .single-mode-message ion-icon {
      font-size: 18px;
      margin-right: 4px;
    }

    @media (max-width: 768px) {
      ion-segment-button ion-label {
        font-size: 12px;
      }

      .profile-description {
        margin-top: 6px;
      }

      .description-chip {
        font-size: 11px;
        height: 26px;
      }
    }
  `]
})
export class ProfileTypeSwitcherComponent {
  readonly profileTypeService = inject(ProfileTypeService);

  constructor() {
    addIcons({ personOutline, peopleOutline });
  }

  onProfileTypeChange(event: any): void {
    const newType = event.detail.value;
    this.profileTypeService.setProfileType(newType);
  }

  getProfileDescription(): string {
    // Translations will be handled in template
    const type = this.profileTypeService.activeProfileType();
    return type === 'patient' ? 'PROFILE_TYPE.MANAGING_SELF' : 'PROFILE_TYPE.MANAGING_OTHERS';
  }
}
