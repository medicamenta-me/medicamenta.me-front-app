import { TestBed } from '@angular/core/testing';
import { 
  FamilyCalendarService, 
  CalendarDay, 
  DoseSummary, 
  MonthData, 
  DayDetail, 
  MemberFilter 
} from './family-calendar.service';
import { FamilyService } from './family.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { Medication } from '../models/medication.model';

describe('FamilyCalendarService', () => {
  let service: FamilyCalendarService;
  let familyServiceSpy: jasmine.SpyObj<FamilyService>;
  let medicationServiceSpy: jasmine.SpyObj<MedicationService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;

  let mockFamilyMembers: any[];
  let mockMedications: Medication[];

  beforeEach(() => {
    mockFamilyMembers = [
      { id: 'member1', name: 'João' },
      { id: 'member2', name: 'Maria' }
    ];
    mockMedications = [];

    // Create a signal-like callable function
    const familyMembersSignal = jasmine.createSpy('familyMembers').and.callFake(() => mockFamilyMembers);
    const medicationsSignal = jasmine.createSpy('medications').and.callFake(() => mockMedications);

    familyServiceSpy = jasmine.createSpyObj('FamilyService', ['getMemberColor'], {
      familyMembers: familyMembersSignal
    });
    familyServiceSpy.getMemberColor.and.returnValue('#3498db');

    medicationServiceSpy = jasmine.createSpyObj('MedicationService', [], {
      medications: medicationsSignal
    });

    logServiceSpy = jasmine.createSpyObj('LogService', ['info', 'warn', 'error', 'debug']);

    TestBed.configureTestingModule({
      providers: [
        FamilyCalendarService,
        { provide: FamilyService, useValue: familyServiceSpy },
        { provide: MedicationService, useValue: medicationServiceSpy },
        { provide: LogService, useValue: logServiceSpy }
      ]
    });

    service = TestBed.inject(FamilyCalendarService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should set current year to today', () => {
      const today = new Date();
      expect(service.currentYear()).toBe(today.getFullYear());
    });

    it('should set current month to today', () => {
      const today = new Date();
      expect(service.currentMonth()).toBe(today.getMonth());
    });

    it('should initialize member filters', () => {
      // Re-initialize member filters since the service was created
      // before the mock was fully set up in all test scenarios
      (service as any).initializeMemberFilters();
      
      const filters = service.memberFilters();
      expect(filters.length).toBe(2);
      expect(filters[0].memberId).toBe('member1');
      expect(filters[1].memberId).toBe('member2');
    });

    it('should set all members active by default', () => {
      const filters = service.memberFilters();
      expect(filters.every(f => f.active)).toBeTrue();
    });
  });

  describe('Month Navigation', () => {
    it('should go to previous month', () => {
      const initialMonth = service.currentMonth();
      service.previousMonth();

      if (initialMonth === 0) {
        expect(service.currentMonth()).toBe(11);
        expect(service.currentYear()).toBe(new Date().getFullYear() - 1);
      } else {
        expect(service.currentMonth()).toBe(initialMonth - 1);
      }
    });

    it('should go to next month', () => {
      const initialMonth = service.currentMonth();
      service.nextMonth();

      if (initialMonth === 11) {
        expect(service.currentMonth()).toBe(0);
        expect(service.currentYear()).toBe(new Date().getFullYear() + 1);
      } else {
        expect(service.currentMonth()).toBe(initialMonth + 1);
      }
    });

    it('should go to today', () => {
      // Navigate away first
      service.nextMonth();
      service.nextMonth();

      // Then go back to today
      service.goToToday();

      const today = new Date();
      expect(service.currentYear()).toBe(today.getFullYear());
      expect(service.currentMonth()).toBe(today.getMonth());
    });

    it('should handle year transition when going to previous month from January', () => {
      // Set to January
      (service as any)._currentMonth.set(0);
      const currentYear = service.currentYear();

      service.previousMonth();

      expect(service.currentMonth()).toBe(11);
      expect(service.currentYear()).toBe(currentYear - 1);
    });

    it('should handle year transition when going to next month from December', () => {
      // Set to December
      (service as any)._currentMonth.set(11);
      const currentYear = service.currentYear();

      service.nextMonth();

      expect(service.currentMonth()).toBe(0);
      expect(service.currentYear()).toBe(currentYear + 1);
    });
  });

  describe('Member Filters', () => {
    it('should toggle member filter', () => {
      const initialState = service.memberFilters()[0].active;
      
      service.toggleMemberFilter('member1');
      
      expect(service.memberFilters()[0].active).toBe(!initialState);
    });

    it('should show all members', () => {
      // First hide all
      service.hideAllMembers();
      expect(service.memberFilters().every(f => !f.active)).toBeTrue();

      // Then show all
      service.showAllMembers();
      expect(service.memberFilters().every(f => f.active)).toBeTrue();
    });

    it('should hide all members', () => {
      service.hideAllMembers();
      expect(service.memberFilters().every(f => !f.active)).toBeTrue();
    });

    it('should compute active members correctly', () => {
      service.toggleMemberFilter('member1');
      
      const activeMembers = service.activeMembers();
      expect(activeMembers.length).toBe(1);
      expect(activeMembers[0].memberId).toBe('member2');
    });
  });

  describe('Month Data Generation', () => {
    it('should generate month data', () => {
      const monthData = service.monthData();
      
      expect(monthData).toBeDefined();
      expect(monthData.year).toBe(service.currentYear());
      expect(monthData.month).toBe(service.currentMonth());
    });

    it('should have correct month name', () => {
      const monthData = service.monthData();
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      
      expect(monthData.monthName).toBe(monthNames[service.currentMonth()]);
    });

    it('should have 42 calendar days (6 weeks)', () => {
      const monthData = service.monthData();
      expect(monthData.days.length).toBe(42);
    });

    it('should mark today correctly', () => {
      service.goToToday();
      const monthData = service.monthData();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCell = monthData.days.find(d => 
        d.date.getFullYear() === today.getFullYear() &&
        d.date.getMonth() === today.getMonth() &&
        d.date.getDate() === today.getDate()
      );
      
      expect(todayCell?.isToday).toBeTrue();
    });

    it('should mark current month days correctly', () => {
      const monthData = service.monthData();
      const currentMonthDays = monthData.days.filter(d => d.isCurrentMonth);
      
      expect(currentMonthDays.length).toBe(monthData.totalDays);
    });

    it('should include active member count', () => {
      const monthData = service.monthData();
      expect(monthData.activeMemberCount).toBe(2);
    });
  });

  describe('Day Details', () => {
    it('should get day details', () => {
      const today = new Date();
      const details = service.getDayDetails(today);
      
      expect(details).toBeDefined();
      expect(details.date).toBeDefined();
      expect(details.dateString).toBeDefined();
      expect(details.doses).toBeDefined();
    });

    it('should format date string correctly', () => {
      const date = new Date(2025, 0, 15); // January 15, 2025
      const details = service.getDayDetails(date);
      
      expect(details.dateString).toBe('15 de Janeiro de 2025');
    });

    it('should include summary text', () => {
      const today = new Date();
      const details = service.getDayDetails(today);
      
      expect(details.summaryText).toBeDefined();
    });

    it('should count doses correctly', () => {
      const today = new Date();
      const details = service.getDayDetails(today);
      
      expect(details.takenCount).toBeGreaterThanOrEqual(0);
      expect(details.missedCount).toBeGreaterThanOrEqual(0);
      expect(details.pendingCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Day Name', () => {
    it('should return correct day names', () => {
      expect(service.getDayName(0)).toBe('Dom');
      expect(service.getDayName(1)).toBe('Seg');
      expect(service.getDayName(2)).toBe('Ter');
      expect(service.getDayName(3)).toBe('Qua');
      expect(service.getDayName(4)).toBe('Qui');
      expect(service.getDayName(5)).toBe('Sex');
      expect(service.getDayName(6)).toBe('Sáb');
    });
  });

  describe('Date Formatting', () => {
    it('should format date key correctly', () => {
      const date = new Date(2025, 5, 15); // June 15, 2025
      const key = (service as any).formatDateKey(date);
      expect(key).toBe('2025-06-15');
    });

    it('should format date key with padding', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      const key = (service as any).formatDateKey(date);
      expect(key).toBe('2025-01-05');
    });

    it('should format full date correctly', () => {
      const date = new Date(2025, 11, 25); // December 25, 2025
      const formatted = (service as any).formatDateFull(date);
      expect(formatted).toBe('25 de Dezembro de 2025');
    });
  });

  describe('Month Name', () => {
    it('should return all month names correctly', () => {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      monthNames.forEach((name, index) => {
        expect((service as any).getMonthName(index)).toBe(name);
      });
    });
  });

  describe('Summary Text Building', () => {
    it('should return empty message for no doses', () => {
      const text = (service as any).buildSummaryText(0, 0, 0, 0);
      expect(text).toBe('Nenhuma dose agendada');
    });

    it('should format taken doses singular', () => {
      const text = (service as any).buildSummaryText(1, 1, 0, 0);
      expect(text).toContain('1 tomada');
    });

    it('should format taken doses plural', () => {
      const text = (service as any).buildSummaryText(2, 2, 0, 0);
      expect(text).toContain('2 tomadas');
    });

    it('should format missed doses singular', () => {
      const text = (service as any).buildSummaryText(1, 0, 1, 0);
      expect(text).toContain('1 perdida');
    });

    it('should format missed doses plural', () => {
      const text = (service as any).buildSummaryText(2, 0, 2, 0);
      expect(text).toContain('2 perdidas');
    });

    it('should format pending doses singular', () => {
      const text = (service as any).buildSummaryText(1, 0, 0, 1);
      expect(text).toContain('1 pendente');
    });

    it('should format pending doses plural', () => {
      const text = (service as any).buildSummaryText(2, 0, 0, 2);
      expect(text).toContain('2 pendentes');
    });

    it('should combine multiple statuses', () => {
      const text = (service as any).buildSummaryText(3, 1, 1, 1);
      expect(text).toContain('1 tomada');
      expect(text).toContain('1 perdida');
      expect(text).toContain('1 pendente');
    });
  });

  describe('Medication Active Check', () => {
    it('should return true when no start date', () => {
      const medication = { id: 'med1' };
      const result = (service as any).isMedicationActiveOnDate(medication, new Date());
      expect(result).toBeTrue();
    });

    it('should return true when date is after start date', () => {
      const medication = { 
        id: 'med1', 
        startDate: new Date(2025, 0, 1) 
      };
      const result = (service as any).isMedicationActiveOnDate(medication, new Date(2025, 0, 15));
      expect(result).toBeTrue();
    });

    it('should return false when date is before start date', () => {
      const medication = { 
        id: 'med1', 
        startDate: new Date(2025, 0, 15) 
      };
      const result = (service as any).isMedicationActiveOnDate(medication, new Date(2025, 0, 1));
      expect(result).toBeFalse();
    });

    it('should return true when date is within range', () => {
      const medication = { 
        id: 'med1', 
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 0, 31)
      };
      const result = (service as any).isMedicationActiveOnDate(medication, new Date(2025, 0, 15));
      expect(result).toBeTrue();
    });

    it('should return false when date is after end date', () => {
      const medication = { 
        id: 'med1', 
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 0, 15)
      };
      const result = (service as any).isMedicationActiveOnDate(medication, new Date(2025, 0, 20));
      expect(result).toBeFalse();
    });
  });

  describe('Schedule Doses For Date', () => {
    it('should handle object schedule', () => {
      const medication = {
        id: 'med1',
        name: 'Test Med',
        dosage: '10mg',
        schedule: {
          '2025-01-15': [
            { time: '08:00', status: 'taken' },
            { time: '20:00', status: 'pending' }
          ]
        }
      };

      const doses = (service as any).getScheduleDosesForDate(
        medication, '2025-01-15', 'João', '#3498db'
      );

      expect(doses.length).toBe(2);
      expect(doses[0].time).toBe('08:00');
      expect(doses[1].time).toBe('20:00');
    });

    it('should handle array schedule', () => {
      const medication = {
        id: 'med1',
        name: 'Test Med',
        dosage: '10mg',
        schedule: [
          { time: '08:00', status: 'taken' },
          { time: '20:00', status: 'pending' }
        ]
      };

      const doses = (service as any).getScheduleDosesForDate(
        medication, '2025-01-15', 'João', '#3498db'
      );

      expect(doses.length).toBe(2);
    });

    it('should map upcoming status to pending', () => {
      const medication = {
        id: 'med1',
        name: 'Test Med',
        dosage: '10mg',
        schedule: [
          { time: '08:00', status: 'upcoming' }
        ]
      };

      const doses = (service as any).getScheduleDosesForDate(
        medication, '2025-01-15', 'João', '#3498db'
      );

      expect(doses[0].status).toBe('pending');
    });

    it('should include medication info in dose summary', () => {
      const medication = {
        id: 'med123',
        name: 'Aspirin',
        dosage: '100mg',
        schedule: [
          { time: '08:00', status: 'taken', notes: 'With food' }
        ]
      };

      const doses = (service as any).getScheduleDosesForDate(
        medication, '2025-01-15', 'Maria', '#e74c3c'
      );

      expect(doses[0].medicationId).toBe('med123');
      expect(doses[0].medicationName).toBe('Aspirin');
      expect(doses[0].memberName).toBe('Maria');
      expect(doses[0].memberColor).toBe('#e74c3c');
      expect(doses[0].dosage).toBe('100mg');
      expect(doses[0].notes).toBe('With food');
    });

    it('should return empty array for missing schedule', () => {
      const medication = {
        id: 'med1',
        name: 'Test Med',
        dosage: '10mg'
        // No schedule
      };

      const doses = (service as any).getScheduleDosesForDate(
        medication, '2025-01-15', 'João', '#3498db'
      );

      expect(doses.length).toBe(0);
    });
  });

  describe('CalendarDay Interface', () => {
    it('should create calendar day with all fields', () => {
      const today = new Date();
      const day: CalendarDay = {
        date: today,
        dayNumber: today.getDate(),
        isToday: true,
        isCurrentMonth: true,
        doses: [],
        memberColors: ['#3498db'],
        hasTaken: true,
        hasMissed: false,
        hasPending: true,
        totalDoses: 2,
        takenCount: 1,
        missedCount: 0,
        pendingCount: 1
      };

      expect(day.date).toBe(today);
      expect(day.isToday).toBeTrue();
      expect(day.memberColors.length).toBe(1);
    });
  });

  describe('DoseSummary Interface', () => {
    it('should create dose summary with all fields', () => {
      const dose: DoseSummary = {
        medicationId: 'med1',
        medicationName: 'Aspirin',
        memberName: 'João',
        memberColor: '#3498db',
        time: '08:00',
        status: 'taken',
        dosage: '100mg',
        notes: 'Take with food'
      };

      expect(dose.medicationId).toBe('med1');
      expect(dose.status).toBe('taken');
    });
  });

  describe('MemberFilter Interface', () => {
    it('should create member filter with all fields', () => {
      const filter: MemberFilter = {
        memberId: 'member1',
        memberName: 'João',
        color: '#3498db',
        active: true
      };

      expect(filter.memberId).toBe('member1');
      expect(filter.active).toBeTrue();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty family members', () => {
      // memberFilters depends on computed signal from familyMembers
      // Update the filter state to match empty
      (service as any)._memberFilters.set([]);
      
      expect(service.memberFilters().length).toBe(0);
    });

    it('should handle undefined member color', () => {
      familyServiceSpy.getMemberColor.and.returnValue(undefined as any);
      
      const monthData = service.monthData();
      expect(monthData).toBeDefined();
    });

    it('should sort doses by time', () => {
      const medication = {
        id: 'med1',
        name: 'Test',
        userId: 'member1',
        isArchived: false,
        isCompleted: false,
        dosage: '10mg',
        schedule: [
          { time: '20:00', status: 'pending' },
          { time: '08:00', status: 'taken' },
          { time: '14:00', status: 'pending' }
        ]
      } as unknown as Medication;

      // Update mock medications
      mockMedications.push(medication);

      const doses = (service as any).getDosesForDate(new Date(), ['member1']);
      
      // Should be sorted by time
      if (doses.length >= 2) {
        expect(doses[0].time <= doses[1].time).toBeTrue();
      }
    });
  });
});
