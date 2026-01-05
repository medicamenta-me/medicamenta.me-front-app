/**
 * 🧪 PendingOperationsBadgeComponent Tests
 *
 * Testes unitários para o badge de operações pendentes.
 * Cobertura: contagem, cores, animação, responsividade.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PendingOperationsBadgeComponent } from './pending-operations-badge.component';
import { OfflineSyncService, QueuedOperation } from '../../services/offline-sync.service';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of, BehaviorSubject } from 'rxjs';

// Fake loader for translations
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      OFFLINE: {
        PENDING_OPERATIONS: 'Pending operations'
      }
    });
  }
}

describe('PendingOperationsBadgeComponent', () => {
  let component: PendingOperationsBadgeComponent;
  let fixture: ComponentFixture<PendingOperationsBadgeComponent>;
  let offlineSyncServiceMock: any;
  
  let operationQueueSignal: ReturnType<typeof signal<QueuedOperation[]>>;
  let isOnlineSignal: ReturnType<typeof signal<boolean>>;
  let syncStatusSignal: ReturnType<typeof signal<string>>;

  const mockOperations: QueuedOperation[] = [
    { id: 'op-1', type: 'update', collection: 'medications', documentId: 'med-1', data: {}, timestamp: new Date(), retryCount: 0, maxRetries: 3, priority: 'normal', userId: 'user1' },
    { id: 'op-2', type: 'create', collection: 'doses', documentId: 'dose-1', data: {}, timestamp: new Date(), retryCount: 0, maxRetries: 3, priority: 'normal', userId: 'user1' }
  ];

  beforeEach(async () => {
    operationQueueSignal = signal<QueuedOperation[]>([]);
    isOnlineSignal = signal<boolean>(true);
    syncStatusSignal = signal<string>('idle');

    offlineSyncServiceMock = {
      operationQueue: operationQueueSignal,
      isOnline: isOnlineSignal,
      syncStatus: syncStatusSignal
    };

    await TestBed.configureTestingModule({
      imports: [
        PendingOperationsBadgeComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: OfflineSyncService, useValue: offlineSyncServiceMock }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PendingOperationsBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize isPulsing as false', () => {
      expect(component.isPulsing).toBe(false);
    });
  });

  // ============================================================================
  // PENDING COUNT TESTS
  // ============================================================================

  describe('Pending Count', () => {
    it('should return 0 for empty queue', () => {
      expect(component.pendingCount()).toBe(0);
    });

    it('should return correct count', () => {
      operationQueueSignal.set(mockOperations);
      expect(component.pendingCount()).toBe(2);
    });

    it('should update when queue changes', () => {
      expect(component.pendingCount()).toBe(0);
      operationQueueSignal.set(mockOperations);
      expect(component.pendingCount()).toBe(2);
    });
  });

  // ============================================================================
  // GET BADGE COLOR TESTS
  // ============================================================================

  describe('Get Badge Color', () => {
    it('should return medium when offline', () => {
      isOnlineSignal.set(false);
      operationQueueSignal.set(mockOperations);
      
      expect(component.getBadgeColor()).toBe('medium');
    });

    it('should return primary for few operations (< 5)', () => {
      operationQueueSignal.set(mockOperations); // 2 ops
      expect(component.getBadgeColor()).toBe('primary');
    });

    it('should return warning for several operations (5-9)', () => {
      operationQueueSignal.set(Array(5).fill(mockOperations[0]));
      expect(component.getBadgeColor()).toBe('warning');
    });

    it('should return danger for many operations (>= 10)', () => {
      operationQueueSignal.set(Array(10).fill(mockOperations[0]));
      expect(component.getBadgeColor()).toBe('danger');
    });

    it('should return primary for 0 operations', () => {
      operationQueueSignal.set([]);
      expect(component.getBadgeColor()).toBe('primary');
    });
  });

  // ============================================================================
  // PULSE ANIMATION TESTS
  // ============================================================================

  describe('Pulse Animation', () => {
    it('should trigger pulse on count change', fakeAsync(() => {
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      tick();
      
      expect(component.isPulsing).toBe(true);
      
      tick(700);
      expect(component.isPulsing).toBe(false);
    }));

    it('should trigger pulse when count increases', fakeAsync(() => {
      operationQueueSignal.set([mockOperations[0]]);
      fixture.detectChanges();
      tick(700);
      
      component.isPulsing = false;
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      tick();
      
      expect(component.isPulsing).toBe(true);
      tick(700);
    }));

    it('should trigger pulse when count decreases', fakeAsync(() => {
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      tick(700);
      
      component.isPulsing = false;
      operationQueueSignal.set([mockOperations[0]]);
      fixture.detectChanges();
      tick();
      
      expect(component.isPulsing).toBe(true);
      tick(700);
    }));
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should not render when no pending operations', () => {
      operationQueueSignal.set([]);
      fixture.detectChanges();
      
      const container = fixture.nativeElement.querySelector('.pending-badge-container');
      expect(container).toBeFalsy();
    });

    it('should render when pending operations exist', () => {
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      
      const container = fixture.nativeElement.querySelector('.pending-badge-container');
      expect(container).toBeTruthy();
    });

    it('should display correct count in badge', () => {
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      
      const badge = fixture.nativeElement.querySelector('ion-badge');
      expect(badge.textContent.trim()).toBe('2');
    });

    it('should apply pulse class when pulsing', () => {
      operationQueueSignal.set(mockOperations);
      component.isPulsing = true;
      fixture.detectChanges();
      
      const container = fixture.nativeElement.querySelector('.pending-badge-container');
      expect(container.classList.contains('pulse')).toBe(true);
    });

    it('should not apply pulse class when not pulsing', fakeAsync(() => {
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      
      // Wait for the pulse animation to finish (600ms in component)
      tick(700);
      fixture.detectChanges();
      
      const container = fixture.nativeElement.querySelector('.pending-badge-container');
      expect(container.classList.contains('pulse')).toBe(false);
    }));
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle large operation counts', () => {
      operationQueueSignal.set(Array(100).fill(mockOperations[0]));
      fixture.detectChanges();
      
      const badge = fixture.nativeElement.querySelector('ion-badge');
      expect(badge.textContent.trim()).toBe('100');
      expect(component.getBadgeColor()).toBe('danger');
    });

    it('should handle rapid count changes', fakeAsync(() => {
      operationQueueSignal.set([mockOperations[0]]);
      fixture.detectChanges();
      tick(100);
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      tick(100);
      operationQueueSignal.set([]);
      fixture.detectChanges();
      tick(100);
      operationQueueSignal.set(mockOperations);
      fixture.detectChanges();
      tick();
      
      // Should still be pulsing from most recent change
      expect(component.isPulsing).toBe(true);
      tick(700);
    }));
  });
});
