/**
 * MedicationRepository Unit Tests
 * 
 * Tests for infrastructure repository implementation.
 * Coverage: Firestore integration, IndexedDB caching, online/offline scenarios,
 * entity-DTO conversion, CRUD operations.
 */

import { TestBed } from '@angular/core/testing';
import { MedicationRepository } from './medication.repository';
import { FirebaseService } from '../../services/firebase.service';
import { IndexedDBService } from '../../services/indexed-db.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { MedicationEntity } from '../../core/domain/medication/medication.entity';
import { DoseEntity } from '../../core/domain/medication/dose.entity';
import { Medication } from '../../models/medication.model';

describe('MedicationRepository', () => {
  let repository: MedicationRepository;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let mockIndexedDB: jasmine.SpyObj<IndexedDBService>;
  let mockOfflineSync: jasmine.SpyObj<OfflineSyncService>;
  let mockFirestore: any;

  const createMockFirestore = () => ({
    collection: jasmine.createSpy('collection'),
    doc: jasmine.createSpy('doc'),
    getDoc: jasmine.createSpy('getDoc'),
    getDocs: jasmine.createSpy('getDocs'),
    addDoc: jasmine.createSpy('addDoc'),
    updateDoc: jasmine.createSpy('updateDoc'),
    deleteDoc: jasmine.createSpy('deleteDoc'),
    onSnapshot: jasmine.createSpy('onSnapshot')
  });

  const createValidMedicationEntity = () => new MedicationEntity({
    id: 'med-123',
    userId: 'user-456',
    name: 'Dipirona',
    dosage: '500mg',
    frequency: '8 em 8 horas',
    time: '08:00',
    currentStock: 30,
    schedule: [
      new DoseEntity('00:00', 'upcoming'),
      new DoseEntity('08:00', 'upcoming'),
      new DoseEntity('16:00', 'upcoming')
    ],
    lastModified: new Date('2025-01-01')
  });

  const createValidMedicationDTO = (): Medication => ({
    id: 'med-123',
    patientId: 'user-456',
    userId: 'user-456',
    name: 'Dipirona',
    dosage: '500mg',
    frequency: '8 em 8 horas',
    notes: undefined,
    currentStock: 30,
    stock: 30,
    stockUnit: 'unidades',
    schedule: [
      { time: '00:00', status: 'upcoming' },
      { time: '08:00', status: 'upcoming' },
      { time: '16:00', status: 'upcoming' }
    ],
    isArchived: false,
    archivedAt: undefined,
    lastModified: new Date('2025-01-01')
  });

  beforeEach(() => {
    mockFirestore = createMockFirestore();

    mockFirebaseService = jasmine.createSpyObj('FirebaseService', [], {
      firestore: mockFirestore
    });

    mockIndexedDB = jasmine.createSpyObj('IndexedDBService', [
      'get',
      'getByIndex',
      'put',
      'putBatch',
      'delete'
    ]);

    mockOfflineSync = jasmine.createSpyObj('OfflineSyncService', [
      'isOnline',
      'queueOperation'
    ]);

    TestBed.configureTestingModule({
      providers: [
        MedicationRepository,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: IndexedDBService, useValue: mockIndexedDB },
        { provide: OfflineSyncService, useValue: mockOfflineSync }
      ]
    });

    repository = TestBed.inject(MedicationRepository);
  });

  describe('Constructor and Initialization', () => {
    it('should create repository instance', () => {
      expect(repository).toBeDefined();
    });

    it('should inject dependencies', () => {
      expect((repository as any).firebaseService).toBeDefined();
      expect((repository as any).indexedDB).toBeDefined();
      expect((repository as any).offlineSync).toBeDefined();
    });
  });

  describe('findById - Online Mode', () => {
    it('should fetch medication from Firestore when online', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);
      
      const mockDocSnap = {
        exists: () => true,
        id: 'med-123',
        data: () => createValidMedicationDTO()
      };

      // Mock Firestore calls
      const mockDocRef = {};
      mockFirestore.doc = jasmine.createSpy('doc').and.returnValue(mockDocRef);
      
      // Mock global getDoc
      (globalThis as any).getDoc = jasmine.createSpy('getDoc').and.returnValue(
        Promise.resolve(mockDocSnap)
      );

      const result = await repository.findById('med-123', 'user-456');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('med-123');
      expect(result?.name).toBe('Dipirona');
    });

    it('should return null when medication not found in Firestore', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);
      
      const mockDocSnap = {
        exists: () => false
      };

      mockFirestore.doc = jasmine.createSpy('doc').and.returnValue({});
      (globalThis as any).getDoc = jasmine.createSpy('getDoc').and.returnValue(
        Promise.resolve(mockDocSnap)
      );

      mockIndexedDB.get.and.returnValue(Promise.resolve(null));

      const result = await repository.findById('non-existent', 'user-456');

      expect(result).toBeNull();
    });

    it('should fallback to IndexedDB on Firestore error', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      mockFirestore.doc = jasmine.createSpy('doc').and.returnValue({});
      (globalThis as any).getDoc = jasmine.createSpy('getDoc').and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      const dto = createValidMedicationDTO();
      mockIndexedDB.get.and.returnValue(Promise.resolve(dto));

      const result = await repository.findById('med-123', 'user-456');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('med-123');
      expect(mockIndexedDB.get).toHaveBeenCalledWith('medications', 'med-123');
    });
  });

  describe('findById - Offline Mode', () => {
    it('should fetch medication from IndexedDB when offline', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      const dto = createValidMedicationDTO();
      mockIndexedDB.get.and.returnValue(Promise.resolve(dto));

      const result = await repository.findById('med-123', 'user-456');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('med-123');
      expect(mockIndexedDB.get).toHaveBeenCalledWith('medications', 'med-123');
    });

    it('should validate userId from cache', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      const dto = createValidMedicationDTO();
      dto.userId = 'different-user';
      mockIndexedDB.get.and.returnValue(Promise.resolve(dto));

      const result = await repository.findById('med-123', 'user-456');

      expect(result).toBeNull(); // Wrong user
    });
  });

  describe('findByUserId - Online Mode', () => {
    it('should fetch all user medications from Firestore', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      const dto1 = createValidMedicationDTO();
      const dto2 = { ...dto1, id: 'med-456', name: 'Paracetamol' };

      const mockSnapshot = {
        docs: [
          { id: 'med-123', data: () => dto1 },
          { id: 'med-456', data: () => dto2 }
        ]
      };

      mockFirestore.collection = jasmine.createSpy('collection').and.returnValue({});
      (globalThis as any).getDocs = jasmine.createSpy('getDocs').and.returnValue(
        Promise.resolve(mockSnapshot)
      );

      mockIndexedDB.putBatch.and.returnValue(Promise.resolve());

      const result = await repository.findByUserId('user-456');

      expect(result.length).toBe(2);
      expect(result[0].name).toBe('Dipirona');
      expect(result[1].name).toBe('Paracetamol');
      expect(mockIndexedDB.putBatch).toHaveBeenCalled();
    });

    it('should filter archived medications by default', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      const dto1 = createValidMedicationDTO();
      const dto2 = { ...dto1, id: 'med-456', isArchived: true };

      const mockSnapshot = {
        docs: [
          { id: 'med-123', data: () => dto1 },
          { id: 'med-456', data: () => dto2 }
        ]
      };

      mockFirestore.collection = jasmine.createSpy('collection').and.returnValue({});
      (globalThis as any).getDocs = jasmine.createSpy('getDocs').and.returnValue(
        Promise.resolve(mockSnapshot)
      );

      mockIndexedDB.putBatch.and.returnValue(Promise.resolve());

      const result = await repository.findByUserId('user-456', false);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('med-123');
    });

    it('should include archived when requested', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      const dto1 = createValidMedicationDTO();
      const dto2 = { ...dto1, id: 'med-456', isArchived: true };

      const mockSnapshot = {
        docs: [
          { id: 'med-123', data: () => dto1 },
          { id: 'med-456', data: () => dto2 }
        ]
      };

      mockFirestore.collection = jasmine.createSpy('collection').and.returnValue({});
      (globalThis as any).getDocs = jasmine.createSpy('getDocs').and.returnValue(
        Promise.resolve(mockSnapshot)
      );

      mockIndexedDB.putBatch.and.returnValue(Promise.resolve());

      const result = await repository.findByUserId('user-456', true);

      expect(result.length).toBe(2);
    });
  });

  describe('findByUserId - Offline Mode', () => {
    it('should fetch medications from IndexedDB when offline', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      const dto1 = createValidMedicationDTO();
      const dto2 = { ...dto1, id: 'med-456', name: 'Paracetamol' };

      mockIndexedDB.getByIndex.and.returnValue(Promise.resolve([dto1, dto2]));

      const result = await repository.findByUserId('user-456');

      expect(result.length).toBe(2);
      expect(mockIndexedDB.getByIndex).toHaveBeenCalledWith('medications', 'userId', 'user-456');
    });
  });

  describe('save - Create New Medication', () => {
    it('should create new medication in Firestore when online', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      const entity = new MedicationEntity({
        id: 'temp_123',
        userId: 'user-456',
        name: 'New Medication',
        dosage: '100mg',
        frequency: '12 em 12 horas',
        time: '08:00',
        currentStock: 10,
        schedule: [],
        lastModified: new Date()
      });

      const mockDocRef = { id: 'new-med-id' };
      mockFirestore.collection = jasmine.createSpy('collection').and.returnValue({});
      (globalThis as any).addDoc = jasmine.createSpy('addDoc').and.returnValue(
        Promise.resolve(mockDocRef)
      );

      mockIndexedDB.put.and.returnValue(Promise.resolve());

      const result = await repository.save(entity);

      expect(result.id).toBe('new-med-id');
      expect(mockIndexedDB.put).toHaveBeenCalled();
    });

    it('should queue operation when offline', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      let entity = createValidMedicationEntity();
      entity = new MedicationEntity({ ...entity.toPlainObject(), id: 'temp_123' });

      mockIndexedDB.put.and.returnValue(Promise.resolve());

      await repository.save(entity);

      expect(mockIndexedDB.put).toHaveBeenCalled();
      expect(mockOfflineSync.queueOperation).toHaveBeenCalledWith(
        'create',
        'users/user-456/medications',
        'temp_123',
        jasmine.any(Object),
        'high'
      );
    });
  });

  describe('save - Update Existing Medication', () => {
    it('should update medication in Firestore when online', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      const entity = createValidMedicationEntity();

      const mockDocRef = {};
      mockFirestore.doc = jasmine.createSpy('doc').and.returnValue(mockDocRef);
      (globalThis as any).updateDoc = jasmine.createSpy('updateDoc').and.returnValue(
        Promise.resolve()
      );

      mockIndexedDB.put.and.returnValue(Promise.resolve());

      const result = await repository.save(entity);

      expect(result.id).toBe('med-123');
      expect(mockIndexedDB.put).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete medication from Firestore when online', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      mockFirestore.doc = jasmine.createSpy('doc').and.returnValue({});
      (globalThis as any).deleteDoc = jasmine.createSpy('deleteDoc').and.returnValue(
        Promise.resolve()
      );

      mockIndexedDB.delete.and.returnValue(Promise.resolve());

      await repository.delete('med-123', 'user-456');

      expect(mockIndexedDB.delete).toHaveBeenCalledWith('medications', 'med-123');
    });

    it('should queue delete operation when offline', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      mockIndexedDB.delete.and.returnValue(Promise.resolve());

      await repository.delete('med-123', 'user-456');

      expect(mockIndexedDB.delete).toHaveBeenCalled();
      expect(mockOfflineSync.queueOperation).toHaveBeenCalledWith(
        'delete',
        'users/user-456/medications',
        'med-123',
        undefined,
        'high'
      );
    });
  });

  describe('findActiveByUserId', () => {
    it('should return only active medications', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      const dto1 = createValidMedicationDTO();
      const dto2 = { ...dto1, id: 'med-456', isArchived: true };

      mockIndexedDB.getByIndex.and.returnValue(Promise.resolve([dto1, dto2]));

      const result = await repository.findActiveByUserId('user-456');

      expect(result.length).toBe(1);
      expect(result[0].active).toBe(true);
    });
  });

  describe('findLowStock', () => {
    it('should return medications with low stock', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      const dto1 = { ...createValidMedicationDTO(), currentStock: 3 };
      const dto2 = { ...createValidMedicationDTO(), id: 'med-456', currentStock: 20 };

      mockIndexedDB.getByIndex.and.returnValue(Promise.resolve([dto1, dto2]));

      const result = await repository.findLowStock('user-456', 5);

      expect(result.length).toBe(1);
      expect(result[0].currentStock).toBe(3);
    });
  });

  describe('saveBatch', () => {
    it('should save multiple medications', async () => {
      mockOfflineSync.isOnline.and.returnValue(true);

      const entity1 = createValidMedicationEntity();
      const entity2 = new MedicationEntity({ ...entity1.toPlainObject(), id: 'med-456' });

      mockFirestore.doc = jasmine.createSpy('doc').and.returnValue({});
      (globalThis as any).updateDoc = jasmine.createSpy('updateDoc').and.returnValue(
        Promise.resolve()
      );

      mockIndexedDB.put.and.returnValue(Promise.resolve());

      const result = await repository.saveBatch([entity1, entity2]);

      expect(result.length).toBe(2);
      expect(mockIndexedDB.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('exists', () => {
    it('should return true when medication exists', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      const dto = createValidMedicationDTO();
      mockIndexedDB.get.and.returnValue(Promise.resolve(dto));

      const result = await repository.exists('med-123', 'user-456');

      expect(result).toBe(true);
    });

    it('should return false when medication does not exist', async () => {
      mockOfflineSync.isOnline.and.returnValue(false);

      mockIndexedDB.get.and.returnValue(Promise.resolve(null));

      const result = await repository.exists('non-existent', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('Entity-DTO Conversion', () => {
    it('should convert entity to DTO correctly', () => {
      const entity = createValidMedicationEntity();

      const dto = (repository as any).toDTO(entity);

      expect(dto.id).toBe('med-123');
      expect(dto.userId).toBe('user-456');
      expect(dto.patientId).toBe('user-456');
      expect(dto.name).toBe('Dipirona');
      expect(dto.schedule.length).toBe(3);
    });

    it('should convert DTO to entity correctly', () => {
      const dto = createValidMedicationDTO();

      const entity = (repository as any).toEntity(dto);

      expect(entity).toBeInstanceOf(MedicationEntity);
      expect(entity.id).toBe('med-123');
      expect(entity.name).toBe('Dipirona');
      expect(entity.schedule.length).toBe(3);
      expect(entity.schedule[0]).toBeInstanceOf(DoseEntity);
    });

    it('should handle missing optional fields in DTO', () => {
      const dto = {
        id: 'med-123',
        userId: 'user-456',
        name: 'Medication',
        dosage: '100mg',
        frequency: '1 vez ao dia',
        lastModified: new Date()
      } as Medication;

      const entity = (repository as any).toEntity(dto);

      expect(entity.currentStock).toBe(0);
      expect(entity.schedule.length).toBe(0);
      expect(entity.isArchived).toBe(false);
    });
  });
});
