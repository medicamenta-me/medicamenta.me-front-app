import { Injectable, inject, effect } from '@angular/core';
import { NotificationService } from './notification.service';
import { MedicationService } from './medication.service';
import { PatientSelectorService } from './patient-selector.service';
import { Medication, Dose } from '../models/medication.model';
import { LogService } from './log.service';

/**
 * Service responsible for scheduling medication reminder notifications.
 * 
 * Features:
 * - Schedule notifications for upcoming doses
 * - Reschedule when medications change
 * - Handle advance reminders (5min, 15min, 30min before)
 * - Daily check at midnight for next day's schedule
 * - Store scheduled notification IDs in localStorage
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationSchedulerService {
  private readonly notificationService = inject(NotificationService);
  private readonly medicationService = inject(MedicationService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly logService = inject(LogService);

  // Map to track scheduled timeouts
  private readonly scheduledTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  // LocalStorage key for notification preferences
  private readonly PREFS_KEY = 'medicamenta_notification_prefs';

  // Default preferences
  private preferences = {
    enabled: false,
    advanceMinutes: 15, // Remind X minutes before dose time
    soundEnabled: true,
    vibrationEnabled: true
  };

  constructor() {
    this.loadPreferences();
    
    // Auto-reschedule when medications change
    effect(() => {
      const medications = this.medicationService.medications();
      const isEnabled = this.preferences.enabled;
      const isGranted = this.notificationService.isPermissionGranted();
      
      if (isEnabled && isGranted && medications.length > 0) {
        this.rescheduleAll();
      }
    });
  }

  /**
   * Load notification preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(this.PREFS_KEY);
      if (stored) {
        this.preferences = { ...this.preferences, ...JSON.parse(stored) };
      }
    } catch (error: any) {
      this.logService.error('NotificationSchedulerService', 'Error loading notification preferences', error as Error);
    }
  }

  /**
   * Save notification preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(this.PREFS_KEY, JSON.stringify(this.preferences));
    } catch (error: any) {
      this.logService.error('NotificationSchedulerService', 'Error saving notification preferences', error as Error);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  updatePreferences(newPrefs: Partial<typeof this.preferences>): void {
    this.preferences = { ...this.preferences, ...newPrefs };
    this.savePreferences();
    
    // Reschedule if enabled state changed
    if (newPrefs.enabled !== undefined) {
      if (newPrefs.enabled) {
        this.rescheduleAll();
      } else {
        this.cancelAll();
      }
    }
  }

  /**
   * Enable notifications
   */
  async enable(): Promise<boolean> {
    // Request permission if not granted
    const permission = await this.notificationService.requestPermission();
    
    if (permission === 'granted') {
      this.updatePreferences({ enabled: true });
      this.rescheduleAll();
      return true;
    }
    
    return false;
  }

  /**
   * Disable notifications
   */
  disable(): void {
    this.updatePreferences({ enabled: false });
    this.cancelAll();
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.preferences.enabled && this.notificationService.isPermissionGranted();
  }

  /**
   * Cancel all scheduled notifications
   */
  private cancelAll(): void {
    for (const [, timeoutId] of this.scheduledTimeouts) {
      clearTimeout(timeoutId);
    }
    this.scheduledTimeouts.clear();
    this.logService.info('NotificationSchedulerService', 'All scheduled notifications cancelled');
  }

  /**
   * Reschedule all notifications
   */
  private rescheduleAll(): void {
    this.cancelAll();
    
    const medications = this.medicationService.medications();
    
    for (const medication of medications) {
      if (!medication.isArchived && !medication.isCompleted) {
        this.scheduleMedicationNotifications(medication);
      }
    }
    
    this.logService.info('NotificationSchedulerService', 'Scheduled notifications', { count: medications.length });
  }

  /**
   * Schedule notifications for a specific medication
   */
  private scheduleMedicationNotifications(medication: Medication): void {
    if (!medication.schedule || medication.schedule.length === 0) {
      return;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    for (const dose of medication.schedule) {
      // Only schedule for upcoming doses today
      if (dose.status === 'upcoming') {
        this.scheduleDoseNotification(medication, dose, today);
      }
      
      // Always schedule for tomorrow (midnight reschedule will handle)
      this.scheduleDoseNotification(medication, dose, tomorrow);
    }
  }

  /**
   * Schedule notification for a specific dose
   */
  private scheduleDoseNotification(medication: Medication, dose: Dose, date: Date): void {
    const [hours, minutes] = dose.time.split(':').map(Number);
    
    const doseTime = new Date(date);
    doseTime.setHours(hours, minutes, 0, 0);
    
    // Calculate notification time (X minutes before dose)
    const notificationTime = new Date(doseTime.getTime() - this.preferences.advanceMinutes * 60 * 1000);
    
    const now = new Date();
    const delay = notificationTime.getTime() - now.getTime();
    
    // Only schedule if in the future
    if (delay > 0) {
      const key = `${medication.id}-${dose.time}-${date.toDateString()}`;
      
      const timeoutId = globalThis.setTimeout(() => {
        this.sendDoseReminder(medication, dose);
        this.scheduledTimeouts.delete(key);
      }, delay);
      
      this.scheduledTimeouts.set(key, timeoutId);
      
      this.logService.debug('NotificationSchedulerService', 'Scheduled notification', { 
        medicationName: medication.name, 
        time: notificationTime.toLocaleString() 
      });
    }
  }

  /**
   * Send dose reminder notification
   */
  private async sendDoseReminder(medication: Medication, dose: Dose): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    await this.notificationService.sendMedicationReminder(
      medication.name,
      medication.dosage,
      dose.time,
      medication.id
    );
  }

  /**
   * Schedule a one-time notification for a specific time
   * Useful for snooze functionality
   */
  scheduleOneTimeNotification(
    medication: Medication,
    dose: Dose,
    delayMinutes: number
  ): void {
    const notificationTime = new Date(Date.now() + delayMinutes * 60 * 1000);
    const delay = notificationTime.getTime() - Date.now();
    
    const key = `snooze-${medication.id}-${Date.now()}`;
    
    const timeoutId = globalThis.setTimeout(() => {
      this.sendDoseReminder(medication, dose);
      this.scheduledTimeouts.delete(key);
    }, delay);
    
    this.scheduledTimeouts.set(key, timeoutId);
    
    this.logService.info('NotificationSchedulerService', 'Snoozed notification', { 
      medicationName: medication.name, 
      delayMinutes 
    });
  }

  /**
   * Get count of scheduled notifications
   */
  getScheduledCount(): number {
    return this.scheduledTimeouts.size;
  }

  /**
   * Setup daily midnight reschedule
   * This ensures notifications are always up-to-date
   */
  setupMidnightReschedule(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 30, 0); // 00:00:30
    
    const delay = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.logService.info('NotificationSchedulerService', 'Midnight reschedule triggered');
      this.rescheduleAll();
      
      // Setup next midnight reschedule (24 hours)
      setInterval(() => {
        this.logService.info('NotificationSchedulerService', 'Daily reschedule triggered');
        this.rescheduleAll();
      }, 24 * 60 * 60 * 1000);
    }, delay);
    
    this.logService.debug('NotificationSchedulerService', 'Midnight reschedule set', { 
      time: tomorrow.toLocaleString() 
    });
  }

  /**
   * Send test notification
   */
  async sendTestNotification(): Promise<void> {
    await this.notificationService.sendTestNotification();
  }
}

