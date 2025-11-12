/**
 * MedicationService Unit Tests
 * 
 * Tests for the Medication Service that manages CRUD operations,
 * caching, and offline sync for medications.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MedicationService } from './medication.service';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { PatientSelectorService } from './patient-selector.service';
import { LogService } from './log.service';
import { TranslationService } from './translation.service';
import { CareNetworkService } from './care-network.service';
import { IndexedDBService } from './indexed-db.service';
import { OfflineSyncService } from './offline-sync.service';
import { Medication } from '../models/medication.model';

describe('MedicationService', () => {
  let service: MedicationService;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockPatientSelectorService: any;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockTranslationService: jasmine.SpyObj<TranslationService>;
  let mockCareNetworkService: any;
  let mockIndexedDBService: jasmine.SpyObj<IndexedDBService>;
  let mockOfflineSyncService: any;

  const mockMedication: Medication = {
    id: 'med-123',
    userId: 'user-123',
    patientId: 'user-123',
    name: 'Aspirina',
    dosage: '100mg',
    frequency: '1 vez por dia',
    schedule: [
      { time: '08:00', status: 'upcoming' }
    ],
    stock: 30,
    currentStock: 30,
    lowStockThreshold: 5,
    notes: 'Tomar com água',
    lastModified: new Date()
  };

  beforeEach(() => {
    // Create mocks
    mockFirebaseService = jasmine.createSpyObj('FirebaseService', ['firestore']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['currentUser']);
    mockPatientSelectorService = {
      activePatientId: signal('user-123'),
      activePatientName: signal('Test Patient')
    };
    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error']);
    mockTranslationService = jasmine.createSpyObj('TranslationService', ['get']);
    mockCareNetworkService = {
      permissionsSynced: signal(true),
      hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true)
    };
    mockIndexedDBService = jasmine.createSpyObj('IndexedDBService', [
      'getByIndex',
      'putBatch',
      'delete',
      'put'
    ]);
    mockOfflineSyncService = {
      isOnline: signal(true),
      queueOperation: jasmine.createSpy('queueOperation')
    };

    // Mock Firestore
    (mockFirebaseService as any).firestore = {};

    TestBed.configureTestingModule({
      providers: [
        MedicationService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PatientSelectorService, useValue: mockPatientSelectorService },
        { provide: LogService, useValue: mockLogService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: CareNetworkService, useValue: mockCareNetworkService },
        { provide: IndexedDBService, useValue: mockIndexedDBService },
        { provide: OfflineSyncService, useValue: mockOfflineSyncService }
      ]
    });

    service = TestBed.inject(MedicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getMedicationById', () => {
    it('should return medication when found', () => {
      // Arrange: Set medications signal
      (service as any)._medications.set([mockMedication]);

      // Act
      const result = service.getMedicationById('med-123');

      // Assert
      expect(result).toEqual(mockMedication);
    });

    it('should return undefined when medication not found', () => {
      // Arrange
      (service as any)._medications.set([mockMedication]);

      // Act
      const result = service.getMedicationById('non-existent');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined when medications array is empty', () => {
      // Arrange
      (service as any)._medications.set([]);

      // Act
      const result = service.getMedicationById('med-123');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('addMedication', () => {
    it('should queue operation when offline', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      mockIndexedDBService.put.and.returnValue(Promise.resolve());
      const newMed = { ...mockMedication };
      delete (newMed as any).id;

      // Act
      await service.addMedication(newMed);

      // Assert
      expect(mockOfflineSyncService.queueOperation).toHaveBeenCalledWith(
        'create',
        jasmine.objectContaining({
          collection: 'medications',
          data: jasmine.objectContaining({ name: 'Aspirina' })
        })
      );
    });

    it('should save to IndexedDB when offline', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      mockIndexedDBService.put.and.returnValue(Promise.resolve());
      const newMed = { ...mockMedication };
      delete (newMed as any).id;

      // Act
      await service.addMedication(newMed);

      // Assert
      expect(mockIndexedDBService.put).toHaveBeenCalledWith(
        'medications',
        jasmine.objectContaining({
          name: 'Aspirina',
          patientId: 'user-123'
        })
      );
    });
  });

  describe('updateMedication', () => {
    it('should queue operation when offline', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      mockIndexedDBService.put.and.returnValue(Promise.resolve());
      (service as any)._medications.set([mockMedication]);

      // Act
      await service.updateMedication('med-123', { stock: 25 });

      // Assert
      expect(mockOfflineSyncService.queueOperation).toHaveBeenCalledWith(
        'update',
        jasmine.objectContaining({
          id: 'med-123',
          data: jasmine.objectContaining({ stock: 25 })
        })
      );
    });

    it('should save to IndexedDB when offline', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      mockIndexedDBService.put.and.returnValue(Promise.resolve());
      (service as any)._medications.set([mockMedication]);

      // Act
      await service.updateMedication('med-123', { stock: 25 });

      // Assert
      expect(mockIndexedDBService.put).toHaveBeenCalledWith(
        'medications',
        jasmine.objectContaining({
          id: 'med-123',
          stock: 25
        })
      );
    });

    it('should throw error when medication not found', async () => {
      // Arrange
      (service as any)._medications.set([]);

      // Act & Assert
      await expectAsync(
        service.updateMedication('non-existent', { stock: 25 })
      ).toBeRejectedWithError('Medication not found');
    });
  });

  describe('deleteMedication', () => {
    it('should queue operation when offline', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      mockIndexedDBService.delete.and.returnValue(Promise.resolve());
      (service as any)._medications.set([mockMedication]);

      // Act
      await service.deleteMedication('med-123', 'Aspirina');

      // Assert
      expect(mockOfflineSyncService.queueOperation).toHaveBeenCalledWith(
        'delete',
        jasmine.objectContaining({
          id: 'med-123'
        })
      );
    });

    it('should delete from IndexedDB when offline', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      mockIndexedDBService.delete.and.returnValue(Promise.resolve());
      (service as any)._medications.set([mockMedication]);

      // Act
      await service.deleteMedication('med-123', 'Aspirina');

      // Assert
      expect(mockIndexedDBService.delete).toHaveBeenCalledWith('medications', 'med-123');
    });

    it('should remove medication from local state', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      mockIndexedDBService.delete.and.returnValue(Promise.resolve());
      (service as any)._medications.set([mockMedication]);

      // Act
      await service.deleteMedication('med-123', 'Aspirina');

      // Assert
      expect(service.medications().length).toBe(0);
    });
  });

  describe('updateMedicationStock', () => {
    it('should update medication stock', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      (service as any)._medications.set([mockMedication]);
      spyOn(service, 'updateMedication').and.returnValue(Promise.resolve());

      // Act
      await service.updateMedicationStock('med-123', 15);

      // Assert
      expect(service.updateMedication).toHaveBeenCalledWith('med-123', { stock: 15 });
    });

    it('should accept stock value of 0', async () => {
      // Arrange
      mockOfflineSyncService.isOnline.set(false);
      (service as any)._medications.set([mockMedication]);
      spyOn(service, 'updateMedication').and.returnValue(Promise.resolve());

      // Act
      await service.updateMedicationStock('med-123', 0);

      // Assert
      expect(service.updateMedication).toHaveBeenCalledWith('med-123', { stock: 0 });
    });
  });

  describe('archiveMedication', () => {
    it('should set isArchived to true when archiving', async () => {
      // Arrange
      mockPatientSelectorService.activePatientId.set('user-123');
      
      // Mock Firestore doc and updateDoc
      const mockDoc = {};
      const mockUpdateDoc = jasmine.createSpy('updateDoc').and.returnValue(Promise.resolve());
      (globalThis as any).doc = jasmine.createSpy('doc').and.returnValue(mockDoc);
      (globalThis as any).updateDoc = mockUpdateDoc;

      // Act
      await service.archiveMedication('med-123');

      // Assert
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        mockDoc,
        jasmine.objectContaining({
          isArchived: true,
          archivedAt: jasmine.any(Date)
        })
      );
    });

    it('should throw error when no active patient', async () => {
      // Arrange
      mockPatientSelectorService.activePatientId.set(null);

      // Act & Assert
      await expectAsync(
        service.archiveMedication('med-123')
      ).toBeRejectedWithError('No active patient');
    });
  });

  describe('loadFromCache', () => {
    it('should load medications from IndexedDB', async () => {
      // Arrange
      const cachedMeds = [mockMedication];
      mockIndexedDBService.getByIndex.and.returnValue(Promise.resolve(cachedMeds));

      // Act
      await (service as any).loadFromCache('user-123');

      // Assert
      expect(mockIndexedDBService.getByIndex).toHaveBeenCalledWith(
        'medications',
        'userId',
        'user-123'
      );
    });

    it('should handle empty cache gracefully', async () => {
      // Arrange
      mockIndexedDBService.getByIndex.and.returnValue(Promise.resolve([]));

      // Act
      await (service as any).loadFromCache('user-123');

      // Assert
      expect(service.medications().length).toBe(0);
    });

    it('should handle IndexedDB errors', async () => {
      // Arrange
      mockIndexedDBService.getByIndex.and.returnValue(
        Promise.reject(new Error('IndexedDB error'))
      );
      spyOn(console, 'error');

      // Act
      await (service as any).loadFromCache('user-123');

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Failed to load from cache'),
        jasmine.any(Error)
      );
    });
  });

  describe('cacheToIndexedDB', () => {
    it('should save medications to IndexedDB', async () => {
      // Arrange
      const meds = [mockMedication];
      mockIndexedDBService.putBatch.and.returnValue(Promise.resolve());

      // Act
      await (service as any).cacheToIndexedDB(meds);

      // Assert
      expect(mockIndexedDBService.putBatch).toHaveBeenCalledWith('medications', meds);
    });

    it('should handle IndexedDB save errors', async () => {
      // Arrange
      const meds = [mockMedication];
      mockIndexedDBService.putBatch.and.returnValue(
        Promise.reject(new Error('Save failed'))
      );
      spyOn(console, 'error');

      // Act
      await (service as any).cacheToIndexedDB(meds);

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        jasmine.stringContaining('Failed to cache'),
        jasmine.any(Error)
      );
    });
  });

  describe('cleanupSubscription', () => {
    it('should unsubscribe from Firestore listener if exists', () => {
      // Arrange
      const mockUnsubscribe = jasmine.createSpy('unsubscribe');
      (service as any).medicationSubscription = mockUnsubscribe;

      // Act
      (service as any).cleanupSubscription();

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect((service as any).medicationSubscription).toBeNull();
    });

    it('should not throw when subscription is null', () => {
      // Arrange
      (service as any).medicationSubscription = null;

      // Act & Assert
      expect(() => (service as any).cleanupSubscription()).not.toThrow();
    });
  });
});
