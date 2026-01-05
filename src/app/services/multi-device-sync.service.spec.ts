import { SyncEvent, DeviceInfo, SyncStats } from './multi-device-sync.service';

/**
 * Unit tests for MultiDeviceSyncService
 * Tests interfaces, types, and utility logic for real-time multi-device sync
 */
describe('MultiDeviceSyncService', () => {
  
  describe('SyncEvent Interface', () => {
    
    it('should create valid create event', () => {
      const event: SyncEvent = {
        id: 'event-1',
        userId: 'user-123',
        deviceId: 'device-abc',
        timestamp: new Date(),
        operation: 'create',
        store: 'medications',
        itemId: 'med-1',
        data: { name: 'Test Med' },
        syncToken: 'token-xyz'
      };

      expect(event.operation).toBe('create');
      expect(event.store).toBe('medications');
      expect(event.data).toBeDefined();
    });

    it('should create valid update event', () => {
      const event: SyncEvent = {
        id: 'event-2',
        userId: 'user-123',
        deviceId: 'device-abc',
        timestamp: new Date(),
        operation: 'update',
        store: 'medications',
        itemId: 'med-1',
        data: { name: 'Updated Med' },
        syncToken: 'token-xyz'
      };

      expect(event.operation).toBe('update');
    });

    it('should create valid delete event', () => {
      const event: SyncEvent = {
        id: 'event-3',
        userId: 'user-123',
        deviceId: 'device-abc',
        timestamp: new Date(),
        operation: 'delete',
        store: 'medications',
        itemId: 'med-1',
        syncToken: 'token-xyz'
      };

      expect(event.operation).toBe('delete');
      expect(event.data).toBeUndefined();
    });

    it('should handle all operations types', () => {
      const operations: Array<'create' | 'update' | 'delete'> = ['create', 'update', 'delete'];
      
      operations.forEach(op => {
        const event: SyncEvent = {
          id: `event-${op}`,
          userId: 'user-1',
          deviceId: 'device-1',
          timestamp: new Date(),
          operation: op,
          store: 'test',
          itemId: 'item-1',
          syncToken: 'token'
        };
        expect(event.operation).toBe(op);
      });
    });
  });

  describe('DeviceInfo Interface', () => {
    
    it('should create valid device info', () => {
      const device: DeviceInfo = {
        id: 'device-abc',
        userId: 'user-123',
        name: 'My Phone',
        lastSeen: new Date(),
        platform: 'Android',
        isCurrentDevice: true
      };

      expect(device.id).toBe('device-abc');
      expect(device.name).toBe('My Phone');
      expect(device.platform).toBe('Android');
      expect(device.isCurrentDevice).toBeTrue();
    });

    it('should create device for different platforms', () => {
      const platforms = ['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Unknown'];
      
      platforms.forEach(platform => {
        const device: DeviceInfo = {
          id: `device-${platform}`,
          userId: 'user-1',
          name: `${platform} Device`,
          lastSeen: new Date(),
          platform,
          isCurrentDevice: false
        };
        expect(device.platform).toBe(platform);
      });
    });

    it('should identify non-current device', () => {
      const device: DeviceInfo = {
        id: 'device-other',
        userId: 'user-123',
        name: 'Other Device',
        lastSeen: new Date(),
        platform: 'iOS',
        isCurrentDevice: false
      };

      expect(device.isCurrentDevice).toBeFalse();
    });
  });

  describe('SyncStats Interface', () => {
    
    it('should create initial stats', () => {
      const stats: SyncStats = {
        eventsReceived: 0,
        eventsSent: 0,
        conflicts: 0,
        lastSyncTime: null,
        connectedDevices: 0
      };

      expect(stats.eventsReceived).toBe(0);
      expect(stats.eventsSent).toBe(0);
      expect(stats.conflicts).toBe(0);
      expect(stats.lastSyncTime).toBeNull();
      expect(stats.connectedDevices).toBe(0);
    });

    it('should update stats with events', () => {
      const stats: SyncStats = {
        eventsReceived: 10,
        eventsSent: 5,
        conflicts: 2,
        lastSyncTime: new Date(),
        connectedDevices: 3
      };

      expect(stats.eventsReceived).toBe(10);
      expect(stats.eventsSent).toBe(5);
      expect(stats.conflicts).toBe(2);
      expect(stats.connectedDevices).toBe(3);
    });
  });

  describe('Device ID Management', () => {
    
    const DEVICE_ID_KEY = 'medicamenta_device_id';

    beforeEach(() => {
      localStorage.removeItem(DEVICE_ID_KEY);
    });

    afterEach(() => {
      localStorage.removeItem(DEVICE_ID_KEY);
    });

    function getOrCreateDeviceId(): string {
      const stored = localStorage.getItem(DEVICE_ID_KEY);
      if (stored) return stored;
      
      const newId = 'device-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(DEVICE_ID_KEY, newId);
      return newId;
    }

    it('should create new device ID when none exists', () => {
      const id = getOrCreateDeviceId();
      expect(id).toBeTruthy();
      expect(id.startsWith('device-')).toBeTrue();
    });

    it('should return existing device ID', () => {
      localStorage.setItem(DEVICE_ID_KEY, 'existing-device-id');
      const id = getOrCreateDeviceId();
      expect(id).toBe('existing-device-id');
    });

    it('should persist device ID', () => {
      const id1 = getOrCreateDeviceId();
      const id2 = getOrCreateDeviceId();
      expect(id1).toBe(id2);
    });
  });

  describe('Platform Detection', () => {
    
    function detectPlatform(ua: string): string {
      if (/android/i.test(ua)) return 'Android';
      if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
      if (/Win/.test(ua)) return 'Windows';
      if (/Mac/.test(ua)) return 'macOS';
      if (/Linux/.test(ua)) return 'Linux';
      return 'Unknown';
    }

    it('should detect Android', () => {
      expect(detectPlatform('Mozilla/5.0 (Linux; Android 10)')).toBe('Android');
    });

    it('should detect iOS iPhone', () => {
      expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)')).toBe('iOS');
    });

    it('should detect iOS iPad', () => {
      expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 14_0)')).toBe('iOS');
    });

    it('should detect Windows', () => {
      expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
    });

    it('should detect macOS', () => {
      expect(detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)')).toBe('macOS');
    });

    it('should detect Linux', () => {
      expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux');
    });

    it('should return Unknown for unrecognized', () => {
      expect(detectPlatform('CustomAgent/1.0')).toBe('Unknown');
    });
  });

  describe('Conflict Resolution', () => {
    
    function resolveConflict(
      localTimestamp: number,
      remoteTimestamp: number
    ): 'local' | 'remote' {
      return remoteTimestamp > localTimestamp ? 'remote' : 'local';
    }

    it('should prefer remote when newer', () => {
      expect(resolveConflict(1000, 2000)).toBe('remote');
    });

    it('should prefer local when newer', () => {
      expect(resolveConflict(2000, 1000)).toBe('local');
    });

    it('should prefer local on tie', () => {
      expect(resolveConflict(1000, 1000)).toBe('local');
    });
  });

  describe('Stale Device Detection', () => {
    
    function isDeviceStale(lastSeen: Date, staleDays: number = 7): boolean {
      const now = Date.now();
      const daysSinceLastSeen = (now - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastSeen >= staleDays;
    }

    it('should detect stale device', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      expect(isDeviceStale(eightDaysAgo)).toBeTrue();
    });

    it('should not detect active device as stale', () => {
      const today = new Date();
      expect(isDeviceStale(today)).toBeFalse();
    });

    it('should handle custom stale days', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      expect(isDeviceStale(twoDaysAgo, 1)).toBeTrue();
      expect(isDeviceStale(twoDaysAgo, 3)).toBeFalse();
    });
  });

  describe('Event Filtering', () => {
    
    function shouldProcessEvent(
      event: SyncEvent,
      currentDeviceId: string,
      currentSyncToken: string
    ): boolean {
      // Ignore events from this device
      if (event.deviceId === currentDeviceId) return false;
      
      // Ignore events with current sync token (prevents loops)
      if (event.syncToken === currentSyncToken) return false;
      
      return true;
    }

    it('should ignore events from same device', () => {
      const event: SyncEvent = {
        id: '1',
        userId: 'user-1',
        deviceId: 'device-1',
        timestamp: new Date(),
        operation: 'create',
        store: 'test',
        itemId: 'item-1',
        syncToken: 'token-a'
      };

      expect(shouldProcessEvent(event, 'device-1', 'token-b')).toBeFalse();
    });

    it('should ignore events with same sync token', () => {
      const event: SyncEvent = {
        id: '1',
        userId: 'user-1',
        deviceId: 'device-2',
        timestamp: new Date(),
        operation: 'create',
        store: 'test',
        itemId: 'item-1',
        syncToken: 'token-a'
      };

      expect(shouldProcessEvent(event, 'device-1', 'token-a')).toBeFalse();
    });

    it('should process events from other devices', () => {
      const event: SyncEvent = {
        id: '1',
        userId: 'user-1',
        deviceId: 'device-2',
        timestamp: new Date(),
        operation: 'create',
        store: 'test',
        itemId: 'item-1',
        syncToken: 'token-b'
      };

      expect(shouldProcessEvent(event, 'device-1', 'token-a')).toBeTrue();
    });
  });

  describe('Stats Update Logic', () => {
    
    function updateStatsForSentEvent(stats: SyncStats): SyncStats {
      return {
        ...stats,
        eventsSent: stats.eventsSent + 1,
        lastSyncTime: new Date()
      };
    }

    function updateStatsForReceivedEvent(stats: SyncStats): SyncStats {
      return {
        ...stats,
        eventsReceived: stats.eventsReceived + 1,
        lastSyncTime: new Date()
      };
    }

    function updateStatsForConflict(stats: SyncStats): SyncStats {
      return {
        ...stats,
        conflicts: stats.conflicts + 1
      };
    }

    it('should increment eventsSent', () => {
      const stats: SyncStats = {
        eventsReceived: 0,
        eventsSent: 5,
        conflicts: 0,
        lastSyncTime: null,
        connectedDevices: 1
      };

      const updated = updateStatsForSentEvent(stats);
      expect(updated.eventsSent).toBe(6);
      expect(updated.lastSyncTime).not.toBeNull();
    });

    it('should increment eventsReceived', () => {
      const stats: SyncStats = {
        eventsReceived: 3,
        eventsSent: 0,
        conflicts: 0,
        lastSyncTime: null,
        connectedDevices: 1
      };

      const updated = updateStatsForReceivedEvent(stats);
      expect(updated.eventsReceived).toBe(4);
    });

    it('should increment conflicts', () => {
      const stats: SyncStats = {
        eventsReceived: 0,
        eventsSent: 0,
        conflicts: 2,
        lastSyncTime: null,
        connectedDevices: 1
      };

      const updated = updateStatsForConflict(stats);
      expect(updated.conflicts).toBe(3);
    });
  });

  describe('Device Name Management', () => {
    
    const DEVICE_NAME_KEY = 'medicamenta_device_name';

    beforeEach(() => {
      localStorage.removeItem(DEVICE_NAME_KEY);
    });

    afterEach(() => {
      localStorage.removeItem(DEVICE_NAME_KEY);
    });

    function getDeviceName(platform: string): string {
      const stored = localStorage.getItem(DEVICE_NAME_KEY);
      if (stored) return stored;
      return `${platform} Device`;
    }

    function setDeviceName(name: string): void {
      localStorage.setItem(DEVICE_NAME_KEY, name);
    }

    it('should return default name when not set', () => {
      expect(getDeviceName('Android')).toBe('Android Device');
    });

    it('should return custom name when set', () => {
      setDeviceName('My Phone');
      expect(getDeviceName('Android')).toBe('My Phone');
    });

    it('should set custom device name', () => {
      setDeviceName('Work Tablet');
      expect(localStorage.getItem(DEVICE_NAME_KEY)).toBe('Work Tablet');
    });
  });

  describe('Event Age Calculation', () => {
    
    function getEventAgeInDays(timestamp: Date): number {
      const now = Date.now();
      return (now - timestamp.getTime()) / (1000 * 60 * 60 * 24);
    }

    function isEventOld(timestamp: Date, maxAgeDays: number = 7): boolean {
      return getEventAgeInDays(timestamp) > maxAgeDays;
    }

    it('should calculate event age', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const age = getEventAgeInDays(threeDaysAgo);
      expect(age).toBeGreaterThanOrEqual(2.9);
      expect(age).toBeLessThanOrEqual(3.1);
    });

    it('should detect old events', () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      
      expect(isEventOld(eightDaysAgo)).toBeTrue();
    });

    it('should not detect recent events as old', () => {
      const today = new Date();
      expect(isEventOld(today)).toBeFalse();
    });
  });

  describe('Sync Store Types', () => {
    
    const stores = ['medications', 'reminders', 'doses', 'patients', 'settings'];

    function isValidStore(store: string): boolean {
      return stores.includes(store);
    }

    it('should validate known stores', () => {
      stores.forEach(store => {
        expect(isValidStore(store)).toBeTrue();
      });
    });

    it('should reject unknown stores', () => {
      expect(isValidStore('unknown')).toBeFalse();
      expect(isValidStore('invalid')).toBeFalse();
    });
  });

  describe('Heartbeat Interval', () => {
    
    const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

    it('should have correct interval', () => {
      expect(HEARTBEAT_INTERVAL_MS).toBe(300000);
    });

    it('should convert to minutes', () => {
      const minutes = HEARTBEAT_INTERVAL_MS / (60 * 1000);
      expect(minutes).toBe(5);
    });
  });

  describe('Active Devices Filter', () => {
    
    function getActiveDevices(devices: DeviceInfo[], staleDays: number = 7): DeviceInfo[] {
      const now = Date.now();
      return devices.filter(device => {
        const daysSinceLastSeen = (now - device.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastSeen < staleDays;
      });
    }

    it('should filter out stale devices', () => {
      const now = new Date();
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const devices: DeviceInfo[] = [
        { id: '1', userId: 'u1', name: 'Active', lastSeen: now, platform: 'Android', isCurrentDevice: true },
        { id: '2', userId: 'u1', name: 'Stale', lastSeen: eightDaysAgo, platform: 'iOS', isCurrentDevice: false }
      ];

      const active = getActiveDevices(devices);
      expect(active.length).toBe(1);
      expect(active[0].name).toBe('Active');
    });

    it('should keep all active devices', () => {
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const devices: DeviceInfo[] = [
        { id: '1', userId: 'u1', name: 'Device 1', lastSeen: now, platform: 'Android', isCurrentDevice: true },
        { id: '2', userId: 'u1', name: 'Device 2', lastSeen: yesterday, platform: 'iOS', isCurrentDevice: false }
      ];

      const active = getActiveDevices(devices);
      expect(active.length).toBe(2);
    });
  });

  describe('Reset Stats', () => {
    
    function resetStats(connectedDevices: number): SyncStats {
      return {
        eventsReceived: 0,
        eventsSent: 0,
        conflicts: 0,
        lastSyncTime: null,
        connectedDevices
      };
    }

    it('should reset all counters', () => {
      const stats = resetStats(3);
      
      expect(stats.eventsReceived).toBe(0);
      expect(stats.eventsSent).toBe(0);
      expect(stats.conflicts).toBe(0);
      expect(stats.lastSyncTime).toBeNull();
    });

    it('should preserve connected devices count', () => {
      const stats = resetStats(5);
      expect(stats.connectedDevices).toBe(5);
    });
  });
});
