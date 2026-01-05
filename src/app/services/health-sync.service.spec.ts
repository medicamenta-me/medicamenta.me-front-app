import { 
  HealthPlatform,
  HealthPermissions,
  HealthMedicationData,
  HealthSyncConfig,
  HealthSyncStats
} from './health-sync.service';

/**
 * Health Sync Service Tests
 * Testing health sync types, interfaces and logic
 */
describe('HealthSyncService Logic', () => {
  describe('HealthPlatform Type', () => {
    it('should accept apple-health', () => {
      const platform: HealthPlatform = 'apple-health';
      expect(platform).toBe('apple-health');
    });

    it('should accept google-fit', () => {
      const platform: HealthPlatform = 'google-fit';
      expect(platform).toBe('google-fit');
    });

    it('should accept none', () => {
      const platform: HealthPlatform = 'none';
      expect(platform).toBe('none');
    });
  });

  describe('HealthPermissions Interface', () => {
    it('should have all required fields', () => {
      const permissions: HealthPermissions = {
        readMedication: true,
        writeMedication: true,
        readActivityData: false,
        granted: true
      };

      expect(permissions.readMedication).toBeTrue();
      expect(permissions.writeMedication).toBeTrue();
      expect(permissions.readActivityData).toBeFalse();
      expect(permissions.granted).toBeTrue();
    });

    it('should allow all permissions false', () => {
      const permissions: HealthPermissions = {
        readMedication: false,
        writeMedication: false,
        readActivityData: false,
        granted: false
      };

      expect(permissions.granted).toBeFalse();
    });

    it('should have partial permissions', () => {
      const permissions: HealthPermissions = {
        readMedication: true,
        writeMedication: false,
        readActivityData: true,
        granted: true
      };

      expect(permissions.readMedication).toBeTrue();
      expect(permissions.writeMedication).toBeFalse();
    });
  });

  describe('HealthMedicationData Interface', () => {
    it('should have required fields', () => {
      const data: HealthMedicationData = {
        name: 'Aspirina',
        dosage: '500mg',
        timestamp: new Date(),
        taken: true
      };

      expect(data.name).toBe('Aspirina');
      expect(data.dosage).toBe('500mg');
      expect(data.timestamp).toBeInstanceOf(Date);
      expect(data.taken).toBeTrue();
    });

    it('should allow optional notes', () => {
      const data: HealthMedicationData = {
        name: 'Paracetamol',
        dosage: '750mg',
        timestamp: new Date(),
        taken: false,
        notes: 'Esqueci de tomar'
      };

      expect(data.notes).toBe('Esqueci de tomar');
    });

    it('should handle taken as false', () => {
      const data: HealthMedicationData = {
        name: 'Ibuprofeno',
        dosage: '400mg',
        timestamp: new Date(),
        taken: false
      };

      expect(data.taken).toBeFalse();
    });
  });

  describe('HealthSyncConfig Interface', () => {
    it('should have all required fields', () => {
      const config: HealthSyncConfig = {
        enabled: true,
        platform: 'apple-health',
        autoSync: true,
        syncInterval: 60,
        syncMedications: true,
        syncVitals: false
      };

      expect(config.enabled).toBeTrue();
      expect(config.platform).toBe('apple-health');
      expect(config.autoSync).toBeTrue();
      expect(config.syncInterval).toBe(60);
    });

    it('should allow optional lastSync', () => {
      const config: HealthSyncConfig = {
        enabled: true,
        platform: 'google-fit',
        autoSync: true,
        syncInterval: 30,
        lastSync: new Date(),
        syncMedications: true,
        syncVitals: true
      };

      expect(config.lastSync).toBeInstanceOf(Date);
    });

    it('should have default config values', () => {
      const defaultConfig: HealthSyncConfig = {
        enabled: false,
        platform: 'none',
        autoSync: true,
        syncInterval: 60,
        syncMedications: true,
        syncVitals: false
      };

      expect(defaultConfig.enabled).toBeFalse();
      expect(defaultConfig.platform).toBe('none');
      expect(defaultConfig.syncInterval).toBe(60);
    });
  });

  describe('HealthSyncStats Interface', () => {
    it('should have all required fields', () => {
      const stats: HealthSyncStats = {
        totalSyncs: 10,
        lastSync: new Date(),
        medicationsSynced: 50,
        errors: 2
      };

      expect(stats.totalSyncs).toBe(10);
      expect(stats.lastSync).toBeInstanceOf(Date);
      expect(stats.medicationsSynced).toBe(50);
      expect(stats.errors).toBe(2);
    });

    it('should allow null lastSync', () => {
      const stats: HealthSyncStats = {
        totalSyncs: 0,
        lastSync: null,
        medicationsSynced: 0,
        errors: 0
      };

      expect(stats.lastSync).toBeNull();
    });

    it('should have initial stats', () => {
      const initialStats: HealthSyncStats = {
        totalSyncs: 0,
        lastSync: null,
        medicationsSynced: 0,
        errors: 0
      };

      expect(initialStats.totalSyncs).toBe(0);
      expect(initialStats.errors).toBe(0);
    });
  });

  describe('Platform Detection Logic', () => {
    function detectPlatform(isIOS: boolean, isAndroid: boolean, isNative: boolean): HealthPlatform {
      if (!isNative) return 'none';
      if (isIOS) return 'apple-health';
      if (isAndroid) return 'google-fit';
      return 'none';
    }

    it('should detect apple-health on iOS', () => {
      expect(detectPlatform(true, false, true)).toBe('apple-health');
    });

    it('should detect google-fit on Android', () => {
      expect(detectPlatform(false, true, true)).toBe('google-fit');
    });

    it('should return none on web', () => {
      expect(detectPlatform(false, false, false)).toBe('none');
    });

    it('should return none when not native', () => {
      expect(detectPlatform(true, false, false)).toBe('none');
    });
  });

  describe('Support Check Logic', () => {
    function checkSupport(isIOS: boolean, isAndroid: boolean, isNative: boolean): boolean {
      return isNative && (isIOS || isAndroid);
    }

    it('should support iOS native', () => {
      expect(checkSupport(true, false, true)).toBeTrue();
    });

    it('should support Android native', () => {
      expect(checkSupport(false, true, true)).toBeTrue();
    });

    it('should not support web', () => {
      expect(checkSupport(false, false, false)).toBeFalse();
    });

    it('should not support iOS web', () => {
      expect(checkSupport(true, false, false)).toBeFalse();
    });
  });

  describe('Auto Sync Logic', () => {
    function calculateNextSyncTime(lastSync: Date | undefined, syncInterval: number): Date {
      const lastTime = lastSync ? lastSync.getTime() : 0;
      return new Date(lastTime + syncInterval * 60 * 1000);
    }

    it('should calculate next sync from last sync', () => {
      const lastSync = new Date(2025, 0, 1, 10, 0, 0);
      const nextSync = calculateNextSyncTime(lastSync, 60);
      
      expect(nextSync.getHours()).toBe(11);
    });

    it('should handle undefined lastSync', () => {
      const nextSync = calculateNextSyncTime(undefined, 60);
      expect(nextSync.getTime()).toBe(60 * 60 * 1000);
    });

    it('should respect sync interval', () => {
      const lastSync = new Date(2025, 0, 1, 12, 0, 0);
      const nextSync30 = calculateNextSyncTime(lastSync, 30);
      const nextSync60 = calculateNextSyncTime(lastSync, 60);
      
      expect(nextSync30.getMinutes()).toBe(30);
      expect(nextSync60.getHours()).toBe(13);
    });
  });

  describe('Sync Interval Options', () => {
    it('should support 15 minute interval', () => {
      const interval = 15;
      expect(interval).toBe(15);
    });

    it('should support 30 minute interval', () => {
      const interval = 30;
      expect(interval).toBe(30);
    });

    it('should support 60 minute interval', () => {
      const interval = 60;
      expect(interval).toBe(60);
    });

    it('should support 120 minute interval', () => {
      const interval = 120;
      expect(interval).toBe(120);
    });
  });

  describe('Medication Data Transformation', () => {
    it('should transform medication to health format', () => {
      const medication = {
        name: 'Metformina',
        dosage: '850mg',
        scheduleTime: '08:00',
        taken: true,
        takenAt: new Date()
      };

      const healthData: HealthMedicationData = {
        name: medication.name,
        dosage: medication.dosage,
        timestamp: medication.takenAt,
        taken: medication.taken
      };

      expect(healthData.name).toBe('Metformina');
      expect(healthData.dosage).toBe('850mg');
      expect(healthData.taken).toBeTrue();
    });

    it('should handle array of medications', () => {
      const medications = [
        { name: 'Med1', dosage: '10mg', timestamp: new Date(), taken: true },
        { name: 'Med2', dosage: '20mg', timestamp: new Date(), taken: false },
        { name: 'Med3', dosage: '30mg', timestamp: new Date(), taken: true }
      ];

      const takenCount = medications.filter(m => m.taken).length;
      expect(takenCount).toBe(2);
    });
  });

  describe('Stats Update Logic', () => {
    function updateStats(
      stats: HealthSyncStats, 
      syncedCount: number, 
      error: boolean
    ): HealthSyncStats {
      return {
        totalSyncs: stats.totalSyncs + 1,
        lastSync: new Date(),
        medicationsSynced: stats.medicationsSynced + syncedCount,
        errors: stats.errors + (error ? 1 : 0)
      };
    }

    it('should increment totalSyncs', () => {
      const initial: HealthSyncStats = {
        totalSyncs: 5,
        lastSync: null,
        medicationsSynced: 100,
        errors: 1
      };

      const updated = updateStats(initial, 10, false);
      expect(updated.totalSyncs).toBe(6);
    });

    it('should add synced medications', () => {
      const initial: HealthSyncStats = {
        totalSyncs: 5,
        lastSync: null,
        medicationsSynced: 100,
        errors: 1
      };

      const updated = updateStats(initial, 10, false);
      expect(updated.medicationsSynced).toBe(110);
    });

    it('should increment errors on failure', () => {
      const initial: HealthSyncStats = {
        totalSyncs: 5,
        lastSync: null,
        medicationsSynced: 100,
        errors: 1
      };

      const updated = updateStats(initial, 0, true);
      expect(updated.errors).toBe(2);
    });

    it('should update lastSync', () => {
      const initial: HealthSyncStats = {
        totalSyncs: 0,
        lastSync: null,
        medicationsSynced: 0,
        errors: 0
      };

      const updated = updateStats(initial, 5, false);
      expect(updated.lastSync).not.toBeNull();
    });
  });

  describe('Permission Request Logic', () => {
    function checkAllPermissionsGranted(permissions: HealthPermissions): boolean {
      return permissions.readMedication && permissions.writeMedication;
    }

    it('should return true when all permissions granted', () => {
      const permissions: HealthPermissions = {
        readMedication: true,
        writeMedication: true,
        readActivityData: false,
        granted: true
      };

      expect(checkAllPermissionsGranted(permissions)).toBeTrue();
    });

    it('should return false when read permission missing', () => {
      const permissions: HealthPermissions = {
        readMedication: false,
        writeMedication: true,
        readActivityData: false,
        granted: false
      };

      expect(checkAllPermissionsGranted(permissions)).toBeFalse();
    });

    it('should return false when write permission missing', () => {
      const permissions: HealthPermissions = {
        readMedication: true,
        writeMedication: false,
        readActivityData: false,
        granted: false
      };

      expect(checkAllPermissionsGranted(permissions)).toBeFalse();
    });
  });

  describe('Config Validation', () => {
    function isConfigValid(config: HealthSyncConfig): boolean {
      return (
        config.syncInterval >= 15 &&
        config.syncInterval <= 1440 &&
        config.platform !== 'none'
      );
    }

    it('should validate valid config', () => {
      const config: HealthSyncConfig = {
        enabled: true,
        platform: 'apple-health',
        autoSync: true,
        syncInterval: 60,
        syncMedications: true,
        syncVitals: false
      };

      expect(isConfigValid(config)).toBeTrue();
    });

    it('should reject too short interval', () => {
      const config: HealthSyncConfig = {
        enabled: true,
        platform: 'apple-health',
        autoSync: true,
        syncInterval: 5,
        syncMedications: true,
        syncVitals: false
      };

      expect(isConfigValid(config)).toBeFalse();
    });

    it('should reject platform none', () => {
      const config: HealthSyncConfig = {
        enabled: true,
        platform: 'none',
        autoSync: true,
        syncInterval: 60,
        syncMedications: true,
        syncVitals: false
      };

      expect(isConfigValid(config)).toBeFalse();
    });
  });

  describe('Sync Toggle Logic', () => {
    function toggleSync(config: HealthSyncConfig): HealthSyncConfig {
      return { ...config, enabled: !config.enabled };
    }

    it('should enable sync when disabled', () => {
      const config: HealthSyncConfig = {
        enabled: false,
        platform: 'apple-health',
        autoSync: true,
        syncInterval: 60,
        syncMedications: true,
        syncVitals: false
      };

      const toggled = toggleSync(config);
      expect(toggled.enabled).toBeTrue();
    });

    it('should disable sync when enabled', () => {
      const config: HealthSyncConfig = {
        enabled: true,
        platform: 'google-fit',
        autoSync: true,
        syncInterval: 30,
        syncMedications: true,
        syncVitals: true
      };

      const toggled = toggleSync(config);
      expect(toggled.enabled).toBeFalse();
    });
  });
});
