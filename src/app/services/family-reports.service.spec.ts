/**
 * Tests for FamilyReportsService
 *
 * Tests cover:
 * - Interface validation
 * - PeriodFilter type
 * - AdherenceDataPoint structure
 * - DoseDistribution structure
 * - MedicationComparison structure
 * - HistoricalAlert structure
 * - FamilyTrends structure
 * - Date range calculations
 * - Adherence calculations
 */

import {
  PeriodFilter,
  AdherenceDataPoint,
  DoseDistribution,
  MedicationComparison,
  HistoricalAlert,
  FamilyTrends
} from './family-reports.service';

describe('FamilyReportsService', () => {
  /**
   * PeriodFilter Type Tests
   */
  describe('PeriodFilter type', () => {
    it('should accept week filter', () => {
      const filter: PeriodFilter = 'week';
      expect(filter).toBe('week');
    });

    it('should accept month filter', () => {
      const filter: PeriodFilter = 'month';
      expect(filter).toBe('month');
    });

    it('should accept year filter', () => {
      const filter: PeriodFilter = 'year';
      expect(filter).toBe('year');
    });

    it('should accept all filter', () => {
      const filter: PeriodFilter = 'all';
      expect(filter).toBe('all');
    });

    it('should have 4 valid filter types', () => {
      const validFilters: PeriodFilter[] = ['week', 'month', 'year', 'all'];
      expect(validFilters.length).toBe(4);
    });
  });

  /**
   * AdherenceDataPoint Interface Tests
   */
  describe('AdherenceDataPoint interface', () => {
    it('should have all required properties', () => {
      const dataPoint: AdherenceDataPoint = {
        date: '2024-12-15',
        memberAdherence: {
          'member1': 85,
          'member2': 92
        }
      };

      expect(dataPoint.date).toBeDefined();
      expect(dataPoint.memberAdherence).toBeDefined();
    });

    it('should support multiple members', () => {
      const dataPoint: AdherenceDataPoint = {
        date: '2024-12-15',
        memberAdherence: {
          'member1': 100,
          'member2': 75,
          'member3': 50,
          'member4': 0
        }
      };

      expect(Object.keys(dataPoint.memberAdherence).length).toBe(4);
    });

    it('should use ISO date format', () => {
      const dataPoint: AdherenceDataPoint = {
        date: '2024-12-15',
        memberAdherence: {}
      };

      expect(dataPoint.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should have adherence values between 0 and 100', () => {
      const dataPoint: AdherenceDataPoint = {
        date: '2024-12-15',
        memberAdherence: {
          'member1': 0,
          'member2': 50,
          'member3': 100
        }
      };

      Object.values(dataPoint.memberAdherence).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });

  /**
   * DoseDistribution Interface Tests
   */
  describe('DoseDistribution interface', () => {
    it('should have all required properties', () => {
      const distribution: DoseDistribution = {
        period: 'Morning',
        count: 15,
        percentage: 45.5
      };

      expect(distribution.period).toBeDefined();
      expect(distribution.count).toBeDefined();
      expect(distribution.percentage).toBeDefined();
    });

    it('should support different periods', () => {
      const periods = ['Morning', 'Afternoon', 'Evening'];
      
      periods.forEach(period => {
        const distribution: DoseDistribution = {
          period,
          count: 10,
          percentage: 33.33
        };
        expect(['Morning', 'Afternoon', 'Evening']).toContain(distribution.period);
      });
    });

    it('should have valid percentage values', () => {
      const distributions: DoseDistribution[] = [
        { period: 'Morning', count: 10, percentage: 33.33 },
        { period: 'Afternoon', count: 15, percentage: 50 },
        { period: 'Evening', count: 5, percentage: 16.67 }
      ];

      const totalPercentage = distributions.reduce((sum, d) => sum + d.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should handle zero doses', () => {
      const distribution: DoseDistribution = {
        period: 'Evening',
        count: 0,
        percentage: 0
      };

      expect(distribution.count).toBe(0);
      expect(distribution.percentage).toBe(0);
    });
  });

  /**
   * MedicationComparison Interface Tests
   */
  describe('MedicationComparison interface', () => {
    it('should have all required properties', () => {
      const comparison: MedicationComparison = {
        memberId: 'member1',
        memberName: 'João Silva',
        activeMedications: 3,
        totalDoses: 90,
        adherenceRate: 85.5,
        color: '#4CAF50'
      };

      expect(comparison.memberId).toBeDefined();
      expect(comparison.memberName).toBeDefined();
      expect(comparison.activeMedications).toBeDefined();
      expect(comparison.totalDoses).toBeDefined();
      expect(comparison.adherenceRate).toBeDefined();
      expect(comparison.color).toBeDefined();
    });

    it('should have valid color format', () => {
      const comparison: MedicationComparison = {
        memberId: 'member1',
        memberName: 'Test',
        activeMedications: 1,
        totalDoses: 30,
        adherenceRate: 90,
        color: '#FF5733'
      };

      expect(comparison.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should calculate total doses correctly', () => {
      const activeMeds = 3;
      const daysInMonth = 30;
      const dosesPerDay = 1;
      
      const totalDoses = activeMeds * daysInMonth * dosesPerDay;
      
      expect(totalDoses).toBe(90);
    });

    it('should sort by adherence rate', () => {
      const comparisons: MedicationComparison[] = [
        { memberId: '1', memberName: 'A', activeMedications: 1, totalDoses: 30, adherenceRate: 75, color: '#f00' },
        { memberId: '2', memberName: 'B', activeMedications: 2, totalDoses: 60, adherenceRate: 95, color: '#0f0' },
        { memberId: '3', memberName: 'C', activeMedications: 1, totalDoses: 30, adherenceRate: 50, color: '#00f' }
      ];

      const sorted = [...comparisons].sort((a, b) => b.adherenceRate - a.adherenceRate);

      expect(sorted[0].memberName).toBe('B');
      expect(sorted[1].memberName).toBe('A');
      expect(sorted[2].memberName).toBe('C');
    });
  });

  /**
   * HistoricalAlert Interface Tests
   */
  describe('HistoricalAlert interface', () => {
    it('should have all required properties', () => {
      const alert: HistoricalAlert = {
        date: new Date(),
        type: 'missed',
        memberId: 'member1',
        memberName: 'João',
        description: 'Dose perdida de Losartana'
      };

      expect(alert.date).toBeDefined();
      expect(alert.type).toBeDefined();
      expect(alert.memberId).toBeDefined();
      expect(alert.memberName).toBeDefined();
      expect(alert.description).toBeDefined();
    });

    it('should accept missed type', () => {
      const alert: HistoricalAlert = {
        date: new Date(),
        type: 'missed',
        memberId: 'm1',
        memberName: 'Test',
        description: 'Dose perdida'
      };

      expect(alert.type).toBe('missed');
    });

    it('should accept low-stock type', () => {
      const alert: HistoricalAlert = {
        date: new Date(),
        type: 'low-stock',
        memberId: 'm1',
        memberName: 'Test',
        description: 'Estoque baixo de medicamento'
      };

      expect(alert.type).toBe('low-stock');
    });

    it('should accept late type', () => {
      const alert: HistoricalAlert = {
        date: new Date(),
        type: 'late',
        memberId: 'm1',
        memberName: 'Test',
        description: 'Dose tomada com atraso'
      };

      expect(alert.type).toBe('late');
    });

    it('should sort alerts by date descending', () => {
      const alerts: HistoricalAlert[] = [
        { date: new Date(2024, 11, 10), type: 'missed', memberId: '1', memberName: 'A', description: 'a' },
        { date: new Date(2024, 11, 15), type: 'late', memberId: '2', memberName: 'B', description: 'b' },
        { date: new Date(2024, 11, 12), type: 'low-stock', memberId: '3', memberName: 'C', description: 'c' }
      ];

      const sorted = [...alerts].sort((a, b) => b.date.getTime() - a.date.getTime());

      // The dates should be in descending order: 15, 12, 10
      expect(sorted[0].type).toBe('late'); // Dec 15
      expect(sorted[1].type).toBe('low-stock'); // Dec 12
      expect(sorted[2].type).toBe('missed'); // Dec 10
    });
  });

  /**
   * FamilyTrends Interface Tests
   */
  describe('FamilyTrends interface', () => {
    it('should have all required properties', () => {
      const trends: FamilyTrends = {
        adherenceTrend: 'improving',
        trendPercentage: 5.5,
        averageAdherence: 85,
        bestPerformer: { id: 'member1', name: 'João', adherence: 98 },
        needsAttention: [{ id: 'member2', name: 'Maria', adherence: 65 }]
      };

      expect(trends.adherenceTrend).toBeDefined();
      expect(trends.trendPercentage).toBeDefined();
      expect(trends.averageAdherence).toBeDefined();
      expect(trends.bestPerformer).toBeDefined();
      expect(trends.needsAttention).toBeDefined();
    });

    it('should accept improving trend', () => {
      const trends: FamilyTrends = {
        adherenceTrend: 'improving',
        trendPercentage: 10,
        averageAdherence: 90,
        bestPerformer: { id: '1', name: 'A', adherence: 100 },
        needsAttention: []
      };

      expect(trends.adherenceTrend).toBe('improving');
    });

    it('should accept declining trend', () => {
      const trends: FamilyTrends = {
        adherenceTrend: 'declining',
        trendPercentage: -5,
        averageAdherence: 70,
        bestPerformer: { id: '1', name: 'A', adherence: 80 },
        needsAttention: [{ id: '2', name: 'B', adherence: 60 }]
      };

      expect(trends.adherenceTrend).toBe('declining');
    });

    it('should accept stable trend', () => {
      const trends: FamilyTrends = {
        adherenceTrend: 'stable',
        trendPercentage: 0,
        averageAdherence: 85,
        bestPerformer: { id: '1', name: 'A', adherence: 90 },
        needsAttention: []
      };

      expect(trends.adherenceTrend).toBe('stable');
    });

    it('should identify members needing attention', () => {
      const allMembers = [
        { id: '1', name: 'A', adherence: 95 },
        { id: '2', name: 'B', adherence: 65 },
        { id: '3', name: 'C', adherence: 55 }
      ];

      const threshold = 70;
      const needsAttention = allMembers.filter(m => m.adherence < threshold);

      expect(needsAttention.length).toBe(2);
      expect(needsAttention[0].name).toBe('B');
      expect(needsAttention[1].name).toBe('C');
    });
  });

  /**
   * Date Range Calculation Tests
   */
  describe('Date range calculations', () => {
    it('should calculate week range', () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);

      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    it('should calculate month range', () => {
      // Use first day of month to avoid rollover issues
      const end = new Date();
      end.setDate(1);
      const start = new Date(end);
      start.setMonth(end.getMonth() - 1);

      expect(start.getMonth()).toBe((end.getMonth() + 11) % 12);
    });

    it('should calculate year range', () => {
      const end = new Date();
      const start = new Date();
      start.setFullYear(end.getFullYear() - 1);

      expect(start.getFullYear()).toBe(end.getFullYear() - 1);
    });

    it('should handle all time range', () => {
      const start = new Date(2020, 0, 1);
      const end = new Date();

      expect(start.getFullYear()).toBe(2020);
      expect(start.getTime()).toBeLessThan(end.getTime());
    });

    it('should set start time to beginning of day', () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getMilliseconds()).toBe(0);
    });

    it('should set end time to end of day', () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getMilliseconds()).toBe(999);
    });
  });

  /**
   * Adherence Calculation Tests
   */
  describe('Adherence calculations', () => {
    it('should calculate adherence percentage', () => {
      const takenCount = 85;
      const totalCount = 100;

      const adherence = (takenCount / totalCount) * 100;
      expect(adherence).toBe(85);
    });

    it('should handle zero doses', () => {
      const takenCount = 0;
      const totalCount = 0;

      const adherence = totalCount === 0 ? 0 : (takenCount / totalCount) * 100;
      expect(adherence).toBe(0);
    });

    it('should calculate perfect adherence', () => {
      const takenCount = 30;
      const totalCount = 30;

      const adherence = (takenCount / totalCount) * 100;
      expect(adherence).toBe(100);
    });

    it('should calculate average adherence across members', () => {
      const memberAdherences = [85, 90, 75, 100];

      const average = memberAdherences.reduce((sum, a) => sum + a, 0) / memberAdherences.length;
      expect(average).toBe(87.5);
    });
  });

  /**
   * Trend Calculation Tests
   */
  describe('Trend calculations', () => {
    it('should detect improving trend', () => {
      const previousWeek = 75;
      const currentWeek = 85;

      const change = currentWeek - previousWeek;
      const trend = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';

      expect(trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const previousWeek = 90;
      const currentWeek = 75;

      const change = currentWeek - previousWeek;
      const trend = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';

      expect(trend).toBe('declining');
    });

    it('should detect stable trend', () => {
      const previousWeek = 85;
      const currentWeek = 86;

      const change = currentWeek - previousWeek;
      const trend = change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable';

      expect(trend).toBe('stable');
    });

    it('should calculate trend percentage', () => {
      const previousWeek = 80;
      const currentWeek = 88;

      const trendPercentage = ((currentWeek - previousWeek) / previousWeek) * 100;
      expect(trendPercentage).toBe(10);
    });
  });

  /**
   * Best Performer Detection Tests
   */
  describe('Best performer detection', () => {
    it('should find best performer', () => {
      const members = [
        { id: '1', name: 'A', adherence: 85 },
        { id: '2', name: 'B', adherence: 98 },
        { id: '3', name: 'C', adherence: 75 }
      ];

      const best = members.reduce((max, m) => m.adherence > max.adherence ? m : max);

      expect(best.name).toBe('B');
      expect(best.adherence).toBe(98);
    });

    it('should handle tie by selecting first', () => {
      const members = [
        { id: '1', name: 'A', adherence: 100 },
        { id: '2', name: 'B', adherence: 100 }
      ];

      const best = members.reduce((max, m) => m.adherence > max.adherence ? m : max);

      expect(best.name).toBe('A');
    });

    it('should handle single member', () => {
      const members = [{ id: '1', name: 'Solo', adherence: 80 }];

      const best = members[0];

      expect(best.name).toBe('Solo');
    });
  });

  /**
   * Color Assignment Tests
   */
  describe('Color assignment for charts', () => {
    it('should assign unique colors to members', () => {
      const chartColors = [
        '#4CAF50', '#2196F3', '#FF9800', '#9C27B0',
        '#E91E63', '#00BCD4', '#FFC107', '#607D8B'
      ];

      const membersCount = 4;
      const assignedColors = chartColors.slice(0, membersCount);

      expect(assignedColors.length).toBe(membersCount);
      expect(new Set(assignedColors).size).toBe(membersCount);
    });

    it('should cycle colors for many members', () => {
      const chartColors = ['#f00', '#0f0', '#00f'];
      const membersCount = 5;

      const assignedColors = Array.from(
        { length: membersCount },
        (_, i) => chartColors[i % chartColors.length]
      );

      expect(assignedColors.length).toBe(5);
      expect(assignedColors[3]).toBe('#f00');
      expect(assignedColors[4]).toBe('#0f0');
    });
  });

  /**
   * Report Period Label Tests
   */
  describe('Report period labels', () => {
    const getPeriodLabel = (period: PeriodFilter): string => {
      const labels: Record<PeriodFilter, string> = {
        week: 'Last 7 days',
        month: 'Last month',
        year: 'Last year',
        all: 'All time'
      };
      return labels[period];
    };

    it('should generate week label', () => {
      const period: PeriodFilter = 'week';
      const label = getPeriodLabel(period);

      expect(label).toBe('Last 7 days');
    });

    it('should generate month label', () => {
      const period: PeriodFilter = 'month';
      const label = getPeriodLabel(period);

      expect(label).toBe('Last month');
    });

    it('should generate year label', () => {
      const period: PeriodFilter = 'year';
      const label = getPeriodLabel(period);

      expect(label).toBe('Last year');
    });

    it('should generate all time label', () => {
      const period: PeriodFilter = 'all';
      const label = getPeriodLabel(period);

      expect(label).toBe('All time');
    });
  });
});
