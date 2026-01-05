import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncProgressBarComponent } from './sync-progress-bar.component';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

// Create a factory for mock service with mutable signals
const createMockOfflineSyncService = () => {
  const syncStatus = signal<string>('syncing');
  const syncStats = signal({
    pendingOperations: 10,
    successfulSyncs: 3,
    failedSyncs: 0,
    lastSyncTime: new Date(),
    resolvedConflicts: 0,
    unresolvedConflicts: 0
  });
  const operationQueue = signal<any[]>([
    { id: '1', type: 'create', collection: 'medications', documentId: 'doc1', timestamp: new Date(), retryCount: 0, maxRetries: 3, priority: 'normal', userId: 'user1' },
    { id: '2', type: 'update', collection: 'medications', documentId: 'doc2', timestamp: new Date(), retryCount: 0, maxRetries: 3, priority: 'normal', userId: 'user1' }
  ]);

  return {
    syncStatus,
    syncStats,
    operationQueue,
    // Setter helpers for tests
    setSyncStatus: (v: string) => syncStatus.set(v),
    setSyncStats: (v: any) => syncStats.set(v),
    setOperationQueue: (v: any[]) => operationQueue.set(v)
  };
};

describe('SyncProgressBarComponent', () => {
  let component: SyncProgressBarComponent;
  let fixture: ComponentFixture<SyncProgressBarComponent>;
  let mockOfflineSyncService: ReturnType<typeof createMockOfflineSyncService>;

  beforeEach(async () => {
    mockOfflineSyncService = createMockOfflineSyncService();

    await TestBed.configureTestingModule({
      imports: [
        SyncProgressBarComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: OfflineSyncService, useValue: mockOfflineSyncService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(SyncProgressBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should expose syncStatus from service', () => {
      expect(component.syncStatus()).toBe('syncing');
    });

    it('should expose syncStats from service', () => {
      expect(component.syncStats().pendingOperations).toBe(10);
      expect(component.syncStats().successfulSyncs).toBe(3);
    });

    it('should expose operationQueue from service', () => {
      expect(component.operationQueue().length).toBe(2);
    });
  });

  describe('showProgress Computed', () => {
    it('should show progress when syncing and queue not empty', () => {
      expect(component.showProgress()).toBe(true);
    });

    it('should hide progress when not syncing', () => {
      mockOfflineSyncService.setSyncStatus('idle');
      fixture.detectChanges();
      
      expect(component.showProgress()).toBe(false);
    });

    it('should hide progress when queue is empty', () => {
      mockOfflineSyncService.setOperationQueue([]);
      fixture.detectChanges();
      
      expect(component.showProgress()).toBe(false);
    });

    it('should hide progress when synced status', () => {
      mockOfflineSyncService.setSyncStatus('synced');
      fixture.detectChanges();
      
      expect(component.showProgress()).toBe(false);
    });
  });

  describe('progressValue Computed', () => {
    it('should calculate progress as processed/total', () => {
      // 3 successful + 0 failed / 10 pending = 0.3
      expect(component.progressValue()).toBe(0.3);
    });

    it('should return 0 when no pending operations', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 0,
        successfulSyncs: 3,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.progressValue()).toBe(0);
    });

    it('should include failed syncs in processed count', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 10,
        successfulSyncs: 5,
        failedSyncs: 2,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      // (5 + 2) / 10 = 0.7
      expect(component.progressValue()).toBe(0.7);
    });
  });

  describe('getProgressColor', () => {
    it('should return primary when progress is 0', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.getProgressColor()).toBe('primary');
    });

    it('should return warning when progress < 50%', () => {
      expect(component.getProgressColor()).toBe('warning'); // 0.3 < 0.5
    });

    it('should return success when progress >= 50%', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 10,
        successfulSyncs: 6,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.getProgressColor()).toBe('success');
    });
  });

  describe('getProgressText', () => {
    it('should return initializing message when total is 0', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.getProgressText()).toBe('Iniciando sincronização...');
    });

    it('should return progress message with counts', () => {
      expect(component.getProgressText()).toBe('Sincronizando 3 de 10 operações');
    });

    it('should update message as sync progresses', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 10,
        successfulSyncs: 8,
        failedSyncs: 1,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.getProgressText()).toBe('Sincronizando 9 de 10 operações');
    });
  });

  describe('getProgressPercentage', () => {
    it('should return 0% when progress is 0', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.getProgressPercentage()).toBe('0%');
    });

    it('should return rounded percentage', () => {
      expect(component.getProgressPercentage()).toBe('30%');
    });

    it('should return 100% when complete', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 10,
        successfulSyncs: 10,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.getProgressPercentage()).toBe('100%');
    });

    it('should round percentages correctly', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 3,
        successfulSyncs: 1,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      // 1/3 = 0.333... * 100 = 33%
      expect(component.getProgressPercentage()).toBe('33%');
    });
  });

  describe('Progress Bar Type', () => {
    it('should use determinate type when progress > 0', () => {
      expect(component.progressValue()).toBeGreaterThan(0);
      // Template uses: [type]="progressValue() > 0 ? 'determinate' : 'indeterminate'"
    });

    it('should use indeterminate type when progress is 0', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.progressValue()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle large number of operations', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 1000,
        successfulSyncs: 500,
        failedSyncs: 100,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.progressValue()).toBe(0.6);
      expect(component.getProgressText()).toBe('Sincronizando 600 de 1000 operações');
    });

    it('should handle all operations failed', () => {
      mockOfflineSyncService.setSyncStats({
        pendingOperations: 10,
        successfulSyncs: 0,
        failedSyncs: 10,
        lastSyncTime: new Date(),
        resolvedConflicts: 0,
        unresolvedConflicts: 0
      });
      fixture.detectChanges();
      
      expect(component.progressValue()).toBe(1);
      expect(component.getProgressPercentage()).toBe('100%');
    });
  });

  describe('Sync Status States', () => {
    it('should handle idle status', () => {
      mockOfflineSyncService.setSyncStatus('idle');
      fixture.detectChanges();
      
      expect(component.syncStatus()).toBe('idle');
      expect(component.showProgress()).toBe(false);
    });

    it('should handle error status', () => {
      mockOfflineSyncService.setSyncStatus('error');
      fixture.detectChanges();
      
      expect(component.syncStatus()).toBe('error');
    });
  });
});
