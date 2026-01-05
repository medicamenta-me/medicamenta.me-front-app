import { Injectable, inject, computed, effect } from '@angular/core';
import { LogService } from './log.service';
import { MedicationService } from './medication.service';
import { PatientSelectorService } from './patient-selector.service';
import { IndexedDBService } from './indexed-db.service';
import { LogEntry } from '../models/log-entry.model';

export interface AdherenceStats {
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  adherenceRate: number; // 0-100
  weeklyAdherence: Array<{ week: string; rate: number }>;
  monthlyAdherence: Array<{ month: string; rate: number }>;
}

export interface TimePatternStats {
  morningAdherence: number; // 6h-12h
  afternoonAdherence: number; // 12h-18h
  eveningAdherence: number; // 18h-22h
  nightAdherence: number; // 22h-6h
  bestTimeSlot: string;
  worstTimeSlot: string;
}

export interface DayPatternStats {
  weekdayAdherence: number;
  weekendAdherence: number;
  dailyAdherence: Array<{ day: string; rate: number }>;
  bestDay: string;
  worstDay: string;
}

export interface MedicationAdherence {
  medicationId: string;
  medicationName: string;
  totalDoses: number;
  takenDoses: number;
  adherenceRate: number;
  lastTaken?: Date;
}

export interface PeriodStats {
  period: 'week' | 'month' | 'quarter' | 'year' | 'all';
  startDate: Date;
  endDate: Date;
  adherence: AdherenceStats;
  timePatterns: TimePatternStats;
  dayPatterns: DayPatternStats;
  medicationBreakdown: MedicationAdherence[];
  totalMedications: number;
  activeMedications: number;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryStatsService {
  private readonly logService = inject(LogService);
  private readonly medicationService = inject(MedicationService);
  private readonly patientSelector = inject(PatientSelectorService);
  private readonly indexedDB = inject(IndexedDBService);

  // Computed signals for real-time stats with caching
  readonly currentPeriodStats = computed(() => {
    const stats = this.calculatePeriodStats('month');
    this.cacheStats('month', stats);
    return stats;
  });
  
  readonly weeklyStats = computed(() => {
    const stats = this.calculatePeriodStats('week');
    this.cacheStats('week', stats);
    return stats;
  });
  
  readonly yearlyStats = computed(() => {
    const stats = this.calculatePeriodStats('year');
    this.cacheStats('year', stats);
    return stats;
  });
  
  readonly allTimeStats = computed(() => {
    const stats = this.calculatePeriodStats('all');
    this.cacheStats('all', stats);
    return stats;
  });

  /**
   * Cache statistics to IndexedDB
   */
  private async cacheStats(period: string, stats: PeriodStats): Promise<void> {
    try {
      const userId = this.patientSelector.activePatientId();
      if (!userId) return;
      
      const cacheEntry = {
        id: `${userId}_${period}`,
        userId,
        period,
        data: stats,
        calculatedAt: new Date()
      };
      
      await this.indexedDB.put('stats', cacheEntry);
    } catch (error: any) {
      // Silent fail - caching is not critical
      this.logService.warn('HistoryStatsService', 'Failed to cache stats', { error });
    }
  }

  /**
   * Calculate comprehensive statistics for a given period
   */
  calculatePeriodStats(period: 'week' | 'month' | 'quarter' | 'year' | 'all'): PeriodStats {
    const logs = this.logService.logs();
    const medications = this.medicationService.medications();
    
    const { startDate, endDate } = this.getPeriodDates(period);
    
    // Filter logs by period
    const periodLogs = logs.filter(log => {
      const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
      return logDate >= startDate && logDate <= endDate;
    });

    // Calculate adherence stats
    const adherence = this.calculateAdherence(periodLogs);
    
    // Calculate time patterns
    const timePatterns = this.calculateTimePatterns(periodLogs);
    
    // Calculate day patterns
    const dayPatterns = this.calculateDayPatterns(periodLogs);
    
    // Calculate medication breakdown
    const medicationBreakdown = this.calculateMedicationBreakdown(periodLogs, medications);

    return {
      period,
      startDate,
      endDate,
      adherence,
      timePatterns,
      dayPatterns,
      medicationBreakdown,
      totalMedications: medications.length,
      activeMedications: medications.filter(m => (m as any).isActive !== false).length
    };
  }

  /**
   * Calculate adherence statistics
   */
  private calculateAdherence(logs: LogEntry[]): AdherenceStats {
    const doseLogs = logs.filter(log => 
      log.eventType === 'taken' || 
      log.eventType === 'missed'
    );

    const takenDoses = doseLogs.filter(log => log.eventType === 'taken').length;
    const missedDoses = doseLogs.filter(log => log.eventType === 'missed').length;
    const totalDoses = takenDoses + missedDoses;
    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    // Weekly adherence (last 12 weeks)
    const weeklyAdherence = this.calculateWeeklyAdherence(logs);

    // Monthly adherence (last 12 months)
    const monthlyAdherence = this.calculateMonthlyAdherence(logs);

    return {
      totalDoses,
      takenDoses,
      missedDoses,
      adherenceRate: Math.round(adherenceRate * 10) / 10,
      weeklyAdherence,
      monthlyAdherence
    };
  }

  /**
   * Calculate time pattern statistics
   */
  private calculateTimePatterns(logs: LogEntry[]): TimePatternStats {
    const doseLogs = logs.filter(log => 
      log.eventType === 'taken' || 
      log.eventType === 'missed'
    );

    const morning = { taken: 0, total: 0 };
    const afternoon = { taken: 0, total: 0 };
    const evening = { taken: 0, total: 0 };
    const night = { taken: 0, total: 0 };

    for (const log of doseLogs) {
      const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
      const hour = logDate.getHours();
      const isTaken = log.eventType === 'taken';

      if (hour >= 6 && hour < 12) {
        morning.total++;
        if (isTaken) morning.taken++;
      } else if (hour >= 12 && hour < 18) {
        afternoon.total++;
        if (isTaken) afternoon.taken++;
      } else if (hour >= 18 && hour < 22) {
        evening.total++;
        if (isTaken) evening.taken++;
      } else {
        night.total++;
        if (isTaken) night.taken++;
      }
    }

    const morningAdherence = morning.total > 0 ? (morning.taken / morning.total) * 100 : 0;
    const afternoonAdherence = afternoon.total > 0 ? (afternoon.taken / afternoon.total) * 100 : 0;
    const eveningAdherence = evening.total > 0 ? (evening.taken / evening.total) * 100 : 0;
    const nightAdherence = night.total > 0 ? (night.taken / night.total) * 100 : 0;

    const timeSlots = [
      { name: 'morning', rate: morningAdherence },
      { name: 'afternoon', rate: afternoonAdherence },
      { name: 'evening', rate: eveningAdherence },
      { name: 'night', rate: nightAdherence }
    ];

    const bestTimeSlot = timeSlots.reduce((best, current) => 
      current.rate > best.rate ? current : best
    ).name;

    const worstTimeSlot = timeSlots.reduce((worst, current) => 
      current.rate < worst.rate ? current : worst
    ).name;

    return {
      morningAdherence: Math.round(morningAdherence * 10) / 10,
      afternoonAdherence: Math.round(afternoonAdherence * 10) / 10,
      eveningAdherence: Math.round(eveningAdherence * 10) / 10,
      nightAdherence: Math.round(nightAdherence * 10) / 10,
      bestTimeSlot,
      worstTimeSlot
    };
  }

  /**
   * Calculate day pattern statistics
   */
  private calculateDayPatterns(logs: LogEntry[]): DayPatternStats {
    const doseLogs = logs.filter(log => 
      log.eventType === 'taken' || 
      log.eventType === 'missed'
    );

    const dayStats = new Array(7).fill(null).map(() => ({ taken: 0, total: 0 }));

    for (const log of doseLogs) {
      const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
      const day = logDate.getDay();
      const isTaken = log.eventType === 'taken';

      dayStats[day].total++;
      if (isTaken) dayStats[day].taken++;
    }

    const dailyAdherence = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      .map((day, index) => ({
        day,
        rate: dayStats[index].total > 0 
          ? Math.round((dayStats[index].taken / dayStats[index].total) * 100 * 10) / 10
          : 0
      }));

    // Weekday (Mon-Fri) vs Weekend (Sat-Sun)
    const weekdayStats = dayStats.slice(1, 6).reduce((acc, day) => ({
      taken: acc.taken + day.taken,
      total: acc.total + day.total
    }), { taken: 0, total: 0 });

    const weekendStats = [dayStats[0], dayStats[6]].reduce((acc, day) => ({
      taken: acc.taken + day.taken,
      total: acc.total + day.total
    }), { taken: 0, total: 0 });

    const weekdayAdherence = weekdayStats.total > 0 
      ? Math.round((weekdayStats.taken / weekdayStats.total) * 100 * 10) / 10
      : 0;

    const weekendAdherence = weekendStats.total > 0 
      ? Math.round((weekendStats.taken / weekendStats.total) * 100 * 10) / 10
      : 0;

    const bestDay = dailyAdherence.reduce((best, current) => 
      current.rate > best.rate ? current : best
    ).day;

    const worstDay = dailyAdherence.reduce((worst, current) => 
      current.rate < worst.rate ? current : worst
    ).day;

    return {
      weekdayAdherence,
      weekendAdherence,
      dailyAdherence,
      bestDay,
      worstDay
    };
  }

  /**
   * Calculate adherence breakdown by medication
   */
  private calculateMedicationBreakdown(logs: LogEntry[], medications: any[]): MedicationAdherence[] {
    const medMap = new Map<string, { taken: number; missed: number; lastTaken?: Date }>();

    for (const log of logs) {
      const logAny = log as any;
      if (log.eventType === 'taken' || log.eventType === 'missed') {
        const medId = logAny.medicationId;
        if (!medMap.has(medId)) {
          medMap.set(medId, { taken: 0, missed: 0 });
        }

        const stats = medMap.get(medId)!;
        
        if (log.eventType === 'taken') {
          stats.taken++;
          const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
          if (!stats.lastTaken || logDate > stats.lastTaken) {
            stats.lastTaken = logDate;
          }
        } else {
          stats.missed++;
        }
      }
    }

    return Array.from(medMap.entries()).map(([medicationId, stats]) => {
      const medication = medications.find(m => m.id === medicationId);
      const totalDoses = stats.taken + stats.missed;
      const adherenceRate = totalDoses > 0 
        ? Math.round((stats.taken / totalDoses) * 100 * 10) / 10
        : 0;

      return {
        medicationId,
        medicationName: medication?.name || 'Unknown',
        totalDoses,
        takenDoses: stats.taken,
        adherenceRate,
        lastTaken: stats.lastTaken
      };
    }).sort((a, b) => b.adherenceRate - a.adherenceRate);
  }

  /**
   * Calculate weekly adherence for last 12 weeks
   */
  private calculateWeeklyAdherence(logs: LogEntry[]): Array<{ week: string; rate: number }> {
    const weeks: Array<{ week: string; rate: number }> = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const weekLogs = logs.filter(log => {
        const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
        return logDate >= weekStart && logDate <= weekEnd &&
          (log.eventType === 'taken' || log.eventType === 'missed');
      });

      const taken = weekLogs.filter(l => l.eventType === 'taken').length;
      const total = weekLogs.length;
      const rate = total > 0 ? Math.round((taken / total) * 100 * 10) / 10 : 0;

      weeks.push({
        week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
        rate
      });
    }

    return weeks;
  }

