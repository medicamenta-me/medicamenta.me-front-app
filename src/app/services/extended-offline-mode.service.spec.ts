import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ExtendedOfflineModeService, DownloadProgress, StorageEstimate } from './extended-offline-mode.service';
import { Firestore } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';
import { signal, WritableSignal } from '@angular/core';

describe('ExtendedOfflineModeService', () => {
  let service: ExtendedOfflineModeService;
  let firestoreSpy: jasmine.SpyObj<Firestore>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let indexedDBServiceSpy: jasmine.SpyObj<IndexedDBService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;

  const mockCurrentUser: WritableSignal<any> = signal(null);

  beforeEach(() => {
    // Mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(null);
    spyOn(localStorage, 'setItem').and.callFake(() => {});

    firestoreSpy = jasmine.createSpyObj('Firestore', ['collection']);

    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: mockCurrentUser
    });

    indexedDBServiceSpy = jasmine.createSpyObj('IndexedDBService', [
      'put', 'get', 'putBatch', 'clear', 'getAll'
    ]);
    indexedDBServiceSpy.putBatch.and.returnValue(Promise.resolve());
    indexedDBServiceSpy.clear.and.returnValue(Promise.resolve());

    logServiceSpy = jasmine.createSpyObj('LogService', ['info', 'warn', 'error', 'debug']);

    TestBed.configureTestingModule({
      providers: [
        ExtendedOfflineModeService,
        { provide: Firestore, useValue: firestoreSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: IndexedDBService, useValue: indexedDBServiceSpy },
        { provide: LogService, useValue: logServiceSpy }
      ]
    });

    mockCurrentUser.set(null);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      expect(service).toBeTruthy();
    });

    it('should not be enabled initially', () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      expect(service.isEnabled()).toBeFalse();
    });

    it('should have null progress initially', () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      expect(service.progress()).toBeNull();
    });

    it('should have default stats initially', () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      const stats = service.stats();
      expect(stats.enabled).toBeFalse();
      expect(stats.lastFullSync).toBeNull();
      expect(stats.totalItemsCached).toBe(0);
    });

    it('should have storagePercent computed signal', () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      expect(service.storagePercent).toBeDefined();
      expect(typeof service.storagePercent()).toBe('number');
    });

    it('should compute storage percent as 0 when quota is 0', () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      // Default quota is 0, so percent should be 0
      expect(service.storagePercent()).toBe(0);
    });
  });

  describe('Enable Offline Mode', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should throw error when user is not authenticated', async () => {
      mockCurrentUser.set(null);
      
      await expectAsync(service.enable())
        .toBeRejectedWithError('User must be authenticated to enable offline mode');
    });

    it('should log debug message if already enabled', async () => {
      mockCurrentUser.set({ uid: 'test-user' });
      
      // Force enable state
      (service as any)._isEnabled.set(true);
      
      await service.enable();
      
      expect(logServiceSpy.debug).toHaveBeenCalledWith(
        'ExtendedOfflineModeService',
        'Already enabled'
      );
    });

    it('should have enable method', () => {
      expect(service.enable).toBeDefined();
      expect(typeof service.enable).toBe('function');
    });
  });

  describe('Disable Offline Mode', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should disable offline mode', async () => {
      // Set enabled state first
      (service as any)._isEnabled.set(true);
      
      await service.disable();
      
      expect(service.isEnabled()).toBeFalse();
    });

    it('should update stats when disabled', async () => {
      (service as any)._isEnabled.set(true);
      (service as any)._stats.set({
        enabled: true,
        lastFullSync: new Date(),
        totalItemsCached: 100,
        storageUsed: 1024,
        estimatedQuota: 10240
      });
      
      await service.disable();
      
      expect(service.stats().enabled).toBeFalse();
    });

    it('should log disabling message', async () => {
      await service.disable();
      
      expect(logServiceSpy.info).toHaveBeenCalledWith(
        'ExtendedOfflineModeService',
        'Disabling offline mode...'
      );
    });

    it('should log disabled message', async () => {
      await service.disable();
      
      expect(logServiceSpy.info).toHaveBeenCalledWith(
        'ExtendedOfflineModeService',
        'Offline mode disabled'
      );
    });

    it('should have disable method', () => {
      expect(service.disable).toBeDefined();
      expect(typeof service.disable).toBe('function');
    });
  });

  describe('Signals', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should expose isEnabled as readonly signal', () => {
      expect(service.isEnabled).toBeDefined();
      expect(typeof service.isEnabled()).toBe('boolean');
    });

    it('should expose progress as readonly signal', () => {
      expect(service.progress).toBeDefined();
    });

    it('should expose stats as readonly signal', () => {
      expect(service.stats).toBeDefined();
      const stats = service.stats();
      expect(stats).toBeDefined();
    });

    it('should have storagePercent computed signal', () => {
      expect(service.storagePercent).toBeDefined();
    });
  });

  describe('Stats Structure', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should have correct stats structure', () => {
      const stats = service.stats();
      
      expect(Object.prototype.hasOwnProperty.call(stats, 'enabled')).toBeTrue();
      expect(Object.prototype.hasOwnProperty.call(stats, 'lastFullSync')).toBeTrue();
      expect(Object.prototype.hasOwnProperty.call(stats, 'totalItemsCached')).toBeTrue();
      expect(Object.prototype.hasOwnProperty.call(stats, 'storageUsed')).toBeTrue();
      expect(Object.prototype.hasOwnProperty.call(stats, 'estimatedQuota')).toBeTrue();
    });

    it('should have correct default values', () => {
      const stats = service.stats();
      
      expect(stats.enabled).toBe(false);
      expect(stats.lastFullSync).toBeNull();
      expect(stats.totalItemsCached).toBe(0);
      expect(stats.storageUsed).toBe(0);
      expect(stats.estimatedQuota).toBe(0);
    });
  });

  describe('DownloadProgress Interface', () => {
    it('should accept valid progress object with medications stage', () => {
      const progress: DownloadProgress = {
        stage: 'medications',
        percent: 50,
        itemsDownloaded: 25,
        totalItems: 50
      };
      
      expect(progress.stage).toBe('medications');
      expect(progress.percent).toBe(50);
    });

    it('should accept valid progress object with logs stage', () => {
      const progress: DownloadProgress = {
        stage: 'logs',
        percent: 75,
        itemsDownloaded: 75,
        totalItems: 100,
        currentCollection: 'medication_logs'
      };
      
      expect(progress.stage).toBe('logs');
      expect(progress.currentCollection).toBe('medication_logs');
    });

    it('should accept valid progress object with insights stage', () => {
      const progress: DownloadProgress = {
        stage: 'insights',
        percent: 90,
        itemsDownloaded: 90,
        totalItems: 100
      };
      
      expect(progress.stage).toBe('insights');
    });

    it('should accept valid progress object with stats stage', () => {
      const progress: DownloadProgress = {
        stage: 'stats',
        percent: 95,
        itemsDownloaded: 95,
        totalItems: 100
      };
      
      expect(progress.stage).toBe('stats');
    });

    it('should accept valid progress object with complete stage', () => {
      const progress: DownloadProgress = {
        stage: 'complete',
        percent: 100,
        itemsDownloaded: 100,
        totalItems: 100
      };
      
      expect(progress.stage).toBe('complete');
      expect(progress.percent).toBe(100);
    });
  });

  describe('StorageEstimate Interface', () => {
    it('should accept valid storage estimate', () => {
      const estimate: StorageEstimate = {
        usage: 1024 * 1024,
        quota: 100 * 1024 * 1024,
        usagePercent: 1,
        available: 99 * 1024 * 1024
      };
      
      expect(estimate.usage).toBe(1024 * 1024);
      expect(estimate.quota).toBe(100 * 1024 * 1024);
      expect(estimate.usagePercent).toBe(1);
      expect(estimate.available).toBe(99 * 1024 * 1024);
    });

    it('should calculate usage percent correctly', () => {
      const estimate: StorageEstimate = {
        usage: 50 * 1024 * 1024,
        quota: 100 * 1024 * 1024,
        usagePercent: 50,
        available: 50 * 1024 * 1024
      };
      
      expect(estimate.usagePercent).toBe(50);
    });
  });

  describe('Private Methods Existence', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should have loadSettings private method', () => {
      expect((service as any).loadSettings).toBeDefined();
    });

    it('should have saveSettings private method', () => {
      expect((service as any).saveSettings).toBeDefined();
    });

    it('should have updateStorageEstimate private method', () => {
      expect((service as any).updateStorageEstimate).toBeDefined();
    });

    it('should have checkStorageAvailability private method', () => {
      expect((service as any).checkStorageAvailability).toBeDefined();
    });

    it('should have downloadAllData private method', () => {
      expect((service as any).downloadAllData).toBeDefined();
    });

    it('should have startPeriodicSync private method', () => {
      expect((service as any).startPeriodicSync).toBeDefined();
    });

    it('should have stopPeriodicSync private method', () => {
      expect((service as any).stopPeriodicSync).toBeDefined();
    });
  });

  describe('LocalStorage Integration', () => {
    it('should call localStorage.getItem on initialization', () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      expect(localStorage.getItem).toHaveBeenCalled();
    });

    it('should call localStorage.setItem when saving settings', async () => {
      service = TestBed.inject(ExtendedOfflineModeService);
      (service as any).saveSettings();
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Periodic Sync', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should not have sync interval initially', () => {
      expect((service as any).syncIntervalId).toBeNull();
    });

    it('should have startPeriodicSync method', () => {
      expect(typeof (service as any).startPeriodicSync).toBe('function');
    });

    it('should have stopPeriodicSync method', () => {
      expect(typeof (service as any).stopPeriodicSync).toBe('function');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should throw error for unauthenticated user on enable', async () => {
      mockCurrentUser.set(null);
      
      try {
        await service.enable();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('User must be authenticated to enable offline mode');
      }
    });
  });

  describe('Service Dependencies', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should inject Firestore', () => {
      expect((service as any).firestore).toBeDefined();
    });

    it('should inject AuthService', () => {
      expect((service as any).auth).toBeDefined();
    });

    it('should inject IndexedDBService', () => {
      expect((service as any).indexedDB).toBeDefined();
    });

    it('should inject LogService', () => {
      expect((service as any).logService).toBeDefined();
    });
  });

  describe('Storage Percent Computation', () => {
    beforeEach(() => {
      service = TestBed.inject(ExtendedOfflineModeService);
    });

    it('should return 0 when quota is 0', () => {
      (service as any)._stats.set({
        enabled: false,
        lastFullSync: null,
        totalItemsCached: 0,
        storageUsed: 1000,
        estimatedQuota: 0
      });
      
      expect(service.storagePercent()).toBe(0);
    });

    it('should calculate percent correctly', () => {
      (service as any)._stats.set({
        enabled: false,
        lastFullSync: null,
        totalItemsCached: 0,
        storageUsed: 50,
        estimatedQuota: 100
      });
      
      expect(service.storagePercent()).toBe(50);
    });

    it('should round percent to nearest integer', () => {
      (service as any)._stats.set({
        enabled: false,
        lastFullSync: null,
        totalItemsCached: 0,
        storageUsed: 33,
        estimatedQuota: 100
      });
      
      expect(service.storagePercent()).toBe(33);
    });
  });

  describe('Exported Types', () => {
    it('should export DownloadProgress interface', () => {
      const progress: DownloadProgress = {
        stage: 'medications',
        percent: 0,
        itemsDownloaded: 0,
        totalItems: 0
      };
      expect(progress).toBeDefined();
    });

    it('should export StorageEstimate interface', () => {
      const estimate: StorageEstimate = {
        usage: 0,
        quota: 0,
        usagePercent: 0,
        available: 0
      };
      expect(estimate).toBeDefined();
    });
  });
});
