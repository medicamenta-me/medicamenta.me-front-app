import { Injectable, inject } from '@angular/core';
import { LogService } from './log.service';

/**
 * Padrão de lembrete (redeclarado para evitar dependência circular)
 */
export interface ReminderPattern {
  id: string;
  userId?: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // "14:00"
  actualTime?: string; // "14:35"
  missed: boolean;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  date: Date;
  timestamp: Date;
  delayMinutes?: number; // Atraso em minutos
}

/**
 * Análise de padrão (redeclarado para evitar dependência circular)
 */
export interface PatternAnalysis {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  dayOfWeek?: number;
  totalDoses: number;
  missedDoses: number;
  averageDelayMinutes: number;
  missedPercentage: number;
  hasRecurringMissedDoses: boolean;
  hasConsistentDelay: boolean;
  suggestedTime?: string;
  suggestedDayChange?: boolean;
  confidence: number;
  createdAt: Date;
}

/**
 * ReminderPatternAnalyzerService
 * 
 * Serviço de Machine Learning para análise avançada de padrões de lembretes.
 * Implementa algoritmos estatísticos e preditivos para aumentar adesão aos tratamentos.
 * 
 * Features:
 * - Regressão Linear para tendências de atraso
 * - Análise de variância temporal (dia da semana, hora do dia)
 * - Clustering de padrões comportamentais
 * - Previsão de probabilidade de esquecimento
 * - Detecção de anomalias
 * - Recomendações personalizadas baseadas em ML
 * 
 * @author Medicamenta.me Team
 * @version 2.0
 */

/**
 * Resultado de análise de tendência
 */
export interface TrendAnalysis {
  slope: number; // Inclinação da reta (positivo = piorando, negativo = melhorando)
  intercept: number; // Intercepto Y
  rSquared: number; // Coeficiente de determinação (0-1, quanto maior melhor o fit)
  prediction: number; // Valor previsto para próximo período
  confidence: number; // Confiança da previsão (0-1)
  trend: 'improving' | 'worsening' | 'stable'; // Tendência geral
}

/**
 * Análise de variância por dia da semana
 */
export interface WeekdayVariance {
  dayOfWeek: number; // 0-6 (domingo-sábado)
  dayName: string; // "Domingo", "Segunda", etc
  missedCount: number; // Total de doses perdidas
  totalDoses: number; // Total de doses programadas
  missRate: number; // Taxa de perda (0-1)
  avgDelayMinutes: number; // Atraso médio em minutos
  riskScore: number; // Score de risco (0-1)
}

/**
 * Análise de variância por período do dia
 */
export interface TimeOfDayVariance {
  period: 'morning' | 'afternoon' | 'evening' | 'night'; // Período
  periodLabel: string; // "Manhã", "Tarde", etc
  timeRange: string; // "06:00-12:00"
  missedCount: number;
  totalDoses: number;
  missRate: number;
  avgDelayMinutes: number;
  riskScore: number;
}

/**
 * Cluster de comportamento
 */
export interface BehaviorCluster {
  clusterId: string;
  label: string; // "Pontual Matutino", "Atrasado Noturno", etc
  patterns: ReminderPattern[];
  characteristics: {
    avgDelayMinutes: number;
    missRate: number;
    preferredTimeRange: string;
    consistency: number; // 0-1 (quão consistente é o comportamento)
  };
  recommendations: string[];
}

/**
 * Previsão de esquecimento
 */
export interface ForgetfulnessPrediction {
  medicationId: string;
  scheduledTime: string; // "14:00"
  dayOfWeek: number;
  probability: number; // Probabilidade de esquecer (0-1)
  confidence: number; // Confiança da previsão (0-1)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    historicalMissRate: number;
    recentTrend: number;
    weekdayRisk: number;
    timeOfDayRisk: number;
    consecutiveMisses: number;
  };
  recommendations: string[];
}

/**
 * Análise completa avançada
 */
export interface AdvancedAnalysis {
  userId: string;
  medicationId?: string;
  analyzedAt: Date;
  
  // Análises estatísticas
  trendAnalysis: TrendAnalysis;
  weekdayVariance: WeekdayVariance[];
  timeOfDayVariance: TimeOfDayVariance[];
  
