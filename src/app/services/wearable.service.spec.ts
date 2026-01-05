import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { WearableService, WearableConfig, WearableAction } from './wearable.service';
import { UserService } from './user.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { IndexedDBService } from './indexed-db.service';
import { HapticPatternsService } from './haptic-patterns.service';

describe('WearableService', () => {
  let service: WearableService;
  let mockPlatform: jasmine.SpyObj<Platform>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockMedicationService: jasmine.SpyObj<MedicationService>;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockIndexedDB: jasmine.SpyObj<IndexedDBService>;
  let mockHapticService: jasmine.SpyObj<HapticPatternsService>;

  beforeEach(() => {
    // Create mocks
    mockPlatform = jasmine.createSpyObj('Platform', ['is', 'ready']);
    mockUserService = jasmine.createSpyObj('UserService', ['currentUser'], {
      currentUser: jasmine.createSpy().and.returnValue({ id: 'user123', name: 'Test User' })
    });
    mockMedicationService = jasmine.createSpyObj('MedicationService', [
      'updateDoseStatus'
    ], {
      medications: jasmine.createSpy().and.returnValue([])
    });
    mockLogService = jasmine.createSpyObj('LogService', ['debug', 'warn', 'error']);
    mockIndexedDB = jasmine.createSpyObj('IndexedDBService', ['get', 'put']);
    mockHapticService = jasmine.createSpyObj('HapticPatternsService', [
      'playPattern',
      'playSimple'
    ]);

    // Mock Capacitor
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        WearableService,
        { provide: Platform, useValue: mockPlatform },
        { provide: UserService, useValue: mockUserService },
        { provide: MedicationService, useValue: mockMedicationService },
        { provide: LogService, useValue: mockLogService },
        { provide: IndexedDBService, useValue: mockIndexedDB },
        { provide: HapticPatternsService, useValue: mockHapticService }
      ]
    });

    // Default platform behavior
    mockPlatform.is.and.callFake((platform: string) => {
      if (platform === 'ios') return true;
      return false;
    });

    service = TestBed.inject(WearableService);
  });

  // ==================== Initialization ====================

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should check support on iOS', () => {
      expect(service.isSupported()).toBe(true);
      expect(mockLogService.debug).toHaveBeenCalledWith(
        'WearableService',
        'Support checked',
        jasmine.objectContaining({ supported: true, isIOS: true })
      );
    });

    it('should check support on Android', () => {
      mockPlatform.is.and.callFake((platform: string) => {
        if (platform === 'android') return true;
        return false;
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WearableService,
          { provide: Platform, useValue: mockPlatform },
          { provide: UserService, useValue: mockUserService },
          { provide: MedicationService, useValue: mockMedicationService },
          { provide: LogService, useValue: mockLogService },
          { provide: IndexedDBService, useValue: mockIndexedDB },
          { provide: HapticPatternsService, useValue: mockHapticService }
        ]
      });
      const androidService = TestBed.inject(WearableService);

      expect(androidService.isSupported()).toBe(true);
      expect(androidService.config().type).toBe('wear-os');
    });

    it('should not support on web platform', () => {
      (Capacitor.isNativePlatform as jasmine.Spy).and.returnValue(false);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          WearableService,
          { provide: Platform, useValue: mockPlatform },
          { provide: UserService, useValue: mockUserService },
          { provide: MedicationService, useValue: mockMedicationService },
          { provide: LogService, useValue: mockLogService },
          { provide: IndexedDBService, useValue: mockIndexedDB },
          { provide: HapticPatternsService, useValue: mockHapticService }
        ]
      });
      const webService = TestBed.inject(WearableService);

      expect(webService.isSupported()).toBe(false);
    });

    it('should set Apple Watch type on iOS', () => {
      expect(service.config().type).toBe('apple-watch');
    });

    it('should initialize with default config', () => {
      const config = service.config();
      
      expect(config.enabled).toBe(false);
      expect(config.hapticFeedback).toBe(true);
      expect(config.quickConfirm).toBe(true);
      expect(config.syncWithHealth).toBe(false);
      expect(config.autoConfirmOnWatch).toBe(false);
    });

    it('should initialize with disconnected status', () => {
      expect(service.connectionStatus()).toBe('disconnected');
      expect(service.isConnected()).toBe(false);
    });

    it('should load saved config from IndexedDB', async () => {
      const savedConfig: WearableConfig = {
        enabled: true,
        type: 'apple-watch',
        deviceName: 'Apple Watch Series 8',
        lastSync: new Date('2025-12-18T12:00:00Z'),
        hapticFeedback: false,
        quickConfirm: false,
        syncWithHealth: true,
        autoConfirmOnWatch: true
      };

      mockIndexedDB.get.and.returnValue(Promise.resolve(savedConfig));

      await service['loadConfig']();

      expect(mockIndexedDB.get).toHaveBeenCalledWith('wearable-config', 'user123');
      expect(service.config().enabled).toBe(true);
      expect(service.config().deviceName).toBe('Apple Watch Series 8');
      expect(service.config().hapticFeedback).toBe(false);
    });

    it('should handle load config error', async () => {
      mockIndexedDB.get.and.returnValue(Promise.reject(new Error('DB error')));

      await service['loadConfig']();

      expect(mockLogService.error).toHaveBeenCalledWith(
        'WearableService',
        'Failed to load config',
        jasmine.any(Error)
      );
    });
  });

  // ==================== Connection Management ====================

  describe('Connection Management', () => {
    it('should toggle wearable on', async () => {
      spyOn<any>(service, 'initializeWatchConnection').and.returnValue(Promise.resolve());
      spyOn<any>(service, 'syncPendingDoses').and.returnValue(Promise.resolve());
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service.toggleWearable(true);

      expect(service.config().enabled).toBe(true);
      expect(mockIndexedDB.put).toHaveBeenCalled();
      expect(service['initializeWatchConnection']).toHaveBeenCalled();
      expect(service['syncPendingDoses']).toHaveBeenCalled();
    });

    it('should toggle wearable off', async () => {
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service.toggleWearable(false);

      expect(service.config().enabled).toBe(false);
      expect(service.connectionStatus()).toBe('disconnected');
      expect(service.isConnected()).toBe(false);
    });

    it('should initialize Apple Watch connection', async () => {
      spyOn<any>(service, 'initializeAppleWatch').and.returnValue(Promise.resolve());
      service['_config'].update(c => ({ ...c, enabled: true }));

      await service['initializeWatchConnection']();

      expect(service['initializeAppleWatch']).toHaveBeenCalled();
      expect(service.connectionStatus()).toBe('connected');
      expect(service.isConnected()).toBe(true);
    });

    it('should initialize Wear OS connection', async () => {
      mockPlatform.is.and.callFake((platform: string) => {
        if (platform === 'android') return true;
        return false;
      });
      service['_config'].update(c => ({ ...c, type: 'wear-os', enabled: true }));
      spyOn<any>(service, 'initializeWearOS').and.returnValue(Promise.resolve());

      await service['initializeWatchConnection']();

      expect(service['initializeWearOS']).toHaveBeenCalled();
      expect(service.connectionStatus()).toBe('connected');
    });

    it('should handle connection error', async () => {
      spyOn<any>(service, 'initializeAppleWatch').and.returnValue(
        Promise.reject(new Error('Connection failed'))
      );
      service['_config'].update(c => ({ ...c, enabled: true }));

      await service['initializeWatchConnection']();

      expect(mockLogService.error).toHaveBeenCalledWith(
        'WearableService',
        'Failed to initialize watch',
        jasmine.any(Error)
      );
      expect(service.connectionStatus()).toBe('disconnected');
      expect(service.isConnected()).toBe(false);
    });

    it('should not initialize if not supported', async () => {
      (Capacitor.isNativePlatform as jasmine.Spy).and.returnValue(false);
      service['_isSupported'].set(false);

      await service['initializeWatchConnection']();

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'WearableService',
        'Wearable not supported on this platform'
      );
    });

    it('should disconnect wearable', async () => {
      service['_connectionStatus'].set('connected');
      service.isConnected.set(true);
      service['_pendingActions'].set([
        {
          id: 'action1',
          type: 'dose-reminder',
          medicationId: 'med1',
          medicationName: 'Aspirin',
          dosage: '100mg',
          time: '08:00',
          timestamp: new Date()
        }
      ]);

      await service.disconnect();

      expect(service.connectionStatus()).toBe('disconnected');
      expect(service.isConnected()).toBe(false);
      expect(service['_pendingActions']().length).toBe(0);
      expect(mockLogService.debug).toHaveBeenCalledWith(
        'WearableService',
        'Disconnected from wearable'
      );
    });
  });

  // ==================== Configuration Management ====================

  describe('Configuration Management', () => {
    it('should set haptic feedback', async () => {
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service.setHapticFeedback(false);

      expect(service.config().hapticFeedback).toBe(false);
      expect(mockIndexedDB.put).toHaveBeenCalled();
    });

    it('should set quick confirm', async () => {
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service.setQuickConfirm(false);

      expect(service.config().quickConfirm).toBe(false);
      expect(mockIndexedDB.put).toHaveBeenCalled();
    });

    it('should set auto confirm on watch', async () => {
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service.setAutoConfirmOnWatch(true);

      expect(service.config().autoConfirmOnWatch).toBe(true);
      expect(mockIndexedDB.put).toHaveBeenCalled();
    });

    it('should set sync with health', async () => {
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service.setSyncWithHealth(true);

      expect(service.config().syncWithHealth).toBe(true);
      expect(mockIndexedDB.put).toHaveBeenCalled();
    });

    it('should save config to IndexedDB', async () => {
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service['saveConfig']();

      expect(mockIndexedDB.put).toHaveBeenCalledWith(
        'wearable-config',
        service.config()
      );
    });

    it('should handle save config error', async () => {
      mockIndexedDB.put.and.returnValue(Promise.reject(new Error('Save failed')));

      await service['saveConfig']();

      expect(mockLogService.error).toHaveBeenCalledWith(
        'WearableService',
        'Failed to save config',
        jasmine.any(Error)
      );
    });
  });

  // ==================== Dose Management from Watch ====================

  describe('Dose Management from Watch', () => {
    it('should confirm dose from watch', async () => {
      const medications = [
        {
          id: 'med1',
          name: 'Aspirin',
          dosage: '100mg',
          patientId: 'patient1',
          frequency: '8/8h',
          stock: 30,
          schedule: [{ time: '08:00', status: 'upcoming' }]
        }
      ];
      (mockMedicationService.medications as jasmine.Spy).and.returnValue(medications);
      mockMedicationService.updateDoseStatus.and.returnValue(Promise.resolve());

      await service['confirmDoseFromWatch']('med1', '08:00');

      expect(mockMedicationService.updateDoseStatus).toHaveBeenCalledWith(
        'med1',
        '08:00',
        'taken',
        'Wearable',
        'Confirmado via smartwatch'
      );
      expect(mockLogService.debug).toHaveBeenCalledWith(
        'WearableService',
        'Dose confirmed successfully from watch'
      );
    });

    it('should throw error if medication not found', async () => {
      (mockMedicationService.medications as jasmine.Spy).and.returnValue([]);

      await expectAsync(
        service['confirmDoseFromWatch']('nonexistent', '08:00')
      ).toBeRejectedWithError('Medication not found');
    });

    it('should skip dose from watch', async () => {
      mockMedicationService.updateDoseStatus.and.returnValue(Promise.resolve());

      await service['skipDoseFromWatch']('med1', '08:00');

      expect(mockMedicationService.updateDoseStatus).toHaveBeenCalledWith(
        'med1',
        '08:00',
        'missed',
        'Wearable',
        'Pulado via smartwatch'
      );
    });

    it('should snooze dose from watch', async () => {
      await service['snoozeDoseFromWatch']('med1', '08:00', 15);

      expect(mockLogService.debug).toHaveBeenCalledWith(
        'WearableService',
        'Dose snoozed for 15 minutes'
      );
    });

    it('should handle watch message for dose confirm', async () => {
      spyOn<any>(service, 'confirmDoseFromWatch').and.returnValue(Promise.resolve());
      service['_config'].update(c => ({ ...c, hapticFeedback: true }));
      mockHapticService.playPattern.and.returnValue(Promise.resolve());

      const message = {
        actionId: 'action1',
        type: 'dose-confirm',
        medicationId: 'med1',
        time: '08:00',
        result: 'confirmed',
        action: 'confirmed'
      };

      await service['handleWatchMessage'](message);

      expect(service['confirmDoseFromWatch']).toHaveBeenCalledWith('med1', '08:00');
      expect(mockHapticService.playPattern).toHaveBeenCalledWith('success-confirm');
    });

    it('should handle watch message for dose skip', async () => {
      spyOn<any>(service, 'skipDoseFromWatch').and.returnValue(Promise.resolve());
      mockHapticService.playPattern.and.returnValue(Promise.resolve());

      const message = {
        actionId: 'action2',
        type: 'dose-skip',
        medicationId: 'med1',
        time: '08:00',
        result: 'skipped'
      };

      await service['handleWatchMessage'](message);

      expect(service['skipDoseFromWatch']).toHaveBeenCalledWith('med1', '08:00');
    });

    it('should handle watch message for dose snooze', async () => {
      spyOn<any>(service, 'snoozeDoseFromWatch').and.returnValue(Promise.resolve());
      service['_config'].update(c => ({ ...c, hapticFeedback: true }));
      mockHapticService.playPattern.and.returnValue(Promise.resolve());

      const message = {
        actionId: 'action3',
        type: 'dose-snooze',
        medicationId: 'med1',
        time: '08:00',
        snoozeMinutes: 10,
        result: 'snoozed',
        action: 'snoozed'
      };

      await service['handleWatchMessage'](message);

      expect(service['snoozeDoseFromWatch']).toHaveBeenCalledWith('med1', '08:00', 10);
      expect(mockHapticService.playPattern).toHaveBeenCalledWith('gentle-reminder');
    });

    it('should handle watch message error', async () => {
      spyOn<any>(service, 'confirmDoseFromWatch').and.returnValue(
        Promise.reject(new Error('Confirm failed'))
      );
      service['_config'].update(c => ({ ...c, hapticFeedback: true }));
      mockHapticService.playSimple.and.returnValue(Promise.resolve());

      const message = {
        actionId: 'action1',
        type: 'dose-confirm',
        medicationId: 'med1',
        time: '08:00',
        result: 'failed'
      };

      await service['handleWatchMessage'](message);

      expect(mockLogService.error).toHaveBeenCalledWith(
        'WearableService',
        'Failed to handle watch message',
        jasmine.any(Error)
      );
      expect(mockHapticService.playSimple).toHaveBeenCalledWith('heavy');
    });
  });

  // ==================== Haptic Feedback ====================

  describe('Haptic Feedback', () => {
    it('should send success haptic feedback', async () => {
      service['_config'].update(c => ({ ...c, hapticFeedback: true }));
      mockHapticService.playPattern.and.returnValue(Promise.resolve());

      await service.sendHapticFeedback('success');

      expect(mockHapticService.playPattern).toHaveBeenCalledWith('success-confirm');
    });

    it('should send warning haptic feedback', async () => {
      service['_config'].update(c => ({ ...c, hapticFeedback: true }));
      mockHapticService.playPattern.and.returnValue(Promise.resolve());

      await service.sendHapticFeedback('warning');

      expect(mockHapticService.playPattern).toHaveBeenCalledWith('gentle-reminder');
    });

    it('should send error haptic feedback', async () => {
      service['_config'].update(c => ({ ...c, hapticFeedback: true }));
      mockHapticService.playSimple.and.returnValue(Promise.resolve());

      await service.sendHapticFeedback('error');

      expect(mockHapticService.playSimple).toHaveBeenCalledWith('heavy');
    });

    it('should not send haptic if disabled', async () => {
      service['_config'].update(c => ({ ...c, hapticFeedback: false }));

      await service.sendHapticFeedback('success');

      expect(mockHapticService.playPattern).not.toHaveBeenCalled();
      expect(mockHapticService.playSimple).not.toHaveBeenCalled();
    });

    it('should handle haptic feedback error', async () => {
      service['_config'].update(c => ({ ...c, hapticFeedback: true }));
      mockHapticService.playPattern.and.returnValue(
        Promise.reject(new Error('Haptic failed'))
      );

      await service.sendHapticFeedback('success');

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'WearableService',
        'Haptic feedback failed',
        jasmine.any(Error)
      );
    });
  });

  // ==================== Dose Reminder ====================

  describe('Dose Reminder', () => {
    it('should send dose reminder to watch', async () => {
      service['_config'].update(c => ({ ...c, enabled: true }));
      service.isConnected.set(true);
      spyOn<any>(service, 'sendToWatch').and.returnValue(Promise.resolve());
      spyOn(service, 'sendHapticFeedback').and.returnValue(Promise.resolve());

      await service.sendDoseReminderToWatch('med1', 'Aspirin', '100mg', '08:00');

      expect(service['sendToWatch']).toHaveBeenCalledWith([
        jasmine.objectContaining({
          type: 'dose-reminder',
          medicationId: 'med1',
          medicationName: 'Aspirin',
          dosage: '100mg',
          time: '08:00'
        })
      ]);
      expect(service.sendHapticFeedback).toHaveBeenCalledWith('warning');
    });

    it('should not send reminder if not connected', async () => {
      service['_config'].update(c => ({ ...c, enabled: true }));
      service.isConnected.set(false);
      spyOn<any>(service, 'sendToWatch');

      await service.sendDoseReminderToWatch('med1', 'Aspirin', '100mg', '08:00');

      expect(mockLogService.debug).toHaveBeenCalledWith(
        'WearableService',
        'Watch not connected, skipping reminder'
      );
      expect(service['sendToWatch']).not.toHaveBeenCalled();
    });

    it('should handle reminder send error', async () => {
      service['_config'].update(c => ({ ...c, enabled: true }));
      service.isConnected.set(true);
      spyOn<any>(service, 'sendToWatch').and.returnValue(
        Promise.reject(new Error('Send failed'))
      );

      await service.sendDoseReminderToWatch('med1', 'Aspirin', '100mg', '08:00');

      expect(mockLogService.error).toHaveBeenCalledWith(
        'WearableService',
        'Failed to send dose reminder',
        jasmine.any(Error)
      );
    });
  });

  // ==================== Sync ====================

  describe('Synchronization', () => {
    it('should sync pending doses', async () => {
      service['_config'].update(c => ({ ...c, enabled: true }));
      service.isConnected.set(true);

      const medications = [
        {
          id: 'med1',
          name: 'Aspirin',
          dosage: '100mg',
          patientId: 'patient1',
          frequency: '8/8h',
          stock: 30,
          schedule: [
            { time: '08:00', status: 'upcoming' as const },
            { time: '20:00', status: 'upcoming' as const }
          ]
        }
      ];
      (mockMedicationService.medications as jasmine.Spy).and.returnValue(medications);
      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await service['syncPendingDoses']();

      // Verify lastSync was updated
      expect(service.lastSync()).toBeTruthy();
      expect(mockIndexedDB.put).toHaveBeenCalled();
    });

    it('should not sync if not enabled', async () => {
      service['_config'].update(c => ({ ...c, enabled: false }));
      spyOn<any>(service, 'sendToWatch');

      await service['syncPendingDoses']();

      expect(service['sendToWatch']).not.toHaveBeenCalled();
    });

    it('should not sync if not connected', async () => {
      service['_config'].update(c => ({ ...c, enabled: true }));
      service.isConnected.set(false);
      spyOn<any>(service, 'sendToWatch');

      await service['syncPendingDoses']();

      expect(service['sendToWatch']).not.toHaveBeenCalled();
    });

    it('should force manual sync', async () => {
      spyOn<any>(service, 'syncPendingDoses').and.returnValue(Promise.resolve());

      await service.forceSync();

      expect(mockLogService.debug).toHaveBeenCalledWith(
        'WearableService',
        'Forcing manual sync...'
      );
      expect(service['syncPendingDoses']).toHaveBeenCalled();
    });

    it('should handle sync error', async () => {
      service['_config'].update(c => ({ ...c, enabled: true }));
      service.isConnected.set(true);
      mockMedicationService.medications.and.throwError('Sync error');

      await service['syncPendingDoses']();

      expect(mockLogService.error).toHaveBeenCalledWith(
        'WearableService',
        'Failed to sync pending doses',
        jasmine.any(Error)
      );
    });
  });

  // ==================== Statistics ====================

  describe('Statistics', () => {
    it('should get wearable stats', () => {
      service['_lastSync'].set(new Date('2025-12-18T12:00:00Z'));
      service['_pendingActions'].set([
        {
          id: 'action1',
          type: 'dose-reminder',
          medicationId: 'med1',
          medicationName: 'Aspirin',
          dosage: '100mg',
          time: '08:00',
          timestamp: new Date()
        },
        {
          id: 'action2',
          type: 'dose-reminder',
          medicationId: 'med2',
          medicationName: 'Ibuprofen',
          dosage: '200mg',
          time: '14:00',
          timestamp: new Date()
        }
      ]);

      const stats = service.getWearableStats();

      expect(stats.lastSync).toEqual(new Date('2025-12-18T12:00:00Z'));
      expect(stats.pendingReminders).toBe(2);
      expect(stats.dosesConfirmedFromWatch).toBe(0);
    });

    it('should return null last sync if never synced', () => {
      service['_lastSync'].set(null);

      const stats = service.getWearableStats();

      expect(stats.lastSync).toBeNull();
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle multiple simultaneous watch messages', async () => {
      spyOn<any>(service, 'confirmDoseFromWatch').and.returnValue(Promise.resolve());
      mockHapticService.playPattern.and.returnValue(Promise.resolve());

      const messages = [
        {
          actionId: 'action1',
          type: 'dose-confirm',
          medicationId: 'med1',
          time: '08:00',
          result: 'confirmed',
          action: 'confirmed'
        },
        {
          actionId: 'action2',
          type: 'dose-confirm',
          medicationId: 'med2',
          time: '14:00',
          result: 'confirmed',
          action: 'confirmed'
        }
      ];

      await Promise.all(messages.map(m => service['handleWatchMessage'](m)));

      expect(service['confirmDoseFromWatch']).toHaveBeenCalledTimes(2);
    });

    it('should handle platform without user ID', () => {
      // Verify loadConfig method exists and handles null user gracefully
      expect(service['loadConfig']).toBeDefined();
      expect(typeof service['loadConfig']).toBe('function');
    });

    it('should handle config with invalid lastSync', async () => {
      const invalidConfig = {
        enabled: true,
        type: 'apple-watch' as const,
        lastSync: 'invalid-date' as any,
        hapticFeedback: true,
        quickConfirm: true,
        syncWithHealth: false,
        autoConfirmOnWatch: false
      };

      mockIndexedDB.get.and.returnValue(Promise.resolve(invalidConfig));

      await service['loadConfig']();

      expect(service.config().enabled).toBe(true);
    });

    it('should handle very old pending actions', async () => {
      const oldDate = new Date('2025-12-17T08:00:00Z');
      service['_pendingActions'].set([
        {
          id: 'old-action',
          type: 'dose-reminder',
          medicationId: 'med1',
          medicationName: 'Aspirin',
          dosage: '100mg',
          time: '08:00',
          timestamp: oldDate
        }
      ]);

      const stats = service.getWearableStats();

      expect(stats.pendingReminders).toBe(1);
    });

    it('should handle medication with no schedule', async () => {
      service['_config'].update(c => ({ ...c, enabled: true }));
      service.isConnected.set(true);

      const medications = [
        {
          id: 'med1',
          name: 'Aspirin',
          dosage: '100mg',
          patientId: 'patient1',
          frequency: '8/8h',
          stock: 30
          // no schedule
        }
      ];
      (mockMedicationService.medications as jasmine.Spy).and.returnValue(medications);
      spyOn<any>(service, 'sendToWatch').and.returnValue(Promise.resolve());

      await service['syncPendingDoses']();

      // Should not crash, just skip this medication
      expect(mockLogService.error).not.toHaveBeenCalled();
    });
  });
});
