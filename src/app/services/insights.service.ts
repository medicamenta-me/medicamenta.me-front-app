import { Injectable, inject, computed } from '@angular/core';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { StockService } from './stock.service';
import { HistoryStatsService } from './history-stats.service';

/**
 * Types of insights that can be generated
 */
export type InsightType = 
  | 'adherence_excellent' 
  | 'adherence_good' 
  | 'adherence_moderate' 
  | 'adherence_poor'
  | 'missed_doses_pattern'
  | 'time_pattern_poor'
  | 'weekend_pattern_poor'
  | 'stock_critical'
  | 'stock_low'
  | 'medication_improvement'
  | 'streak_achievement'
  | 'recommendation';

/**
 * Priority levels for insights
 */
export type InsightPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Insight data structure
 */
export interface Insight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  message: string;
  icon: string;
  color: string;
  actionLabel?: string;
  actionRoute?: string;
  metadata?: any;
}

/**
 * Service to generate intelligent insights and recommendations
 * based on medication adherence, patterns, and stock levels
 */
@Injectable({
  providedIn: 'root'
})
export class InsightsService {
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);
  private readonly stockService = inject(StockService);
  private readonly historyStatsService = inject(HistoryStatsService);

  /**
   * All active medications
   */
  private readonly medications = this.medicationService.medications;

  /**
   * All logs
   */
  private readonly logs = this.logService.logs;

  /**
   * Stock alerts
   */
  private readonly stockAlerts = this.stockService.stockAlerts;

  /**
   * Week statistics from history
   */
  private readonly weekStats = this.historyStatsService.weeklyStats;

  /**
   * All generated insights, sorted by priority
   */
  public readonly insights = computed<Insight[]>(() => {
    const insights: Insight[] = [];

    // Generate adherence insights
    insights.push(...this.generateAdherenceInsights());

    // Generate pattern insights
    insights.push(...this.generatePatternInsights());

    // Generate stock insights
    insights.push(...this.generateStockInsights());

    // Generate achievement insights
    insights.push(...this.generateAchievementInsights());

    // Sort by priority: critical > high > medium > low
    return insights.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  });

  /**
   * Critical insights only (priority: critical)
   */
  public readonly criticalInsights = computed<Insight[]>(() => {
    return this.insights().filter(i => i.priority === 'critical');
  });

  /**
   * High priority insights
   */
  public readonly highPriorityInsights = computed<Insight[]>(() => {
    return this.insights().filter(i => i.priority === 'high');
  });

  /**
   * Total number of insights
   */
  public readonly insightCount = computed<number>(() => {
    return this.insights().length;
  });

  /**
   * Whether there are critical insights
   */
  public readonly hasCriticalInsights = computed<boolean>(() => {
    return this.criticalInsights().length > 0;
  });

  /**
   * Generate insights about adherence
   */
  private generateAdherenceInsights(): Insight[] {
    const insights: Insight[] = [];
    const stats = this.weekStats();

    if (!stats) return insights;

    const adherenceRate = stats.adherence.adherenceRate;

    if (adherenceRate >= 95) {
      insights.push({
        id: 'adherence_excellent',
        type: 'adherence_excellent',
        priority: 'low',
        title: 'INSIGHTS.ADHERENCE_EXCELLENT_TITLE',
        message: 'INSIGHTS.ADHERENCE_EXCELLENT_MESSAGE',
        icon: 'trophy-outline',
        color: 'success',
        metadata: { rate: adherenceRate }
      });
    } else if (adherenceRate >= 80) {
      insights.push({
        id: 'adherence_good',
        type: 'adherence_good',
        priority: 'low',
        title: 'INSIGHTS.ADHERENCE_GOOD_TITLE',
        message: 'INSIGHTS.ADHERENCE_GOOD_MESSAGE',
        icon: 'thumbs-up-outline',
        color: 'primary',
        metadata: { rate: adherenceRate }
      });
    } else if (adherenceRate >= 60) {
      insights.push({
        id: 'adherence_moderate',
        type: 'adherence_moderate',
        priority: 'medium',
        title: 'INSIGHTS.ADHERENCE_MODERATE_TITLE',
        message: 'INSIGHTS.ADHERENCE_MODERATE_MESSAGE',
        icon: 'alert-circle-outline',
        color: 'warning',
        actionLabel: 'INSIGHTS.VIEW_HISTORY',
        actionRoute: '/tabs/history',
        metadata: { rate: adherenceRate }
      });
    } else {
      insights.push({
        id: 'adherence_poor',
        type: 'adherence_poor',
        priority: 'critical',
        title: 'INSIGHTS.ADHERENCE_POOR_TITLE',
        message: 'INSIGHTS.ADHERENCE_POOR_MESSAGE',
        icon: 'warning-outline',
        color: 'danger',
        actionLabel: 'INSIGHTS.VIEW_HISTORY',
        actionRoute: '/tabs/history',
        metadata: { rate: adherenceRate }
      });
    }

    // Check for missed doses
    const missedCount = stats.adherence.missedDoses;
    if (missedCount > 5) {
      insights.push({
        id: 'missed_doses_high',
        type: 'missed_doses_pattern',
        priority: 'high',
        title: 'INSIGHTS.MISSED_DOSES_TITLE',
        message: 'INSIGHTS.MISSED_DOSES_MESSAGE',
        icon: 'close-circle-outline',
        color: 'danger',
        actionLabel: 'INSIGHTS.SET_REMINDERS',
        actionRoute: '/tabs/medications',
        metadata: { count: missedCount }
      });
    }

    return insights;
  }

  /**
   * Generate insights about time and day patterns
   */
  private generatePatternInsights(): Insight[] {
    const insights: Insight[] = [];
    const stats = this.weekStats();

    if (!stats) return insights;

    // Check time patterns
    const timePatterns = stats.timePatterns;
    const worstTime = this.getWorstTimeSlot(timePatterns);
    
    if (worstTime && worstTime.adherence < 70) {
      insights.push({
        id: 'time_pattern_poor',
        type: 'time_pattern_poor',
        priority: 'medium',
        title: 'INSIGHTS.TIME_PATTERN_TITLE',
        message: 'INSIGHTS.TIME_PATTERN_MESSAGE',
        icon: 'time-outline',
        color: 'warning',
        metadata: { 
          timeSlot: worstTime.name,
          adherence: worstTime.adherence 
        }
      });
    }

    // Check day patterns
    const dayPatterns = stats.dayPatterns;
    if (dayPatterns.weekendAdherence < dayPatterns.weekdayAdherence - 15) {
      insights.push({
        id: 'weekend_pattern_poor',
        type: 'weekend_pattern_poor',
        priority: 'medium',
        title: 'INSIGHTS.WEEKEND_PATTERN_TITLE',
        message: 'INSIGHTS.WEEKEND_PATTERN_MESSAGE',
        icon: 'calendar-outline',
        color: 'warning',
        metadata: {
          weekendAdherence: dayPatterns.weekendAdherence,
          weekdayAdherence: dayPatterns.weekdayAdherence
        }
      });
    }

    return insights;
  }

  /**
   * Generate insights about stock levels
   */
  private generateStockInsights(): Insight[] {
    const insights: Insight[] = [];
    const alerts = this.stockAlerts();

    // Critical stock alerts
    const criticalAlerts = alerts.filter(a => a.status === 'critical');
    if (criticalAlerts.length > 0) {
      insights.push({
        id: 'stock_critical',
        type: 'stock_critical',
        priority: 'critical',
        title: 'INSIGHTS.STOCK_CRITICAL_TITLE',
        message: 'INSIGHTS.STOCK_CRITICAL_MESSAGE',
        icon: 'alert-circle-outline',
        color: 'danger',
        actionLabel: 'INSIGHTS.MANAGE_STOCK',
        actionRoute: '/tabs/medications',
        metadata: { count: criticalAlerts.length }
      });
    }

    // Low stock alerts
    const lowAlerts = alerts.filter(a => a.status === 'low');
    if (lowAlerts.length > 0 && criticalAlerts.length === 0) {
      insights.push({
        id: 'stock_low',
        type: 'stock_low',
        priority: 'medium',
        title: 'INSIGHTS.STOCK_LOW_TITLE',
        message: 'INSIGHTS.STOCK_LOW_MESSAGE',
        icon: 'cube-outline',
        color: 'warning',
        actionLabel: 'INSIGHTS.MANAGE_STOCK',
        actionRoute: '/tabs/medications',
        metadata: { count: lowAlerts.length }
      });
    }

    return insights;
  }

  /**
   * Generate achievement and positive insights
   */
  private generateAchievementInsights(): Insight[] {
    const insights: Insight[] = [];
    const stats = this.weekStats();

    if (!stats) return insights;

    // Check for perfect week
    if (stats.adherence.adherenceRate === 100 && stats.adherence.totalDoses >= 7) {
      insights.push({
        id: 'perfect_week',
        type: 'streak_achievement',
        priority: 'low',
        title: 'INSIGHTS.PERFECT_WEEK_TITLE',
        message: 'INSIGHTS.PERFECT_WEEK_MESSAGE',
        icon: 'trophy-outline',
        color: 'success'
      });
    }

    // Check for improvement
    const weeklyAdherence = stats.adherence.weeklyAdherence;
    if (weeklyAdherence.length >= 2) {
      const lastWeekRate = weeklyAdherence[weeklyAdherence.length - 1].rate;
      const previousWeekRate = weeklyAdherence[weeklyAdherence.length - 2].rate;
      
      if (lastWeekRate > previousWeekRate + 10) {
        insights.push({
          id: 'improvement',
          type: 'medication_improvement',
          priority: 'low',
          title: 'INSIGHTS.MEDICATION_IMPROVEMENT_TITLE',
          message: 'INSIGHTS.MEDICATION_IMPROVEMENT_MESSAGE',
          icon: 'trending-up-outline',
          color: 'success',
          metadata: {
            improvement: Math.round(lastWeekRate - previousWeekRate)
          }
        });
      }
    }

    return insights;
  }

  /**
   * Get worst performing time slot
   */
  private getWorstTimeSlot(timePatterns: any): { name: string; adherence: number } | null {
    const slots = [
      { name: 'morning', adherence: timePatterns.morningAdherence },
      { name: 'afternoon', adherence: timePatterns.afternoonAdherence },
      { name: 'evening', adherence: timePatterns.eveningAdherence },
      { name: 'night', adherence: timePatterns.nightAdherence }
    ];

    const worst = slots.reduce((min, slot) => 
      slot.adherence < min.adherence ? slot : min
    );

    return worst.adherence < 100 ? worst : null;
  }

  /**
   * Get insight by ID
   */
  getInsightById(id: string): Insight | undefined {
    return this.insights().find(i => i.id === id);
  }
}

