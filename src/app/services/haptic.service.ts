import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LogService } from './log.service';

/**
 * Haptic Feedback Service
 * Provides vibration patterns for gamification events
 */
@Injectable({
  providedIn: 'root'
})
export class HapticService {
  private isEnabled = true;
  private readonly logService = new LogService();

  constructor() {
    // Load haptic preference from localStorage
    const savedEnabled = localStorage.getItem('haptics_enabled');
    this.isEnabled = savedEnabled !== 'false'; // Enabled by default
  }

  /**
   * Toggle haptics on/off
   */
  toggleHaptics(): void {
    this.isEnabled = !this.isEnabled;
    localStorage.setItem('haptics_enabled', this.isEnabled.toString());
  }

  /**
   * Get haptics status
   */
  isHapticsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Light impact (subtle feedback)
   * Usage: Button taps, selections
   */
  async light(): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error: any) {
      this.logService.warn('HapticService', 'Haptics not available', { error });
    }
  }

  /**
   * Medium impact (moderate feedback)
   * Usage: Achievement unlocked, notification
   */
  async medium(): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error: any) {
      this.logService.warn('HapticService', 'Haptics not available', { error });
    }
  }

  /**
   * Heavy impact (strong feedback)
   * Usage: Level up, major achievement
   */
  async heavy(): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error: any) {
      this.logService.warn('HapticService', 'Haptics not available', { error });
    }
  }

  /**
   * Success vibration pattern
   * Bronze tier achievement
   */
  async bronzeAchievement(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.light();
  }

  /**
   * Silver tier achievement
   * Two medium impacts
   */
  async silverAchievement(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.medium();
    setTimeout(async () => await this.medium(), 100);
  }

  /**
   * Gold tier achievement
   * Three strong impacts
   */
  async goldAchievement(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.heavy();
    setTimeout(async () => await this.medium(), 100);
    setTimeout(async () => await this.medium(), 200);
  }

  /**
   * Platinum tier achievement
   * Complex celebration pattern
   */
  async platinumAchievement(): Promise<void> {
    if (!this.isEnabled) return;
    
    // Heavy-Medium-Medium-Heavy pattern
    await this.heavy();
    setTimeout(async () => await this.medium(), 100);
    setTimeout(async () => await this.medium(), 200);
    setTimeout(async () => await this.heavy(), 350);
  }

  /**
   * Level up vibration
   * Ascending pattern
   */
  async levelUp(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.light();
    setTimeout(async () => await this.medium(), 80);
    setTimeout(async () => await this.heavy(), 160);
  }

  /**
   * Streak milestone
   * Quick burst pattern
   */
  async streakMilestone(): Promise<void> {
    if (!this.isEnabled) return;
    
    for (let i = 0; i < 3; i++) {
      setTimeout(async () => await this.light(), i * 50);
    }
  }

  /**
   * Notification vibration
   * Single medium impact
   */
  async notification(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.medium();
  }

  /**
   * Selection feedback
   * Very light impact
   */
  async selection(): Promise<void> {
    if (!this.isEnabled) return;
    
    try {
      await Haptics.selectionStart();
      setTimeout(async () => await Haptics.selectionEnd(), 50);
    } catch (error: any) {
      this.logService.warn('HapticService', 'Selection haptics not available', { error });
    }
  }

  /**
   * Warning/Error vibration
   * Double heavy impact
   */
  async warning(): Promise<void> {
    if (!this.isEnabled) return;
    
    await this.heavy();
    setTimeout(async () => await this.heavy(), 150);
  }
}

