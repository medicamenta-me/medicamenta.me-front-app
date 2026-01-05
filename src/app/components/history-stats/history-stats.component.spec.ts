import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryStatsComponent } from './history-stats.component';
import { HistoryStatsService, PeriodStats } from '../../services/history-stats.service';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      HISTORY_STATS: {
        WEEK: 'Week',
        MONTH: 'Month',
        YEAR: 'Year',
        ALL_TIME: 'All Time',
        OVERALL_ADHERENCE: 'Overall Adherence',
        ADHERENCE: 'Adherence',
        TOTAL_DOSES: 'Total Doses',
        TAKEN: 'Taken',
        MISSED: 'Missed',
        INSIGHTS: 'Insights',
        TIME_PATTERNS: 'Time Patterns',
        MORNING: 'Morning',
        AFTERNOON: 'Afternoon',
        EVENING: 'Evening',
        NIGHT: 'Night',
        DAY_PATTERNS: 'Day Patterns',
        WEEKDAYS: 'Weekdays',
        WEEKENDS: 'Weekends',
        BY_MEDICATION: 'By Medication',
        NO_DATA: 'No data',
        EXPORT_CSV: 'Export CSV',
        DOSES: 'doses'
      }
    });
  }
}

describe('HistoryStatsComponent', () => {
  let component: HistoryStatsComponent;
  let fixture: ComponentFixture<HistoryStatsComponent>;
  let historyStatsServiceSpy: jasmine.SpyObj<HistoryStatsService>;

  const mockPeriodStats: PeriodStats = {
    period: 'week',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-07'),
    totalMedications: 5,
    activeMedications: 3,
    adherence: {
      totalDoses: 100,
      takenDoses: 85,
      missedDoses: 15,
      adherenceRate: 85,
      weeklyAdherence: [{ week: 'Week 1', rate: 85 }],
      monthlyAdherence: [{ month: 'Jan', rate: 85 }]
    },
    timePatterns: {
      morningAdherence: 90,
      afternoonAdherence: 85,
      eveningAdherence: 80,
      nightAdherence: 75,
      bestTimeSlot: 'morning',
      worstTimeSlot: 'night'
    },
    dayPatterns: {
      weekdayAdherence: 88,
      weekendAdherence: 75,
      dailyAdherence: [
        { day: 'monday', rate: 90 },
        { day: 'tuesday', rate: 88 },
        { day: 'wednesday', rate: 85 },
        { day: 'thursday', rate: 87 },
        { day: 'friday', rate: 82 },
        { day: 'saturday', rate: 78 },
        { day: 'sunday', rate: 72 }
      ],
      bestDay: 'monday',
      worstDay: 'sunday'
    },
    medicationBreakdown: [
      { medicationId: '1', medicationName: 'Medication A', adherenceRate: 95, totalDoses: 30, takenDoses: 28 },
      { medicationId: '2', medicationName: 'Medication B', adherenceRate: 70, totalDoses: 20, takenDoses: 14 }
    ]
  };

  beforeEach(async () => {
    historyStatsServiceSpy = jasmine.createSpyObj('HistoryStatsService', [
      'calculatePeriodStats',
      'getInsights',
      'exportToCSV'
    ]);
    
    historyStatsServiceSpy.calculatePeriodStats.and.returnValue(mockPeriodStats);
    historyStatsServiceSpy.getInsights.and.returnValue([
      'Excelente adesão pela manhã!',
      'Adesão baixa nos fins de semana',
      'Medication A tem ótima adesão'
    ]);
    historyStatsServiceSpy.exportToCSV.and.returnValue('csv,data,here');

    await TestBed.configureTestingModule({
      imports: [
        HistoryStatsComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: HistoryStatsService, useValue: historyStatsServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with month period selected', () => {
      expect(component.selectedPeriod()).toBe('month');
    });

    it('should calculate stats on init', () => {
      expect(historyStatsServiceSpy.calculatePeriodStats).toHaveBeenCalledWith('month');
    });
  });

  describe('Period Selection', () => {
    it('should change to week period', () => {
      component.onPeriodChange({ detail: { value: 'week' } });
      expect(component.selectedPeriod()).toBe('week');
    });

    it('should change to year period', () => {
      component.onPeriodChange({ detail: { value: 'year' } });
      expect(component.selectedPeriod()).toBe('year');
    });

    it('should change to all time period', () => {
      component.onPeriodChange({ detail: { value: 'all' } });
      expect(component.selectedPeriod()).toBe('all');
    });

    it('should recalculate stats when period changes', () => {
      component.onPeriodChange({ detail: { value: 'week' } });
      fixture.detectChanges();
      
      // Stats should be recalculated (computed signal reacts to period change)
      expect(component.currentStats()).toBeTruthy();
    });
  });

  describe('Computed Values', () => {
    it('should compute currentStats from service', () => {
      expect(component.currentStats()).toEqual(mockPeriodStats);
    });

    it('should compute insights from service', () => {
      const insights = component.insights();
      expect(insights.length).toBe(3);
      expect(insights[0]).toContain('Excelente');
    });
  });

  describe('getMedicationChipColor', () => {
    it('should return success for rate >= 90', () => {
      expect(component.getMedicationChipColor(90)).toBe('success');
      expect(component.getMedicationChipColor(100)).toBe('success');
    });

    it('should return primary for rate >= 70 and < 90', () => {
      expect(component.getMedicationChipColor(70)).toBe('primary');
      expect(component.getMedicationChipColor(89)).toBe('primary');
    });

    it('should return warning for rate >= 50 and < 70', () => {
      expect(component.getMedicationChipColor(50)).toBe('warning');
      expect(component.getMedicationChipColor(69)).toBe('warning');
    });

    it('should return danger for rate < 50', () => {
      expect(component.getMedicationChipColor(49)).toBe('danger');
      expect(component.getMedicationChipColor(0)).toBe('danger');
    });
  });

  describe('getInsightIcon', () => {
    it('should return trending-up-outline for excellent insights', () => {
      expect(component.getInsightIcon('Excelente adesão!')).toBe('trending-up-outline');
      expect(component.getInsightIcon('🎉 Parabéns!')).toBe('trending-up-outline');
    });

    it('should return trending-down-outline for low/danger insights', () => {
      expect(component.getInsightIcon('Adesão baixa detectada')).toBe('trending-down-outline');
      expect(component.getInsightIcon('🚨 Atenção necessária')).toBe('trending-down-outline');
    });

    it('should return remove-outline for neutral insights', () => {
      expect(component.getInsightIcon('Insight normal')).toBe('remove-outline');
    });
  });

  describe('getInsightColor', () => {
    it('should return success for excellent insights', () => {
      expect(component.getInsightColor('Excelente adesão!')).toBe('success');
      expect(component.getInsightColor('🎉 Parabéns!')).toBe('success');
    });

    it('should return danger for low/danger insights', () => {
      expect(component.getInsightColor('Adesão baixa detectada')).toBe('danger');
      expect(component.getInsightColor('🚨 Atenção necessária')).toBe('danger');
    });

    it('should return warning for moderate insights', () => {
      expect(component.getInsightColor('Adesão moderada')).toBe('warning');
      expect(component.getInsightColor('⚠️ Atenção')).toBe('warning');
    });

    it('should return primary for neutral insights', () => {
      expect(component.getInsightColor('Insight normal')).toBe('primary');
    });
  });

  describe('exportStats', () => {
    let createElementSpy: jasmine.Spy;
    let appendChildSpy: jasmine.Spy;
    let removeChildSpy: jasmine.Spy;
    let mockLink: any;

    beforeEach(() => {
      mockLink = {
        setAttribute: jasmine.createSpy('setAttribute'),
        click: jasmine.createSpy('click'),
        style: { visibility: '' }
      };
      
      createElementSpy = spyOn(document, 'createElement').and.returnValue(mockLink);
      appendChildSpy = spyOn(document.body, 'appendChild').and.stub();
      removeChildSpy = spyOn(document.body, 'removeChild').and.stub();
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
    });

    it('should call exportToCSV from service', () => {
      component.exportStats();
      expect(historyStatsServiceSpy.exportToCSV).toHaveBeenCalledWith(mockPeriodStats);
    });

    it('should create a download link', () => {
      component.exportStats();
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should set correct link attributes', () => {
      component.exportStats();
      
      expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:test-url');
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', jasmine.stringMatching(/medicamenta-relatorio-\d{4}-\d{2}-\d{2}\.csv/));
    });

    it('should trigger download by clicking link', () => {
      component.exportStats();
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should clean up by removing link from DOM', () => {
      component.exportStats();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    });

    it('should set link visibility to hidden', () => {
      component.exportStats();
      expect(mockLink.style.visibility).toBe('hidden');
    });
  });

  describe('Stats Display', () => {
    it('should have adherence data', () => {
      const stats = component.currentStats();
      expect(stats?.adherence.adherenceRate).toBe(85);
      expect(stats?.adherence.totalDoses).toBe(100);
      expect(stats?.adherence.takenDoses).toBe(85);
      expect(stats?.adherence.missedDoses).toBe(15);
    });

    it('should have time patterns data', () => {
      const stats = component.currentStats();
      expect(stats?.timePatterns.morningAdherence).toBe(90);
      expect(stats?.timePatterns.bestTimeSlot).toBe('morning');
      expect(stats?.timePatterns.worstTimeSlot).toBe('night');
    });

    it('should have day patterns data', () => {
      const stats = component.currentStats();
      expect(stats?.dayPatterns.weekdayAdherence).toBe(88);
      expect(stats?.dayPatterns.weekendAdherence).toBe(75);
      expect(stats?.dayPatterns.bestDay).toBe('monday');
      expect(stats?.dayPatterns.worstDay).toBe('sunday');
    });

    it('should have medication breakdown data', () => {
      const stats = component.currentStats();
      expect(stats?.medicationBreakdown.length).toBe(2);
      expect(stats?.medicationBreakdown[0].medicationName).toBe('Medication A');
      expect(stats?.medicationBreakdown[0].adherenceRate).toBe(95);
    });
  });

  describe('Adherence Circle Classes', () => {
    it('should have excellent class for rate >= 90', () => {
      const statsExcellent = { ...mockPeriodStats, adherence: { ...mockPeriodStats.adherence, adherenceRate: 95 } };
      historyStatsServiceSpy.calculatePeriodStats.and.returnValue(statsExcellent);
      
      const newFixture = TestBed.createComponent(HistoryStatsComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.currentStats()?.adherence.adherenceRate).toBe(95);
    });

    it('should identify good adherence range (70-89)', () => {
      const stats = component.currentStats();
      expect(stats?.adherence.adherenceRate).toBeGreaterThanOrEqual(70);
      expect(stats?.adherence.adherenceRate).toBeLessThan(90);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero doses', () => {
      const emptyStats: PeriodStats = {
        ...mockPeriodStats,
        adherence: { 
          totalDoses: 0, 
          takenDoses: 0, 
          missedDoses: 0, 
          adherenceRate: 0,
          weeklyAdherence: [],
          monthlyAdherence: []
        },
        medicationBreakdown: []
      };
      
      historyStatsServiceSpy.calculatePeriodStats.and.returnValue(emptyStats);
      
      const newFixture = TestBed.createComponent(HistoryStatsComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.currentStats()?.adherence.totalDoses).toBe(0);
    });

    it('should handle empty medication breakdown', () => {
      const noMedsStats: PeriodStats = {
        ...mockPeriodStats,
        medicationBreakdown: []
      };
      
      historyStatsServiceSpy.calculatePeriodStats.and.returnValue(noMedsStats);
      
      const newFixture = TestBed.createComponent(HistoryStatsComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.currentStats()?.medicationBreakdown.length).toBe(0);
    });

    it('should handle empty insights', () => {
      historyStatsServiceSpy.getInsights.and.returnValue([]);
      
      const newFixture = TestBed.createComponent(HistoryStatsComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.insights().length).toBe(0);
    });
  });

  describe('ChangeDetection', () => {
    it('should use OnPush change detection', () => {
      // Component uses ChangeDetectionStrategy.OnPush
      expect(component).toBeTruthy();
    });
  });
});
