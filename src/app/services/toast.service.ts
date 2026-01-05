import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

export interface ToastOptions {
  message: string;
  duration?: number;
  color?: 'success' | 'danger' | 'warning' | 'primary' | 'secondary' | 'tertiary' | 'light' | 'medium' | 'dark';
  position?: 'top' | 'bottom' | 'middle';
  icon?: string;
  buttons?: any[];
}

/**
 * Toast Service
 * 
 * Provides convenient methods for displaying toast notifications
 * throughout the application. Supports translations and various styles.
 */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  /**
   * Show a success toast
   */
  async showSuccess(messageKey: string, params?: any): Promise<void> {
    const message = this.translate.instant(messageKey, params);
    await this.show({
      message,
      color: 'success',
      duration: 3000,
      icon: 'checkmark-circle'
    }, 'success');
  }

  /**
   * Show an error toast
   */
  async showError(messageKey: string, params?: any): Promise<void> {
    const message = params !== undefined 
      ? this.translate.instant(messageKey, params)
      : this.translate.instant(messageKey);
    await this.show({
      message,
      color: 'danger',
      duration: 5000,
      icon: 'close-circle'
    }, 'error');
  }

  /**
   * Show a warning toast
   */
  async showWarning(messageKey: string, params?: any): Promise<void> {
    const message = params !== undefined 
      ? this.translate.instant(messageKey, params)
      : this.translate.instant(messageKey);
    await this.show({
      message,
      color: 'warning',
      duration: 4000,
      icon: 'warning'
    }, 'warning');
  }

  /**
   * Show an info toast
   */
  async showInfo(messageKey: string, params?: any): Promise<void> {
    const message = this.translate.instant(messageKey, params);
    await this.show({
      message,
      color: 'primary',
      duration: 3000,
      icon: 'information-circle'
    }, 'info');
  }

  /**
   * Show sync complete toast
   */
  async showSyncComplete(successCount: number, failedCount: number): Promise<void> {
    if (failedCount > 0) {
      await this.showWarning('OFFLINE.TOAST.SYNC_PARTIAL', { 
        success: successCount, 
        failed: failedCount 
      });
    } else {
      await this.showSuccess('OFFLINE.TOAST.SYNC_SUCCESS', { 
        count: successCount 
      });
    }
  }

  /**
   * Show sync error toast
   */
  async showSyncError(): Promise<void> {
    await this.showError('OFFLINE.TOAST.SYNC_ERROR');
  }

  /**
   * Show offline notification
   */
  async showOffline(): Promise<void> {
    await this.showWarning('OFFLINE.TOAST.OFFLINE');
  }

  /**
   * Show online notification
   */
  async showOnline(): Promise<void> {
    await this.showSuccess('OFFLINE.TOAST.ONLINE');
  }

  /**
   * Show conflict notification
   */
  async showConflict(count: number): Promise<void> {
    await this.showWarning('OFFLINE.TOAST.CONFLICTS', { count });
  }

  /**
   * Show generic toast with custom options
   */
  async show(options: ToastOptions, type?: 'success' | 'error' | 'info' | 'warning'): Promise<void> {
    // Determine cssClass based on type for Cypress testing
    let cssClass = 'custom-toast';
    if (type) {
      cssClass = `${type}-toast`;
    } else if (options.color === 'success') {
      cssClass = 'success-toast';
    } else if (options.color === 'danger') {
      cssClass = 'error-toast';
    } else if (options.color === 'warning') {
      cssClass = 'warning-toast';
    } else if (options.color === 'primary') {
      cssClass = 'info-toast';
    }

    const toast = await this.toastController.create({
      message: options.message,
      duration: options.duration ?? 3000,
      color: options.color || 'dark',
      position: options.position || 'bottom',
      icon: options.icon,
      buttons: options.buttons || [
        {
          text: 'OK',
          role: 'cancel'
        }
      ],
      cssClass
    });

    await toast.present();
  }

  /**
   * Alias methods for direct usage (Cypress compatibility)
   */
  async success(message: string, duration = 3000): Promise<void> {
    await this.show({
      message,
      color: 'success',
      duration,
      icon: 'checkmark-circle'
    }, 'success');
  }

  async error(message: string, duration = 4000): Promise<void> {
    await this.show({
      message,
      color: 'danger',
      duration,
      icon: 'close-circle'
    }, 'error');
  }

  async info(message: string, duration = 3000): Promise<void> {
    await this.show({
      message,
      color: 'primary',
      duration,
      icon: 'information-circle'
    }, 'info');
  }

  async warning(message: string, duration = 3500): Promise<void> {
    await this.show({
      message,
      color: 'warning',
      duration,
      icon: 'warning'
    }, 'warning');
  }

  /**
   * Dismiss all open toasts
   */
  async dismissAll(): Promise<void> {
    const toasts = await this.toastController.getTop();
    if (toasts) {
      await this.toastController.dismiss();
    }
  }
}

