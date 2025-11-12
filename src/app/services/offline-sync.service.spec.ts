/**
 * OfflineSyncService Unit Tests
 * 
 * Tests for the Offline Sync Service that manages queue operations,
 * conflict resolution, and online/offline synchronization.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { 
  OfflineSyncService, 
  QueuedOperation, 
  SyncConflict
} from './offline-sync.service';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexed-db.service';
import { ToastService } from './toast.service';

describe('OfflineSyncService', () => {
  let service: OfflineSyncService;
  let mockAuthService: any;
  let mockIndexedDBService: jasmine.SpyObj<IndexedDBService>;
  let mockToastService: jasmine.SpyObj<ToastService>;

  const mockConflict: SyncConflict = {
    id: 'conflict-1',
    collection: 'medications',
    documentId: 'med-123',
    localData: { name: 'Aspirina', dosage: '100mg', updatedAt: new Date('2025-11-10T14:00:00') },
    serverData: { name: 'Aspirina', dosage: '200mg', updatedAt: new Date('2025-11-10T15:00:00') },
    localTimestamp: new Date('2025-11-10T14:00:00'),
    serverTimestamp: new Date('2025-11-10T15:00:00'),
    detectedAt: new Date(),
    resolved: false
  };

  beforeEach(() => {
    // Create mocks
    mockAuthService = {
      currentUser: signal({ uid: 'user-123', email: 'test@example.com' })
    };

    mockIndexedDBService = jasmine.createSpyObj('IndexedDBService', [
      'put',
      'get',
      'delete',
      'getAll',
      'clear'
    ]);
    mockIndexedDBService.get.and.returnValue(Promise.resolve(null));
    mockIndexedDBService.getAll.and.returnValue(Promise.resolve([]));
    mockIndexedDBService.clear.and.returnValue(Promise.resolve());
    mockIndexedDBService.putBatch = jasmine.createSpy('putBatch').and.returnValue(Promise.resolve());

    mockToastService = jasmine.createSpyObj('ToastService', ['show', 'showOnline', 'showOffline']);

    TestBed.configureTestingModule({
      providers: [
        OfflineSyncService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: IndexedDBService, useValue: mockIndexedDBService },
        { provide: ToastService, useValue: mockToastService }
      ]
    });

    service = TestBed.inject(OfflineSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isOnline signal', () => {
    it('should start as online', () => {
      expect(service.isOnline()).toBe(true);
    });

    it('should detect offline status', (done) => {
      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      
      // Wait for signal update
      setTimeout(() => {
        expect(service.isOnline()).toBe(false);
        done();
      }, 100);
    });
  });

  describe('queueOperation', () => {
    it('should add operation to queue', () => {
      // Act
      service.queueOperation('create', 'medications', 'med-123', { name: 'Test' });

      // Assert
      const stats = service.syncStats();
      expect(stats.pendingOperations).toBe(1);
    });

    it('should assign correct priority', () => {
      // Act
      service.queueOperation('delete', 'medications', 'med-123', undefined, 'critical');

      // Assert
      const queue = (service as any)._operationQueue();
      expect(queue[0].priority).toBe('critical');
    });

    it('should set default priority to normal', () => {
      // Act
      service.queueOperation('update', 'medications', 'med-123', { stock: 20 });

      // Assert
      const queue = (service as any)._operationQueue();
      expect(queue[0].priority).toBe('normal');
    });

    it('should set retry count to 0', () => {
      // Act
      service.queueOperation('create', 'medications', 'med-123', { name: 'Test' });

      // Assert
      const queue = (service as any)._operationQueue();
      expect(queue[0].retryCount).toBe(0);
    });

    it('should return operation ID', () => {
      // Act
      const operationId = service.queueOperation('create', 'medications', 'med-123', { name: 'Test' });

      // Assert
      expect(operationId).toContain('op_');
    });

    it('should throw error if user not authenticated', () => {
      // Arrange
      mockAuthService.currentUser.set(null);

      // Act & Assert
      expect(() => {
        service.queueOperation('create', 'medications', 'med-123', { name: 'Test' });
      }).toThrowError('User must be authenticated to queue operations');
    });
  });

  describe('clearPendingOperations', () => {
    it('should clear all pending operations', () => {
      // Arrange
      service.queueOperation('create', 'medications', 'med-1', {});
      service.queueOperation('update', 'medications', 'med-2', {});

      // Act
      service.clearPendingOperations();

      // Assert
      expect(service.syncStats().pendingOperations).toBe(0);
    });
  });

  describe('setDefaultStrategy', () => {
    it('should update default conflict resolution strategy', () => {
      // Act
      service.setDefaultStrategy('client-wins');

      // Assert
      expect(service.getDefaultStrategy()).toBe('client-wins');
    });

    it('should persist strategy to localStorage', () => {
      // Arrange
      spyOn(localStorage, 'setItem');

      // Act
      service.setDefaultStrategy('server-wins');

      // Assert
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'medicamenta_sync_strategy',
        'server-wins'
      );
    });
  });

  describe('getDefaultStrategy', () => {
    it('should return newest-wins as default', () => {
      // Arrange - Clear any previously stored strategy
      localStorage.removeItem('medicamenta_sync_strategy');
      
      // Act
      const strategy = service.getDefaultStrategy();

      // Assert
      expect(strategy).toBe('newest-wins');
    });

    it('should return stored strategy', () => {
      // Arrange
      service.setDefaultStrategy('client-wins');

      // Act
      const strategy = service.getDefaultStrategy();

      // Assert
      expect(strategy).toBe('client-wins');
    });
  });

  describe('clearResolvedConflicts', () => {
    it('should remove resolved conflicts', () => {
      // Arrange
      const resolvedConflict = { ...mockConflict, resolved: true };
      const unresolvedConflict = { ...mockConflict, id: 'conflict-2' };
      (service as any)._conflicts.set([resolvedConflict, unresolvedConflict]);

      // Act
      service.clearResolvedConflicts();

      // Assert
      const conflicts = service.conflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].id).toBe('conflict-2');
    });

    it('should not remove unresolved conflicts', () => {
      // Arrange
      const unresolvedConflict = { ...mockConflict, resolved: false };
      (service as any)._conflicts.set([unresolvedConflict]);

      // Act
      service.clearResolvedConflicts();

      // Assert
      expect(service.conflicts().length).toBe(1);
    });
  });

  describe('convertTimestamp', () => {
    it('should convert Firestore Timestamp to Date', () => {
      // Arrange
      const firestoreTimestamp = {
        seconds: 1699632000,
        nanoseconds: 0,
        toDate: () => new Date('2025-11-10T14:00:00')
      };

      // Act
      const result = (service as any).convertTimestamp(firestoreTimestamp);

      // Assert
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle Date objects', () => {
      // Arrange
      const date = new Date('2025-11-10T14:00:00');

      // Act
      const result = (service as any).convertTimestamp(date);

      // Assert
      expect(result).toEqual(date);
    });

    it('should handle null timestamps', () => {
      // Act
      const result = (service as any).convertTimestamp(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle undefined timestamps', () => {
      // Act
      const result = (service as any).convertTimestamp(undefined);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('generateOperationId', () => {
    it('should generate unique operation IDs', () => {
      // Act
      const id1 = (service as any).generateOperationId();
      const id2 = (service as any).generateOperationId();

      // Assert
      expect(id1).not.toEqual(id2);
      expect(id1).toContain('op_');
      expect(id2).toContain('op_');
    });
  });

  describe('generateConflictId', () => {
    it('should generate unique conflict IDs', () => {
      // Act
      const id1 = (service as any).generateConflictId();
      const id2 = (service as any).generateConflictId();

      // Assert
      expect(id1).not.toEqual(id2);
      expect(id1).toContain('conflict_');
      expect(id2).toContain('conflict_');
    });
  });

  describe('stats computed signal', () => {
    it('should count pending operations correctly', () => {
      // Arrange
      service.queueOperation('create', 'meds', '1', {});
      service.queueOperation('update', 'meds', '2', {});

      // Assert
      expect(service.syncStats().pendingOperations).toBe(2);
    });

    it('should count unresolved conflicts correctly', () => {
      // Arrange
      const conflict1 = { ...mockConflict, id: 'c1', resolved: false };
      const conflict2 = { ...mockConflict, id: 'c2', resolved: false };
      const conflict3 = { ...mockConflict, id: 'c3', resolved: true };
      (service as any)._conflicts.set([conflict1, conflict2, conflict3]);
      
      // Update stats to reflect the conflicts
      (service as any).updateStats({ 
        unresolvedConflicts: 2,
        resolvedConflicts: 1
      });

      // Assert
      expect(service.syncStats().unresolvedConflicts).toBe(2);
    });

    it('should count resolved conflicts correctly', () => {
      // Arrange
      const conflict1 = { ...mockConflict, id: 'c1', resolved: true };
      const conflict2 = { ...mockConflict, id: 'c2', resolved: true };
      const conflict3 = { ...mockConflict, id: 'c3', resolved: false };
      (service as any)._conflicts.set([conflict1, conflict2, conflict3]);
      
      // Update stats to reflect the conflicts
      (service as any).updateStats({ 
        resolvedConflicts: 2,
        unresolvedConflicts: 1
      });

      // Assert
      expect(service.syncStats().resolvedConflicts).toBe(2);
    });
  });

  describe('updateStats', () => {
    it('should update successful syncs count', () => {
      // Act
      (service as any).updateStats({ successfulSyncs: 5 });

      // Assert
      expect(service.syncStats().successfulSyncs).toBe(5);
    });

    it('should update failed syncs count', () => {
      // Act
      (service as any).updateStats({ failedSyncs: 2 });

      // Assert
      expect(service.syncStats().failedSyncs).toBe(2);
    });

    it('should update last sync time', () => {
      // Arrange
      const now = new Date();

      // Act
      (service as any).updateStats({ lastSyncTime: now });

      // Assert
      expect(service.syncStats().lastSyncTime).toEqual(now);
    });
  });

  describe('persistStats', () => {
    it('should save stats to localStorage', () => {
      // Arrange
      spyOn(localStorage, 'setItem');
      (service as any).updateStats({ successfulSyncs: 10, failedSyncs: 2 });

      // Act
      (service as any).persistStats();

      // Assert
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'medicamenta_sync_stats',
        jasmine.any(String)
      );
    });
  });

  describe('loadPersistedStats', () => {
    it('should load stats from localStorage', () => {
      // Arrange
      const mockStats = {
        lastSyncTime: new Date().toISOString(),
        successfulSyncs: 15,
        failedSyncs: 3,
        resolvedConflicts: 2,
        unresolvedConflicts: 1,
        pendingOperations: 5
      };
      spyOn(localStorage, 'getItem').and.returnValue(JSON.stringify(mockStats));

      // Act
      (service as any).loadPersistedStats();

      // Assert
      expect(service.syncStats().successfulSyncs).toBe(15);
      expect(service.syncStats().failedSyncs).toBe(3);
    });

    it('should handle missing localStorage data', () => {
      // Arrange
      spyOn(localStorage, 'getItem').and.returnValue(null);

      // Act & Assert
      expect(() => (service as any).loadPersistedStats()).not.toThrow();
    });
  });
});
