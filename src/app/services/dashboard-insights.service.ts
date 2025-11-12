import { Injectable, inject, signal, computed } from '@angular/core';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { HistoryStatsService } from './history-stats.service';
import { IndexedDBService } from './indexed-db.service';
import { Medication } from '../models/medication.model';

export interface Insight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'danger';
  icon: string;
  title: string;
  description: string;
  priority: number; // 1-5, maior = mais importante
  actionLabel?: string;
  actionData?: any;
  timestamp: Date;
}

export interface QuickStats {
  weeklyAdherence: number; // percentage
  upcomingDoses: number; // next 24h
  criticalStock: number; // medications with low stock
  totalActive: number; // active medications
}

@Injectable({
  providedIn: 'root'
})
export class DashboardInsightsService {
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);
  private readonly historyStatsService = inject(HistoryStatsService);
  private readonly indexedDB = inject(IndexedDBService);

  // Signals
  private readonly _insights = signal<Insight[]>([]);
  private readonly _quickStats = signal<QuickStats>({
    weeklyAdherence: 0,
    upcomingDoses: 0,
    criticalStock: 0,
    totalActive: 0
  });

  // Public computed signals
  readonly insights = this._insights.asReadonly();
  readonly quickStats = this._quickStats.asReadonly();
  
  // Insights por prioridade (mais importante primeiro)
  readonly sortedInsights = computed(() => {
    return [...this._insights()].sort((a, b) => b.priority - a.priority);
  });

  /**
   * Load insights from cache
   */
  private async loadInsightsFromCache(userId: string): Promise<void> {
    try {
      const cached = await this.indexedDB.getByIndex<any>('insights', 'userId', userId);
      if (cached.length > 0) {
        const insights = cached[0].insights || [];
        this._insights.set(insights);
        this.logService.info('DashboardInsights', 'Loaded insights from cache', { count: insights.length });
      }
    } catch (error: any) {
      this.logService.warn('DashboardInsights', 'Failed to load from cache', { error });
    }
  }

  /**
   * Cache insights to IndexedDB
   */
  private async cacheInsights(userId: string, insights: Insight[]): Promise<void> {
    try {
      await this.indexedDB.put('insights', {
        id: `insights_${userId}`,
        userId,
        insights,
        timestamp: new Date()
      });
    } catch (error: any) {
      this.logService.warn('DashboardInsights', 'Failed to cache insights', { error });
    }
  }

  /**
   * Gerar todos os insights para o dashboard
   */
  async generateInsights(userId: string): Promise<void> {
    const insights: Insight[] = [];
    
    try {
      // Load from cache first
      await this.loadInsightsFromCache(userId);
      
      // Buscar dados necessários
      const medications = this.medicationService.medications();
      const weeklyStats = this.historyStatsService.weeklyStats();
      const weeklyAdherence = weeklyStats.adherence?.weeklyAdherence || [];

      // 1. Análise de aderência
      const adherenceInsights = this.analyzeAdherence(weeklyAdherence);
      insights.push(...adherenceInsights);

      // 2. Previsão de depleção de estoque
      const stockInsights = this.predictStockDepletion(medications);
      insights.push(...stockInsights);

      // Atualizar insights
      this._insights.set(insights);
      
      // Cache insights
      await this.cacheInsights(userId, insights);

    } catch (error: any) {
      this.logService.error('DashboardInsights', 'Error generating insights', error as Error);
      // Keep cached insights on error
    }
  }

  /**
   * Calcular estatísticas rápidas
   */
  async calculateQuickStats(userId: string): Promise<void> {
    try {
      const medications = this.medicationService.medications();
      const weeklyStats = this.historyStatsService.weeklyStats();
      const weeklyAdherence = weeklyStats.adherence?.weeklyAdherence || [];

      // Aderência da semana atual (último item)
      const currentWeekAdherence = weeklyAdherence.length > 0 
        ? weeklyAdherence[weeklyAdherence.length - 1].rate 
        : 0;

      // Próximas doses (próximas 24h)
      const upcomingDoses = this.calculateUpcomingDoses(medications);

      // Medicamentos com estoque crítico (< 7 doses)
      const criticalStock = medications.filter(m => 
        (m.stock !== undefined && m.stock < 7) ||
        (m.currentStock !== undefined && m.currentStock < 7)
      ).length;

      // Total de medicamentos ativos (não completados nem arquivados)
      const totalActive = medications.filter(m => 
        !m.isCompleted && !m.isArchived
      ).length;

      this._quickStats.set({
        weeklyAdherence: currentWeekAdherence,
        upcomingDoses,
        criticalStock,
        totalActive
      });

    } catch (error: any) {
      this.logService.error('DashboardInsights', 'Error calculating quick stats', error as Error);
    }
  }

  /**
   * Análise de aderência com tendências
   */
  private analyzeAdherence(weeklyStats: any[]): Insight[] {
    const insights: Insight[] = [];

    if (weeklyStats.length < 2) {
      return insights;
    }

    // Pegar últimas 2 semanas
    const currentWeek = weeklyStats[weeklyStats.length - 1];
    const previousWeek = weeklyStats[weeklyStats.length - 2];

    const currentRate = currentWeek.rate;
    const previousRate = previousWeek.rate;
    const change = currentRate - previousRate;

    // Aderência melhorando
    if (change > 10) {
      insights.push({
        id: this.generateId(),
        type: 'success',
        icon: 'trending-up',
        title: 'INSIGHTS.ADHERENCE_IMPROVING',
        description: 'INSIGHTS.ADHERENCE_IMPROVING_DESC',
        priority: 4,
        timestamp: new Date()
      });
    }

    // Aderência piorando
    if (change < -10) {
      insights.push({
        id: this.generateId(),
        type: 'warning',
        icon: 'trending-down',
        title: 'INSIGHTS.ADHERENCE_DECLINING',
        description: 'INSIGHTS.ADHERENCE_DECLINING_DESC',
        priority: 5,
        actionLabel: 'INSIGHTS.VIEW_HISTORY',
        actionData: { route: '/tabs/history' },
        timestamp: new Date()
      });
    }

    // Aderência excelente (> 90%)
    if (currentRate > 90) {
      insights.push({
        id: this.generateId(),
        type: 'success',
        icon: 'trophy',
        title: 'INSIGHTS.EXCELLENT_ADHERENCE',
        description: 'INSIGHTS.EXCELLENT_ADHERENCE_DESC',
        priority: 3,
        timestamp: new Date()
      });
    }

    // Aderência baixa (< 60%)
    if (currentRate < 60) {
      insights.push({
        id: this.generateId(),
        type: 'danger',
        icon: 'alert-circle',
        title: 'INSIGHTS.LOW_ADHERENCE',
        description: 'INSIGHTS.LOW_ADHERENCE_DESC',
        priority: 5,
        actionLabel: 'INSIGHTS.SETUP_REMINDERS',
        actionData: { route: '/tabs/profile' },
        timestamp: new Date()
      });
    }

    return insights;
  }



  /**
   * Previsão de depleção de estoque (simplificado)
   */
  private predictStockDepletion(medications: Medication[]): Insight[] {
    const insights: Insight[] = [];

    medications.forEach(med => {
      // Verificar se não está completo ou arquivado
      if (med.isCompleted || med.isArchived) return;

      const stock = med.currentStock ?? med.stock ?? 0;
      const threshold = med.lowStockThreshold ?? 7;

      // Alerta se estoque abaixo do threshold
      if (stock > 0 && stock <= threshold) {
        insights.push({
          id: this.generateId(),
          type: stock <= 3 ? 'danger' : 'warning',
          icon: 'cube',
          title: stock <= 3 ? 'INSIGHTS.CRITICAL_STOCK' : 'INSIGHTS.LOW_STOCK',
          description: stock <= 3 ? 'INSIGHTS.CRITICAL_STOCK_DESC' : 'INSIGHTS.LOW_STOCK_DESC',
          priority: stock <= 3 ? 5 : 4,
          actionLabel: stock <= 3 ? 'INSIGHTS.RESTOCK_NOW' : 'INSIGHTS.RESTOCK',
          actionData: { medicationId: med.id, name: med.name, stock },
          timestamp: new Date()
        });
      }
    });

    return insights;
  }

  /**
   * Calcular doses nas próximas 24h
   */
  private calculateUpcomingDoses(medications: Medication[]): number {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    let count = 0;

    medications.forEach(med => {
      // Verificar se não está completo ou arquivado
      if (med.isCompleted || med.isArchived || !med.schedule) return;

      med.schedule.forEach(dose => {
        // Parse time do Dose (formato HH:mm)
        const [hours, minutes] = dose.time.split(':').map(Number);
        
        const scheduleDate = new Date();
        scheduleDate.setHours(hours, minutes, 0, 0);

        // Se já passou hoje, verificar amanhã
        if (scheduleDate < now) {
          scheduleDate.setDate(scheduleDate.getDate() + 1);
        }

        // Se está nas próximas 24h
        if (scheduleDate <= tomorrow) {
          count++;
        }
      });
    });

    return count;
  }

  /**
   * Limpar insights
   */
  clearInsights(): void {
    this._insights.set([]);
  }

  /**
   * Remover um insight específico
   */
  dismissInsight(insightId: string): void {
    const current = this._insights();
    this._insights.set(current.filter(i => i.id !== insightId));
  }

  /**
   * Gerar ID único para insight
   */
  private generateId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

