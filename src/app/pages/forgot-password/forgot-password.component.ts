import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
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
import { mailOutline, arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-forgot-password',
  styleUrls: ['./forgot-password.component.css'],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">medicamenta.me</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding accessible-page">
      <div class="accessible-container">
        <div class="accessible-form-wrapper">
          <h1 class="accessible-page-title">Recuperar Senha</h1>
          
          <p class="accessible-instructions">
            Digite seu e-mail cadastrado. Enviaremos um link para você redefinir sua senha.
          </p>
          
          <form [formGroup]="forgotPasswordForm" (ngSubmit)="sendResetEmail()">
            <div class="accessible-form-group">
              <label class="accessible-label" for="email-input">
                <ion-icon name="mail-outline" aria-hidden="true"></ion-icon>
                E-mail
              </label>
              <ion-input 
                id="email-input"
                class="accessible-input"
                type="email" 
                formControlName="email" 
                placeholder="Digite seu e-mail"
                aria-label="Campo de e-mail"
                fill="outline"
                required>
              </ion-input>
            </div>

            <ion-button 
              expand="block" 
              type="submit" 
              color="primary" 
              size="large"
              class="accessible-button"
              [disabled]="loading() || forgotPasswordForm.invalid"
              aria-label="Botão de enviar link de recuperação">
              @if(loading()) {
                <ion-spinner name="crescent" aria-label="Carregando"></ion-spinner>
              } @else {
                Enviar Link de Recuperação
              }
            </ion-button>
          </form>

          <div class="accessible-divider">
            <span>ou</span>
          </div>

          <div class="accessible-signup-container">
            <p class="accessible-text">Lembrou sua senha?</p>
            <a routerLink="/login" class="accessible-link-button">
              <ion-icon name="arrow-back-outline" aria-hidden="true"></ion-icon>
              Voltar para Login
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
    IonSpinner
  ],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  forgotPasswordForm: FormGroup;
  loading = signal(false);

  constructor() {
    addIcons({ mailOutline, arrowBackOutline });
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  async sendResetEmail() {
    if (this.forgotPasswordForm.invalid) {
      return;
    }
    this.loading.set(true);
    try {
      const auth = getAuth();
      const { email } = this.forgotPasswordForm.value;
      await sendPasswordResetEmail(auth, email);
      
      const toast = await this.toastController.create({
        message: 'Link de recuperação enviado! Verifique seu e-mail.',
        duration: 5000,
        color: 'success',
      });
      await toast.present();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error) {
      const toast = await this.toastController.create({
        message: 'Erro ao enviar e-mail. Verifique se o e-mail está correto.',
        duration: 3000,
        color: 'danger',
      });
      await toast.present();
      console.error('Password reset error:', error);
    } finally {
      this.loading.set(false);
    }
  }
}
