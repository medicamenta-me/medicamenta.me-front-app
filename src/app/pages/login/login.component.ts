import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  styleUrls: ['./login.component.css'],
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
          <h1 class="accessible-page-title">{{ 'AUTH.LOGIN' | translate }}</h1>
          
          <form [formGroup]="loginForm" (ngSubmit)="login()">
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
                [placeholder]="'AUTH.PASSWORD_PLACEHOLDER' | translate"
                [attr.aria-label]="'AUTH.PASSWORD' | translate"
                fill="outline"
                required>
              </ion-input>
            </div>

            <div class="accessible-link-container">
              <a routerLink="/forgot-password" class="accessible-link">
                {{ 'AUTH.FORGOT_PASSWORD' | translate }}
              </a>
            </div>

            <ion-button 
              expand="block" 
              type="submit" 
              color="primary" 
              size="large"
              class="accessible-button"
              [disabled]="loading() || loginForm.invalid"
              [attr.aria-label]="'AUTH.LOGIN' | translate">
              @if(loading()) {
                <ion-spinner name="crescent" [attr.aria-label]="'COMMON.LOADING' | translate"></ion-spinner>
              } @else {
                {{ 'AUTH.LOGIN' | translate }}
              }
            </ion-button>
          </form>

          <div class="accessible-divider">
            <span>{{ 'AUTH.OR' | translate }}</span>
          </div>

          <div class="accessible-signup-container">
            <p class="accessible-text">{{ 'AUTH.NO_ACCOUNT' | translate }}</p>
            <a routerLink="/signup" class="accessible-link-button">
              {{ 'AUTH.SIGNUP' | translate }}
            </a>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
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
    TranslateModule
  ],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);
  private readonly translateService = inject(TranslateService);

  loginForm: FormGroup;
  loading = signal(false);

  constructor() {
    addIcons({ mailOutline, lockClosedOutline });
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  async login() {
    if (this.loginForm.invalid) {
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.loginForm.value;
      console.log('[LoginComponent] Attempting login...');
      await this.authService.login(email, password);
      console.log('[LoginComponent] Login successful, navigating to /tabs');
      // Navigate to tabs, let onboardingGuard redirect to /onboarding if needed
      await this.router.navigate(['/tabs']);
      console.log('[LoginComponent] Navigation complete');
    } catch (error) {
      console.error('[LoginComponent] Login error:', error);
      const toast = await this.toastController.create({
        message: this.translateService.instant('AUTH.LOGIN_ERROR'),
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.loading.set(false);
    }
  }


}