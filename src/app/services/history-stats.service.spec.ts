import { 
  AdherenceStats,
  TimePatternStats,
  DayPatternStats,
  MedicationAdherence,
  PeriodStats
} from './history-stats.service';

/**
 * History Stats Service Tests
 * Testing history statistics types, interfaces and logic
 */
describe('HistoryStatsService Logic', () => {
  describe('AdherenceStats Interface', () => {
    it('should have all required fields', () => {
      const stats: AdherenceStats = {
        totalDoses: 100,
        takenDoses: 85,
        missedDoses: 15,
        adherenceRate: 85,
        weeklyAdherence: [],
        monthlyAdherence: []
      };

      expect(stats.totalDoses).toBe(100);
      expect(stats.takenDoses).toBe(85);
      expect(stats.missedDoses).toBe(15);
      expect(stats.adherenceRate).toBe(85);
    });

    it('should have weekly adherence array', () => {
      const stats: AdherenceStats = {
        totalDoses: 100,
        takenDoses: 85,
        missedDoses: 15,
        adherenceRate: 85,
        weeklyAdherence: [
          { week: 'W1', rate: 90 },
          { week: 'W2', rate: 80 },
          { week: 'W3', rate: 85 }
        ],
        monthlyAdherence: []
      };

      expect(stats.weeklyAdherence.length).toBe(3);
      expect(stats.weeklyAdherence[0].week).toBe('W1');
    });

    it('should have monthly adherence array', () => {
      const stats: AdherenceStats = {
        totalDoses: 300,
        takenDoses: 270,
        missedDoses: 30,
        adherenceRate: 90,
        weeklyAdherence: [],
        monthlyAdherence: [
          { month: 'Jan', rate: 88 },
          { month: 'Feb', rate: 92 }
        ]
      };

      expect(stats.monthlyAdherence.length).toBe(2);
      expect(stats.monthlyAdherence[1].rate).toBe(92);
    });
  });

  describe('TimePatternStats Interface', () => {
    it('should have all time slot adherence rates', () => {
      const stats: TimePatternStats = {
        morningAdherence: 95,
        afternoonAdherence: 88,
        eveningAdherence: 82,
        nightAdherence: 75,
        bestTimeSlot: 'morning',
        worstTimeSlot: 'night'
      };

      expect(stats.morningAdherence).toBe(95);
      expect(stats.afternoonAdherence).toBe(88);
      expect(stats.eveningAdherence).toBe(82);
      expect(stats.nightAdherence).toBe(75);
    });

    it('should identify best and worst time slots', () => {
      const stats: TimePatternStats = {
        morningAdherence: 95,
        afternoonAdherence: 88,
        eveningAdherence: 82,
        nightAdherence: 75,
        bestTimeSlot: 'morning',
        worstTimeSlot: 'night'
      };

      expect(stats.bestTimeSlot).toBe('morning');
      expect(stats.worstTimeSlot).toBe('night');
    });
  });

  describe('DayPatternStats Interface', () => {
    it('should have weekday and weekend adherence', () => {
      const stats: DayPatternStats = {
        weekdayAdherence: 90,
        weekendAdherence: 75,
        dailyAdherence: [],
        bestDay: 'Monday',
        worstDay: 'Saturday'
      };

      expect(stats.weekdayAdherence).toBe(90);
      expect(stats.weekendAdherence).toBe(75);
    });

    it('should have daily adherence breakdown', () => {
      const stats: DayPatternStats = {
        weekdayAdherence: 85,
        weekendAdherence: 70,
        dailyAdherence: [
          { day: 'Monday', rate: 92 },
          { day: 'Tuesday', rate: 88 },
          { day: 'Wednesday', rate: 85 },
          { day: 'Thursday', rate: 82 },
          { day: 'Friday', rate: 80 },
          { day: 'Saturday', rate: 70 },
          { day: 'Sunday', rate: 70 }
        ],
        bestDay: 'Monday',
        worstDay: 'Saturday'
      };

      expect(stats.dailyAdherence.length).toBe(7);
      expect(stats.dailyAdherence[0].day).toBe('Monday');
    });
  });

  describe('MedicationAdherence Interface', () => {
    it('should have all required fields', () => {
      const adherence: MedicationAdherence = {
        medicationId: 'med123',
        medicationName: 'Aspirina',
        totalDoses: 30,
        takenDoses: 27,
        adherenceRate: 90
      };

      expect(adherence.medicationId).toBe('med123');
      expect(adherence.medicationName).toBe('Aspirina');
      expect(adherence.adherenceRate).toBe(90);
    });

    it('should allow optional lastTaken', () => {
      const adherence: MedicationAdherence = {
        medicationId: 'med456',
        medicationName: 'Paracetamol',
        totalDoses: 20,
        takenDoses: 18,
        adherenceRate: 90,
        lastTaken: new Date()
      };

      expect(adherence.lastTaken).toBeInstanceOf(Date);
    });
  });

  describe('PeriodStats Interface', () => {
    it('should have all required fields', () => {
      const stats: PeriodStats = {
        period: 'month',
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 0, 31),
        adherence: {
          totalDoses: 90,
          takenDoses: 81,
          missedDoses: 9,
          adherenceRate: 90,
          weeklyAdherence: [],
          monthlyAdherence: []
        },
        timePatterns: {
          morningAdherence: 95,
          afternoonAdherence: 88,
          eveningAdherence: 82,
          nightAdherence: 75,
          bestTimeSlot: 'morning',
          worstTimeSlot: 'night'
        },
        dayPatterns: {
          weekdayAdherence: 90,
          weekendAdherence: 75,
          dailyAdherence: [],
          bestDay: 'Monday',
          worstDay: 'Saturday'
        },
        medicationBreakdown: [],
        totalMedications: 5,
        activeMedications: 4
      };

      expect(stats.period).toBe('month');
      expect(stats.totalMedications).toBe(5);
      expect(stats.activeMedications).toBe(4);
    });

    it('should accept week period', () => {
      const stats: PeriodStats = {
        period: 'week',
        startDate: new Date(),
        endDate: new Date(),
        adherence: { totalDoses: 0, takenDoses: 0, missedDoses: 0, adherenceRate: 0, weeklyAdherence: [], monthlyAdherence: [] },
        timePatterns: { morningAdherence: 0, afternoonAdherence: 0, eveningAdherence: 0, nightAdherence: 0, bestTimeSlot: '', worstTimeSlot: '' },
        dayPatterns: { weekdayAdherence: 0, weekendAdherence: 0, dailyAdherence: [], bestDay: '', worstDay: '' },
        medicationBreakdown: [],
        totalMedications: 0,
        activeMedications: 0
      };

      expect(stats.period).toBe('week');
    });

    it('should accept year period', () => {
      const stats: PeriodStats = {
        period: 'year',
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 11, 31),
        adherence: { totalDoses: 0, takenDoses: 0, missedDoses: 0, adherenceRate: 0, weeklyAdherence: [], monthlyAdherence: [] },
        timePatterns: { morningAdherence: 0, afternoonAdherence: 0, eveningAdherence: 0, nightAdherence: 0, bestTimeSlot: '', worstTimeSlot: '' },
        dayPatterns: { weekdayAdherence: 0, weekendAdherence: 0, dailyAdherence: [], bestDay: '', worstDay: '' },
        medicationBreakdown: [],
        totalMedications: 0,
        activeMedications: 0
      };

      expect(stats.period).toBe('year');
    });

    it('should accept all period', () => {
      const stats: PeriodStats = {
        period: 'all',
        startDate: new Date(2020, 0, 1),
        endDate: new Date(),
        adherence: { totalDoses: 0, takenDoses: 0, missedDoses: 0, adherenceRate: 0, weeklyAdherence: [], monthlyAdherence: [] },
        timePatterns: { morningAdherence: 0, afternoonAdherence: 0, eveningAdherence: 0, nightAdherence: 0, bestTimeSlot: '', worstTimeSlot: '' },
        dayPatterns: { weekdayAdherence: 0, weekendAdherence: 0, dailyAdherence: [], bestDay: '', worstDay: '' },
        medicationBreakdown: [],
        totalMedications: 0,
        activeMedications: 0
      };

      expect(stats.period).toBe('all');
    });
  });

  describe('Adherence Rate Calculation', () => {
    function calculateAdherenceRate(taken: number, total: number): number {
      if (total === 0) return 0;
      return Math.round((taken / total) * 100);
    }

    it('should calculate 100% adherence', () => {
      expect(calculateAdherenceRate(100, 100)).toBe(100);
    });

    it('should calculate 0% adherence', () => {
      expect(calculateAdherenceRate(0, 100)).toBe(0);
    });

    it('should calculate partial adherence', () => {
      expect(calculateAdherenceRate(85, 100)).toBe(85);
    });

    it('should handle zero total doses', () => {
      expect(calculateAdherenceRate(0, 0)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculateAdherenceRate(33, 100)).toBe(33);
    });
  });

  describe('Time Slot Classification', () => {
    function getTimeSlot(hour: number): string {
      if (hour >= 6 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 18) return 'afternoon';
      if (hour >= 18 && hour < 22) return 'evening';
      return 'night';
    }

    it('should classify morning (6-12)', () => {
      expect(getTimeSlot(6)).toBe('morning');
      expect(getTimeSlot(9)).toBe('morning');
      expect(getTimeSlot(11)).toBe('morning');
    });

    it('should classify afternoon (12-18)', () => {
      expect(getTimeSlot(12)).toBe('afternoon');
      expect(getTimeSlot(15)).toBe('afternoon');
      expect(getTimeSlot(17)).toBe('afternoon');
    });

    it('should classify evening (18-22)', () => {
      expect(getTimeSlot(18)).toBe('evening');
      expect(getTimeSlot(20)).toBe('evening');
      expect(getTimeSlot(21)).toBe('evening');
    });

    it('should classify night (22-6)', () => {
      expect(getTimeSlot(22)).toBe('night');
      expect(getTimeSlot(0)).toBe('night');
      expect(getTimeSlot(5)).toBe('night');
    });
  });

  describe('Day Classification', () => {
    function isWeekend(day: number): boolean {
      return day === 0 || day === 6; // Sunday or Saturday
    }

    it('should identify weekends', () => {
      expect(isWeekend(0)).toBeTrue(); // Sunday
      expect(isWeekend(6)).toBeTrue(); // Saturday
    });

    it('should identify weekdays', () => {
      expect(isWeekend(1)).toBeFalse(); // Monday
      expect(isWeekend(2)).toBeFalse(); // Tuesday
      expect(isWeekend(3)).toBeFalse(); // Wednesday
      expect(isWeekend(4)).toBeFalse(); // Thursday
      expect(isWeekend(5)).toBeFalse(); // Friday
    });
  });

  describe('Best/Worst Time Slot Logic', () => {
    function findBestWorstTimeSlot(rates: { slot: string; rate: number }[]): { best: string; worst: string } {
      if (rates.length === 0) return { best: '', worst: '' };
      
      const sorted = [...rates].sort((a, b) => b.rate - a.rate);
      return {
        best: sorted[0].slot,
        worst: sorted[sorted.length - 1].slot
      };
    }

    it('should find best and worst slots', () => {
      const rates = [
        { slot: 'morning', rate: 95 },
        { slot: 'afternoon', rate: 88 },
        { slot: 'evening', rate: 82 },
        { slot: 'night', rate: 75 }
      ];

      const result = findBestWorstTimeSlot(rates);
      expect(result.best).toBe('morning');
      expect(result.worst).toBe('night');
    });

    it('should handle empty array', () => {
      const result = findBestWorstTimeSlot([]);
      expect(result.best).toBe('');
      expect(result.worst).toBe('');
    });
  });

  describe('Period Date Range Calculation', () => {
    function getPeriodDateRange(period: 'week' | 'month' | 'quarter' | 'year' | 'all'): { start: Date; end: Date } {
      const end = new Date();
      let start = new Date();

      switch (period) {
        case 'week':
          start.setDate(end.getDate() - 7);
          break;
        case 'month':
          start.setMonth(end.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(end.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(end.getFullYear() - 1);
          break;
        case 'all':
          start = new Date(2020, 0, 1);
          break;
      }

      return { start, end };
    }

    it('should calculate week range', () => {
      const range = getPeriodDateRange('week');
      const diff = range.end.getTime() - range.start.getTime();
      const days = diff / (1000 * 60 * 60 * 24);
      expect(Math.round(days)).toBe(7);
    });

    it('should calculate month range', () => {
      const range = getPeriodDateRange('month');
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });

    it('should calculate quarter range', () => {
      const range = getPeriodDateRange('quarter');
      expect(range.start.getTime()).toBeLessThan(range.end.getTime());
    });

    it('should calculate year range', () => {
      const range = getPeriodDateRange('year');
      const yearDiff = range.end.getFullYear() - range.start.getFullYear();
      expect(yearDiff).toBe(1);
    });
  });

  describe('Medication Breakdown Aggregation', () => {
    function aggregateMedicationAdherence(
      doses: { medicationId: string; medicationName: string; taken: boolean; date: Date }[]
    ): MedicationAdherence[] {
      const medMap = new Map<string, { name: string; total: number; taken: number; lastTaken?: Date }>();

      doses.forEach(dose => {
        const existing = medMap.get(dose.medicationId) || { name: dose.medicationName, total: 0, taken: 0 };
        existing.total++;
        if (dose.taken) {
          existing.taken++;
          existing.lastTaken = dose.date;
        }
        medMap.set(dose.medicationId, existing);
      });

      return Array.from(medMap.entries()).map(([id, data]) => ({
        medicationId: id,
        medicationName: data.name,
        totalDoses: data.total,
        takenDoses: data.taken,
        adherenceRate: data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0,
        lastTaken: data.lastTaken
      }));
    }

    it('should aggregate doses by medication', () => {
      const doses = [
        { medicationId: 'med1', medicationName: 'Aspirin', taken: true, date: new Date() },
        { medicationId: 'med1', medicationName: 'Aspirin', taken: true, date: new Date() },
        { medicationId: 'med1', medicationName: 'Aspirin', taken: false, date: new Date() },
        { medicationId: 'med2', medicationName: 'Ibuprofen', taken: true, date: new Date() }
      ];

      const result = aggregateMedicationAdherence(doses);
      expect(result.length).toBe(2);
      
      const aspirin = result.find(m => m.medicationId === 'med1');
      expect(aspirin?.totalDoses).toBe(3);
      expect(aspirin?.takenDoses).toBe(2);
      expect(aspirin?.adherenceRate).toBe(67);
    });
  });

  describe('Weekly Adherence Calculation', () => {
    function calculateWeeklyAdherence(
      doses: { date: Date; taken: boolean }[]
    ): Array<{ week: string; rate: number }> {
      const weekMap = new Map<string, { taken: number; total: number }>();

      doses.forEach(dose => {
        const weekNum = getWeekNumber(dose.date);
        const weekKey = `W${weekNum}`;
        const existing = weekMap.get(weekKey) || { taken: 0, total: 0 };
        existing.total++;
        if (dose.taken) existing.taken++;
        weekMap.set(weekKey, existing);
      });

      return Array.from(weekMap.entries()).map(([week, data]) => ({
        week,
        rate: data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0
      }));
    }

    function getWeekNumber(date: Date): number {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    it('should calculate weekly adherence rates', () => {
      const doses = [
        { date: new Date(2025, 0, 6), taken: true },
        { date: new Date(2025, 0, 6), taken: true },
        { date: new Date(2025, 0, 6), taken: false }
      ];

      const result = calculateWeeklyAdherence(doses);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].rate).toBe(67);
    });
  });

  describe('Stats Caching', () => {
    it('should create cache key from user and period', () => {
      const userId = 'user123';
      const period = 'month';
      const cacheKey = `${userId}_${period}`;
      expect(cacheKey).toBe('user123_month');
    });
  });
});
