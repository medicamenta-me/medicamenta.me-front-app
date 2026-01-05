/**
 * IndexedDBService Unit Tests
 * 
 * Tests for the IndexedDB Service that manages local storage with compression,
 * performance tracking, and batch operations.
 */

import { TestBed } from '@angular/core/testing';
import { IndexedDBService } from './indexed-db.service';
import { CompressionService } from './compression.service';
import { LogService } from './log.service';
import { AuthService } from './auth.service';
import { AnalyticsService } from './analytics.service';
import { PatientSelectorService } from './patient-selector.service';
import { CareNetworkService } from './care-network.service';
import { OfflineSyncService } from './offline-sync.service';

describe('IndexedDBService', () => {
  let service: IndexedDBService;
  let mockCompressionService: jasmine.SpyObj<CompressionService>;
  let mockIDBDatabase: any;
  let mockIDBRequest: any;
  let mockIDBTransaction: any;
  let mockIDBObjectStore: any;
  let mockIDBIndex: any;

  // Test data factories
  const createMockMedication = (id: string = 'med-1') => ({
    id,
    userId: 'user-123',
    name: 'Aspirina',
    dosage: '100mg',
    isCompleted: false,
    lastModified: new Date('2025-11-10T14:00:00')
  });

  const createMockLog = (id: string = 'log-1') => ({
    id,
    userId: 'user-123',
    eventType: 'medication_taken',
    timestamp: new Date('2025-11-10T14:00:00'),
    data: { medicationId: 'med-1' }
  });

  beforeEach(async () => {
    // Helper to create a request that auto-succeeds
    // Reads result from mockIDBRequest if set, otherwise uses default
    const createMockRequest = (defaultResult: any = undefined) => {
      const request: any = {
        onsuccess: null,
        onerror: null,
        result: mockIDBRequest?.result !== undefined ? mockIDBRequest.result : defaultResult,
        error: mockIDBRequest?.error || null
      };
      
      // Auto-trigger success/error after microtask
      Promise.resolve().then(() => {
        if (request.error && request.onerror) {
          request.onerror({ target: request } as any);
        } else if (request.onsuccess) {
          request.onsuccess({ target: request } as any);
        }
      });
      
      // Reset for next request
      if (mockIDBRequest) {
        mockIDBRequest.result = undefined;
        mockIDBRequest.error = null;
      }
      
      return request;
    };

    // Initialize mockIDBRequest as a config object
    mockIDBRequest = { result: undefined, error: null };

    // Mock IDBIndex - returns auto-succeeding request
    mockIDBIndex = {
      getAll: jasmine.createSpy('getAll').and.callFake((value?: any) => createMockRequest([])),
      count: jasmine.createSpy('count').and.callFake(() => createMockRequest(0))
    };

    // Mock IDBObjectStore - returns auto-succeeding request
    mockIDBObjectStore = {
      put: jasmine.createSpy('put').and.callFake((item: any) => createMockRequest(undefined)),
      get: jasmine.createSpy('get').and.callFake((key: any) => createMockRequest(undefined)),
      getAll: jasmine.createSpy('getAll').and.callFake(() => createMockRequest([])),
      delete: jasmine.createSpy('delete').and.callFake((key: any) => createMockRequest(undefined)),
      clear: jasmine.createSpy('clear').and.callFake(() => createMockRequest(undefined)),
      count: jasmine.createSpy('count').and.callFake(() => createMockRequest(0)),
      index: jasmine.createSpy('index').and.returnValue(mockIDBIndex),
      createIndex: jasmine.createSpy('createIndex')
    };

    // Mock IDBTransaction
    mockIDBTransaction = {
      objectStore: jasmine.createSpy('objectStore').and.returnValue(mockIDBObjectStore),
      oncomplete: null,
      onerror: null
    };
    
    // Auto-trigger transaction complete after a small delay
    setTimeout(() => {
      if (mockIDBTransaction.oncomplete) {
        mockIDBTransaction.oncomplete({} as any);
      }
    }, 10);

    // Mock IDBDatabase
    mockIDBDatabase = {
      transaction: jasmine.createSpy('transaction').and.returnValue(mockIDBTransaction),
      objectStoreNames: {
        contains: jasmine.createSpy('contains').and.returnValue(false)
      },
      createObjectStore: jasmine.createSpy('createObjectStore').and.returnValue(mockIDBObjectStore),
      deleteObjectStore: jasmine.createSpy('deleteObjectStore')
    };

    // Mock indexedDB global
    spyOn(indexedDB, 'open').and.returnValue({
      ...mockIDBRequest,
      onupgradeneeded: null
    } as any);

    // Create mock compression service
    mockCompressionService = jasmine.createSpyObj('CompressionService', [
      'compress',
      'decompress',
      'shouldCompress'
    ]);
    mockCompressionService.compress.and.returnValue('compressed-string');
    mockCompressionService.decompress.and.callFake((data: any) => data);
    mockCompressionService.shouldCompress.and.returnValue(false);

    // Create mocks for circular dependency chain
    const mockLogService = jasmine.createSpyObj('LogService', ['debug', 'info', 'warn', 'error', 'log']);
    const mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isAuthenticated']);
    const mockAnalyticsService = jasmine.createSpyObj('AnalyticsService', ['logEvent', 'setUserProperties']);
    const mockPatientSelectorService = jasmine.createSpyObj('PatientSelectorService', ['getSelectedPatientId']);
    const mockCareNetworkService = jasmine.createSpyObj('CareNetworkService', ['getCareNetworkData']);
    const mockOfflineSyncService = jasmine.createSpyObj('OfflineSyncService', ['sync', 'queueOperation']);

    await TestBed.configureTestingModule({
      providers: [
        IndexedDBService,
        { provide: CompressionService, useValue: mockCompressionService },
        { provide: LogService, useValue: mockLogService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: PatientSelectorService, useValue: mockPatientSelectorService },
        { provide: CareNetworkService, useValue: mockCareNetworkService },
        { provide: OfflineSyncService, useValue: mockOfflineSyncService }
      ]
    }).compileComponents();

    service = TestBed.inject(IndexedDBService);

    // Manually set the database to our mock
    (service as any).db = mockIDBDatabase;
    (service as any)._isReady.set(true);
    
    // Spy on private methods to prevent actual execution
    spyOn(service as any, 'ensureReady').and.resolveTo();
    spyOn(service as any, 'shouldCompress').and.returnValue(false);
    spyOn(service as any, 'compressItem').and.callFake((item: any) => item);
    spyOn(service as any, 'decompressItem').and.callFake((item: any) => item);
    // Let recordRead and recordWrite execute to track metrics
    spyOn(service as any, 'recordRead').and.callThrough();
    spyOn(service as any, 'recordWrite').and.callThrough();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isReady signal', () => {
    it('should start as true (after mock initialization)', () => {
      expect(service.isReady()).toBe(true);
    });
  });

  describe('put', () => {
    it('should add item to store', async () => {
      // Arrange
      const medication = createMockMedication();

      // Act
      await service.put('medications', medication);

      // Assert
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(medication);
    });

    it('should update existing item', async () => {
      // Arrange
      const medication = createMockMedication();
      medication.name = 'Updated Name';

      // Act
      await service.put('medications', medication);

      // Assert
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(medication);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const medication = createMockMedication();
      const error = new Error('Put failed');
      
      // Override put spy to return a failing request
      const createFailingRequest = () => {
        const request: any = {
          onsuccess: null,
          onerror: null,
          result: null,
          error
        };
        Promise.resolve().then(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
          }
        });
        return request;
      };
      mockIDBObjectStore.put.and.callFake(() => createFailingRequest());

      // Act & Assert
      await expectAsync(service.put('medications', medication)).toBeRejectedWith(error);
    });

    it('should record write metrics', async () => {
      // Arrange
      const medication = createMockMedication();
      const initialWrites = service.metrics().totalWrites;

      // Act
      await service.put('medications', medication);

      // Assert
      expect(service.metrics().totalWrites).toBeGreaterThan(initialWrites);
    });
  });

  describe('putBatch', () => {
    it('should add multiple items', async () => {
      // Arrange
      const medications = [
        createMockMedication('med-1'),
        createMockMedication('med-2'),
        createMockMedication('med-3')
      ];

      // Act
      const promise = service.putBatch('medications', medications);
      
      // Simulate transaction complete
      mockIDBTransaction.oncomplete?.();
      await promise;

      // Assert
      expect(mockIDBObjectStore.put).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      // Act
      const promise = service.putBatch('medications', []);
      mockIDBTransaction.oncomplete?.();
      await promise;

      // Assert - should not attempt any puts
      expect(mockIDBObjectStore.put).not.toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      // Arrange
      const medications = [createMockMedication()];
      const error = new Error('Transaction failed');
      
      // Create a transaction that auto-fires onerror after items are added
      const failingTransaction: any = {
        objectStore: jasmine.createSpy('objectStore').and.returnValue(mockIDBObjectStore),
        oncomplete: null,
        onerror: null,
        error
      };
      
      mockIDBDatabase.transaction.and.returnValue(failingTransaction);
      
      // Trigger onerror in next microtask (after putBatch sets the handler)
      setTimeout(() => {
        if (failingTransaction.onerror) {
          failingTransaction.onerror({ target: failingTransaction } as any);
        }
      }, 0);

      // Act & Assert
      await expectAsync(service.putBatch('medications', medications)).toBeRejectedWith(error);
    });
  });

  describe('get', () => {
    it('should retrieve item by key', async () => {
      // Arrange
      const medication = createMockMedication();
      mockIDBRequest.result = medication;

      // Act
      const result = await service.get('medications', 'med-1');

      // Assert
      expect(result).toEqual(medication);
      expect(mockIDBObjectStore.get).toHaveBeenCalledWith('med-1');
    });

    it('should return undefined for non-existent key', async () => {
      // Arrange
      mockIDBRequest.result = undefined;

      // Act
      const result = await service.get('medications', 'non-existent');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should record cache hit when item found', async () => {
      // Arrange
      mockIDBRequest.result = createMockMedication();
      const initialHits = service.metrics().cacheHits;

      // Act
      await service.get('medications', 'med-1');

      // Assert
      expect(service.metrics().cacheHits).toBeGreaterThan(initialHits);
    });

    it('should record cache miss when item not found', async () => {
      // Arrange
      mockIDBRequest.result = undefined;
      const initialMisses = service.metrics().cacheMisses;

      // Act
      await service.get('medications', 'med-1');

      // Assert
      expect(service.metrics().cacheMisses).toBeGreaterThan(initialMisses);
    });

    it('should handle read errors', async () => {
      // Arrange
      const error = new Error('Get failed');
      mockIDBRequest.error = error;

      // Act & Assert
      await expectAsync(service.get('medications', 'med-1')).toBeRejectedWith(error);
    });
  });

  describe('getAll', () => {
    it('should retrieve all items from store', async () => {
      // Arrange
      const medications = [
        createMockMedication('med-1'),
        createMockMedication('med-2')
      ];
      mockIDBRequest.result = medications;

      // Act
      const result = await service.getAll('medications');

      // Assert
      expect(result).toEqual(medications);
      expect(result.length).toBe(2);
    });

    it('should return empty array for empty store', async () => {
      // Arrange
      mockIDBRequest.result = [];

      // Act
      const result = await service.getAll('medications');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null result', async () => {
      // Arrange
      mockIDBRequest.result = null;

      // Act
      const result = await service.getAll('medications');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getByIndex', () => {
    it('should retrieve items by index value', async () => {
      // Arrange
      const medications = [createMockMedication()];
      mockIDBRequest.result = medications;

      // Act
      const result = await service.getByIndex('medications', 'userId', 'user-123');

      // Assert
      expect(result).toEqual(medications);
      expect(mockIDBObjectStore.index).toHaveBeenCalledWith('userId');
      expect(mockIDBIndex.getAll).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when no matches found', async () => {
      // Arrange
      mockIDBRequest.result = null;

      // Act
      const promise = service.getByIndex('medications', 'userId', 'user-999');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should count items in store', async () => {
      // Arrange
      mockIDBRequest.result = 5;

      // Act
      const result = await service.count('medications');

      // Assert
      expect(result).toBe(5);
      expect(mockIDBObjectStore.count).toHaveBeenCalled();
    });

    it('should return 0 for empty store', async () => {
      // Arrange
      mockIDBRequest.result = 0;

      // Act
      const result = await service.count('medications');

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('countByIndex', () => {
    it('should count items by index value', async () => {
      // Arrange
      mockIDBRequest.result = 3;

      // Act
      const result = await service.countByIndex('medications', 'userId', 'user-123');

      // Assert
      expect(result).toBe(3);
      expect(mockIDBObjectStore.index).toHaveBeenCalledWith('userId');
      expect(mockIDBIndex.count).toHaveBeenCalledWith('user-123');
    });
  });

  describe('delete', () => {
    it('should delete item by key', async () => {
      // Arrange
      mockIDBRequest.result = undefined;

      // Act
      await service.delete('medications', 'med-1');

      // Assert
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('med-1');
    });

    it('should handle delete errors', async () => {
      // Arrange
      const error = new Error('Delete failed');
      mockIDBRequest.error = error;

      // Act & Assert
      await expectAsync(service.delete('medications', 'med-1')).toBeRejectedWith(error);
    });
  });

  describe('deleteBatch', () => {
    it('should delete multiple items', async () => {
      // Arrange
      const keys = ['med-1', 'med-2', 'med-3'];

      // Act
      const promise = service.deleteBatch('medications', keys);
      mockIDBTransaction.oncomplete?.();
      await promise;

      // Assert
      expect(mockIDBObjectStore.delete).toHaveBeenCalledTimes(3);
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('med-1');
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('med-2');
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('med-3');
    });

    it('should handle empty keys array', async () => {
      // Act
      const promise = service.deleteBatch('medications', []);
      mockIDBTransaction.oncomplete?.();
      await promise;

      // Assert - should not attempt any deletes
      expect(mockIDBObjectStore.delete).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should clear all items from store', async () => {
      // Arrange
      mockIDBRequest.result = undefined;

      // Act
      await service.clear('medications');

      // Assert
      expect(mockIDBObjectStore.clear).toHaveBeenCalled();
    });

    it('should handle read errors', async () => {
      // Arrange
      const error = new Error('GetAll failed');
      mockIDBRequest.error = error;

      // Act & Assert
      await expectAsync(service.getAll('medications')).toBeRejectedWith(error);
    });
  });

  describe('clearUserData', () => {
    it('should delete all data for specific user', async () => {
      // Arrange
      const userMedications = [createMockMedication('med-1')];
      const userLogs = [createMockLog('log-1')];
      
      // Mock getByIndex to return user data
      let callCount = 0;
      mockIDBRequest.onsuccess = function() {
        if (callCount === 0) {
          this.result = userMedications; // medications
        } else if (callCount === 1) {
          this.result = userLogs; // logs
        } else {
          this.result = []; // other stores
        }
        callCount++;
      };

      // Act
      const promise = service.clearUserData('user-123');
      
      // Trigger all getByIndex success callbacks
      for (let i = 0; i < 5; i++) {
        mockIDBRequest.onsuccess?.();
      }
      
      // Trigger deleteBatch transaction completes
      mockIDBTransaction.oncomplete?.();
      mockIDBTransaction.oncomplete?.();
      
      await promise;

      // Assert - should have called getByIndex for each store
      expect(mockIDBObjectStore.index).toHaveBeenCalled();
    });
  });

  describe('getStorageStats', () => {
    it('should return count for all stores', async () => {
      // Arrange
      mockIDBRequest.result = 10;

      // Act
      const result = await service.getStorageStats();

      // Assert
      expect(result.length).toBe(9);
      expect(result[0]).toEqual(jasmine.objectContaining({
        storeName: jasmine.any(String),
        count: jasmine.any(Number)
      }));
    });
  });

  describe('exportData', () => {
    it('should export all data from all stores', async () => {
      // Arrange
      const mockData = [createMockMedication()];
      mockIDBRequest.result = mockData;

      // Act
      const result = await service.exportData();

      // Assert
      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBe(9);
      expect(result['medications']).toBeDefined();
    });
  });

  describe('performance metrics', () => {
    it('should track total reads', async () => {
      // Arrange
      mockIDBRequest.result = createMockMedication();
      const initialReads = service.metrics().totalReads;

      // Act
      await service.get('medications', 'med-1');

      // Assert
      expect(service.metrics().totalReads).toBeGreaterThan(initialReads);
    });

    it('should track total writes', async () => {
      // Arrange
      const medication = createMockMedication();
      const initialWrites = service.metrics().totalWrites;

      // Act
      await service.put('medications', medication);

      // Assert
      expect(service.metrics().totalWrites).toBeGreaterThan(initialWrites);
    });

    it('should provide readonly metrics signal', () => {
      // Act
      const metrics = service.metrics();

      // Assert
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalReads).toBe('number');
      expect(typeof metrics.totalWrites).toBe('number');
      expect(typeof metrics.cacheHits).toBe('number');
      expect(typeof metrics.cacheMisses).toBe('number');
    });
  });

  describe('database initialization', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockRequest: any = {
        onsuccess: null,
        onerror: null as any,
        onupgradeneeded: null,
        error: new Error('DB Open failed')
      };
      
      (indexedDB.open as jasmine.Spy).and.returnValue(mockRequest);
      
      // Create new service instance via TestBed to provide injection context
      const newService = TestBed.inject(IndexedDBService);
      
      // Trigger error
      if (mockRequest.onerror) {
        mockRequest.onerror();
      }

      // Wait for initialization attempt
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert - service should handle error without throwing
      expect(newService).toBeTruthy();
    });
  });
});
