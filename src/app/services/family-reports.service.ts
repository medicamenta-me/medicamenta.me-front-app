import { Injectable, inject, computed, signal } from '@angular/core';
import { FamilyService } from './family.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';

/**
 * Period Filter Type
 */
export type PeriodFilter = 'week' | 'month' | 'year' | 'all';

/**
 * Adherence Timeline Data Point
 */
export interface AdherenceDataPoint {
  date: string;
  memberAdherence: { [memberId: string]: number };
}

/**
 * Dose Distribution by Period
 */
export interface DoseDistribution {
  period: string; // Morning, Afternoon, Evening
  count: number;
  percentage: number;
}

/**
 * Medication Comparison Data
 */
export interface MedicationComparison {
  memberId: string;
  memberName: string;
  activeMedications: number;
  totalDoses: number;
  adherenceRate: number;
  color: string;
}

/**
 * Historical Alert
 */
export interface HistoricalAlert {
  date: Date;
  type: 'missed' | 'low-stock' | 'late';
  memberId: string;
  memberName: string;
  description: string;
}

/**
 * Family Trends
 */
export interface FamilyTrends {
  adherenceTrend: 'improving' | 'declining' | 'stable';
  trendPercentage: number;
  averageAdherence: number;
  bestPerformer: { id: string; name: string; adherence: number };
  needsAttention: { id: string; name: string; adherence: number }[];
}

/**
 * Family Reports Service
 * Gera métricas avançadas e dados para relatórios familiares
 */
