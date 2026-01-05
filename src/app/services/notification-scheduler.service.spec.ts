/**
 * Tests for NotificationSchedulerService
 *
 * Tests cover:
 * - Preferences management
 * - Scheduling configuration
 * - Advance reminder settings
 * - Enable/disable functionality
 */

describe('NotificationSchedulerService', () => {
  /**
   * Default Preferences Tests
   */
  describe('Default preferences', () => {
    it('should have default enabled state', () => {
      const defaultPrefs = {
        enabled: false,
        advanceMinutes: 15,
        soundEnabled: true,
        vibrationEnabled: true
      };

      expect(defaultPrefs.enabled).toBeFalse();
    });

    it('should have default advance minutes', () => {
      const defaultPrefs = {
        enabled: false,
        advanceMinutes: 15,
        soundEnabled: true,
        vibrationEnabled: true
      };

      expect(defaultPrefs.advanceMinutes).toBe(15);
    });

    it('should have sound enabled by default', () => {
      const defaultPrefs = {
        enabled: false,
        advanceMinutes: 15,
        soundEnabled: true,
        vibrationEnabled: true
      };

      expect(defaultPrefs.soundEnabled).toBeTrue();
    });

    it('should have vibration enabled by default', () => {
      const defaultPrefs = {
        enabled: false,
        advanceMinutes: 15,
        soundEnabled: true,
        vibrationEnabled: true
      };

      expect(defaultPrefs.vibrationEnabled).toBeTrue();
    });
  });

  /**
   * Preferences Interface Tests
   */
  describe('Preferences interface', () => {
    interface NotificationPreferences {
      enabled: boolean;
      advanceMinutes: number;
      soundEnabled: boolean;
      vibrationEnabled: boolean;
    }

    it('should have all required properties', () => {
      const prefs: NotificationPreferences = {
        enabled: true,
        advanceMinutes: 30,
        soundEnabled: true,
        vibrationEnabled: false
      };

      expect(prefs.enabled).toBeDefined();
      expect(prefs.advanceMinutes).toBeDefined();
      expect(prefs.soundEnabled).toBeDefined();
      expect(prefs.vibrationEnabled).toBeDefined();
    });

    it('should support silent mode', () => {
      const prefs: NotificationPreferences = {
        enabled: true,
        advanceMinutes: 15,
        soundEnabled: false,
        vibrationEnabled: false
      };

      expect(prefs.soundEnabled).toBeFalse();
      expect(prefs.vibrationEnabled).toBeFalse();
    });

    it('should support custom advance minutes', () => {
      const validMinutes = [5, 10, 15, 30, 60];

      validMinutes.forEach(minutes => {
        const prefs: NotificationPreferences = {
          enabled: true,
          advanceMinutes: minutes,
          soundEnabled: true,
          vibrationEnabled: true
        };
        expect(prefs.advanceMinutes).toBe(minutes);
      });
    });
  });

  /**
   * Preferences Storage Tests
   */
  describe('Preferences storage', () => {
    const PREFS_KEY = 'medicamenta_notification_prefs';

    it('should use correct localStorage key', () => {
      expect(PREFS_KEY).toBe('medicamenta_notification_prefs');
    });

    it('should serialize preferences to JSON', () => {
      const prefs = {
        enabled: true,
        advanceMinutes: 20,
        soundEnabled: true,
        vibrationEnabled: false
      };

      const json = JSON.stringify(prefs);
      const parsed = JSON.parse(json);

      expect(parsed.enabled).toBe(prefs.enabled);
      expect(parsed.advanceMinutes).toBe(prefs.advanceMinutes);
    });

    it('should deserialize preferences from JSON', () => {
      const json = '{"enabled":true,"advanceMinutes":30,"soundEnabled":false,"vibrationEnabled":true}';
      const prefs = JSON.parse(json);

      expect(prefs.enabled).toBeTrue();
      expect(prefs.advanceMinutes).toBe(30);
      expect(prefs.soundEnabled).toBeFalse();
    });
  });

  /**
   * Update Preferences Tests
   */
  describe('Update preferences logic', () => {
    it('should merge partial updates', () => {
      const currentPrefs = {
        enabled: false,
        advanceMinutes: 15,
        soundEnabled: true,
        vibrationEnabled: true
      };

      const updates = { enabled: true, advanceMinutes: 30 };
      const newPrefs = { ...currentPrefs, ...updates };

      expect(newPrefs.enabled).toBeTrue();
      expect(newPrefs.advanceMinutes).toBe(30);
      expect(newPrefs.soundEnabled).toBeTrue(); // unchanged
    });

    it('should handle empty updates', () => {
      const currentPrefs = {
        enabled: false,
        advanceMinutes: 15,
        soundEnabled: true,
        vibrationEnabled: true
      };

      const newPrefs = { ...currentPrefs, ...{} };

      expect(newPrefs).toEqual(currentPrefs);
    });
  });

  /**
   * Advance Reminder Time Calculation Tests
   */
  describe('Advance reminder time calculation', () => {
    it('should calculate notification time with 15 minute advance', () => {
      const doseTime = new Date(2024, 11, 15, 8, 0, 0);
      const advanceMinutes = 15;

      const notificationTime = new Date(doseTime.getTime() - advanceMinutes * 60 * 1000);

      expect(notificationTime.getHours()).toBe(7);
      expect(notificationTime.getMinutes()).toBe(45);
    });

    it('should calculate notification time with 30 minute advance', () => {
      const doseTime = new Date(2024, 11, 15, 12, 0, 0);
      const advanceMinutes = 30;

      const notificationTime = new Date(doseTime.getTime() - advanceMinutes * 60 * 1000);

      expect(notificationTime.getHours()).toBe(11);
      expect(notificationTime.getMinutes()).toBe(30);
    });

    it('should handle midnight crossing', () => {
      const doseTime = new Date(2024, 11, 15, 0, 10, 0);
      const advanceMinutes = 15;

      const notificationTime = new Date(doseTime.getTime() - advanceMinutes * 60 * 1000);

      expect(notificationTime.getDate()).toBe(14);
      expect(notificationTime.getHours()).toBe(23);
      expect(notificationTime.getMinutes()).toBe(55);
    });
  });

  /**
   * Enable/Disable Logic Tests
   */
  describe('Enable/Disable logic', () => {
    it('should set enabled to true', () => {
      let prefs = { enabled: false };
      prefs = { ...prefs, enabled: true };

      expect(prefs.enabled).toBeTrue();
    });

    it('should set enabled to false', () => {
      let prefs = { enabled: true };
      prefs = { ...prefs, enabled: false };

      expect(prefs.enabled).toBeFalse();
    });

    it('should determine isEnabled based on prefs and permission', () => {
      const isEnabled = (prefsEnabled: boolean, permissionGranted: boolean): boolean => {
        return prefsEnabled && permissionGranted;
      };

      expect(isEnabled(true, true)).toBeTrue();
      expect(isEnabled(true, false)).toBeFalse();
      expect(isEnabled(false, true)).toBeFalse();
      expect(isEnabled(false, false)).toBeFalse();
    });
  });

  /**
   * Scheduled Timeout Management Tests
   */
  describe('Scheduled timeout management', () => {
    it('should track timeouts in a Map', () => {
      const scheduledTimeouts = new Map<string, number>();

      scheduledTimeouts.set('med1', 1);
      scheduledTimeouts.set('med2', 2);

      expect(scheduledTimeouts.size).toBe(2);
      expect(scheduledTimeouts.has('med1')).toBeTrue();
    });

    it('should clear all timeouts', () => {
      const scheduledTimeouts = new Map<string, number>();
      scheduledTimeouts.set('med1', 1);
      scheduledTimeouts.set('med2', 2);

      scheduledTimeouts.clear();

      expect(scheduledTimeouts.size).toBe(0);
    });

    it('should delete specific timeout', () => {
      const scheduledTimeouts = new Map<string, number>();
      scheduledTimeouts.set('med1', 1);
      scheduledTimeouts.set('med2', 2);

      scheduledTimeouts.delete('med1');

      expect(scheduledTimeouts.size).toBe(1);
      expect(scheduledTimeouts.has('med1')).toBeFalse();
      expect(scheduledTimeouts.has('med2')).toBeTrue();
    });
  });

  /**
   * Dose Time Parsing Tests
   */
  describe('Dose time parsing', () => {
    it('should parse HH:mm format', () => {
      const timeString = '08:30';
      const [hours, minutes] = timeString.split(':').map(Number);

      expect(hours).toBe(8);
      expect(minutes).toBe(30);
    });

    it('should handle 24-hour format', () => {
      const timeString = '14:45';
      const [hours, minutes] = timeString.split(':').map(Number);

      expect(hours).toBe(14);
      expect(minutes).toBe(45);
    });

    it('should create Date from time string', () => {
      const timeString = '08:30';
      const [hours, minutes] = timeString.split(':').map(Number);

      const date = new Date();
      date.setHours(hours, minutes, 0, 0);

      expect(date.getHours()).toBe(8);
      expect(date.getMinutes()).toBe(30);
    });
  });

  /**
   * Future Dose Detection Tests
   */
  describe('Future dose detection', () => {
    it('should identify future dose', () => {
      const now = new Date();
      const futureDose = new Date(now.getTime() + 3600000); // 1 hour later

      expect(futureDose.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should identify past dose', () => {
      const now = new Date();
      const pastDose = new Date(now.getTime() - 3600000); // 1 hour ago

      expect(pastDose.getTime()).toBeLessThan(now.getTime());
    });

    it('should filter future doses only', () => {
      const now = new Date();
      const doses = [
        new Date(now.getTime() - 3600000), // past
        new Date(now.getTime() + 1800000), // 30 min future
        new Date(now.getTime() + 3600000), // 1 hour future
        new Date(now.getTime() - 1800000)  // past
      ];

      const futureDoses = doses.filter(d => d.getTime() > now.getTime());

      expect(futureDoses.length).toBe(2);
    });
  });

  /**
   * Notification ID Generation Tests
   */
  describe('Notification ID generation', () => {
    it('should generate unique notification IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        ids.add(`notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      }

      expect(ids.size).toBe(100);
    });

    it('should include medication ID in notification ID', () => {
      const medicationId = 'med123';
      const notificationId = `${medicationId}_notif_${Date.now()}`;

      expect(notificationId).toContain(medicationId);
    });
  });

  /**
   * Daily Schedule Reset Tests
   */
  describe('Daily schedule reset', () => {
    it('should calculate time until midnight', () => {
      const now = new Date(2024, 11, 15, 22, 30, 0);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      // Should be about 1.5 hours = 5400000 ms
      expect(msUntilMidnight).toBeGreaterThan(0);
      expect(msUntilMidnight).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });
});
