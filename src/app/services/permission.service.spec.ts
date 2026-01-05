import { TestBed } from '@angular/core/testing';
import { PermissionService } from './permission.service';
import { AuthService } from './auth.service';
import { CareNetworkService } from './care-network.service';
import { PatientSelectorService } from './patient-selector.service';
import { FirebaseService } from './firebase.service';
import { CarePermissions } from '../models/user.model';

describe('PermissionService', () => {
  let service: PermissionService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let careNetworkServiceSpy: jasmine.SpyObj<CareNetworkService>;
  let patientSelectorServiceSpy: jasmine.SpyObj<PatientSelectorService>;
  let firebaseServiceSpy: jasmine.SpyObj<FirebaseService>;

  let mockCurrentUser: any;
  let mockActivePatientId: string;
  let mockICareFor: any[];
  let mockWhoCareForMe: any[];

  beforeEach(() => {
    mockCurrentUser = { uid: 'user1' };
    mockActivePatientId = 'user1';
    mockICareFor = [];
    mockWhoCareForMe = [];

    const currentUserSignal = jasmine.createSpy('currentUser').and.callFake(() => mockCurrentUser);
    const activePatientIdSignal = jasmine.createSpy('activePatientId').and.callFake(() => mockActivePatientId);
    const iCareForSignal = jasmine.createSpy('iCareFor').and.callFake(() => mockICareFor);
    const whoCareForMeSignal = jasmine.createSpy('whoCareForMe').and.callFake(() => mockWhoCareForMe);

    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: currentUserSignal
    });

    careNetworkServiceSpy = jasmine.createSpyObj('CareNetworkService', [], {
      iCareFor: iCareForSignal,
      whoCareForMe: whoCareForMeSignal
    });

    patientSelectorServiceSpy = jasmine.createSpyObj('PatientSelectorService', [], {
      activePatientId: activePatientIdSignal
    });

    firebaseServiceSpy = jasmine.createSpyObj('FirebaseService', [], {
      firestore: {}
    });

    TestBed.configureTestingModule({
      providers: [
        PermissionService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CareNetworkService, useValue: careNetworkServiceSpy },
        { provide: PatientSelectorService, useValue: patientSelectorServiceSpy },
        { provide: FirebaseService, useValue: firebaseServiceSpy }
      ]
    });

    service = TestBed.inject(PermissionService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have activePatientPermissions computed', () => {
      expect(service.activePatientPermissions).toBeDefined();
    });
  });

  describe('Active Patient Permissions', () => {
    it('should return full permissions for own profile', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'user1';
      
      const permissions = service.activePatientPermissions();
      expect(permissions?.view).toBeTrue();
      expect(permissions?.register).toBeTrue();
      expect(permissions?.administer).toBeTrue();
    });

    it('should return null when no user', () => {
      mockCurrentUser = null;
      
      const permissions = service.activePatientPermissions();
      expect(permissions).toBeNull();
    });

    it('should return null when no active patient', () => {
      mockActivePatientId = '';
      
      const permissions = service.activePatientPermissions();
      expect(permissions).toBeNull();
    });

    it('should check care network for other patients', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'patient1';
      mockICareFor = [
        { userId: 'patient1', permissions: { view: true, register: true, administer: false } }
      ];
      
      const permissions = service.activePatientPermissions();
      expect(permissions?.view).toBeDefined();
    });

    it('should return no access when patient not in care network', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'unknown-patient';
      mockICareFor = [];
      
      const permissions = service.activePatientPermissions();
      expect(permissions?.view).toBeFalse();
      expect(permissions?.register).toBeFalse();
      expect(permissions?.administer).toBeFalse();
    });
  });

  describe('Get Permissions For Patient', () => {
    it('should return full access for same user', () => {
      const perms = service.getPermissionsForPatient('user1', 'user1');
      expect(perms.view).toBeTrue();
      expect(perms.register).toBeTrue();
      expect(perms.administer).toBeTrue();
    });

    it('should check whoCareForMe when current user is patient', () => {
      mockCurrentUser = { uid: 'patient1' };
      mockWhoCareForMe = [
        { userId: 'carer1', permissions: { view: true, register: true, administer: true } }
      ];
      
      const perms = service.getPermissionsForPatient('carer1', 'patient1');
      expect(perms.view).toBeTrue();
      expect(perms.register).toBeTrue();
      expect(perms.administer).toBeTrue();
    });

    it('should return no access when carer not found in whoCareForMe', () => {
      mockCurrentUser = { uid: 'patient1' };
      mockWhoCareForMe = [];
      
      const perms = service.getPermissionsForPatient('unknown-carer', 'patient1');
      expect(perms.view).toBeFalse();
    });

    it('should check iCareFor when viewing as caregiver', () => {
      mockCurrentUser = { uid: 'carer1' };
      mockICareFor = [
        { userId: 'patient1' }
      ];
      
      const perms = service.getPermissionsForPatient('carer1', 'patient1');
      expect(perms.view).toBeTrue();
      expect(perms.register).toBeFalse();
      expect(perms.administer).toBeFalse();
    });

    it('should return no access when patient not in iCareFor', () => {
      mockCurrentUser = { uid: 'carer1' };
      mockICareFor = [];
      
      const perms = service.getPermissionsForPatient('carer1', 'unknown-patient');
      expect(perms.view).toBeFalse();
    });
  });

  describe('Can View', () => {
    it('should return true for own profile', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'user1';
      
      expect(service.canView()).toBeTrue();
    });

    it('should return false when no permissions', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'unknown';
      mockICareFor = [];
      
      expect(service.canView()).toBeFalse();
    });
  });

  describe('Can Register', () => {
    it('should return true for own profile', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'user1';
      
      expect(service.canRegister()).toBeTrue();
    });

    it('should require both view and register permissions', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'patient1';
      mockICareFor = [
        { userId: 'patient1' }
      ];
      
      // Default permissions don't include register
      expect(service.canRegister()).toBeFalse();
    });
  });

  describe('Can Administer', () => {
    it('should return true for own profile', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'user1';
      
      expect(service.canAdminister()).toBeTrue();
    });

    it('should require both view and administer permissions', () => {
      mockCurrentUser = { uid: 'user1' };
      mockActivePatientId = 'patient1';
      mockICareFor = [
        { userId: 'patient1' }
      ];
      
      // Default permissions don't include administer
      expect(service.canAdminister()).toBeFalse();
    });
  });

  describe('User Can View', () => {
    it('should return true for same user', () => {
      expect(service.userCanView('user1', 'user1')).toBeTrue();
    });

    it('should check permissions for different users', () => {
      mockCurrentUser = { uid: 'patient1' };
      mockWhoCareForMe = [
        { userId: 'carer1', permissions: { view: true, register: false, administer: false } }
      ];
      
      expect(service.userCanView('carer1', 'patient1')).toBeTrue();
    });
  });

  describe('User Can Register', () => {
    it('should return true for same user', () => {
      expect(service.userCanRegister('user1', 'user1')).toBeTrue();
    });

    it('should check both view and register', () => {
      mockCurrentUser = { uid: 'patient1' };
      mockWhoCareForMe = [
        { userId: 'carer1', permissions: { view: true, register: true, administer: false } }
      ];
      
      expect(service.userCanRegister('carer1', 'patient1')).toBeTrue();
    });
  });

  describe('User Can Administer', () => {
    it('should return true for same user', () => {
      expect(service.userCanAdminister('user1', 'user1')).toBeTrue();
    });

    it('should check both view and administer', () => {
      mockCurrentUser = { uid: 'patient1' };
      mockWhoCareForMe = [
        { userId: 'carer1', permissions: { view: true, register: false, administer: true } }
      ];
      
      expect(service.userCanAdminister('carer1', 'patient1')).toBeTrue();
    });
  });

  describe('Get Default Permissions', () => {
    it('should return default permissions with view true', () => {
      const defaults = service.getDefaultPermissions();
      expect(defaults.view).toBeTrue();
    });

    it('should return default permissions with register false', () => {
      const defaults = service.getDefaultPermissions();
      expect(defaults.register).toBeFalse();
    });

    it('should return default permissions with administer false', () => {
      const defaults = service.getDefaultPermissions();
      expect(defaults.administer).toBeFalse();
    });
  });

  describe('Validate Permissions', () => {
    it('should always set view to true', () => {
      const perms: CarePermissions = { view: false, register: true, administer: true };
      const validated = service.validatePermissions(perms);
      expect(validated.view).toBeTrue();
    });

    it('should keep register when view is true', () => {
      const perms: CarePermissions = { view: true, register: true, administer: false };
      const validated = service.validatePermissions(perms);
      expect(validated.register).toBeTrue();
    });

    it('should keep administer when view is true', () => {
      const perms: CarePermissions = { view: true, register: false, administer: true };
      const validated = service.validatePermissions(perms);
      expect(validated.administer).toBeTrue();
    });

    it('should revoke register when view is false', () => {
      const perms: CarePermissions = { view: false, register: true, administer: false };
      const validated = service.validatePermissions(perms);
      expect(validated.register).toBeFalse();
    });

    it('should revoke administer when view is false', () => {
      const perms: CarePermissions = { view: false, register: false, administer: true };
      const validated = service.validatePermissions(perms);
      expect(validated.administer).toBeFalse();
    });
  });

  describe('CarePermissions Interface', () => {
    it('should accept valid permissions', () => {
      const perms: CarePermissions = {
        view: true,
        register: true,
        administer: true
      };
      expect(perms).toBeDefined();
    });

    it('should handle all false permissions', () => {
      const perms: CarePermissions = {
        view: false,
        register: false,
        administer: false
      };
      expect(perms.view).toBeFalse();
    });
  });

  describe('Service Dependencies', () => {
    it('should inject AuthService', () => {
      expect((service as any).authService).toBeDefined();
    });

    it('should inject CareNetworkService', () => {
      expect((service as any).careNetworkService).toBeDefined();
    });

    it('should inject PatientSelectorService', () => {
      expect((service as any).patientSelectorService).toBeDefined();
    });

    it('should inject FirebaseService', () => {
      expect((service as any).firebaseService).toBeDefined();
    });
  });
});
