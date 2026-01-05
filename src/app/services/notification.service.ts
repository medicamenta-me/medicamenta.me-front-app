import { Injectable, signal, computed, inject } from '@angular/core';
import { LogService } from './log.service';

/**
 * Service responsible for managing browser push notifications.
 * 
 * Features:
 * - Request notification permissions
 * - Send local notifications
 * - Check notification support
 * - Track permission state
 * 
 * Note: This service handles browser-based notifications (PWA).
 * Does not require Firebase Cloud Messaging or backend.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly logService = inject(LogService);
  
  // Signal to track notification permission state
  private readonly _permissionState = signal<NotificationPermission>('default');
  public readonly permissionState = this._permissionState.asReadonly();

  // Computed signals
  public readonly isPermissionGranted = computed(() => this._permissionState() === 'granted');
  public readonly isPermissionDenied = computed(() => this._permissionState() === 'denied');
  public readonly canRequestPermission = computed(() => this._permissionState() === 'default');

  // Check if notifications are supported
  public readonly isSupported = 'Notification' in globalThis;

  constructor() {
    this.initializePermissionState();
  }

  /**
   * Initialize permission state from browser
   */
  private initializePermissionState(): void {
    if (this.isSupported) {
      this._permissionState.set(Notification.permission);
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      this.logService.warn('NotificationService', 'Notifications are not supported in this browser');
      return 'denied';
    }

    if (this._permissionState() === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this._permissionState.set(permission);
      
      if (permission === 'granted') {
        this.logService.info('NotificationService', 'Notification permission granted');
      } else if (permission === 'denied') {
        this.logService.info('NotificationService', 'Notification permission denied');
      }
      
      return permission;
    } catch (error: any) {
      this.logService.error('NotificationService', 'Error requesting notification permission', error as Error);
      return 'denied';
    }
  }

  /**
   * Send a local notification
   * @param title Notification title
   * @param options Notification options
   */
  async sendNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported) {
      this.logService.warn('NotificationService', 'Notifications are not supported');
      return;
    }

    if (this._permissionState() !== 'granted') {
      this.logService.warn('NotificationService', 'Notification permission not granted');
      return;
    }

    try {
      // Check if we're in a Service Worker context
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Use Service Worker to show notification (better for PWA)
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          icon: '/assets/icon/icon-192x192.png',
          badge: '/assets/icon/icon-72x72.png',
          tag: 'medication-reminder',
          requireInteraction: false,
          ...options
        } as any);
      } else {
        // Fallback to browser notification
        new Notification(title, {
          icon: '/assets/icon/icon-192x192.png',
          tag: 'medication-reminder',
          requireInteraction: false,
          ...options
        });
      }
      
      this.logService.info('NotificationService', 'Notification sent', { title });
    } catch (error: any) {
      this.logService.error('NotificationService', 'Error sending notification', error as Error);
    }
  }

  /**
   * Send a medication reminder notification
   */
  async sendMedicationReminder(
    medicationName: string, 
    dosage: string, 
    time: string,
    medicationId?: string
  ): Promise<void> {
    await this.sendNotification(
      `💊 Lembrete de Medicação`,
      {
        body: `Hora de tomar: ${medicationName} (${dosage})\nHorário: ${time}`,
        icon: '/assets/icon/icon-192x192.png',
        badge: '/assets/icon/icon-72x72.png',
        tag: medicationId || 'medication-reminder',
        data: {
          type: 'medication-reminder',
          medicationId,
          medicationName,
          dosage,
          time
        }
      } as any
    );
  }

  /**
   * Send a low stock alert notification
   */
  async sendLowStockAlert(medicationName: string, currentStock: number, unit: string): Promise<void> {
    await this.sendNotification(
      `⚠️ Estoque Baixo`,
      {
        body: `${medicationName} está com estoque baixo: ${currentStock} ${unit}`,
        icon: '/assets/icon/icon-192x192.png',
        badge: '/assets/icon/icon-72x72.png',
        tag: 'low-stock-alert',
        data: {
          type: 'low-stock-alert',
          medicationName,
          currentStock,
          unit
        }
      }
    );
  }

  /**
   * Send a critical stock alert notification
   */
  async sendCriticalStockAlert(medicationName: string): Promise<void> {
    await this.sendNotification(
      `🚨 Estoque Crítico`,
      {
        body: `${medicationName} está sem estoque! Reabasteça urgentemente.`,
        icon: '/assets/icon/icon-192x192.png',
        badge: '/assets/icon/icon-72x72.png',
        tag: 'critical-stock-alert',
        requireInteraction: true,
        data: {
          type: 'critical-stock-alert',
          medicationName
        }
      }
    );
  }

  /**
   * Send treatment completion congratulation
   */
  async sendCompletionCongratulation(medicationName: string): Promise<void> {
    await this.sendNotification(
      `🎉 Parabéns!`,
      {
        body: `Você concluiu o tratamento de ${medicationName}!`,
        icon: '/assets/icon/icon-192x192.png',
        badge: '/assets/icon/icon-72x72.png',
        tag: 'treatment-completion',
        data: {
          type: 'treatment-completion',
          medicationName
        }
      }
    );
  }

  /**
   * Test notification (useful for settings page)
   */
  async sendTestNotification(): Promise<void> {
    await this.sendNotification(
      '✅ Notificações Funcionando!',
      {
        body: 'Você receberá lembretes de medicação neste formato.',
        icon: '/assets/icon/icon-192x192.png',
        badge: '/assets/icon/icon-72x72.png',
        tag: 'test-notification'
      }
    );
  }

  /**
   * Clear all pending notifications
   */
  async clearAllNotifications(): Promise<void> {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const notifications = await registration.getNotifications();
      for (const notification of notifications) {
        notification.close();
      }
      this.logService.info('NotificationService', 'Cleared notifications', { count: notifications.length });
    }
  }

  /**
   * Get permission state as string for UI
   */
  getPermissionStateText(): string {
    const state = this._permissionState();
    switch (state) {
      case 'granted':
        return 'Habilitadas';
      case 'denied':
        return 'Bloqueadas';
      case 'default':
        return 'Não Configuradas';
      default:
        return 'Desconhecido';
    }
  }

  /**
   * Show a local notification with structured data
   * @param options Notification options with title, body, and data
   */
  async showLocalNotification(options: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
    icon?: string;
    badge?: string;
    tag?: string;
  }): Promise<void> {
    await this.sendNotification(options.title, {
      body: options.body,
      icon: options.icon || '/assets/icon/icon-192x192.png',
      badge: options.badge || '/assets/icon/icon-72x72.png',
      tag: options.tag || 'general-notification',
      data: options.data,
    } as NotificationOptions);
  }
}