  /**
   * Calculate monthly adherence for last 12 months
   */
  private calculateMonthlyAdherence(logs: LogEntry[]): Array<{ month: string; rate: number }> {
    const months: Array<{ month: string; rate: number }> = [];
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const monthLogs = logs.filter(log => {
        const logDate = log.timestamp instanceof Date ? log.timestamp : (log.timestamp as any).toDate();
        return logDate >= monthStart && logDate <= monthEnd &&
          (log.eventType === 'taken' || log.eventType === 'missed');
      });

      const taken = monthLogs.filter(l => l.eventType === 'taken').length;
      const total = monthLogs.length;
      const rate = total > 0 ? Math.round((taken / total) * 100 * 10) / 10 : 0;

      months.push({
        month: monthNames[monthDate.getMonth()],
        rate
      });
    }

    return months;
  }

  /**
   * Get start and end dates for a given period
   */
  private getPeriodDates(period: 'week' | 'month' | 'quarter' | 'year' | 'all'): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = new Date(2020, 0, 1); // Arbitrary old date
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Export statistics to CSV format
   */
  exportToCSV(stats: PeriodStats): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Medicamenta.me - Relatório de Aderência');
    lines.push(`Período: ${stats.startDate.toLocaleDateString()} - ${stats.endDate.toLocaleDateString()}`);
    lines.push('');
    
    // Overall adherence
    lines.push('ESTATÍSTICAS GERAIS');
    lines.push(`Total de Doses,${stats.adherence.totalDoses}`);
    lines.push(`Doses Tomadas,${stats.adherence.takenDoses}`);
    lines.push(`Doses Perdidas,${stats.adherence.missedDoses}`);
    lines.push(`Taxa de Aderência,${stats.adherence.adherenceRate}%`);
    lines.push('');
    
    // Medication breakdown
    lines.push('ADERÊNCIA POR MEDICAMENTO');
    lines.push('Medicamento,Total de Doses,Doses Tomadas,Taxa de Aderência (%)');
    stats.medicationBreakdown.forEach(med => {
      lines.push(`${med.medicationName},${med.totalDoses},${med.takenDoses},${med.adherenceRate}`);
    });
    lines.push('');
    
    // Time patterns
    lines.push('PADRÕES DE HORÁRIO');
    lines.push(`Manhã (6h-12h),${stats.timePatterns.morningAdherence}%`);
    lines.push(`Tarde (12h-18h),${stats.timePatterns.afternoonAdherence}%`);
    lines.push(`Noite (18h-22h),${stats.timePatterns.eveningAdherence}%`);
    lines.push(`Madrugada (22h-6h),${stats.timePatterns.nightAdherence}%`);
    lines.push('');
    
    // Day patterns
    lines.push('PADRÕES DE DIA DA SEMANA');
    stats.dayPatterns.dailyAdherence.forEach(day => {
      lines.push(`${day.day},${day.rate}%`);
    });
    
    return lines.join('\n');
  }

  /**
   * Get insights and recommendations based on stats
   */
  getInsights(stats: PeriodStats): string[] {
    const insights: string[] = [];

    // Adherence insights
    if (stats.adherence.adherenceRate >= 90) {
      insights.push('Excelente aderência! Continue assim! 🎉');
    } else if (stats.adherence.adherenceRate >= 70) {
      insights.push('Boa aderência, mas há espaço para melhorar. 👍');
    } else if (stats.adherence.adherenceRate >= 50) {
      insights.push('Aderência moderada. Considere configurar lembretes. ⚠️');
    } else {
      insights.push('Aderência baixa. Recomendamos revisar seus horários e lembretes. 🚨');
    }

    // Time pattern insights
    const timeDiff = Math.abs(
      Math.max(
        stats.timePatterns.morningAdherence,
        stats.timePatterns.afternoonAdherence,
        stats.timePatterns.eveningAdherence,
        stats.timePatterns.nightAdherence
      ) - Math.min(
        stats.timePatterns.morningAdherence,
        stats.timePatterns.afternoonAdherence,
        stats.timePatterns.eveningAdherence,
        stats.timePatterns.nightAdherence
      )
    );

    if (timeDiff > 30) {
      insights.push(`Maior dificuldade no período da ${this.translateTimeSlot(stats.timePatterns.worstTimeSlot)}.`);
    }

    // Day pattern insights
    const dayDiff = Math.abs(stats.dayPatterns.weekdayAdherence - stats.dayPatterns.weekendAdherence);
    
    if (dayDiff > 20) {
      if (stats.dayPatterns.weekendAdherence < stats.dayPatterns.weekdayAdherence) {
        insights.push('Finais de semana têm menor aderência. Configure lembretes extras!');
      } else {
        insights.push('Dias úteis têm menor aderência. A rotina pode estar impactando.');
      }
    }

    return insights;
  }

  private translateTimeSlot(slot: string): string {
    const translations: Record<string, string> = {
      'morning': 'manhã',
      'afternoon': 'tarde',
      'evening': 'noite',
      'night': 'madrugada'
    };
    return translations[slot] || slot;
  }
}

