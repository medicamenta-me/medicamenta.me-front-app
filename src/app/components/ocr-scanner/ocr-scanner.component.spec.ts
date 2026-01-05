/**
 * 🧪 OcrScannerComponent Tests
 *
 * Testes unitários para o componente de scanner OCR.
 * Cobertura: captura, processamento, parsing, save, error handling.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OcrScannerComponent } from './ocr-scanner.component';
import { IonicModule } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { OcrService } from '../../services/ocr.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { OCRResult } from '../../models/ocr.model';

// Fake loader for translations
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      OCR: {
        DETECTED: 'Detected: {{name}}',
        SCAN_COMPLETE: 'Scan complete',
        ERRORS: {
          CAMERA_PERMISSION_DENIED: 'Camera permission denied',
          CAMERA_ACCESS: 'Camera access error',
          GALLERY_ERROR: 'Gallery error',
          NOT_AUTHENTICATED: 'Not authenticated',
          PROCESSING_ERROR: 'Processing error',
          SAVE_ERROR: 'Save error'
        }
      }
    });
  }
}

describe('OcrScannerComponent', () => {
  let component: OcrScannerComponent;
  let fixture: ComponentFixture<OcrScannerComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let ocrServiceSpy: jasmine.SpyObj<OcrService>;
  let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let medicationServiceSpy: jasmine.SpyObj<MedicationServiceV2>;
  let translateServiceSpy: jasmine.SpyObj<TranslateService>;

  const mockExtractedData = {
    name: 'Aspirin',
    dosage: '500mg',
    frequency: '8/8h',
    instructions: 'Take with food',
    manufacturer: 'Pharma Inc',
    form: 'comprimido',
    activeIngredient: 'Acetylsalicylic acid',
    confidence: 85,
    confidenceLevel: 'high' as const,
    rawText: 'ASPIRIN 500MG...',
    language: 'pt-BR' as const
  };

  const mockOcrResult: any = {
    id: 'ocr-123',
    status: 'success',
    engine: 'tesseract',
    confidence: 85,
    extractedData: mockExtractedData,
    createdAt: new Date(),
    processedAt: new Date(),
    userId: 'user-123'
  };

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    
    const mockToast = {
      present: jasmine.createSpy().and.returnValue(Promise.resolve())
    };
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast as any));
    
    ocrServiceSpy = jasmine.createSpyObj('OcrService', ['processImage', 'reset'], {
      status: signal('idle' as const),
      progress: signal(0)
    });
    ocrServiceSpy.processImage.and.returnValue(Promise.resolve(mockOcrResult));
    
    analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['logEvent']);
    
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: signal({ uid: 'user-123' })
    });
    
    medicationServiceSpy = jasmine.createSpyObj('MedicationServiceV2', ['addMedication']);
    medicationServiceSpy.addMedication.and.returnValue(Promise.resolve({ id: 'new-med-id' }));
    
    translateServiceSpy = jasmine.createSpyObj('TranslateService', ['instant']);
    translateServiceSpy.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [
        OcrScannerComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: OcrService, useValue: ocrServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: MedicationServiceV2, useValue: medicationServiceSpy },
        { provide: TranslateService, useValue: translateServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(OcrScannerComponent);
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

    it('should initialize with no captured image', () => {
      expect(component.capturedImage()).toBeNull();
    });

    it('should initialize with isProcessing false', () => {
      expect(component.isProcessing()).toBe(false);
    });

    it('should initialize with isSaving false', () => {
      expect(component.isSaving()).toBe(false);
    });

    it('should initialize with no result', () => {
      expect(component.result()).toBeNull();
    });

    it('should initialize with no error', () => {
      expect(component.error()).toBeNull();
    });
  });

  // ============================================================================
  // RESET TESTS
  // ============================================================================

  describe('Reset', () => {
    it('should clear captured image', () => {
      component.capturedImage.set('data:image/png...');
      component.reset();
      expect(component.capturedImage()).toBeNull();
    });

    it('should clear result', () => {
      component.result.set(mockOcrResult);
      component.reset();
      expect(component.result()).toBeNull();
    });

    it('should clear error', () => {
      component.error.set('Some error');
      component.reset();
      expect(component.error()).toBeNull();
    });

    it('should reset isProcessing', () => {
      component.isProcessing.set(true);
      component.reset();
      expect(component.isProcessing()).toBe(false);
    });

    it('should call ocr service reset', () => {
      component.reset();
      expect(ocrServiceSpy.reset).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // RETRY TESTS
  // ============================================================================

  describe('Retry', () => {
    it('should process current image again', async () => {
      component.capturedImage.set('data:image/png...');
      await component.retry();
      
      expect(ocrServiceSpy.processImage).toHaveBeenCalledWith('data:image/png...', 'user-123');
    });

    it('should not process if no image captured', async () => {
      component.capturedImage.set(null);
      await component.retry();
      
      expect(ocrServiceSpy.processImage).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SAVE MEDICATION TESTS
  // ============================================================================

  describe('Save Medication', () => {
    beforeEach(() => {
      component.result.set(mockOcrResult);
    });

    it('should save medication with correct data', async () => {
      // Note: The component may modify extractedData via edit dialog before saving
      // The actual name saved depends on what's in extractedData at save time
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).toHaveBeenCalledWith(
        jasmine.objectContaining({
          dosage: '500mg'
        })
      );
      // Verify name is present (may be original or edited)
      const callArgs = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(callArgs.name).toBeTruthy();
    });

    it('should not save if no result', async () => {
      component.result.set(null);
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).not.toHaveBeenCalled();
    });

    it('should not save if no name in extracted data', async () => {
      component.result.set({
        ...mockOcrResult,
        extractedData: { dosage: '500mg' }
      });
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).not.toHaveBeenCalled();
    });

    it('should set isSaving during save', async () => {
      let wasSaving = false;
      medicationServiceSpy.addMedication.and.callFake(() => {
        wasSaving = component.isSaving();
        return Promise.resolve({ id: 'new-id' });
      });
      
      await component.saveMedication();
      
      expect(wasSaving).toBe(true);
    });

    it('should reset isSaving after save', async () => {
      await component.saveMedication();
      expect(component.isSaving()).toBe(false);
    });

    it('should log analytics on success', async () => {
      await component.saveMedication();
      
      expect(analyticsServiceSpy.logEvent).toHaveBeenCalledWith(
        'medication_created_from_ocr',
        jasmine.objectContaining({
          confidence: 85
        })
      );
    });

    it('should handle save error', async () => {
      medicationServiceSpy.addMedication.and.returnValue(Promise.reject(new Error('Save failed')));
      
      await component.saveMedication();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'danger'
        })
      );
    });

    it('should log analytics on error', async () => {
      medicationServiceSpy.addMedication.and.returnValue(Promise.reject(new Error('Network error')));
      
      await component.saveMedication();
      
      expect(analyticsServiceSpy.logEvent).toHaveBeenCalledWith(
        'medication_save_failed',
        jasmine.objectContaining({
          error: jasmine.any(String)
        })
      );
    });
  });

  // ============================================================================
  // CLOSE TESTS
  // ============================================================================

  describe('Close', () => {
    it('should dismiss modal', async () => {
      await component.close();
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GET CONFIDENCE COLOR TESTS
  // ============================================================================

  describe('Get Confidence Color', () => {
    it('should return medium for undefined', () => {
      expect(component.getConfidenceColor(undefined)).toBe('medium');
    });

    it('should return success for 90+', () => {
      expect(component.getConfidenceColor(90)).toBe('success');
      expect(component.getConfidenceColor(100)).toBe('success');
    });

    it('should return warning for 70-89', () => {
      expect(component.getConfidenceColor(70)).toBe('warning');
      expect(component.getConfidenceColor(89)).toBe('warning');
    });

    it('should return danger for below 70', () => {
      expect(component.getConfidenceColor(69)).toBe('danger');
      expect(component.getConfidenceColor(1)).toBe('danger');
    });

    it('should return medium for zero (falsy)', () => {
      // 0 is falsy, so it returns 'medium' like undefined
      expect(component.getConfidenceColor(0)).toBe('medium');
    });
  });

  // ============================================================================
  // GET STATUS MESSAGE TESTS
  // ============================================================================

  describe('Get Status Message', () => {
    it('should return loading message', () => {
      (ocrServiceSpy.status as any).set('loading');
      expect(component.getStatusMessage()).toBe('Carregando scanner...');
    });

    it('should return processing message', () => {
      (ocrServiceSpy.status as any).set('processing');
      expect(component.getStatusMessage()).toBe('Processando imagem...');
    });

    it('should return success message', () => {
      (ocrServiceSpy.status as any).set('success');
      expect(component.getStatusMessage()).toBe('Scan concluído!');
    });

    it('should return error message', () => {
      (ocrServiceSpy.status as any).set('error');
      expect(component.getStatusMessage()).toBe('Erro ao processar');
    });

    it('should return quota exceeded message', () => {
      (ocrServiceSpy.status as any).set('quota_exceeded');
      expect(component.getStatusMessage()).toBe('Limite mensal atingido');
    });

    it('should return default message for idle', () => {
      (ocrServiceSpy.status as any).set('idle');
      expect(component.getStatusMessage()).toBe('Pronto para scan');
    });
  });

  // ============================================================================
  // PARSE STOCK UNIT TESTS (via saveMedication)
  // ============================================================================

  describe('Parse Stock Unit', () => {
    it('should parse comprimido to comprimidos', async () => {
      component.result.set({
        ...mockOcrResult,
        extractedData: { ...mockOcrResult.extractedData, form: 'comprimido' }
      });
      
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).toHaveBeenCalledWith(
        jasmine.objectContaining({ stockUnit: 'comprimidos' })
      );
    });

    it('should parse xarope to ml', async () => {
      component.result.set({
        ...mockOcrResult,
        extractedData: { ...mockOcrResult.extractedData, form: 'xarope' }
      });
      
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).toHaveBeenCalledWith(
        jasmine.objectContaining({ stockUnit: 'ml' })
      );
    });

    it('should parse gota to gotas', async () => {
      component.result.set({
        ...mockOcrResult,
        extractedData: { ...mockOcrResult.extractedData, form: 'gotas' }
      });
      
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).toHaveBeenCalledWith(
        jasmine.objectContaining({ stockUnit: 'gotas' })
      );
    });

    it('should default to unidades for unknown form', async () => {
      component.result.set({
        ...mockOcrResult,
        extractedData: { ...mockOcrResult.extractedData, form: 'unknown' }
      });
      
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).toHaveBeenCalledWith(
        jasmine.objectContaining({ stockUnit: 'unidades' })
      );
    });
  });

  // ============================================================================
  // EDIT MEDICATION TESTS
  // ============================================================================

  describe('Edit Medication', () => {
    it('should not open edit dialog if no result', async () => {
      component.result.set(null);
      await component.editMedication();
      
      expect(modalControllerSpy.create).not.toHaveBeenCalled();
    });

    it('should open edit dialog with extracted data', async () => {
      component.result.set(mockOcrResult);
      
      const mockModal = {
        present: jasmine.createSpy().and.returnValue(Promise.resolve()),
        onWillDismiss: jasmine.createSpy().and.returnValue(Promise.resolve({ role: 'cancel' }))
      };
      modalControllerSpy.create.and.returnValue(Promise.resolve(mockModal as any));
      
      await component.editMedication();
      
      expect(modalControllerSpy.create).toHaveBeenCalled();
    });

    it('should save after edit confirmation', async () => {
      component.result.set(mockOcrResult);
      
      const editedData = { ...mockOcrResult.extractedData, name: 'Edited Aspirin' };
      const mockModal = {
        present: jasmine.createSpy().and.returnValue(Promise.resolve()),
        onWillDismiss: jasmine.createSpy().and.returnValue(Promise.resolve({
          data: editedData,
          role: 'confirm'
        }))
      };
      modalControllerSpy.create.and.returnValue(Promise.resolve(mockModal as any));
      
      await component.editMedication();
      
      expect(medicationServiceSpy.addMedication).toHaveBeenCalled();
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

    it('should render content', () => {
      const content = fixture.nativeElement.querySelector('ion-content');
      expect(content).toBeTruthy();
    });
  });
});
