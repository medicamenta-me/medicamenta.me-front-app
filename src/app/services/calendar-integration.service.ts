import { Injectable, inject, signal } from '@angular/core';
import { CapacitorCalendar, Calendar, CalendarEvent } from '@ebarooni/capacitor-calendar';
import { Preferences } from '@capacitor/preferences';
import { Medication, Dose } from '../models/medication.model';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';

/**
 * Configuração de sincronização do calendário
 */
export interface CalendarSyncConfig {
  enabled: boolean;
  selectedCalendarId: string | null;
  selectedCalendarName: string | null;
  syncActiveMedications: boolean;
  syncUpcoming: boolean; // Sincronizar próximos N dias
  upcomingDays: number; // Número de dias para sincronizar (padrão 7)
  autoSync: boolean; // Sincronização automática ao adicionar/editar medicamento
  reminderMinutes: number; // Minutos antes do horário para lembrete (padrão 15)
  includeNotes: boolean; // Incluir observações do medicamento no evento
  lastSyncTimestamp: number | null;
}

/**
 * Conflito de evento detectado
 */
export interface CalendarConflict {
  medicationName: string;
  scheduledTime: string;
  conflictingEvent: {
    title: string;
    startDate: Date;
    endDate: Date;
  };
  suggestedAlternatives: string[]; // Horários alternativos sugeridos
}

/**
 * Evento criado no calendário
 */
export interface SyncedEvent {
  eventId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  date: Date;
  calendarId: string;
}

/**
 * Estatísticas de sincronização
 */
export interface SyncStats {
  totalEvents: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflicts: number;
  lastSync: Date | null;
}

const STORAGE_KEY = 'calendar_sync_config';
const SYNCED_EVENTS_KEY = 'calendar_synced_events';