@Injectable({
  providedIn: 'root'
})
export class FamilyReportsService {
  private readonly familyService = inject(FamilyService);
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);

  // Selected period filter
  private readonly _selectedPeriod = signal<PeriodFilter>('month');
  public readonly selectedPeriod = this._selectedPeriod.asReadonly();

  /**
   * Set period filter
   */
  setPeriod(period: PeriodFilter): void {
    this._selectedPeriod.set(period);
  }

  /**
   * Get date range based on selected period
   */
  private getDateRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    
    switch (this._selectedPeriod()) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020, 0, 1); // Start from 2020
        break;
    }
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }

  /**
   * Adherence Timeline Data
   * Adesão ao longo do tempo por membro
   */
  public readonly adherenceTimeline = computed<AdherenceDataPoint[]>(() => {
    const { start, end } = this.getDateRange();
    const members = this.familyService.familyMembers();
    const logs = this.logService.logs();
    
    // Generate data points for each day in the range
    const dataPoints: AdherenceDataPoint[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const memberAdherence: { [key: string]: number } = {};
      
      members.forEach(member => {
        // Get logs for this member on this date
        const memberLogs = logs.filter(log => {
          const logDate = new Date(log.timestamp);
          return log.userId === member.id &&
                 logDate.toISOString().split('T')[0] === dateStr &&
                 (log.eventType === 'taken' || log.eventType === 'missed');
        });
        
        if (memberLogs.length > 0) {
          const takenCount = memberLogs.filter(l => l.eventType === 'taken').length;
          memberAdherence[member.id] = (takenCount / memberLogs.length) * 100;
        } else {
          memberAdherence[member.id] = 0;
        }
      });
      
      dataPoints.push({
        date: dateStr,
        memberAdherence
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dataPoints;
  });

  /**
   * Distribuição de doses por período do dia
   */
  public readonly doseDistribution = computed<DoseDistribution[]>(() => {
    const medications = this.medicationService.medications();
    
    let morningCount = 0;
    let afternoonCount = 0;
    let eveningCount = 0;
    
    medications.forEach((med: any) => {
      med.schedule.forEach((dose: any) => {
        const hour = parseInt(dose.time.split(':')[0]);
        
        if (hour >= 5 && hour < 12) {
          morningCount++;
        } else if (hour >= 12 && hour < 18) {
          afternoonCount++;
        } else {
          eveningCount++;
        }
      });
    });
    
    const total = morningCount + afternoonCount + eveningCount;
    
    return [
      {
        period: 'Manhã',
        count: morningCount,
        percentage: total > 0 ? (morningCount / total) * 100 : 0
      },
      {
        period: 'Tarde',
        count: afternoonCount,
        percentage: total > 0 ? (afternoonCount / total) * 100 : 0
      },
      {
        period: 'Noite',
        count: eveningCount,
        percentage: total > 0 ? (eveningCount / total) * 100 : 0
      }
    ];
  });

  /**
   * Medication Comparison by Member
   */
  public readonly medicationComparison = computed<MedicationComparison[]>(() => {
    const members = this.familyService.familyMembers();
    const medications = this.medicationService.medications();
    const logs = this.logService.logs();
    const { start, end } = this.getDateRange();
    
    return members.map(member => {
      const memberMeds = medications.filter((m: any) => m.userId === member.id);
      const totalDoses = memberMeds.reduce((sum: number, med: any) => sum + med.schedule.length, 0);
      
      // Calculate adherence from logs
      const memberLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return log.userId === member.id &&
               logDate >= start &&
               logDate <= end &&
               (log.eventType === 'taken' || log.eventType === 'missed');
      });
      
      const takenLogs = memberLogs.filter(l => l.eventType === 'taken').length;
      const adherenceRate = memberLogs.length > 0 ? (takenLogs / memberLogs.length) * 100 : 0;
      
      return {
        memberId: member.id,
        memberName: member.name,
        activeMedications: memberMeds.length,
        totalDoses,
        adherenceRate,
        color: this.familyService.getMemberColor(member.id)
      };
    });
  });

  /**
   * Historical Alerts
   */
  public readonly historicalAlerts = computed<HistoricalAlert[]>(() => {
    const { start, end } = this.getDateRange();
    const logs = this.logService.logs();
    const members = this.familyService.familyMembers();
    const medications = this.medicationService.medications();
    
    const alerts: HistoricalAlert[] = [];
    
    // Missed doses
    logs
      .filter(log => {
        const logDate = new Date(log.timestamp);
        return log.eventType === 'missed' && logDate >= start && logDate <= end;
      })
      .forEach(log => {
        const member = members.find(m => m.id === log.userId);
        
        if (member) {
          alerts.push({
            date: new Date(log.timestamp),
            type: 'missed',
            memberId: member.id,
            memberName: member.name,
            description: log.message // Use the log message directly
          });
        }
      });
    
    // Sort by date (newest first)
    return alerts.sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  /**
   * Family Trends Analysis
   */
  public readonly familyTrends = computed<FamilyTrends>(() => {
    const timeline = this.adherenceTimeline();
    const comparison = this.medicationComparison();
    
    if (timeline.length === 0 || comparison.length === 0) {
      return {
        adherenceTrend: 'stable',
        trendPercentage: 0,
        averageAdherence: 0,
        bestPerformer: { id: '', name: 'N/A', adherence: 0 },
        needsAttention: []
      };
    }
    
    // Calculate average adherence
    const totalAdherence = comparison.reduce((sum, m) => sum + m.adherenceRate, 0);
    const averageAdherence = totalAdherence / comparison.length;
    
    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(timeline.length / 2);
    const firstHalf = timeline.slice(0, midPoint);
    const secondHalf = timeline.slice(midPoint);
    
    const firstHalfAvg = this.calculateAverageAdherence(firstHalf);
    const secondHalfAvg = this.calculateAverageAdherence(secondHalf);
    
    const trendPercentage = secondHalfAvg - firstHalfAvg;
    let adherenceTrend: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (trendPercentage > 5) {
      adherenceTrend = 'improving';
    } else if (trendPercentage < -5) {
      adherenceTrend = 'declining';
    }
    
    // Best performer
    const sorted = [...comparison].sort((a, b) => b.adherenceRate - a.adherenceRate);
    const bestPerformer = sorted[0]
      ? { id: sorted[0].memberId, name: sorted[0].memberName, adherence: sorted[0].adherenceRate }
      : { id: '', name: 'N/A', adherence: 0 };
    
    // Members needing attention (adherence < 70%)
    const needsAttention = comparison
      .filter(m => m.adherenceRate < 70)
      .map(m => ({ id: m.memberId, name: m.memberName, adherence: m.adherenceRate }));
    
    return {
      adherenceTrend,
      trendPercentage,
      averageAdherence,
      bestPerformer,
      needsAttention
    };
  });

  /**
   * Calculate average adherence for a timeline segment
   */
  private calculateAverageAdherence(timeline: AdherenceDataPoint[]): number {
    if (timeline.length === 0) return 0;
    
    const members = this.familyService.familyMembers();
    let totalAdherence = 0;
    let count = 0;
    
    timeline.forEach(point => {
      members.forEach(member => {
        if (point.memberAdherence[member.id] !== undefined) {
          totalAdherence += point.memberAdherence[member.id];
          count++;
        }
      });
    });
    
    return count > 0 ? totalAdherence / count : 0;
  }

  /**
   * Get summary statistics
   */
  public readonly summaryStats = computed(() => {
    const { start, end } = this.getDateRange();
    const logs = this.logService.logs();
    const members = this.familyService.familyMembers();
    
    const periodLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= start && logDate <= end;
    });
    
    const totalDoses = periodLogs.filter(l => l.eventType === 'taken' || l.eventType === 'missed').length;
    const takenDoses = periodLogs.filter(l => l.eventType === 'taken').length;
    const missedDoses = periodLogs.filter(l => l.eventType === 'missed').length;
    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;
    
    return {
      totalMembers: members.length,
      totalDoses,
      takenDoses,
      missedDoses,
      adherenceRate,
      periodDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    };
  });
}

