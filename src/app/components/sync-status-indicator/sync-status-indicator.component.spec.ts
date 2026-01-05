import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ToastController, ModalController } from '@ionic/angular/standalone';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { SyncStatusIndicatorComponent } from './sync-status-indicator.component';
import { OfflineSyncService, SyncStatus, SyncConflict, SyncStats, QueuedOperation } from '../../services/offline-sync.service';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<any> {
    return of({
      OFFLINE: {
        SYNCED: 'Sincronizado',
        SYNCING: 'Sincronizando...',
        OFFLINE: 'Offline',
        SYNC_ERROR: 'Erro de sincronização',
        PENDING_SYNC: '{{count}} pendentes',
        OFFLINE_WITH_PENDING: 'Offline - {{count}} pendentes',
        CONFLICTS_PENDING: '{{count}} conflitos',
        LAST_SYNC: 'Última sincronização',
        RESOLVE: 'Resolver',
        SYNC_NOW: 'Sincronizar agora'
      }
    });
  }
}

// Create mock sync service
const createMockOfflineSyncService = () => {
  const isOnline = signal(true);
  const syncStatus = signal<SyncStatus>('online');
  const hasPendingOperations = signal(false);
  const hasUnresolvedConflicts = signal(false);
  const operationQueue = signal<QueuedOperation[]>([]);
  const conflicts = signal<SyncConflict[]>([]);
  const syncStats = signal<SyncStats>({
    lastSyncTime: new Date(),
    pendingOperations: 0,
    successfulSyncs: 10,
    failedSyncs: 0,
    resolvedConflicts: 2,
    unresolvedConflicts: 0
  });

  return {
    isOnline,
    syncStatus,
    hasPendingOperations,
    hasUnresolvedConflicts,
    operationQueue,
    conflicts,
    syncStats,
    syncNow: jasmine.createSpy('syncNow').and.returnValue(Promise.resolve()),
    // Helper setters for tests
    setIsOnline: (v: boolean) => isOnline.set(v),
    setSyncStatus: (v: SyncStatus) => syncStatus.set(v),
    setHasPendingOperations: (v: boolean) => hasPendingOperations.set(v),
    setHasUnresolvedConflicts: (v: boolean) => hasUnresolvedConflicts.set(v),
    setOperationQueue: (v: QueuedOperation[]) => operationQueue.set(v),
    setConflicts: (v: SyncConflict[]) => conflicts.set(v),
    setSyncStats: (v: SyncStats) => syncStats.set(v)
  };
};