  // Clustering
  behaviorClusters: BehaviorCluster[];
  dominantCluster: BehaviorCluster;
  
  // Previsões
  predictions: ForgetfulnessPrediction[];
  overallAdherenceScore: number; // 0-100
  
  // Insights acionáveis
  insights: string[];
  recommendations: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ReminderPatternAnalyzerService {
  private readonly logService = inject(LogService);
  
  private readonly WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  private readonly PERIOD_DEFINITIONS = {
    morning: { label: 'Manhã', range: '06:00-12:00', start: 6, end: 12 },
    afternoon: { label: 'Tarde', range: '12:00-18:00', start: 12, end: 18 },
    evening: { label: 'Noite', range: '18:00-22:00', start: 18, end: 22 },
    night: { label: 'Madrugada', range: '22:00-06:00', start: 22, end: 6 }
  };

  constructor() {
    this.logService.info('ReminderPatternAnalyzer', 'Service initialized');
  }

  /**
   * Análise avançada completa de padrões
   */
  async analyzeAdvanced(patterns: ReminderPattern[], medicationId?: string): Promise<AdvancedAnalysis> {
    const filteredPatterns = medicationId 
      ? patterns.filter(p => p.medicationId === medicationId)
      : patterns;

    if (filteredPatterns.length < 10) {
      throw new Error('Dados insuficientes para análise avançada (mínimo 10 registros)');
    }

    this.logService.info('ReminderPatternAnalyzer', 'Analyzing patterns', { count: filteredPatterns.length });

    // Executar todas as análises
    const trendAnalysis = this.analyzeTrend(filteredPatterns);
    const weekdayVariance = this.analyzeWeekdayVariance(filteredPatterns);
    const timeOfDayVariance = this.analyzeTimeOfDayVariance(filteredPatterns);
    const behaviorClusters = this.clusterBehaviors(filteredPatterns);
    const predictions = this.predictForgetfulness(filteredPatterns, {
      trendAnalysis,
      weekdayVariance,
      timeOfDayVariance
    });

    const overallAdherenceScore = this.calculateAdherenceScore(filteredPatterns);
    const insights = this.generateInsights({
      trendAnalysis,
      weekdayVariance,
      timeOfDayVariance,
      behaviorClusters,
      predictions,
      overallAdherenceScore
    });

    const recommendations = this.generateRecommendations({
      trendAnalysis,
      weekdayVariance,
      timeOfDayVariance,
      predictions
    });

    return {
      userId: filteredPatterns[0]?.userId || '',
      medicationId,
      analyzedAt: new Date(),
      trendAnalysis,
      weekdayVariance,
      timeOfDayVariance,
      behaviorClusters,
      dominantCluster: behaviorClusters[0] || this.createEmptyCluster(),
      predictions,
      overallAdherenceScore,
      insights,
      recommendations
    };
  }

  /**
   * Regressão Linear para análise de tendência
   * Usa método dos mínimos quadrados
   */
  private analyzeTrend(patterns: ReminderPattern[]): TrendAnalysis {
    // Ordenar por timestamp
    const sorted = [...patterns].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calcular delay para cada padrão (0 se não perdeu)
    const dataPoints = sorted.map((p, index) => ({
      x: index, // Índice temporal
      y: p.missed ? 1 : (p.delayMinutes || 0) / 60 // Normalizar para horas
    }));

    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = dataPoints.reduce((sum, p) => sum + p.y, 0);
    const sumXY = dataPoints.reduce((sum, p) => sum + (p.x * p.y), 0);
    const sumXX = dataPoints.reduce((sum, p) => sum + (p.x * p.x), 0);

    // Fórmulas de regressão linear
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcular R² (coeficiente de determinação)
    const meanY = sumY / n;
    const ssTotal = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    const ssResidual = dataPoints.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // Previsão para próximo ponto
    const prediction = slope * n + intercept;
    
    // Confiança baseada em R²
    const confidence = Math.max(0, Math.min(1, rSquared));

    // Determinar tendência
    let trend: 'improving' | 'worsening' | 'stable';
    if (Math.abs(slope) < 0.01) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'worsening'; // Atrasos aumentando
    } else {
      trend = 'improving'; // Atrasos diminuindo
    }

    return {
      slope,
      intercept,
      rSquared,
      prediction: Math.max(0, prediction), // Não pode ser negativo
      confidence,
      trend
    };
  }

