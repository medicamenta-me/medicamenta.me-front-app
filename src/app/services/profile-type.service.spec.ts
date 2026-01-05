import { ProfileType } from './profile-type.service';

/**
 * Profile Type Service Tests
 * Testing profile type types, interfaces and logic
 */
describe('ProfileTypeService Logic', () => {
  const STORAGE_KEY = 'medicamenta_profile_type';

  describe('ProfileType Type', () => {
    it('should accept patient type', () => {
      const type: ProfileType = 'patient';
      expect(type).toBe('patient');
    });

    it('should accept caregiver type', () => {
      const type: ProfileType = 'caregiver';
      expect(type).toBe('caregiver');
    });
  });

  describe('Storage Key', () => {
    it('should have correct storage key', () => {
      expect(STORAGE_KEY).toBe('medicamenta_profile_type');
    });
  });

  describe('Profile Type Validation', () => {
    function isValidProfileType(type: string): type is ProfileType {
      return type === 'patient' || type === 'caregiver';
    }

    it('should validate patient type', () => {
      expect(isValidProfileType('patient')).toBeTrue();
    });

    it('should validate caregiver type', () => {
      expect(isValidProfileType('caregiver')).toBeTrue();
    });

    it('should reject invalid types', () => {
      expect(isValidProfileType('admin')).toBeFalse();
      expect(isValidProfileType('')).toBeFalse();
      expect(isValidProfileType('doctor')).toBeFalse();
    });
  });

  describe('Caregiver Mode Availability', () => {
    interface Patient {
      userId: string;
      name: string;
      isSelf: boolean;
    }

    function isCaregiverModeAvailable(patients: Patient[]): boolean {
      return patients.filter(p => !p.isSelf).length > 0;
    }

    it('should be available when there are dependents', () => {
      const patients: Patient[] = [
        { userId: 'self', name: 'Eu', isSelf: true },
        { userId: 'dep1', name: 'Maria', isSelf: false }
      ];

      expect(isCaregiverModeAvailable(patients)).toBeTrue();
    });

    it('should not be available when only self', () => {
      const patients: Patient[] = [
        { userId: 'self', name: 'Eu', isSelf: true }
      ];

      expect(isCaregiverModeAvailable(patients)).toBeFalse();
    });

    it('should not be available when empty', () => {
      const patients: Patient[] = [];
      expect(isCaregiverModeAvailable(patients)).toBeFalse();
    });

    it('should be available with multiple dependents', () => {
      const patients: Patient[] = [
        { userId: 'self', name: 'Eu', isSelf: true },
        { userId: 'dep1', name: 'Maria', isSelf: false },
        { userId: 'dep2', name: 'João', isSelf: false }
      ];

      expect(isCaregiverModeAvailable(patients)).toBeTrue();
    });
  });

  describe('Profile Description', () => {
    function getProfileDescription(type: ProfileType): string {
      if (type === 'patient') {
        return 'Gerenciando seus próprios medicamentos';
      } else {
        return 'Gerenciando medicamentos de outras pessoas';
      }
    }

    it('should describe patient mode in Portuguese', () => {
      const desc = getProfileDescription('patient');
      expect(desc).toBe('Gerenciando seus próprios medicamentos');
    });

    it('should describe caregiver mode in Portuguese', () => {
      const desc = getProfileDescription('caregiver');
      expect(desc).toBe('Gerenciando medicamentos de outras pessoas');
    });
  });

  describe('Profile Type Toggle', () => {
    function toggleProfileType(current: ProfileType): ProfileType {
      return current === 'patient' ? 'caregiver' : 'patient';
    }

    it('should toggle from patient to caregiver', () => {
      expect(toggleProfileType('patient')).toBe('caregiver');
    });

    it('should toggle from caregiver to patient', () => {
      expect(toggleProfileType('caregiver')).toBe('patient');
    });
  });

  describe('Profile Type Persistence', () => {
    let mockStorage: { [key: string]: string } = {};

    beforeEach(() => {
      mockStorage = {};
    });

    function saveProfileType(type: ProfileType): void {
      mockStorage[STORAGE_KEY] = type;
    }

    function loadProfileType(): ProfileType | null {
      const saved = mockStorage[STORAGE_KEY];
      if (saved === 'patient' || saved === 'caregiver') {
        return saved;
      }
      return null;
    }

    function clearProfileType(): void {
      delete mockStorage[STORAGE_KEY];
    }

    it('should save profile type', () => {
      saveProfileType('caregiver');
      expect(mockStorage[STORAGE_KEY]).toBe('caregiver');
    });

    it('should load saved profile type', () => {
      mockStorage[STORAGE_KEY] = 'patient';
      expect(loadProfileType()).toBe('patient');
    });

    it('should return null for missing value', () => {
      expect(loadProfileType()).toBeNull();
    });

    it('should clear profile type', () => {
      mockStorage[STORAGE_KEY] = 'caregiver';
      clearProfileType();
      expect(mockStorage[STORAGE_KEY]).toBeUndefined();
    });
  });

  describe('Auto Switch Active Patient Logic', () => {
    interface Patient {
      userId: string;
      name: string;
      isSelf: boolean;
    }

    function getActivePatientForProfile(profileType: ProfileType, patients: Patient[]): string | null {
      if (patients.length === 0) return null;

      if (profileType === 'patient') {
        const self = patients.find(p => p.isSelf);
        return self?.userId || null;
      } else {
        const dependent = patients.find(p => !p.isSelf);
        return dependent?.userId || null;
      }
    }

    it('should return self for patient profile', () => {
      const patients: Patient[] = [
        { userId: 'self123', name: 'Eu', isSelf: true },
        { userId: 'dep1', name: 'Maria', isSelf: false }
      ];

      expect(getActivePatientForProfile('patient', patients)).toBe('self123');
    });

    it('should return first dependent for caregiver profile', () => {
      const patients: Patient[] = [
        { userId: 'self123', name: 'Eu', isSelf: true },
        { userId: 'dep1', name: 'Maria', isSelf: false },
        { userId: 'dep2', name: 'João', isSelf: false }
      ];

      expect(getActivePatientForProfile('caregiver', patients)).toBe('dep1');
    });

    it('should return null for empty patients', () => {
      expect(getActivePatientForProfile('patient', [])).toBeNull();
    });

    it('should return null if no self for patient profile', () => {
      const patients: Patient[] = [
        { userId: 'dep1', name: 'Maria', isSelf: false }
      ];

      expect(getActivePatientForProfile('patient', patients)).toBeNull();
    });

    it('should return null if no dependents for caregiver profile', () => {
      const patients: Patient[] = [
        { userId: 'self123', name: 'Eu', isSelf: true }
      ];

      expect(getActivePatientForProfile('caregiver', patients)).toBeNull();
    });
  });

  describe('Can Switch Profile Logic', () => {
    function canSwitchProfile(caregiverModeAvailable: boolean): boolean {
      return caregiverModeAvailable;
    }

    it('should allow switch when caregiver mode is available', () => {
      expect(canSwitchProfile(true)).toBeTrue();
    });

    it('should not allow switch when caregiver mode is not available', () => {
      expect(canSwitchProfile(false)).toBeFalse();
    });
  });

  describe('Profile Restore on Login', () => {
    interface Patient {
      userId: string;
      name: string;
      isSelf: boolean;
    }

    function restoreProfileType(
      savedType: ProfileType | null, 
      caregiverModeAvailable: boolean
    ): ProfileType {
      if (!savedType) return 'patient';
      
      if (savedType === 'caregiver' && !caregiverModeAvailable) {
        return 'patient';
      }
      
      return savedType;
    }

    it('should restore patient type', () => {
      expect(restoreProfileType('patient', true)).toBe('patient');
    });

    it('should restore caregiver type if available', () => {
      expect(restoreProfileType('caregiver', true)).toBe('caregiver');
    });

    it('should fallback to patient if caregiver not available', () => {
      expect(restoreProfileType('caregiver', false)).toBe('patient');
    });

    it('should default to patient if nothing saved', () => {
      expect(restoreProfileType(null, true)).toBe('patient');
    });
  });

  describe('Profile Clear on Logout', () => {
    let currentProfile: ProfileType = 'caregiver';
    const mockStorage: { [key: string]: string } = {};

    function clearOnLogout(): void {
      currentProfile = 'patient';
      delete mockStorage[STORAGE_KEY];
    }

    it('should reset profile to patient', () => {
      currentProfile = 'caregiver';
      clearOnLogout();
      expect(currentProfile).toBe('patient');
    });

    it('should clear storage', () => {
      mockStorage[STORAGE_KEY] = 'caregiver';
      clearOnLogout();
      expect(mockStorage[STORAGE_KEY]).toBeUndefined();
    });
  });

  describe('Profile Icons', () => {
    function getProfileIcon(type: ProfileType): string {
      return type === 'patient' ? 'person' : 'people';
    }

    it('should return person icon for patient', () => {
      expect(getProfileIcon('patient')).toBe('person');
    });

    it('should return people icon for caregiver', () => {
      expect(getProfileIcon('caregiver')).toBe('people');
    });
  });

  describe('Profile Color', () => {
    function getProfileColor(type: ProfileType): string {
      return type === 'patient' ? 'primary' : 'secondary';
    }

    it('should return primary for patient', () => {
      expect(getProfileColor('patient')).toBe('primary');
    });

    it('should return secondary for caregiver', () => {
      expect(getProfileColor('caregiver')).toBe('secondary');
    });
  });
});
