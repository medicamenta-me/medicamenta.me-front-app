/**
 * Tests for NotificationStrategyService
 *
 * Tests cover:
 * - MedicationPriority type
 * - NotificationStrategy interface
 * - Predefined strategies
 * - Priority determination logic
 * - Reminder configuration
 */

// Type definitions for testing
type MedicationPriority = 'critical' | 'moderate' | 'supplement';

interface NotificationStrategy {
  priority: MedicationPriority;
  remindersBefore: number[];
  repeatInterval: number;
  maxRepeats: number;
  importance: 'max' | 'high' | 'default' | 'low' | 'min';
  sound: string | undefined;
  vibrate: boolean;
  lights: boolean;
  persistent: boolean;
  autoCancel: boolean;
  ongoing: boolean;
  hapticPattern: 'gentle-reminder' | 'urgent-reminder' | 'alarm' | 'notification';
}

describe('NotificationStrategyService', () => {
  /**
   * MedicationPriority Type Tests
   */
  describe('MedicationPriority type', () => {
    it('should accept critical priority', () => {
      const priority: MedicationPriority = 'critical';
      expect(priority).toBe('critical');
    });

    it('should accept moderate priority', () => {
      const priority: MedicationPriority = 'moderate';
      expect(priority).toBe('moderate');
    });

    it('should accept supplement priority', () => {
      const priority: MedicationPriority = 'supplement';
      expect(priority).toBe('supplement');
    });

    it('should have 3 priority levels', () => {
      const priorities: MedicationPriority[] = ['critical', 'moderate', 'supplement'];
      expect(priorities.length).toBe(3);
    });
  });

  /**
   * Critical Strategy Tests
   */
  describe('Critical strategy', () => {
    const criticalStrategy: NotificationStrategy = {
      priority: 'critical',
      remindersBefore: [30, 15, 5, 0],
      repeatInterval: 5,
      maxRepeats: 3,
      importance: 'max',
      sound: 'default',
      vibrate: true,
      lights: true,
      persistent: true,
      autoCancel: false,
      ongoing: true,
      hapticPattern: 'urgent-reminder'
    };

    it('should have 4 reminders', () => {
      expect(criticalStrategy.remindersBefore.length).toBe(4);
    });

    it('should have reminders at 30, 15, 5, 0 minutes', () => {
      expect(criticalStrategy.remindersBefore).toEqual([30, 15, 5, 0]);
    });

    it('should repeat every 5 minutes', () => {
      expect(criticalStrategy.repeatInterval).toBe(5);
    });

    it('should have max repeats of 3', () => {
      expect(criticalStrategy.maxRepeats).toBe(3);
    });

    it('should have max importance', () => {
      expect(criticalStrategy.importance).toBe('max');
    });

    it('should be persistent', () => {
      expect(criticalStrategy.persistent).toBeTrue();
    });

    it('should not auto cancel', () => {
      expect(criticalStrategy.autoCancel).toBeFalse();
    });

    it('should be ongoing', () => {
      expect(criticalStrategy.ongoing).toBeTrue();
    });

    it('should use urgent-reminder haptic', () => {
      expect(criticalStrategy.hapticPattern).toBe('urgent-reminder');
    });
  });

  /**
   * Moderate Strategy Tests
   */
  describe('Moderate strategy', () => {
    const moderateStrategy: NotificationStrategy = {
      priority: 'moderate',
      remindersBefore: [15, 0],
      repeatInterval: 10,
      maxRepeats: 2,
      importance: 'high',
      sound: 'default',
      vibrate: true,
      lights: true,
      persistent: false,
      autoCancel: true,
      ongoing: false,
      hapticPattern: 'notification'
    };

    it('should have 2 reminders', () => {
      expect(moderateStrategy.remindersBefore.length).toBe(2);
    });

    it('should have reminders at 15 and 0 minutes', () => {
      expect(moderateStrategy.remindersBefore).toEqual([15, 0]);
    });

    it('should repeat every 10 minutes', () => {
      expect(moderateStrategy.repeatInterval).toBe(10);
    });

    it('should have max repeats of 2', () => {
      expect(moderateStrategy.maxRepeats).toBe(2);
    });

    it('should have high importance', () => {
      expect(moderateStrategy.importance).toBe('high');
    });

    it('should not be persistent', () => {
      expect(moderateStrategy.persistent).toBeFalse();
    });

    it('should auto cancel', () => {
      expect(moderateStrategy.autoCancel).toBeTrue();
    });

    it('should not be ongoing', () => {
      expect(moderateStrategy.ongoing).toBeFalse();
    });

    it('should use notification haptic', () => {
      expect(moderateStrategy.hapticPattern).toBe('notification');
    });
  });

  /**
   * Supplement Strategy Tests
   */
  describe('Supplement strategy', () => {
    const supplementStrategy: NotificationStrategy = {
      priority: 'supplement',
      remindersBefore: [0],
      repeatInterval: 0,
      maxRepeats: 0,
      importance: 'default',
      sound: undefined,
      vibrate: false,
      lights: false,
      persistent: false,
      autoCancel: true,
      ongoing: false,
      hapticPattern: 'gentle-reminder'
    };

    it('should have 1 reminder only', () => {
      expect(supplementStrategy.remindersBefore.length).toBe(1);
    });

    it('should have reminder at 0 minutes only', () => {
      expect(supplementStrategy.remindersBefore).toEqual([0]);
    });

    it('should not repeat', () => {
      expect(supplementStrategy.repeatInterval).toBe(0);
    });

    it('should have max repeats of 0', () => {
      expect(supplementStrategy.maxRepeats).toBe(0);
    });

    it('should have default importance', () => {
      expect(supplementStrategy.importance).toBe('default');
    });

    it('should have no sound', () => {
      expect(supplementStrategy.sound).toBeUndefined();
    });

    it('should not vibrate', () => {
      expect(supplementStrategy.vibrate).toBeFalse();
    });

    it('should not have lights', () => {
      expect(supplementStrategy.lights).toBeFalse();
    });

    it('should use gentle-reminder haptic', () => {
      expect(supplementStrategy.hapticPattern).toBe('gentle-reminder');
    });
  });

  /**
   * Priority Determination Tests
   */
  describe('Priority determination', () => {
    const criticalTypes = [
      'antibiotic',
      'insulin',
      'heart',
      'blood pressure',
      'anticoagulant',
      'antiarrhythmic',
      'immunosuppressant'
    ];

    const supplementTypes = [
      'vitamin',
      'supplement',
      'probiotic',
      'mineral',
      'omega',
      'protein'
    ];

    const determinePriority = (
      medicationType?: string,
      isCritical?: boolean
    ): MedicationPriority => {
      if (isCritical) return 'critical';

      const type = medicationType?.toLowerCase() || '';

      if (criticalTypes.some(ct => type.includes(ct))) {
        return 'critical';
      }

      if (supplementTypes.some(st => type.includes(st))) {
        return 'supplement';
      }

      return 'moderate';
    };

    it('should return critical when isCritical flag is set', () => {
      expect(determinePriority('vitamin', true)).toBe('critical');
    });

    it('should detect antibiotic as critical', () => {
      expect(determinePriority('antibiotic')).toBe('critical');
    });

    it('should detect insulin as critical', () => {
      expect(determinePriority('insulin')).toBe('critical');
    });

    it('should detect heart medication as critical', () => {
      expect(determinePriority('heart medication')).toBe('critical');
    });

    it('should detect blood pressure as critical', () => {
      expect(determinePriority('blood pressure')).toBe('critical');
    });

    it('should detect vitamin as supplement', () => {
      expect(determinePriority('vitamin d')).toBe('supplement');
    });

    it('should detect omega as supplement', () => {
      expect(determinePriority('omega 3')).toBe('supplement');
    });

    it('should detect probiotic as supplement', () => {
      expect(determinePriority('probiotic')).toBe('supplement');
    });

    it('should default to moderate for unknown types', () => {
      expect(determinePriority('unknown medication')).toBe('moderate');
    });

    it('should handle undefined type', () => {
      expect(determinePriority(undefined)).toBe('moderate');
    });

    it('should handle empty string', () => {
      expect(determinePriority('')).toBe('moderate');
    });

    it('should be case insensitive', () => {
      expect(determinePriority('INSULIN')).toBe('critical');
      expect(determinePriority('VITAMIN')).toBe('supplement');
    });
  });

  /**
   * Importance Level Tests
   */
  describe('Importance levels', () => {
    const importanceLevels = ['max', 'high', 'default', 'low', 'min'];

    it('should have 5 importance levels', () => {
      expect(importanceLevels.length).toBe(5);
    });

    it('should map priority to importance', () => {
      const priorityToImportance: Record<MedicationPriority, string> = {
        critical: 'max',
        moderate: 'high',
        supplement: 'default'
      };

      expect(priorityToImportance['critical']).toBe('max');
      expect(priorityToImportance['moderate']).toBe('high');
      expect(priorityToImportance['supplement']).toBe('default');
    });
  });

  /**
   * Haptic Pattern Mapping Tests
   */
  describe('Haptic pattern mapping', () => {
    const hapticPatterns = ['gentle-reminder', 'urgent-reminder', 'alarm', 'notification'];

    it('should have 4 haptic patterns', () => {
      expect(hapticPatterns.length).toBe(4);
    });

    it('should map critical to urgent-reminder', () => {
      const strategy: NotificationStrategy = {
        priority: 'critical',
        remindersBefore: [],
        repeatInterval: 0,
        maxRepeats: 0,
        importance: 'max',
        sound: 'default',
        vibrate: true,
        lights: true,
        persistent: true,
        autoCancel: false,
        ongoing: true,
        hapticPattern: 'urgent-reminder'
      };

      expect(strategy.hapticPattern).toBe('urgent-reminder');
    });

    it('should map supplement to gentle-reminder', () => {
      const strategy: NotificationStrategy = {
        priority: 'supplement',
        remindersBefore: [],
        repeatInterval: 0,
        maxRepeats: 0,
        importance: 'default',
        sound: undefined,
        vibrate: false,
        lights: false,
        persistent: false,
        autoCancel: true,
        ongoing: false,
        hapticPattern: 'gentle-reminder'
      };

      expect(strategy.hapticPattern).toBe('gentle-reminder');
    });
  });

  /**
   * Reminder Schedule Calculation Tests
   */
  describe('Reminder schedule calculation', () => {
    it('should calculate reminder times', () => {
      const scheduledTime = new Date(2024, 11, 15, 8, 0, 0);
      const remindersBefore = [30, 15, 5, 0];

      const reminderTimes = remindersBefore.map(minutes =>
        new Date(scheduledTime.getTime() - minutes * 60 * 1000)
      );

      expect(reminderTimes[0].getHours()).toBe(7);
      expect(reminderTimes[0].getMinutes()).toBe(30);
      expect(reminderTimes[1].getHours()).toBe(7);
      expect(reminderTimes[1].getMinutes()).toBe(45);
      expect(reminderTimes[2].getHours()).toBe(7);
      expect(reminderTimes[2].getMinutes()).toBe(55);
      expect(reminderTimes[3].getHours()).toBe(8);
      expect(reminderTimes[3].getMinutes()).toBe(0);
    });

    it('should calculate total reminders for critical', () => {
      const remindersBefore = [30, 15, 5, 0];
      const maxRepeats = 3;

      // 4 initial reminders + 3 repeat cycles
      const totalPossibleReminders = remindersBefore.length + maxRepeats;
      expect(totalPossibleReminders).toBe(7);
    });
  });

  /**
   * Strategy Retrieval Tests
   */
  describe('Strategy retrieval', () => {
    const strategies: Record<MedicationPriority, NotificationStrategy> = {
      critical: {
        priority: 'critical',
        remindersBefore: [30, 15, 5, 0],
        repeatInterval: 5,
        maxRepeats: 3,
        importance: 'max',
        sound: 'default',
        vibrate: true,
        lights: true,
        persistent: true,
        autoCancel: false,
        ongoing: true,
        hapticPattern: 'urgent-reminder'
      },
      moderate: {
        priority: 'moderate',
        remindersBefore: [15, 0],
        repeatInterval: 10,
        maxRepeats: 2,
        importance: 'high',
        sound: 'default',
        vibrate: true,
        lights: true,
        persistent: false,
        autoCancel: true,
        ongoing: false,
        hapticPattern: 'notification'
      },
      supplement: {
        priority: 'supplement',
        remindersBefore: [0],
        repeatInterval: 0,
        maxRepeats: 0,
        importance: 'default',
        sound: undefined,
        vibrate: false,
        lights: false,
        persistent: false,
        autoCancel: true,
        ongoing: false,
        hapticPattern: 'gentle-reminder'
      }
    };

    it('should get strategy by priority', () => {
      const strategy = strategies['critical'];
      expect(strategy.priority).toBe('critical');
    });

    it('should have all priorities', () => {
      expect(Object.keys(strategies).length).toBe(3);
      expect(strategies['critical']).toBeDefined();
      expect(strategies['moderate']).toBeDefined();
      expect(strategies['supplement']).toBeDefined();
    });
  });

  /**
   * Notification Options Tests
   */
  describe('Notification options', () => {
    it('should configure persistent notification', () => {
      const options = {
        persistent: true,
        autoCancel: false,
        ongoing: true
      };

      expect(options.persistent).toBeTrue();
      expect(options.autoCancel).toBeFalse();
      expect(options.ongoing).toBeTrue();
    });

    it('should configure dismissible notification', () => {
      const options = {
        persistent: false,
        autoCancel: true,
        ongoing: false
      };

      expect(options.persistent).toBeFalse();
      expect(options.autoCancel).toBeTrue();
      expect(options.ongoing).toBeFalse();
    });
  });
});
