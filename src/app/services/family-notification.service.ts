import { Injectable, inject } from '@angular/core';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema, Channel } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { FamilyService } from './family.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';

/**
 * Configuração de notificações para família
 */
export interface FamilyNotificationConfig {
  enabled: boolean;
  sound: 'default' | 'custom' | 'silent';
  vibrate: boolean;
  timeOffsetMinutes: number; // Minutos antes do horário da dose
}

/**
 * Representa uma notificação agrupada por horário
 */
export interface GroupedNotification {
  time: string; // HH:mm
  memberNames: string[];
  medicationNames: string[];
  doseCount: number;
  date: Date;
}

/**
 * Preferências de notificação do usuário
 */
export interface NotificationPreferences {
  sound: 'default' | 'custom' | 'silent';
  vibrate: boolean;
  silent: boolean;
  timeOffsetMinutes: number;
}

/**
 * Serviço para gerenciar notificações push agregadas para família
 * Agrupa doses por horário e envia uma única notificação por vez
 */
@Injectable({
  providedIn: 'root'
})
export class FamilyNotificationService {
  private readonly familyService = inject(FamilyService);
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);
  
  private readonly PREFERENCES_KEY = 'family-notifications-config';
  private readonly NOTIFICATION_CHANNEL_ID = 'family-doses-channel';
  private readonly NOTIFICATION_ID_PREFIX = 'family-';

  constructor() {
    this.initializeNotificationChannel();
  }

  /**
   * Inicializa o canal de notificações
   */
  private async initializeNotificationChannel(): Promise<void> {
    try {
      const channel: Channel = {
        id: this.NOTIFICATION_CHANNEL_ID,
        name: 'Doses da Família',
        description: 'Notificações agrupadas de doses de medicamentos da família',
        importance: 4, // Alta importância
        visibility: 1, // Public
        sound: 'default.wav',
        vibration: true,
        lights: true,
        lightColor: '#4CAF50'
      };

      await LocalNotifications.createChannel(channel);
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao criar canal de notificação', error);
    }
  }

  /**
   * Solicita permissão para enviar notificações
   */
  async requestPermission(): Promise<boolean> {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao solicitar permissões', error);
      return false;
    }
  }

  /**
   * Verifica se as notificações estão habilitadas
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao verificar permissões', error);
      return false;
    }
  }

  /**
   * Obtém as preferências de notificação
   */
  async getPreferences(): Promise<FamilyNotificationConfig> {
    try {
      const result = await Preferences.get({ key: this.PREFERENCES_KEY });
      
      if (result.value) {
        return JSON.parse(result.value);
      }

      // Configuração padrão
      return {
        enabled: true,
        sound: 'default',
        vibrate: true,
        timeOffsetMinutes: 5
      };
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao obter preferências', error);
      return {
        enabled: true,
        sound: 'default',
        vibrate: true,
        timeOffsetMinutes: 5
      };
    }
  }

  /**
   * Salva as preferências de notificação
   */
  async setPreferences(config: FamilyNotificationConfig): Promise<void> {
    try {
      await Preferences.set({
        key: this.PREFERENCES_KEY,
        value: JSON.stringify(config)
      });

      // Reagendar notificações com novas configurações
      await this.scheduleAllNotifications();
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao salvar preferências', error);
    }
  }

  /**
   * Agrupa doses por horário
   * Retorna um mapa de horário -> doses agrupadas
   */
  private groupDosesByTime(): Map<string, GroupedNotification> {
    const groupedMap = new Map<string, GroupedNotification>();
    const members = this.familyService.familyMembers();
    const medications = this.medicationService.medications();

    // Iterar sobre cada membro da família
    for (const member of members) {
      // Filtrar medicações ativas do membro
      const memberMeds = medications.filter(med => 
        med.userId === member.id && 
        !med.isArchived &&
        !med.isCompleted
      );

      // Iterar sobre medicações do membro
      for (const medication of memberMeds) {
        // Verificar se a medicação está ativa hoje
        const today = new Date();
        
        // Verificar se tem startDate e se já iniciou
        if (medication.startDate) {
          const startDate = new Date(medication.startDate);
          // Pular se ainda não iniciou
          if (startDate > today) continue;
        }

        // Pular se já terminou (se tiver data de término)
        if (medication.endDate) {
          const endDate = new Date(medication.endDate);
          if (endDate < today) continue;
        }

        // Processar schedule (array de Dose)
        const schedules = medication.schedule || [];

        // Agrupar por horário
        for (const schedule of schedules) {
          const time = schedule.time;
          
          if (!time) continue;

          // Obter ou criar grupo para este horário
          let group = groupedMap.get(time);
          
          if (!group) {
            group = {
              time,
              memberNames: [],
              medicationNames: [],
              doseCount: 0,
              date: today
            };
            groupedMap.set(time, group);
          }

          // Adicionar membro e medicação ao grupo
          if (!group.memberNames.includes(member.name)) {
            group.memberNames.push(member.name);
          }
          
          if (!group.medicationNames.includes(medication.name)) {
            group.medicationNames.push(medication.name);
          }

          group.doseCount++;
        }
      }
    }

    return groupedMap;
  }

  /**
   * Formata a mensagem da notificação
   * Exemplo: "3 doses às 08:00 - Maria, João, Pedro"
   */
  private formatNotificationMessage(group: GroupedNotification): { title: string; body: string } {
    const doseText = group.doseCount === 1 ? 'dose' : 'doses';
    const memberNames = group.memberNames.join(', ');
    
    return {
      title: `${group.doseCount} ${doseText} às ${group.time}`,
      body: `${memberNames}`
    };
  }

  /**
   * Calcula o horário de agendamento da notificação
   */
  private calculateScheduleTime(timeStr: string, offsetMinutes: number, date: Date = new Date()): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    const scheduleDate = new Date(date);
    scheduleDate.setHours(hours, minutes, 0, 0);
    
    // Subtrair offset em minutos
    scheduleDate.setMinutes(scheduleDate.getMinutes() - offsetMinutes);
    
    return scheduleDate;
  }

  /**
   * Agenda uma única notificação agrupada
   */
  private async scheduleNotification(
    group: GroupedNotification, 
    config: FamilyNotificationConfig
  ): Promise<void> {
    if (!config.enabled) return;

    const { title, body } = this.formatNotificationMessage(group);
    const scheduleTime = this.calculateScheduleTime(
      group.time, 
      config.timeOffsetMinutes,
      group.date
    );

    // Não agendar se o horário já passou
    if (scheduleTime < new Date()) {
      this.logService.debug('FamilyNotificationService', 'Horário já passou, não agendando', { title });
      return;
    }

    const notification: LocalNotificationSchema = {
      id: this.generateNotificationId(group.time),
      title,
      body,
      schedule: { at: scheduleTime },
      channelId: this.NOTIFICATION_CHANNEL_ID,
      sound: config.sound !== 'silent' ? 'default.wav' : undefined,
      extra: {
        type: 'family-dose',
        time: group.time,
        deepLink: '/family-dashboard',
        memberNames: group.memberNames,
        doseCount: group.doseCount
      }
    };

    // Adicionar vibração se habilitada
    if (config.vibrate && config.sound !== 'silent') {
      // LocalNotifications não suporta vibração customizada
      // A vibração será controlada pelo canal
    }

    try {
      await LocalNotifications.schedule({
        notifications: [notification]
      });

      this.logService.info('FamilyNotificationService', 'Notificação agendada', { title, scheduleTime });
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao agendar notificação', error);
    }
  }

  /**
   * Gera um ID único para a notificação baseado no horário
   */
  private generateNotificationId(time: string): number {
    // Converter HH:mm para um número único
    const [hours, minutes] = time.split(':').map(Number);
    return parseInt(`${this.NOTIFICATION_ID_PREFIX}${hours}${minutes.toString().padStart(2, '0')}`
      .replace(this.NOTIFICATION_ID_PREFIX, '')
      .replace(/^0+/, '')) || 1;
  }

  /**
   * Agenda todas as notificações agrupadas
   */
  async scheduleAllNotifications(): Promise<void> {
    try {
      // Verificar permissões
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          this.logService.warn('FamilyNotificationService', 'Permissão de notificação negada');
          return;
        }
      }

      // Obter preferências
      const config = await this.getPreferences();
      
      if (!config.enabled) {
        this.logService.debug('FamilyNotificationService', 'Notificações de família desabilitadas');
        return;
      }

      // Cancelar todas as notificações existentes da família
      await this.cancelAllNotifications();

      // Agrupar doses por horário
      const groupedDoses = this.groupDosesByTime();

      // Agendar notificação para cada grupo
      for (const [_, group] of groupedDoses) {
        await this.scheduleNotification(group, config);
      }

      this.logService.info('FamilyNotificationService', 'Notificações de família agendadas', { count: groupedDoses.size });
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao agendar notificações', error);
    }
  }

  /**
   * Cancela todas as notificações de família
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      // Obter todas as notificações pendentes
      const pending = await LocalNotifications.getPending();
      
      // Filtrar apenas notificações de família
      const familyNotificationIds = pending.notifications
        .filter(n => n.extra?.type === 'family-dose')
        .map(n => n.id);

      if (familyNotificationIds.length > 0) {
        await LocalNotifications.cancel({ notifications: familyNotificationIds.map(id => ({ id })) });
        this.logService.info('FamilyNotificationService', 'Notificações de família canceladas', { count: familyNotificationIds.length });
      }
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao cancelar notificações', error);
    }
  }

  /**
   * Atualiza as notificações quando há mudanças nas medicações
   */
  async updateNotifications(): Promise<void> {
    await this.scheduleAllNotifications();
  }

  /**
   * Habilita notificações de família
   */
  async enableNotifications(): Promise<void> {
    const config = await this.getPreferences();
    config.enabled = true;
    await this.setPreferences(config);
  }

  /**
   * Desabilita notificações de família
   */
  async disableNotifications(): Promise<void> {
    await this.cancelAllNotifications();
    const config = await this.getPreferences();
    config.enabled = false;
    await this.setPreferences(config);
  }

  /**
   * Obtém estatísticas de notificações agendadas
   */
  async getNotificationStats(): Promise<{
    pending: number;
    nextScheduled?: Date;
    groupCount: number;
  }> {
    try {
      const pending = await LocalNotifications.getPending();
      const familyNotifications = pending.notifications.filter(n => n.extra?.type === 'family-dose');

      let nextScheduled: Date | undefined;
      if (familyNotifications.length > 0) {
        // Encontrar a próxima notificação
        const sortedNotifications = familyNotifications.sort((a, b) => {
          const timeA = a.schedule?.at ? new Date(a.schedule.at).getTime() : 0;
          const timeB = b.schedule?.at ? new Date(b.schedule.at).getTime() : 0;
          return timeA - timeB;
        });

        const next = sortedNotifications[0];
        if (next.schedule?.at) {
          nextScheduled = new Date(next.schedule.at);
        }
      }

      const groupedDoses = this.groupDosesByTime();

      return {
        pending: familyNotifications.length,
        nextScheduled,
        groupCount: groupedDoses.size
      };
    } catch (error: any) {
      this.logService.error('FamilyNotificationService', 'Erro ao obter estatísticas', error);
      return {
        pending: 0,
        groupCount: 0
      };
    }
  }
}

