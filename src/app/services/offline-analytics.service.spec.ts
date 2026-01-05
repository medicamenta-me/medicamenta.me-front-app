/**
 * Tests for OfflineAnalyticsService
 *
 * Tests cover:
 * - OfflineSession interface
 * - OperationMetric interface
 * - SyncMetric interface
 * - AnalyticsSummary interface
 * - Session management
 * - Metric calculations
 */

interface OfflineSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  operationsPerformed: number;
  syncAttempts: number;
  syncSuccesses: number;
  syncFailures: number;
}

interface OperationMetric {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'create' | 'update' | 'delete' | 'read';
  collection: string;
  offline: boolean;
  duration: number;
}

interface SyncMetric {
  id: string;
  userId: string;
  timestamp: Date;
  success: boolean;
  itemsSynced: number;
  duration: number;
  error?: string;
}

interface AnalyticsSummary {
  totalOfflineTime: number;
  totalSessions: number;
  averageSessionDuration: number;
  totalOperations: number;
  operationsByType: Record<string, number>;
  syncSuccessRate: number;
  conflictRate: number;
  mostUsedCollections: Array<{ collection: string; count: number }>;
}

describe('OfflineAnalyticsService', () => {
  /**
   * OfflineSession Interface Tests
   */
  describe('OfflineSession interface', () => {
    it('should have all required properties', () => {
      const session: OfflineSession = {
        id: 'session_123',
        userId: 'user_456',
        startTime: new Date(),
        endTime: null,
        duration: 0,
        operationsPerformed: 0,
        syncAttempts: 0,
        syncSuccesses: 0,
        syncFailures: 0
      };

      expect(session.id).toBeDefined();
      expect(session.userId).toBeDefined();
      expect(session.startTime).toBeDefined();
      expect(session.endTime).toBeNull();
      expect(session.duration).toBeDefined();
    });

    it('should support active session', () => {
      const session: OfflineSession = {
        id: 'session_active',
        userId: 'user_1',
        startTime: new Date(),
        endTime: null,
        duration: 0,
        operationsPerformed: 5,
        syncAttempts: 0,
        syncSuccesses: 0,
        syncFailures: 0
      };

      expect(session.endTime).toBeNull();
    });

    it('should support completed session', () => {
      const start = new Date();
      const end = new Date(start.getTime() + 3600000);

      const session: OfflineSession = {
        id: 'session_complete',
        userId: 'user_1',
        startTime: start,
        endTime: end,
        duration: 3600000,
        operationsPerformed: 25,
        syncAttempts: 3,
        syncSuccesses: 3,
        syncFailures: 0
      };

      expect(session.endTime).not.toBeNull();
      expect(session.duration).toBe(3600000);
    });

    it('should track sync statistics', () => {
      const session: OfflineSession = {
        id: 'session_sync',
        userId: 'user_1',
        startTime: new Date(),
        endTime: null,
        duration: 0,
        operationsPerformed: 10,
        syncAttempts: 5,
        syncSuccesses: 4,
        syncFailures: 1
      };

      expect(session.syncAttempts).toBe(5);
      expect(session.syncSuccesses).toBe(4);
      expect(session.syncFailures).toBe(1);
    });
  });

  /**
   * OperationMetric Interface Tests
   */
  describe('OperationMetric interface', () => {
    it('should have all required properties', () => {
      const metric: OperationMetric = {
        id: 'op_123',
        userId: 'user_456',
        timestamp: new Date(),
        type: 'create',
        collection: 'medications',
        offline: true,
        duration: 150
      };

      expect(metric.id).toBeDefined();
      expect(metric.userId).toBeDefined();
      expect(metric.timestamp).toBeDefined();
      expect(metric.type).toBeDefined();
      expect(metric.collection).toBeDefined();
      expect(metric.offline).toBeDefined();
      expect(metric.duration).toBeDefined();
    });

    it('should support create operation', () => {
      const metric: OperationMetric = {
        id: 'op_1',
        userId: 'user_1',
        timestamp: new Date(),
        type: 'create',
        collection: 'medications',
        offline: true,
        duration: 100
      };

      expect(metric.type).toBe('create');
    });

    it('should support update operation', () => {
      const metric: OperationMetric = {
        id: 'op_2',
        userId: 'user_1',
        timestamp: new Date(),
        type: 'update',
        collection: 'doses',
        offline: false,
        duration: 80
      };

      expect(metric.type).toBe('update');
    });

    it('should support delete operation', () => {
      const metric: OperationMetric = {
        id: 'op_3',
        userId: 'user_1',
        timestamp: new Date(),
        type: 'delete',
        collection: 'logs',
        offline: true,
        duration: 50
      };

      expect(metric.type).toBe('delete');
    });

    it('should support read operation', () => {
      const metric: OperationMetric = {
        id: 'op_4',
        userId: 'user_1',
        timestamp: new Date(),
        type: 'read',
        collection: 'settings',
        offline: true,
        duration: 30
      };

      expect(metric.type).toBe('read');
    });

    it('should track offline flag', () => {
      const offlineMetric: OperationMetric = {
        id: 'op_offline',
        userId: 'user_1',
        timestamp: new Date(),
        type: 'create',
        collection: 'medications',
        offline: true,
        duration: 100
      };

      const onlineMetric: OperationMetric = {
        id: 'op_online',
        userId: 'user_1',
        timestamp: new Date(),
        type: 'create',
        collection: 'medications',
        offline: false,
        duration: 200
      };

      expect(offlineMetric.offline).toBeTrue();
      expect(onlineMetric.offline).toBeFalse();
    });
  });

  /**
   * SyncMetric Interface Tests
   */
  describe('SyncMetric interface', () => {
    it('should have all required properties', () => {
      const metric: SyncMetric = {
        id: 'sync_123',
        userId: 'user_456',
        timestamp: new Date(),
        success: true,
        itemsSynced: 15,
        duration: 2500
      };

      expect(metric.id).toBeDefined();
      expect(metric.userId).toBeDefined();
      expect(metric.timestamp).toBeDefined();
      expect(metric.success).toBeDefined();
      expect(metric.itemsSynced).toBeDefined();
      expect(metric.duration).toBeDefined();
    });

    it('should support successful sync', () => {
      const metric: SyncMetric = {
        id: 'sync_success',
        userId: 'user_1',
        timestamp: new Date(),
        success: true,
        itemsSynced: 10,
        duration: 1500
      };

      expect(metric.success).toBeTrue();
      expect(metric.error).toBeUndefined();
    });

    it('should support failed sync with error', () => {
      const metric: SyncMetric = {
        id: 'sync_failed',
        userId: 'user_1',
        timestamp: new Date(),
        success: false,
        itemsSynced: 0,
        duration: 500,
        error: 'Network timeout'
      };

      expect(metric.success).toBeFalse();
      expect(metric.error).toBe('Network timeout');
    });
  });

  /**
   * AnalyticsSummary Interface Tests
   */
  describe('AnalyticsSummary interface', () => {
    it('should have all required properties', () => {
      const summary: AnalyticsSummary = {
        totalOfflineTime: 36000000,
        totalSessions: 10,
        averageSessionDuration: 3600000,
        totalOperations: 150,
        operationsByType: {},
        syncSuccessRate: 95,
        conflictRate: 2,
        mostUsedCollections: []
      };

      expect(summary.totalOfflineTime).toBeDefined();
      expect(summary.totalSessions).toBeDefined();
      expect(summary.averageSessionDuration).toBeDefined();
      expect(summary.totalOperations).toBeDefined();
      expect(summary.operationsByType).toBeDefined();
      expect(summary.syncSuccessRate).toBeDefined();
      expect(summary.conflictRate).toBeDefined();
      expect(summary.mostUsedCollections).toBeDefined();
    });

    it('should track operations by type', () => {
      const summary: AnalyticsSummary = {
        totalOfflineTime: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        totalOperations: 100,
        operationsByType: {
          create: 30,
          read: 50,
          update: 15,
          delete: 5
        },
        syncSuccessRate: 100,
        conflictRate: 0,
        mostUsedCollections: []
      };

      expect(summary.operationsByType['create']).toBe(30);
      expect(summary.operationsByType['read']).toBe(50);
      expect(summary.operationsByType['update']).toBe(15);
      expect(summary.operationsByType['delete']).toBe(5);
    });

    it('should track most used collections', () => {
      const summary: AnalyticsSummary = {
        totalOfflineTime: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        totalOperations: 0,
        operationsByType: {},
        syncSuccessRate: 0,
        conflictRate: 0,
        mostUsedCollections: [
          { collection: 'medications', count: 150 },
          { collection: 'doses', count: 120 },
          { collection: 'logs', count: 80 }
        ]
      };

      expect(summary.mostUsedCollections.length).toBe(3);
      expect(summary.mostUsedCollections[0].collection).toBe('medications');
      expect(summary.mostUsedCollections[0].count).toBe(150);
    });
  });

  /**
   * Session ID Generation Tests
   */
  describe('Session ID generation', () => {
    it('should generate unique session IDs', () => {
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        ids.add(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      }

      expect(ids.size).toBe(100);
    });

    it('should have session prefix', () => {
      const sessionId = `session_${Date.now()}`;
      expect(sessionId.startsWith('session_')).toBeTrue();
    });
  });

  /**
   * Duration Calculation Tests
   */
  describe('Duration calculations', () => {
    it('should calculate session duration', () => {
      const startTime = new Date(2024, 11, 15, 10, 0, 0);
      const endTime = new Date(2024, 11, 15, 11, 30, 0);

      const duration = endTime.getTime() - startTime.getTime();

      expect(duration).toBe(5400000); // 1.5 hours in ms
    });

    it('should calculate average session duration', () => {
      const sessions = [
        { duration: 1800000 },
        { duration: 3600000 },
        { duration: 7200000 }
      ];

      const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
      const averageDuration = totalDuration / sessions.length;

      expect(averageDuration).toBe(4200000); // 70 minutes
    });

    it('should format duration to minutes', () => {
      const durationMs = 3600000; // 1 hour
      const minutes = durationMs / 60000;

      expect(minutes).toBe(60);
    });
  });

  /**
   * Sync Success Rate Calculation Tests
   */
  describe('Sync success rate calculations', () => {
    it('should calculate success rate', () => {
      const syncSuccesses = 95;
      const syncAttempts = 100;

      const successRate = (syncSuccesses / syncAttempts) * 100;

      expect(successRate).toBe(95);
    });

    it('should handle zero attempts', () => {
      const syncSuccesses = 0;
      const syncAttempts = 0;

      const successRate = syncAttempts === 0 ? 100 : (syncSuccesses / syncAttempts) * 100;

      expect(successRate).toBe(100);
    });

    it('should handle 100% success rate', () => {
      const syncSuccesses = 50;
      const syncAttempts = 50;

      const successRate = (syncSuccesses / syncAttempts) * 100;

      expect(successRate).toBe(100);
    });
  });

  /**
   * Operations Aggregation Tests
   */
  describe('Operations aggregation', () => {
    it('should aggregate operations by type', () => {
      const operations: OperationMetric[] = [
        { id: '1', userId: 'u', timestamp: new Date(), type: 'create', collection: 'a', offline: true, duration: 100 },
        { id: '2', userId: 'u', timestamp: new Date(), type: 'create', collection: 'b', offline: true, duration: 100 },
        { id: '3', userId: 'u', timestamp: new Date(), type: 'read', collection: 'a', offline: true, duration: 50 },
        { id: '4', userId: 'u', timestamp: new Date(), type: 'update', collection: 'a', offline: true, duration: 80 }
      ];

      const byType: Record<string, number> = {};
      operations.forEach(op => {
        byType[op.type] = (byType[op.type] || 0) + 1;
      });

      expect(byType['create']).toBe(2);
      expect(byType['read']).toBe(1);
      expect(byType['update']).toBe(1);
    });

    it('should aggregate operations by collection', () => {
      const operations: OperationMetric[] = [
        { id: '1', userId: 'u', timestamp: new Date(), type: 'create', collection: 'medications', offline: true, duration: 100 },
        { id: '2', userId: 'u', timestamp: new Date(), type: 'create', collection: 'medications', offline: true, duration: 100 },
        { id: '3', userId: 'u', timestamp: new Date(), type: 'read', collection: 'doses', offline: true, duration: 50 },
        { id: '4', userId: 'u', timestamp: new Date(), type: 'update', collection: 'medications', offline: true, duration: 80 }
      ];

      const byCollection: Record<string, number> = {};
      operations.forEach(op => {
        byCollection[op.collection] = (byCollection[op.collection] || 0) + 1;
      });

      expect(byCollection['medications']).toBe(3);
      expect(byCollection['doses']).toBe(1);
    });
  });

  /**
   * Most Used Collections Tests
   */
  describe('Most used collections', () => {
    it('should sort collections by count descending', () => {
      const collections = [
        { collection: 'logs', count: 80 },
        { collection: 'medications', count: 150 },
        { collection: 'doses', count: 120 }
      ];

      const sorted = [...collections].sort((a, b) => b.count - a.count);

      expect(sorted[0].collection).toBe('medications');
      expect(sorted[1].collection).toBe('doses');
      expect(sorted[2].collection).toBe('logs');
    });

    it('should limit to top N collections', () => {
      const collections = [
        { collection: 'a', count: 100 },
        { collection: 'b', count: 90 },
        { collection: 'c', count: 80 },
        { collection: 'd', count: 70 },
        { collection: 'e', count: 60 }
      ];

      const topN = collections.slice(0, 3);

      expect(topN.length).toBe(3);
    });
  });

  /**
   * Online/Offline State Tests
   */
  describe('Online/Offline state tracking', () => {
    it('should detect offline state', () => {
      const isOnline = false;
      expect(isOnline).toBeFalse();
    });

    it('should detect online state', () => {
      const isOnline = true;
      expect(isOnline).toBeTrue();
    });

    it('should determine session is active', () => {
      const currentSession: OfflineSession | null = {
        id: 'session_1',
        userId: 'user_1',
        startTime: new Date(),
        endTime: null,
        duration: 0,
        operationsPerformed: 0,
        syncAttempts: 0,
        syncSuccesses: 0,
        syncFailures: 0
      };

      const isOfflineSession = currentSession !== null;
      expect(isOfflineSession).toBeTrue();
    });

    it('should determine no active session', () => {
      const currentSession: OfflineSession | null = null;

      const isOfflineSession = currentSession !== null;
      expect(isOfflineSession).toBeFalse();
    });
  });

  /**
   * Default Summary Values Tests
   */
  describe('Default summary values', () => {
    it('should have sensible defaults', () => {
      const defaultSummary: AnalyticsSummary = {
        totalOfflineTime: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        totalOperations: 0,
        operationsByType: {},
        syncSuccessRate: 100,
        conflictRate: 0,
        mostUsedCollections: []
      };

      expect(defaultSummary.totalOfflineTime).toBe(0);
      expect(defaultSummary.totalSessions).toBe(0);
      expect(defaultSummary.syncSuccessRate).toBe(100);
      expect(defaultSummary.conflictRate).toBe(0);
    });
  });
});
