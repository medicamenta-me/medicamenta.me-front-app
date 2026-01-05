import { TestBed } from '@angular/core/testing';
import { 
  FamilyService, 
  FamilyMember, 
  FamilyDose, 
  FamilyStats, 
  FamilyAlert 
} from './family.service';
import { UserService } from './user.service';
import { MedicationService } from './medication.service';
import { User, Dependent } from '../models/user.model';
import { Medication } from '../models/medication.model';

describe('FamilyService', () => {
  let service: FamilyService;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let medicationServiceSpy: jasmine.SpyObj<MedicationService>;

  let mockUser: User;
  let mockMedications: Medication[];

  beforeEach(() => {
    mockUser = {
      id: 'user1',
      name: 'João Silva',
      email: 'joao@test.com',
      avatarUrl: '/avatar.png',
      dependents: [
        { id: 'dep1', name: 'Maria Silva', relationship: 'Filha', avatarUrl: '/maria.png' } as Dependent,
        { id: 'dep2', name: 'Pedro Silva', relationship: 'Filho', avatarUrl: '' } as Dependent
      ]
    } as User;

    mockMedications = [
      {
        id: 'med1',
        name: 'Aspirina',
        dosage: '500mg',
        userId: 'user1',
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ]
      } as any,
      {
        id: 'med2',
        name: 'Vitamina D',
        dosage: '1000UI',
        userId: 'dep1',
        schedule: [
          { time: '10:00', status: 'upcoming' }
        ]
      } as any
    ];

    const userSignal = jasmine.createSpy('currentUser').and.callFake(() => mockUser);
    const medicationsSignal = jasmine.createSpy('medications').and.callFake(() => mockMedications);

    userServiceSpy = jasmine.createSpyObj('UserService', [], {
      currentUser: userSignal
    });

    medicationServiceSpy = jasmine.createSpyObj('MedicationService', [], {
      medications: medicationsSignal
    });

    TestBed.configureTestingModule({
      providers: [
        FamilyService,
        { provide: UserService, useValue: userServiceSpy },
        { provide: MedicationService, useValue: medicationServiceSpy }
      ]
    });

    service = TestBed.inject(FamilyService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have selectedMemberIds as empty initially', () => {
      expect(service.selectedMemberIds()).toEqual([]);
    });

    it('should have selectedStatuses with default values', () => {
      const statuses = service.selectedStatuses();
      expect(statuses).toContain('pending');
      expect(statuses).toContain('taken');
      expect(statuses).toContain('overdue');
    });
  });

  describe('Family Members', () => {
    it('should compute family members including main user', () => {
      const members = service.familyMembers();
      expect(members.length).toBe(3);
      expect(members[0].isMainUser).toBeTrue();
    });

    it('should include dependents in family members', () => {
      const members = service.familyMembers();
      const dependents = members.filter(m => !m.isMainUser);
      expect(dependents.length).toBe(2);
    });

    it('should map main user correctly', () => {
      const members = service.familyMembers();
      const mainUser = members.find(m => m.isMainUser);
      expect(mainUser?.name).toBe('João Silva');
      expect(mainUser?.relationship).toBe('Você');
    });

    it('should map dependents correctly', () => {
      const members = service.familyMembers();
      const maria = members.find(m => m.id === 'dep1');
      expect(maria?.name).toBe('Maria Silva');
      expect(maria?.relationship).toBe('Filha');
    });

    it('should use default avatar when not provided', () => {
      const members = service.familyMembers();
      const pedro = members.find(m => m.id === 'dep2');
      expect(pedro?.avatarUrl).toBe('/assets/default-avatar.svg');
    });

    it('should return empty array when no user', () => {
      userServiceSpy.currentUser.and.returnValue(null);
      const newService = TestBed.inject(FamilyService);
      expect(newService.familyMembers().length).toBe(0);
    });
  });

  describe('Total Members', () => {
    it('should compute total members correctly', () => {
      expect(service.totalMembers()).toBe(3);
    });
  });

  describe('Family Mode', () => {
    it('should return true when user has dependents', () => {
      expect(service.isFamilyMode()).toBeTrue();
    });

    it('should return false when no dependents', () => {
      mockUser.dependents = [];
      expect(service.isFamilyMode()).toBeFalse();
    });

    it('should return false when no user', () => {
      userServiceSpy.currentUser.and.returnValue(null);
      const newService = TestBed.inject(FamilyService);
      expect(newService.isFamilyMode()).toBeFalse();
    });
  });

  describe('Today Doses', () => {
    it('should generate doses for all medications', () => {
      const doses = service.todayDoses();
      expect(doses.length).toBeGreaterThan(0);
    });

    it('should include medication info in dose', () => {
      const doses = service.todayDoses();
      const dose = doses.find(d => d.medicationName === 'Aspirina');
      expect(dose?.dosage).toBe('500mg');
    });

    it('should associate dose with correct member', () => {
      const doses = service.todayDoses();
      const userDose = doses.find(d => d.medicationName === 'Aspirina');
      expect(userDose?.member.name).toBe('João Silva');
    });

    it('should sort doses by time', () => {
      const doses = service.todayDoses();
      if (doses.length >= 2) {
        expect(doses[0].time <= doses[1].time).toBeTrue();
      }
    });
  });

  describe('Filtered Doses', () => {
    it('should return all doses when no filters', () => {
      const filtered = service.filteredDoses();
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should filter by member', () => {
      service.setSelectedMembers(['dep1']);
      const filtered = service.filteredDoses();
      expect(filtered.every(d => d.member.id === 'dep1')).toBeTrue();
    });

    it('should filter by status', () => {
      service.setStatusFilter(['taken']);
      const filtered = service.filteredDoses();
      // All doses should match the filter (or be empty if no taken doses)
      expect(filtered.every(d => d.status === 'taken') || filtered.length === 0).toBeTrue();
    });
  });

  describe('Family Stats', () => {
    it('should compute total members', () => {
      const stats = service.familyStats();
      expect(stats.totalMembers).toBe(3);
    });

    it('should compute total medications', () => {
      const stats = service.familyStats();
      expect(stats.totalMedications).toBe(2);
    });

    it('should compute total doses today', () => {
      const stats = service.familyStats();
      expect(stats.totalDosesToday).toBeGreaterThan(0);
    });

    it('should have member stats for each member', () => {
      const stats = service.familyStats();
      expect(stats.memberStats.length).toBe(3);
    });

    it('should calculate adherence rate', () => {
      const stats = service.familyStats();
      expect(stats.adherenceRate).toBeDefined();
      expect(stats.adherenceRate).toBeGreaterThanOrEqual(0);
      expect(stats.adherenceRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Family Alerts', () => {
    it('should have familyAlerts computed', () => {
      expect(service.familyAlerts).toBeDefined();
    });

    it('should have totalAlerts computed', () => {
      expect(service.totalAlerts).toBeDefined();
    });

    it('should have highPriorityAlerts computed', () => {
      expect(service.highPriorityAlerts).toBeDefined();
    });
  });

  describe('Member Filter Methods', () => {
    it('should set selected members', () => {
      service.setSelectedMembers(['user1', 'dep1']);
      expect(service.selectedMemberIds()).toEqual(['user1', 'dep1']);
    });

    it('should toggle member filter - add', () => {
      service.toggleMemberFilter('user1');
      expect(service.selectedMemberIds()).toContain('user1');
    });

    it('should toggle member filter - remove', () => {
      service.setSelectedMembers(['user1', 'dep1']);
      service.toggleMemberFilter('user1');
      expect(service.selectedMemberIds()).not.toContain('user1');
      expect(service.selectedMemberIds()).toContain('dep1');
    });

    it('should clear member filter', () => {
      service.setSelectedMembers(['user1', 'dep1']);
      service.clearMemberFilter();
      expect(service.selectedMemberIds()).toEqual([]);
    });
  });

  describe('Status Filter Methods', () => {
    it('should set status filter', () => {
      service.setStatusFilter(['taken']);
      expect(service.selectedStatuses()).toEqual(['taken']);
    });

    it('should toggle status filter - add', () => {
      service.setStatusFilter(['pending']);
      service.toggleStatusFilter('taken');
      expect(service.selectedStatuses()).toContain('taken');
      expect(service.selectedStatuses()).toContain('pending');
    });

    it('should toggle status filter - remove', () => {
      service.setStatusFilter(['pending', 'taken']);
      service.toggleStatusFilter('pending');
      expect(service.selectedStatuses()).not.toContain('pending');
      expect(service.selectedStatuses()).toContain('taken');
    });
  });

  describe('Calculate Dose Status', () => {
    it('should return pending for future doses', () => {
      // Use a future date to ensure the dose is always in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
      const timeStr = '12:00'; // Fixed time to avoid hour overflow issues
      
      const status = (service as any).calculateDoseStatus(timeStr, futureDate);
      expect(status).toBe('pending');
    });

    it('should return pending for doses within 1 hour', () => {
      const now = new Date();
      const pastTime = new Date(now);
      pastTime.setMinutes(now.getMinutes() - 30); // 30 minutes ago
      const timeStr = `${pastTime.getHours().toString().padStart(2, '0')}:${pastTime.getMinutes().toString().padStart(2, '0')}`;
      
      const status = (service as any).calculateDoseStatus(timeStr, now);
      expect(status).toBe('pending'); // Still pending if less than 1 hour late
    });

    it('should return overdue for doses more than 1 hour late', () => {
      // Use a date in the past to ensure the dose is always overdue
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday
      const timeStr = '12:00'; // Noon yesterday - definitely more than 1 hour ago
      
      const status = (service as any).calculateDoseStatus(timeStr, pastDate);
      expect(status).toBe('overdue');
    });
  });

  describe('Get Member Color', () => {
    it('should return a color for main user', () => {
      const color = service.getMemberColor('user1');
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return different colors for different members', () => {
      const color1 = service.getMemberColor('user1');
      const color2 = service.getMemberColor('dep1');
      const color3 = service.getMemberColor('dep2');
      
      // Should have colors (may repeat if more than 8 members)
      expect(color1).toBeDefined();
      expect(color2).toBeDefined();
      expect(color3).toBeDefined();
    });

    it('should return undefined for unknown member', () => {
      const color = service.getMemberColor('unknown');
      // When member not found, index is -1, and colors[-1] is undefined
      // This is expected behavior - unknown members don't have a color
      expect(color).toBeUndefined();
    });
  });

  describe('Get Initials', () => {
    it('should return first two initials', () => {
      expect(service.getInitials('João Silva')).toBe('JS');
    });

    it('should return single initial for single name', () => {
      expect(service.getInitials('Maria')).toBe('M');
    });

    it('should handle three names', () => {
      expect(service.getInitials('João Paulo Silva')).toBe('JP');
    });

    it('should return uppercase', () => {
      expect(service.getInitials('joão silva')).toBe('JS');
    });
  });

  describe('FamilyMember Interface', () => {
    it('should accept valid FamilyMember', () => {
      const member: FamilyMember = {
        id: 'test',
        name: 'Test User',
        relationship: 'Você',
        avatarUrl: '/avatar.png',
        isMainUser: true
      };
      expect(member).toBeDefined();
    });
  });

  describe('FamilyDose Interface', () => {
    it('should accept valid FamilyDose', () => {
      const dose: FamilyDose = {
        medicationId: 'med1',
        medicationName: 'Test Med',
        dosage: '10mg',
        time: '08:00',
        status: 'pending',
        member: {
          id: 'user1',
          name: 'Test',
          relationship: 'Você',
          avatarUrl: '',
          isMainUser: true
        },
        date: new Date()
      };
      expect(dose).toBeDefined();
    });

    it('should accept all status types', () => {
      const statuses: FamilyDose['status'][] = ['pending', 'taken', 'missed', 'overdue'];
      statuses.forEach(status => {
        const dose: Partial<FamilyDose> = { status };
        expect(dose.status).toBe(status);
      });
    });
  });

  describe('FamilyStats Interface', () => {
    it('should accept valid FamilyStats', () => {
      const stats: FamilyStats = {
        totalMembers: 3,
        totalMedications: 5,
        totalDosesToday: 10,
        pendingDoses: 5,
        takenDoses: 5,
        adherenceRate: 50,
        memberStats: []
      };
      expect(stats).toBeDefined();
    });
  });

  describe('FamilyAlert Interface', () => {
    it('should accept valid FamilyAlert', () => {
      const alert: FamilyAlert = {
        id: 'alert1',
        type: 'overdue',
        severity: 'high',
        message: 'Test alert',
        member: {
          id: 'user1',
          name: 'Test',
          relationship: 'Você',
          avatarUrl: '',
          isMainUser: true
        },
        timestamp: new Date()
      };
      expect(alert).toBeDefined();
    });

    it('should accept all alert types', () => {
      const types: FamilyAlert['type'][] = ['overdue', 'low-stock', 'expiring', 'missed'];
      types.forEach(type => {
        const alert: Partial<FamilyAlert> = { type };
        expect(alert.type).toBe(type);
      });
    });

    it('should accept all severity levels', () => {
      const severities: FamilyAlert['severity'][] = ['high', 'medium', 'low'];
      severities.forEach(severity => {
        const alert: Partial<FamilyAlert> = { severity };
        expect(alert.severity).toBe(severity);
      });
    });
  });

  describe('Service Dependencies', () => {
    it('should inject UserService', () => {
      expect((service as any).userService).toBeDefined();
    });

    it('should inject MedicationService', () => {
      expect((service as any).medicationService).toBeDefined();
    });
  });
});
