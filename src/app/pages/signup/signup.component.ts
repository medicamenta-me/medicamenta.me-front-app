import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, mailOutline, lockClosedOutline, bodyOutline } from 'ionicons/icons';

@Component({
  selector: 'app-signup',
  styleUrls: ['./signup.component.css'],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">{{ 'APP.NAME' | translate }}</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding accessible-page">
      <div class="accessible-container">
        <div class="accessible-form-wrapper">
          <h1 class="accessible-page-title">{{ 'AUTH.SIGNUP' | translate }}</h1>
          
          <form [formGroup]="signupForm" (ngSubmit)="signup()">
            <div class="accessible-form-group">
              <label class="accessible-label" for="fullname-input">
                <ion-icon name="person-circle-outline" aria-hidden="true"></ion-icon>
                {{ 'AUTH.FULL_NAME' | translate }}
              </label>
              <ion-input 
                id="fullname-input"
                class="accessible-input"
                type="text" 
                formControlName="fullName" 
                [placeholder]="'AUTH.FULL_NAME_PLACEHOLDER' | translate"
                [attr.aria-label]="'AUTH.FULL_NAME' | translate"
                fill="outline"
                required>
              </ion-input>
            </div>

            <div class="accessible-form-group">
              <label class="accessible-label" for="email-input">
                <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
                {{ 'AUTH.EMAIL' | translate }}
              </label>
              <ion-input 
                id="email-input"
                class="accessible-input"
                type="email" 
                formControlName="email" 
                [placeholder]="'AUTH.EMAIL_PLACEHOLDER' | translate"
                [attr.aria-label]="'AUTH.EMAIL' | translate"
                fill="outline"
                required>
              </ion-input>
            </div>

            <div class="accessible-form-group">
              <label class="accessible-label" for="password-input">
                <ion-icon name="lock-closed-outline" aria-hidden="true"></ion-icon>
                {{ 'AUTH.PASSWORD' | translate }}
              </label>
              <ion-input 
                id="password-input"
                class="accessible-input"
                type="password" 
                formControlName="password" 
                [placeholder]="'AUTH.PASSWORD_MIN_LENGTH' | translate"
                [attr.aria-label]="'AUTH.PASSWORD' | translate"
                fill="outline"
                required>
              </ion-input>
            </div>

            <div class="accessible-form-group">
              <label class="accessible-label" for="role-select">
                <ion-icon name="body-outline" aria-hidden="true"></ion-icon>
                {{ 'AUTH.ROLE' | translate }}
              </label>
              <ion-select 
                id="role-select"
                class="accessible-select"
                interface="action-sheet" 
                formControlName="role"
                [attr.aria-label]="'AUTH.ROLE' | translate">
                @for(role of roles; track role.value) {
                  <ion-select-option [value]="role.value">{{ role.label | translate }}</ion-select-option>
                }
              </ion-select>
            </div>

            <ion-button 
              expand="block" 
              type="submit" 
              color="primary" 
              size="large"
              class="accessible-button"
              [disabled]="loading() || signupForm.invalid"
              [attr.aria-label]="'AUTH.SIGNUP' | translate">
              @if(loading()) {
                <ion-spinner name="crescent" [attr.aria-label]="'COMMON.LOADING' | translate"></ion-spinner>
              } @else {
                {{ 'AUTH.SIGNUP' | translate }}
              }
            </ion-button>
          </form>

          <div class="accessible-divider">
            <span>{{ 'AUTH.OR' | translate }}</span>
          </div>

          <div class="accessible-signup-container">
            <p class="accessible-text">{{ 'AUTH.HAVE_ACCOUNT' | translate }}</p>
            <a routerLink="/login" class="accessible-link-button">
              {{ 'AUTH.LOGIN' | translate }}
            </a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    IonSelect,
    IonSelectOption,
    TranslateModule
  ],
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly translateService = inject(TranslateService);

  signupForm: FormGroup;
  loading = signal(false);
  roles = [
    { value: 'Patient', label: 'AUTH.ROLE_PATIENT' },
    { value: 'Family Member', label: 'AUTH.ROLE_FAMILY' },
    { value: 'Nurse', label: 'AUTH.ROLE_NURSE' },
    { value: 'Doctor', label: 'AUTH.ROLE_DOCTOR' }
  ];

  constructor() {
    addIcons({ personCircleOutline, mailOutline, lockClosedOutline, bodyOutline });
    this.signupForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['Patient', Validators.required],
    });
  }

  async signup() {
    if (this.signupForm.invalid) {
      return;
    }
    this.loading.set(true);
    try {
      const { fullName, email, password, role } = this.signupForm.value;
      console.log('[SignupComponent] Creating account...');
      await this.authService.signup(fullName, email, password, role);
      console.log('[SignupComponent] Account created, navigating to /tabs');
      // Navigate to tabs, onboardingGuard will redirect to /onboarding for new users
      await this.router.navigate(['/tabs']);
      console.log('[SignupComponent] Navigation complete');
    } catch (error) {
      console.error('[SignupComponent] Signup error:', error);
      const toast = await this.toastController.create({
        message: this.translateService.instant('AUTH.SIGNUP_ERROR'),
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.loading.set(false);
    }
  }
}