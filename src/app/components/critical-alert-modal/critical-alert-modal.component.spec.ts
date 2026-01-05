/**
 * 🧪 CriticalAlertModalComponent Tests
 *
 * Testes unitários para o modal de alertas críticos de estoque.
 * Cobertura: alertas, severidade, restock, nome do paciente.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CriticalAlertModalComponent } from './critical-alert-modal.component';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { CriticalAlertService, CriticalAlert } from '../../services/critical-alert.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA, signal, WritableSignal } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

// Fake loader for translations
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      ALERTS: {
        CRITICAL_STOCK_ALERT: 'Critical Stock Alert',
        MODAL_MESSAGE: 'Some medications need attention',
        MEDICATION_SINGULAR: 'medication',
        MEDICATION_PLURAL: 'medications',
        OUT_OF_STOCK: 'Out of Stock',
        DAYS_REMAINING: '{{days}} days remaining',
        UNITS_REMAINING: '{{units}} units remaining',
        RESTOCK_NOW: 'Restock Now',
        CLOSE_AND_CONTINUE: 'Close and Continue'
      }
    });
  }
}

describe('CriticalAlertModalComponent', () => {
  let component: CriticalAlertModalComponent;
  let fixture: ComponentFixture<CriticalAlertModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let criticalAlertServiceSpy: jasmine.SpyObj<CriticalAlertService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let routerSpy: jasmine.SpyObj<Router>;
  
  let mockAlertsSignal: WritableSignal<CriticalAlert[]>;

  const mockAlerts: any[] = [
    {
      medication: {
        id: 'med-1',
        name: 'Aspirin',
        dosage: '500mg',
        patientId: 'patient-1',
        stockUnit: 'pills',
        frequency: 'daily',
        stock: 0
      },
      severity: 'critical',
      message: 'Out of stock',
      stockRemaining: 0,
      daysRemaining: 0
    },
    {
      medication: {
        id: 'med-2',
        name: 'Vitamin D',
        dosage: '1000IU',
        patientId: 'patient-2',
        stockUnit: 'capsules',
        frequency: 'daily',
        stock: 5
      },
      severity: 'low',
      message: 'Low stock',
      stockRemaining: 5,
      daysRemaining: 3
    }
  ];

  const mockPatients = [
    { id: 'patient-1', name: 'John Doe' },
    { id: 'patient-2', name: 'Jane Smith' }
  ];

  beforeEach(async () => {
    mockAlertsSignal = signal(mockAlerts);
    
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    criticalAlertServiceSpy = jasmine.createSpyObj('CriticalAlertService', ['markModalShown'], {
      allCriticalAlerts: mockAlertsSignal
    });
    userServiceSpy = jasmine.createSpyObj('UserService', [], {
      patients: signal(mockPatients)
    });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    // Mock modal creation for restock
    const mockRestockModal = {
      present: jasmine.createSpy().and.returnValue(Promise.resolve()),
      onWillDismiss: jasmine.createSpy().and.returnValue(Promise.resolve({ data: {} }))
    };
    modalControllerSpy.create.and.returnValue(Promise.resolve(mockRestockModal as any));

    await TestBed.configureTestingModule({
      imports: [
        CriticalAlertModalComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: CriticalAlertService, useValue: criticalAlertServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: Router, useValue: routerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CriticalAlertModalComponent);
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

    it('should have alerts from service', () => {
      expect(component.alerts().length).toBe(2);
    });

    it('should detect critical alerts', () => {
      expect(component.hasCriticalAlerts()).toBe(true);
    });

    it('should not have critical alerts when all are low', () => {
      mockAlertsSignal.set([{
        medication: { id: 'med-1', name: 'Test', dosage: '10mg', patientId: 'patient-1', frequency: 'daily', stock: 5 },
        severity: 'low',
        message: 'Low stock',
        stockRemaining: 5,
        daysRemaining: 3
      }] as any);
      
      fixture = TestBed.createComponent(CriticalAlertModalComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      
      expect(component.hasCriticalAlerts()).toBe(false);
    });
  });

  // ============================================================================
  // GET PATIENT NAME TESTS
  // ============================================================================

  describe('Get Patient Name', () => {
    it('should return patient name for valid ID', () => {
      expect(component.getPatientName('patient-1')).toBe('John Doe');
      expect(component.getPatientName('patient-2')).toBe('Jane Smith');
    });

    it('should return empty string for unknown patient', () => {
      expect(component.getPatientName('unknown-id')).toBe('');
    });

    it('should return empty string for null patient', () => {
      expect(component.getPatientName(null as any)).toBe('');
    });
  });

  // ============================================================================
  // OPEN RESTOCK MODAL TESTS
  // ============================================================================

  describe('Open Restock Modal', () => {
    it('should create and present restock modal', async () => {
      const medication = mockAlerts[0].medication;
      await component.openRestockModal(medication);

      expect(modalControllerSpy.create).toHaveBeenCalled();
      const createCall = modalControllerSpy.create.calls.mostRecent();
      expect(createCall.args[0].componentProps).toEqual({ medication });
    });

    it('should auto-close when no more alerts after restock', async () => {
      // Simulate all alerts resolved
      mockAlertsSignal.set([]);
      
      const medication = mockAlerts[0].medication;
      await component.openRestockModal(medication);

      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DISMISS TESTS
  // ============================================================================

  describe('Dismiss', () => {
    it('should mark modal as shown', async () => {
      await component.dismiss();
      expect(criticalAlertServiceSpy.markModalShown).toHaveBeenCalled();
    });

    it('should dismiss modal controller', async () => {
      await component.dismiss();
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should render ion-header', () => {
      const header = fixture.nativeElement.querySelector('ion-header');
      expect(header).toBeTruthy();
    });

    it('should render ion-toolbar with danger color for critical alerts', () => {
      const toolbar = fixture.nativeElement.querySelector('ion-toolbar');
      expect(toolbar).toBeTruthy();
    });

    it('should render alert list', () => {
      const list = fixture.nativeElement.querySelector('ion-list');
      expect(list).toBeTruthy();
    });

    it('should render correct number of alert items', () => {
      const items = fixture.nativeElement.querySelectorAll('ion-item');
      expect(items.length).toBe(2);
    });

    it('should render alert intro section', () => {
      const intro = fixture.nativeElement.querySelector('.alert-intro');
      expect(intro).toBeTruthy();
    });

    it('should render close button', () => {
      const closeButton = fixture.nativeElement.querySelector('.modal-actions ion-button');
      expect(closeButton).toBeTruthy();
    });
  });

  // ============================================================================
  // ALERT DISPLAY TESTS
  // ============================================================================

  describe('Alert Display', () => {
    it('should display medication names', () => {
      const items = fixture.nativeElement.querySelectorAll('.medication-info h3');
      const names = Array.from(items).map((el: any) => el.textContent);
      
      expect(names).toContain('Aspirin');
      expect(names).toContain('Vitamin D');
    });

    it('should apply critical class to critical alerts', () => {
      const criticalItem = fixture.nativeElement.querySelector('.alert-item.alert-critical');
      expect(criticalItem).toBeTruthy();
    });

    it('should apply low class to low alerts', () => {
      const lowItem = fixture.nativeElement.querySelector('.alert-item.alert-low');
      expect(lowItem).toBeTruthy();
    });
  });

  // ============================================================================
  // EMPTY STATE TESTS
  // ============================================================================

  describe('Empty State', () => {
    it('should handle empty alerts', () => {
      mockAlertsSignal.set([]);
      fixture.detectChanges();
      
      const items = fixture.nativeElement.querySelectorAll('ion-item');
      expect(items.length).toBe(0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle single alert (singular text)', () => {
      mockAlertsSignal.set([mockAlerts[0]]);
      fixture.detectChanges();
      
      expect(component.alerts().length).toBe(1);
    });

    it('should handle alerts without days remaining', () => {
      const alertWithoutDays: any = {
        medication: { id: 'med-3', name: 'Test Med', dosage: '10mg', patientId: 'patient-1', stockUnit: 'units', frequency: 'daily', stock: 5 },
        severity: 'low',
        message: 'Low stock',
        stockRemaining: 5,
        daysRemaining: null
      };
      mockAlertsSignal.set([alertWithoutDays]);
      fixture.detectChanges();
      
      expect(component.alerts().length).toBe(1);
    });

    it('should handle medication without stockUnit', () => {
      const alertWithoutUnit: any = {
        medication: { id: 'med-4', name: 'No Unit Med', dosage: '10mg', patientId: 'patient-1', frequency: 'daily', stock: 5 },
        severity: 'low',
        message: 'Low stock',
        stockRemaining: 5,
        daysRemaining: 3
      };
      mockAlertsSignal.set([alertWithoutUnit]);
      fixture.detectChanges();
      
      expect(component.alerts()[0].medication.stockUnit).toBeUndefined();
    });
  });
});
