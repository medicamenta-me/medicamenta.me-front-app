/**
 * IndexedDBService Unit Tests
 * 
 * Tests for the IndexedDB Service that manages local storage with compression,
 * performance tracking, and batch operations.
 */

import { TestBed } from '@angular/core/testing';
import { IndexedDBService } from './indexed-db.service';
import { CompressionService } from './compression.service';

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
    // Mock IDBIndex
    mockIDBIndex = {
      getAll: jasmine.createSpy('getAll').and.returnValue(mockIDBRequest),
      count: jasmine.createSpy('count').and.returnValue(mockIDBRequest)
    };

    // Mock IDBObjectStore
    mockIDBObjectStore = {
      put: jasmine.createSpy('put').and.returnValue(mockIDBRequest),
      get: jasmine.createSpy('get').and.returnValue(mockIDBRequest),
      getAll: jasmine.createSpy('getAll').and.returnValue(mockIDBRequest),
      delete: jasmine.createSpy('delete').and.returnValue(mockIDBRequest),
      clear: jasmine.createSpy('clear').and.returnValue(mockIDBRequest),
      count: jasmine.createSpy('count').and.returnValue(mockIDBRequest),
      index: jasmine.createSpy('index').and.returnValue(mockIDBIndex),
      createIndex: jasmine.createSpy('createIndex')
    };

    // Mock IDBTransaction
    mockIDBTransaction = {
      objectStore: jasmine.createSpy('objectStore').and.returnValue(mockIDBObjectStore),
      oncomplete: null,
      onerror: null
    };

    // Mock IDBDatabase
    mockIDBDatabase = {
      transaction: jasmine.createSpy('transaction').and.returnValue(mockIDBTransaction),
      objectStoreNames: {
        contains: jasmine.createSpy('contains').and.returnValue(false)
      },
      createObjectStore: jasmine.createSpy('createObjectStore').and.returnValue(mockIDBObjectStore),
      deleteObjectStore: jasmine.createSpy('deleteObjectStore')
    };

    // Mock IDBRequest (used by all IDB operations)
    mockIDBRequest = {
      onsuccess: null,
      onerror: null,
      result: null
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

    await TestBed.configureTestingModule({
      providers: [
        IndexedDBService,
        { provide: CompressionService, useValue: mockCompressionService }
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
    spyOn(service as any, 'recordRead').and.stub();
    spyOn(service as any, 'recordWrite').and.stub();
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
      mockIDBRequest.result = undefined;

      // Act
      const promise = service.put('medications', medication);
      
      // Simulate success
      mockIDBRequest.onsuccess?.();
      await promise;

      // Assert
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(medication);
    });

    it('should update existing item', async () => {
      // Arrange
      const medication = createMockMedication();
      medication.name = 'Updated Name';
      mockIDBRequest.result = undefined;

      // Act
      const promise = service.put('medications', medication);
      mockIDBRequest.onsuccess?.();
      await promise;

      // Assert
      expect(mockIDBObjectStore.put).toHaveBeenCalledWith(medication);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const medication = createMockMedication();
      const error = new Error('Put failed');
      mockIDBRequest.error = error;

      // Act & Assert
      const promise = service.put('medications', medication);
      mockIDBRequest.onerror?.();
      
      await expectAsync(promise).toBeRejectedWith(error);
    });

    it('should record write metrics', async () => {
      // Arrange
      const medication = createMockMedication();
      mockIDBRequest.result = undefined;
      const initialWrites = service.metrics().totalWrites;

      // Act
      const promise = service.put('medications', medication);
      mockIDBRequest.onsuccess?.();
      await promise;

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
      mockIDBTransaction.error = error;

      // Act & Assert
      const promise = service.putBatch('medications', medications);
      mockIDBTransaction.onerror?.();
      
      await expectAsync(promise).toBeRejectedWith(error);
    });
  });

  describe('get', () => {
    it('should retrieve item by key', async () => {
      // Arrange
      const medication = createMockMedication();
      mockIDBRequest.result = medication;

      // Act
      const promise = service.get('medications', 'med-1');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

      // Assert
      expect(result).toEqual(medication);
      expect(mockIDBObjectStore.get).toHaveBeenCalledWith('med-1');
    });

    it('should return undefined for non-existent key', async () => {
      // Arrange
      mockIDBRequest.result = undefined;

      // Act
      const promise = service.get('medications', 'non-existent');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

      // Assert
      expect(result).toBeUndefined();
    });

    it('should record cache hit when item found', async () => {
      // Arrange
      mockIDBRequest.result = createMockMedication();
      const initialHits = service.metrics().cacheHits;

      // Act
      const promise = service.get('medications', 'med-1');
      mockIDBRequest.onsuccess?.();
      await promise;

      // Assert
      expect(service.metrics().cacheHits).toBeGreaterThan(initialHits);
    });

    it('should record cache miss when item not found', async () => {
      // Arrange
      mockIDBRequest.result = undefined;
      const initialMisses = service.metrics().cacheMisses;

      // Act
      const promise = service.get('medications', 'med-1');
      mockIDBRequest.onsuccess?.();
      await promise;

      // Assert
      expect(service.metrics().cacheMisses).toBeGreaterThan(initialMisses);
    });

    it('should handle read errors', async () => {
      // Arrange
      const error = new Error('Get failed');
      mockIDBRequest.error = error;

      // Act & Assert
      const promise = service.get('medications', 'med-1');
      mockIDBRequest.onerror?.();
      
      await expectAsync(promise).toBeRejectedWith(error);
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
      const promise = service.getAll('medications');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

      // Assert
      expect(result).toEqual(medications);
      expect(result.length).toBe(2);
    });

    it('should return empty array when store is empty', async () => {
      // Arrange
      mockIDBRequest.result = [];

      // Act
      const promise = service.getAll('medications');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null result', async () => {
      // Arrange
      mockIDBRequest.result = null;

      // Act
      const promise = service.getAll('medications');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

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
      const promise = service.getByIndex('medications', 'userId', 'user-123');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

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
      const promise = service.count('medications');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

      // Assert
      expect(result).toBe(5);
      expect(mockIDBObjectStore.count).toHaveBeenCalled();
    });

    it('should return 0 for empty store', async () => {
      // Arrange
      mockIDBRequest.result = 0;

      // Act
      const promise = service.count('medications');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('countByIndex', () => {
    it('should count items by index value', async () => {
      // Arrange
      mockIDBRequest.result = 3;

      // Act
      const promise = service.countByIndex('medications', 'userId', 'user-123');
      mockIDBRequest.onsuccess?.();
      const result = await promise;

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
      const promise = service.delete('medications', 'med-1');
      mockIDBRequest.onsuccess?.();
      await promise;

      // Assert
      expect(mockIDBObjectStore.delete).toHaveBeenCalledWith('med-1');
    });

    it('should handle delete errors', async () => {
      // Arrange
      const error = new Error('Delete failed');
      mockIDBRequest.error = error;

      // Act & Assert
      const promise = service.delete('medications', 'med-1');
      mockIDBRequest.onerror?.();
      
      await expectAsync(promise).toBeRejectedWith(error);
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
      const promise = service.clear('medications');
      mockIDBRequest.onsuccess?.();
      await promise;

      // Assert
      expect(mockIDBObjectStore.clear).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      // Arrange
      const error = new Error('Clear failed');
      mockIDBRequest.error = error;

      // Act & Assert
      const promise = service.clear('medications');
      mockIDBRequest.onerror?.();
      
      await expectAsync(promise).toBeRejectedWith(error);
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
      const promise = service.getStorageStats();
      
      // Simulate count() success for each store
      for (let i = 0; i < 9; i++) { // 9 stores in config
        mockIDBRequest.onsuccess?.();
      }
      
      const result = await promise;

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
      const promise = service.exportData();
      
      // Simulate getAll() success for each store
      for (let i = 0; i < 9; i++) {
        mockIDBRequest.onsuccess?.();
      }
      
      const result = await promise;

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
      const promise = service.get('medications', 'med-1');
      mockIDBRequest.onsuccess?.();
      await promise;

      // Assert
      expect(service.metrics().totalReads).toBeGreaterThan(initialReads);
    });

    it('should track total writes', async () => {
      // Arrange
      const medication = createMockMedication();
      const initialWrites = service.metrics().totalWrites;

      // Act
      const promise = service.put('medications', medication);
      mockIDBRequest.onsuccess?.();
      await promise;

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
      
      // Create new service instance
      const newService = new IndexedDBService();
      
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