  /**
   * Análise de variância por dia da semana
   */
  private analyzeWeekdayVariance(patterns: ReminderPattern[]): WeekdayVariance[] {
    const weekdayStats: { [key: number]: { missed: number; total: number; delays: number[] } } = {};

    // Inicializar contadores
    for (let i = 0; i < 7; i++) {
      weekdayStats[i] = { missed: 0, total: 0, delays: [] };
    }

    // Contar por dia da semana
    patterns.forEach(pattern => {
      const day = pattern.dayOfWeek;
      weekdayStats[day].total++;
      
      if (pattern.missed) {
        weekdayStats[day].missed++;
      } else if (pattern.delayMinutes) {
        weekdayStats[day].delays.push(pattern.delayMinutes);
      }
    });

    // Calcular estatísticas
    return Object.entries(weekdayStats).map(([day, stats]) => {
      const dayNum = parseInt(day);
      const missRate = stats.total > 0 ? stats.missed / stats.total : 0;
      const avgDelay = stats.delays.length > 0
        ? stats.delays.reduce((sum, d) => sum + d, 0) / stats.delays.length
        : 0;

      // Score de risco combinado
      const riskScore = (missRate * 0.7) + (Math.min(avgDelay / 120, 1) * 0.3);

      return {
        dayOfWeek: dayNum,
        dayName: this.WEEKDAY_NAMES[dayNum],
        missedCount: stats.missed,
        totalDoses: stats.total,
        missRate,
        avgDelayMinutes: avgDelay,
        riskScore
      };
    }).sort((a, b) => b.riskScore - a.riskScore); // Ordenar por risco
  }

