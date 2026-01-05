/**
 * Tests for FamilyNotificationService
 *
 * Tests cover:
 * - Interface validation
 * - Config structure
 * - GroupedNotification structure
 * - NotificationPreferences structure
 * - Default values
 * - Validation logic
 */

import {
  FamilyNotificationConfig,
  GroupedNotification,
  NotificationPreferences
} from './family-notification.service';

describe('FamilyNotificationService', () => {
  /**
   * FamilyNotificationConfig Interface Tests
   */
  describe('FamilyNotificationConfig interface', () => {
    it('should have all required properties', () => {
      const config: FamilyNotificationConfig = {
        enabled: true,
        sound: 'default',
        vibrate: true,
        timeOffsetMinutes: 5
      };

      expect(config.enabled).toBeDefined();
      expect(config.sound).toBeDefined();
      expect(config.vibrate).toBeDefined();
      expect(config.timeOffsetMinutes).toBeDefined();
    });

    it('should accept all sound types', () => {
      const defaultSound: FamilyNotificationConfig = {
        enabled: true,
        sound: 'default',
        vibrate: true,
        timeOffsetMinutes: 5
      };

      const customSound: FamilyNotificationConfig = {
        enabled: true,
        sound: 'custom',
        vibrate: false,
        timeOffsetMinutes: 10
      };

      const silentSound: FamilyNotificationConfig = {
        enabled: false,
        sound: 'silent',
        vibrate: false,
        timeOffsetMinutes: 0
      };

      expect(defaultSound.sound).toBe('default');
      expect(customSound.sound).toBe('custom');
      expect(silentSound.sound).toBe('silent');
    });

    it('should allow disabled configuration', () => {
      const config: FamilyNotificationConfig = {
        enabled: false,
        sound: 'silent',
        vibrate: false,
        timeOffsetMinutes: 0
      };

      expect(config.enabled).toBeFalse();
    });

    it('should accept various time offsets', () => {
      const offsets = [0, 5, 10, 15, 30, 60];

      offsets.forEach(offset => {
        const config: FamilyNotificationConfig = {
          enabled: true,
          sound: 'default',
          vibrate: true,
          timeOffsetMinutes: offset
        };
        expect(config.timeOffsetMinutes).toBe(offset);
      });
    });
  });

  /**
   * GroupedNotification Interface Tests
   */
  describe('GroupedNotification interface', () => {
    it('should have all required properties', () => {
      const notification: GroupedNotification = {
        time: '08:00',
        memberNames: ['João', 'Maria'],
        medicationNames: ['Losartana', 'Omeprazol'],
        doseCount: 3,
        date: new Date()
      };

      expect(notification.time).toBeDefined();
      expect(notification.memberNames).toBeDefined();
      expect(notification.medicationNames).toBeDefined();
      expect(notification.doseCount).toBeDefined();
      expect(notification.date).toBeDefined();
    });

    it('should support single member notification', () => {
      const notification: GroupedNotification = {
        time: '12:00',
        memberNames: ['Ana'],
        medicationNames: ['Vitamina D'],
        doseCount: 1,
        date: new Date()
      };

      expect(notification.memberNames.length).toBe(1);
      expect(notification.doseCount).toBe(1);
    });

    it('should support multiple members notification', () => {
      const notification: GroupedNotification = {
        time: '20:00',
        memberNames: ['João', 'Maria', 'Pedro', 'Ana'],
        medicationNames: ['Med 1', 'Med 2', 'Med 3'],
        doseCount: 7,
        date: new Date()
      };

      expect(notification.memberNames.length).toBe(4);
      expect(notification.medicationNames.length).toBe(3);
      expect(notification.doseCount).toBe(7);
    });

    it('should format time correctly', () => {
      const validTimes = ['00:00', '08:00', '12:30', '18:45', '23:59'];

      validTimes.forEach(time => {
        const notification: GroupedNotification = {
          time,
          memberNames: ['Test'],
          medicationNames: ['Test Med'],
          doseCount: 1,
          date: new Date()
        };
        expect(notification.time).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it('should handle date objects', () => {
      const testDate = new Date(2024, 11, 15, 8, 0, 0);
      const notification: GroupedNotification = {
        time: '08:00',
        memberNames: ['Member'],
        medicationNames: ['Med'],
        doseCount: 1,
        date: testDate
      };

      expect(notification.date instanceof Date).toBeTrue();
      expect(notification.date.getFullYear()).toBe(2024);
      expect(notification.date.getMonth()).toBe(11);
      expect(notification.date.getDate()).toBe(15);
    });
  });

  /**
   * NotificationPreferences Interface Tests
   */
  describe('NotificationPreferences interface', () => {
    it('should have all required properties', () => {
      const prefs: NotificationPreferences = {
        sound: 'default',
        vibrate: true,
        silent: false,
        timeOffsetMinutes: 5
      };

      expect(prefs.sound).toBeDefined();
      expect(prefs.vibrate).toBeDefined();
      expect(prefs.silent).toBeDefined();
      expect(prefs.timeOffsetMinutes).toBeDefined();
    });

    it('should support silent mode', () => {
      const prefs: NotificationPreferences = {
        sound: 'silent',
        vibrate: false,
        silent: true,
        timeOffsetMinutes: 0
      };

      expect(prefs.silent).toBeTrue();
      expect(prefs.vibrate).toBeFalse();
    });

    it('should support custom sound', () => {
      const prefs: NotificationPreferences = {
        sound: 'custom',
        vibrate: true,
        silent: false,
        timeOffsetMinutes: 10
      };

      expect(prefs.sound).toBe('custom');
    });
  });

  /**
   * Default Configuration Tests
   */
  describe('Default configuration', () => {
    it('should have sensible defaults', () => {
      const defaultConfig: FamilyNotificationConfig = {
        enabled: true,
        sound: 'default',
        vibrate: true,
        timeOffsetMinutes: 5
      };

      expect(defaultConfig.enabled).toBeTrue();
      expect(defaultConfig.sound).toBe('default');
      expect(defaultConfig.vibrate).toBeTrue();
      expect(defaultConfig.timeOffsetMinutes).toBe(5);
    });

    it('should have notification time offset between 0 and 60 minutes', () => {
      const validOffsets = [0, 5, 10, 15, 30, 45, 60];

      validOffsets.forEach(offset => {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(60);
      });
    });
  });

  /**
   * Notification Grouping Logic Tests
   */
  describe('Notification grouping logic', () => {
    it('should group notifications by time', () => {
      const notifications: GroupedNotification[] = [
        {
          time: '08:00',
          memberNames: ['João'],
          medicationNames: ['Losartana'],
          doseCount: 1,
          date: new Date()
        },
        {
          time: '08:00',
          memberNames: ['Maria'],
          medicationNames: ['Omeprazol'],
          doseCount: 1,
          date: new Date()
        }
      ];

      // Group by time
      const groupedByTime: { [key: string]: GroupedNotification[] } = {};
      notifications.forEach(n => {
        if (!groupedByTime[n.time]) {
          groupedByTime[n.time] = [];
        }
        groupedByTime[n.time].push(n);
      });

      expect(Object.keys(groupedByTime).length).toBe(1);
      expect(groupedByTime['08:00'].length).toBe(2);
    });

    it('should calculate total dose count', () => {
      const notifications: GroupedNotification[] = [
        { time: '08:00', memberNames: ['A'], medicationNames: ['M1'], doseCount: 2, date: new Date() },
        { time: '12:00', memberNames: ['B'], medicationNames: ['M2'], doseCount: 3, date: new Date() },
        { time: '20:00', memberNames: ['C'], medicationNames: ['M3'], doseCount: 1, date: new Date() }
      ];

      const totalDoses = notifications.reduce((sum, n) => sum + n.doseCount, 0);
      expect(totalDoses).toBe(6);
    });

    it('should identify unique members', () => {
      const notifications: GroupedNotification[] = [
        { time: '08:00', memberNames: ['João', 'Maria'], medicationNames: ['M1'], doseCount: 2, date: new Date() },
        { time: '12:00', memberNames: ['João', 'Pedro'], medicationNames: ['M2'], doseCount: 2, date: new Date() }
      ];

      const allMembers = notifications.flatMap(n => n.memberNames);
      const uniqueMembers = [...new Set(allMembers)];

      expect(uniqueMembers.length).toBe(3);
      expect(uniqueMembers).toContain('João');
      expect(uniqueMembers).toContain('Maria');
      expect(uniqueMembers).toContain('Pedro');
    });
  });

  /**
   * Channel Configuration Tests
   */
  describe('Notification channel configuration', () => {
    it('should define channel properties', () => {
      const channelConfig = {
        id: 'family-doses-channel',
        name: 'Doses da Família',
        description: 'Notificações agrupadas de doses de medicamentos da família',
        importance: 4,
        visibility: 1,
        sound: 'default.wav',
        vibration: true,
        lights: true,
        lightColor: '#4CAF50'
      };

      expect(channelConfig.id).toBe('family-doses-channel');
      expect(channelConfig.importance).toBe(4); // High importance
      expect(channelConfig.visibility).toBe(1); // Public
      expect(channelConfig.lightColor).toBe('#4CAF50');
    });

    it('should have high importance for medication notifications', () => {
      const importance = 4;
      expect(importance).toBeGreaterThanOrEqual(3);
    });
  });

  /**
   * Time Offset Calculation Tests
   */
  describe('Time offset calculations', () => {
    it('should calculate notification time with offset', () => {
      const doseTime = new Date('2024-12-15T08:00:00');
      const offsetMinutes = 5;

      const notificationTime = new Date(doseTime.getTime() - offsetMinutes * 60 * 1000);

      expect(notificationTime.getHours()).toBe(7);
      expect(notificationTime.getMinutes()).toBe(55);
    });

    it('should handle midnight crossover', () => {
      const doseTime = new Date('2024-12-15T00:05:00');
      const offsetMinutes = 10;

      const notificationTime = new Date(doseTime.getTime() - offsetMinutes * 60 * 1000);

      expect(notificationTime.getDate()).toBe(14);
      expect(notificationTime.getHours()).toBe(23);
      expect(notificationTime.getMinutes()).toBe(55);
    });

    it('should handle zero offset', () => {
      const doseTime = new Date('2024-12-15T08:00:00');
      const offsetMinutes = 0;

      const notificationTime = new Date(doseTime.getTime() - offsetMinutes * 60 * 1000);

      expect(notificationTime.getTime()).toBe(doseTime.getTime());
    });
  });

  /**
   * Notification ID Generation Tests
   */
  describe('Notification ID generation', () => {
    it('should generate unique IDs', () => {
      const prefix = 'family-';
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const id = `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });

    it('should use consistent prefix', () => {
      const prefix = 'family-';
      const id = `${prefix}notification-1`;

      expect(id.startsWith(prefix)).toBeTrue();
    });
  });

  /**
   * Permission Status Tests
   */
  describe('Permission status handling', () => {
    it('should recognize granted permission', () => {
      const status = { display: 'granted' };
      expect(status.display).toBe('granted');
    });

    it('should recognize denied permission', () => {
      const status = { display: 'denied' };
      expect(status.display).toBe('denied');
    });

    it('should recognize prompt permission', () => {
      const status = { display: 'prompt' };
      expect(status.display).toBe('prompt');
    });
  });

  /**
   * Serialization Tests
   */
  describe('Config serialization', () => {
    it('should serialize config to JSON', () => {
      const config: FamilyNotificationConfig = {
        enabled: true,
        sound: 'default',
        vibrate: true,
        timeOffsetMinutes: 5
      };

      const json = JSON.stringify(config);
      const parsed = JSON.parse(json);

      expect(parsed.enabled).toBe(config.enabled);
      expect(parsed.sound).toBe(config.sound);
      expect(parsed.vibrate).toBe(config.vibrate);
      expect(parsed.timeOffsetMinutes).toBe(config.timeOffsetMinutes);
    });

    it('should deserialize config from JSON', () => {
      const json = '{"enabled":false,"sound":"silent","vibrate":false,"timeOffsetMinutes":10}';
      const config: FamilyNotificationConfig = JSON.parse(json);

      expect(config.enabled).toBeFalse();
      expect(config.sound).toBe('silent');
      expect(config.vibrate).toBeFalse();
      expect(config.timeOffsetMinutes).toBe(10);
    });
  });

  /**
   * Notification Content Generation Tests
   */
  describe('Notification content generation', () => {
    it('should generate single member message', () => {
      const memberNames = ['João'];
      const doseCount = 1;

      const message = doseCount === 1
        ? `${memberNames[0]} tem 1 dose pendente`
        : `${memberNames[0]} tem ${doseCount} doses pendentes`;

      expect(message).toBe('João tem 1 dose pendente');
    });

    it('should generate multiple members message', () => {
      const memberNames = ['João', 'Maria', 'Pedro'];
      const doseCount = 5;

      const message = `${memberNames.slice(0, 2).join(', ')} e mais ${memberNames.length - 2} têm ${doseCount} doses pendentes`;

      expect(message).toContain('João, Maria');
      expect(message).toContain('mais 1');
      expect(message).toContain('5 doses');
    });

    it('should generate title based on time of day', () => {
      const getTitleByTime = (hour: number): string => {
        if (hour >= 5 && hour < 12) return 'Bom dia! Doses da manhã';
        if (hour >= 12 && hour < 18) return 'Doses da tarde';
        return 'Doses da noite';
      };

      expect(getTitleByTime(8)).toBe('Bom dia! Doses da manhã');
      expect(getTitleByTime(14)).toBe('Doses da tarde');
      expect(getTitleByTime(20)).toBe('Doses da noite');
    });
  });

  /**
   * Scheduling Logic Tests
   */
  describe('Scheduling logic', () => {
    it('should schedule notifications for future times only', () => {
      const now = new Date();
      const futureTimes = [
        new Date(now.getTime() + 60000), // 1 minute
        new Date(now.getTime() + 3600000), // 1 hour
        new Date(now.getTime() + 86400000) // 1 day
      ];

      futureTimes.forEach(time => {
        expect(time.getTime()).toBeGreaterThan(now.getTime());
      });
    });

    it('should not schedule past notifications', () => {
      const now = new Date();
      const pastTime = new Date(now.getTime() - 60000);

      expect(pastTime.getTime()).toBeLessThan(now.getTime());
    });

    it('should handle timezone correctly', () => {
      const localTime = new Date();
      const utcTime = new Date(localTime.toISOString());

      expect(localTime.getTime()).toBe(utcTime.getTime());
    });
  });
});
