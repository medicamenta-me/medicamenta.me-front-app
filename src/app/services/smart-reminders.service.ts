import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { UserService } from './user.service';
import { IndexedDBService } from './indexed-db.service';
import { FirebaseService } from './firebase.service';
import { ReminderPatternAnalyzerService, AdvancedAnalysis } from './reminder-pattern-analyzer.service';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

/**
 * Padrão de lembrete
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
 * Análise de padrão
 */
export interface PatternAnalysis {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  dayOfWeek?: number;
  
  // Estatísticas
  totalDoses: number;
  missedDoses: number;
  averageDelayMinutes: number;
  missedPercentage: number;
  
  // Padrões detectados
  hasRecurringMissedDoses: boolean; // 3+ doses perdidas no mesmo horário/dia
  hasConsistentDelay: boolean; // Atraso médio > 30min
  
  // Sugestões
  suggestedTime?: string;
  suggestedDayChange?: boolean;
  confidence: number; // 0-1
  
  createdAt: Date;
}

/**
 * Sugestão de ajuste
 */
export interface SmartSuggestion {
  id: string;
  type: 'time-adjustment' | 'day-change' | 'risk-alert' | 'praise';
  medicationId: string;
  medicationName: string;
  
  title: string;
  description: string;
  analysis: PatternAnalysis;
  
  // Ações
  suggestedAction?: {
    type: 'change-time' | 'change-day' | 'increase-reminders' | 'none';
    newTime?: string;
    newDay?: number;
    reminderMinutesBefore?: number;
  };
  
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'rejected' | 'dismissed';
  
  createdAt: Date;
  respondedAt?: Date;
}

/**
 * Risco de esquecimento
 */
export interface ForgetfulnessRisk {
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskPercentage: number;
  reasons: string[];
  today: Date;
}

/**
 * Serviço de Lembretes Inteligentes
 * Analisa padrões de uso e sugere melhorias
 */
