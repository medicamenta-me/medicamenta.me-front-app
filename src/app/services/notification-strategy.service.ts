import { Injectable, inject } from '@angular/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { HapticPatternsService } from './haptic-patterns.service';
import { LogService } from './log.service';

/**
 * Prioridade de medicação
 */
export type MedicationPriority = 'critical' | 'moderate' | 'supplement';

/**
 * Estratégia de notificação
 */
export interface NotificationStrategy {
  priority: MedicationPriority;
  
  // Configurações de lembrete
  remindersBefore: number[]; // Minutos antes (ex: [30, 15, 5, 0])
  repeatInterval: number; // Intervalo de repetição em minutos (0 = não repetir)
  maxRepeats: number; // Máximo de repetições
  
  // Configurações de aparência
  importance: 'max' | 'high' | 'default' | 'low' | 'min';
  sound: string | undefined;
  vibrate: boolean;
  lights: boolean;
  
  // Configurações de comportamento
  persistent: boolean; // Notificação não pode ser dispensada por swipe
  autoCancel: boolean; // Cancelar ao tocar
  ongoing: boolean; // Notificação contínua
  
  // Haptic feedback
  hapticPattern: 'gentle-reminder' | 'urgent-reminder' | 'alarm' | 'notification';
}

/**
 * Serviço de Estratégias de Notificação
 * Implementa notificações adaptativas baseadas em prioridade
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationStrategyService {
  private readonly hapticService = inject(HapticPatternsService);
  private readonly logService = inject(LogService);

  /**
   * Estratégias predefinidas por prioridade
   */
  private readonly strategies: Record<MedicationPriority, NotificationStrategy> = {
    critical: {
      priority: 'critical',
      remindersBefore: [30, 15, 5, 0], // 4 lembretes
      repeatInterval: 5, // Repetir a cada 5 minutos
      maxRepeats: 3, // Até 3 repetições
      importance: 'max',
      sound: 'default',
      vibrate: true,
      lights: true,
      persistent: true,
      autoCancel: false,
      ongoing: true,
      hapticPattern: 'urgent-reminder'
    },
    moderate: {
      priority: 'moderate',
      remindersBefore: [15, 0], // 2 lembretes
      repeatInterval: 10, // Repetir a cada 10 minutos
      maxRepeats: 2, // Até 2 repetições
      importance: 'high',
      sound: 'default',
      vibrate: true,
      lights: true,
      persistent: false,
      autoCancel: true,
      ongoing: false,
      hapticPattern: 'notification'
    },
    supplement: {
      priority: 'supplement',
      remindersBefore: [0], // 1 lembrete apenas
      repeatInterval: 0, // Não repetir
      maxRepeats: 0,
      importance: 'default',
      sound: undefined, // Sem som
      vibrate: false,
      lights: false,
      persistent: false,
      autoCancel: true,
      ongoing: false,
      hapticPattern: 'gentle-reminder'
    }
  };

  /**
   * Obtém estratégia por prioridade
   */
  getStrategy(priority: MedicationPriority): NotificationStrategy {
    return this.strategies[priority];
  }

  /**
   * Determina prioridade baseada em tipo de medicação
   */
  determinePriority(medicationType?: string, isCritical?: boolean): MedicationPriority {
    if (isCritical) return 'critical';

    const criticalTypes = [
      'antibiotic',
      'insulin',
      'heart',
      'blood pressure',
      'anticoagulant',
      'antiarrhythmic',
      'immunosuppressant'
    ];

    const supplementTypes = [
      'vitamin',
      'supplement',
      'probiotic',
      'mineral',
      'omega',
      'protein'
    ];

    const type = medicationType?.toLowerCase() || '';

    if (criticalTypes.some(ct => type.includes(ct))) {
      return 'critical';
    }

    if (supplementTypes.some(st => type.includes(st))) {
      return 'supplement';
    }

    return 'moderate';
  }

  /**
   * Agenda notificações adaptativas
   */
  async scheduleAdaptiveNotifications(
    medicationId: string,
    medicationName: string,
    dosage: string,
    scheduledTime: Date,
    priority: MedicationPriority,
    options?: {
      customStrategy?: Partial<NotificationStrategy>;
      skipHaptic?: boolean;
    }
  ): Promise<void> {
    const strategy = options?.customStrategy
      ? { ...this.getStrategy(priority), ...options.customStrategy }
      : this.getStrategy(priority);

    this.logService.info('NotificationStrategyService', 'Scheduling adaptive notifications', { medicationName, priority });

    const notifications: ScheduleOptions['notifications'] = [];

    // Lembretes antes do horário agendado
    for (const minutesBefore of strategy.remindersBefore) {
      const notificationTime = new Date(scheduledTime.getTime() - minutesBefore * 60000);
      
      if (notificationTime <= new Date()) continue; // Não agendar no passado

      const isMainNotification = minutesBefore === 0;

      notifications.push({
        id: this.generateNotificationId(medicationId, minutesBefore),
        title: isMainNotification 
          ? `⏰ Hora de tomar ${medicationName}`
          : `⏰ Lembrete: ${medicationName} em ${minutesBefore} min`,
        body: `${dosage}${isMainNotification ? '' : ` - Tome às ${this.formatTime(scheduledTime)}`}`,
        schedule: { at: notificationTime },
        sound: strategy.sound,
        extra: {
          medicationId,
          type: 'reminder',
          minutesBefore,
          priority
        },
        // Android specific
        channelId: `medication-${priority}`,
        // @ts-ignore - Propriedades Android não tipadas
        importance: strategy.importance,
        ongoing: strategy.ongoing,
        autoCancel: strategy.autoCancel
      });
    }

    // Repetições após o horário (se configurado)
    if (strategy.repeatInterval > 0 && strategy.maxRepeats > 0) {
      for (let i = 1; i <= strategy.maxRepeats; i++) {
        const repeatTime = new Date(scheduledTime.getTime() + strategy.repeatInterval * i * 60000);

        notifications.push({
          id: this.generateNotificationId(medicationId, -i * strategy.repeatInterval),
          title: `🔔 Lembrete: ${medicationName}`,
          body: `Você ainda não tomou ${medicationName}. ${dosage}`,
          schedule: { at: repeatTime },
          sound: strategy.sound,
          extra: {
            medicationId,
            type: 'repeat',
            repeatNumber: i,
            priority
          },
          channelId: `medication-${priority}`,
          // @ts-ignore
          importance: strategy.importance,
          ongoing: strategy.ongoing,
          autoCancel: strategy.autoCancel
        });
      }
    }

    // Agendar todas as notificações
    if (notifications.length > 0) {
      try {
        await LocalNotifications.schedule({ notifications });
        this.logService.info('NotificationStrategyService', 'Scheduled notifications', { count: notifications.length, medicationName });
      } catch (error: any) {
        this.logService.error('NotificationStrategyService', 'Failed to schedule notifications', error as Error);
      }
    }

    // Haptic feedback (se não for skip)
    if (!options?.skipHaptic && strategy.vibrate) {
      await this.hapticService.playPattern(strategy.hapticPattern);
    }
  }

  /**
   * Cancela notificações de uma medicação
   */
  async cancelMedicationNotifications(medicationId: string): Promise<void> {
    try {
      const pending = await LocalNotifications.getPending();
      const idsToCancel = pending.notifications
        .filter(n => n.extra?.medicationId === medicationId)
        .map(n => n.id);

      if (idsToCancel.length > 0) {
        await LocalNotifications.cancel({ notifications: idsToCancel.map(id => ({ id })) });
        this.logService.info('NotificationStrategyService', 'Cancelled notifications', { count: idsToCancel.length, medicationId });
      }
    } catch (error: any) {
      this.logService.error('NotificationStrategyService', 'Failed to cancel notifications', error as Error);
    }
  }

  /**
   * Atualiza estratégia de notificação (ex: após usuário perder doses)
   */
  async escalateNotifications(
    medicationId: string,
    medicationName: string,
    dosage: string,
    scheduledTime: Date,
    currentPriority: MedicationPriority
  ): Promise<void> {
    this.logService.info('NotificationStrategyService', 'Escalating notifications', { medicationName });

    // Cancelar notificações existentes
    await this.cancelMedicationNotifications(medicationId);

    // Aumentar prioridade
    const newPriority: MedicationPriority = 
      currentPriority === 'supplement' ? 'moderate' :
      currentPriority === 'moderate' ? 'critical' :
      'critical';

    // Reagendar com nova prioridade
    await this.scheduleAdaptiveNotifications(
      medicationId,
      medicationName,
      dosage,
      scheduledTime,
      newPriority
    );
  }

  /**
   * Agenda notificação de risco de esquecimento
   */
  async scheduleRiskAlert(
    medicationId: string,
    medicationName: string,
    scheduledTime: string,
    riskPercentage: number
  ): Promise<void> {
    const now = new Date();
    const alertTime = new Date(now.getTime() + 5 * 60000); // Daqui a 5 minutos

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: this.generateNotificationId(medicationId, -1000),
          title: `⚠️ Alerta: Risco de Esquecimento`,
          body: `Você tem ${riskPercentage.toFixed(0)}% de chance de esquecer ${medicationName} às ${scheduledTime} hoje. Prepare-se!`,
          schedule: { at: alertTime },
          sound: 'default',
          extra: {
            medicationId,
            type: 'risk-alert'
          },
          channelId: 'medication-critical'
        }]
      });

      // Haptic de alerta
      await this.hapticService.playPattern('urgent-reminder');
    } catch (error: any) {
      this.logService.error('NotificationStrategyService', 'Failed to schedule risk alert', error as Error);
    }
  }

  /**
   * Cria canais de notificação (Android)
   */
  async createNotificationChannels(): Promise<void> {
    try {
      await LocalNotifications.createChannel({
        id: 'medication-critical',
        name: 'Medicações Críticas',
        description: 'Notificações para medicações críticas que não podem ser perdidas',
        importance: 5, // MAX
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#FF0000'
      });

      await LocalNotifications.createChannel({
        id: 'medication-moderate',
        name: 'Medicações Moderadas',
        description: 'Notificações para medicações de uso regular',
        importance: 4, // HIGH
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#FFA500'
      });

      await LocalNotifications.createChannel({
        id: 'medication-supplement',
        name: 'Suplementos',
        description: 'Notificações discretas para suplementos e vitaminas',
        importance: 3, // DEFAULT
        sound: undefined,
        vibration: false,
        lights: false
      });

      this.logService.info('NotificationStrategyService', 'Notification channels created');
    } catch (error: any) {
      this.logService.error('NotificationStrategyService', 'Failed to create channels', error as Error);
    }
  }

  /**
   * Gera ID único para notificação
   */
  private generateNotificationId(medicationId: string, offset: number): number {
    // Hash simples do medicationId + offset
    const hash = medicationId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    return Math.abs(hash + offset);
  }

  /**
   * Formata horário
   */
  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  /**
   * Testa estratégia de notificação
   */
  async testStrategy(priority: MedicationPriority): Promise<void> {
    const strategy = this.getStrategy(priority);
    
    this.logService.debug('NotificationStrategyService', 'Testing strategy', { priority, strategy });
    
    // Haptic feedback
    await this.hapticService.playPattern(strategy.hapticPattern);
    
    // Notificação de teste
    const testTime = new Date(Date.now() + 5000); // 5 segundos
    
    await LocalNotifications.schedule({
      notifications: [{
        id: 99999,
        title: `🧪 Teste: Notificação ${priority}`,
        body: `Importância: ${strategy.importance}, Som: ${strategy.sound ? 'Sim' : 'Não'}, Vibrar: ${strategy.vibrate ? 'Sim' : 'Não'}`,
        schedule: { at: testTime },
        sound: strategy.sound,
        channelId: `medication-${priority}`,
        extra: { type: 'test' }
      }]
    });
  }
}

