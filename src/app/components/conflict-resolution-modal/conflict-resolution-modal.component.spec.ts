/**
 * 🧪 ConflictResolutionModalComponent Tests
 *
 * Testes unitários para o modal de resolução de conflitos de sincronização.
 * Cobertura: resolução de conflitos, diferenças, formatação e merge.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConflictResolutionModalComponent } from './conflict-resolution-modal.component';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { OfflineSyncService, SyncConflict } from '../../services/offline-sync.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

// Fake loader for translations
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

describe('ConflictResolutionModalComponent', () => {
  let component: ConflictResolutionModalComponent;
  let fixture: ComponentFixture<ConflictResolutionModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let offlineSyncServiceSpy: jasmine.SpyObj<OfflineSyncService>;

  const mockConflict: SyncConflict = {
    id: 'conflict-1',
    collection: 'medications',
    documentId: 'med-123',
    localData: {
      name: 'Aspirin Local',
      dosage: '500mg',
      frequency: 'daily',
      notes: 'Updated locally',
      currentStock: 30
    },
    serverData: {
      name: 'Aspirin Server',
      dosage: '500mg',
      frequency: 'twice daily',
      notes: 'Updated on server',
      currentStock: 25
    },
    localTimestamp: new Date('2026-01-04T10:00:00'),
    serverTimestamp: new Date('2026-01-04T09:00:00'),
    detectedAt: new Date('2026-01-04T10:30:00'),
    resolved: false
  };

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    offlineSyncServiceSpy = jasmine.createSpyObj('OfflineSyncService', [
      'resolveConflict',
      'resolveConflictWithMerge'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ConflictResolutionModalComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: OfflineSyncService, useValue: offlineSyncServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ConflictResolutionModalComponent);
    component = fixture.componentInstance;
    component.conflict = mockConflict;
    fixture.detectChanges();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with no selected resolution', () => {
      expect(component.selectedResolution()).toBeNull();
    });

    it('should initialize with isResolving false', () => {
      expect(component.isResolving()).toBe(false);
    });

    it('should have conflict input set', () => {
      expect(component.conflict).toEqual(mockConflict);
    });
  });

  // ============================================================================
  // SELECT RESOLUTION TESTS
  // ============================================================================

  describe('Select Resolution', () => {
    it('should select server resolution', () => {
      component.selectResolution('server');
      expect(component.selectedResolution()).toBe('server');
    });

    it('should select client resolution', () => {
      component.selectResolution('client');
      expect(component.selectedResolution()).toBe('client');
    });

    it('should select merge resolution', () => {
      component.selectResolution('merge');
      expect(component.selectedResolution()).toBe('merge');
    });

    it('should change resolution when different option selected', () => {
      component.selectResolution('server');
      expect(component.selectedResolution()).toBe('server');
      
      component.selectResolution('client');
      expect(component.selectedResolution()).toBe('client');
    });
  });

  // ============================================================================
  // APPLY RESOLUTION TESTS
  // ============================================================================

  describe('Apply Resolution', () => {
    it('should not apply when no resolution selected', async () => {
      await component.applyResolution();
      expect(offlineSyncServiceSpy.resolveConflict).not.toHaveBeenCalled();
      expect(offlineSyncServiceSpy.resolveConflictWithMerge).not.toHaveBeenCalled();
    });

    it('should not apply when already resolving', async () => {
      component.selectResolution('server');
      component.isResolving.set(true);
      
      await component.applyResolution();
      expect(offlineSyncServiceSpy.resolveConflict).not.toHaveBeenCalled();
    });

    it('should apply server-wins resolution', async () => {
      offlineSyncServiceSpy.resolveConflict.and.returnValue(Promise.resolve(true));
      component.selectResolution('server');

      await component.applyResolution();

      expect(offlineSyncServiceSpy.resolveConflict).toHaveBeenCalledWith(
        'conflict-1',
        'server-wins'
      );
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith({
        resolved: true,
        resolution: 'server'
      });
    });

    it('should apply client-wins resolution', async () => {
      offlineSyncServiceSpy.resolveConflict.and.returnValue(Promise.resolve(true));
      component.selectResolution('client');

      await component.applyResolution();

      expect(offlineSyncServiceSpy.resolveConflict).toHaveBeenCalledWith(
        'conflict-1',
        'client-wins'
      );
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith({
        resolved: true,
        resolution: 'client'
      });
    });

    it('should apply merge resolution', async () => {
      offlineSyncServiceSpy.resolveConflictWithMerge.and.returnValue(Promise.resolve(true));
      component.selectResolution('merge');

      await component.applyResolution();

      expect(offlineSyncServiceSpy.resolveConflictWithMerge).toHaveBeenCalled();
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith({
        resolved: true,
        resolution: 'merge'
      });
    });

    it('should handle resolution failure', async () => {
      offlineSyncServiceSpy.resolveConflict.and.returnValue(Promise.resolve(false));
      component.selectResolution('server');

      await component.applyResolution();

      expect(component.isResolving()).toBe(false);
      expect(modalControllerSpy.dismiss).not.toHaveBeenCalled();
    });

    it('should handle resolution error', async () => {
      offlineSyncServiceSpy.resolveConflict.and.returnValue(Promise.reject(new Error('Network error')));
      component.selectResolution('server');

      await component.applyResolution();

      expect(component.isResolving()).toBe(false);
    });

    it('should set isResolving to true during resolution', async () => {
      let wasResolving = false;
      offlineSyncServiceSpy.resolveConflict.and.callFake(() => {
        wasResolving = component.isResolving();
        return Promise.resolve(true);
      });
      component.selectResolution('server');

      await component.applyResolution();

      expect(wasResolving).toBe(true);
    });
  });

  // ============================================================================
  // CANCEL TESTS
  // ============================================================================

  describe('Cancel', () => {
    it('should dismiss modal with resolved false', async () => {
      await component.cancel();
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith({ resolved: false });
    });
  });

  // ============================================================================
  // GET DIFFERENCES TESTS
  // ============================================================================

  describe('Get Differences', () => {
    it('should return differences between local and server data', () => {
      const differences = component.getDifferences();
      
      // Should have differences: name, frequency, notes, currentStock
      expect(differences.length).toBeGreaterThan(0);
    });

    it('should exclude updatedAt and createdAt from differences', () => {
      component.conflict = {
        ...mockConflict,
        localData: { ...mockConflict.localData, updatedAt: new Date(), createdAt: new Date() },
        serverData: { ...mockConflict.serverData, updatedAt: new Date(), createdAt: new Date() }
      };

      const differences = component.getDifferences();
      const hasTimestamps = differences.some(d => d.key === 'updatedAt' || d.key === 'createdAt');
      
      expect(hasTimestamps).toBe(false);
    });

    it('should return correct local and server values', () => {
      const differences = component.getDifferences();
      const nameDiff = differences.find(d => d.key === 'name');
      
      expect(nameDiff?.local).toBe('Aspirin Local');
      expect(nameDiff?.server).toBe('Aspirin Server');
    });

    it('should include fields only in local data', () => {
      component.conflict = {
        ...mockConflict,
        localData: { ...mockConflict.localData, localOnly: 'test' },
        serverData: mockConflict.serverData
      };

      const differences = component.getDifferences();
      const localOnlyDiff = differences.find(d => d.key === 'localOnly');
      
      expect(localOnlyDiff).toBeTruthy();
      expect(localOnlyDiff?.local).toBe('test');
      expect(localOnlyDiff?.server).toBeUndefined();
    });

    it('should handle identical values (no difference)', () => {
      component.conflict = {
        ...mockConflict,
        localData: { name: 'Same Name', dosage: '500mg' },
        serverData: { name: 'Same Name', dosage: '500mg' }
      };

      const differences = component.getDifferences();
      expect(differences.length).toBe(0);
    });
  });

  // ============================================================================
  // FORMAT VALUE TESTS
  // ============================================================================

  describe('Format Value', () => {
    it('should return "-" for null', () => {
      expect(component.formatValue(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(component.formatValue(undefined)).toBe('-');
    });

    it('should return "Sim" for true', () => {
      expect(component.formatValue(true)).toBe('Sim');
    });

    it('should return "Não" for false', () => {
      expect(component.formatValue(false)).toBe('Não');
    });

    it('should stringify objects', () => {
      const result = component.formatValue({ key: 'value' });
      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    it('should convert numbers to string', () => {
      expect(component.formatValue(123)).toBe('123');
    });

    it('should return string as is', () => {
      expect(component.formatValue('test value')).toBe('test value');
    });
  });

  // ============================================================================
  // GET FIELD LABEL TESTS
  // ============================================================================

  describe('Get Field Label', () => {
    it('should return "Nome" for name', () => {
      expect(component.getFieldLabel('name')).toBe('Nome');
    });

    it('should return "Dosagem" for dosage', () => {
      expect(component.getFieldLabel('dosage')).toBe('Dosagem');
    });

    it('should return "Frequência" for frequency', () => {
      expect(component.getFieldLabel('frequency')).toBe('Frequência');
    });

    it('should return "Estoque" for currentStock', () => {
      expect(component.getFieldLabel('currentStock')).toBe('Estoque');
    });

    it('should return key for unknown field', () => {
      expect(component.getFieldLabel('unknownField')).toBe('unknownField');
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should render modal header', () => {
      const header = fixture.nativeElement.querySelector('ion-header');
      expect(header).toBeTruthy();
    });

    it('should render resolution options', () => {
      const cards = fixture.nativeElement.querySelectorAll('ion-card');
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });
  });
});