@Injectable({
  providedIn: 'root'
})
export class SmartRemindersService {
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);
  private readonly userService = inject(UserService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly mlAnalyzer = inject(ReminderPatternAnalyzerService);

  // Estado
  private readonly _patterns = signal<ReminderPattern[]>([]);
  private readonly _analyses = signal<PatternAnalysis[]>([]);
  private readonly _suggestions = signal<SmartSuggestion[]>([]);
  private readonly _risks = signal<ForgetfulnessRisk[]>([]);
  private readonly _advancedAnalysis = signal<AdvancedAnalysis | null>(null);

  // Sinais públicos
  public readonly patterns = this._patterns.asReadonly();
  public readonly analyses = this._analyses.asReadonly();
  public readonly suggestions = this._suggestions.asReadonly();
  public readonly risks = this._risks.asReadonly();
  public readonly advancedAnalysis = this._advancedAnalysis.asReadonly();

  // Computed
  public readonly pendingSuggestions = computed(() => 
    this._suggestions().filter(s => s.status === 'pending')
  );

  public readonly highRisks = computed(() =>
    this._risks().filter(r => r.riskLevel === 'high')
  );

  // Real-time listeners
  private patternsUnsubscribe: Unsubscribe | null = null;
  private suggestionsUnsubscribe: Unsubscribe | null = null;
  private analysesUnsubscribe: Unsubscribe | null = null;

  // Configuração de análise
  private readonly ANALYSIS_WINDOW_DAYS = 30; // Analisar últimos 30 dias
  private readonly MIN_SAMPLES_FOR_PATTERN = 5; // Mínimo de doses para análise
  private readonly RECURRING_MISSED_THRESHOLD = 3; // 3+ doses perdidas = padrão
  private readonly DELAY_THRESHOLD_MINUTES = 30; // Atraso > 30min = consistente

  constructor() {
    this.loadData();
    this.setupFirestoreSync();

    // React to user changes - cleanup and reinitialize when user changes
    effect(() => {
      const userId = this.userService.currentUser()?.id;
      if (userId) {
        this.logService.debug('SmartReminders', 'User changed, reinitializing', { userId });
        this.cleanupRealtimeListeners();
        this.loadData();
        this.setupFirestoreSync();
      } else {
        this.logService.debug('SmartReminders', 'User logged out, cleaning up');
        this.cleanup();
      }
    });
  }

  /**
   * Carrega dados salvos
   */
  private async loadData(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      const [patterns, analyses, suggestions] = await Promise.all([
        this.indexedDB.get<ReminderPattern[]>('reminder-patterns', userId),
        this.indexedDB.get<PatternAnalysis[]>('pattern-analyses', userId),
        this.indexedDB.get<SmartSuggestion[]>('smart-suggestions', userId)
      ]);

      if (patterns) this._patterns.set(patterns);
      if (analyses) this._analyses.set(analyses);
      if (suggestions) this._suggestions.set(suggestions);
    } catch (error: any) {
      this.logService.error('SmartRemindersService', 'Failed to load data', error as Error);
    }
  }

  /**
   * Salva dados
   */
  private async saveData(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      await Promise.all([
        this.indexedDB.put('reminder-patterns', this._patterns()),
        this.indexedDB.put('pattern-analyses', this._analyses()),
        this.indexedDB.put('smart-suggestions', this._suggestions())
      ]);
    } catch (error: any) {
      this.logService.error('SmartRemindersService', 'Failed to save data', error as Error);
    }
  }

  /**
   * Analisa todos os padrões de medicações
   */
  async analyzeAllPatterns(): Promise<void> {
    this.logService.debug('SmartRemindersService', 'Starting pattern analysis...');

    // Coletar padrões dos logs
    await this.collectPatternsFromLogs();

    // Analisar cada medicação
    const medications = this.medicationService.medications();
    const analyses: PatternAnalysis[] = [];
    const suggestions: SmartSuggestion[] = [];

    for (const medication of medications) {
      if (!medication.id) continue;

      const analysis = await this.analyzeMedication(medication.id);
      if (analysis) {
        analyses.push(analysis);

        // Gerar sugestão se necessário
        const suggestion = this.generateSuggestion(analysis);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    this._analyses.set(analyses);
    this._suggestions.update(existing => {
      // Manter sugestões existentes não respondidas
      const kept = existing.filter(s => s.status !== 'pending');
      return [...kept, ...suggestions];
    });

    await this.saveData();

    this.logService.debug('SmartRemindersService', `Analysis complete: ${analyses.length} medications analyzed, ${suggestions.length} new suggestions`);
  }

  /**
   * Coleta padrões dos logs
   */
  private async collectPatternsFromLogs(): Promise<void> {
    const logs = this.logService.logs();
    const medications = this.medicationService.medications();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.ANALYSIS_WINDOW_DAYS);

    const patterns: ReminderPattern[] = [];

    for (const log of logs) {
      const logDate = new Date(log.timestamp);
      if (logDate < cutoffDate) continue;

      // Encontrar medicação do log
      const medication = medications.find(m => 
        log.message.includes(m.name)
      );

      if (!medication || !medication.id) continue;

      // Extrair horário agendado (do log ou da medicação)
      const scheduledTime = this.extractScheduledTime(log, medication);
      if (!scheduledTime) continue;

      const pattern: ReminderPattern = {
        id: `${medication.id}-${log.timestamp.getTime()}`,
        userId: this.userService.currentUser()?.id,
        medicationId: medication.id,
        medicationName: medication.name,
        scheduledTime,
        actualTime: log.eventType === 'taken' ? this.formatTime(logDate) : undefined,
        missed: log.eventType === 'missed',
        dayOfWeek: logDate.getDay(),
        date: logDate,
        timestamp: log.timestamp,
        delayMinutes: log.eventType === 'taken' ? this.calculateDelay(scheduledTime, logDate) : undefined
      };

      patterns.push(pattern);
    }

    this._patterns.set(patterns);
    await this.saveData();
  }

  /**
   * Analisa uma medicação específica
   */
  private async analyzeMedication(medicationId: string): Promise<PatternAnalysis | null> {
    const patterns = this._patterns().filter(p => p.medicationId === medicationId);
    
    if (patterns.length < this.MIN_SAMPLES_FOR_PATTERN) {
      return null; // Dados insuficientes
    }

    const medication = this.medicationService.medications().find(m => m.id === medicationId);
    if (!medication) return null;

    // Agrupar por horário agendado
    const groupedByTime = this.groupBy(patterns, p => p.scheduledTime);
    
    const analyses: PatternAnalysis[] = [];

    for (const [scheduledTime, timePatterns] of Object.entries(groupedByTime)) {
      const totalDoses = timePatterns.length;
      const missedDoses = timePatterns.filter(p => p.missed).length;
      const takenPatterns = timePatterns.filter(p => !p.missed && p.delayMinutes !== undefined);
      
      const averageDelayMinutes = takenPatterns.length > 0
        ? takenPatterns.reduce((sum, p) => sum + (p.delayMinutes || 0), 0) / takenPatterns.length
        : 0;

      const missedPercentage = (missedDoses / totalDoses) * 100;

      // Detectar padrões
      const hasRecurringMissedDoses = missedDoses >= this.RECURRING_MISSED_THRESHOLD;
      const hasConsistentDelay = averageDelayMinutes > this.DELAY_THRESHOLD_MINUTES;

      // Sugerir novo horário se houver atraso consistente
      let suggestedTime: string | undefined;
      let confidence = 0;

      if (hasConsistentDelay) {
        suggestedTime = this.calculateSuggestedTime(scheduledTime, averageDelayMinutes);
        confidence = Math.min(0.9, takenPatterns.length / 10); // Confiança aumenta com mais dados
      }

      const analysis: PatternAnalysis = {
        medicationId,
        medicationName: medication.name,
        scheduledTime,
        totalDoses,
        missedDoses,
        averageDelayMinutes,
        missedPercentage,
        hasRecurringMissedDoses,
        hasConsistentDelay,
        suggestedTime,
        confidence,
        createdAt: new Date()
      };

      analyses.push(analysis);
    }

    // Retornar análise mais relevante (maior problema)
    return analyses.sort((a, b) => {
      if (a.hasRecurringMissedDoses !== b.hasRecurringMissedDoses) {
        return a.hasRecurringMissedDoses ? -1 : 1;
      }
      if (a.hasConsistentDelay !== b.hasConsistentDelay) {
        return a.hasConsistentDelay ? -1 : 1;
      }
      return b.missedPercentage - a.missedPercentage;
    })[0] || null;
  }

  /**
   * Gera sugestão baseada na análise
   */
  private generateSuggestion(analysis: PatternAnalysis): SmartSuggestion | null {
    const existingSuggestion = this._suggestions().find(
      s => s.medicationId === analysis.medicationId && 
           s.status === 'pending' &&
           s.analysis.scheduledTime === analysis.scheduledTime
    );

    if (existingSuggestion) {
      return null; // Já existe sugestão pendente
    }

    // Sugestão de ajuste de horário
    if (analysis.hasConsistentDelay && analysis.suggestedTime) {
      return {
        id: `suggestion-${Date.now()}-${analysis.medicationId}`,
        type: 'time-adjustment',
        medicationId: analysis.medicationId,
        medicationName: analysis.medicationName,
        title: '⏰ Ajuste de Horário Sugerido',
        description: `Você costuma tomar ${analysis.medicationName} às ${analysis.suggestedTime} (${Math.round(analysis.averageDelayMinutes)} min após o horário agendado). Gostaria de ajustar o horário?`,
        analysis,
        suggestedAction: {
          type: 'change-time',
          newTime: analysis.suggestedTime
        },
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      };
    }

    // Sugestão de mudança de dia
    if (analysis.hasRecurringMissedDoses) {
      return {
        id: `suggestion-${Date.now()}-${analysis.medicationId}`,
        type: 'day-change',
        medicationId: analysis.medicationId,
        medicationName: analysis.medicationName,
        title: '📅 Padrão de Doses Perdidas Detectado',
        description: `Você perdeu ${analysis.missedDoses} doses de ${analysis.medicationName} às ${analysis.scheduledTime}. Considere mudar o horário ou aumentar lembretes.`,
        analysis,
        suggestedAction: {
          type: 'increase-reminders',
          reminderMinutesBefore: 15
        },
        priority: 'high',
        status: 'pending',
        createdAt: new Date()
      };
    }

    // Elogio por boa adesão
    if (analysis.missedPercentage < 10 && analysis.totalDoses > 10) {
      return {
        id: `suggestion-${Date.now()}-${analysis.medicationId}`,
        type: 'praise',
        medicationId: analysis.medicationId,
        medicationName: analysis.medicationName,
        title: '🎉 Excelente Adesão!',
        description: `Você tem ${(100 - analysis.missedPercentage).toFixed(0)}% de adesão com ${analysis.medicationName}. Continue assim!`,
        analysis,
        priority: 'low',
        status: 'pending',
        createdAt: new Date()
      };
    }

    return null;
  }

  /**
   * Analisa risco de esquecimento para hoje
   */
  async analyzeForgetfulnessRisk(): Promise<void> {
    const medications = this.medicationService.medications();
    const today = new Date();
    const dayOfWeek = today.getDay();
    const risks: ForgetfulnessRisk[] = [];

    for (const medication of medications) {
      if (!medication.id || !medication.schedule || medication.schedule.length === 0) continue;

      for (const dose of medication.schedule) {
        const patterns = this._patterns().filter(
          p => p.medicationId === medication.id &&
               p.scheduledTime === dose.time &&
               p.dayOfWeek === dayOfWeek
        );

        if (patterns.length < 3) continue; // Dados insuficientes

        const recentPatterns = patterns.slice(-5); // Últimas 5 ocorrências
        const missedCount = recentPatterns.filter(p => p.missed).length;
        const riskPercentage = (missedCount / recentPatterns.length) * 100;

        let riskLevel: 'high' | 'medium' | 'low';
        if (riskPercentage >= 60) riskLevel = 'high';
        else if (riskPercentage >= 30) riskLevel = 'medium';
        else riskLevel = 'low';

        const reasons: string[] = [];
        if (missedCount > 0) {
          reasons.push(`${missedCount} doses perdidas nas últimas 5 vezes`);
        }
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          reasons.push('Fins de semana têm maior taxa de esquecimento');
        }

        if (riskLevel !== 'low') {
          risks.push({
            medicationId: medication.id,
            medicationName: medication.name,
            scheduledTime: dose.time,
            riskLevel,
            riskPercentage,
            reasons,
            today
          });
        }
      }
    }

    this._risks.set(risks);
  }

  /**
   * Aceita uma sugestão
   */
  async acceptSuggestion(suggestionId: string): Promise<void> {
    const suggestion = this._suggestions().find(s => s.id === suggestionId);
    if (!suggestion || suggestion.status !== 'pending') return;

    // Aplicar ação sugerida
    if (suggestion.suggestedAction) {
      const medication = this.medicationService.medications().find(m => m.id === suggestion.medicationId);
      if (medication && suggestion.suggestedAction.type === 'change-time' && suggestion.suggestedAction.newTime) {
        // Atualizar horário da medicação
        const updatedSchedule = medication.schedule.map(dose => {
          if (dose.time === suggestion.analysis.scheduledTime) {
            return { ...dose, time: suggestion.suggestedAction!.newTime! };
          }
          return dose;
        });
          
        await this.medicationService.updateMedication(medication.id, {
          schedule: updatedSchedule
        });
      }
    }

    // Marcar como aceita
    this._suggestions.update(suggestions =>
      suggestions.map(s => s.id === suggestionId
        ? { ...s, status: 'accepted' as const, respondedAt: new Date() }
        : s
      )
    );

    await this.saveData();
  }

  /**
   * Rejeita uma sugestão
   */
  async rejectSuggestion(suggestionId: string): Promise<void> {
    this._suggestions.update(suggestions =>
      suggestions.map(s => s.id === suggestionId
        ? { ...s, status: 'rejected' as const, respondedAt: new Date() }
        : s
      )
    );

    await this.saveData();
  }

  /**
   * Dispensa uma sugestão (dismiss)
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    this._suggestions.update(suggestions =>
      suggestions.map(s => s.id === suggestionId
        ? { ...s, status: 'dismissed' as const, respondedAt: new Date() }
        : s
      )
    );

    await this.saveData();
  }

  /**
   * Extrai horário agendado do log
   */
  private extractScheduledTime(log: any, medication: any): string | null {
    // Tentar extrair do log message
    const timeMatch = log.message.match(/(\d{2}:\d{2})/);
    if (timeMatch) return timeMatch[1];

    // Fallback: primeiro horário da medicação
    if (medication.schedule?.times && medication.schedule.times.length > 0) {
      return medication.schedule.times[0];
    }

    return null;
  }

  /**
   * Formata data para horário HH:MM
   */
  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Calcula atraso em minutos
   */
  private calculateDelay(scheduledTime: string, actualTime: Date): number {
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduled = new Date(actualTime);
    scheduled.setHours(hours, minutes, 0, 0);

    return Math.round((actualTime.getTime() - scheduled.getTime()) / 60000);
  }

  /**
   * Calcula horário sugerido baseado no atraso médio
   */
  private calculateSuggestedTime(scheduledTime: string, averageDelayMinutes: number): string {
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + Math.round(averageDelayMinutes);
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;
    
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  }

  /**
   * Agrupa array por função
   */
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((result, item) => {
      const key = keyFn(item);
      if (!result[key]) result[key] = [];
      result[key].push(item);
      return result;
    }, {} as Record<string, T[]>);
  }

  /**
   * Limpa dados antigos
   */
  async cleanOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.ANALYSIS_WINDOW_DAYS);

    this._patterns.update(patterns =>
      patterns.filter(p => new Date(p.date) >= cutoffDate)
    );

    this._suggestions.update(suggestions =>
      suggestions.filter(s => 
        s.status === 'pending' || 
        (s.respondedAt && new Date(s.respondedAt) >= cutoffDate)
      )
    );

    await this.saveData();
  }

  // ============================================================================
  // FIRESTORE SYNC
  // ============================================================================

  /**
   * Configura sincronização em tempo real com Firestore
   */
  private setupFirestoreSync(): void {
    const userId = this.userService.currentUser()?.id;
    if (!userId) {
      this.logService.debug('SmartReminders', 'No user logged in, skipping Firestore sync');
      return;
    }

    this.logService.debug('SmartReminders', 'Setting up Firestore sync', { userId });

    // Sync inicial
    this.syncFromFirestore(userId);

    // Setup real-time listeners
    this.setupRealtimeListeners(userId);
  }

  /**
   * Configura listeners em tempo real para padrões, análises e sugestões
   */
  private setupRealtimeListeners(userId: string): void {
    const db = this.firebaseService.firestore;

    // Cleanup existing listeners
    this.cleanupRealtimeListeners();

    this.logService.debug('SmartReminders', 'Setting up real-time listeners', { userId });

    // Listener para reminder patterns
    const patternsRef = collection(db, `users/${userId}/reminder-patterns`);
    const patternsQuery = query(patternsRef, orderBy('date', 'desc'), limit(100));
    
    this.patternsUnsubscribe = onSnapshot(
      patternsQuery, 
      async (snapshot) => {
        this.logService.debug('SmartReminders', `Real-time update: ${snapshot.docs.length} patterns`);
        
        const patterns: ReminderPattern[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          patterns.push({
            ...data,
            id: doc.id,
            date: data['date']?.toDate() || new Date(),
            timestamp: data['timestamp']?.toDate() || new Date(),
          } as ReminderPattern);
        });

        this._patterns.set(patterns);
        await this.indexedDB.put('reminder-patterns', patterns);
      },
      (error) => {
        this.logService.error('SmartReminders', 'Patterns listener error', error as Error);
      }
    );

    // Listener para smart suggestions
    const suggestionsRef = collection(db, `users/${userId}/smart-suggestions`);
    const suggestionsQuery = query(suggestionsRef, orderBy('createdAt', 'desc'), limit(50));
    
    this.suggestionsUnsubscribe = onSnapshot(
      suggestionsQuery,
      async (snapshot) => {
        this.logService.debug('SmartReminders', `Real-time update: ${snapshot.docs.length} suggestions`);
        
        const suggestions: SmartSuggestion[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          suggestions.push({
            ...data,
            id: doc.id,
            createdAt: data['createdAt']?.toDate() || new Date(),
            respondedAt: data['respondedAt']?.toDate(),
          } as SmartSuggestion);
        });

        this._suggestions.set(suggestions);
        await this.indexedDB.put('smart-suggestions', suggestions);
      },
      (error) => {
        this.logService.error('SmartReminders', 'Suggestions listener error', error as Error);
      }
    );

    // Listener para pattern analyses
    const analysesRef = collection(db, `users/${userId}/pattern-analyses`);
    const analysesQuery = query(analysesRef, orderBy('createdAt', 'desc'), limit(50));
    
    this.analysesUnsubscribe = onSnapshot(
      analysesQuery,
      async (snapshot) => {
        this.logService.debug('SmartReminders', `Real-time update: ${snapshot.docs.length} analyses`);
        
        const analyses: PatternAnalysis[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          analyses.push({
            ...data,
            id: doc.id,
            createdAt: data['createdAt']?.toDate() || new Date(),
          } as any);
        });

        this._analyses.set(analyses);
        await this.indexedDB.put('pattern-analyses', analyses);
      },
      (error) => {
        this.logService.error('SmartReminders', 'Analyses listener error', error as Error);
      }
    );

    this.logService.debug('SmartReminders', '✅ Real-time listeners active');
  }

  /**
   * Limpa listeners em tempo real
   */
  private cleanupRealtimeListeners(): void {
    if (this.patternsUnsubscribe) {
      this.patternsUnsubscribe();
      this.patternsUnsubscribe = null;
    }
    if (this.suggestionsUnsubscribe) {
      this.suggestionsUnsubscribe();
      this.suggestionsUnsubscribe = null;
    }
    if (this.analysesUnsubscribe) {
      this.analysesUnsubscribe();
      this.analysesUnsubscribe = null;
    }
    this.logService.debug('SmartReminders', 'Real-time listeners cleaned up');
  }

  /**
   * Sincroniza dados do Firestore para local
   */
  async syncFromFirestore(userId: string): Promise<void> {
    try {
      const db = this.firebaseService.firestore;

      // Buscar padrões
      const patternsRef = collection(db, `users/${userId}/reminder-patterns`);
      const patternsSnap = await getDocs(query(patternsRef, orderBy('date', 'desc'), limit(100)));
      
      const patterns: ReminderPattern[] = [];
      patternsSnap.forEach(doc => {
        const data = doc.data();
        patterns.push({
          ...data,
          id: doc.id,
          date: data['date']?.toDate() || new Date(),
        } as ReminderPattern);
      });

      if (patterns.length > 0) {
        this._patterns.set(patterns);
        await this.indexedDB.put('reminder-patterns', patterns);
        this.logService.debug('SmartReminders', `Synced ${patterns.length} patterns from Firestore`);
      }

      // Buscar sugestões
      const suggestionsRef = collection(db, `users/${userId}/smart-suggestions`);
      const suggestionsSnap = await getDocs(query(suggestionsRef, orderBy('createdAt', 'desc'), limit(50)));
      
      const suggestions: SmartSuggestion[] = [];
      suggestionsSnap.forEach(doc => {
        const data = doc.data();
        suggestions.push({
          ...data,
          id: doc.id,
          createdAt: data['createdAt']?.toDate() || new Date(),
          respondedAt: data['respondedAt']?.toDate(),
        } as SmartSuggestion);
      });

      if (suggestions.length > 0) {
        this._suggestions.set(suggestions);
        await this.indexedDB.put('smart-suggestions', suggestions);
        this.logService.debug('SmartReminders', `Synced ${suggestions.length} suggestions from Firestore`);
      }

      // Buscar análise avançada
      const analysisDoc = await getDoc(doc(db, `users/${userId}/analytics/smart-reminders-advanced`));
      if (analysisDoc.exists()) {
        const data = analysisDoc.data();
        const advancedAnalysis: AdvancedAnalysis = {
          ...data,
          analyzedAt: data['analyzedAt']?.toDate() || new Date(),
        } as AdvancedAnalysis;

        this._advancedAnalysis.set(advancedAnalysis);
        this.logService.debug('SmartReminders', 'Synced advanced analysis from Firestore');
      }

    } catch (error: any) {
      this.logService.error('SmartReminders', 'Error syncing from Firestore', error as Error);
    }
  }

  /**
   * Sincroniza dados locais para Firestore
   */
  async syncToFirestore(): Promise<void> {
    const userId = this.userService.currentUser()?.id;
    if (!userId) {
      this.logService.debug('SmartReminders', 'No user logged in, skipping sync to Firestore');
      return;
    }

    try {
      const db = this.firebaseService.firestore;

      // Sincronizar padrões (últimos 100)
      const patterns = this._patterns().slice(0, 100);
      for (const pattern of patterns) {
        const docRef = doc(db, `users/${userId}/reminder-patterns/${pattern.id}`);
        await setDoc(docRef, {
          ...pattern,
          date: Timestamp.fromDate(new Date(pattern.date)),
          syncedAt: serverTimestamp()
        }, { merge: true });
      }

      // Sincronizar sugestões
      const suggestions = this._suggestions();
      for (const suggestion of suggestions) {
        const docRef = doc(db, `users/${userId}/smart-suggestions/${suggestion.id}`);
        await setDoc(docRef, {
          ...suggestion,
          createdAt: Timestamp.fromDate(new Date(suggestion.createdAt)),
          respondedAt: suggestion.respondedAt ? Timestamp.fromDate(new Date(suggestion.respondedAt)) : null,
          syncedAt: serverTimestamp()
        }, { merge: true });
      }

      // Sincronizar análise avançada
      const advancedAnalysis = this._advancedAnalysis();
      if (advancedAnalysis) {
        const docRef = doc(db, `users/${userId}/analytics/smart-reminders-advanced`);
        await setDoc(docRef, {
          ...advancedAnalysis,
          analyzedAt: Timestamp.fromDate(new Date(advancedAnalysis.analyzedAt)),
          syncedAt: serverTimestamp()
        }, { merge: true });
      }

      this.logService.debug('SmartReminders', 'Successfully synced to Firestore');

    } catch (error: any) {
      this.logService.error('SmartReminders', 'Error syncing to Firestore', error as Error);
      throw error;
    }
  }

  /**
   * Deleta dados do Firestore
   */
  async deleteFromFirestore(itemId: string, type: 'pattern' | 'suggestion'): Promise<void> {
    const userId = this.userService.currentUser()?.id;
    if (!userId) return;

    try {
      const db = this.firebaseService.firestore;
      const collection = type === 'pattern' ? 'reminder-patterns' : 'smart-suggestions';
      const docRef = doc(db, `users/${userId}/${collection}/${itemId}`);
      
      await deleteDoc(docRef);
      this.logService.debug('SmartReminders', `Deleted ${type} ${itemId} from Firestore`);

    } catch (error: any) {
      this.logService.error('SmartReminders', 'Error deleting from Firestore', error as Error);
    }
  }

  // ============================================================================
  // MACHINE LEARNING AVANÇADO
  // ============================================================================

  /**
   * Executa análise avançada com ML
   */
  async runAdvancedAnalysis(medicationId?: string): Promise<AdvancedAnalysis> {
    const patterns = this._patterns();
    
    if (patterns.length < 10) {
      throw new Error('Dados insuficientes para análise avançada. Mínimo: 10 registros.');
    }

    this.logService.debug('SmartReminders', 'Running advanced ML analysis...');

    try {
      // Executar análise com ML
      const analysis = await this.mlAnalyzer.analyzeAdvanced(patterns, medicationId);

      // Salvar resultado
      this._advancedAnalysis.set(analysis);

      // Gerar sugestões baseadas na análise avançada
      await this.generateAdvancedSuggestions(analysis);

      // Sincronizar com Firestore
      await this.syncToFirestore();

      this.logService.debug('SmartReminders', 'Advanced analysis completed successfully');
      
      return analysis;

    } catch (error: any) {
      this.logService.error('SmartReminders', 'Error in advanced analysis', error as Error);
      throw error;
    }
  }

  /**
   * Gera sugestões baseadas na análise avançada
   */
  private async generateAdvancedSuggestions(analysis: AdvancedAnalysis): Promise<void> {
    const newSuggestions: SmartSuggestion[] = [];

    // Sugestões baseadas em previsões de alto risco
    const criticalPredictions = analysis.predictions.filter(p => p.riskLevel === 'critical');
    
    for (const prediction of criticalPredictions) {
      const medication = this.medicationService.medications()
        .find(m => m.id === prediction.medicationId);

      if (!medication) continue;

      const suggestion: SmartSuggestion = {
        id: `ml-risk-${prediction.medicationId}-${Date.now()}`,
        type: 'risk-alert',
        medicationId: prediction.medicationId,
        medicationName: medication.name,
        title: '🚨 Alerta de Alto Risco de Esquecimento',
        description: `Nossa IA detectou ${(prediction.probability * 100).toFixed(0)}% de probabilidade de você esquecer ${medication.name} às ${prediction.scheduledTime}. ${prediction.recommendations[0] || 'Configure lembretes extras.'}`,
        analysis: {
          medicationId: prediction.medicationId,
          medicationName: medication.name,
          scheduledTime: prediction.scheduledTime,
          totalDoses: 0,
          missedDoses: 0,
          averageDelayMinutes: 0,
          missedPercentage: prediction.probability * 100,
          hasRecurringMissedDoses: true,
          hasConsistentDelay: false,
          confidence: prediction.confidence,
          createdAt: new Date()
        },
        suggestedAction: {
          type: 'increase-reminders',
          reminderMinutesBefore: 30
        },
        priority: 'high',
        status: 'pending',
        createdAt: new Date()
      };

      newSuggestions.push(suggestion);
    }

    // Sugestões baseadas em variância de dia da semana
    const worstWeekday = analysis.weekdayVariance[0];
    if (worstWeekday && worstWeekday.riskScore > 0.6) {
      const suggestion: SmartSuggestion = {
        id: `ml-weekday-${Date.now()}`,
        type: 'day-change',
        medicationId: analysis.medicationId || 'all',
        medicationName: 'Múltiplos Medicamentos',
        title: `📅 ${worstWeekday.dayName} é seu dia mais desafiador`,
        description: `Você perde ${(worstWeekday.missRate * 100).toFixed(0)}% das doses às ${worstWeekday.dayName}s. Considere adicionar lembretes extras ou ajustar horários neste dia.`,
        analysis: {
          medicationId: 'all',
          medicationName: 'Todos',
          scheduledTime: '00:00',
          dayOfWeek: worstWeekday.dayOfWeek,
          totalDoses: worstWeekday.totalDoses,
          missedDoses: worstWeekday.missedCount,
          averageDelayMinutes: worstWeekday.avgDelayMinutes,
          missedPercentage: worstWeekday.missRate * 100,
          hasRecurringMissedDoses: true,
          hasConsistentDelay: false,
          confidence: 0.8,
          createdAt: new Date()
        },
        suggestedAction: {
          type: 'increase-reminders',
          reminderMinutesBefore: 60
        },
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      };

      newSuggestions.push(suggestion);
    }

    // Sugestões baseadas em período do dia
    const worstPeriod = analysis.timeOfDayVariance[0];
    if (worstPeriod && worstPeriod.riskScore > 0.6) {
      const suggestion: SmartSuggestion = {
        id: `ml-period-${Date.now()}`,
        type: 'time-adjustment',
        medicationId: analysis.medicationId || 'all',
        medicationName: 'Múltiplos Medicamentos',
        title: `🕐 Dificuldade no período da ${worstPeriod.periodLabel}`,
        description: `Você perde ${(worstPeriod.missRate * 100).toFixed(0)}% das doses durante a ${worstPeriod.periodLabel.toLowerCase()}. Considere ajustar os horários.`,
        analysis: {
          medicationId: 'all',
          medicationName: 'Todos',
          scheduledTime: worstPeriod.timeRange,
          totalDoses: worstPeriod.totalDoses,
          missedDoses: worstPeriod.missedCount,
          averageDelayMinutes: worstPeriod.avgDelayMinutes,
          missedPercentage: worstPeriod.missRate * 100,
          hasRecurringMissedDoses: true,
          hasConsistentDelay: true,
          confidence: 0.75,
          createdAt: new Date()
        },
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      };

      newSuggestions.push(suggestion);
    }

    // Adicionar novas sugestões
    if (newSuggestions.length > 0) {
      this._suggestions.update(existing => [...newSuggestions, ...existing]);
      await this.saveData();
      this.logService.debug('SmartReminders', `Generated ${newSuggestions.length} advanced suggestions`);
    }
  }

  /**
   * Obtém análise avançada atual ou executa nova
   */
  async getAdvancedAnalysis(medicationId?: string, forceRefresh = false): Promise<AdvancedAnalysis | null> {
    const existing = this._advancedAnalysis();
    
    // Se existe e não está expirada (24h), retornar
    if (existing && !forceRefresh) {
      const age = Date.now() - new Date(existing.analyzedAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      
      if (age < maxAge) {
        this.logService.debug('SmartReminders', 'Using cached advanced analysis');
        return existing;
      }
    }

    // Executar nova análise
    try {
      return await this.runAdvancedAnalysis(medicationId);
    } catch (error: any) {
      this.logService.error('SmartReminders', 'Failed to get advanced analysis', error as Error);
      return null;
    }
  }

  /**
   * Limpa análise avançada
   */
  async clearAdvancedAnalysis(): Promise<void> {
    this._advancedAnalysis.set(null);
    
    const userId = this.userService.currentUser()?.id;
    if (userId) {
      try {
        const db = this.firebaseService.firestore;
        const docRef = doc(db, `users/${userId}/analytics/smart-reminders-advanced`);
        await deleteDoc(docRef);
        this.logService.debug('SmartReminders', 'Cleared advanced analysis from Firestore');
      } catch (error: any) {
        this.logService.error('SmartReminders', 'Error clearing advanced analysis', error as Error);
      }
    }
  }

  /**
   * Cleanup público - para ser chamado quando usuário deslogar ou componente for destruído
   */
  public cleanup(): void {
    this.logService.debug('SmartReminders', 'Cleaning up service');
    this.cleanupRealtimeListeners();
    this._patterns.set([]);
    this._analyses.set([]);
    this._suggestions.set([]);
    this._risks.set([]);
    this._advancedAnalysis.set(null);
  }
}

