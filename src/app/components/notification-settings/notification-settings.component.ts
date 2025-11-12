import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import { NotificationSchedulerService } from '../../services/notification-scheduler.service';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonToggle,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  notifications,
  notificationsOff,
  checkmarkCircle,
  alertCircle,
  time,
  volumeHigh,
  volumeOff,
  phonePortrait
} from 'ionicons/icons';

/**
 * Component for managing notification settings
 * 
 * Features:
 * - Enable/disable notifications
 * - Configure advance reminder time
 * - Test notifications
 * - Show permission status
 * - Sound and vibration toggles
 */
@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonToggle,
    IonButton,
    IonIcon,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption
  ],
  template: `
    <ion-card class="notification-settings-card">
      <ion-card-header>
        <div class="header-with-icon">
          <ion-icon [name]="notificationsEnabled() ? 'notifications' : 'notifications-off'" class="header-icon"></ion-icon>
          <ion-card-title>{{ 'NOTIFICATIONS.TITLE' | translate }}</ion-card-title>
        </div>
      </ion-card-header>

      <ion-card-content>
        <!-- Notification Support Check -->
        @if (!isSupported) {
          <div class="warning-box">
            <ion-icon name="alert-circle" color="warning"></ion-icon>
            <p>{{ 'NOTIFICATIONS.NOT_SUPPORTED' | translate }}</p>
          </div>
        } @else {
          <!-- Permission Status -->
          <div class="permission-status" [attr.data-status]="permissionState()">
            <ion-icon [name]="getPermissionIcon()" [color]="getPermissionColor()"></ion-icon>
            <div class="status-text">
              <strong>{{ 'NOTIFICATIONS.PERMISSION_STATUS' | translate }}</strong>
              <p>{{ getPermissionText() | translate }}</p>
            </div>
          </div>

          <!-- Main Toggle -->
          <ion-item lines="none" class="main-toggle">
            <ion-icon name="notifications" slot="start"></ion-icon>
            <ion-label>
              <h2>{{ 'NOTIFICATIONS.ENABLE' | translate }}</h2>
              <p>{{ 'NOTIFICATIONS.ENABLE_DESC' | translate }}</p>
            </ion-label>
            <ion-toggle 
              [checked]="notificationsEnabled()" 
              (ionChange)="toggleNotifications($event)"
              [disabled]="permissionState() === 'denied'"
            ></ion-toggle>
          </ion-item>

          <!-- Permission Denied Message -->
          @if (permissionState() === 'denied') {
            <div class="info-box denied">
              <ion-icon name="alert-circle" color="danger"></ion-icon>
              <p>{{ 'NOTIFICATIONS.PERMISSION_DENIED_HELP' | translate }}</p>
            </div>
          }

          <!-- Settings (only shown when enabled) -->
          @if (notificationsEnabled() && permissionState() === 'granted') {
            <div class="notification-options">
              <!-- Advance Reminder Time -->
              <ion-item lines="none">
                <ion-icon name="time" slot="start"></ion-icon>
                <ion-label>
                  <h3>{{ 'NOTIFICATIONS.ADVANCE_TIME' | translate }}</h3>
                  <p>{{ 'NOTIFICATIONS.ADVANCE_TIME_DESC' | translate }}</p>
                </ion-label>
                <ion-select 
                  [(ngModel)]="advanceMinutes" 
                  (ionChange)="updateAdvanceTime()"
                  interface="popover"
                  slot="end"
                >
                  <ion-select-option [value]="0">{{ 'NOTIFICATIONS.ON_TIME' | translate }}</ion-select-option>
                  <ion-select-option [value]="5">5 {{ 'COMMON.MINUTES' | translate }}</ion-select-option>
                  <ion-select-option [value]="10">10 {{ 'COMMON.MINUTES' | translate }}</ion-select-option>
                  <ion-select-option [value]="15">15 {{ 'COMMON.MINUTES' | translate }}</ion-select-option>
                  <ion-select-option [value]="30">30 {{ 'COMMON.MINUTES' | translate }}</ion-select-option>
                  <ion-select-option [value]="60">60 {{ 'COMMON.MINUTES' | translate }}</ion-select-option>
                </ion-select>
              </ion-item>

              <!-- Sound Toggle -->
              <ion-item lines="none">
                <ion-icon [name]="soundEnabled ? 'volume-high' : 'volume-off'" slot="start"></ion-icon>
                <ion-label>
                  <h3>{{ 'NOTIFICATIONS.SOUND' | translate }}</h3>
                  <p>{{ 'NOTIFICATIONS.SOUND_DESC' | translate }}</p>
                </ion-label>
                <ion-toggle 
                  [(ngModel)]="soundEnabled" 
                  (ionChange)="updateSound()"
                ></ion-toggle>
              </ion-item>

              <!-- Vibration Toggle -->
              <ion-item lines="none">
                <ion-icon name="phone-portrait" slot="start"></ion-icon>
                <ion-label>
                  <h3>{{ 'NOTIFICATIONS.VIBRATION' | translate }}</h3>
                  <p>{{ 'NOTIFICATIONS.VIBRATION_DESC' | translate }}</p>
                </ion-label>
                <ion-toggle 
                  [(ngModel)]="vibrationEnabled" 
                  (ionChange)="updateVibration()"
                ></ion-toggle>
              </ion-item>

              <!-- Scheduled Count -->
              <div class="info-box">
                <ion-icon name="checkmark-circle" color="success"></ion-icon>
                <p>{{ 'NOTIFICATIONS.SCHEDULED_COUNT' | translate: { count: scheduledCount() } }}</p>
              </div>

              <!-- Test Notification Button -->
              <ion-button 
                expand="block" 
                fill="outline" 
                (click)="testNotification()"
                class="test-button"
              >
                <ion-icon name="notifications" slot="start"></ion-icon>
                {{ 'NOTIFICATIONS.TEST' | translate }}
              </ion-button>
            </div>
          }

          <!-- Request Permission Button -->
          @if (permissionState() === 'default') {
            <ion-button 
              expand="block" 
              color="primary"
              (click)="requestPermission()"
              class="request-button"
            >
              <ion-icon name="notifications" slot="start"></ion-icon>
              {{ 'NOTIFICATIONS.REQUEST_PERMISSION' | translate }}
            </ion-button>
          }
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .notification-settings-card {
      margin: 16px;
      border-radius: 16px;
    }

    .header-with-icon {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      font-size: 32px;
      color: var(--ion-color-primary);
    }

    .permission-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 16px;
      background: var(--ion-color-light);
    }

    .permission-status[data-status="granted"] {
      background: rgba(76, 175, 80, 0.1);
    }

    .permission-status[data-status="denied"] {
      background: rgba(244, 67, 54, 0.1);
    }

    .permission-status[data-status="default"] {
      background: rgba(255, 152, 0, 0.1);
    }

    .permission-status ion-icon {
      font-size: 32px;
    }

    .status-text {
      flex: 1;
    }

    .status-text strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .status-text p {
      margin: 0;
      font-size: 12px;
      color: var(--ion-color-medium);
    }

    .main-toggle {
      margin-bottom: 16px;
      --background: var(--ion-color-light);
      border-radius: 12px;
      padding: 8px;
    }

    .main-toggle ion-icon {
      font-size: 24px;
      margin-right: 12px;
    }

    .main-toggle h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .main-toggle p {
      font-size: 14px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .notification-options {
      margin-top: 16px;
    }

    .notification-options ion-item {
      --background: transparent;
      margin-bottom: 12px;
    }

    .notification-options ion-icon {
      font-size: 24px;
      margin-right: 12px;
    }

    .notification-options h3 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 4px 0;
    }

    .notification-options p {
      font-size: 12px;
      color: var(--ion-color-medium);
      margin: 0;
    }

    .info-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: rgba(33, 150, 243, 0.1);
      margin: 16px 0;
    }

    .info-box.denied {
      background: rgba(244, 67, 54, 0.1);
    }

    .info-box ion-icon {
      font-size: 24px;
    }

    .info-box p {
      margin: 0;
      font-size: 14px;
      color: var(--ion-color-dark);
    }

    .warning-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      background: rgba(255, 152, 0, 0.1);
    }

    .warning-box ion-icon {
      font-size: 32px;
    }

    .warning-box p {
      margin: 0;
      font-size: 14px;
      color: var(--ion-color-dark);
    }

    .test-button {
      margin-top: 16px;
    }

    .request-button {
      margin-top: 16px;
    }

    /* Mobile adjustments */
    @media (max-width: 576px) {
      .notification-settings-card {
        margin: 12px;
      }

      .permission-status {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class NotificationSettingsComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly schedulerService = inject(NotificationSchedulerService);
  private readonly toastController = inject(ToastController);

  // Signals
  public readonly permissionState = this.notificationService.permissionState;
  public readonly isSupported = this.notificationService.isSupported;

  // Local state
  public advanceMinutes = 15;
  public soundEnabled = true;
  public vibrationEnabled = true;

  // Computed
  public readonly notificationsEnabled = computed(() => {
    return this.schedulerService.isEnabled();
  });

  public readonly scheduledCount = signal(0);

  constructor() {
    addIcons({
      notifications,
      notificationsOff,
      checkmarkCircle,
      alertCircle,
      time,
      volumeHigh,
      volumeOff,
      phonePortrait
    });

    // Load preferences
    const prefs = this.schedulerService.getPreferences();
    this.advanceMinutes = prefs.advanceMinutes;
    this.soundEnabled = prefs.soundEnabled;
    this.vibrationEnabled = prefs.vibrationEnabled;

    // Update scheduled count
    this.updateScheduledCount();
    setInterval(() => this.updateScheduledCount(), 5000);
  }

  private updateScheduledCount(): void {
    this.scheduledCount.set(this.schedulerService.getScheduledCount());
  }

  getPermissionIcon(): string {
    const state = this.permissionState();
    switch (state) {
      case 'granted':
        return 'checkmark-circle';
      case 'denied':
        return 'alert-circle';
      default:
        return 'alert-circle';
    }
  }

  getPermissionColor(): string {
    const state = this.permissionState();
    switch (state) {
      case 'granted':
        return 'success';
      case 'denied':
        return 'danger';
      default:
        return 'warning';
    }
  }

  getPermissionText(): string {
    const state = this.permissionState();
    switch (state) {
      case 'granted':
        return 'NOTIFICATIONS.PERMISSION_GRANTED';
      case 'denied':
        return 'NOTIFICATIONS.PERMISSION_DENIED';
      default:
        return 'NOTIFICATIONS.PERMISSION_DEFAULT';
    }
  }

  async requestPermission(): Promise<void> {
    const granted = await this.schedulerService.enable();
    
    if (granted) {
      const toast = await this.toastController.create({
        message: 'Notificações habilitadas com sucesso!',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      this.updateScheduledCount();
    } else {
      const toast = await this.toastController.create({
        message: 'Permissão de notificações negada',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async toggleNotifications(event: any): Promise<void> {
    const enabled = event.detail.checked;
    
    if (enabled) {
      const granted = await this.schedulerService.enable();
      if (granted) {
        this.updateScheduledCount();
      } else {
        // Revert toggle if permission denied
        event.target.checked = false;
      }
    } else {
      this.schedulerService.disable();
      this.scheduledCount.set(0);
    }
  }

  updateAdvanceTime(): void {
    this.schedulerService.updatePreferences({ advanceMinutes: this.advanceMinutes });
    this.updateScheduledCount();
  }

  updateSound(): void {
    this.schedulerService.updatePreferences({ soundEnabled: this.soundEnabled });
  }

  updateVibration(): void {
    this.schedulerService.updatePreferences({ vibrationEnabled: this.vibrationEnabled });
  }

  async testNotification(): Promise<void> {
    await this.schedulerService.sendTestNotification();
    
    const toast = await this.toastController.create({
      message: 'Notificação de teste enviada!',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }
}
