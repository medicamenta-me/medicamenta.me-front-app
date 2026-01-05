/**
 * 🧪 Offline Sync Enhanced Service - Unit Tests
 *
 * Suite de testes para o serviço de sincronização offline aprimorado
 *
 * @version 1.0.0
 * @date 03/01/2026
 */

import { TestBed, fakeAsync, tick, discardPeriodicTasks } from "@angular/core/testing";
import { OfflineSyncEnhancedService } from "./offline-sync-enhanced.service";
import { OfflineSyncService, SyncConflict, SyncStrategy } from "./offline-sync.service";
import {
  OfflineQueueService,
  QueuePriority,
  QueueItemStatus,
  QueueItem,
  OperationHandler,
  QueueMetrics,
  BatchProcessResult,
} from "./offline-queue.service";
import { LogService } from "./log.service";
import { ToastService } from "./toast.service";
import { signal, WritableSignal } from "@angular/core";

// ============================================================================
// MOCKS
// ============================================================================

class MockLogService {
  debug = jasmine.createSpy("debug");
  info = jasmine.createSpy("info");
  warn = jasmine.createSpy("warn");
  error = jasmine.createSpy("error");
}

class MockToastService {
  showOnline = jasmine.createSpy("showOnline");
  showOffline = jasmine.createSpy("showOffline");
  showSyncComplete = jasmine.createSpy("showSyncComplete");
  showSyncError = jasmine.createSpy("showSyncError");
  showConflict = jasmine.createSpy("showConflict");
}

class MockOfflineSyncService {
  private _syncStatus: WritableSignal<string> = signal("online");
  readonly syncStatus = this._syncStatus.asReadonly();

  private _conflicts: WritableSignal<SyncConflict[]> = signal([]);
  readonly conflicts = this._conflicts.asReadonly();

  private _syncStats = signal({
    lastSyncTime: null,
    pendingOperations: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    resolvedConflicts: 0,
    unresolvedConflicts: 0,
  });
  readonly syncStats = this._syncStats.asReadonly();

  registerConflict = jasmine
    .createSpy("registerConflict")
    .and.callFake(
      (
        collection: string,
        documentId: string,
        localData: unknown,
        serverData: unknown,
        localTimestamp: Date,
        serverTimestamp: Date
      ) => {
        const conflict: SyncConflict = {
          id: `conflict_${Date.now()}`,
          collection,
          documentId,
          localData,
          serverData,
          localTimestamp,
          serverTimestamp,
          detectedAt: new Date(),
          resolved: false,
        };
        this._conflicts.set([...this._conflicts(), conflict]);
        return conflict;
      }
    );

  resolveConflict = jasmine.createSpy("resolveConflict").and.returnValue(Promise.resolve(true));
  resolveConflictWithMerge = jasmine.createSpy("resolveConflictWithMerge").and.returnValue(Promise.resolve(true));
  clearResolvedConflicts = jasmine.createSpy("clearResolvedConflicts");

  // Helper for tests
  setSyncStatus(status: string): void {
    this._syncStatus.set(status);
  }

  setConflicts(conflicts: SyncConflict[]): void {
    this._conflicts.set(conflicts);
  }
}

class MockOfflineQueueService {
  private _isOnline: WritableSignal<boolean> = signal(true);
  readonly isOnline = this._isOnline.asReadonly();

  private _isProcessing: WritableSignal<boolean> = signal(false);
  readonly isProcessing = this._isProcessing.asReadonly();

  private _queue: WritableSignal<QueueItem[]> = signal([]);
  readonly queue = this._queue.asReadonly();

  private _metrics: WritableSignal<QueueMetrics> = signal({
    totalQueued: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalDiscarded: 0,
    avgProcessingTimeMs: 0,
    byPriority: {
      [QueuePriority.CRITICAL]: { queued: 0, succeeded: 0, failed: 0 },
      [QueuePriority.HIGH]: { queued: 0, succeeded: 0, failed: 0 },
      [QueuePriority.NORMAL]: { queued: 0, succeeded: 0, failed: 0 },
      [QueuePriority.LOW]: { queued: 0, succeeded: 0, failed: 0 },
    },
  });
  readonly metrics = this._metrics.asReadonly();

