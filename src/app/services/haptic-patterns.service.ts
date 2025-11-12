import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LogService } from './log.service';

/**
 * Tipo de padrão de haptic
 */
export type HapticPatternType =
  | 'gentle-reminder'
  | 'urgent-reminder'
  | 'missed-dose'
  | 'success-confirm'
  | 'quick-tap'
  | 'double-tap'
  | 'triple-tap'
  | 'alarm'
  | 'notification';

/**
 * Padrão de vibração
 */
export interface HapticPattern {
  type: HapticPatternType;
  name: string;
  description: string;
  sequence: HapticStep[];
}

/**
 * Passo de vibração no padrão
 */
export interface HapticStep {
  intensity: ImpactStyle;
  duration?: number; // ms (não suportado nativamente, simula com delay)
  delay: number; // ms entre este e próximo passo
}

/**
 * Serviço de Padrões de Haptic Feedback
 * Gerencia sequências de vibração customizadas
 */
@Injectable({
  providedIn: 'root'
})
export class HapticPatternsService {
  private readonly logService = new LogService();
  
  /**
   * Biblioteca de padrões predefinidos
   */
  private readonly patterns: Record<HapticPatternType, HapticPattern> = {
    'gentle-reminder': {
      type: 'gentle-reminder',
      name: 'Lembrete Suave',
      description: 'Vibração suave para lembretes não urgentes',
      sequence: [
        { intensity: ImpactStyle.Light, delay: 0 },
        { intensity: ImpactStyle.Light, delay: 200 }
      ]
    },
    'urgent-reminder': {
      type: 'urgent-reminder',
      name: 'Lembrete Urgente',
      description: 'Vibração forte para doses importantes',
      sequence: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 100 },
        { intensity: ImpactStyle.Heavy, delay: 100 }
      ]
    },
    'missed-dose': {
      type: 'missed-dose',
      name: 'Dose Perdida',
      description: 'Padrão de alerta para dose não tomada',
      sequence: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Heavy, delay: 150 },
        { intensity: ImpactStyle.Heavy, delay: 150 },
        { intensity: ImpactStyle.Medium, delay: 300 },
        { intensity: ImpactStyle.Medium, delay: 150 }
      ]
    },
    'success-confirm': {
      type: 'success-confirm',
      name: 'Confirmação de Sucesso',
      description: 'Vibração de confirmação para ação concluída',
      sequence: [
        { intensity: ImpactStyle.Light, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 80 },
        { intensity: ImpactStyle.Light, delay: 80 }
      ]
    },
    'quick-tap': {
      type: 'quick-tap',
      name: 'Toque Rápido',
      description: 'Uma vibração rápida para feedback de toque',
      sequence: [
        { intensity: ImpactStyle.Light, delay: 0 }
      ]
    },
    'double-tap': {
      type: 'double-tap',
      name: 'Toque Duplo',
      description: 'Duas vibrações rápidas',
      sequence: [
        { intensity: ImpactStyle.Medium, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 100 }
      ]
    },
    'triple-tap': {
      type: 'triple-tap',
      name: 'Toque Triplo',
      description: 'Três vibrações rápidas',
      sequence: [
        { intensity: ImpactStyle.Medium, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 80 },
        { intensity: ImpactStyle.Medium, delay: 80 }
      ]
    },
    'alarm': {
      type: 'alarm',
      name: 'Alarme',
      description: 'Padrão de alarme contínuo',
      sequence: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 200 },
        { intensity: ImpactStyle.Heavy, delay: 200 },
        { intensity: ImpactStyle.Medium, delay: 200 },
        { intensity: ImpactStyle.Heavy, delay: 200 }
      ]
    },
    'notification': {
      type: 'notification',
      name: 'Notificação',
      description: 'Vibração padrão de notificação',
      sequence: [
        { intensity: ImpactStyle.Medium, delay: 0 },
        { intensity: ImpactStyle.Light, delay: 150 }
      ]
    }
  };

  /**
   * Obtém um padrão por tipo
   */
  getPattern(type: HapticPatternType): HapticPattern {
    return this.patterns[type];
  }

  /**
   * Obtém todos os padrões disponíveis
   */
  getAllPatterns(): HapticPattern[] {
    return Object.values(this.patterns);
  }

  /**
   * Executa um padrão de haptic
   */
  async playPattern(type: HapticPatternType): Promise<void> {
    const pattern = this.patterns[type];
    if (!pattern) {
      this.logService.warn('HapticPatternsService', 'Pattern not found', { type });
      return;
    }

    this.logService.info('HapticPatternsService', 'Playing pattern', { name: pattern.name });

    for (let i = 0; i < pattern.sequence.length; i++) {
      const step = pattern.sequence[i];

      // Aguardar delay anterior
      if (step.delay > 0 && i > 0) {
        await this.sleep(step.delay);
      }

      // Executar vibração
      try {
        await Haptics.impact({ style: step.intensity });
      } catch (error: any) {
        this.logService.error('HapticPatternsService', 'Failed to trigger haptic', error as Error);
      }
    }
  }

  /**
   * Executa uma sequência customizada
   */
  async playCustomPattern(sequence: HapticStep[]): Promise<void> {
    this.logService.info('HapticPatternsService', 'Playing custom pattern');

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];

      // Aguardar delay anterior
      if (step.delay > 0 && i > 0) {
        await this.sleep(step.delay);
      }

      // Executar vibração
      try {
        await Haptics.impact({ style: step.intensity });
      } catch (error: any) {
        this.logService.error('HapticPatternsService', 'Failed to trigger haptic', error as Error);
      }
    }
  }

  /**
   * Executa padrão baseado em prioridade da medicação
   */
  async playForPriority(priority: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    const patternMap: Record<string, HapticPatternType> = {
      low: 'gentle-reminder',
      medium: 'notification',
      high: 'urgent-reminder',
      critical: 'alarm'
    };

    const pattern = patternMap[priority] || 'notification';
    await this.playPattern(pattern);
  }

  /**
   * Executa padrão baseado no status da dose
   */
  async playForDoseStatus(status: 'upcoming' | 'due' | 'overdue' | 'taken' | 'skipped'): Promise<void> {
    const patternMap: Record<string, HapticPatternType> = {
      upcoming: 'gentle-reminder',
      due: 'notification',
      overdue: 'urgent-reminder',
      taken: 'success-confirm',
      skipped: 'double-tap'
    };

    const pattern = patternMap[status] || 'notification';
    await this.playPattern(pattern);
  }

  /**
   * Executa haptic simples para feedback de UI
   */
  async playSimple(intensity: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    try {
      const styleMap: Record<string, ImpactStyle> = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy
      };

      await Haptics.impact({ style: styleMap[intensity] });
    } catch (error: any) {
      this.logService.error('HapticPatternsService', 'Failed to trigger simple haptic', error as Error);
    }
  }

  /**
   * Testa um padrão (útil para configurações)
   */
  async testPattern(type: HapticPatternType): Promise<void> {
    this.logService.info('HapticPatternsService', 'Testing pattern', { type });
    await this.playPattern(type);
  }

  /**
   * Helper: aguarda delay em ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se haptics estão disponíveis
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Tenta executar um haptic leve
      await Haptics.impact({ style: ImpactStyle.Light });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cria um padrão customizado para medicações específicas
   * Útil para medicações com diferentes níveis de urgência
   */
  createCustomMedicationPattern(
    urgency: number, // 1-5
    repetitions: number // 1-3
  ): HapticStep[] {
    const sequence: HapticStep[] = [];
    
    // Mapeia urgência para intensidade
    let intensity: ImpactStyle;
    if (urgency >= 4) {
      intensity = ImpactStyle.Heavy;
    } else if (urgency >= 3) {
      intensity = ImpactStyle.Medium;
    } else {
      intensity = ImpactStyle.Light;
    }

    // Cria sequência baseada em repetições
    for (let i = 0; i < repetitions; i++) {
      sequence.push({
        intensity,
        delay: i === 0 ? 0 : 150
      });
    }

    return sequence;
  }

  /**
   * Padrão para notificação de família
   */
  async playFamilyNotification(): Promise<void> {
    await this.playPattern('triple-tap');
  }

  /**
   * Padrão para conquistas/gamificação
   */
  async playAchievementUnlocked(rarity: 'common' | 'rare' | 'epic' | 'legendary'): Promise<void> {
    const patterns: Record<string, HapticStep[]> = {
      common: [
        { intensity: ImpactStyle.Light, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 100 }
      ],
      rare: [
        { intensity: ImpactStyle.Medium, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 80 },
        { intensity: ImpactStyle.Heavy, delay: 80 }
      ],
      epic: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Medium, delay: 60 },
        { intensity: ImpactStyle.Heavy, delay: 60 },
        { intensity: ImpactStyle.Medium, delay: 60 },
        { intensity: ImpactStyle.Heavy, delay: 60 }
      ],
      legendary: [
        { intensity: ImpactStyle.Heavy, delay: 0 },
        { intensity: ImpactStyle.Heavy, delay: 50 },
        { intensity: ImpactStyle.Heavy, delay: 50 },
        { intensity: ImpactStyle.Medium, delay: 100 },
        { intensity: ImpactStyle.Heavy, delay: 80 },
        { intensity: ImpactStyle.Heavy, delay: 80 },
        { intensity: ImpactStyle.Heavy, delay: 80 }
      ]
    };

    await this.playCustomPattern(patterns[rarity]);
  }
}

