import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { PatientSelectorComponent } from './patient-selector.component';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { IonicModule } from '@ionic/angular';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<any> {
    return of({
      PATIENT_SELECTOR: {
        TITLE: 'Selecionar Paciente',
        DESCRIPTION: 'Escolha o paciente',
        YOU: 'Você',
        NO_PATIENTS: 'Nenhum paciente encontrado'
      }
    });
  }
}

describe('PatientSelectorComponent', () => {
  let component: PatientSelectorComponent;
  let fixture: ComponentFixture<PatientSelectorComponent>;
  let mockPatientSelectorService: {
    availablePatients: ReturnType<typeof signal>;
    activePatientId: ReturnType<typeof signal>;
    setActivePatient: jasmine.Spy;
  };

  const mockPatients = [
    {
      userId: 'user-001',
      name: 'João Silva Santos',
      email: 'joao@email.com',
      avatarUrl: 'https://example.com/avatar1.jpg',
      isSelf: true,
      relationship: undefined as string | undefined,
      canRegister: true
    },
    {
      userId: 'user-002',
      name: 'Maria Oliveira',
      email: 'maria@email.com',
      avatarUrl: 'https://example.com/avatar2.jpg',
      isSelf: false,
      relationship: 'Mãe',
      canRegister: true
    },
    {
      userId: 'user-003',
      name: 'Carlos Ferreira Lima',
      email: 'carlos@email.com',
      avatarUrl: 'https://example.com/avatar3.jpg',
      isSelf: false,
      relationship: 'Pai',
      canRegister: true
    }
  ];

  beforeEach(async () => {
    mockPatientSelectorService = {
      availablePatients: signal(mockPatients),
      activePatientId: signal('user-001'),
      setActivePatient: jasmine.createSpy('setActivePatient')
    };

    await TestBed.configureTestingModule({
      imports: [
        PatientSelectorComponent,
        FormsModule,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: PatientSelectorService, useValue: mockPatientSelectorService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with active patient id', () => {
      expect(component.selectedPatientId).toBe('user-001');
    });
  });

  describe('Available Patients', () => {
    it('should expose availablePatients from service', () => {
      expect(component.availablePatients()).toEqual(mockPatients);
    });

    it('should update when service patients change', () => {
      const newPatients = [mockPatients[0]];
      mockPatientSelectorService.availablePatients.set(newPatients);
      fixture.detectChanges();
      
      expect(component.availablePatients()).toEqual(newPatients);
    });
  });

  describe('Patient Selection', () => {
    it('should call setActivePatient when selection changes', () => {
      component.selectedPatientId = 'user-002';
      component.onPatientChange();
      
      expect(mockPatientSelectorService.setActivePatient).toHaveBeenCalledWith('user-002');
    });

    it('should not call setActivePatient when selectedPatientId is empty', () => {
      component.selectedPatientId = '';
      component.onPatientChange();
      
      expect(mockPatientSelectorService.setActivePatient).not.toHaveBeenCalled();
    });
  });

  describe('getShortName', () => {
    it('should return first and last name from full name', () => {
      expect(component.getShortName('João Silva Santos')).toBe('João Santos');
    });

    it('should return single name when only one provided', () => {
      expect(component.getShortName('João')).toBe('João');
    });

    it('should return empty string for empty input', () => {
      expect(component.getShortName('')).toBe('');
    });

    it('should return empty string for null/undefined input', () => {
      expect(component.getShortName(null as any)).toBe('');
      expect(component.getShortName(undefined as any)).toBe('');
    });

    it('should handle multiple spaces between names', () => {
      expect(component.getShortName('João  Silva  Santos')).toBe('João Santos');
    });

    it('should handle leading/trailing whitespace', () => {
      expect(component.getShortName('  João Silva Santos  ')).toBe('João Santos');
    });

    it('should handle two-part names correctly', () => {
      expect(component.getShortName('Maria Oliveira')).toBe('Maria Oliveira');
    });
  });

  describe('DOM Rendering', () => {
    it('should render patient selector container', () => {
      const container = fixture.nativeElement.querySelector('.patient-selector');
      expect(container).toBeTruthy();
    });

    it('should render title', () => {
      const title = fixture.nativeElement.querySelector('.selector-title');
      expect(title).toBeTruthy();
    });

    it('should render description', () => {
      const desc = fixture.nativeElement.querySelector('.selector-description');
      expect(desc).toBeTruthy();
    });

    it('should render patient items for each patient', () => {
      const items = fixture.nativeElement.querySelectorAll('.patient-item');
      expect(items.length).toBe(3);
    });

    it('should render patient avatar', () => {
      const avatars = fixture.nativeElement.querySelectorAll('ion-avatar img');
      expect(avatars.length).toBe(3);
      expect(avatars[0].getAttribute('src')).toBe('https://example.com/avatar1.jpg');
    });

    it('should render short name', () => {
      const names = fixture.nativeElement.querySelectorAll('.patient-item h3');
      expect(names[0].textContent).toBe('João Santos');
      expect(names[1].textContent).toBe('Maria Oliveira');
    });

    it('should render patient email', () => {
      const emails = fixture.nativeElement.querySelectorAll('.patient-email');
      expect(emails[0].textContent).toBe('joao@email.com');
    });

    it('should render relationship for non-self patients', () => {
      const relationships = fixture.nativeElement.querySelectorAll('.patient-relationship');
      expect(relationships.length).toBe(2); // Only Maria and Carlos
    });

    it('should render "You" note for self patient', () => {
      const notes = fixture.nativeElement.querySelectorAll('ion-note');
      expect(notes.length).toBe(1);
    });

    it('should apply selected class to selected patient', () => {
      component.selectedPatientId = 'user-001';
      fixture.detectChanges();
      
      const items = fixture.nativeElement.querySelectorAll('.patient-item');
      expect(items[0].classList.contains('selected')).toBeTrue();
    });

    it('should not render empty state when patients exist', () => {
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeNull();
    });
  });

  describe('Empty State', () => {
    beforeEach(() => {
      mockPatientSelectorService.availablePatients.set([]);
      fixture.detectChanges();
    });

    it('should render empty state when no patients', () => {
      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
    });

    it('should not render patient items when empty', () => {
      const items = fixture.nativeElement.querySelectorAll('.patient-item');
      expect(items.length).toBe(0);
    });
  });

  describe('Radio Group', () => {
    it('should render ion-radio-group', () => {
      const radioGroup = fixture.nativeElement.querySelector('ion-radio-group');
      expect(radioGroup).toBeTruthy();
    });

    it('should render ion-radio for each patient', () => {
      const radios = fixture.nativeElement.querySelectorAll('ion-radio');
      expect(radios.length).toBe(3);
    });

    it('should set correct value for each radio', () => {
      const radios = fixture.nativeElement.querySelectorAll('ion-radio');
      // ion-radio may use 'value' property instead of attribute
      const value0 = radios[0].getAttribute('value') || radios[0].value;
      const value1 = radios[1].getAttribute('value') || radios[1].value;
      expect(value0).toBe('user-001');
      expect(value1).toBe('user-002');
    });
  });

  describe('Accessibility', () => {
    it('should have alt text for avatars', () => {
      const avatars = fixture.nativeElement.querySelectorAll('ion-avatar img');
      expect(avatars[0].getAttribute('alt')).toBe('João Silva Santos');
    });
  });

  describe('Edge Cases', () => {
    it('should handle patient without relationship', () => {
      const patientWithoutRelationship = mockPatients[0];
      // relationship is undefined in mock data
      expect(patientWithoutRelationship.relationship).toBeUndefined();
      
      const items = fixture.nativeElement.querySelectorAll('.patient-item');
      const firstItemRelationship = items[0].querySelector('.patient-relationship');
      expect(firstItemRelationship).toBeNull();
    });

    it('should handle patient with long name', () => {
      mockPatientSelectorService.availablePatients.set([{
        userId: 'user-004',
        name: 'José Carlos Eduardo Fernandes da Silva',
        email: 'jose@email.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        isSelf: true,
        relationship: undefined,
        canRegister: true
      }]);
      fixture.detectChanges();
      
      const shortName = component.getShortName('José Carlos Eduardo Fernandes da Silva');
      expect(shortName).toBe('José Silva');
    });
  });
});