describe('SyncStatusIndicatorComponent', () => {
  let component: SyncStatusIndicatorComponent;
  let fixture: ComponentFixture<SyncStatusIndicatorComponent>;
  let mockOfflineSyncService: ReturnType<typeof createMockOfflineSyncService>;
  let mockToastController: jasmine.SpyObj<ToastController>;
  let mockModalController: jasmine.SpyObj<ModalController>;
  let translateService: TranslateService;

  beforeEach(async () => {
    mockOfflineSyncService = createMockOfflineSyncService();

    const mockToast = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve())
    };
    mockToastController = jasmine.createSpyObj('ToastController', ['create']);
    mockToastController.create.and.returnValue(Promise.resolve(mockToast as any));

    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ data: null }))
    };
    mockModalController = jasmine.createSpyObj('ModalController', ['create']);
    mockModalController.create.and.returnValue(Promise.resolve(mockModal as any));

    await TestBed.configureTestingModule({
      imports: [
        SyncStatusIndicatorComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: OfflineSyncService, useValue: mockOfflineSyncService },
        { provide: ToastController, useValue: mockToastController },
        { provide: ModalController, useValue: mockModalController }
      ]
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    translateService.use('en');

    fixture = TestBed.createComponent(SyncStatusIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('isOnline', () => {
    it('should return true when online', () => {
      expect(component.isOnline()).toBeTrue();
    });

    it('should return false when offline', () => {
      mockOfflineSyncService.setIsOnline(false);
      fixture.detectChanges();
      expect(component.isOnline()).toBeFalse();
    });
  });

  describe('syncStatus', () => {
    it('should return online status', () => {
      expect(component.syncStatus()).toBe('online');
    });

    it('should return offline status', () => {
      mockOfflineSyncService.setSyncStatus('offline');
      fixture.detectChanges();
      expect(component.syncStatus()).toBe('offline');
    });

    it('should return syncing status', () => {
      mockOfflineSyncService.setSyncStatus('syncing');
      fixture.detectChanges();
      expect(component.syncStatus()).toBe('syncing');
    });

    it('should return error status', () => {
      mockOfflineSyncService.setSyncStatus('error');
      fixture.detectChanges();
      expect(component.syncStatus()).toBe('error');
    });
  });

  describe('getStatusIcon', () => {
    it('should return cloud-done-outline when online with no pending operations', () => {
      mockOfflineSyncService.setSyncStatus('online');
      mockOfflineSyncService.setHasPendingOperations(false);
      fixture.detectChanges();
      
      expect(component.getStatusIcon()).toBe('cloud-done-outline');
    });

    it('should return cloud-outline when online with pending operations', () => {
      mockOfflineSyncService.setSyncStatus('online');
      mockOfflineSyncService.setHasPendingOperations(true);
      fixture.detectChanges();
      
      expect(component.getStatusIcon()).toBe('cloud-outline');
    });

    it('should return cloud-offline-outline when offline', () => {
      mockOfflineSyncService.setSyncStatus('offline');
      fixture.detectChanges();
      
      expect(component.getStatusIcon()).toBe('cloud-offline-outline');
    });

    it('should return sync-outline when syncing', () => {
      mockOfflineSyncService.setSyncStatus('syncing');
      fixture.detectChanges();
      
      expect(component.getStatusIcon()).toBe('sync-outline');
    });

    it('should return alert-circle-outline when error', () => {
      mockOfflineSyncService.setSyncStatus('error');
      fixture.detectChanges();
      
      expect(component.getStatusIcon()).toBe('alert-circle-outline');
    });

    it('should return cloud-outline for unknown status', () => {
      mockOfflineSyncService.setSyncStatus('unknown' as any);
      fixture.detectChanges();
      
      expect(component.getStatusIcon()).toBe('cloud-outline');
    });
  });

  describe('getStatusColor', () => {
    it('should return warning when has unresolved conflicts', () => {
      mockOfflineSyncService.setHasUnresolvedConflicts(true);
      fixture.detectChanges();
      
      expect(component.getStatusColor()).toBe('warning');
    });

    it('should return success when online with no pending operations', () => {
      mockOfflineSyncService.setSyncStatus('online');
      mockOfflineSyncService.setHasPendingOperations(false);
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      fixture.detectChanges();
      
      expect(component.getStatusColor()).toBe('success');
    });

    it('should return primary when online with pending operations', () => {
      mockOfflineSyncService.setSyncStatus('online');
      mockOfflineSyncService.setHasPendingOperations(true);
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      fixture.detectChanges();
      
      expect(component.getStatusColor()).toBe('primary');
    });

    it('should return medium when offline', () => {
      mockOfflineSyncService.setSyncStatus('offline');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      fixture.detectChanges();
      
      expect(component.getStatusColor()).toBe('medium');
    });

    it('should return primary when syncing', () => {
      mockOfflineSyncService.setSyncStatus('syncing');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      fixture.detectChanges();
      
      expect(component.getStatusColor()).toBe('primary');
    });

    it('should return danger when error', () => {
      mockOfflineSyncService.setSyncStatus('error');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      fixture.detectChanges();
      
      expect(component.getStatusColor()).toBe('danger');
    });
  });

  describe('getStatusText', () => {
    it('should return conflicts message when has unresolved conflicts', () => {
      const mockConflict: SyncConflict = {
        id: 'c1',
        collection: 'medications',
        documentId: 'med-001',
        localData: { name: 'Local Med' },
        serverData: { name: 'Server Med' },
        localTimestamp: new Date(),
        serverTimestamp: new Date(),
        detectedAt: new Date(),
        resolved: false
      };
      mockOfflineSyncService.setHasUnresolvedConflicts(true);
      mockOfflineSyncService.setConflicts([mockConflict]);
      fixture.detectChanges();
      
      const text = component.getStatusText();
      expect(text).toContain('1');
      expect(text).toContain('conflito');
    });

    it('should return synced message when online with no pending', () => {
      mockOfflineSyncService.setSyncStatus('online');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      mockOfflineSyncService.setOperationQueue([]);
      fixture.detectChanges();
      
      expect(component.getStatusText()).toBe('Sincronizado');
    });

    it('should return pending message when online with pending operations', () => {
      const mockOp: QueuedOperation = {
        id: 'op1',
        type: 'update',
        collection: 'medications',
        documentId: 'med-001',
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
        priority: 'normal',
        userId: 'user-001'
      };
      mockOfflineSyncService.setSyncStatus('online');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      mockOfflineSyncService.setOperationQueue([mockOp]);
      fixture.detectChanges();
      
      const text = component.getStatusText();
      expect(text).toContain('1');
      expect(text).toContain('pendente');
    });

    it('should return offline message when offline', () => {
      mockOfflineSyncService.setSyncStatus('offline');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      mockOfflineSyncService.setOperationQueue([]);
      fixture.detectChanges();
      
      expect(component.getStatusText()).toBe('Offline');
    });

    it('should return syncing message when syncing', () => {
      mockOfflineSyncService.setSyncStatus('syncing');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      fixture.detectChanges();
      
      expect(component.getStatusText()).toBe('Sincronizando...');
    });

    it('should return error message when error', () => {
      mockOfflineSyncService.setSyncStatus('error');
      mockOfflineSyncService.setHasUnresolvedConflicts(false);
      fixture.detectChanges();
      
      expect(component.getStatusText()).toBe('Erro de sincronização');
    });
  });

  describe('getUnresolvedConflictCount', () => {
    it('should return 0 when no conflicts', () => {
      mockOfflineSyncService.setConflicts([]);
      fixture.detectChanges();
      
      expect(component.getUnresolvedConflictCount()).toBe(0);
    });

    it('should return count of unresolved conflicts', () => {
      const conflicts: SyncConflict[] = [
        {
          id: 'c1', collection: 'meds', documentId: 'd1',
          localData: {}, serverData: {},
          localTimestamp: new Date(), serverTimestamp: new Date(),
          detectedAt: new Date(), resolved: false
        },
        {
          id: 'c2', collection: 'meds', documentId: 'd2',
          localData: {}, serverData: {},
          localTimestamp: new Date(), serverTimestamp: new Date(),
          detectedAt: new Date(), resolved: true
        },
        {
          id: 'c3', collection: 'meds', documentId: 'd3',
          localData: {}, serverData: {},
          localTimestamp: new Date(), serverTimestamp: new Date(),
          detectedAt: new Date(), resolved: false
        }
      ];
      mockOfflineSyncService.setConflicts(conflicts);
      fixture.detectChanges();
      
      expect(component.getUnresolvedConflictCount()).toBe(2);
    });
  });

  describe('triggerSync', () => {
    it('should not sync when offline', fakeAsync(() => {
      mockOfflineSyncService.setIsOnline(false);
      mockOfflineSyncService.setHasPendingOperations(true);
      fixture.detectChanges();
      
      component.triggerSync();
      tick();
      
      expect(mockOfflineSyncService.syncNow).not.toHaveBeenCalled();
    }));

    it('should not sync when no pending operations', fakeAsync(() => {
      mockOfflineSyncService.setIsOnline(true);
      mockOfflineSyncService.setHasPendingOperations(false);
      fixture.detectChanges();
      
      component.triggerSync();
      tick();
      
      expect(mockOfflineSyncService.syncNow).not.toHaveBeenCalled();
    }));
  });

  describe('Reactive Updates', () => {
    it('should update when sync status changes', () => {
      expect(component.syncStatus()).toBe('online');
      
      mockOfflineSyncService.setSyncStatus('syncing');
      fixture.detectChanges();
      
      expect(component.syncStatus()).toBe('syncing');
    });

    it('should update when online status changes', () => {
      expect(component.isOnline()).toBeTrue();
      
      mockOfflineSyncService.setIsOnline(false);
      fixture.detectChanges();
      
      expect(component.isOnline()).toBeFalse();
    });
  });
});
