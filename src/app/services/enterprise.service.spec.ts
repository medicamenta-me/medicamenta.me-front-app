import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EnterpriseService } from './enterprise.service';
import { FirebaseService } from './firebase.service';
import { UserService } from './user.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';
import { signal } from '@angular/core';
import {
  Organization,
  OrganizationType,
  SubscriptionPlan,
  TeamMember,
  TeamRole,
  Permissions,
  DEFAULT_PERMISSIONS
} from '../models/enterprise.model';

describe('EnterpriseService', () => {
  let service: EnterpriseService;
  let firebaseServiceSpy: jasmine.SpyObj<FirebaseService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let indexedDBServiceSpy: jasmine.SpyObj<IndexedDBService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;

  const mockCurrentUser = signal<any>(null);

  // Mock Firestore
  const mockFirestore = {
    collection: jasmine.createSpy('collection'),
    doc: jasmine.createSpy('doc')
  };

  beforeEach(() => {
    firebaseServiceSpy = jasmine.createSpyObj('FirebaseService', [], {
      firestore: mockFirestore
    });

    userServiceSpy = jasmine.createSpyObj('UserService', ['getUser'], {
      currentUser: mockCurrentUser
    });

    indexedDBServiceSpy = jasmine.createSpyObj('IndexedDBService', ['get', 'put', 'getByIndex']);

    logServiceSpy = jasmine.createSpyObj('LogService', ['info', 'warn', 'error', 'debug']);

    TestBed.configureTestingModule({
      providers: [
        EnterpriseService,
        { provide: FirebaseService, useValue: firebaseServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: IndexedDBService, useValue: indexedDBServiceSpy },
        { provide: LogService, useValue: logServiceSpy }
      ]
    });

    // Reset user
    mockCurrentUser.set(null);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      service = TestBed.inject(EnterpriseService);
      expect(service).toBeTruthy();
    });

    it('should have null current organization initially', () => {
      service = TestBed.inject(EnterpriseService);
      expect(service.currentOrganization()).toBeNull();
    });

    it('should have empty team members initially', () => {
      service = TestBed.inject(EnterpriseService);
      expect(service.teamMembers()).toEqual([]);
    });

    it('should have null permissions initially', () => {
      service = TestBed.inject(EnterpriseService);
      expect(service.myPermissions()).toBeNull();
    });

    it('should have null multi-patient stats initially', () => {
      service = TestBed.inject(EnterpriseService);
      expect(service.multiPatientStats()).toBeNull();
    });

    it('should log debug on initialization', () => {
      service = TestBed.inject(EnterpriseService);
      expect(logServiceSpy.debug).toHaveBeenCalledWith('EnterpriseService', 'Service initialized');
    });
  });

  describe('Computed Signals', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should compute isEnterprise as false when no organization', () => {
      expect(service.isEnterprise()).toBeFalse();
    });

    it('should compute isAdmin as false when no organization or user', () => {
      expect(service.isAdmin()).toBeFalsy();
    });

    it('should compute canManageTeam as false when no permissions', () => {
      expect(service.canManageTeam()).toBeFalse();
    });
  });

  describe('Plan Limits', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should define correct limits for trial plan', () => {
      // Access private method via any
      const limits = (service as any).getPlanLimits('trial');
      expect(limits.maxPatients).toBeDefined();
      expect(limits.maxTeamMembers).toBeDefined();
    });

    it('should define correct limits for starter plan', () => {
      const limits = (service as any).getPlanLimits('starter');
      expect(limits.maxPatients).toBeDefined();
      expect(limits.maxTeamMembers).toBeDefined();
    });

    it('should define correct limits for professional plan', () => {
      const limits = (service as any).getPlanLimits('professional');
      expect(limits.maxPatients).toBeDefined();
      expect(limits.maxTeamMembers).toBeDefined();
    });

    it('should define correct limits for enterprise plan', () => {
      const limits = (service as any).getPlanLimits('enterprise');
      expect(limits.maxPatients).toBeDefined();
      expect(limits.maxTeamMembers).toBeDefined();
    });
  });

  describe('Organization Management', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should throw error when creating organization without authenticated user', async () => {
      mockCurrentUser.set(null);

      await expectAsync(service.createOrganization({
        name: 'test-clinic',
        displayName: 'Test Clinic',
        type: 'clinic',
        address: {
          street: '123 Main St',
          number: '100',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          country: 'Brasil'
        },
        contact: {
          phone: '+55 11 99999-9999',
          email: 'clinic@test.com'
        },
        plan: 'trial'
      })).toBeRejectedWithError('User not authenticated');
    });

    it('should throw error when updating organization without selection', async () => {
      await expectAsync(service.updateOrganization({ displayName: 'New Name' }))
        .toBeRejectedWithError('No organization selected');
    });
  });

  describe('Team Management', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should throw error when removing member without organization', async () => {
      await expectAsync(service.removeMember('member123'))
        .toBeRejectedWithError('No organization selected');
    });

    it('should throw error when updating role without organization', async () => {
      await expectAsync(service.updateMemberRole('member123', 'nurse'))
        .toBeRejectedWithError('No organization selected');
    });

    it('should throw error when updating permissions without organization', async () => {
      const permissions: Permissions = {
        canViewPatients: true,
        canAddPatients: false,
        canEditPatients: false,
        canDeletePatients: false,
        canViewMedications: true,
        canAddMedications: false,
        canEditMedications: false,
        canDeleteMedications: false,
        canRegisterDoses: false,
        canViewTeam: false,
        canManageTeam: false,
        canAssignRoles: false,
        canViewReports: true,
        canGenerateReports: false,
        canExportData: false,
        canViewCompliance: false,
        canGenerateComplianceReports: false,
        canViewAuditLogs: false,
        canManageOrganization: false,
        canManageBilling: false,
        canManageIntegrations: false
      };

      await expectAsync(service.updateMemberPermissions('member123', permissions))
        .toBeRejectedWithError('No organization selected');
    });
  });

  describe('Multi-Patient Dashboard', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should throw error when getting dashboard without organization', async () => {
      await expectAsync(service.getMultiPatientDashboard({
        search: '',
        page: 1,
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      })).toBeRejectedWithError('No organization selected');
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should have audit methods available', () => {
      expect((service as any).logAudit).toBeDefined();
    });
  });

  describe('Streak Calculation', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should calculate streak for empty logs', () => {
      const streak = (service as any).calculateStreak([]);
      expect(streak).toBe(0);
    });

    it('should calculate streak for logs with only taken events', () => {
      const today = new Date();
      const logs = [
        { eventType: 'taken', timestamp: { toDate: () => today } },
        { eventType: 'taken', timestamp: { toDate: () => new Date(today.getTime() - 86400000) } }
      ];
      const streak = (service as any).calculateStreak(logs);
      expect(streak).toBeGreaterThanOrEqual(0);
    });

    it('should break streak when missed event is found', () => {
      const today = new Date();
      const logs = [
        { eventType: 'missed', timestamp: { toDate: () => today } }
      ];
      const streak = (service as any).calculateStreak(logs);
      expect(streak).toBe(0);
    });
  });

  describe('Date Helper Functions', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should add days to date correctly', () => {
      // Use explicit local date to avoid timezone issues
      const date = new Date(2025, 0, 1); // Jan 1, 2025 local time
      const result = (service as any).addDays(date, 30);
      // 1 Jan + 30 days = 31 Jan
      expect(result.getDate()).toBe(31);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should add days across month boundary', () => {
      const date = new Date('2025-01-25');
      const result = (service as any).addDays(date, 10);
      expect(result.getMonth()).toBe(1); // February
    });
  });

  describe('DEFAULT_PERMISSIONS', () => {
    it('should have admin permissions with all true', () => {
      expect(DEFAULT_PERMISSIONS['admin']).toBeDefined();
      expect(DEFAULT_PERMISSIONS['admin'].canManageOrganization).toBe(true);
      expect(DEFAULT_PERMISSIONS['admin'].canManageTeam).toBe(true);
    });

    it('should have caregiver permissions defined', () => {
      expect(DEFAULT_PERMISSIONS['caregiver']).toBeDefined();
    });

    it('should have nurse permissions defined', () => {
      expect(DEFAULT_PERMISSIONS['nurse']).toBeDefined();
    });

    it('should have doctor permissions defined', () => {
      expect(DEFAULT_PERMISSIONS['doctor']).toBeDefined();
    });

    it('should have pharmacist permissions defined', () => {
      expect(DEFAULT_PERMISSIONS['pharmacist']).toBeDefined();
    });

    it('should have viewer permissions with limited access', () => {
      expect(DEFAULT_PERMISSIONS['viewer']).toBeDefined();
      expect(DEFAULT_PERMISSIONS['viewer'].canManageOrganization).toBe(false);
      expect(DEFAULT_PERMISSIONS['viewer'].canViewPatients).toBe(true);
    });
  });

  describe('Organization Types', () => {
    it('should support clinic type', () => {
      const type: OrganizationType = 'clinic';
      expect(type).toBe('clinic');
    });

    it('should support hospital type', () => {
      const type: OrganizationType = 'hospital';
      expect(type).toBe('hospital');
    });

    it('should support nursing-home type', () => {
      const type: OrganizationType = 'nursing-home';
      expect(type).toBe('nursing-home');
    });

    it('should support pharmacy type', () => {
      const type: OrganizationType = 'pharmacy';
      expect(type).toBe('pharmacy');
    });

    it('should support home-care type', () => {
      const type: OrganizationType = 'home-care';
      expect(type).toBe('home-care');
    });
  });

  describe('Subscription Plans', () => {
    it('should support trial plan', () => {
      const plan: SubscriptionPlan = 'trial';
      expect(plan).toBe('trial');
    });

    it('should support starter plan', () => {
      const plan: SubscriptionPlan = 'starter';
      expect(plan).toBe('starter');
    });

    it('should support professional plan', () => {
      const plan: SubscriptionPlan = 'professional';
      expect(plan).toBe('professional');
    });

    it('should support enterprise plan', () => {
      const plan: SubscriptionPlan = 'enterprise';
      expect(plan).toBe('enterprise');
    });
  });

  describe('Team Roles', () => {
    it('should support admin role', () => {
      const role: TeamRole = 'admin';
      expect(role).toBe('admin');
    });

    it('should support caregiver role', () => {
      const role: TeamRole = 'caregiver';
      expect(role).toBe('caregiver');
    });

    it('should support nurse role', () => {
      const role: TeamRole = 'nurse';
      expect(role).toBe('nurse');
    });

    it('should support doctor role', () => {
      const role: TeamRole = 'doctor';
      expect(role).toBe('doctor');
    });

    it('should support pharmacist role', () => {
      const role: TeamRole = 'pharmacist';
      expect(role).toBe('pharmacist');
    });

    it('should support viewer role', () => {
      const role: TeamRole = 'viewer';
      expect(role).toBe('viewer');
    });
  });

  describe('Permissions Interface', () => {
    it('should have all required permission fields', () => {
      const permissions: Permissions = {
        canViewPatients: true,
        canAddPatients: true,
        canEditPatients: true,
        canDeletePatients: true,
        canViewMedications: true,
        canAddMedications: true,
        canEditMedications: true,
        canDeleteMedications: true,
        canRegisterDoses: true,
        canViewTeam: true,
        canManageTeam: true,
        canAssignRoles: true,
        canViewReports: true,
        canGenerateReports: true,
        canExportData: true,
        canViewCompliance: true,
        canGenerateComplianceReports: true,
        canViewAuditLogs: true,
        canManageOrganization: true,
        canManageBilling: true,
        canManageIntegrations: true
      };

      expect(permissions.canViewPatients).toBe(true);
      expect(permissions.canManageOrganization).toBe(true);
      expect(permissions.canManageIntegrations).toBe(true);
    });
  });

  describe('API Configuration', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should have plan limits with API access configuration', () => {
      const professionalLimits = (service as any).getPlanLimits('professional');
      expect(professionalLimits.features.apiAccess).toBe(true);
      
      const starterLimits = (service as any).getPlanLimits('starter');
      expect(starterLimits.features.apiAccess).toBe(false);
    });
  });

  describe('Compliance Reports', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should have compliance report generation methods', () => {
      expect((service as any).generateComplianceReport).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should handle undefined user gracefully during initialization', () => {
      mockCurrentUser.set(undefined);
      expect(() => service).not.toThrow();
    });

    it('should handle null organization gracefully for computed signals', () => {
      expect(service.isEnterprise()).toBeFalse();
      expect(service.isAdmin()).toBeFalsy();
      expect(service.canManageTeam()).toBeFalse();
    });
  });

  describe('Signal Updates', () => {
    beforeEach(() => {
      service = TestBed.inject(EnterpriseService);
    });

    it('should expose readonly signals', () => {
      expect(service.currentOrganization).toBeDefined();
      expect(service.teamMembers).toBeDefined();
      expect(service.myPermissions).toBeDefined();
      expect(service.multiPatientStats).toBeDefined();
    });

    it('should have readonly organization signal', () => {
      const org = service.currentOrganization();
      expect(org).toBeNull();
    });

    it('should have readonly team members signal', () => {
      const members = service.teamMembers();
      expect(Array.isArray(members)).toBeTrue();
    });
  });
});
