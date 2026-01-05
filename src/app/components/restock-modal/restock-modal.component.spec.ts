/**
 * 🧪 RestockModalComponent Tests
 *
 * Testes unitários para o modal de reabastecimento de estoque.
 * Cobertura: inicialização, validação, submit, error handling.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RestockModalComponent } from './restock-modal.component';
import { IonicModule } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { StockService } from '../../services/stock.service';
import { LogService } from '../../services/log.service';
import { TranslationService } from '../../services/translation.service';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { Medication } from '../../models/medication.model';

// Fake loader for translations
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      STOCK: {
        RESTOCK_TITLE: 'Restock',
        CURRENT_STOCK: 'Current Stock',
        RESTOCK_QUANTITY: 'Quantity',
        RESTOCK_QUANTITY_PLACEHOLDER: 'Enter quantity',
        NEW_STOCK_WILL_BE: 'New stock will be',
        RESTOCK: 'Restock',
        RESTOCK_SUCCESS: 'Stock updated successfully',
        RESTOCK_ERROR: 'Error updating stock'
      },
      COMMON: {
        CANCEL: 'Cancel',
        LOADING: 'Loading...'
      },
      HISTORY: {
        EVENTS: {
          RESTOCK: 'Restocked {{medication}} with {{quantity}} {{unit}}'
        }
      }
    });
  }
}

describe('RestockModalComponent', () => {
  let component: RestockModalComponent;
  let fixture: ComponentFixture<RestockModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let medicationServiceSpy: jasmine.SpyObj<MedicationServiceV2>;
  let stockServiceSpy: jasmine.SpyObj<StockService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;
  let translationServiceSpy: jasmine.SpyObj<TranslationService>;

  const mockMedication: Medication = {
    id: 'med-1',
    patientId: 'patient-1',
    name: 'Aspirin',
    dosage: '500mg',
    frequency: 'daily',
    schedule: [{ time: '08:00', status: 'upcoming' }],
    stock: 10,
    currentStock: 10,
    stockUnit: 'pills',
    lowStockThreshold: 5,
    userId: 'user-1',
    isArchived: false
  };

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    
    const mockToast = {
      present: jasmine.createSpy().and.returnValue(Promise.resolve())
    };
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast as any));
    
    medicationServiceSpy = jasmine.createSpyObj('MedicationServiceV2', [
      'updateMedicationStock',
      'unarchiveMedication'
    ]);
    medicationServiceSpy.updateMedicationStock.and.returnValue(Promise.resolve());
    medicationServiceSpy.unarchiveMedication.and.returnValue(Promise.resolve());
    
    stockServiceSpy = jasmine.createSpyObj('StockService', ['addStock']);
    stockServiceSpy.addStock.and.returnValue(20); // Returns new stock level
    
    logServiceSpy = jasmine.createSpyObj('LogService', ['addLog']);
    logServiceSpy.addLog.and.returnValue(Promise.resolve());
    
    translationServiceSpy = jasmine.createSpyObj('TranslationService', ['instant']);
    translationServiceSpy.instant.and.callFake((key: string, params?: any) => {
      if (key === 'STOCK.RESTOCK_SUCCESS') return 'Stock updated successfully';
      if (key === 'STOCK.RESTOCK_ERROR') return 'Error updating stock';
      if (key === 'HISTORY.EVENTS.RESTOCK') return `Restocked ${params?.medication} with ${params?.quantity} ${params?.unit}`;
      return key;
    });

    await TestBed.configureTestingModule({
      imports: [
        RestockModalComponent,
        FormsModule,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: MedicationServiceV2, useValue: medicationServiceSpy },
        { provide: StockService, useValue: stockServiceSpy },
        { provide: LogService, useValue: logServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RestockModalComponent);
    component = fixture.componentInstance;
    component.medication = mockMedication;
    fixture.detectChanges();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should set current stock from medication', () => {
      expect(component.currentStock()).toBe(10);
    });

    it('should set current stock from stock property if currentStock is undefined', () => {
      const medWithStock: Medication = {
        ...mockMedication,
        currentStock: undefined,
        stock: 15
      };
      
      fixture = TestBed.createComponent(RestockModalComponent);
      component = fixture.componentInstance;
      component.medication = medWithStock;
      component.ngOnInit();
      
      expect(component.currentStock()).toBe(15);
    });

    it('should default current stock to 0 if neither stock property exists', () => {
      const medNoStock = {
        ...mockMedication,
        currentStock: undefined,
        stock: 0
      } as unknown as Medication;
      
      fixture = TestBed.createComponent(RestockModalComponent);
      component = fixture.componentInstance;
      component.medication = medNoStock;
      component.ngOnInit();
      
      expect(component.currentStock()).toBe(0);
    });

    it('should initialize quantity to 0', () => {
      expect(component.quantity).toBe(0);
    });

    it('should initialize isLoading to false', () => {
      expect(component.isLoading()).toBe(false);
    });
  });

  // ============================================================================
  // DISMISS TESTS
  // ============================================================================

  describe('Dismiss', () => {
    it('should call modal dismiss', () => {
      component.dismiss();
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // RESTOCK TESTS
  // ============================================================================

  describe('Restock', () => {
    it('should not restock when quantity is 0', async () => {
      component.quantity = 0;
      await component.restock();
      
      expect(stockServiceSpy.addStock).not.toHaveBeenCalled();
    });

    it('should not restock when quantity is negative', async () => {
      component.quantity = -5;
      await component.restock();
      
      expect(stockServiceSpy.addStock).not.toHaveBeenCalled();
    });

    it('should call stock service with medication and quantity', async () => {
      component.quantity = 10;
      await component.restock();
      
      expect(stockServiceSpy.addStock).toHaveBeenCalledWith(mockMedication, 10);
    });

    it('should update medication stock', async () => {
      component.quantity = 10;
      stockServiceSpy.addStock.and.returnValue(20);
      
      await component.restock();
      
      expect(medicationServiceSpy.updateMedicationStock).toHaveBeenCalledWith('med-1', 20);
    });

    it('should unarchive medication if archived', async () => {
      component.medication = { ...mockMedication, isArchived: true };
      component.quantity = 10;
      
      await component.restock();
      
      expect(medicationServiceSpy.unarchiveMedication).toHaveBeenCalledWith('med-1');
    });

    it('should not unarchive medication if not archived', async () => {
      component.quantity = 10;
      
      await component.restock();
      
      expect(medicationServiceSpy.unarchiveMedication).not.toHaveBeenCalled();
    });

    it('should log restock action', async () => {
      component.quantity = 10;
      
      await component.restock();
      
      expect(logServiceSpy.addLog).toHaveBeenCalledWith(
        'restock',
        jasmine.stringMatching(/Restocked/)
      );
    });

    it('should show success toast', async () => {
      component.quantity = 10;
      
      await component.restock();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success'
        })
      );
    });

    it('should dismiss modal with restocked flag', async () => {
      component.quantity = 10;
      
      await component.restock();
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith({ restocked: true });
    });

    it('should set isLoading during restock', async () => {
      let wasLoading = false;
      medicationServiceSpy.updateMedicationStock.and.callFake(() => {
        wasLoading = component.isLoading();
        return Promise.resolve();
      });
      
      component.quantity = 10;
      await component.restock();
      
      expect(wasLoading).toBe(true);
    });

    it('should reset isLoading after restock', async () => {
      component.quantity = 10;
      await component.restock();
      
      expect(component.isLoading()).toBe(false);
    });

    it('should handle restock error', async () => {
      medicationServiceSpy.updateMedicationStock.and.returnValue(Promise.reject(new Error('Network error')));
      component.quantity = 10;
      
      await component.restock();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'danger'
        })
      );
    });

    it('should reset isLoading on error', async () => {
      medicationServiceSpy.updateMedicationStock.and.returnValue(Promise.reject(new Error('Network error')));
      component.quantity = 10;
      
      await component.restock();
      
      expect(component.isLoading()).toBe(false);
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should render header', () => {
      const header = fixture.nativeElement.querySelector('ion-header');
      expect(header).toBeTruthy();
    });

    it('should render medication name', () => {
      const name = fixture.nativeElement.querySelector('.info-content h2');
      expect(name?.textContent).toContain('Aspirin');
    });

    it('should render current stock', () => {
      const stockText = fixture.nativeElement.querySelector('.current-stock strong');
      expect(stockText?.textContent).toContain('10');
    });

    it('should render input field', () => {
      const input = fixture.nativeElement.querySelector('ion-input');
      expect(input).toBeTruthy();
    });

    it('should render cancel button', () => {
      const cancelBtn = fixture.nativeElement.querySelector('.modal-actions ion-button[color="light"]');
      expect(cancelBtn).toBeTruthy();
    });

    it('should render restock button', () => {
      const restockBtn = fixture.nativeElement.querySelector('.modal-actions ion-button[color="primary"]');
      expect(restockBtn).toBeTruthy();
    });

    it('should show new stock preview when quantity > 0', () => {
      component.quantity = 5;
      fixture.detectChanges();
      
      const preview = fixture.nativeElement.querySelector('.new-stock-preview');
      expect(preview).toBeTruthy();
    });

    it('should not show new stock preview when quantity is 0', () => {
      component.quantity = 0;
      fixture.detectChanges();
      
      const preview = fixture.nativeElement.querySelector('.new-stock-preview');
      expect(preview).toBeFalsy();
    });

    it('should calculate correct new stock in preview', () => {
      component.quantity = 5;
      fixture.detectChanges();
      
      const preview = fixture.nativeElement.querySelector('.new-stock-preview strong');
      // 10 (current) + 5 (quantity) = 15
      expect(preview?.textContent).toContain('15');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle medication without stockUnit', () => {
      component.medication = { ...mockMedication, stockUnit: undefined };
      fixture.detectChanges();
      
      const stockText = fixture.nativeElement.querySelector('.current-stock');
      expect(stockText?.textContent).toContain('unidades');
    });

    it('should handle large quantities', async () => {
      component.quantity = 999999;
      stockServiceSpy.addStock.and.returnValue(1000009);
      
      await component.restock();
      
      expect(stockServiceSpy.addStock).toHaveBeenCalledWith(mockMedication, 999999);
    });

    it('should handle float quantities (ngModel)', () => {
      component.quantity = 5.5;
      fixture.detectChanges();
      
      // The input type=number should handle this
      expect(component.quantity).toBe(5.5);
    });
  });
});
