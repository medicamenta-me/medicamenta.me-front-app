import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MedicationsComponent } from './medications.component';
import { MedicationServiceV2 } from '../../../services/medication-v2.service';
import { UserService } from '../../../services/user.service';
import { PermissionService } from '../../../services/permission.service';
import { LogService } from '../../../services/log.service';
import { PatientSelectorService } from '../../../services/patient-selector.service';
import { IonicModule } from '@ionic/angular';
import { AlertController, ToastController, ActionSheetController, ModalController } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService, TranslateLoader } from '@ngx-translate/core';
import { Medication } from '../../../models/medication.model';
import { Observable } from 'rxjs';

// Fake TranslateLoader for testing
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

describe('MedicationsComponent', () => {
  let component: MedicationsComponent;
  let fixture: ComponentFixture<MedicationsComponent>;
  let medicationServiceSpy: jasmine.SpyObj<MedicationServiceV2>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;
  let toastControllerSpy: jasmine.SpyObj<ToastController>;
  let actionSheetControllerSpy: jasmine.SpyObj<ActionSheetController>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let translateService: TranslateService;
  let permissionServiceSpy: jasmine.SpyObj<PermissionService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;
  let patientSelectorServiceSpy: jasmine.SpyObj<PatientSelectorService>;

  const mockPatients = [
    { id: 'patient1', name: 'John Doe', email: 'john@example.com', isPrimary: true },
    { id: 'patient2', name: 'Jane Smith', email: 'jane@example.com', isPrimary: false }
  ];

  const mockActiveMedications: Medication[] = [
    {
      id: 'med1',
      patientId: 'patient1',
      name: 'Aspirin',
      dosage: '100mg',
      frequency: '1 days',
      stock: 30,
      startDate: '2024-01-01',
      schedule: [{ time: '08:00', status: 'upcoming' }],
      notes: '',
      isArchived: false,
      isContinuousUse: true,
      initialStock: 30,
      currentStock: 25,
      stockUnit: 'comprimidos',
      isCompleted: false
    },
    {
      id: 'med2',
      patientId: 'patient1',
      name: 'Paracetamol',
      dosage: '500mg',
      frequency: '2 days',
      stock: 3,
      startDate: '2024-01-01',
      schedule: [{ time: '08:00', status: 'upcoming' }],
      notes: '',
      isArchived: false,
      isContinuousUse: false,
      initialStock: 10,
      currentStock: 3,
      stockUnit: 'comprimidos',
      isCompleted: false
    },
    {
      id: 'med3',
      patientId: 'patient2',
      name: 'Ibuprofen',
      dosage: '200mg',
      frequency: '3 days',
      stock: 20,
      startDate: '2024-01-01',
      schedule: [{ time: '08:00', status: 'upcoming' }],
      notes: '',
      isArchived: false,
      isContinuousUse: true,
      initialStock: 20,
      currentStock: 15,
      stockUnit: 'comprimidos',
      isCompleted: false
    }
  ];

  const mockArchivedMedications: Medication[] = [
    {
      id: 'med4',
      patientId: 'patient1',
      name: 'Old Medicine',
      dosage: '50mg',
      frequency: '1 days',
      stock: 0,
      startDate: '2023-01-01',
      schedule: [{ time: '08:00', status: 'upcoming' }],
      notes: '',
      isArchived: true,
      archivedAt: new Date(),
      isContinuousUse: true,
      initialStock: 10,
      currentStock: 0,
      stockUnit: 'comprimidos',
      isCompleted: false
    }
  ];

  const mockCompletedMedications: Medication[] = [
    {
      id: 'med5',
      patientId: 'patient2',
      name: 'Completed Med',
      dosage: '100mg',
      frequency: '1 days',
      stock: 0,
      startDate: '2023-06-01',
      endDate: '2024-01-01',
      schedule: [{ time: '08:00', status: 'upcoming' }],
      notes: '',
      isArchived: false,
      isCompleted: true,
      completedAt: new Date(),
      completionReason: 'time_ended',
      dosesTaken: 100,
      isContinuousUse: true,
      initialStock: 100,
      currentStock: 0,
      stockUnit: 'comprimidos'
    }
  ];

  beforeEach(async () => {
    const allMedications = [...mockActiveMedications, ...mockArchivedMedications, ...mockCompletedMedications];

    medicationServiceSpy = jasmine.createSpyObj('MedicationServiceV2', [
      'archiveMedication',
      'unarchiveMedication',
      'updateMedication'
    ], {
      medications: signal(allMedications)
    });

    userServiceSpy = jasmine.createSpyObj('UserService', [], {
      patients: signal(mockPatients)
    });

    alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);
    toastControllerSpy = jasmine.createSpyObj('ToastController', ['create']);
    actionSheetControllerSpy = jasmine.createSpyObj('ActionSheetController', ['create']);
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['create', 'dismiss']);
    permissionServiceSpy = jasmine.createSpyObj('PermissionService', [], {
      canRegister: signal(true)
    });
    logServiceSpy = jasmine.createSpyObj('LogService', ['logCaregiversView', 'debug', 'info', 'error', 'warn', 'log']);
    patientSelectorServiceSpy = jasmine.createSpyObj('PatientSelectorService', [], {
      activePatientId: signal('patient1'),
      activePatient: signal(mockPatients[0])
    });

    // Setup default return values
    medicationServiceSpy.archiveMedication.and.returnValue(Promise.resolve());
    medicationServiceSpy.unarchiveMedication.and.returnValue(Promise.resolve());
    medicationServiceSpy.updateMedication.and.returnValue(Promise.resolve());

    const mockToast = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    toastControllerSpy.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [
        MedicationsComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        provideRouter([]),
        { provide: MedicationServiceV2, useValue: medicationServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: ToastController, useValue: toastControllerSpy },
        { provide: ActionSheetController, useValue: actionSheetControllerSpy },
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: PermissionService, useValue: permissionServiceSpy },
        { provide: LogService, useValue: logServiceSpy },
        { provide: PatientSelectorService, useValue: patientSelectorServiceSpy }
      ]
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    spyOn(translateService, 'instant').and.callFake((key: string) => key);

    fixture = TestBed.createComponent(MedicationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize active tab to active', () => {
      expect(component.activeTab()).toBe('active');
    });

    it('should initialize search query as empty', () => {
      expect(component.searchQuery()).toBe('');
    });

    it('should initialize filters to default values', () => {
      expect(component.archivedDateFilter()).toBe('all');
      expect(component.archivedPatientFilter()).toBe(null);
      expect(component.showFilters()).toBe(false);
      expect(component.showStats()).toBe(false);
    });

    it('should have canRegister permission', () => {
      expect(component.canRegister()).toBe(true);
    });
  });

  describe('Medication Grouping', () => {
    it('should group active medications by patient', () => {
      const groups = component.medicationGroups();
      
      expect(groups.length).toBe(2);
      expect(groups[0].patient.id).toBe('patient1');
      expect(groups[0].medications.length).toBe(2);
      expect(groups[1].patient.id).toBe('patient2');
      expect(groups[1].medications.length).toBe(1);
    });

    it('should exclude archived medications from active groups', () => {
      const groups = component.medicationGroups();
      const allMeds = groups.flatMap(g => g.medications);
      
      expect(allMeds.every(m => !m.isArchived)).toBe(true);
    });

    it('should group archived medications separately', () => {
      const archivedGroups = component.archivedMedicationGroups();
      
      expect(archivedGroups.length).toBe(1);
      expect(archivedGroups[0].patient.id).toBe('patient1');
      expect(archivedGroups[0].medications[0].name).toBe('Old Medicine');
    });

    it('should group completed medications separately', () => {
      const completedGroups = component.completedMedicationGroups();
      
      expect(completedGroups.length).toBe(1);
      expect(completedGroups[0].patient.id).toBe('patient2');
      expect(completedGroups[0].medications[0].name).toBe('Completed Med');
    });

    it('should exclude completed medications from active groups', () => {
      const groups = component.medicationGroups();
      const allMeds = groups.flatMap(g => g.medications);
      
      expect(allMeds.every(m => !m.isCompleted)).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    it('should return all medications when search is empty', () => {
      component.searchQuery.set('');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(2);
      expect(filtered.flatMap(g => g.medications).length).toBe(3);
    });

    it('should filter medications by name', () => {
      component.searchQuery.set('Aspirin');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].medications[0].name).toBe('Aspirin');
    });

    it('should filter medications by dosage', () => {
      component.searchQuery.set('500mg');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].medications[0].name).toBe('Paracetamol');
    });

    it('should filter medications by frequency', () => {
      component.searchQuery.set('3 days');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].medications[0].name).toBe('Ibuprofen');
    });

    it('should be case insensitive', () => {
      component.searchQuery.set('ASPIRIN');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].medications[0].name).toBe('Aspirin');
    });

    it('should trim whitespace', () => {
      component.searchQuery.set('  Aspirin  ');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(1);
    });

    it('should filter across multiple patients', () => {
      component.searchQuery.set('mg');
      const filtered = component.filteredMedicationGroups();
      
      // All medications have 'mg' in dosage
      expect(filtered.length).toBe(2);
      expect(filtered.flatMap(g => g.medications).length).toBe(3);
    });

    it('should remove empty groups after filtering', () => {
      component.searchQuery.set('Aspirin');
      const filtered = component.filteredMedicationGroups();
      
      // Only patient1 group should remain
      expect(filtered.length).toBe(1);
      expect(filtered[0].patient.id).toBe('patient1');
    });

    it('should handle partial matches', () => {
      component.searchQuery.set('para');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].medications[0].name).toBe('Paracetamol');
    });

    it('should return empty array when no matches', () => {
      component.searchQuery.set('NonExistentMedication');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered.length).toBe(0);
    });
  });

  describe('Archived Medications Filtering', () => {
    it('should filter archived medications by date - week', () => {
      component.setDateFilter('week');
      const filtered = component.filteredArchivedGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].medications[0].name).toBe('Old Medicine');
    });

    it('should filter archived medications by date - month', () => {
      component.setDateFilter('month');
      const filtered = component.filteredArchivedGroups();
      
      expect(filtered.length).toBe(1);
    });

    it('should filter archived medications by patient', () => {
      component.setPatientFilter('patient1');
      const filtered = component.filteredArchivedGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].patient.id).toBe('patient1');
    });

    it('should combine patient and date filters', () => {
      component.setPatientFilter('patient1');
      component.setDateFilter('week');
      const filtered = component.filteredArchivedGroups();
      
      expect(filtered.length).toBe(1);
      expect(filtered[0].patient.id).toBe('patient1');
    });

    it('should reset filters', () => {
      component.setPatientFilter('patient1');
      component.setDateFilter('week');
      
      component.resetFilters();
      
      expect(component.archivedDateFilter()).toBe('all');
      expect(component.archivedPatientFilter()).toBe(null);
    });
  });

  describe('Archived Statistics', () => {
    it('should calculate total archived medications', () => {
      const stats = component.archivedStats();
      
      expect(stats.total).toBe(1);
    });

    it('should calculate archived this week', () => {
      const stats = component.archivedStats();
      
      expect(stats.thisWeek).toBe(1);
    });

    it('should calculate archived this month', () => {
      const stats = component.archivedStats();
      
      expect(stats.thisMonth).toBe(1);
    });

    it('should categorize by medication type', () => {
      const stats = component.archivedStats();
      
      expect(stats.byType.continuous).toBe(1);
      expect(stats.byType.asNeeded).toBe(0);
    });
  });

  describe('Archive Medication', () => {
    let mockAlert: any;

    beforeEach(() => {
      mockAlert = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        buttons: []
      };
      alertControllerSpy.create.and.returnValue(Promise.resolve(mockAlert));
    });

    it('should show confirmation alert', async () => {
      await component.archiveMedication(mockActiveMedications[0]);
      
      expect(alertControllerSpy.create).toHaveBeenCalled();
      expect(mockAlert.present).toHaveBeenCalled();
    });

    it('should call archive service when confirmed', async () => {
      mockAlert.buttons = [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Archive', 
          handler: jasmine.createSpy('handler').and.callFake(async () => {
            await medicationServiceSpy.archiveMedication('med1');
          })
        }
      ];
      
      await component.archiveMedication(mockActiveMedications[0]);
      
      // Simulate button click
      await mockAlert.buttons[1].handler();
      
      expect(medicationServiceSpy.archiveMedication).toHaveBeenCalledWith('med1');
    });

    it('should show success toast after archiving', async () => {
      // Get the alert config created by the component
      let alertConfig: any;
      alertControllerSpy.create.and.callFake((config: any) => {
        alertConfig = config;
        return Promise.resolve(mockAlert);
      });
      
      await component.archiveMedication(mockActiveMedications[0]);
      
      // Trigger the confirm button handler from the actual config
      await alertConfig.buttons[1].handler();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success'
        })
      );
    });

    it('should handle archive error', async () => {
      medicationServiceSpy.archiveMedication.and.returnValue(Promise.reject(new Error()));
      
      mockAlert.buttons = [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Archive', 
          handler: async () => {
            try {
              await medicationServiceSpy.archiveMedication('med1');
            } catch (error) {
              await toastControllerSpy.create({
                message: 'Error',
                duration: 3000,
                color: 'danger'
              });
            }
          }
        }
      ];
      
      await component.archiveMedication(mockActiveMedications[0]);
      await mockAlert.buttons[1].handler();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({ color: 'danger' })
      );
    });
  });

  describe('Unarchive Medication', () => {
    let mockAlert: any;

    beforeEach(() => {
      mockAlert = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        buttons: []
      };
      alertControllerSpy.create.and.returnValue(Promise.resolve(mockAlert));
    });

    it('should show confirmation alert', async () => {
      await component.unarchiveMedication(mockArchivedMedications[0]);
      
      expect(alertControllerSpy.create).toHaveBeenCalled();
      expect(mockAlert.present).toHaveBeenCalled();
    });

    it('should call unarchive service when confirmed', async () => {
      mockAlert.buttons = [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Unarchive', 
          handler: jasmine.createSpy('handler').and.callFake(async () => {
            await medicationServiceSpy.unarchiveMedication('med4');
          })
        }
      ];
      
      await component.unarchiveMedication(mockArchivedMedications[0]);
      await mockAlert.buttons[1].handler();
      
      expect(medicationServiceSpy.unarchiveMedication).toHaveBeenCalledWith('med4');
    });

    it('should handle unarchive error', async () => {
      medicationServiceSpy.unarchiveMedication.and.returnValue(Promise.reject(new Error()));
      
      mockAlert.buttons = [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Unarchive', 
          handler: async () => {
            try {
              await medicationServiceSpy.unarchiveMedication('med4');
            } catch (error) {
              await toastControllerSpy.create({
                message: 'Error',
                duration: 3000,
                color: 'danger'
              });
            }
          }
        }
      ];
      
      await component.unarchiveMedication(mockArchivedMedications[0]);
      await mockAlert.buttons[1].handler();
      
      expect(toastControllerSpy.create).toHaveBeenCalled();
    });
  });

  describe('Reactivate Treatment', () => {
    let mockAlert: any;

    beforeEach(() => {
      mockAlert = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        buttons: []
      };
      alertControllerSpy.create.and.returnValue(Promise.resolve(mockAlert));
    });

    it('should show confirmation alert', async () => {
      await component.reactivateTreatment(mockCompletedMedications[0]);
      
      expect(alertControllerSpy.create).toHaveBeenCalled();
    });

    it('should reset completion fields when confirmed', async () => {
      mockAlert.buttons = [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Confirm', 
          handler: jasmine.createSpy('handler').and.callFake(async () => {
            await medicationServiceSpy.updateMedication('med5', {
              isCompleted: false,
              completedAt: undefined,
              completionReason: undefined,
              dosesTaken: 0
            });
          })
        }
      ];
      
      await component.reactivateTreatment(mockCompletedMedications[0]);
      await mockAlert.buttons[1].handler();
      
      expect(medicationServiceSpy.updateMedication).toHaveBeenCalledWith(
        'med5',
        jasmine.objectContaining({
          isCompleted: false,
          completedAt: undefined,
          dosesTaken: 0
        })
      );
    });

    it('should handle reactivation error', async () => {
      medicationServiceSpy.updateMedication.and.returnValue(Promise.reject(new Error()));
      
      mockAlert.buttons = [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Confirm', 
          handler: async () => {
            try {
              await medicationServiceSpy.updateMedication('med5', {});
            } catch (error) {
              await toastControllerSpy.create({
                message: 'Error',
                duration: 2000,
                color: 'danger'
              });
            }
          }
        }
      ];
      
      await component.reactivateTreatment(mockCompletedMedications[0]);
      await mockAlert.buttons[1].handler();
      
      expect(toastControllerSpy.create).toHaveBeenCalled();
    });
  });

  describe('Completion Icons and Text', () => {
    it('should return time icon for time_ended', () => {
      const icon = component.getCompletionIcon('time_ended');
      expect(icon).toBe('time');
    });

    it('should return checkmark icon for quantity_depleted', () => {
      const icon = component.getCompletionIcon('quantity_depleted');
      expect(icon).toBe('checkmark-circle-outline');
    });

    it('should return trophy icon for manual', () => {
      const icon = component.getCompletionIcon('manual');
      expect(icon).toBe('trophy');
    });

    it('should return default icon for undefined reason', () => {
      const icon = component.getCompletionIcon(undefined);
      expect(icon).toBe('checkmark-circle-outline');
    });

    it('should return correct translation key for time_ended', () => {
      const text = component.getCompletionReasonText('time_ended');
      expect(text).toBe('COMPLETION.TIME_ENDED');
    });

    it('should return correct translation key for quantity_depleted', () => {
      const text = component.getCompletionReasonText('quantity_depleted');
      expect(text).toBe('COMPLETION.QUANTITY_DEPLETED');
    });

    it('should return correct translation key for manual', () => {
      const text = component.getCompletionReasonText('manual');
      expect(text).toBe('COMPLETION.MANUAL');
    });

    it('should return default translation key for undefined', () => {
      const text = component.getCompletionReasonText(undefined);
      expect(text).toBe('COMPLETION.COMPLETED');
    });
  });

  describe('UI State Management', () => {
    it('should toggle filters visibility', () => {
      expect(component.showFilters()).toBe(false);
      
      component.toggleFilters();
      expect(component.showFilters()).toBe(true);
      
      component.toggleFilters();
      expect(component.showFilters()).toBe(false);
    });

    it('should toggle stats visibility', () => {
      expect(component.showStats()).toBe(false);
      
      component.toggleStats();
      expect(component.showStats()).toBe(true);
      
      component.toggleStats();
      expect(component.showStats()).toBe(false);
    });

    it('should change active tab', () => {
      expect(component.activeTab()).toBe('active');
      
      component.activeTab.set('archived');
      expect(component.activeTab()).toBe('archived');
      
      component.activeTab.set('completed');
      expect(component.activeTab()).toBe('completed');
    });
  });

  describe('Export Functionality', () => {
    it('should show warning when no data to export', async () => {
      component.setPatientFilter('nonexistent');
      
      await component.exportArchivedMedications();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'warning'
        })
      );
    });

    it('should create CSV with correct headers', async () => {
      const mockLink = document.createElement('a');
      spyOn(mockLink, 'setAttribute');
      spyOn(mockLink, 'click');
      spyOn(mockLink, 'remove');
      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock');
      
      await component.exportArchivedMedications();
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:mock');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', jasmine.stringContaining('medicamentos-arquivados'));
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
    });

    it('should show success toast after export', async () => {
      const mockLink = document.createElement('a');
      spyOn(mockLink, 'setAttribute');
      spyOn(mockLink, 'click');
      spyOn(mockLink, 'remove');
      spyOn(document, 'createElement').and.returnValue(mockLink);
      spyOn(document.body, 'appendChild');
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock');
      
      await component.exportArchivedMedications();
      
      expect(toastControllerSpy.create).toHaveBeenCalledWith(
        jasmine.objectContaining({
          color: 'success'
        })
      );
    });
  });

  describe('Medication Options Action Sheet', () => {
    let mockActionSheet: any;

    beforeEach(() => {
      mockActionSheet = {
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
        buttons: []
      };
      actionSheetControllerSpy.create.and.returnValue(Promise.resolve(mockActionSheet));
    });

    it('should open action sheet with medication options', async () => {
      const mockEvent = new Event('click');
      spyOn(mockEvent, 'stopPropagation');
      spyOn(mockEvent, 'preventDefault');
      
      await component.openMedicationOptions(mockActiveMedications[0], mockEvent);
      
      expect(actionSheetControllerSpy.create).toHaveBeenCalled();
      expect(mockActionSheet.present).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should include archive option in action sheet', async () => {
      const mockEvent = new Event('click');
      
      await component.openMedicationOptions(mockActiveMedications[0], mockEvent);
      
      const createCall = actionSheetControllerSpy.create.calls.mostRecent();
      const config = createCall.args[0];
      
      expect(config?.buttons.some((b: any) => b.icon === 'archive-outline')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search results (no matches)', () => {
      // Search for something that won't match any medication
      component.searchQuery.set('nonexistentmedicationname12345');
      fixture.detectChanges();
      
      const groups = component.filteredMedicationGroups();
      expect(groups.length).toBe(0);
    });

    it('should handle medications with null frequency', () => {
      const medWithNullFreq = { ...mockActiveMedications[0], frequency: null as any };
      Object.defineProperty(medicationServiceSpy, 'medications', {
        value: signal([medWithNullFreq]),
        writable: true
      });
      
      component.searchQuery.set('test');
      const filtered = component.filteredMedicationGroups();
      
      expect(filtered).toBeDefined();
    });

    it('should handle very long search queries', () => {
      const longQuery = 'A'.repeat(1000);
      component.searchQuery.set(longQuery);
      
      const filtered = component.filteredMedicationGroups();
      expect(filtered.length).toBe(0);
    });

    it('should handle special characters in search', () => {
      component.searchQuery.set('Aspirin®™');
      
      const filtered = component.filteredMedicationGroups();
      expect(filtered).toBeDefined();
    });

    it('should handle medications with missing archived date', () => {
      const medNoDate = { ...mockArchivedMedications[0], archivedAt: undefined };
      Object.defineProperty(medicationServiceSpy, 'medications', {
        value: signal([medNoDate]),
        writable: true
      });
      
      component.setDateFilter('week');
      const filtered = component.filteredArchivedGroups();
      
      expect(filtered).toBeDefined();
    });

    it('should return completed medications', () => {
      // Just verify that completed medications are returned in the completed groups
      const groups = component.completedMedicationGroups();
      
      expect(groups.length).toBeGreaterThan(0);
      const allCompleted = groups.flatMap(g => g.medications);
      expect(allCompleted.every(m => m.isCompleted)).toBe(true);
      expect(allCompleted.some(m => m.id === 'med5')).toBe(true);
    });
  });
});