@Injectable({
  providedIn: 'root'
})
export class CalendarIntegrationService {
  private medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);

  // Estado do serviço
  hasPermission = signal<boolean>(false);
  availableCalendars = signal<Calendar[]>([]);
  syncConfig = signal<CalendarSyncConfig>({
    enabled: false,
    selectedCalendarId: null,
    selectedCalendarName: null,
    syncActiveMedications: true,
    syncUpcoming: true,
    upcomingDays: 7,
    autoSync: true,
    reminderMinutes: 15,
    includeNotes: true,
    lastSyncTimestamp: null
  });
  syncedEvents = signal<SyncedEvent[]>([]);
  isInitialized = signal<boolean>(false);

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o serviço carregando configurações salvas
   */
  private async initialize(): Promise<void> {
    try {
      // Carregar configuração salva
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        const config = JSON.parse(value) as CalendarSyncConfig;
        this.syncConfig.set(config);
      }

      // Carregar eventos sincronizados
      const { value: eventsValue } = await Preferences.get({ key: SYNCED_EVENTS_KEY });
      if (eventsValue) {
        const events = JSON.parse(eventsValue) as SyncedEvent[];
        this.syncedEvents.set(events);
      }

      // Verificar permissões
      await this.checkPermissions();

      this.isInitialized.set(true);
    } catch (error: any) {
      this.logService.error('CalendarIntegrationService', 'Erro ao inicializar', error as Error);
    }
  }

  /**
   * Verifica se o app tem permissão para acessar o calendário
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const response = await CapacitorCalendar.requestFullCalendarAccess();
      this.hasPermission.set(response.result === 'granted');
      return response.result === 'granted';
    } catch (error: any) {
      this.logService.error('CalendarIntegrationService', 'Erro ao verificar permissões', error as Error);
      return false;
    }
  }

  /**
   * Solicita permissão para acessar o calendário
   */
  async requestPermission(): Promise<boolean> {
    try {
      const response = await CapacitorCalendar.requestFullCalendarAccess();
      this.hasPermission.set(response.result === 'granted');
      return response.result === 'granted';
    } catch (error: any) {
      this.logService.error('CalendarIntegrationService', 'Erro ao solicitar permissões', error as Error);
      return false;
    }
  }

  /**
   * Lista calendários disponíveis no dispositivo
   */
  async loadCalendars(): Promise<Calendar[]> {
    try {
      if (!this.hasPermission()) {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new Error('Permissão negada para acessar calendários');
        }
      }

      const response = await CapacitorCalendar.listCalendars();
      this.availableCalendars.set(response.result);
      return response.result;
    } catch (error: any) {
      this.logService.error('CalendarIntegrationService', 'Erro ao carregar calendários', error as Error);
      throw error;
    }
  }

  /**
   * Atualiza configuração de sincronização
   */
  async updateSyncConfig(config: Partial<CalendarSyncConfig>): Promise<void> {
    const updatedConfig = { ...this.syncConfig(), ...config };
    this.syncConfig.set(updatedConfig);
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(updatedConfig) });
  }

  /**
   * Seleciona calendário para sincronização
   */
  async selectCalendar(calendarId: string): Promise<void> {
    const calendar = this.availableCalendars().find(cal => cal.id === calendarId);
    if (!calendar) {
      throw new Error('Calendário não encontrado');
    }

    await this.updateSyncConfig({
      selectedCalendarId: calendar.id,
      selectedCalendarName: calendar.title
    });
  }

  /**
   * Habilita/desabilita sincronização
   */
  async toggleSync(enabled: boolean): Promise<void> {
    await this.updateSyncConfig({ enabled });
    
    if (enabled) {
      // Executar sincronização inicial
      await this.syncAll();
    } else {
      // Opcional: perguntar se deseja remover eventos ao desabilitar
      // Por enquanto, apenas desabilita sem remover
    }
  }

  /**
   * Sincroniza todos os medicamentos com o calendário
   */
  async syncAll(): Promise<SyncStats> {
    const config = this.syncConfig();
    
    if (!config.enabled || !config.selectedCalendarId) {
      throw new Error('Sincronização não configurada');
    }

    const stats: SyncStats = {
      totalEvents: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: 0,
      lastSync: new Date()
    };

    try {
      const medications = this.medicationService.medications();
      const activeMedications = medications.filter(m => !m.isArchived && !m.isCompleted);

      // Calcular período de sincronização
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + config.upcomingDays);

      // Remover eventos antigos que não existem mais
      await this.cleanupOldEvents(activeMedications);

      // Criar eventos para cada medicamento ativo
      for (const medication of activeMedications) {
        const eventsCreated = await this.syncMedication(medication, startDate, endDate);
        stats.eventsCreated += eventsCreated;
        stats.totalEvents += eventsCreated;
      }

      // Atualizar timestamp da última sincronização
      await this.updateSyncConfig({ lastSyncTimestamp: Date.now() });

      return stats;
    } catch (error: any) {
      this.logService.error('CalendarIntegrationService', 'Erro ao sincronizar', error as Error);
      throw error;
    }
  }

  /**
   * Sincroniza um medicamento específico
   */
  async syncMedication(
    medication: Medication,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const config = this.syncConfig();
    if (!config.selectedCalendarId) {
      throw new Error('Calendário não selecionado');
    }

    let eventsCreated = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      for (const dose of medication.schedule) {
        if (!this.shouldSyncDose(dose, currentDate)) {
          continue;
        }

        const eventDate = this.createEventDate(currentDate, dose.time);
        const event = this.createCalendarEvent(medication, dose, eventDate);

        try {
          // Verificar se evento já existe
          const existingEvent = this.findSyncedEvent(medication.id, dose.time, eventDate);
          
          if (!existingEvent) {
            // Criar novo evento
            const result = await CapacitorCalendar.createEvent({
              title: event.title,
              calendarId: config.selectedCalendarId,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location || undefined,
              description: event.description || undefined,
              alerts: [-config.reminderMinutes]
            });

            // Salvar referência do evento criado
            await this.addSyncedEvent({
              eventId: result.id,
              medicationId: medication.id,
              medicationName: medication.name,
              scheduledTime: dose.time,
              date: eventDate,
              calendarId: config.selectedCalendarId
            });

            eventsCreated++;
          }
        } catch (error: any) {
          this.logService.error('CalendarIntegrationService', 'Erro ao criar evento', error as Error);
        }
      }

      // Próximo dia
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return eventsCreated;
  }

  /**
   * Verifica se deve sincronizar uma dose específica
   */
  private shouldSyncDose(dose: Dose, date: Date): boolean {
    const config = this.syncConfig();
    
    // Se não sincroniza ativos e a dose está marcada como tomada, pula
    if (!config.syncActiveMedications && dose.status === 'taken') {
      return false;
    }

    // Por padrão, sincroniza todos os dias
    // A lógica de frequência está no medicamento, não na dose
    return true;
  }

  /**
   * Cria objeto de evento do calendário
   */
  private createCalendarEvent(
    medication: Medication,
    dose: Dose,
    eventDate: Date
  ): CalendarEvent {
    const config = this.syncConfig();
    const startDate = new Date(eventDate);
    const endDate = new Date(eventDate);
    endDate.setMinutes(endDate.getMinutes() + 5); // Evento de 5 minutos

    let description = `💊 ${medication.dosage}\n`;
    if (config.includeNotes && medication.notes) {
      description += `\n📝 ${medication.notes}`;
    }
    description += `\n\n🏥 Medicamenta.me`;

    return {
      id: '',
      title: `💊 ${medication.name}`,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      isAllDay: false,
      alerts: [],
      url: null,
      description,
      availability: null,
      organizer: null,
      color: null,
      duration: null,
      isDetached: null,
      birthdayContactIdentifier: null,
      status: null,
      creationDate: null,
      lastModifiedDate: null,
      attendees: [],
      timezone: null,
      location: 'Medicamenta.me',
      calendarId: config.selectedCalendarId!
    };
  }

  /**
   * Cria data/hora do evento baseado na dose
   */
  private createEventDate(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const eventDate = new Date(date);
    eventDate.setHours(hours, minutes, 0, 0);
    return eventDate;
  }

  /**
   * Busca evento sincronizado existente
   */
  private findSyncedEvent(
    medicationId: string,
    time: string,
    date: Date
  ): SyncedEvent | undefined {
    const events = this.syncedEvents();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return events.find(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      
      return (
        event.medicationId === medicationId &&
        event.scheduledTime === time &&
        eventDate.getTime() === targetDate.getTime()
      );
    });
  }

  /**
   * Adiciona evento sincronizado à lista
   */
  private async addSyncedEvent(event: SyncedEvent): Promise<void> {
    const events = [...this.syncedEvents(), event];
    this.syncedEvents.set(events);
    await Preferences.set({ key: SYNCED_EVENTS_KEY, value: JSON.stringify(events) });
  }

  /**
   * Remove eventos antigos que não existem mais
   */
  private async cleanupOldEvents(activeMedications: Medication[]): Promise<void> {
    const events = this.syncedEvents();
    const activeMedicationIds = new Set(activeMedications.map(m => m.id));
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filtrar eventos a manter
    const eventsToKeep: SyncedEvent[] = [];
    const eventsToDelete: SyncedEvent[] = [];

    for (const event of events) {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      // Remover se medicamento não existe mais ou data já passou
      if (!activeMedicationIds.has(event.medicationId) || eventDate < now) {
        eventsToDelete.push(event);
      } else {
        eventsToKeep.push(event);
      }
    }

    // Deletar eventos do calendário
    for (const event of eventsToDelete) {
      try {
        await CapacitorCalendar.deleteEvent({
          id: event.eventId
        });
      } catch (error: any) {
        this.logService.error('CalendarIntegrationService', 'Erro ao deletar evento', error as Error);
      }
    }

    // Atualizar lista de eventos sincronizados
    this.syncedEvents.set(eventsToKeep);
    await Preferences.set({ key: SYNCED_EVENTS_KEY, value: JSON.stringify(eventsToKeep) });
  }

  /**
   * Detecta conflitos no calendário
   */
  async detectConflicts(): Promise<CalendarConflict[]> {
    const config = this.syncConfig();
    if (!config.enabled || !config.selectedCalendarId) {
      return [];
    }

    const conflicts: CalendarConflict[] = [];
    const medications = this.medicationService.medications();
    const activeMedications = medications.filter(m => !m.isArchived && !m.isCompleted);

    try {
      // Buscar eventos existentes no calendário
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + config.upcomingDays);

      const eventsResponse = await CapacitorCalendar.listEventsInRange({
        from: startDate.getTime(),
        to: endDate.getTime()
      });
      
      const existingEvents = eventsResponse.result;

      // Verificar conflitos para cada medicamento
      for (const medication of activeMedications) {
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          for (const dose of medication.schedule) {
            if (!this.shouldSyncDose(dose, currentDate)) {
              continue;
            }

            const eventDate = this.createEventDate(currentDate, dose.time);
            const conflict = this.findConflictingEvent(
              eventDate,
              existingEvents,
              medication.name
            );

            if (conflict) {
              conflicts.push({
                medicationName: medication.name,
                scheduledTime: dose.time,
                conflictingEvent: {
                  title: conflict.title,
                  startDate: new Date(conflict.startDate),
                  endDate: new Date(conflict.endDate)
                },
                suggestedAlternatives: this.suggestAlternativeTimes(dose.time, existingEvents, currentDate)
              });
            }
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      return conflicts;
    } catch (error: any) {
      this.logService.error('CalendarIntegrationService', 'Erro ao detectar conflitos', error as Error);
      return [];
    }
  }

  /**
   * Busca evento conflitante no horário
   */
  private findConflictingEvent(
    medicationTime: Date,
    existingEvents: any[],
    medicationName: string
  ): any | null {
    const medicationStart = medicationTime.getTime();
    const medicationEnd = medicationStart + (5 * 60 * 1000); // 5 minutos

    for (const event of existingEvents) {
      // Ignorar eventos do próprio Medicamenta.me
      if (event.title?.includes('💊') || event.notes?.includes('Medicamenta.me')) {
        continue;
      }

      const eventStart = new Date(event.startDate).getTime();
      const eventEnd = new Date(event.endDate).getTime();

      // Verificar sobreposição de horários
      if (
        (medicationStart >= eventStart && medicationStart < eventEnd) ||
        (medicationEnd > eventStart && medicationEnd <= eventEnd) ||
        (medicationStart <= eventStart && medicationEnd >= eventEnd)
      ) {
        return event;
      }
    }

    return null;
  }

  /**
   * Sugere horários alternativos sem conflitos
   */
  private suggestAlternativeTimes(
    originalTime: string,
    existingEvents: any[],
    date: Date
  ): string[] {
    const alternatives: string[] = [];
    const [hours, minutes] = originalTime.split(':').map(Number);

    // Tentar horários antes e depois (30 minutos de intervalo)
    const offsets = [-30, 30, -60, 60, -90, 90];
    
    for (const offset of offsets) {
      const newDate = new Date(date);
      newDate.setHours(hours, minutes + offset, 0, 0);

      // Verificar se não tem conflito
      const hasConflict = this.findConflictingEvent(newDate, existingEvents, '');
      
      if (!hasConflict && newDate.getHours() >= 6 && newDate.getHours() <= 23) {
        const timeStr = `${String(newDate.getHours()).padStart(2, '0')}:${String(newDate.getMinutes()).padStart(2, '0')}`;
        if (!alternatives.includes(timeStr)) {
          alternatives.push(timeStr);
        }
      }

      if (alternatives.length >= 3) break;
    }

    return alternatives;
  }

  /**
   * Remove todos os eventos sincronizados
   */
  async removeAllSyncedEvents(): Promise<void> {
    const events = this.syncedEvents();

    for (const event of events) {
      try {
        await CapacitorCalendar.deleteEvent({ id: event.eventId });
      } catch (error: any) {
        this.logService.error('CalendarIntegrationService', 'Erro ao deletar evento', error as Error);
      }
    }

    this.syncedEvents.set([]);
    await Preferences.set({ key: SYNCED_EVENTS_KEY, value: JSON.stringify([]) });
  }

  /**
   * Obtém estatísticas de sincronização
   */
  getSyncStats(): SyncStats {
    const config = this.syncConfig();
    const events = this.syncedEvents();

    return {
      totalEvents: events.length,
      eventsCreated: events.length,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: 0,
      lastSync: config.lastSyncTimestamp ? new Date(config.lastSyncTimestamp) : null
    };
  }

  /**
   * Formata data para exibição
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  /**
   * Formata data/hora para exibição
   */
  formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}


