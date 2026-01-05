import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { SmartSuggestionsModalComponent } from './smart-suggestions-modal.component';
import { LogService } from '../../services/log.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { PatientSelectorService } from '../../services/patient-selector.service';
import { UserService } from '../../services/user.service';
import { MedicationService } from '../../services/medication.service';
import { SmartRemindersService } from '../../services/smart-reminders.service';

describe('SmartSuggestionsModalComponent', () => {
  let component: SmartSuggestionsModalComponent;
  let fixture: ComponentFixture<SmartSuggestionsModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;

  beforeEach(waitForAsync(() => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);

    // Create mocks for circular dependency chain
    const mockLogService = jasmine.createSpyObj('LogService', ['debug', 'info', 'warn', 'error', 'log']);
    const mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isAuthenticated']);
    mockAuthService.currentUser = jasmine.createSpy('currentUser').and.returnValue(null); // Signal
    const mockAnalyticsService = jasmine.createSpyObj('AnalyticsService', ['logEvent', 'setUserProperties']);
    const mockPatientSelectorService = jasmine.createSpyObj('PatientSelectorService', ['getSelectedPatientId']);
    mockPatientSelectorService.activePatientId = jasmine.createSpy('activePatientId').and.returnValue(null); // Signal
    const mockUserService = jasmine.createSpyObj('UserService', ['getCurrentUser', 'updateUser']);
    const mockMedicationService = jasmine.createSpyObj('MedicationService', ['getMedications']);
    const mockSmartRemindersService = jasmine.createSpyObj('SmartRemindersService', ['getSuggestions']);
    mockSmartRemindersService.pendingSuggestions = jasmine.createSpy('pendingSuggestions').and.returnValue([]); // Signal

    TestBed.configureTestingModule({
      imports: [
        SmartSuggestionsModalComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: LogService, useValue: mockLogService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: PatientSelectorService, useValue: mockPatientSelectorService },
        { provide: UserService, useValue: mockUserService },
        { provide: MedicationService, useValue: mockMedicationService },
        { provide: SmartRemindersService, useValue: mockSmartRemindersService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SmartSuggestionsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
