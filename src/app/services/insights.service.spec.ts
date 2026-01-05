import { TestBed } from '@angular/core/testing';
import { 
  InsightsService, 
  Insight, 
  InsightType, 
  InsightPriority 
} from './insights.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { StockService } from './stock.service';
import { HistoryStatsService } from './history-stats.service';

describe('InsightsService', () => {
  let service: InsightsService;
  let medicationServiceSpy: jasmine.SpyObj<MedicationService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;
  let stockServiceSpy: jasmine.SpyObj<StockService>;
  let historyStatsServiceSpy: jasmine.SpyObj<HistoryStatsService>;

  let mockMedications: any[];
  let mockLogs: any[];
  let mockStockAlerts: any[];
  let mockWeekStats: any;

  beforeEach(() => {
    mockMedications = [
      { id: 'med1', name: 'Aspirin', dosage: '500mg' }
    ];
    mockLogs = [];
    mockStockAlerts = [];
    mockWeekStats = {
      adherence: {
        adherenceRate: 80,
        missedDoses: 3,
        takenDoses: 15,
        totalDoses: 20,
        weeklyAdherence: [
          { week: 1, rate: 70 },
          { week: 2, rate: 80 }
        ]
      },
      timePatterns: {
        morningAdherence: 90,
        afternoonAdherence: 85,
        eveningAdherence: 70,
        nightAdherence: 75
      },
      dayPatterns: {
        weekdayAdherence: 85,
        weekendAdherence: 75
      }
    };

    const medicationsSignal = jasmine.createSpy('medications').and.callFake(() => mockMedications);
    const logsSignal = jasmine.createSpy('logs').and.callFake(() => mockLogs);
    const stockAlertsSignal = jasmine.createSpy('stockAlerts').and.callFake(() => mockStockAlerts);
    const weeklyStatsSignal = jasmine.createSpy('weeklyStats').and.callFake(() => mockWeekStats);

    medicationServiceSpy = jasmine.createSpyObj('MedicationService', [], {
      medications: medicationsSignal
    });

    logServiceSpy = jasmine.createSpyObj('LogService', ['info', 'warn', 'error', 'debug'], {
      logs: logsSignal
    });

    stockServiceSpy = jasmine.createSpyObj('StockService', [], {
      stockAlerts: stockAlertsSignal
    });

    historyStatsServiceSpy = jasmine.createSpyObj('HistoryStatsService', [], {
      weeklyStats: weeklyStatsSignal
    });

    TestBed.configureTestingModule({
      providers: [
        InsightsService,
        { provide: MedicationService, useValue: medicationServiceSpy },
        { provide: LogService, useValue: logServiceSpy },
        { provide: StockService, useValue: stockServiceSpy },
        { provide: HistoryStatsService, useValue: historyStatsServiceSpy }
      ]
    });

    service = TestBed.inject(InsightsService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have insights computed signal', () => {
      expect(service.insights).toBeDefined();
    });

    it('should have criticalInsights computed signal', () => {
      expect(service.criticalInsights).toBeDefined();
    });

    it('should have highPriorityInsights computed signal', () => {
      expect(service.highPriorityInsights).toBeDefined();
    });

    it('should have insightCount computed signal', () => {
      expect(service.insightCount).toBeDefined();
    });

    it('should have hasCriticalInsights computed signal', () => {
      expect(service.hasCriticalInsights).toBeDefined();
    });
  });

  describe('Adherence Insights', () => {
    it('should generate excellent adherence insight for 95%+', () => {
      mockWeekStats.adherence.adherenceRate = 98;
      const insights = service.insights();
      const excellent = insights.find(i => i.type === 'adherence_excellent');
      expect(excellent).toBeDefined();
      expect(excellent?.priority).toBe('low');
    });

    it('should generate good adherence insight for 80-94%', () => {
      mockWeekStats.adherence.adherenceRate = 85;
      const insights = service.insights();
      const good = insights.find(i => i.type === 'adherence_good');
      expect(good).toBeDefined();
    });

    it('should generate moderate adherence insight for 60-79%', () => {
      mockWeekStats.adherence.adherenceRate = 65;
      const insights = service.insights();
      const moderate = insights.find(i => i.type === 'adherence_moderate');
      expect(moderate).toBeDefined();
      expect(moderate?.priority).toBe('medium');
    });

    it('should generate poor adherence insight for <60%', () => {
      mockWeekStats.adherence.adherenceRate = 50;
      const insights = service.insights();
      const poor = insights.find(i => i.type === 'adherence_poor');
      expect(poor).toBeDefined();
      expect(poor?.priority).toBe('critical');
    });

    it('should generate missed doses insight for high missed count', () => {
      mockWeekStats.adherence.missedDoses = 10;
      const insights = service.insights();
      const missed = insights.find(i => i.type === 'missed_doses_pattern');
      expect(missed).toBeDefined();
      expect(missed?.priority).toBe('high');
    });
  });

  describe('Pattern Insights', () => {
    it('should generate time pattern insight for poor time slot', () => {
      mockWeekStats.timePatterns.eveningAdherence = 50;
      const insights = service.insights();
      const timePattern = insights.find(i => i.type === 'time_pattern_poor');
      expect(timePattern).toBeDefined();
    });

    it('should generate weekend pattern insight when weekend adherence is poor', () => {
      mockWeekStats.dayPatterns.weekdayAdherence = 90;
      mockWeekStats.dayPatterns.weekendAdherence = 60;
      const insights = service.insights();
      const weekendPattern = insights.find(i => i.type === 'weekend_pattern_poor');
      expect(weekendPattern).toBeDefined();
    });
  });

  describe('Stock Insights', () => {
    it('should generate critical stock insight', () => {
      mockStockAlerts.push({ status: 'critical', medicationName: 'Aspirin' });
      const insights = service.insights();
      const critical = insights.find(i => i.type === 'stock_critical');
      expect(critical).toBeDefined();
      expect(critical?.priority).toBe('critical');
    });

    it('should generate low stock insight', () => {
      mockStockAlerts.push({ status: 'low', medicationName: 'Vitamin D' });
      const insights = service.insights();
      const low = insights.find(i => i.type === 'stock_low');
      expect(low).toBeDefined();
    });

    it('should not show low stock when critical exists', () => {
      mockStockAlerts.push({ status: 'critical', medicationName: 'Aspirin' });
      mockStockAlerts.push({ status: 'low', medicationName: 'Vitamin D' });
      const insights = service.insights();
      const low = insights.find(i => i.type === 'stock_low');
      expect(low).toBeUndefined();
    });
  });

  describe('Achievement Insights', () => {
    it('should generate perfect week insight', () => {
      mockWeekStats.adherence.adherenceRate = 100;
      mockWeekStats.adherence.totalDoses = 14;
      const insights = service.insights();
      const perfect = insights.find(i => i.type === 'streak_achievement');
      expect(perfect).toBeDefined();
    });

    it('should generate improvement insight', () => {
      mockWeekStats.adherence.weeklyAdherence = [
        { week: 1, rate: 60 },
        { week: 2, rate: 85 }
      ];
      const insights = service.insights();
      const improvement = insights.find(i => i.type === 'medication_improvement');
      expect(improvement).toBeDefined();
    });
  });

  describe('Insight Filtering', () => {
    it('should filter critical insights', () => {
      mockWeekStats.adherence.adherenceRate = 40;
      const critical = service.criticalInsights();
      expect(critical.every(i => i.priority === 'critical')).toBeTrue();
    });

    it('should filter high priority insights', () => {
      mockWeekStats.adherence.missedDoses = 10;
      const high = service.highPriorityInsights();
      expect(high.every(i => i.priority === 'high')).toBeTrue();
    });

    it('should count insights correctly', () => {
      const count = service.insightCount();
      expect(count).toBe(service.insights().length);
    });

    it('should detect critical insights presence', () => {
      mockWeekStats.adherence.adherenceRate = 40;
      expect(service.hasCriticalInsights()).toBeTrue();
    });
  });

  describe('Insight Sorting', () => {
    it('should sort by priority', () => {
      mockWeekStats.adherence.adherenceRate = 40; // Critical
      mockWeekStats.adherence.missedDoses = 10; // High
      const insights = service.insights();
      
      if (insights.length >= 2) {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        for (let i = 0; i < insights.length - 1; i++) {
          const currentPriority = priorityOrder[insights[i].priority];
          const nextPriority = priorityOrder[insights[i + 1].priority];
          expect(currentPriority <= nextPriority).toBeTrue();
        }
      }
    });
  });

  describe('Get Insight By ID', () => {
    it('should find insight by ID', () => {
      mockWeekStats.adherence.adherenceRate = 85;
      const insight = service.getInsightById('adherence_good');
      expect(insight?.type).toBe('adherence_good');
    });

    it('should return undefined for non-existent ID', () => {
      const insight = service.getInsightById('non_existent');
      expect(insight).toBeUndefined();
    });
  });

  describe('Private Method: getWorstTimeSlot', () => {
    it('should identify worst time slot', () => {
      const timePatterns = {
        morningAdherence: 90,
        afternoonAdherence: 85,
        eveningAdherence: 50,
        nightAdherence: 75
      };
      
      const worst = (service as any).getWorstTimeSlot(timePatterns);
      expect(worst.name).toBe('evening');
      expect(worst.adherence).toBe(50);
    });

    it('should return null for perfect adherence', () => {
      const timePatterns = {
        morningAdherence: 100,
        afternoonAdherence: 100,
        eveningAdherence: 100,
        nightAdherence: 100
      };
      
      const worst = (service as any).getWorstTimeSlot(timePatterns);
      expect(worst).toBeNull();
    });
  });

  describe('No Stats Handling', () => {
    it('should handle null stats gracefully', () => {
      (historyStatsServiceSpy.weeklyStats as jasmine.Spy).and.returnValue(null as any);
      const newService = TestBed.inject(InsightsService);
      expect(newService.insights().length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Insight Interface', () => {
    it('should have correct structure', () => {
      const insight: Insight = {
        id: 'test',
        type: 'adherence_excellent',
        priority: 'low',
        title: 'Test Title',
        message: 'Test Message',
        icon: 'trophy',
        color: 'success'
      };
      expect(insight).toBeDefined();
    });

    it('should allow optional actionLabel', () => {
      const insight: Insight = {
        id: 'test',
        type: 'adherence_moderate',
        priority: 'medium',
        title: 'Test',
        message: 'Test',
        icon: 'alert',
        color: 'warning',
        actionLabel: 'Click here'
      };
      expect(insight.actionLabel).toBe('Click here');
    });

    it('should allow optional actionRoute', () => {
      const insight: Insight = {
        id: 'test',
        type: 'stock_low',
        priority: 'medium',
        title: 'Test',
        message: 'Test',
        icon: 'cube',
        color: 'warning',
        actionRoute: '/medications'
      };
      expect(insight.actionRoute).toBe('/medications');
    });

    it('should allow optional metadata', () => {
      const insight: Insight = {
        id: 'test',
        type: 'adherence_good',
        priority: 'low',
        title: 'Test',
        message: 'Test',
        icon: 'check',
        color: 'success',
        metadata: { rate: 85 }
      };
      expect(insight.metadata?.rate).toBe(85);
    });
  });

  describe('InsightType Union', () => {
    it('should accept all valid types', () => {
      const types: InsightType[] = [
        'adherence_excellent',
        'adherence_good',
        'adherence_moderate',
        'adherence_poor',
        'missed_doses_pattern',
        'time_pattern_poor',
        'weekend_pattern_poor',
        'stock_critical',
        'stock_low',
        'medication_improvement',
        'streak_achievement',
        'recommendation'
      ];
      
      types.forEach(type => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('InsightPriority Union', () => {
    it('should accept all valid priorities', () => {
      const priorities: InsightPriority[] = ['critical', 'high', 'medium', 'low'];
      
      priorities.forEach(priority => {
        expect(priority).toBeDefined();
      });
    });
  });

  describe('Service Dependencies', () => {
    it('should inject MedicationService', () => {
      expect((service as any).medicationService).toBeDefined();
    });

    it('should inject LogService', () => {
      expect((service as any).logService).toBeDefined();
    });

    it('should inject StockService', () => {
      expect((service as any).stockService).toBeDefined();
    });

    it('should inject HistoryStatsService', () => {
      expect((service as any).historyStatsService).toBeDefined();
    });
  });
});
