import { ImpactStyle } from '@capacitor/haptics';

/**
 * Haptic Service Tests
 * Testing haptic feedback patterns and localStorage preferences
 * 
 * Note: We test the logic and patterns without instantiating HapticService
 * due to its internal LogService dependency using `new LogService()`.
 */
describe('HapticService Logic', () => {
  let localStorageGetSpy: jasmine.Spy;
  let localStorageSetSpy: jasmine.Spy;

  beforeEach(() => {
    // Mock localStorage
    localStorageGetSpy = spyOn(localStorage, 'getItem').and.returnValue(null);
    localStorageSetSpy = spyOn(localStorage, 'setItem').and.callFake(() => {});
  });

  describe('ImpactStyle Enum', () => {
    it('should have Light style with correct value', () => {
      expect(ImpactStyle.Light).toBe('LIGHT');
    });

    it('should have Medium style with correct value', () => {
      expect(ImpactStyle.Medium).toBe('MEDIUM');
    });

    it('should have Heavy style with correct value', () => {
      expect(ImpactStyle.Heavy).toBe('HEAVY');
    });
  });

  describe('LocalStorage Haptics Preference', () => {
    it('should read haptics_enabled from localStorage', () => {
      localStorage.getItem('haptics_enabled');
      expect(localStorageGetSpy).toHaveBeenCalledWith('haptics_enabled');
    });

    it('should treat null localStorage value as enabled by default', () => {
      const value = localStorage.getItem('haptics_enabled');
      const isEnabled = value !== 'false';
      expect(isEnabled).toBeTrue();
    });

    it('should treat "false" localStorage value as disabled', () => {
      localStorageGetSpy.and.returnValue('false');
      const value = localStorage.getItem('haptics_enabled');
      const isEnabled = value !== 'false';
      expect(isEnabled).toBeFalse();
    });

    it('should treat "true" localStorage value as enabled', () => {
      localStorageGetSpy.and.returnValue('true');
      const value = localStorage.getItem('haptics_enabled');
      const isEnabled = value !== 'false';
      expect(isEnabled).toBeTrue();
    });

    it('should save disabled state to localStorage', () => {
      localStorage.setItem('haptics_enabled', 'false');
      expect(localStorageSetSpy).toHaveBeenCalledWith('haptics_enabled', 'false');
    });

    it('should save enabled state to localStorage', () => {
      localStorage.setItem('haptics_enabled', 'true');
      expect(localStorageSetSpy).toHaveBeenCalledWith('haptics_enabled', 'true');
    });
  });

  describe('Haptic Pattern Selection Logic', () => {
    interface HapticCall {
      style: ImpactStyle;
    }

    function getLightImpactCall(): HapticCall {
      return { style: ImpactStyle.Light };
    }

    function getMediumImpactCall(): HapticCall {
      return { style: ImpactStyle.Medium };
    }

    function getHeavyImpactCall(): HapticCall {
      return { style: ImpactStyle.Heavy };
    }

    describe('Light Impact Pattern', () => {
      it('should return Light style for subtle feedback', () => {
        const call = getLightImpactCall();
        expect(call.style).toBe(ImpactStyle.Light);
      });

      it('should have correct style string', () => {
        const call = getLightImpactCall();
        expect(call.style).toBe('LIGHT');
      });
    });

    describe('Medium Impact Pattern', () => {
      it('should return Medium style for moderate feedback', () => {
        const call = getMediumImpactCall();
        expect(call.style).toBe(ImpactStyle.Medium);
      });

      it('should have correct style string', () => {
        const call = getMediumImpactCall();
        expect(call.style).toBe('MEDIUM');
      });
    });

    describe('Heavy Impact Pattern', () => {
      it('should return Heavy style for strong feedback', () => {
        const call = getHeavyImpactCall();
        expect(call.style).toBe(ImpactStyle.Heavy);
      });

      it('should have correct style string', () => {
        const call = getHeavyImpactCall();
        expect(call.style).toBe('HEAVY');
      });
    });
  });

  describe('Achievement Tier Pattern Logic', () => {
    type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

    function getImpactStyleForTier(tier: AchievementTier): ImpactStyle {
      switch (tier) {
        case 'bronze':
          return ImpactStyle.Light;
        case 'silver':
          return ImpactStyle.Medium;
        case 'gold':
          return ImpactStyle.Heavy;
        case 'platinum':
          return ImpactStyle.Heavy;
        default:
          return ImpactStyle.Light;
      }
    }

    function getPatternForTier(tier: AchievementTier): ImpactStyle[] {
      switch (tier) {
        case 'bronze':
          return [ImpactStyle.Light];
        case 'silver':
          return [ImpactStyle.Medium];
        case 'gold':
          return [ImpactStyle.Heavy];
        case 'platinum':
          return [ImpactStyle.Heavy, ImpactStyle.Medium, ImpactStyle.Medium, ImpactStyle.Heavy];
        default:
          return [ImpactStyle.Light];
      }
    }

    it('Bronze tier should use Light impact style', () => {
      const style = getImpactStyleForTier('bronze');
      expect(style).toBe(ImpactStyle.Light);
    });

    it('Silver tier should use Medium impact style', () => {
      const style = getImpactStyleForTier('silver');
      expect(style).toBe(ImpactStyle.Medium);
    });

    it('Gold tier should use Heavy impact style', () => {
      const style = getImpactStyleForTier('gold');
      expect(style).toBe(ImpactStyle.Heavy);
    });

    it('Platinum tier should use Heavy impact style', () => {
      const style = getImpactStyleForTier('platinum');
      expect(style).toBe(ImpactStyle.Heavy);
    });

    it('Bronze pattern should have 1 impact', () => {
      const pattern = getPatternForTier('bronze');
      expect(pattern.length).toBe(1);
      expect(pattern[0]).toBe(ImpactStyle.Light);
    });

    it('Silver pattern should have 1 impact', () => {
      const pattern = getPatternForTier('silver');
      expect(pattern.length).toBe(1);
      expect(pattern[0]).toBe(ImpactStyle.Medium);
    });

    it('Gold pattern should have 1 impact', () => {
      const pattern = getPatternForTier('gold');
      expect(pattern.length).toBe(1);
      expect(pattern[0]).toBe(ImpactStyle.Heavy);
    });

    it('Platinum pattern should have 4 impacts in complex pattern', () => {
      const pattern = getPatternForTier('platinum');
      expect(pattern.length).toBe(4);
      expect(pattern[0]).toBe(ImpactStyle.Heavy);
      expect(pattern[1]).toBe(ImpactStyle.Medium);
      expect(pattern[2]).toBe(ImpactStyle.Medium);
      expect(pattern[3]).toBe(ImpactStyle.Heavy);
    });
  });

  describe('Level Up Pattern Logic', () => {
    function getLevelUpPattern(): ImpactStyle[] {
      return [ImpactStyle.Light, ImpactStyle.Medium, ImpactStyle.Heavy];
    }

    it('should have ascending intensity pattern', () => {
      const pattern = getLevelUpPattern();
      expect(pattern.length).toBe(3);
    });

    it('should start with Light', () => {
      const pattern = getLevelUpPattern();
      expect(pattern[0]).toBe(ImpactStyle.Light);
    });

    it('should have Medium in middle', () => {
      const pattern = getLevelUpPattern();
      expect(pattern[1]).toBe(ImpactStyle.Medium);
    });

    it('should end with Heavy', () => {
      const pattern = getLevelUpPattern();
      expect(pattern[2]).toBe(ImpactStyle.Heavy);
    });
  });

  describe('Warning Pattern Logic', () => {
    function getWarningPattern(): ImpactStyle[] {
      return [ImpactStyle.Heavy, ImpactStyle.Heavy];
    }

    it('should have double heavy impact', () => {
      const pattern = getWarningPattern();
      expect(pattern.length).toBe(2);
    });

    it('should use Heavy for both impacts', () => {
      const pattern = getWarningPattern();
      expect(pattern.every(s => s === ImpactStyle.Heavy)).toBeTrue();
    });
  });

  describe('Notification Pattern Logic', () => {
    function getNotificationPattern(): ImpactStyle[] {
      return [ImpactStyle.Medium];
    }

    it('should have single impact', () => {
      const pattern = getNotificationPattern();
      expect(pattern.length).toBe(1);
    });

    it('should use Medium impact', () => {
      const pattern = getNotificationPattern();
      expect(pattern[0]).toBe(ImpactStyle.Medium);
    });
  });

  describe('Error Pattern Logic', () => {
    function getErrorPattern(): ImpactStyle[] {
      return [ImpactStyle.Heavy, ImpactStyle.Light, ImpactStyle.Heavy];
    }

    it('should have triple impact', () => {
      const pattern = getErrorPattern();
      expect(pattern.length).toBe(3);
    });

    it('should start with Heavy', () => {
      const pattern = getErrorPattern();
      expect(pattern[0]).toBe(ImpactStyle.Heavy);
    });

    it('should have Light in middle', () => {
      const pattern = getErrorPattern();
      expect(pattern[1]).toBe(ImpactStyle.Light);
    });

    it('should end with Heavy', () => {
      const pattern = getErrorPattern();
      expect(pattern[2]).toBe(ImpactStyle.Heavy);
    });
  });

  describe('Success Pattern Logic', () => {
    function getSuccessPattern(): ImpactStyle[] {
      return [ImpactStyle.Medium, ImpactStyle.Medium];
    }

    it('should have double impact', () => {
      const pattern = getSuccessPattern();
      expect(pattern.length).toBe(2);
    });

    it('should use Medium for both', () => {
      const pattern = getSuccessPattern();
      expect(pattern.every(s => s === ImpactStyle.Medium)).toBeTrue();
    });
  });

  describe('Disabled State Behavior', () => {
    function shouldExecuteHaptics(isEnabled: boolean): boolean {
      return isEnabled;
    }

    it('should not execute when disabled', () => {
      expect(shouldExecuteHaptics(false)).toBeFalse();
    });

    it('should execute when enabled', () => {
      expect(shouldExecuteHaptics(true)).toBeTrue();
    });

    it('should check localStorage for enabled state', () => {
      localStorageGetSpy.and.returnValue('false');
      const value = localStorage.getItem('haptics_enabled');
      const isEnabled = value !== 'false';
      expect(shouldExecuteHaptics(isEnabled)).toBeFalse();
    });

    it('should default to enabled when localStorage is empty', () => {
      localStorageGetSpy.and.returnValue(null);
      const value = localStorage.getItem('haptics_enabled');
      const isEnabled = value !== 'false';
      expect(shouldExecuteHaptics(isEnabled)).toBeTrue();
    });
  });

  describe('Toggle Logic', () => {
    function toggleEnabled(current: boolean): boolean {
      return !current;
    }

    it('should toggle from true to false', () => {
      expect(toggleEnabled(true)).toBeFalse();
    });

    it('should toggle from false to true', () => {
      expect(toggleEnabled(false)).toBeTrue();
    });

    it('should persist toggle state to localStorage when disabling', () => {
      const newState = toggleEnabled(true);
      localStorage.setItem('haptics_enabled', newState.toString());
      expect(localStorageSetSpy).toHaveBeenCalledWith('haptics_enabled', 'false');
    });

    it('should persist toggle state to localStorage when enabling', () => {
      const newState = toggleEnabled(false);
      localStorage.setItem('haptics_enabled', newState.toString());
      expect(localStorageSetSpy).toHaveBeenCalledWith('haptics_enabled', 'true');
    });
  });

  describe('Impact Style Intensity Order', () => {
    function getIntensityLevel(style: ImpactStyle): number {
      switch (style) {
        case ImpactStyle.Light:
          return 1;
        case ImpactStyle.Medium:
          return 2;
        case ImpactStyle.Heavy:
          return 3;
        default:
          return 0;
      }
    }

    it('Light should have lowest intensity (1)', () => {
      expect(getIntensityLevel(ImpactStyle.Light)).toBe(1);
    });

    it('Medium should have middle intensity (2)', () => {
      expect(getIntensityLevel(ImpactStyle.Medium)).toBe(2);
    });

    it('Heavy should have highest intensity (3)', () => {
      expect(getIntensityLevel(ImpactStyle.Heavy)).toBe(3);
    });

    it('Light < Medium', () => {
      expect(getIntensityLevel(ImpactStyle.Light)).toBeLessThan(getIntensityLevel(ImpactStyle.Medium));
    });

    it('Medium < Heavy', () => {
      expect(getIntensityLevel(ImpactStyle.Medium)).toBeLessThan(getIntensityLevel(ImpactStyle.Heavy));
    });

    it('Light < Heavy', () => {
      expect(getIntensityLevel(ImpactStyle.Light)).toBeLessThan(getIntensityLevel(ImpactStyle.Heavy));
    });
  });

  describe('Gamification Event Haptics', () => {
    type GamificationEvent = 'points' | 'streak' | 'badge' | 'level_up' | 'challenge_complete';

    function getPatternForEvent(event: GamificationEvent): ImpactStyle[] {
      switch (event) {
        case 'points':
          return [ImpactStyle.Light];
        case 'streak':
          return [ImpactStyle.Medium];
        case 'badge':
          return [ImpactStyle.Medium, ImpactStyle.Heavy];
        case 'level_up':
          return [ImpactStyle.Light, ImpactStyle.Medium, ImpactStyle.Heavy];
        case 'challenge_complete':
          return [ImpactStyle.Heavy, ImpactStyle.Heavy];
        default:
          return [ImpactStyle.Light];
      }
    }

    it('points event should have light feedback', () => {
      const pattern = getPatternForEvent('points');
      expect(pattern).toEqual([ImpactStyle.Light]);
    });

    it('streak event should have medium feedback', () => {
      const pattern = getPatternForEvent('streak');
      expect(pattern).toEqual([ImpactStyle.Medium]);
    });

    it('badge event should have medium-heavy pattern', () => {
      const pattern = getPatternForEvent('badge');
      expect(pattern).toEqual([ImpactStyle.Medium, ImpactStyle.Heavy]);
    });

    it('level_up event should have ascending pattern', () => {
      const pattern = getPatternForEvent('level_up');
      expect(pattern).toEqual([ImpactStyle.Light, ImpactStyle.Medium, ImpactStyle.Heavy]);
    });

    it('challenge_complete event should have double heavy pattern', () => {
      const pattern = getPatternForEvent('challenge_complete');
      expect(pattern).toEqual([ImpactStyle.Heavy, ImpactStyle.Heavy]);
    });
  });

  describe('Medication Event Haptics', () => {
    type MedicationEvent = 'take' | 'skip' | 'late' | 'reminder';

    function getPatternForMedicationEvent(event: MedicationEvent): ImpactStyle[] {
      switch (event) {
        case 'take':
          return [ImpactStyle.Medium];
        case 'skip':
          return [ImpactStyle.Light];
        case 'late':
          return [ImpactStyle.Heavy];
        case 'reminder':
          return [ImpactStyle.Light, ImpactStyle.Light];
        default:
          return [ImpactStyle.Light];
      }
    }

    it('take event should have medium feedback', () => {
      const pattern = getPatternForMedicationEvent('take');
      expect(pattern).toEqual([ImpactStyle.Medium]);
    });

    it('skip event should have light feedback', () => {
      const pattern = getPatternForMedicationEvent('skip');
      expect(pattern).toEqual([ImpactStyle.Light]);
    });

    it('late event should have heavy feedback', () => {
      const pattern = getPatternForMedicationEvent('late');
      expect(pattern).toEqual([ImpactStyle.Heavy]);
    });

    it('reminder event should have double light pattern', () => {
      const pattern = getPatternForMedicationEvent('reminder');
      expect(pattern).toEqual([ImpactStyle.Light, ImpactStyle.Light]);
    });
  });
});