  private _config = signal({
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    autoProcess: true,
    processIntervalMs: 5000,
  });
  readonly config = this._config.asReadonly();

  pendingCount = signal(0);
  criticalPendingCount = signal(0);

  enqueue = jasmine.createSpy("enqueue").and.callFake(() => `q_${Date.now()}`);
  dequeue = jasmine.createSpy("dequeue").and.returnValue(true);
  getItem = jasmine.createSpy("getItem").and.returnValue(undefined);
  registerHandler = jasmine.createSpy("registerHandler");
  unregisterHandler = jasmine.createSpy("unregisterHandler").and.returnValue(true);
  forceProcess = jasmine.createSpy("forceProcess").and.returnValue(
    Promise.resolve<BatchProcessResult>({
      total: 1,
      succeeded: 1,
      failed: 0,
      discarded: 0,
      results: [],
    })
  );
  getQueueSummary = jasmine.createSpy("getQueueSummary").and.returnValue({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    discarded: 0,
    byPriority: {
      [QueuePriority.CRITICAL]: 0,
      [QueuePriority.HIGH]: 0,
      [QueuePriority.NORMAL]: 0,
      [QueuePriority.LOW]: 0,
    },
  });
  clearCompleted = jasmine.createSpy("clearCompleted").and.returnValue(0);
  clearDiscarded = jasmine.createSpy("clearDiscarded").and.returnValue(0);
  resetMetrics = jasmine.createSpy("resetMetrics");
  updateConfig = jasmine.createSpy("updateConfig");
  resetConfig = jasmine.createSpy("resetConfig");

  // Helpers for tests
  setOnline(online: boolean): void {
    this._isOnline.set(online);
  }

  setProcessing(processing: boolean): void {
    this._isProcessing.set(processing);
  }

