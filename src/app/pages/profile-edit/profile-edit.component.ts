import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { PhoneInputComponent } from '../../components/phone-input/phone-input.component';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonIcon,
  IonSelect,
  IonSelectOption,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';

@Component({
  selector: 'app-profile-edit',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">medicamenta.me</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="accessible-profile-edit">
      <div class="profile-edit-header">
        <h1>{{ 'PROFILE.EDIT' | translate }}</h1>
        <p>{{ 'PROFILE.EDIT_DESCRIPTION' | translate }}</p>
      </div>

      @if(profileForm) {
        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
          <div class="form-container">
            <div class="form-field">
              <label class="field-label">{{ 'PROFILE.FULL_NAME' | translate }}</label>
              <ion-input 
                class="accessible-input"
                formControlName="name" 
                required
                [placeholder]="'PROFILE.FULL_NAME_PLACEHOLDER' | translate">
              </ion-input>
            </div>

            <div class="form-field">
              <label class="field-label">{{ 'PROFILE.EMAIL' | translate }}</label>
              <ion-input 
                class="accessible-input readonly"
                formControlName="email" 
                type="email" 
                [readonly]="true">
              </ion-input>
              <p class="field-hint">{{ 'PROFILE.EMAIL_READONLY' | translate }}</p>
            </div>

            <div class="form-field">
              <label class="field-label">{{ 'PROFILE.ROLE' | translate }}</label>
              <ion-select 
                class="accessible-select"
                formControlName="role" 
                required
                interface="action-sheet"
                [placeholder]="'PROFILE.ROLE_PLACEHOLDER' | translate">
                <ion-select-option value="Patient">{{ 'PROFILE.ROLE_PATIENT' | translate }}</ion-select-option>
                <ion-select-option value="Family Member">{{ 'PROFILE.ROLE_FAMILY' | translate }}</ion-select-option>
                <ion-select-option value="Nurse">{{ 'PROFILE.ROLE_NURSE' | translate }}</ion-select-option>
                <ion-select-option value="Doctor">{{ 'PROFILE.ROLE_DOCTOR' | translate }}</ion-select-option>
              </ion-select>
            </div>

            <div class="form-field">
              <label class="field-label">{{ 'PROFILE.PHONE' | translate }}</label>
              <app-phone-input formControlName="phone"></app-phone-input>
            </div>
          </div>

          <div class="form-actions">
            <button 
              type="button"
              class="cancel-button"
              (click)="cancelEdit()">
              {{ 'COMMON.CANCEL' | translate }}
            </button>
            <button 
              type="submit"
              class="save-button"
              [disabled]="!profileForm || profileForm.invalid">
              <ion-icon name="save-outline"></ion-icon>
              {{ 'COMMON.SAVE' | translate }}
            </button>
          </div>
        </form>
      } @else {
        <div class="loading-state">
          <p>{{ 'COMMON.LOADING' | translate }}</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    /* ============================================
       PROFILE EDIT ACCESSIBLE STYLES
       ============================================ */

    .accessible-profile-edit {
      --background: #F8F9FA;
    }

    /* Profile Edit Header */
    .profile-edit-header {
      background: linear-gradient(135deg, #34D187 0%, #2eb877 100%);
      padding: 2rem 1.5rem;
      color: white;
      text-align: center;
    }

    .profile-edit-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 0.5rem 0;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .profile-edit-header p {
      font-size: 1.125rem;
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
      font-weight: 500;
    }

    /* Form Container */
    .form-container {
      background: white;
      margin: 1.5rem 1rem;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    /* Form Field */
    .form-field {
      margin-bottom: 2rem;
    }

    .form-field:last-child {
      margin-bottom: 0;
    }

    .field-label {
      display: block;
      font-size: 1.125rem;
      font-weight: 700;
      color: #1A1A1A;
      margin-bottom: 0.75rem;
      letter-spacing: 0.01em;
    }

    .field-hint {
      font-size: 0.9375rem;
      color: #6C757D;
      margin: 0.5rem 0 0 0;
      font-style: italic;
    }

    /* Accessible Input */
    .accessible-input {
      --background: #F8F9FA;
      --border-radius: 8px;
      --padding-start: 1.25rem;
      --padding-end: 1.25rem;
      --padding-top: 1rem;
      --padding-bottom: 1rem;
      font-size: 1.125rem;
      font-weight: 500;
      border: 2px solid #DEE2E6;
      transition: all 0.2s;
    }

    .accessible-input:focus-within {
      border-color: #34D187;
      --background: white;
    }

    .accessible-input.readonly {
      --background: #E9ECEF;
      opacity: 0.8;
      cursor: not-allowed;
    }

    /* Accessible Select */
    .accessible-select {
      --background: #F8F9FA;
      --border-radius: 8px;
      --padding-start: 1.25rem;
      --padding-end: 1.25rem;
      --padding-top: 1rem;
      --padding-bottom: 1rem;
      font-size: 1.125rem;
      font-weight: 500;
      border: 2px solid #DEE2E6;
      width: 100%;
      min-height: 3.5rem;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      gap: 1rem;
      padding: 1.5rem 1rem;
      margin-bottom: 1rem;
    }

    .cancel-button,
    .save-button {
      flex: 1;
      height: 3.5rem;
      border-radius: 8px;
      font-size: 1.125rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
      letter-spacing: 0.025em;
    }

    .cancel-button {
      background: white;
      color: #6C757D;
      border: 2px solid #DEE2E6;
    }

    .cancel-button:hover {
      background: #F8F9FA;
      border-color: #ADB5BD;
    }

    .cancel-button:active {
      transform: scale(0.98);
    }

    .save-button {
      background: #34D187;
      color: white;
      border: 2px solid #34D187;
    }

    .save-button:hover:not(:disabled) {
      background: #2eb877;
      border-color: #2eb877;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(52, 209, 135, 0.3);
    }

    .save-button:active:not(:disabled) {
      transform: scale(0.98);
    }

    .save-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .save-button ion-icon {
      font-size: 1.5rem;
    }

    /* Loading State */
    .loading-state {
      text-align: center;
      padding: 3rem 1rem;
    }

    .loading-state p {
      font-size: 1.125rem;
      color: #6C757D;
    }

    /* ============================================
       RESPONSIVE DESIGN
       ============================================ */

    @media (max-width: 576px) {
      .profile-edit-header {
        padding: 1.5rem 1rem;
      }

      .profile-edit-header h1 {
        font-size: 1.75rem;
      }

      .profile-edit-header p {
        font-size: 1rem;
      }

      .form-container {
        margin: 1rem 0.5rem;
        padding: 1.25rem;
      }

      .field-label {
        font-size: 1rem;
      }

      .accessible-input,
      .accessible-select {
        font-size: 1rem;
      }

      .form-actions {
        flex-direction: column;
        padding: 1rem 0.5rem;
      }

      .cancel-button,
      .save-button {
        height: 3.25rem;
        font-size: 1rem;
      }
    }

    /* ============================================
       ACCESSIBILITY ENHANCEMENTS
       ============================================ */

    @media (prefers-reduced-motion: reduce) {
      .accessible-input,
      .accessible-select,
      .cancel-button,
      .save-button {
        transition: none;
      }
    }

    @media (prefers-contrast: high) {
      .accessible-input,
      .accessible-select {
        border-width: 3px;
      }

      .field-label {
        font-weight: 800;
      }

      .save-button {
        border-width: 3px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    PhoneInputComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonIcon,
    IonSelect,
    IonSelectOption
  ],
})
export class ProfileEditComponent {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastController = inject(ToastController);
  
  profileForm!: FormGroup;

  constructor() {
    addIcons({ saveOutline });

    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        if (this.profileForm) {
          // Patch form if it exists and user data changes
          this.profileForm.patchValue({
             name: user.name,
             role: user.role,
             phone: user.phone || ''
          });
        } else {
          // Initialize form only once
           this.profileForm = this.fb.group({
            name: [user.name, Validators.required],
            email: [{value: user.email, disabled: true}, [Validators.required, Validators.email]],
            role: [user.role, Validators.required],
            phone: [user.phone || '']
          });
        }
      }
    });
  }
  
  cancelEdit() {
    this.router.navigate(['/tabs/profile']);
  }

  async saveProfile() {
    if (!this.profileForm || this.profileForm.invalid) {
      return;
    }
    try {
      await this.userService.updateUser(this.profileForm.getRawValue());
      const toast = await this.toastController.create({
        message: 'Profile updated successfully.',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      this.router.navigate(['/tabs/profile']);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: `Error updating profile: ${error.message}`,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}