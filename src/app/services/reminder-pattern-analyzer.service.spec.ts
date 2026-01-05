import {
  ReminderPattern,
  PatternAnalysis,
  TrendAnalysis,
  WeekdayVariance,
  TimeOfDayVariance,
  BehaviorCluster,
  ForgetfulnessPrediction,
  AdvancedAnalysis
} from './reminder-pattern-analyzer.service';

/**
 * Unit tests for ReminderPatternAnalyzerService
 * Tests interfaces, types, and utility logic
 */
describe('ReminderPatternAnalyzerService', () => {
  
  describe('ReminderPattern Interface', () => {
    
    it('should create valid ReminderPattern', () => {
      const pattern: ReminderPattern = {
        id: 'pattern-1',
        userId: 'user-123',
        medicationId: 'med-1',
        medicationName: 'Aspirin',
        scheduledTime: '08:00',
        actualTime: '08:15',
        missed: false,
        dayOfWeek: 1,
        date: new Date(),
        timestamp: new Date(),
        delayMinutes: 15
      };

      expect(pattern.id).toBe('pattern-1');
      expect(pattern.medicationName).toBe('Aspirin');
      expect(pattern.scheduledTime).toBe('08:00');
      expect(pattern.missed).toBeFalse();
      expect(pattern.delayMinutes).toBe(15);
    });

    it('should create missed pattern', () => {
      const pattern: ReminderPattern = {
        id: 'pattern-2',
        medicationId: 'med-1',
        medicationName: 'Metformin',
        scheduledTime: '14:00',
        missed: true,
        dayOfWeek: 3,
        date: new Date(),
        timestamp: new Date()
      };

      expect(pattern.missed).toBeTrue();
      expect(pattern.actualTime).toBeUndefined();
      expect(pattern.delayMinutes).toBeUndefined();
    });

    it('should validate day of week range', () => {
      const days = [0, 1, 2, 3, 4, 5, 6];
      
      days.forEach(day => {
        const pattern: ReminderPattern = {
          id: 'test',
          medicationId: 'med',
          medicationName: 'Test',
          scheduledTime: '12:00',
          missed: false,
          dayOfWeek: day,
          date: new Date(),
          timestamp: new Date()
        };
        
        expect(pattern.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(pattern.dayOfWeek).toBeLessThanOrEqual(6);
      });
    });

    it('should validate scheduled time format', () => {
      const validTimes = ['00:00', '06:30', '12:00', '18:45', '23:59'];
      
      validTimes.forEach(time => {
        const pattern: ReminderPattern = {
          id: 'test',
          medicationId: 'med',
          medicationName: 'Test',
          scheduledTime: time,
          missed: false,
          dayOfWeek: 0,
          date: new Date(),
          timestamp: new Date()
        };
        
        expect(pattern.scheduledTime).toMatch(/^\d{2}:\d{2}$/);
      });
    });
  });

  describe('PatternAnalysis Interface', () => {
    
    it('should create valid PatternAnalysis', () => {
      const analysis: PatternAnalysis = {
        medicationId: 'med-1',
        medicationName: 'Aspirin',
        scheduledTime: '08:00',
        totalDoses: 30,
        missedDoses: 3,
        averageDelayMinutes: 5,
        missedPercentage: 10,
        hasRecurringMissedDoses: false,
        hasConsistentDelay: true,
        suggestedTime: '08:15',
        confidence: 0.85,
        createdAt: new Date()
      };

      expect(analysis.totalDoses).toBe(30);
      expect(analysis.missedPercentage).toBe(10);
      expect(analysis.confidence).toBe(0.85);
    });

    it('should calculate missed percentage correctly', () => {
      const analysis: PatternAnalysis = {
        medicationId: 'med-1',
        medicationName: 'Test',
        scheduledTime: '12:00',
        totalDoses: 100,
        missedDoses: 15,
        averageDelayMinutes: 0,
        missedPercentage: 15,
        hasRecurringMissedDoses: true,
        hasConsistentDelay: false,
        confidence: 0.9,
        createdAt: new Date()
      };

      const calculatedPercentage = (analysis.missedDoses / analysis.totalDoses) * 100;
      expect(calculatedPercentage).toBe(analysis.missedPercentage);
    });

    it('should detect recurring missed doses', () => {
      const analysis: PatternAnalysis = {
        medicationId: 'med-1',
        medicationName: 'Test',
        scheduledTime: '08:00',
        dayOfWeek: 1,
        totalDoses: 20,
        missedDoses: 5,
        averageDelayMinutes: 0,
        missedPercentage: 25,
        hasRecurringMissedDoses: true,
        hasConsistentDelay: false,
        confidence: 0.7,
        createdAt: new Date()
      };

      expect(analysis.hasRecurringMissedDoses).toBeTrue();
    });
  });

  describe('TrendAnalysis Interface', () => {
    
    it('should create improving trend', () => {
      const trend: TrendAnalysis = {
        slope: -0.05,
        intercept: 1.5,
        rSquared: 0.8,
        prediction: 0.2,
        confidence: 0.8,
        trend: 'improving'
      };

      expect(trend.trend).toBe('improving');
      expect(trend.slope).toBeLessThan(0);
    });

    it('should create worsening trend', () => {
      const trend: TrendAnalysis = {
        slope: 0.1,
        intercept: 0.5,
        rSquared: 0.75,
        prediction: 2.5,
        confidence: 0.75,
        trend: 'worsening'
      };

      expect(trend.trend).toBe('worsening');
      expect(trend.slope).toBeGreaterThan(0);
    });

    it('should create stable trend', () => {
      const trend: TrendAnalysis = {
        slope: 0.005,
        intercept: 1.0,
        rSquared: 0.6,
        prediction: 1.0,
        confidence: 0.6,
        trend: 'stable'
      };

      expect(trend.trend).toBe('stable');
      expect(Math.abs(trend.slope)).toBeLessThan(0.01);
    });

    it('should validate R-squared range', () => {
      const validRSquared = [0, 0.5, 0.75, 0.9, 1.0];
      
      validRSquared.forEach(r2 => {
        const trend: TrendAnalysis = {
          slope: 0,
          intercept: 0,
          rSquared: r2,
          prediction: 0,
          confidence: r2,
          trend: 'stable'
        };
        
        expect(trend.rSquared).toBeGreaterThanOrEqual(0);
        expect(trend.rSquared).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('WeekdayVariance Interface', () => {
    
    it('should create variance for all days', () => {
      const dayNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
      
      const variances: WeekdayVariance[] = dayNames.map((name, index) => ({
        dayOfWeek: index,
        dayName: name,
        missedCount: Math.floor(Math.random() * 5),
        totalDoses: 10,
        missRate: Math.random(),
        avgDelayMinutes: Math.floor(Math.random() * 30),
        riskScore: Math.random()
      }));

      expect(variances.length).toBe(7);
      expect(variances[0].dayName).toBe('Domingo');
      expect(variances[6].dayName).toBe('Sabado');
    });

    it('should calculate miss rate correctly', () => {
      const variance: WeekdayVariance = {
        dayOfWeek: 1,
        dayName: 'Segunda',
        missedCount: 2,
        totalDoses: 10,
        missRate: 0.2,
        avgDelayMinutes: 15,
        riskScore: 0.3
      };

      const calculatedRate = variance.missedCount / variance.totalDoses;
      expect(calculatedRate).toBe(variance.missRate);
    });

    it('should identify high risk days', () => {
      const variance: WeekdayVariance = {
        dayOfWeek: 5,
        dayName: 'Sexta',
        missedCount: 5,
        totalDoses: 10,
        missRate: 0.5,
        avgDelayMinutes: 45,
        riskScore: 0.8
      };

      const isHighRisk = variance.riskScore > 0.7;
      expect(isHighRisk).toBeTrue();
    });
  });

  describe('TimeOfDayVariance Interface', () => {
    
    it('should create morning variance', () => {
      const variance: TimeOfDayVariance = {
        period: 'morning',
        periodLabel: 'Manha',
        timeRange: '06:00-12:00',
        missedCount: 2,
        totalDoses: 20,
        missRate: 0.1,
        avgDelayMinutes: 10,
        riskScore: 0.2
      };

      expect(variance.period).toBe('morning');
      expect(variance.timeRange).toBe('06:00-12:00');
    });

    it('should create all period variances', () => {
      const periods: TimeOfDayVariance[] = [
        { period: 'morning', periodLabel: 'Manha', timeRange: '06:00-12:00', missedCount: 1, totalDoses: 10, missRate: 0.1, avgDelayMinutes: 5, riskScore: 0.1 },
        { period: 'afternoon', periodLabel: 'Tarde', timeRange: '12:00-18:00', missedCount: 2, totalDoses: 10, missRate: 0.2, avgDelayMinutes: 10, riskScore: 0.2 },
        { period: 'evening', periodLabel: 'Noite', timeRange: '18:00-22:00', missedCount: 3, totalDoses: 10, missRate: 0.3, avgDelayMinutes: 15, riskScore: 0.4 },
        { period: 'night', periodLabel: 'Madrugada', timeRange: '22:00-06:00', missedCount: 4, totalDoses: 10, missRate: 0.4, avgDelayMinutes: 20, riskScore: 0.5 }
      ];

      expect(periods.length).toBe(4);
      expect(periods.find(p => p.period === 'morning')).toBeDefined();
      expect(periods.find(p => p.period === 'night')).toBeDefined();
    });

    it('should identify worst period', () => {
      const periods: TimeOfDayVariance[] = [
        { period: 'morning', periodLabel: 'Manha', timeRange: '06:00-12:00', missedCount: 1, totalDoses: 10, missRate: 0.1, avgDelayMinutes: 5, riskScore: 0.1 },
        { period: 'evening', periodLabel: 'Noite', timeRange: '18:00-22:00', missedCount: 5, totalDoses: 10, missRate: 0.5, avgDelayMinutes: 30, riskScore: 0.7 }
      ];

      const worstPeriod = periods.reduce((worst, current) => 
        current.missRate > worst.missRate ? current : worst
      );

      expect(worstPeriod.period).toBe('evening');
    });
  });

  describe('BehaviorCluster Interface', () => {
    
    it('should create behavior cluster', () => {
      const cluster: BehaviorCluster = {
        clusterId: 'cluster-1',
        label: 'Pontual Matutino',
        patterns: [],
        characteristics: {
          avgDelayMinutes: 5,
          missRate: 0.05,
          preferredTimeRange: '06:00-09:00',
          consistency: 0.9
        },
        recommendations: ['Continue com os bons habitos']
      };

      expect(cluster.label).toBe('Pontual Matutino');
      expect(cluster.characteristics.consistency).toBe(0.9);
    });

    it('should identify high consistency cluster', () => {
      const cluster: BehaviorCluster = {
        clusterId: 'cluster-2',
        label: 'Consistente',
        patterns: [],
        characteristics: {
          avgDelayMinutes: 2,
          missRate: 0.02,
          preferredTimeRange: '08:00-08:30',
          consistency: 0.95
        },
        recommendations: []
      };

      const isConsistent = cluster.characteristics.consistency > 0.8;
      expect(isConsistent).toBeTrue();
    });

    it('should identify problematic cluster', () => {
      const cluster: BehaviorCluster = {
        clusterId: 'cluster-3',
        label: 'Atrasado Noturno',
        patterns: [],
        characteristics: {
          avgDelayMinutes: 45,
          missRate: 0.35,
          preferredTimeRange: '20:00-23:00',
          consistency: 0.4
        },
        recommendations: ['Considere ajustar horarios', 'Ative lembretes adicionais']
      };

      const isProblematic = cluster.characteristics.missRate > 0.25;
      expect(isProblematic).toBeTrue();
      expect(cluster.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('ForgetfulnessPrediction Interface', () => {
    
    it('should create low risk prediction', () => {
      const prediction: ForgetfulnessPrediction = {
        medicationId: 'med-1',
        scheduledTime: '08:00',
        dayOfWeek: 1,
        probability: 0.1,
        confidence: 0.8,
        riskLevel: 'low',
        factors: {
          historicalMissRate: 0.05,
          recentTrend: -0.02,
          weekdayRisk: 0.1,
          timeOfDayRisk: 0.08,
          consecutiveMisses: 0
        },
        recommendations: []
      };

      expect(prediction.riskLevel).toBe('low');
      expect(prediction.probability).toBeLessThan(0.2);
    });

    it('should create critical risk prediction', () => {
      const prediction: ForgetfulnessPrediction = {
        medicationId: 'med-2',
        scheduledTime: '22:00',
        dayOfWeek: 5,
        probability: 0.85,
        confidence: 0.75,
        riskLevel: 'critical',
        factors: {
          historicalMissRate: 0.5,
          recentTrend: 0.1,
          weekdayRisk: 0.7,
          timeOfDayRisk: 0.6,
          consecutiveMisses: 3
        },
        recommendations: [
          'Ajuste o horario do medicamento',
          'Configure lembretes adicionais',
          'Considere apoio de cuidador'
        ]
      };

      expect(prediction.riskLevel).toBe('critical');
      expect(prediction.probability).toBeGreaterThan(0.7);
      expect(prediction.factors.consecutiveMisses).toBeGreaterThan(0);
    });

    it('should validate risk levels', () => {
      const levels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
      
      levels.forEach(level => {
        const prediction: ForgetfulnessPrediction = {
          medicationId: 'test',
          scheduledTime: '12:00',
          dayOfWeek: 0,
          probability: 0.5,
          confidence: 0.5,
          riskLevel: level,
          factors: {
            historicalMissRate: 0,
            recentTrend: 0,
            weekdayRisk: 0,
            timeOfDayRisk: 0,
            consecutiveMisses: 0
          },
          recommendations: []
        };
        
        expect(levels).toContain(prediction.riskLevel);
      });
    });
  });

  describe('AdvancedAnalysis Interface', () => {
    
    it('should create complete advanced analysis', () => {
      const analysis: AdvancedAnalysis = {
        userId: 'user-123',
        medicationId: 'med-1',
        analyzedAt: new Date(),
        trendAnalysis: {
          slope: -0.02,
          intercept: 1.0,
          rSquared: 0.7,
          prediction: 0.5,
          confidence: 0.7,
          trend: 'improving'
        },
        weekdayVariance: [],
        timeOfDayVariance: [],
        behaviorClusters: [],
        dominantCluster: {
          clusterId: 'default',
          label: 'Default',
          patterns: [],
          characteristics: {
            avgDelayMinutes: 0,
            missRate: 0,
            preferredTimeRange: '',
            consistency: 0
          },
          recommendations: []
        },
        predictions: [],
        overallAdherenceScore: 85,
        insights: ['Tendencia de melhora detectada'],
        recommendations: ['Mantenha os bons habitos']
      };

      expect(analysis.userId).toBe('user-123');
      expect(analysis.overallAdherenceScore).toBe(85);
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should validate adherence score range', () => {
      const scores = [0, 25, 50, 75, 100];
      
      scores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Trend Determination Logic', () => {
    
    function determineTrend(slope: number): 'improving' | 'worsening' | 'stable' {
      if (Math.abs(slope) < 0.01) {
        return 'stable';
      } else if (slope > 0) {
        return 'worsening';
      } else {
        return 'improving';
      }
    }

    it('should identify improving trend', () => {
      expect(determineTrend(-0.05)).toBe('improving');
      expect(determineTrend(-0.1)).toBe('improving');
    });

    it('should identify worsening trend', () => {
      expect(determineTrend(0.05)).toBe('worsening');
      expect(determineTrend(0.1)).toBe('worsening');
    });

    it('should identify stable trend', () => {
      expect(determineTrend(0)).toBe('stable');
      expect(determineTrend(0.005)).toBe('stable');
      expect(determineTrend(-0.005)).toBe('stable');
    });
  });

  describe('Risk Score Calculation', () => {
    
    function calculateRiskScore(factors: {
      historicalMissRate: number;
      recentTrend: number;
      weekdayRisk: number;
      timeOfDayRisk: number;
      consecutiveMisses: number;
    }): number {
      const weights = {
        historical: 0.3,
        trend: 0.2,
        weekday: 0.2,
        timeOfDay: 0.2,
        consecutive: 0.1
      };

      const score = 
        factors.historicalMissRate * weights.historical +
        Math.max(0, factors.recentTrend) * weights.trend +
        factors.weekdayRisk * weights.weekday +
        factors.timeOfDayRisk * weights.timeOfDay +
        Math.min(factors.consecutiveMisses / 5, 1) * weights.consecutive;

      return Math.min(1, Math.max(0, score));
    }

    it('should calculate low risk score', () => {
      const score = calculateRiskScore({
        historicalMissRate: 0.05,
        recentTrend: -0.1,
        weekdayRisk: 0.1,
        timeOfDayRisk: 0.1,
        consecutiveMisses: 0
      });

      expect(score).toBeLessThan(0.2);
    });

    it('should calculate high risk score', () => {
      const score = calculateRiskScore({
        historicalMissRate: 0.5,
        recentTrend: 0.2,
        weekdayRisk: 0.7,
        timeOfDayRisk: 0.6,
        consecutiveMisses: 3
      });

      expect(score).toBeGreaterThan(0.4);
    });

    it('should clamp score to valid range', () => {
      const extremeScore = calculateRiskScore({
        historicalMissRate: 1,
        recentTrend: 1,
        weekdayRisk: 1,
        timeOfDayRisk: 1,
        consecutiveMisses: 10
      });

      expect(extremeScore).toBeLessThanOrEqual(1);
      expect(extremeScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Risk Level Classification', () => {
    
    function classifyRiskLevel(probability: number): 'low' | 'medium' | 'high' | 'critical' {
      if (probability < 0.2) return 'low';
      if (probability < 0.5) return 'medium';
      if (probability < 0.75) return 'high';
      return 'critical';
    }

    it('should classify low risk', () => {
      expect(classifyRiskLevel(0.1)).toBe('low');
      expect(classifyRiskLevel(0.19)).toBe('low');
    });

    it('should classify medium risk', () => {
      expect(classifyRiskLevel(0.2)).toBe('medium');
      expect(classifyRiskLevel(0.49)).toBe('medium');
    });

    it('should classify high risk', () => {
      expect(classifyRiskLevel(0.5)).toBe('high');
      expect(classifyRiskLevel(0.74)).toBe('high');
    });

    it('should classify critical risk', () => {
      expect(classifyRiskLevel(0.75)).toBe('critical');
      expect(classifyRiskLevel(1.0)).toBe('critical');
    });
  });
});