  setPendingCount(count: number): void {
    this.pendingCount.set(count);
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("OfflineSyncEnhancedService", () => {
  let service: OfflineSyncEnhancedService;
  let offlineSyncService: MockOfflineSyncService;
  let offlineQueueService: MockOfflineQueueService;
  let logService: MockLogService;
  let toastService: MockToastService;

  beforeEach(() => {
    offlineSyncService = new MockOfflineSyncService();
    offlineQueueService = new MockOfflineQueueService();
    logService = new MockLogService();
    toastService = new MockToastService();

    TestBed.configureTestingModule({
      providers: [
        OfflineSyncEnhancedService,
        { provide: OfflineSyncService, useValue: offlineSyncService },
        { provide: OfflineQueueService, useValue: offlineQueueService },
        { provide: LogService, useValue: logService },
        { provide: ToastService, useValue: toastService },
      ],
    });

    service = TestBed.inject(OfflineSyncEnhancedService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe("Initialization", () => {
    it("should be created", () => {
      expect(service).toBeTruthy();
    });

    it("should log initialization", () => {
      expect(logService.info).toHaveBeenCalledWith("OfflineSyncEnhancedService", "Service initialized");
    });

    it("should register default handlers", () => {
      expect(offlineQueueService.registerHandler).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // COMPUTED SIGNALS
  // ==========================================================================

  describe("Computed Signals", () => {
    it("should expose isOnline from queue service", () => {
      expect(service.isOnline()).toBe(true);

      offlineQueueService.setOnline(false);
      expect(service.isOnline()).toBe(false);
    });

    it("should expose syncStatus from sync service", () => {
      expect(service.syncStatus()).toBe("online");

      offlineSyncService.setSyncStatus("syncing");
      expect(service.syncStatus()).toBe("syncing");
    });

    it("should compute hasPendingOperations", () => {
      expect(service.hasPendingOperations()).toBe(false);

      offlineQueueService.setPendingCount(5);
      expect(service.hasPendingOperations()).toBe(true);
    });

    it("should compute unresolvedConflicts", () => {
      expect(service.unresolvedConflicts().length).toBe(0);

      const conflicts: SyncConflict[] = [
        {
          id: "c1",
          collection: "test",
          documentId: "d1",
          localData: {},
          serverData: {},
          localTimestamp: new Date(),
          serverTimestamp: new Date(),
          detectedAt: new Date(),
          resolved: false,
        },
        {
          id: "c2",
          collection: "test",
          documentId: "d2",
          localData: {},
          serverData: {},
          localTimestamp: new Date(),
          serverTimestamp: new Date(),
          detectedAt: new Date(),
          resolved: true,
        },
      ];
      offlineSyncService.setConflicts(conflicts);

      expect(service.unresolvedConflicts().length).toBe(1);
    });

    it("should compute hasUnresolvedConflicts", () => {
      expect(service.hasUnresolvedConflicts()).toBe(false);

      offlineSyncService.setConflicts([
        {
          id: "c1",
          collection: "test",
          documentId: "d1",
          localData: {},
          serverData: {},
          localTimestamp: new Date(),
          serverTimestamp: new Date(),
          detectedAt: new Date(),
          resolved: false,
        },
      ]);

      expect(service.hasUnresolvedConflicts()).toBe(true);
    });

    it("should expose pendingCount from queue service", () => {
      offlineQueueService.setPendingCount(10);
      expect(service.pendingCount()).toBe(10);
    });

    it("should expose queueMetrics from queue service", () => {
      expect(service.queueMetrics()).toBeDefined();
      expect(service.queueMetrics().totalQueued).toBe(0);
    });

    it("should expose syncStats from sync service", () => {
      expect(service.syncStats()).toBeDefined();
      expect(service.syncStats().pendingOperations).toBe(0);
    });

    it("should expose isProcessing from queue service", () => {
      expect(service.isProcessing()).toBe(false);

      offlineQueueService.setProcessing(true);
      expect(service.isProcessing()).toBe(true);
    });
  });

  // ==========================================================================
  // QUEUE OPERATIONS
  // ==========================================================================

  describe("Queue Operations", () => {
    it("should queue operation with default priority", () => {
      const id = service.queueOperation("create", "medications", "doc-1", { name: "Test" });

      expect(id).toBeDefined();
      expect(offlineQueueService.enqueue).toHaveBeenCalledWith("create", "medications", { name: "Test" }, {
        documentId: "doc-1",
        priority: QueuePriority.NORMAL,
        metadata: {
          originalType: "create",
          originalPriority: "normal",
        },
      });
    });

    it("should queue operation with critical priority", () => {
      service.queueOperation("update", "doses", "dose-1", { taken: true }, "critical");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith("update", "doses", { taken: true }, {
        documentId: "dose-1",
        priority: QueuePriority.CRITICAL,
        metadata: {
          originalType: "update",
          originalPriority: "critical",
        },
      });
    });

    it("should queue operation with high priority", () => {
      service.queueOperation("create", "medications", "med-1", {}, "high");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith("create", "medications", {}, jasmine.objectContaining({
        priority: QueuePriority.HIGH,
      }));
    });

    it("should queue operation with low priority", () => {
      service.queueOperation("update", "analytics", "a-1", {}, "low");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith("update", "analytics", {}, jasmine.objectContaining({
        priority: QueuePriority.LOW,
      }));
    });

    it("should queue critical operation via dedicated method", () => {
      service.queueCriticalOperation("create", "doses", "dose-1", { medicationId: "med-1" });

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
        "create",
        "doses",
        { medicationId: "med-1" },
        jasmine.objectContaining({
          priority: QueuePriority.CRITICAL,
        })
      );
    });

    it("should log queue operation", () => {
      service.queueOperation("create", "medications", "doc-1", {});

      expect(logService.debug).toHaveBeenCalledWith(
        "OfflineSyncEnhancedService",
        "Operation queued",
        jasmine.any(Object)
      );
    });

    it("should remove operation", () => {
      const result = service.removeOperation("op-123");

      expect(result).toBe(true);
      expect(offlineQueueService.dequeue).toHaveBeenCalledWith("op-123");
    });

    it("should get operation by id", () => {
      service.getOperation("op-123");

      expect(offlineQueueService.getItem).toHaveBeenCalledWith("op-123");
    });

    it("should handle delete operation type", () => {
      service.queueOperation("delete", "medications", "med-1");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
        "delete",
        "medications",
        undefined,
        jasmine.any(Object)
      );
    });
  });

  // ==========================================================================
  // SYNC OPERATIONS
  // ==========================================================================

  describe("Sync Operations", () => {
    it("should sync when online", async () => {
      offlineQueueService.setOnline(true);

      const result = await service.syncNow();

      expect(result.succeeded).toBe(1);
      expect(offlineQueueService.forceProcess).toHaveBeenCalled();
    });

    it("should show success toast when sync succeeds", async () => {
      offlineQueueService.setOnline(true);

      await service.syncNow();

      expect(toastService.showSyncComplete).toHaveBeenCalledWith(1, 0);
    });

    it("should not sync when offline", async () => {
      offlineQueueService.setOnline(false);

      const result = await service.syncNow();

      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
      expect(offlineQueueService.forceProcess).not.toHaveBeenCalled();
      expect(toastService.showOffline).toHaveBeenCalled();
    });

    it("should log warning when trying to sync offline", async () => {
      offlineQueueService.setOnline(false);

      await service.syncNow();

      expect(logService.warn).toHaveBeenCalledWith(
        "OfflineSyncEnhancedService",
        "Cannot sync while offline"
      );
    });

    it("should handle sync errors", async () => {
      offlineQueueService.setOnline(true);
      offlineQueueService.forceProcess.and.returnValue(Promise.reject(new Error("Sync error")));

      const result = await service.syncNow();

      expect(result.succeeded).toBe(0);
      expect(toastService.showSyncError).toHaveBeenCalled();
      expect(logService.error).toHaveBeenCalled();
    });

    it("should show error toast when sync has failures", async () => {
      offlineQueueService.setOnline(true);
      offlineQueueService.forceProcess.and.returnValue(
        Promise.resolve({
          total: 2,
          succeeded: 0,
          failed: 2,
          discarded: 0,
          results: [],
        })
      );

      await service.syncNow();

      expect(toastService.showSyncError).toHaveBeenCalled();
    });

    it("should log sync results", async () => {
      offlineQueueService.setOnline(true);

      await service.syncNow();

      expect(logService.info).toHaveBeenCalledWith(
        "OfflineSyncEnhancedService",
        "Sync complete",
        jasmine.any(Object)
      );
    });

    it("should get queue summary", () => {
      service.getQueueSummary();

      expect(offlineQueueService.getQueueSummary).toHaveBeenCalled();
    });

    it("should clear completed operations", () => {
      service.clearCompleted();

      expect(offlineQueueService.clearCompleted).toHaveBeenCalled();
    });

    it("should clear discarded operations", () => {
      service.clearDiscarded();

      expect(offlineQueueService.clearDiscarded).toHaveBeenCalled();
    });

    it("should reset metrics", () => {
      service.resetMetrics();

      expect(offlineQueueService.resetMetrics).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CONFLICT RESOLUTION
  // ==========================================================================

  describe("Conflict Resolution", () => {
    it("should register conflict", () => {
      const localData = { name: "Local" };
      const serverData = { name: "Server" };
      const localTs = new Date();
      const serverTs = new Date();

      const conflict = service.registerConflict("medications", "med-1", localData, serverData, localTs, serverTs);

      expect(offlineSyncService.registerConflict).toHaveBeenCalledWith(
        "medications",
        "med-1",
        localData,
        serverData,
        localTs,
        serverTs
      );
      expect(conflict).toBeDefined();
    });

    it("should resolve conflict with strategy", async () => {
      const result = await service.resolveConflict("conflict-1", "server-wins");

      expect(result).toBe(true);
      expect(offlineSyncService.resolveConflict).toHaveBeenCalledWith("conflict-1", "server-wins");
    });

    it("should resolve conflict with merge", async () => {
      const mergedData = { name: "Merged" };

      const result = await service.resolveConflictWithMerge("conflict-1", mergedData);

      expect(result).toBe(true);
      expect(offlineSyncService.resolveConflictWithMerge).toHaveBeenCalledWith("conflict-1", mergedData);
    });

    it("should clear resolved conflicts", () => {
      service.clearResolvedConflicts();

      expect(offlineSyncService.clearResolvedConflicts).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // HANDLER REGISTRATION
  // ==========================================================================

  describe("Handler Registration", () => {
    it("should register operation handler", () => {
      const handler: OperationHandler = {
        type: "create",
        collections: ["medications"],
        process: jasmine.createSpy("process").and.returnValue(Promise.resolve(true)),
      };

      service.registerOperationHandler(handler);

      expect(offlineQueueService.registerHandler).toHaveBeenCalledWith(handler);
      expect(logService.debug).toHaveBeenCalledWith(
        "OfflineSyncEnhancedService",
        "Handler registered",
        jasmine.any(Object)
      );
    });

    it("should unregister operation handler", () => {
      const result = service.unregisterOperationHandler("create", ["medications"]);

      expect(result).toBe(true);
      expect(offlineQueueService.unregisterHandler).toHaveBeenCalledWith("create", ["medications"]);
    });
  });

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  describe("Configuration", () => {
    it("should update queue config", () => {
      const config = { maxRetries: 10 };

      service.updateQueueConfig(config);

      expect(offlineQueueService.updateConfig).toHaveBeenCalledWith(config);
    });

    it("should get queue config", () => {
      const config = service.getQueueConfig();

      expect(config).toBeDefined();
      expect(config.maxRetries).toBe(5);
    });

    it("should reset queue config", () => {
      service.resetQueueConfig();

      expect(offlineQueueService.resetConfig).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  describe("Lifecycle", () => {
    it("should log destruction", () => {
      service.ngOnDestroy();

      expect(logService.info).toHaveBeenCalledWith("OfflineSyncEnhancedService", "Service destroyed");
    });
  });

  // ==========================================================================
  // PRIORITY MAPPING
  // ==========================================================================

  describe("Priority Mapping", () => {
    it("should map critical priority correctly", () => {
      service.queueOperation("create", "test", "d1", {}, "critical");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.any(Object),
        jasmine.objectContaining({ priority: QueuePriority.CRITICAL })
      );
    });

    it("should map high priority correctly", () => {
      service.queueOperation("create", "test", "d1", {}, "high");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.any(Object),
        jasmine.objectContaining({ priority: QueuePriority.HIGH })
      );
    });

    it("should map normal priority correctly", () => {
      service.queueOperation("create", "test", "d1", {}, "normal");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.any(Object),
        jasmine.objectContaining({ priority: QueuePriority.NORMAL })
      );
    });

    it("should map low priority correctly", () => {
      service.queueOperation("create", "test", "d1", {}, "low");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.any(String),
        jasmine.any(Object),
        jasmine.objectContaining({ priority: QueuePriority.LOW })
      );
    });
  });

  // ==========================================================================
  // OPERATION TYPE MAPPING
  // ==========================================================================

  describe("Operation Type Mapping", () => {
    it("should map create operation correctly", () => {
      service.queueOperation("create", "test", "d1", {});

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith("create", jasmine.any(String), jasmine.any(Object), jasmine.any(Object));
    });

    it("should map update operation correctly", () => {
      service.queueOperation("update", "test", "d1", {});

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith("update", jasmine.any(String), jasmine.any(Object), jasmine.any(Object));
    });

    it("should map delete operation correctly", () => {
      service.queueOperation("delete", "test", "d1");

      expect(offlineQueueService.enqueue).toHaveBeenCalledWith("delete", "test", undefined, jasmine.any(Object));
    });
  });
});