  /**
   * Análise de variância por período do dia
   */
  private analyzeTimeOfDayVariance(patterns: ReminderPattern[]): TimeOfDayVariance[] {
    const periodStats: { [key: string]: { missed: number; total: number; delays: number[] } } = {
      morning: { missed: 0, total: 0, delays: [] },
      afternoon: { missed: 0, total: 0, delays: [] },
      evening: { missed: 0, total: 0, delays: [] },
      night: { missed: 0, total: 0, delays: [] }
    };

    // Classificar por período
    patterns.forEach(pattern => {
      const hour = parseInt(pattern.scheduledTime.split(':')[0]);
      const period = this.getTimeOfDayPeriod(hour);
      
      periodStats[period].total++;
      
      if (pattern.missed) {
        periodStats[period].missed++;
      } else if (pattern.delayMinutes) {
        periodStats[period].delays.push(pattern.delayMinutes);
      }
    });

    // Calcular estatísticas
    return Object.entries(periodStats).map(([period, stats]) => {
      const periodKey = period as keyof typeof this.PERIOD_DEFINITIONS;
      const periodDef = this.PERIOD_DEFINITIONS[periodKey];
      
      const missRate = stats.total > 0 ? stats.missed / stats.total : 0;
      const avgDelay = stats.delays.length > 0
        ? stats.delays.reduce((sum, d) => sum + d, 0) / stats.delays.length
        : 0;

      const riskScore = (missRate * 0.7) + (Math.min(avgDelay / 120, 1) * 0.3);

      return {
        period: periodKey,
        periodLabel: periodDef.label,
        timeRange: periodDef.range,
        missedCount: stats.missed,
        totalDoses: stats.total,
        missRate,
        avgDelayMinutes: avgDelay,
        riskScore
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Clustering de comportamentos usando K-means simplificado
   */
  private clusterBehaviors(patterns: ReminderPattern[]): BehaviorCluster[] {
    // Features para clustering: [missRate, avgDelay, hourOfDay]
    const features = patterns.map(p => [
      p.missed ? 1 : 0,
      (p.delayMinutes || 0) / 60, // Normalizar para horas
      parseInt(p.scheduledTime.split(':')[0]) / 24 // Normalizar hora
    ]);

    // K-means simplificado com 3 clusters
    const k = 3;
    const clusters = this.kMeansClustering(features, k);

    // Mapear clusters para padrões
    return clusters.map((clusterIndices, clusterId) => {
      const clusterPatterns = clusterIndices.map(i => patterns[i]);
      
      const missedCount = clusterPatterns.filter(p => p.missed).length;
      const missRate = missedCount / clusterPatterns.length;
      const avgDelay = clusterPatterns
        .filter(p => !p.missed && p.delayMinutes)
        .reduce((sum, p) => sum + (p.delayMinutes || 0), 0) / (clusterPatterns.length - missedCount || 1);

      // Determinar faixa horária preferida
      const hours = clusterPatterns.map(p => parseInt(p.scheduledTime.split(':')[0]));
      const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;
      const preferredPeriod = this.getTimeOfDayPeriod(Math.round(avgHour));
      const preferredTimeRange = this.PERIOD_DEFINITIONS[preferredPeriod as keyof typeof this.PERIOD_DEFINITIONS].range;

      // Calcular consistência (variância inversa)
      const variance = hours.reduce((sum, h) => sum + Math.pow(h - avgHour, 2), 0) / hours.length;
      const consistency = Math.max(0, 1 - (variance / 144)); // 144 = variância máxima (24²/4)

      // Label do cluster
      const adherenceLabel = missRate < 0.1 ? 'Pontual' : missRate < 0.3 ? 'Moderado' : 'Irregular';
      const timeLabel = this.PERIOD_DEFINITIONS[preferredPeriod as keyof typeof this.PERIOD_DEFINITIONS].label;
      const label = `${adherenceLabel} - ${timeLabel}`;

      // Recomendações
      const recommendations = this.generateClusterRecommendations(missRate, avgDelay, preferredPeriod);

      return {
        clusterId: `cluster-${clusterId}`,
        label,
        patterns: clusterPatterns,
        characteristics: {
          avgDelayMinutes: avgDelay,
          missRate,
          preferredTimeRange,
          consistency
        },
        recommendations
      };
    }).sort((a, b) => b.patterns.length - a.patterns.length); // Ordenar por tamanho
  }

  /**
   * Previsão de probabilidade de esquecimento
   */
  private predictForgetfulness(
    patterns: ReminderPattern[],
    context: {
      trendAnalysis: TrendAnalysis;
      weekdayVariance: WeekdayVariance[];
      timeOfDayVariance: TimeOfDayVariance[];
    }
  ): ForgetfulnessPrediction[] {
    // Agrupar por medicação e horário
    const grouped = new Map<string, ReminderPattern[]>();
    
    patterns.forEach(pattern => {
      const key = `${pattern.medicationId}-${pattern.scheduledTime}-${pattern.dayOfWeek}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(pattern);
    });

    // Gerar previsões
    const predictions: ForgetfulnessPrediction[] = [];

    grouped.forEach((patternGroup, key) => {
      const [medicationId, scheduledTime, dayOfWeekStr] = key.split('-');
      const dayOfWeek = parseInt(dayOfWeekStr);

      // Pegar últimos 5 registros
      const recent = patternGroup.slice(-5);
      if (recent.length < 3) return; // Dados insuficientes

      // Calcular fatores
      const historicalMissRate = recent.filter(p => p.missed).length / recent.length;
      
      // Tendência recente (últimos 3 vs anteriores)
      const recentThree = recent.slice(-3);
      const recentMissRate = recentThree.filter(p => p.missed).length / recentThree.length;
      const recentTrend = recentMissRate - historicalMissRate;

      // Risco do dia da semana
      const weekdayRisk = context.weekdayVariance.find(w => w.dayOfWeek === dayOfWeek)?.riskScore || 0;

      // Risco do horário
      const hour = parseInt(scheduledTime.split(':')[0]);
      const period = this.getTimeOfDayPeriod(hour);
      const timeOfDayRisk = context.timeOfDayVariance.find(t => t.period === period)?.riskScore || 0;

      // Misses consecutivos
      const consecutiveMisses = this.countConsecutiveMisses(recent);

      // Calcular probabilidade combinada (weighted average)
      const probability = (
        historicalMissRate * 0.3 +
        Math.max(0, recentTrend) * 0.2 +
        weekdayRisk * 0.2 +
        timeOfDayRisk * 0.15 +
        Math.min(consecutiveMisses / 5, 1) * 0.15
      );

      // Confiança baseada no tamanho da amostra
      const confidence = Math.min(recent.length / 10, 1);

      // Nível de risco
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (probability < 0.2) riskLevel = 'low';
      else if (probability < 0.4) riskLevel = 'medium';
      else if (probability < 0.7) riskLevel = 'high';
      else riskLevel = 'critical';

      // Recomendações específicas
      const recommendations = this.generatePredictionRecommendations(
        probability,
        { historicalMissRate, recentTrend, weekdayRisk, timeOfDayRisk, consecutiveMisses }
      );

      predictions.push({
        medicationId,
        scheduledTime,
        dayOfWeek,
        probability,
        confidence,
        riskLevel,
        factors: {
          historicalMissRate,
          recentTrend,
          weekdayRisk,
          timeOfDayRisk,
          consecutiveMisses
        },
        recommendations
      });
    });

    return predictions.sort((a, b) => b.probability - a.probability);
  }

  /**
   * K-means clustering simplificado
   */
  private kMeansClustering(data: number[][], k: number): number[][] {
    const n = data.length;
    if (n < k) return [Array.from({ length: n }, (_, i) => i)]; // Dados insuficientes

    // Inicializar centroides aleatoriamente
    let centroids = this.initializeCentroids(data, k);
    let clusters: number[][] = [];
    let iterations = 0;
    const maxIterations = 50;

    while (iterations < maxIterations) {
      // Atribuir pontos aos clusters
      clusters = Array.from({ length: k }, () => []);
      
      data.forEach((point, index) => {
        const nearestCluster = this.findNearestCentroid(point, centroids);
        clusters[nearestCluster].push(index);
      });

      // Recalcular centroides
      const newCentroids = clusters.map(cluster => {
        if (cluster.length === 0) return centroids[0]; // Cluster vazio
        
        const points = cluster.map(i => data[i]);
        return this.calculateCentroid(points);
      });

      // Verificar convergência
      if (this.centroidsEqual(centroids, newCentroids)) {
        break;
      }

      centroids = newCentroids;
      iterations++;
    }

    return clusters.filter(c => c.length > 0); // Remover clusters vazios
  }

  /**
   * Helpers do K-means
   */
  private initializeCentroids(data: number[][], k: number): number[][] {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, k);
  }

  private findNearestCentroid(point: number[], centroids: number[][]): number {
    let minDistance = Infinity;
    let nearestIndex = 0;

    centroids.forEach((centroid, index) => {
      const distance = this.euclideanDistance(point, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  private calculateCentroid(points: number[][]): number[] {
    const dimensions = points[0].length;
    const centroid = new Array(dimensions).fill(0);
    
    points.forEach(point => {
      point.forEach((val, i) => {
        centroid[i] += val;
      });
    });

    return centroid.map(sum => sum / points.length);
  }

  private centroidsEqual(a: number[][], b: number[][]): boolean {
    const threshold = 0.001;
    return a.every((centroid, i) => 
      centroid.every((val, j) => Math.abs(val - b[i][j]) < threshold)
    );
  }

  /**
   * Helpers gerais
   */
  private getTimeOfDayPeriod(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  private countConsecutiveMisses(patterns: ReminderPattern[]): number {
    let count = 0;
    for (let i = patterns.length - 1; i >= 0; i--) {
      if (patterns[i].missed) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  private calculateAdherenceScore(patterns: ReminderPattern[]): number {
    const missedCount = patterns.filter(p => p.missed).length;
    const adherenceRate = 1 - (missedCount / patterns.length);
    return Math.round(adherenceRate * 100);
  }

  private generateInsights(analysis: any): string[] {
    const insights: string[] = [];

    // Tendência
    if (analysis.trendAnalysis.trend === 'worsening') {
      insights.push('⚠️ Sua adesão está piorando ao longo do tempo. Vamos trabalhar juntos para reverter isso!');
    } else if (analysis.trendAnalysis.trend === 'improving') {
      insights.push('🎉 Excelente! Sua adesão está melhorando consistentemente!');
    }

    // Dia da semana problemático
    const worstDay = analysis.weekdayVariance[0];
    if (worstDay && worstDay.riskScore > 0.5) {
      insights.push(`📅 ${worstDay.dayName} é seu dia mais desafiador (${(worstDay.missRate * 100).toFixed(0)}% de doses perdidas)`);
    }

    // Período problemático
    const worstPeriod = analysis.timeOfDayVariance[0];
    if (worstPeriod && worstPeriod.riskScore > 0.5) {
      insights.push(`🕐 Você tem mais dificuldade no período da ${worstPeriod.periodLabel.toLowerCase()}`);
    }

    // Score geral
    if (analysis.overallAdherenceScore >= 90) {
      insights.push('⭐ Sua adesão está excelente! Continue assim!');
    } else if (analysis.overallAdherenceScore < 70) {
      insights.push('💪 Há espaço para melhorar. Pequenas mudanças podem fazer grande diferença!');
    }

    // Previsões críticas
    const criticalPredictions = analysis.predictions.filter((p: ForgetfulnessPrediction) => p.riskLevel === 'critical');
    if (criticalPredictions.length > 0) {
      insights.push(`🚨 ${criticalPredictions.length} dose(s) com alto risco de esquecimento detectadas`);
    }

    return insights;
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    // Baseado em tendência
    if (analysis.trendAnalysis.trend === 'worsening') {
      recommendations.push('Considere usar lembretes mais frequentes nos horários problemáticos');
    }

    // Baseado em dia da semana
    const worstDay = analysis.weekdayVariance[0];
    if (worstDay && worstDay.riskScore > 0.5) {
      recommendations.push(`Adicione um lembrete extra às ${worstDay.dayName}s`);
    }

    // Baseado em período
    const worstPeriod = analysis.timeOfDayVariance[0];
    if (worstPeriod && worstPeriod.riskScore > 0.5) {
      recommendations.push(`Ajuste os horários do período da ${worstPeriod.periodLabel.toLowerCase()} para melhor adequação à sua rotina`);
    }

    // Baseado em previsões
    const highRisk = analysis.predictions.filter((p: ForgetfulnessPrediction) => p.probability > 0.6);
    if (highRisk.length > 0) {
      recommendations.push('Configure notificações mais agressivas para medicamentos críticos');
    }

    return recommendations;
  }

  private generateClusterRecommendations(missRate: number, avgDelay: number, period: string): string[] {
    const recommendations: string[] = [];

    if (missRate > 0.3) {
      recommendations.push('Considere ativar lembretes múltiplos');
    }

    if (avgDelay > 60) {
      recommendations.push('Tente ajustar o horário para 30 minutos mais tarde');
    }

    if (period === 'night') {
      recommendations.push('Doses noturnas podem ser desafiadoras - considere um alarme extra');
    }

    return recommendations;
  }

  private generatePredictionRecommendations(probability: number, factors: any): string[] {
    const recommendations: string[] = [];

    if (probability > 0.7) {
      recommendations.push('🚨 CRÍTICO: Ative notificações urgentes para este horário');
    }

    if (factors.consecutiveMisses >= 3) {
      recommendations.push('Você perdeu várias doses seguidas - considere mudar o horário');
    }

    if (factors.weekdayRisk > 0.6) {
      recommendations.push('Este dia da semana é desafiador para você - adicione lembretes extras');
    }

    if (factors.timeOfDayRisk > 0.6) {
      recommendations.push('Este período do dia é problemático - tente um horário diferente');
    }

    return recommendations;
  }

  private createEmptyCluster(): BehaviorCluster {
    return {
      clusterId: 'empty',
      label: 'Sem dados suficientes',
      patterns: [],
      characteristics: {
        avgDelayMinutes: 0,
        missRate: 0,
        preferredTimeRange: '00:00-00:00',
        consistency: 0
      },
      recommendations: []
    };
  }
}

