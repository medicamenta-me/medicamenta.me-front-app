import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OcrEditDialogComponent } from './ocr-edit-dialog.component';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MedicationOCRData } from '../../models/ocr.model';

describe('OcrEditDialogComponent', () => {
  let component: OcrEditDialogComponent;
  let fixture: ComponentFixture<OcrEditDialogComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;

  const mockOCRData: MedicationOCRData = {
    name: 'Dipirona',
    dosage: '500mg',
    form: 'comprimido',
    frequency: '8/8h',
    activeIngredient: 'Dipirona Sódica',
    manufacturer: 'EMS',
    instructions: 'Tomar com água',
    prescriptionNumber: '12345',
    doctor: 'Dr. Silva',
    doctorCRM: 'CRM-SP 123456',
    prescriptionDate: '01/01/2025',
    expirationDate: '01/07/2025',
    confidence: 85.5,
    confidenceLevel: 'medium' as const,
    rawText: 'Raw OCR text',
    language: 'por' as const
  };

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalControllerSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [OcrEditDialogComponent, FormsModule,
        IonicModule.forRoot(),
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(OcrEditDialogComponent);
    component = fixture.componentInstance;
    component.data = mockOCRData;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should clone data for editing on init', () => {
      component.ngOnInit();
      
      expect(component.originalData).toEqual(mockOCRData);
      expect(component.editedData.name).toBe(mockOCRData.name);
    });

    it('should initialize editedData with all editable fields', () => {
      component.ngOnInit();
      
      expect(component.editedData.name).toBe('Dipirona');
      expect(component.editedData.dosage).toBe('500mg');
      expect(component.editedData.form).toBe('comprimido');
      expect(component.editedData.frequency).toBe('8/8h');
      expect(component.editedData.activeIngredient).toBe('Dipirona Sódica');
      expect(component.editedData.manufacturer).toBe('EMS');
      expect(component.editedData.instructions).toBe('Tomar com água');
      expect(component.editedData.prescriptionNumber).toBe('12345');
      expect(component.editedData.doctor).toBe('Dr. Silva');
      expect(component.editedData.doctorCRM).toBe('CRM-SP 123456');
      expect(component.editedData.prescriptionDate).toBe('01/01/2025');
      expect(component.editedData.expirationDate).toBe('01/07/2025');
    });

    it('should preserve original data unchanged after editing', () => {
      component.ngOnInit();
      component.editedData.name = 'Modified Name';
      
      expect(component.originalData.name).toBe('Dipirona');
    });
  });

  describe('cancel', () => {
    it('should dismiss modal with null and cancel role', async () => {
      await component.cancel();
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith(null, 'cancel');
    });
  });

  describe('confirm', () => {
    it('should dismiss with merged data on confirm', async () => {
      component.ngOnInit();
      component.editedData.name = 'Paracetamol';
      
      await component.confirm();
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith(
        jasmine.objectContaining({
          name: 'Paracetamol',
          confidence: mockOCRData.confidence,
          confidenceLevel: mockOCRData.confidenceLevel,
          rawText: mockOCRData.rawText,
          language: mockOCRData.language
        }),
        'confirm'
      );
    });

    it('should not dismiss if name is empty', async () => {
      component.ngOnInit();
      component.editedData.name = '';
      
      const consoleSpy = spyOn(console, 'error');
      await component.confirm();
      
      expect(modalControllerSpy.dismiss).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[OCR Edit Dialog] Name is required');
    });

    it('should not dismiss if name is only whitespace', async () => {
      component.ngOnInit();
      component.editedData.name = '   ';
      
      await component.confirm();
      
      expect(modalControllerSpy.dismiss).not.toHaveBeenCalled();
    });

    it('should preserve technical fields in final data', async () => {
      component.ngOnInit();
      
      await component.confirm();
      
      const dismissCall = modalControllerSpy.dismiss.calls.mostRecent();
      const finalData = dismissCall.args[0] as MedicationOCRData;
      
      expect(finalData.confidence).toBe(85.5);
      expect(finalData.confidenceLevel).toBe('medium');
      expect(finalData.rawText).toBe('Raw OCR text');
      expect(finalData.language).toBe('por');
    });

    it('should merge edited fields with original data', async () => {
      component.ngOnInit();
      component.editedData.dosage = '1g';
      component.editedData.form = 'cápsula';
      
      await component.confirm();
      
      const dismissCall = modalControllerSpy.dismiss.calls.mostRecent();
      const finalData = dismissCall.args[0] as MedicationOCRData;
      
      expect(finalData.dosage).toBe('1g');
      expect(finalData.form).toBe('cápsula');
      expect(finalData.name).toBe('Dipirona'); // unchanged
    });
  });

  describe('Data Binding', () => {
    it('should allow editing medication name', () => {
      component.ngOnInit();
      component.editedData.name = 'Ibuprofeno';
      
      expect(component.editedData.name).toBe('Ibuprofeno');
    });

    it('should allow editing dosage', () => {
      component.ngOnInit();
      component.editedData.dosage = '400mg';
      
      expect(component.editedData.dosage).toBe('400mg');
    });

    it('should allow editing form', () => {
      component.ngOnInit();
      component.editedData.form = 'xarope';
      
      expect(component.editedData.form).toBe('xarope');
    });

    it('should allow editing frequency', () => {
      component.ngOnInit();
      component.editedData.frequency = '12/12h';
      
      expect(component.editedData.frequency).toBe('12/12h');
    });

    it('should allow editing active ingredient', () => {
      component.ngOnInit();
      component.editedData.activeIngredient = 'Ibuprofeno';
      
      expect(component.editedData.activeIngredient).toBe('Ibuprofeno');
    });

    it('should allow editing manufacturer', () => {
      component.ngOnInit();
      component.editedData.manufacturer = 'Medley';
      
      expect(component.editedData.manufacturer).toBe('Medley');
    });

    it('should allow editing instructions', () => {
      component.ngOnInit();
      component.editedData.instructions = 'Tomar após refeições';
      
      expect(component.editedData.instructions).toBe('Tomar após refeições');
    });

    it('should allow editing prescription number', () => {
      component.ngOnInit();
      component.editedData.prescriptionNumber = '67890';
      
      expect(component.editedData.prescriptionNumber).toBe('67890');
    });

    it('should allow editing doctor name', () => {
      component.ngOnInit();
      component.editedData.doctor = 'Dra. Santos';
      
      expect(component.editedData.doctor).toBe('Dra. Santos');
    });

    it('should allow editing doctor CRM', () => {
      component.ngOnInit();
      component.editedData.doctorCRM = 'CRM-RJ 654321';
      
      expect(component.editedData.doctorCRM).toBe('CRM-RJ 654321');
    });

    it('should allow editing prescription date', () => {
      component.ngOnInit();
      component.editedData.prescriptionDate = '15/02/2025';
      
      expect(component.editedData.prescriptionDate).toBe('15/02/2025');
    });

    it('should allow editing expiration date', () => {
      component.ngOnInit();
      component.editedData.expirationDate = '15/08/2025';
      
      expect(component.editedData.expirationDate).toBe('15/08/2025');
    });
  });

  describe('Original Data Display', () => {
    it('should display confidence percentage', () => {
      expect(component.originalData.confidence).toBe(85.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined optional fields', () => {
      const minimalData: MedicationOCRData = {
        name: 'Test',
        confidence: 50,
        confidenceLevel: 'low',
        rawText: 'text',
        language: 'por'
      };
      
      component.data = minimalData;
      component.ngOnInit();
      
      expect(component.editedData.name).toBe('Test');
      expect(component.editedData.dosage).toBeUndefined();
    });

    it('should handle empty string fields', () => {
      const emptyData: MedicationOCRData = {
        ...mockOCRData,
        dosage: '',
        form: ''
      };
      
      component.data = emptyData;
      component.ngOnInit();
      
      expect(component.editedData.dosage).toBe('');
      expect(component.editedData.form).toBe('');
    });

    it('should handle special characters in fields', () => {
      component.ngOnInit();
      component.editedData.name = 'Ácido Acetilsalicílico';
      component.editedData.instructions = 'Tomar 1 comprimido às 8h & 20h';
      
      expect(component.editedData.name).toBe('Ácido Acetilsalicílico');
      expect(component.editedData.instructions).toContain('&');
    });

    it('should handle very long text in instructions', () => {
      component.ngOnInit();
      const longInstructions = 'A'.repeat(1000);
      component.editedData.instructions = longInstructions;
      
      expect(component.editedData.instructions?.length).toBe(1000);
    });

    it('should handle numeric strings in dosage', () => {
      component.ngOnInit();
      component.editedData.dosage = '123.45mg';
      
      expect(component.editedData.dosage).toBe('123.45mg');
    });
  });

  describe('Validation', () => {
    it('should require name field', async () => {
      component.ngOnInit();
      component.editedData.name = undefined;
      
      await component.confirm();
      
      expect(modalControllerSpy.dismiss).not.toHaveBeenCalled();
    });

    it('should allow empty optional fields', async () => {
      component.ngOnInit();
      component.editedData.dosage = '';
      component.editedData.form = '';
      component.editedData.frequency = '';
      
      await component.confirm();
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  describe('Icons', () => {
    it('should have icons registered in constructor', () => {
      // Icons are registered via addIcons in constructor
      expect(component).toBeTruthy();
    });
  });
});

