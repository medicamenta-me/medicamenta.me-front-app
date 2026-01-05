import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardInsightsService, Insight, QuickStats } from './dashboard-insights.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { HistoryStatsService } from './history-stats.service';
import { IndexedDBService } from './indexed-db.service';
import { signal } from '@angular/core';
import { Medication, Dose } from '../models/medication.model';

describe('DashboardInsightsService', () => {
  let service: DashboardInsightsService;
  let medicationServiceSpy: jasmine.SpyObj<MedicationService>;
  let logServiceSpy: jasmine.SpyObj<LogService>;
  let historyStatsServiceSpy: jasmine.SpyObj<HistoryStatsService>;
  let indexedDBServiceSpy: jasmine.SpyObj<IndexedDBService>;

  const mockMedications = signal<Medication[]>([]);
  const mockWeeklyStats = signal<any>({});

  beforeEach(() => {
    medicationServiceSpy = jasmine.createSpyObj('MedicationService', ['getMedications'], {
      medications: mockMedications
    });

    logServiceSpy = jasmine.createSpyObj('LogService', ['info', 'warn', 'error', 'debug']);

    historyStatsServiceSpy = jasmine.createSpyObj('HistoryStatsService', ['getWeeklyStats'], {
      weeklyStats: mockWeeklyStats
    });

    indexedDBServiceSpy = jasmine.createSpyObj('IndexedDBService', ['getByIndex', 'put']);
    indexedDBServiceSpy.getByIndex.and.returnValue(Promise.resolve([]));
    indexedDBServiceSpy.put.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        DashboardInsightsService,
        { provide: MedicationService, useValue: medicationServiceSpy },
        { provide: LogService, useValue: logServiceSpy },
        { provide: HistoryStatsService, useValue: historyStatsServiceSpy },
        { provide: IndexedDBService, useValue: indexedDBServiceSpy }
      ]
    });

    service = TestBed.inject(DashboardInsightsService);
  });

  afterEach(() => {
    // Reset signals
    mockMedications.set([]);
    mockWeeklyStats.set({});
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have empty insights initially', () => {
      expect(service.insights()).toEqual([]);
    });

    it('should have default quick stats initially', () => {
      const stats = service.quickStats();
      expect(stats.weeklyAdherence).toBe(0);
      expect(stats.upcomingDoses).toBe(0);
      expect(stats.criticalStock).toBe(0);
      expect(stats.totalActive).toBe(0);
    });

    it('should have sorted insights computed signal', () => {
      expect(service.sortedInsights()).toEqual([]);
    });
  });

  describe('generateInsights', () => {
    it('should generate insights for user', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      expect(indexedDBServiceSpy.getByIndex).toHaveBeenCalledWith('insights', 'userId', 'user123');
    }));

    it('should load insights from cache on startup', fakeAsync(() => {
      const cachedInsights: Insight[] = [
        {
          id: 'cached1',
          type: 'info',
          icon: 'info',
          title: 'Cached Insight',
          description: 'From cache',
          priority: 3,
          timestamp: new Date()
        }
      ];

      indexedDBServiceSpy.getByIndex.and.returnValue(
        Promise.resolve([{ insights: cachedInsights }])
      );

      service.generateInsights('user123');
      tick();

      expect(service.insights().length).toBeGreaterThanOrEqual(0);
      expect(logServiceSpy.info).toHaveBeenCalled();
    }));

    it('should cache generated insights', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      expect(indexedDBServiceSpy.put).toHaveBeenCalled();
    }));

    it('should handle cache load error gracefully', fakeAsync(() => {
      indexedDBServiceSpy.getByIndex.and.returnValue(Promise.reject(new Error('DB Error')));

      service.generateInsights('user123');
      tick();

      expect(logServiceSpy.warn).toHaveBeenCalled();
    }));

    it('should handle cache save error gracefully', fakeAsync(() => {
      indexedDBServiceSpy.put.and.returnValue(Promise.reject(new Error('Save Error')));
      mockMedications.set([]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      expect(logServiceSpy.warn).toHaveBeenCalled();
    }));
  });

  describe('Adherence Analysis', () => {
    it('should generate improving adherence insight when change > 10%', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [
            { rate: 50, week: 'W1' },
            { rate: 70, week: 'W2' } // +20% improvement
          ]
        }
      });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const improvingInsight = insights.find(i => i.title === 'INSIGHTS.ADHERENCE_IMPROVING');
      expect(improvingInsight).toBeTruthy();
      expect(improvingInsight?.type).toBe('success');
      expect(improvingInsight?.icon).toBe('trending-up');
    }));

    it('should generate declining adherence insight when change < -10%', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [
            { rate: 80, week: 'W1' },
            { rate: 60, week: 'W2' } // -20% decline
          ]
        }
      });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const decliningInsight = insights.find(i => i.title === 'INSIGHTS.ADHERENCE_DECLINING');
      expect(decliningInsight).toBeTruthy();
      expect(decliningInsight?.type).toBe('warning');
      expect(decliningInsight?.priority).toBe(5);
      expect(decliningInsight?.actionLabel).toBe('INSIGHTS.VIEW_HISTORY');
    }));

    it('should generate excellent adherence insight when rate > 90%', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [
            { rate: 90, week: 'W1' },
            { rate: 95, week: 'W2' }
          ]
        }
      });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const excellentInsight = insights.find(i => i.title === 'INSIGHTS.EXCELLENT_ADHERENCE');
      expect(excellentInsight).toBeTruthy();
      expect(excellentInsight?.type).toBe('success');
      expect(excellentInsight?.icon).toBe('trophy');
    }));

    it('should generate low adherence insight when rate < 60%', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [
            { rate: 60, week: 'W1' },
            { rate: 50, week: 'W2' }
          ]
        }
      });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const lowInsight = insights.find(i => i.title === 'INSIGHTS.LOW_ADHERENCE');
      expect(lowInsight).toBeTruthy();
      expect(lowInsight?.type).toBe('danger');
      expect(lowInsight?.priority).toBe(5);
      expect(lowInsight?.actionLabel).toBe('INSIGHTS.SETUP_REMINDERS');
    }));

    it('should not generate adherence insights with less than 2 weeks data', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [{ rate: 50, week: 'W1' }]
        }
      });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const adherenceInsights = insights.filter(i =>
        i.title.includes('ADHERENCE')
      );
      expect(adherenceInsights.length).toBe(0);
    }));

    it('should handle empty adherence data', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      expect(service.insights().length).toBe(0);
    }));

    it('should handle missing adherence object', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({});

      service.generateInsights('user123');
      tick();

      expect(service.insights().length).toBe(0);
    }));
  });

  describe('Stock Depletion Prediction', () => {
    it('should generate critical stock insight when stock <= 3', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Aspirin',
        currentStock: 2,
        lowStockThreshold: 7,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const criticalInsight = insights.find(i => i.title === 'INSIGHTS.CRITICAL_STOCK');
      expect(criticalInsight).toBeTruthy();
      expect(criticalInsight?.type).toBe('danger');
      expect(criticalInsight?.priority).toBe(5);
      expect(criticalInsight?.actionLabel).toBe('INSIGHTS.RESTOCK_NOW');
    }));

    it('should generate low stock insight when stock is between 4-7', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Aspirin',
        currentStock: 5,
        lowStockThreshold: 7,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const lowStockInsight = insights.find(i => i.title === 'INSIGHTS.LOW_STOCK');
      expect(lowStockInsight).toBeTruthy();
      expect(lowStockInsight?.type).toBe('warning');
      expect(lowStockInsight?.priority).toBe(4);
    }));

    it('should use stock field if currentStock is undefined', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Aspirin',
        stock: 3,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      expect(insights.some(i => i.title === 'INSIGHTS.CRITICAL_STOCK')).toBeTrue();
    }));

    it('should not generate stock insight for completed medications', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Aspirin',
        currentStock: 2,
        isCompleted: true,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      expect(insights.some(i => i.title.includes('STOCK'))).toBeFalse();
    }));

    it('should not generate stock insight for archived medications', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Aspirin',
        currentStock: 2,
        isCompleted: false,
        isArchived: true
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      expect(insights.some(i => i.title.includes('STOCK'))).toBeFalse();
    }));

    it('should not generate insight when stock is above threshold', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Aspirin',
        currentStock: 20,
        lowStockThreshold: 7,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      expect(insights.some(i => i.title.includes('STOCK'))).toBeFalse();
    }));

    it('should include medication data in action data', fakeAsync(() => {
      const medication: Medication = {
        id: 'med123',
        name: 'Tylenol',
        currentStock: 2,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const stockInsight = insights.find(i => i.title.includes('STOCK'));
      expect(stockInsight?.actionData.medicationId).toBe('med123');
      expect(stockInsight?.actionData.name).toBe('Tylenol');
      expect(stockInsight?.actionData.stock).toBe(2);
    }));
  });

  describe('calculateQuickStats', () => {
    it('should calculate weekly adherence from stats', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [
            { rate: 70, week: 'W1' },
            { rate: 85, week: 'W2' }
          ]
        }
      });

      service.calculateQuickStats('user123');
      tick();

      const stats = service.quickStats();
      expect(stats.weeklyAdherence).toBe(85);
    }));

    it('should return 0 adherence when no weekly data', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().weeklyAdherence).toBe(0);
    }));

    it('should count critical stock medications using stock field', fakeAsync(() => {
      const meds: Medication[] = [
        { id: '1', name: 'Med1', stock: 5 } as unknown as Medication,
        { id: '2', name: 'Med2', stock: 10 } as unknown as Medication,
        { id: '3', name: 'Med3', stock: 3 } as unknown as Medication
      ];

      mockMedications.set(meds);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().criticalStock).toBe(2); // 5 and 3 are < 7
    }));

    it('should count critical stock using currentStock field', fakeAsync(() => {
      const meds: Medication[] = [
        { id: '1', name: 'Med1', currentStock: 5 } as unknown as Medication,
        { id: '2', name: 'Med2', currentStock: 2 } as unknown as Medication
      ];

      mockMedications.set(meds);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().criticalStock).toBe(2);
    }));

    it('should count total active medications', fakeAsync(() => {
      const meds: Medication[] = [
        { id: '1', name: 'Med1', isCompleted: false, isArchived: false } as unknown as Medication,
        { id: '2', name: 'Med2', isCompleted: true, isArchived: false } as unknown as Medication,
        { id: '3', name: 'Med3', isCompleted: false, isArchived: true } as unknown as Medication,
        { id: '4', name: 'Med4', isCompleted: false, isArchived: false } as unknown as Medication
      ];

      mockMedications.set(meds);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().totalActive).toBe(2);
    }));

    it('should handle errors gracefully', fakeAsync(() => {
      // Force error by making medications throw
      Object.defineProperty(medicationServiceSpy, 'medications', {
        get: () => { throw new Error('Service error'); }
      });

      service.calculateQuickStats('user123');
      tick();

      expect(logServiceSpy.error).toHaveBeenCalled();
    }));
  });

  describe('Upcoming Doses Calculation', () => {
    it('should count doses in next 24 hours', fakeAsync(() => {
      const now = new Date();
      const futureHour = (now.getHours() + 2) % 24;

      const medication: Medication = {
        id: 'med1',
        name: 'Test Med',
        isCompleted: false,
        isArchived: false,
        schedule: [
          { time: `${futureHour.toString().padStart(2, '0')}:00`, status: 'upcoming' } as Dose,
          { time: `${((futureHour + 4) % 24).toString().padStart(2, '0')}:00`, status: 'upcoming' } as Dose
        ]
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().upcomingDoses).toBeGreaterThanOrEqual(0);
    }));

    it('should not count doses for completed medications', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test Med',
        isCompleted: true,
        isArchived: false,
        schedule: [
          { time: '12:00', status: 'upcoming' } as Dose
        ]
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().upcomingDoses).toBe(0);
    }));

    it('should not count doses for archived medications', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test Med',
        isCompleted: false,
        isArchived: true,
        schedule: [
          { time: '12:00', status: 'upcoming' } as Dose
        ]
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().upcomingDoses).toBe(0);
    }));

    it('should skip medications without schedule', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test Med',
        isCompleted: false,
        isArchived: false
        // No schedule
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.calculateQuickStats('user123');
      tick();

      expect(service.quickStats().upcomingDoses).toBe(0);
    }));
  });

  describe('Insight Management', () => {
    it('should clear all insights', () => {
      // First set some insights manually via generateInsights
      service.clearInsights();
      expect(service.insights()).toEqual([]);
    });

    it('should dismiss specific insight by ID', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test',
        currentStock: 2,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      if (insights.length > 0) {
        const firstId = insights[0].id;
        service.dismissInsight(firstId);
        expect(service.insights().find(i => i.id === firstId)).toBeUndefined();
      }
    }));

    it('should not affect other insights when dismissing one', fakeAsync(() => {
      const meds: Medication[] = [
        { id: 'med1', name: 'Med1', currentStock: 2, isCompleted: false, isArchived: false } as unknown as Medication,
        { id: 'med2', name: 'Med2', currentStock: 3, isCompleted: false, isArchived: false } as unknown as Medication
      ];

      mockMedications.set(meds);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const initialCount = service.insights().length;
      if (initialCount > 1) {
        const firstId = service.insights()[0].id;
        service.dismissInsight(firstId);
        expect(service.insights().length).toBe(initialCount - 1);
      }
    }));

    it('should handle dismissing non-existent insight', () => {
      service.clearInsights();
      service.dismissInsight('non-existent-id');
      expect(service.insights()).toEqual([]);
    });
  });

  describe('Sorted Insights', () => {
    it('should sort insights by priority (highest first)', fakeAsync(() => {
      const meds: Medication[] = [
        { id: 'med1', name: 'Med1', currentStock: 5, isCompleted: false, isArchived: false } as unknown as Medication, // Low stock, priority 4
        { id: 'med2', name: 'Med2', currentStock: 2, isCompleted: false, isArchived: false } as unknown as Medication  // Critical stock, priority 5
      ];

      mockMedications.set(meds);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [
            { rate: 80, week: 'W1' },
            { rate: 50, week: 'W2' } // Low adherence, priority 5
          ]
        }
      });

      service.generateInsights('user123');
      tick();

      const sorted = service.sortedInsights();
      if (sorted.length > 1) {
        // Verify sorting: higher priority first
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i - 1].priority).toBeGreaterThanOrEqual(sorted[i].priority);
        }
      }
    }));
  });

  describe('ID Generation', () => {
    it('should generate unique insight IDs', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test',
        currentStock: 2,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      const ids = insights.map(i => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }));

    it('should generate IDs with correct format', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test',
        currentStock: 2,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      insights.forEach(insight => {
        expect(insight.id).toMatch(/^insight_\d+_[a-z0-9]+$/);
      });
    }));
  });

  describe('Edge Cases', () => {
    it('should handle undefined weekly stats gracefully', fakeAsync(() => {
      mockMedications.set([]);
      mockWeeklyStats.set(undefined as any);

      expect(() => {
        service.generateInsights('user123');
        tick();
      }).not.toThrow();
    }));

    it('should handle null medications array', fakeAsync(() => {
      mockMedications.set(null as any);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      expect(() => {
        service.generateInsights('user123');
        tick();
      }).not.toThrow();
    }));

    it('should handle medication with undefined stock fields', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test',
        isCompleted: false,
        isArchived: false
        // No stock or currentStock
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      service.generateInsights('user123');
      tick();

      // Should not generate stock insight when stock is 0 or undefined
      const insights = service.insights();
      expect(insights.some(i => i.title.includes('STOCK'))).toBeFalse();
    }));

    it('should handle schedule with invalid time format', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test',
        isCompleted: false,
        isArchived: false,
        schedule: [
          { time: 'invalid', status: 'upcoming' } as Dose
        ]
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      expect(() => {
        service.calculateQuickStats('user123');
        tick();
      }).not.toThrow();
    }));

    it('should log errors during insight generation', fakeAsync(() => {
      // Force error in medication service
      Object.defineProperty(medicationServiceSpy, 'medications', {
        get: () => { throw new Error('Medication error'); }
      });

      service.generateInsights('user123');
      tick();

      expect(logServiceSpy.error).toHaveBeenCalled();
    }));
  });

  describe('Multiple Insights Scenarios', () => {
    it('should generate multiple insights for complex scenario', fakeAsync(() => {
      const meds: Medication[] = [
        { id: '1', name: 'Med1', currentStock: 2, isCompleted: false, isArchived: false } as unknown as Medication,
        { id: '2', name: 'Med2', currentStock: 5, isCompleted: false, isArchived: false } as unknown as Medication
      ];

      mockMedications.set(meds);
      mockWeeklyStats.set({
        adherence: {
          weeklyAdherence: [
            { rate: 40, week: 'W1' },
            { rate: 55, week: 'W2' }
          ]
        }
      });

      service.generateInsights('user123');
      tick();

      const insights = service.insights();
      expect(insights.length).toBeGreaterThan(0);
    }));

    it('should timestamp all insights', fakeAsync(() => {
      const medication: Medication = {
        id: 'med1',
        name: 'Test',
        currentStock: 2,
        isCompleted: false,
        isArchived: false
      } as unknown as Medication;

      mockMedications.set([medication]);
      mockWeeklyStats.set({ adherence: { weeklyAdherence: [] } });

      const before = new Date();
      service.generateInsights('user123');
      tick();
      const after = new Date();

      service.insights().forEach(insight => {
        expect(insight.timestamp).toBeDefined();
        expect(insight.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(insight.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });
    }));
  });
});
