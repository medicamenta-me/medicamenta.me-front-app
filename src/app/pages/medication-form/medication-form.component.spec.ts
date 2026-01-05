import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MedicationFormComponent } from './medication-form.component';
import { MedicationServiceV2 } from '../../services/medication-v2.service';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { ToastController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService, TranslatePipe, TranslateLoader } from '@ngx-translate/core';
import { signal } from '@angular/core';
import { of, Observable } from 'rxjs';

// Fake TranslateLoader for testing
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

describe('MedicationFormComponent', () => {
  let component: MedicationFormComponent;
  let fixture: ComponentFixture<MedicationFormComponent>;
  let medicationServiceSpy: jasmine.SpyObj<MedicationServiceV2>;
  let patientSelectorServiceSpy: jasmine.SpyObj<PatientSelectorService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let translateService: TranslateService; // Real service from TranslateModule
  let translateServiceSpy: jasmine.SpyObj<TranslateService>; // Spy for assertions
  let activatedRouteStub: any;

  const mockPatient = {
    userId: 'user123',
    name: 'John Doe',
    email: 'john@example.com',
    isPrimary: true
  };

  const mockMedication = {
    id: 'med123',
    patientId: 'user123',
    name: 'Aspirin',
    dosage: '100mg',
    frequency: '2 days',
    stock: 30,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    schedule: [
      { time: '08:00', status: 'upcoming' as const },
      { time: '20:00', status: 'upcoming' as const }
    ],
    notes: 'Take with food',
    doctorName: 'Dr. Smith',
    doctorCRM: '12345',
    isContinuousUse: true,
    initialStock: 30,
    currentStock: 25,
    stockUnit: 'comprimidos',
    lowStockThreshold: 10,
    isArchived: false
  };

  beforeEach(async () => {
    medicationServiceSpy = jasmine.createSpyObj('MedicationServiceV2', [
      'addMedication',
      'updateMedication',
      'getMedicationById'
    ]);
    patientSelectorServiceSpy = jasmine.createSpyObj('PatientSelectorService', [], {
      activePatientId: signal('user123'),
      activePatient: signal(mockPatient),
      availablePatients: signal([mockPatient])
    });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    // translateServiceSpy removed - using TranslateModule.forRoot with FakeLoader instead

    activatedRouteStub = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue(null)
        }
      }
    };

    // Setup default return values
    medicationServiceSpy.addMedication.and.returnValue(Promise.resolve({ id: 'new-med-id' }));
    medicationServiceSpy.updateMedication.and.returnValue(Promise.resolve());
    medicationServiceSpy.getMedicationById.and.returnValue(undefined);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));
    // Using TranslateModule.forRoot with FakeLoader - no need to configure spy
    // translateServiceSpy config removed as we're using real TranslateService with FakeLoader

    const mockToast = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [
        MedicationFormComponent,
        ReactiveFormsModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: MedicationServiceV2, useValue: medicationServiceSpy },
        { provide: PatientSelectorService, useValue: patientSelectorServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub }
      ]
    }).compileComponents();

    // Get the real TranslateService from TestBed
    translateService = TestBed.inject(TranslateService);
    // Spy on the instant method for tests that need it
    spyOn(translateService, 'instant').and.returnValue('Translated text');
    translateServiceSpy = translateService as jasmine.SpyObj<TranslateService>;

    fixture = TestBed.createComponent(MedicationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with default values', () => {
      expect(component.medicationForm).toBeDefined();
      expect(component.medicationForm.get('name')?.value).toBe('');
      expect(component.medicationForm.get('dosage')?.value).toBe('');
      expect(component.medicationForm.get('frequencyValue')?.value).toBe(1);
      expect(component.medicationForm.get('frequencyUnit')?.value).toBe('days');
    });

    it('should set isEditMode to false when no id in route', () => {
      expect(component.isEditMode).toBe(false);
    });

    it('should set today as default start date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(component.medicationForm.get('startDate')?.value).toBe(today);
    });

    it('should initialize schedule as empty FormArray', () => {
      expect(component.schedule.length).toBe(0);
    });

    it('should set default continuous use to true', () => {
      expect(component.medicationForm.get('isContinuousUse')?.value).toBe(true);
    });

    it('should set default stock unit to comprimidos', () => {
      expect(component.medicationForm.get('stockUnit')?.value).toBe('comprimidos');
    });

    it('should set default initial stock to 0', () => {
      expect(component.medicationForm.get('initialStock')?.value).toBe(0);
    });
  });

  describe('Edit Mode', () => {
    beforeEach(() => {
      activatedRouteStub.snapshot.paramMap.get.and.returnValue('med123');
      medicationServiceSpy.getMedicationById.and.returnValue(mockMedication);
    });

    it('should set isEditMode to true when id exists in route', () => {
      component.ngOnInit();
      expect(component.isEditMode).toBe(true);
    });

    it('should load medication data in edit mode', () => {
      component.ngOnInit();
      
      expect(medicationServiceSpy.getMedicationById).toHaveBeenCalledWith('med123');
      expect(component.medicationForm.get('name')?.value).toBe('Aspirin');
      expect(component.medicationForm.get('dosage')?.value).toBe('100mg');
    });

    it('should populate schedule from medication data', () => {
      component.ngOnInit();
      
      expect(component.schedule.length).toBe(2);
      expect(component.schedule.at(0).get('time')?.value).toBe('08:00');
      expect(component.schedule.at(1).get('time')?.value).toBe('20:00');
    });

    it('should clear previous schedule before patching', () => {
      component.addDose('10:00');
      expect(component.schedule.length).toBe(1);
      
      component.ngOnInit();
      
      // Should only have medication's schedule, not previous doses
      expect(component.schedule.length).toBe(2);
    });

    it('should handle medication not found', () => {
      medicationServiceSpy.getMedicationById.and.returnValue(undefined);
      
      component.ngOnInit();
      
      // Form should remain empty
      expect(component.medicationForm.get('name')?.value).toBe('');
    });

    it('should populate doctor information in edit mode', () => {
      component.ngOnInit();
      
      expect(component.medicationForm.get('doctorName')?.value).toBe('Dr. Smith');
      expect(component.medicationForm.get('doctorCRM')?.value).toBe('12345');
    });

    it('should populate stock information in edit mode', () => {
      component.ngOnInit();
      
      expect(component.medicationForm.get('initialStock')?.value).toBe(30);
      expect(component.medicationForm.get('stockUnit')?.value).toBe('comprimidos');
      expect(component.medicationForm.get('lowStockThreshold')?.value).toBe(10);
    });
  });

  describe('Form Validation', () => {
    it('should be invalid when required fields are empty', () => {
      expect(component.medicationForm.valid).toBe(false);
    });

    it('should require name field', () => {
      const nameControl = component.medicationForm.get('name');
      expect(nameControl?.hasError('required')).toBe(true);
      
      nameControl?.setValue('Aspirin');
      expect(nameControl?.valid).toBe(true);
    });

    it('should require dosage field', () => {
      const dosageControl = component.medicationForm.get('dosage');
      expect(dosageControl?.hasError('required')).toBe(true);
      
      dosageControl?.setValue('100mg');
      expect(dosageControl?.valid).toBe(true);
    });

    it('should require frequency value', () => {
      const frequencyValue = component.medicationForm.get('frequencyValue');
      expect(frequencyValue?.hasError('required')).toBe(false); // Has default value 1
      
      frequencyValue?.setValue('');
      expect(frequencyValue?.hasError('required')).toBe(true);
    });

    it('should require frequency value to be minimum 1', () => {
      const frequencyValue = component.medicationForm.get('frequencyValue');
      
      frequencyValue?.setValue(0);
      expect(frequencyValue?.hasError('min')).toBe(true);
      
      frequencyValue?.setValue(1);
      expect(frequencyValue?.valid).toBe(true);
    });

    it('should require at least one scheduled time', () => {
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg',
        startDate: '2024-01-01'
      });
      
      expect(component.medicationForm.valid).toBe(false);
      expect(component.schedule.hasError('required')).toBe(true);
      
      component.addDose('08:00');
      expect(component.medicationForm.valid).toBe(true);
    });

    it('should require start date', () => {
      const startDate = component.medicationForm.get('startDate');
      startDate?.setValue('');
      
      expect(startDate?.hasError('required')).toBe(true);
    });

    it('should not require end date', () => {
      const endDate = component.medicationForm.get('endDate');
      expect(endDate?.hasError('required')).toBe(false);
    });

    it('should require initial stock to be minimum 0', () => {
      const initialStock = component.medicationForm.get('initialStock');
      
      initialStock?.setValue(-1);
      expect(initialStock?.hasError('min')).toBe(true);
      
      initialStock?.setValue(0);
      expect(initialStock?.valid).toBe(true);
    });
  });

  describe('Schedule Management', () => {
    it('should add dose with empty time', () => {
      component.addDose();
      
      expect(component.schedule.length).toBe(1);
      expect(component.schedule.at(0).get('time')?.value).toBe('');
      expect(component.schedule.at(0).get('status')?.value).toBe('upcoming');
    });

    it('should add dose with specific time', () => {
      component.addDose('08:00');
      
      expect(component.schedule.length).toBe(1);
      expect(component.schedule.at(0).get('time')?.value).toBe('08:00');
    });

    it('should add multiple doses', () => {
      component.addDose('08:00');
      component.addDose('14:00');
      component.addDose('20:00');
      
      expect(component.schedule.length).toBe(3);
    });

    it('should remove dose at specific index', () => {
      component.addDose('08:00');
      component.addDose('14:00');
      component.addDose('20:00');
      
      component.removeDose(1);
      
      expect(component.schedule.length).toBe(2);
      expect(component.schedule.at(0).get('time')?.value).toBe('08:00');
      expect(component.schedule.at(1).get('time')?.value).toBe('20:00');
    });

    it('should handle removing last dose', () => {
      component.addDose('08:00');
      component.removeDose(0);
      
      expect(component.schedule.length).toBe(0);
    });

    it('should handle removing dose from empty schedule', () => {
      expect(() => component.removeDose(0)).not.toThrow();
      expect(component.schedule.length).toBe(0);
    });
  });

  describe('Smart Schedule Suggestions', () => {
    it('should suggest schedule for once daily medication', () => {
      component.medicationForm.patchValue({
        frequencyValue: 1,
        frequencyUnit: 'days'
      });
      
      component.suggestScheduleTimes();
      
      expect(component.schedule.length).toBe(1);
    });

    it('should suggest schedule for twice daily medication', () => {
      component.medicationForm.patchValue({
        frequencyValue: 2,
        frequencyUnit: 'days'
      });
      
      component.suggestScheduleTimes();
      
      expect(component.schedule.length).toBe(2);
    });

    it('should suggest schedule for three times daily medication', () => {
      component.medicationForm.patchValue({
        frequencyValue: 3,
        frequencyUnit: 'days'
      });
      
      component.suggestScheduleTimes();
      
      expect(component.schedule.length).toBe(3);
    });

    it('should not overwrite existing schedule', () => {
      component.addDose('10:00');
      
      component.medicationForm.patchValue({
        frequencyValue: 2,
        frequencyUnit: 'days'
      });
      
      component.suggestScheduleTimes();
      
      // Should keep existing dose
      expect(component.schedule.length).toBe(1);
      expect(component.schedule.at(0).get('time')?.value).toBe('10:00');
    });

    it('should suggest times for hourly medication', () => {
      component.medicationForm.patchValue({
        frequencyValue: 6,
        frequencyUnit: 'hours'
      });
      
      component.clearAndSuggestSchedule();
      
      expect(component.schedule.length).toBe(4); // 24/6 = 4 doses per day
    });

    it('should suggest times for every 4 hours', () => {
      component.medicationForm.patchValue({
        frequencyValue: 4,
        frequencyUnit: 'hours'
      });
      
      component.clearAndSuggestSchedule();
      
      expect(component.schedule.length).toBe(6); // 24/4 = 6 doses per day
    });
  });

  describe('Frequency Display', () => {
    it('should return empty string when frequency not set', () => {
      component.medicationForm.patchValue({
        frequencyValue: null,
        frequencyUnit: null
      });
      
      expect(component.getFrequencyDisplay()).toBe('');
    });

    it('should display frequency correctly', () => {
      translateServiceSpy.instant.and.returnValue('days');
      
      component.medicationForm.patchValue({
        frequencyValue: 2,
        frequencyUnit: 'days'
      });
      
      const display = component.getFrequencyDisplay();
      expect(display).toBe('2 days');
    });

    it('should translate frequency units', () => {
      component.medicationForm.patchValue({
        frequencyValue: 3,
        frequencyUnit: 'hours'
      });
      
      component.getFrequencyDisplay();
      
      expect(translateServiceSpy.instant).toHaveBeenCalledWith('COMMON.HOURS');
    });
  });

  describe('Medication Type Toggle', () => {
    it('should set medication type to continuous use', () => {
      component.setMedicationType(true);
      
      expect(component.medicationForm.get('isContinuousUse')?.value).toBe(true);
    });

    it('should set medication type to as needed', () => {
      component.setMedicationType(false);
      
      expect(component.medicationForm.get('isContinuousUse')?.value).toBe(false);
    });
  });

  describe('Stock Threshold Placeholder', () => {
    it('should suggest threshold for continuous use based on schedule', () => {
      component.medicationForm.patchValue({ isContinuousUse: true });
      component.addDose('08:00');
      component.addDose('20:00');
      
      translateServiceSpy.instant.and.returnValue('Suggest 14 units (7 days)');
      
      const placeholder = component.getStockThresholdPlaceholder();
      
      expect(translateServiceSpy.instant).toHaveBeenCalledWith(
        'MEDICATION_FORM.DEFAULT_THRESHOLD_CONTINUOUS',
        { days: 7, units: 14 }
      );
    });

    it('should suggest threshold for as-needed medication', () => {
      component.medicationForm.patchValue({ isContinuousUse: false });
      
      translateServiceSpy.instant.and.returnValue('Suggest 5 units');
      
      const placeholder = component.getStockThresholdPlaceholder();
      
      expect(translateServiceSpy.instant).toHaveBeenCalledWith(
        'MEDICATION_FORM.DEFAULT_THRESHOLD_AS_NEEDED',
        { units: 5 }
      );
    });
  });

  describe('Save Medication - Success', () => {
    beforeEach(() => {
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg',
        frequencyValue: 2,
        frequencyUnit: 'days',
        startDate: '2024-01-01',
        initialStock: 30,
        stockUnit: 'comprimidos'
      });
      component.schedule.clear(); // Clear any previous doses from other tests
      component.addDose('08:00');
    });

    it('should call addMedication when creating new medication', async () => {
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).toHaveBeenCalled();
    });

    it('should call updateMedication when editing existing medication', async () => {
      component.isEditMode = true;
      component['medId'] = 'med123';
      
      await component.saveMedication();
      
      expect(medicationServiceSpy.updateMedication).toHaveBeenCalledWith('med123', jasmine.any(Object));
    });

    it('should include all form data in medication object', async () => {
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.name).toBe('Aspirin');
      expect(medicationData.dosage).toBe('100mg');
      expect(medicationData.frequency).toBe('2 days');
      expect(medicationData.initialStock).toBe(30);
      expect(medicationData.stockUnit).toBe('comprimidos');
    });

    it('should set patientId from active patient', async () => {
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.patientId).toBe('user123');
    });

    it('should transform schedule to correct format', async () => {
      component.addDose('20:00');
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.schedule).toEqual([
        { time: '08:00', status: 'upcoming' },
        { time: '20:00', status: 'upcoming' }
      ]);
    });

    it('should show success toast after saving', async () => {
      await component.saveMedication();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success',
          duration: 2000
        })
      );
    });

    it('should navigate to medications list after saving', async () => {
      await component.saveMedication();
      
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/tabs/medications']);
    });

    it('should show different success message for edit vs create', async () => {
      component.isEditMode = true;
      component['medId'] = 'med123';
      
      await component.saveMedication();
      
      expect(translateServiceSpy.instant).toHaveBeenCalledWith('MEDICATION_FORM.SUCCESS_UPDATED');
    });

    it('should set currentStock to initialStock on creation', async () => {
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.currentStock).toBe(30);
    });

    it('should not overwrite currentStock on edit', async () => {
      component.isEditMode = true;
      component['medId'] = 'med123';
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.updateMedication.calls.mostRecent().args[1];
      expect(medicationData.currentStock).toBeUndefined();
    });
  });

  describe('Save Medication - Validation Errors', () => {
    it('should not save when form is invalid', async () => {
      // Form is invalid by default (missing required fields)
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).not.toHaveBeenCalled();
    });

    it('should show warning toast when form is invalid', async () => {
      await component.saveMedication();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'warning',
          duration: 2000
        })
      );
    });

    it('should show warning when no patient selected', async () => {
      Object.defineProperty(patientSelectorServiceSpy, 'activePatient', {
        value: signal(null),
        writable: true
      });
      
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg'
      });
      component.addDose('08:00');
      
      await component.saveMedication();
      
      expect(medicationServiceSpy.addMedication).not.toHaveBeenCalled();
      expect(translateServiceSpy.instant).toHaveBeenCalledWith('MEDICATION_FORM.NO_PATIENT_SELECTED');
    });

    it('should not navigate when form is invalid', async () => {
      await component.saveMedication();
      
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Save Medication - Error Handling', () => {
    beforeEach(() => {
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg',
        startDate: '2024-01-01'
      });
      component.addDose('08:00');
    });

    it('should handle save error', async () => {
      medicationServiceSpy.addMedication.and.returnValue(
        Promise.reject(new Error('Network error'))
      );
      
      await component.saveMedication();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'danger',
          duration: 3000
        })
      );
    });

    it('should show error toast on save failure', async () => {
      medicationServiceSpy.addMedication.and.returnValue(Promise.reject(new Error()));
      
      await component.saveMedication();
      
      expect(translateServiceSpy.instant).toHaveBeenCalledWith('MEDICATION_FORM.ERROR');
    });

    it('should not navigate on save error', async () => {
      medicationServiceSpy.addMedication.and.returnValue(Promise.reject(new Error()));
      
      await component.saveMedication();
      
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should handle update error in edit mode', async () => {
      component.isEditMode = true;
      component['medId'] = 'med123';
      medicationServiceSpy.updateMedication.and.returnValue(Promise.reject(new Error()));
      
      await component.saveMedication();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'danger'
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle medication with no schedule in edit mode', () => {
      const medicationNoSchedule = { ...mockMedication, schedule: [] };
      medicationServiceSpy.getMedicationById.and.returnValue(medicationNoSchedule);
      activatedRouteStub.snapshot.paramMap.get.and.returnValue('med123');
      
      component.ngOnInit();
      
      expect(component.schedule.length).toBe(0);
    });

    it('should handle medication with no notes', async () => {
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg',
        notes: ''
      });
      component.addDose('08:00');
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.notes).toBe('');
    });

    it('should handle medication with no end date', async () => {
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg',
        startDate: '2024-01-01',
        endDate: ''
      });
      component.addDose('08:00');
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.endDate).toBe(null); // Component converts empty string to null
    });

    it('should handle very high frequency values', () => {
      component.medicationForm.patchValue({
        frequencyValue: 100,
        frequencyUnit: 'days'
      });
      
      const display = component.getFrequencyDisplay();
      expect(display).toContain('100');
    });

    it('should handle zero initial stock', async () => {
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg',
        initialStock: 0
      });
      component.addDose('08:00');
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.initialStock).toBe(0);
    });

    it('should handle very long medication names', async () => {
      const longName = 'A'.repeat(200);
      component.medicationForm.patchValue({
        name: longName,
        dosage: '100mg'
      });
      component.addDose('08:00');
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.name).toBe(longName);
    });

    it('should handle special characters in medication name', async () => {
      component.medicationForm.patchValue({
        name: 'Aspirin®™ (100%)',
        dosage: '100mg'
      });
      component.addDose('08:00');
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.name).toBe('Aspirin®™ (100%)');
    });

    it('should handle multiple rapid schedule additions', () => {
      for (let i = 0; i < 10; i++) {
        component.addDose(`${i}:00`);
      }
      
      expect(component.schedule.length).toBe(10);
    });

    it('should handle removing all doses one by one', () => {
      component.addDose('08:00');
      component.addDose('14:00');
      component.addDose('20:00');
      
      component.removeDose(2);
      component.removeDose(1);
      component.removeDose(0);
      
      expect(component.schedule.length).toBe(0);
    });

    it('should handle null doctor information', async () => {
      component.medicationForm.patchValue({
        name: 'Aspirin',
        dosage: '100mg',
        doctorName: null,
        doctorCRM: null
      });
      component.addDose('08:00');
      
      await component.saveMedication();
      
      const medicationData = medicationServiceSpy.addMedication.calls.mostRecent().args[0];
      expect(medicationData.doctorName).toBeUndefined();
      expect(medicationData.doctorCRM).toBeUndefined();
    });
  });

  describe('Calculate Intervals Per Day', () => {
    it('should calculate intervals for minutes', () => {
      const intervals = component.calculateIntervalsPerDay(30, 'minutes');
      expect(intervals).toBe(48); // 1440 / 30
    });

    it('should calculate intervals for hours', () => {
      const intervals = component.calculateIntervalsPerDay(6, 'hours');
      expect(intervals).toBe(4); // 24 / 6
    });

    it('should return 0 for unsupported units', () => {
      const intervals = component.calculateIntervalsPerDay(1, 'days');
      expect(intervals).toBe(0);
    });

    it('should handle 1 hour interval', () => {
      const intervals = component.calculateIntervalsPerDay(1, 'hours');
      expect(intervals).toBe(24);
    });

    it('should handle very small minute intervals', () => {
      const intervals = component.calculateIntervalsPerDay(5, 'minutes');
      expect(intervals).toBe(288); // 1440 / 5
    });
  });
});
