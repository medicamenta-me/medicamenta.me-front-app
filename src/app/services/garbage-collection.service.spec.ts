/**
 * GarbageCollectionService Unit Tests
 * 
 * Tests for the Garbage Collection Service that automatically cleans old data
 * from IndexedDB to maintain performance and prevent storage bloat.
 */

import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { GarbageCollectionService, GarbageCollectionStats } from './garbage-collection.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';

describe('GarbageCollectionService', () => {
  let service: GarbageCollectionService;
  let mockIndexedDBService: jasmine.SpyObj<IndexedDBService>;
  let mockLogService: jasmine.SpyObj<LogService>;
  
  // Use any for mock to avoid generic type issues
  let mockGetAll: jasmine.Spy;

  // Test data factories
  const createMockLog = (id: string, daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return { id, timestamp: date.toISOString(), message: 'Test log' };
  };

  const createMockInsight = (id: string, daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return { id, timestamp: date.toISOString(), type: 'Test insight' };
  };

  const createMockStat = (id: string, daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return { id, calculatedAt: date.toISOString(), value: 100 };
  };

  const createMockQueueOp = (id: string, daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return { id, timestamp: date.toISOString(), operation: 'sync' };
  };

  beforeEach(() => {
    mockIndexedDBService = jasmine.createSpyObj('IndexedDBService', ['getAll', 'deleteBatch']);
    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error', 'debug', 'info', 'warn']);

    // Default mock implementations - use any to bypass generic type checking
    mockGetAll = mockIndexedDBService.getAll as jasmine.Spy;
    mockGetAll.and.returnValue(Promise.resolve([]));
    mockIndexedDBService.deleteBatch.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        GarbageCollectionService,
        { provide: IndexedDBService, useValue: mockIndexedDBService },
        { provide: LogService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(GarbageCollectionService);
  });

  afterEach(() => {
    service.stop(); // Clean up any running intervals
  });

  // =============================================
  // Basic Initialization Tests
  // =============================================
  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have correct default configuration', () => {
      const config = service.getConfig();
      
      expect(config.maxAgeDays).toBe(90);
      expect(config.statsRetentionDays).toBe(30);
      expect(config.insightsRetentionDays).toBe(60);
      expect(config.runIntervalMs).toBe(24 * 60 * 60 * 1000); // 24 hours
      expect(config.isRunning).toBeFalse();
      expect(config.lastRun).toBeNull();
    });

    it('should not be running initially', () => {
      const config = service.getConfig();
      expect(config.isRunning).toBeFalse();
    });

    it('should have null lastRun initially', () => {
      expect(service.getLastRun()).toBeNull();
    });
  });

  // =============================================
  // start() Tests
  // =============================================
  describe('start', () => {
    it('should start automatic garbage collection', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      tick(); // Process async operations
      
      const config = service.getConfig();
      expect(config.isRunning).toBeTrue();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Starting automatic garbage collection'
      );
      
      discardPeriodicTasks();
    }));

    it('should run garbage collection immediately on start', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      tick();
      
      expect(mockIndexedDBService.getAll).toHaveBeenCalled();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Running garbage collection'
      );
      
      discardPeriodicTasks();
    }));

    it('should not start if already running', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      tick();
      
      mockLogService.info.calls.reset();
      
      service.start();
      tick();
      
      expect(mockLogService.info).toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Already running'
      );
      
      discardPeriodicTasks();
    }));

    it('should schedule periodic runs', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      tick();
      
      // Verify initial run
      expect(mockIndexedDBService.getAll).toHaveBeenCalled();
      const initialCallCount = mockIndexedDBService.getAll.calls.count();
      
      // Advance time by 24 hours
      tick(24 * 60 * 60 * 1000);
      
      // Should have run again
      expect(mockIndexedDBService.getAll.calls.count()).toBeGreaterThan(initialCallCount);
      
      discardPeriodicTasks();
    }));
  });

  // =============================================
  // stop() Tests
  // =============================================
  describe('stop', () => {
    it('should stop automatic garbage collection', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      tick();
      
      service.stop();
      
      const config = service.getConfig();
      expect(config.isRunning).toBeFalse();
      expect(mockLogService.info).toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Stopped automatic garbage collection'
      );
      
      discardPeriodicTasks();
    }));

    it('should not log if not running', () => {
      service.stop();
      
      expect(mockLogService.info).not.toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Stopped automatic garbage collection'
      );
    });

    it('should prevent further scheduled runs after stop', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      tick();
      
      const callCountBeforeStop = mockIndexedDBService.getAll.calls.count();
      
      service.stop();
      
      // Advance time
      tick(48 * 60 * 60 * 1000);
      
      // Should not have run again
      expect(mockIndexedDBService.getAll.calls.count()).toBe(callCountBeforeStop);
      
      discardPeriodicTasks();
    }));
  });

  // =============================================
  // runGarbageCollection() Tests
  // =============================================
  describe('runGarbageCollection', () => {
    it('should clean old logs (>90 days)', async () => {
      const oldLogs = [
        createMockLog('log-1', 100),
        createMockLog('log-2', 120)
      ];
      const recentLogs = [
        createMockLog('log-3', 30),
        createMockLog('log-4', 5)
      ];
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve([...oldLogs, ...recentLogs]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.logsDeleted).toBe(2);
      expect(mockIndexedDBService.deleteBatch).toHaveBeenCalledWith('logs', ['log-1', 'log-2']);
    });

    it('should clean old insights (>60 days)', async () => {
      const oldInsights = [
        createMockInsight('insight-1', 70),
        createMockInsight('insight-2', 90)
      ];
      const recentInsights = [
        createMockInsight('insight-3', 30)
      ];
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'insights') return Promise.resolve([...oldInsights, ...recentInsights]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.insightsDeleted).toBe(2);
      expect(mockIndexedDBService.deleteBatch).toHaveBeenCalledWith('insights', ['insight-1', 'insight-2']);
    });

    it('should clean old stats (>30 days)', async () => {
      const oldStats = [
        createMockStat('stat-1', 40),
        createMockStat('stat-2', 50),
        createMockStat('stat-3', 100)
      ];
      const recentStats = [
        createMockStat('stat-4', 10)
      ];
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'stats') return Promise.resolve([...oldStats, ...recentStats]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.statsDeleted).toBe(3);
      expect(mockIndexedDBService.deleteBatch).toHaveBeenCalledWith('stats', ['stat-1', 'stat-2', 'stat-3']);
    });

    it('should return complete stats object', async () => {
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve([createMockLog('log-1', 100)]);
        if (store === 'insights') return Promise.resolve([createMockInsight('insight-1', 70)]);
        if (store === 'stats') return Promise.resolve([createMockStat('stat-1', 40)]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.logsDeleted).toBe(1);
      expect(stats.insightsDeleted).toBe(1);
      expect(stats.statsDeleted).toBe(1);
      expect(stats.lastRun).toBeDefined();
      expect(stats.lastRun instanceof Date).toBeTrue();
    });

    it('should estimate space freed correctly', async () => {
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve([
          createMockLog('log-1', 100),
          createMockLog('log-2', 100)
        ]);
        if (store === 'insights') return Promise.resolve([createMockInsight('insight-1', 70)]);
        if (store === 'stats') return Promise.resolve([createMockStat('stat-1', 40)]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      // 2 logs * 1KB + 1 insight * 2KB + 1 stat * 5KB = 9KB
      const expectedSpaceFreed = (2 * 1024) + (1 * 2048) + (1 * 5120);
      expect(stats.totalSpaceFreed).toBe(expectedSpaceFreed);
    });

    it('should update lastRun after successful collection', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      expect(service.getLastRun()).toBeNull();
      
      await service.runGarbageCollection();
      
      const lastRun = service.getLastRun();
      expect(lastRun).not.toBeNull();
      expect(lastRun instanceof Date).toBeTrue();
    });

    it('should log completion with stats', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      await service.runGarbageCollection();
      
      expect(mockLogService.info).toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Completed',
        jasmine.any(Object)
      );
    });

    it('should not delete anything when all data is recent', async () => {
      const recentLogs = [
        createMockLog('log-1', 10),
        createMockLog('log-2', 20)
      ];
      const recentInsights = [createMockInsight('insight-1', 30)];
      const recentStats = [createMockStat('stat-1', 10)];
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve(recentLogs);
        if (store === 'insights') return Promise.resolve(recentInsights);
        if (store === 'stats') return Promise.resolve(recentStats);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.logsDeleted).toBe(0);
      expect(stats.insightsDeleted).toBe(0);
      expect(stats.statsDeleted).toBe(0);
      expect(mockIndexedDBService.deleteBatch).not.toHaveBeenCalled();
    });

    it('should handle empty stores gracefully', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.logsDeleted).toBe(0);
      expect(stats.insightsDeleted).toBe(0);
      expect(stats.statsDeleted).toBe(0);
      expect(stats.totalSpaceFreed).toBe(0);
    });

    it('should handle data at exact boundary (90 days for logs)', async () => {
      // Data exactly at 90 days should NOT be deleted (boundary is exclusive)
      const boundaryLog = createMockLog('boundary-log', 90);
      const oldLog = createMockLog('old-log', 91);
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve([boundaryLog, oldLog]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      // The 91-day old log should be deleted, but the 90-day one should not
      expect(stats.logsDeleted).toBe(1);
      expect(mockIndexedDBService.deleteBatch).toHaveBeenCalledWith('logs', ['old-log']);
    });

    it('should handle IndexedDB error and throw', async () => {
      const error = new Error('IndexedDB read failed');
      mockGetAll.and.returnValue(Promise.reject(error));
      
      await expectAsync(service.runGarbageCollection()).toBeRejectedWith(error);
      
      expect(mockLogService.error).toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Failed',
        error
      );
    });

    it('should handle deleteBatch error and throw', async () => {
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve([createMockLog('log-1', 100)]);
        return Promise.resolve([]);
      });
      
      const error = new Error('Delete failed');
      mockIndexedDBService.deleteBatch.and.returnValue(Promise.reject(error));
      
      await expectAsync(service.runGarbageCollection()).toBeRejectedWith(error);
    });
  });

  // =============================================
  // cleanExpiredQueue() Tests
  // =============================================
  describe('cleanExpiredQueue', () => {
    it('should clean queue items older than 7 days', async () => {
      const oldQueueOps = [
        createMockQueueOp('op-1', 10),
        createMockQueueOp('op-2', 14)
      ];
      const recentQueueOps = [
        createMockQueueOp('op-3', 3),
        createMockQueueOp('op-4', 1)
      ];
      
      mockGetAll.and.returnValue(Promise.resolve([...oldQueueOps, ...recentQueueOps]));
      
      const deletedCount = await service.cleanExpiredQueue();
      
      expect(deletedCount).toBe(2);
      expect(mockIndexedDBService.deleteBatch).toHaveBeenCalledWith('queue', ['op-1', 'op-2']);
    });

    it('should not delete recent queue items', async () => {
      const recentQueueOps = [
        createMockQueueOp('op-1', 1),
        createMockQueueOp('op-2', 3),
        createMockQueueOp('op-3', 6)
      ];
      
      mockGetAll.and.returnValue(Promise.resolve(recentQueueOps));
      
      const deletedCount = await service.cleanExpiredQueue();
      
      expect(deletedCount).toBe(0);
      expect(mockIndexedDBService.deleteBatch).not.toHaveBeenCalled();
    });

    it('should handle empty queue', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      const deletedCount = await service.cleanExpiredQueue();
      
      expect(deletedCount).toBe(0);
    });

    it('should log deleted count', async () => {
      const oldQueueOps = [createMockQueueOp('op-1', 10)];
      mockGetAll.and.returnValue(Promise.resolve(oldQueueOps));
      
      await service.cleanExpiredQueue();
      
      expect(mockLogService.info).toHaveBeenCalledWith(
        'GarbageCollectionService',
        'Deleted expired queue operations',
        { count: 1 }
      );
    });
  });

  // =============================================
  // shouldRun() Tests
  // =============================================
  describe('shouldRun', () => {
    it('should return true when never run', () => {
      expect(service.shouldRun()).toBeTrue();
    });

    it('should return true after 24 hours since last run', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      // Run GC to set lastRun
      await service.runGarbageCollection();
      
      // Manually set lastRun to 25 hours ago
      const lastRun = new Date();
      lastRun.setTime(lastRun.getTime() - (25 * 60 * 60 * 1000));
      (service as any).lastRun = lastRun;
      
      expect(service.shouldRun()).toBeTrue();
    });

    it('should return false within 24 hours of last run', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      // Run GC to set lastRun
      await service.runGarbageCollection();
      
      expect(service.shouldRun()).toBeFalse();
    });
  });

  // =============================================
  // getLastRun() Tests
  // =============================================
  describe('getLastRun', () => {
    it('should return null initially', () => {
      expect(service.getLastRun()).toBeNull();
    });

    it('should return Date after GC run', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      await service.runGarbageCollection();
      
      const lastRun = service.getLastRun();
      expect(lastRun).not.toBeNull();
      expect(lastRun instanceof Date).toBeTrue();
    });
  });

  // =============================================
  // getConfig() Tests
  // =============================================
  describe('getConfig', () => {
    it('should return correct configuration values', () => {
      const config = service.getConfig();
      
      expect(config.maxAgeDays).toBe(90);
      expect(config.statsRetentionDays).toBe(30);
      expect(config.insightsRetentionDays).toBe(60);
      expect(config.runIntervalMs).toBe(86400000); // 24h in ms
    });

    it('should return isRunning=false when not started', () => {
      const config = service.getConfig();
      expect(config.isRunning).toBeFalse();
    });

    it('should return isRunning=true when started', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      tick();
      
      const config = service.getConfig();
      expect(config.isRunning).toBeTrue();
      
      discardPeriodicTasks();
    }));

    it('should return lastRun value after GC run', async () => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      await service.runGarbageCollection();
      
      const config = service.getConfig();
      expect(config.lastRun).not.toBeNull();
      expect(config.lastRun instanceof Date).toBeTrue();
    });
  });

  // =============================================
  // Edge Cases
  // =============================================
  describe('edge cases', () => {
    it('should handle mixed data types in stores', async () => {
      const mixedData = [
        createMockLog('log-1', 100),
        { id: 'weird-log', timestamp: null }, // null timestamp
        { id: 'invalid-log' } // missing timestamp
      ];
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve(mixedData);
        return Promise.resolve([]);
      });
      
      // Should not throw - invalid data will be filtered based on date comparison
      const stats = await service.runGarbageCollection();
      
      expect(stats).toBeDefined();
    });

    it('should handle large number of records', async () => {
      const manyLogs: Array<{id: string; timestamp: string; message: string}> = [];
      for (let i = 0; i < 1000; i++) {
        manyLogs.push(createMockLog(`log-${i}`, i < 500 ? 100 : 10)); // 500 old, 500 recent
      }
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve(manyLogs);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.logsDeleted).toBe(500);
    });

    it('should handle concurrent start/stop calls', fakeAsync(() => {
      mockGetAll.and.returnValue(Promise.resolve([]));
      
      service.start();
      service.stop();
      service.start();
      tick();
      
      expect(service.getConfig().isRunning).toBeTrue();
      
      discardPeriodicTasks();
    }));

    it('should handle date boundary correctly for insights (60 days)', async () => {
      // Use 59 days for the "safe" item (clearly recent)
      // and 65 days for the old item (clearly past retention)
      const recentInsight = createMockInsight('recent-insight', 59);
      const oldInsight = createMockInsight('old-insight', 65);
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'insights') return Promise.resolve([recentInsight, oldInsight]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.insightsDeleted).toBe(1);
    });

    it('should handle date boundary correctly for stats (30 days)', async () => {
      // Use 29 days for the "safe" item (clearly within retention)
      // and 35 days for the old item (clearly past retention)
      const recentStat = createMockStat('recent-stat', 29);
      const oldStat = createMockStat('old-stat', 35);
      
      mockGetAll.and.callFake((store: string) => {
        if (store === 'stats') return Promise.resolve([recentStat, oldStat]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.statsDeleted).toBe(1);
    });

    it('should handle date boundary correctly for queue (7 days)', async () => {
      // Use 6 days for the "safe" item (clearly recent)
      // and 10 days for the old item (clearly past retention)
      const recentOp = createMockQueueOp('recent-op', 6);
      const oldOp = createMockQueueOp('old-op', 10);
      
      mockGetAll.and.returnValue(Promise.resolve([recentOp, oldOp]));
      
      const deletedCount = await service.cleanExpiredQueue();
      
      expect(deletedCount).toBe(1);
    });
  });

  // =============================================
  // Integration-like Tests
  // =============================================
  describe('integration scenarios', () => {
    it('should process all stores in single GC run', async () => {
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve([createMockLog('log-1', 100)]);
        if (store === 'insights') return Promise.resolve([createMockInsight('insight-1', 70)]);
        if (store === 'stats') return Promise.resolve([createMockStat('stat-1', 40)]);
        return Promise.resolve([]);
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.logsDeleted).toBe(1);
      expect(stats.insightsDeleted).toBe(1);
      expect(stats.statsDeleted).toBe(1);
      expect(mockIndexedDBService.getAll).toHaveBeenCalledTimes(3);
      expect(mockIndexedDBService.deleteBatch).toHaveBeenCalledTimes(3);
    });

    it('should run multiple GC cycles correctly', async () => {
      mockGetAll.and.callFake((store: string) => {
        if (store === 'logs') return Promise.resolve([createMockLog('log-1', 100)]);
        return Promise.resolve([]);
      });
      
      const stats1 = await service.runGarbageCollection();
      const stats2 = await service.runGarbageCollection();
      
      expect(stats1.logsDeleted).toBe(1);
      expect(stats2.logsDeleted).toBe(1);
      expect(mockIndexedDBService.deleteBatch).toHaveBeenCalledTimes(2);
    });

    it('should accumulate stats across different retention periods', async () => {
      // Create data at different ages
      mockGetAll.and.callFake((store: string) => {
        switch (store) {
          case 'logs':
            // Logs older than 90 days
            return Promise.resolve([
              createMockLog('log-1', 95),
              createMockLog('log-2', 91),
              createMockLog('log-3', 50) // recent
            ]);
          case 'insights':
            // Insights older than 60 days
            return Promise.resolve([
              createMockInsight('insight-1', 65),
              createMockInsight('insight-2', 30) // recent
            ]);
          case 'stats':
            // Stats older than 30 days
            return Promise.resolve([
              createMockStat('stat-1', 35),
              createMockStat('stat-2', 45),
              createMockStat('stat-3', 10) // recent
            ]);
          default:
            return Promise.resolve([]);
        }
      });
      
      const stats = await service.runGarbageCollection();
      
      expect(stats.logsDeleted).toBe(2);
      expect(stats.insightsDeleted).toBe(1);
      expect(stats.statsDeleted).toBe(2);
    });
  });
});
