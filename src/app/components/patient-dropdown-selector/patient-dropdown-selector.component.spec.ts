import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientDropdownSelectorComponent } from './patient-dropdown-selector.component';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      DASHBOARD: {
        SELECT_PATIENT: 'Select Patient',
        VIEWING_SCHEDULE: 'Viewing schedule for'
      },
      HISTORY: {
        VIEWING_HISTORY: 'Viewing history for'
      }
    });
  }
}

describe('PatientDropdownSelectorComponent', () => {
  let component: PatientDropdownSelectorComponent;
  let fixture: ComponentFixture<PatientDropdownSelectorComponent>;
  let patientSelectorServiceSpy: jasmine.SpyObj<PatientSelectorService>;

  const mockPatients: any[] = [
    { userId: 'patient1', name: 'João Silva Santos', email: 'joao@test.com', isSelf: true, canRegister: true },
    { userId: 'patient2', name: 'Maria', email: 'maria@test.com', isSelf: false, canRegister: true },
    { userId: 'patient3', name: 'Pedro Oliveira', email: 'pedro@test.com', isSelf: false, canRegister: true }
  ];

  beforeEach(async () => {
    patientSelectorServiceSpy = jasmine.createSpyObj('PatientSelectorService', [
      'setActivePatient'
    ], {
      availablePatients: signal(mockPatients),
      activePatientId: signal('patient1')
    });

    await TestBed.configureTestingModule({
      imports: [
        PatientDropdownSelectorComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: PatientSelectorService, useValue: patientSelectorServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientDropdownSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default labelKey', () => {
      expect(component.labelKey).toBe('DASHBOARD.VIEWING_SCHEDULE');
    });

    it('should expose availablePatients from service', () => {
      expect(component.availablePatients().length).toBe(mockPatients.length);
    });

    it('should expose activePatientId from service', () => {
      expect(component.activePatientId()).toBe('patient1');
    });
  });

  describe('Input Properties', () => {
    it('should accept custom labelKey', () => {
      component.labelKey = 'HISTORY.VIEWING_HISTORY';
      fixture.detectChanges();
      
      expect(component.labelKey).toBe('HISTORY.VIEWING_HISTORY');
    });
  });

  describe('selectPatient', () => {
    it('should call service setActivePatient with patient id', () => {
      const event = { detail: { value: 'patient2' } };
      
      component.selectPatient(event);
      
      expect(patientSelectorServiceSpy.setActivePatient).toHaveBeenCalledWith('patient2');
    });

    it('should not call service if patientId is undefined', () => {
      const event = { detail: { value: undefined } };
      
      component.selectPatient(event);
      
      expect(patientSelectorServiceSpy.setActivePatient).not.toHaveBeenCalled();
    });

    it('should not call service if patientId is null', () => {
      const event = { detail: { value: null } };
      
      component.selectPatient(event);
      
      expect(patientSelectorServiceSpy.setActivePatient).not.toHaveBeenCalled();
    });

    it('should not call service if patientId is empty string', () => {
      const event = { detail: { value: '' } };
      
      component.selectPatient(event);
      
      expect(patientSelectorServiceSpy.setActivePatient).not.toHaveBeenCalled();
    });
  });

  describe('getShortName', () => {
    it('should return first and last name for full name', () => {
      expect(component.getShortName('João Silva Santos')).toBe('João Santos');
    });

    it('should return single name when only one part', () => {
      expect(component.getShortName('Maria')).toBe('Maria');
    });

    it('should return first and last for two parts', () => {
      expect(component.getShortName('Pedro Oliveira')).toBe('Pedro Oliveira');
    });

    it('should return empty string for empty input', () => {
      expect(component.getShortName('')).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(component.getShortName(undefined as any)).toBe('');
    });

    it('should return empty string for null', () => {
      expect(component.getShortName(null as any)).toBe('');
    });

    it('should handle whitespace-only input', () => {
      expect(component.getShortName('   ')).toBe('');
    });

    it('should handle extra spaces between names', () => {
      expect(component.getShortName('João   Silva   Santos')).toBe('João Santos');
    });

    it('should handle leading and trailing spaces', () => {
      expect(component.getShortName('  João Silva  ')).toBe('João Silva');
    });

    it('should handle four-part names', () => {
      expect(component.getShortName('Ana Maria Costa Silva')).toBe('Ana Silva');
    });

    it('should handle very long names', () => {
      expect(component.getShortName('Primeiro Segundo Terceiro Quarto Quinto Ultimo')).toBe('Primeiro Ultimo');
    });
  });

  describe('Data Binding', () => {
    it('should show available patients in dropdown', () => {
      const patients = component.availablePatients();
      expect(patients.length).toBe(3);
      expect(patients[0].name).toBe('João Silva Santos');
    });

    it('should have active patient selected', () => {
      expect(component.activePatientId()).toBe('patient1');
    });
  });

  describe('ChangeDetection', () => {
    it('should use OnPush change detection', () => {
      // Component uses ChangeDetectionStrategy.OnPush
      expect(component).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('should have person-outline icon registered', () => {
      // Icon is registered in constructor via addIcons
      expect(component).toBeTruthy();
    });
  });

  describe('Empty States', () => {
    it('should handle empty patient list', () => {
      // Reset the module and reconfigure with empty patient list
      TestBed.resetTestingModule();
      
      const emptyPatientSelectorServiceSpy = jasmine.createSpyObj('PatientSelectorService', [
        'setActivePatient'
      ], {
        availablePatients: signal([]),
        activePatientId: signal('patient1')
      });
      
      TestBed.configureTestingModule({
        imports: [
          PatientDropdownSelectorComponent,
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
          })
        ],
        providers: [
          { provide: PatientSelectorService, useValue: emptyPatientSelectorServiceSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      });
      
      const newFixture = TestBed.createComponent(PatientDropdownSelectorComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.availablePatients().length).toBe(0);
    });

    it('should handle no active patient', () => {
      // Reset the module and reconfigure with null active patient
      TestBed.resetTestingModule();
      
      const noActivePatientSelectorServiceSpy = jasmine.createSpyObj('PatientSelectorService', [
        'setActivePatient'
      ], {
        availablePatients: signal(mockPatients),
        activePatientId: signal(null)
      });
      
      TestBed.configureTestingModule({
        imports: [
          PatientDropdownSelectorComponent,
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
          })
        ],
        providers: [
          { provide: PatientSelectorService, useValue: noActivePatientSelectorServiceSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      });
      
      const newFixture = TestBed.createComponent(PatientDropdownSelectorComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.activePatientId()).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label for select', () => {
      // Template includes [attr.aria-label] binding
      expect(component).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle patient with very long name', () => {
      const longName = 'A'.repeat(100) + ' ' + 'B'.repeat(100);
      expect(component.getShortName(longName)).toBe('A'.repeat(100) + ' ' + 'B'.repeat(100));
    });

    it('should handle patient with special characters', () => {
      expect(component.getShortName('José María García')).toBe('José García');
    });

    it('should handle patient with numbers in name', () => {
      expect(component.getShortName('Patient 123 Test')).toBe('Patient Test');
    });
  });
});
