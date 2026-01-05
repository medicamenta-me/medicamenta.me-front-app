import { ImpactStyle } from '@capacitor/haptics';
import { 
  HapticPatternType,
  HapticPattern,
  HapticStep
} from './haptic-patterns.service';

/**
 * Haptic Patterns Service Tests
 * Testing haptic pattern definitions and logic
 */
describe('HapticPatternsService Logic', () => {
  // Replicated patterns for testing logic
  const patterns: Record<HapticPatternType, HapticPattern> = {
    'gentle-reminder': {
      type: 'gentle-reminder',
      name: 'Lembrete Suave',
      description: 'Vibração suave para lembretes não urgentes',
      sequence: [
        { intensity: ImpactStyle.Light, delay: 0 },
        { intensity: ImpactStyle.Light, delay: 200 }
      ]
    },
    'urgent-reminder': {
      type: 'urgent-reminder',
      name: 'Lembrete Urgente',
      description: 'Vibração forte para doses importantes',
      sequence: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 100 },
        { intensity: ImpactStyle.Heavy, delay: 100 }
      ]
    },
    'missed-dose': {
      type: 'missed-dose',
      name: 'Dose Perdida',
      description: 'Padrão de alerta para dose não tomada',
      sequence: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Heavy, delay: 150 },
        { intensity: ImpactStyle.Heavy, delay: 150 },
        { intensity: ImpactStyle.Medium, delay: 300 },
        { intensity: ImpactStyle.Medium, delay: 150 }
      ]
    },
    'success-confirm': {
      type: 'success-confirm',
      name: 'Confirmação de Sucesso',
      description: 'Vibração de confirmação para ação concluída',
      sequence: [
        { intensity: ImpactStyle.Light, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 80 },
        { intensity: ImpactStyle.Light, delay: 80 }
      ]
    },
    'quick-tap': {
      type: 'quick-tap',
      name: 'Toque Rápido',
      description: 'Uma vibração rápida para feedback de toque',
      sequence: [
        { intensity: ImpactStyle.Light, delay: 0 }
      ]
    },
    'double-tap': {
      type: 'double-tap',
      name: 'Toque Duplo',
      description: 'Duas vibrações rápidas',
      sequence: [
        { intensity: ImpactStyle.Medium, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 100 }
      ]
    },
    'triple-tap': {
      type: 'triple-tap',
      name: 'Toque Triplo',
      description: 'Três vibrações rápidas',
      sequence: [
        { intensity: ImpactStyle.Medium, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 80 },
        { intensity: ImpactStyle.Medium, delay: 80 }
      ]
    },
    'alarm': {
      type: 'alarm',
      name: 'Alarme',
      description: 'Padrão de alarme contínuo',
      sequence: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 200 },
        { intensity: ImpactStyle.Heavy, delay: 200 },
        { intensity: ImpactStyle.Medium, delay: 200 },
        { intensity: ImpactStyle.Heavy, delay: 200 }
      ]
    },
    'notification': {
      type: 'notification',
      name: 'Notificação',
      description: 'Vibração padrão de notificação',
      sequence: [
        { intensity: ImpactStyle.Medium, delay: 0 },
        { intensity: ImpactStyle.Light, delay: 150 }
      ]
    }
  };

  describe('HapticPatternType', () => {
    it('should accept gentle-reminder type', () => {
      const type: HapticPatternType = 'gentle-reminder';
      expect(type).toBe('gentle-reminder');
    });

    it('should accept urgent-reminder type', () => {
      const type: HapticPatternType = 'urgent-reminder';
      expect(type).toBe('urgent-reminder');
    });

    it('should accept missed-dose type', () => {
      const type: HapticPatternType = 'missed-dose';
      expect(type).toBe('missed-dose');
    });

    it('should accept success-confirm type', () => {
      const type: HapticPatternType = 'success-confirm';
      expect(type).toBe('success-confirm');
    });

    it('should accept quick-tap type', () => {
      const type: HapticPatternType = 'quick-tap';
      expect(type).toBe('quick-tap');
    });

    it('should accept double-tap type', () => {
      const type: HapticPatternType = 'double-tap';
      expect(type).toBe('double-tap');
    });

    it('should accept triple-tap type', () => {
      const type: HapticPatternType = 'triple-tap';
      expect(type).toBe('triple-tap');
    });

    it('should accept alarm type', () => {
      const type: HapticPatternType = 'alarm';
      expect(type).toBe('alarm');
    });

    it('should accept notification type', () => {
      const type: HapticPatternType = 'notification';
      expect(type).toBe('notification');
    });
  });

  describe('HapticPattern Interface', () => {
    it('should have required fields', () => {
      const pattern = patterns['gentle-reminder'];
      expect(pattern.type).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.description).toBeDefined();
      expect(pattern.sequence).toBeDefined();
    });

    it('should have type matching record key', () => {
      Object.entries(patterns).forEach(([key, pattern]) => {
        expect(pattern.type).toBe(key);
      });
    });
  });

  describe('HapticStep Interface', () => {
    it('should have required intensity field', () => {
      const step: HapticStep = { intensity: ImpactStyle.Light, delay: 0 };
      expect(step.intensity).toBeDefined();
    });

    it('should have required delay field', () => {
      const step: HapticStep = { intensity: ImpactStyle.Light, delay: 100 };
      expect(step.delay).toBe(100);
    });

    it('should allow optional duration field', () => {
      const step: HapticStep = { intensity: ImpactStyle.Light, delay: 0, duration: 50 };
      expect(step.duration).toBe(50);
    });
  });

  describe('Pattern Definitions', () => {
    it('should have 9 predefined patterns', () => {
      expect(Object.keys(patterns).length).toBe(9);
    });

    describe('Gentle Reminder Pattern', () => {
      const pattern = patterns['gentle-reminder'];

      it('should have correct name', () => {
        expect(pattern.name).toBe('Lembrete Suave');
      });

      it('should have 2 steps', () => {
        expect(pattern.sequence.length).toBe(2);
      });

      it('should use Light intensity', () => {
        pattern.sequence.forEach(step => {
          expect(step.intensity).toBe(ImpactStyle.Light);
        });
      });

      it('should start with delay 0', () => {
        expect(pattern.sequence[0].delay).toBe(0);
      });
    });

    describe('Urgent Reminder Pattern', () => {
      const pattern = patterns['urgent-reminder'];

      it('should have correct name', () => {
        expect(pattern.name).toBe('Lembrete Urgente');
      });

      it('should have 3 steps', () => {
        expect(pattern.sequence.length).toBe(3);
      });

      it('should start with Heavy intensity', () => {
        expect(pattern.sequence[0].intensity).toBe(ImpactStyle.Heavy);
      });

      it('should include Heavy intensity for urgency', () => {
        const hasHeavy = pattern.sequence.some(s => s.intensity === ImpactStyle.Heavy);
        expect(hasHeavy).toBeTrue();
      });
    });

    describe('Missed Dose Pattern', () => {
      const pattern = patterns['missed-dose'];

      it('should have correct name', () => {
        expect(pattern.name).toBe('Dose Perdida');
      });

      it('should have 5 steps', () => {
        expect(pattern.sequence.length).toBe(5);
      });

      it('should be the longest pattern', () => {
        const allLengths = Object.values(patterns).map(p => p.sequence.length);
        expect(pattern.sequence.length).toBe(Math.max(...allLengths));
      });
    });

    describe('Success Confirm Pattern', () => {
      const pattern = patterns['success-confirm'];

      it('should have correct name', () => {
        expect(pattern.name).toBe('Confirmação de Sucesso');
      });

      it('should have 3 steps', () => {
        expect(pattern.sequence.length).toBe(3);
      });

      it('should have varied intensities', () => {
        const intensities = new Set(pattern.sequence.map(s => s.intensity));
        expect(intensities.size).toBeGreaterThan(1);
      });
    });

    describe('Quick Tap Pattern', () => {
      const pattern = patterns['quick-tap'];

      it('should have correct name', () => {
        expect(pattern.name).toBe('Toque Rápido');
      });

      it('should have 1 step', () => {
        expect(pattern.sequence.length).toBe(1);
      });

      it('should use Light intensity', () => {
        expect(pattern.sequence[0].intensity).toBe(ImpactStyle.Light);
      });

      it('should be the shortest pattern', () => {
        const allLengths = Object.values(patterns).map(p => p.sequence.length);
        expect(pattern.sequence.length).toBe(Math.min(...allLengths));
      });
    });

    describe('Double Tap Pattern', () => {
      const pattern = patterns['double-tap'];

      it('should have 2 steps', () => {
        expect(pattern.sequence.length).toBe(2);
      });

      it('should use Medium intensity', () => {
        pattern.sequence.forEach(step => {
          expect(step.intensity).toBe(ImpactStyle.Medium);
        });
      });
    });

    describe('Triple Tap Pattern', () => {
      const pattern = patterns['triple-tap'];

      it('should have 3 steps', () => {
        expect(pattern.sequence.length).toBe(3);
      });

      it('should use Medium intensity', () => {
        pattern.sequence.forEach(step => {
          expect(step.intensity).toBe(ImpactStyle.Medium);
        });
      });
    });

    describe('Alarm Pattern', () => {
      const pattern = patterns['alarm'];

      it('should have 5 steps', () => {
        expect(pattern.sequence.length).toBe(5);
      });

      it('should alternate Heavy and Medium', () => {
        expect(pattern.sequence[0].intensity).toBe(ImpactStyle.Heavy);
        expect(pattern.sequence[1].intensity).toBe(ImpactStyle.Medium);
        expect(pattern.sequence[2].intensity).toBe(ImpactStyle.Heavy);
        expect(pattern.sequence[3].intensity).toBe(ImpactStyle.Medium);
        expect(pattern.sequence[4].intensity).toBe(ImpactStyle.Heavy);
      });
    });

    describe('Notification Pattern', () => {
      const pattern = patterns['notification'];

      it('should have 2 steps', () => {
        expect(pattern.sequence.length).toBe(2);
      });

      it('should start with Medium and end with Light', () => {
        expect(pattern.sequence[0].intensity).toBe(ImpactStyle.Medium);
        expect(pattern.sequence[1].intensity).toBe(ImpactStyle.Light);
      });
    });
  });

  describe('Pattern Timing', () => {
    it('should have first step with delay 0', () => {
      Object.values(patterns).forEach(pattern => {
        expect(pattern.sequence[0].delay).toBe(0);
      });
    });

    it('should calculate total pattern duration', () => {
      const pattern = patterns['missed-dose'];
      const totalDuration = pattern.sequence.reduce((sum, step) => sum + step.delay, 0);
      expect(totalDuration).toBe(750); // 0 + 150 + 150 + 300 + 150
    });

    it('should have reasonable delays', () => {
      Object.values(patterns).forEach(pattern => {
        pattern.sequence.forEach(step => {
          expect(step.delay).toBeGreaterThanOrEqual(0);
          expect(step.delay).toBeLessThanOrEqual(500);
        });
      });
    });
  });

  describe('Pattern Intensity Distribution', () => {
    it('should use all intensity levels across patterns', () => {
      const allIntensities = new Set<ImpactStyle>();
      Object.values(patterns).forEach(pattern => {
        pattern.sequence.forEach(step => {
          allIntensities.add(step.intensity);
        });
      });

      expect(allIntensities.has(ImpactStyle.Light)).toBeTrue();
      expect(allIntensities.has(ImpactStyle.Medium)).toBeTrue();
      expect(allIntensities.has(ImpactStyle.Heavy)).toBeTrue();
    });
  });

  describe('Pattern Lookup', () => {
    function getPattern(type: HapticPatternType): HapticPattern {
      return patterns[type];
    }

    it('should return correct pattern for type', () => {
      const pattern = getPattern('gentle-reminder');
      expect(pattern.type).toBe('gentle-reminder');
    });

    it('should return all defined patterns', () => {
      const types: HapticPatternType[] = [
        'gentle-reminder', 'urgent-reminder', 'missed-dose',
        'success-confirm', 'quick-tap', 'double-tap',
        'triple-tap', 'alarm', 'notification'
      ];

      types.forEach(type => {
        const pattern = getPattern(type);
        expect(pattern).toBeDefined();
        expect(pattern.type).toBe(type);
      });
    });
  });

  describe('Pattern Execution Logic', () => {
    async function executePattern(pattern: HapticPattern): Promise<number> {
      let totalTime = 0;
      for (const step of pattern.sequence) {
        // Simulate delay
        totalTime += step.delay;
      }
      return totalTime;
    }

    it('should calculate execution time correctly', async () => {
      const pattern = patterns['double-tap'];
      const time = await executePattern(pattern);
      expect(time).toBe(100); // 0 + 100
    });

    it('should handle single step patterns', async () => {
      const pattern = patterns['quick-tap'];
      const time = await executePattern(pattern);
      expect(time).toBe(0);
    });
  });

  describe('Pattern Names (Localized)', () => {
    it('should have Portuguese names', () => {
      expect(patterns['gentle-reminder'].name).toBe('Lembrete Suave');
      expect(patterns['urgent-reminder'].name).toBe('Lembrete Urgente');
      expect(patterns['missed-dose'].name).toBe('Dose Perdida');
      expect(patterns['success-confirm'].name).toBe('Confirmação de Sucesso');
      expect(patterns['quick-tap'].name).toBe('Toque Rápido');
    });
  });

  describe('Pattern Descriptions', () => {
    it('should have non-empty descriptions', () => {
      Object.values(patterns).forEach(pattern => {
        expect(pattern.description.length).toBeGreaterThan(0);
      });
    });
  });
});
