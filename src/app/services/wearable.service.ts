import { Injectable, inject, signal, effect } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { UserService } from './user.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { IndexedDBService } from './indexed-db.service';
import { HapticPatternsService } from './haptic-patterns.service';

/**
 * Tipos de wearables suportados
 */
export type WearableType = 'apple-watch' | 'wear-os' | 'none';

/**
 * Status de conexão com wearable
 */
export type WearableConnectionStatus = 'connected' | 'disconnected' | 'pairing' | 'unavailable';

/**
 * Configurações de wearable
 */
export interface WearableConfig {
  enabled: boolean;
  type: WearableType;
  deviceName?: string;
  lastSync?: Date;
  hapticFeedback: boolean;
  quickConfirm: boolean;
  syncWithHealth: boolean;
  autoConfirmOnWatch: boolean;
}

/**
 * Ação enviada para o wearable
 */
export interface WearableAction {
  id: string;
  type: 'dose-reminder' | 'dose-confirm' | 'dose-skip' | 'dose-snooze';
  medicationId: string;
  medicationName: string;
  dosage: string;
  time: string;
  timestamp: Date;
}

/**
 * Resposta do wearable
 */
export interface WearableResponse {
  actionId: string;
  result: 'confirmed' | 'skipped' | 'snoozed' | 'failed';
  timestamp: Date;
  source: 'watch' | 'phone';
}

/**
 * Serviço de Wearables
 * Gerencia conexão e sincronização com Apple Watch e Wear OS
 */
@Injectable({
  providedIn: 'root'
})
export class WearableService {
  private readonly platform = inject(Platform);
  private readonly userService = inject(UserService);
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly hapticService = inject(HapticPatternsService);

  // Estado
  private readonly _config = signal<WearableConfig>({
    enabled: false,
    type: 'none',
    hapticFeedback: true,
    quickConfirm: true,
    syncWithHealth: false,
    autoConfirmOnWatch: false
  });

  private readonly _connectionStatus = signal<WearableConnectionStatus>('disconnected');
  private readonly _isSupported = signal<boolean>(false);
  private readonly _lastSync = signal<Date | null>(null);
  private readonly _pendingActions = signal<WearableAction[]>([]);

  // Sinais públicos
  public readonly config = this._config.asReadonly();
  public readonly connectionStatus = this._connectionStatus.asReadonly();
  public readonly isSupported = this._isSupported.asReadonly();
  public readonly lastSync = this._lastSync.asReadonly();
  public readonly isConnected = signal<boolean>(false);

  // Watch message handler
  private watchMessageHandler?: (message: any) => void;

  constructor() {
    this.checkSupport();
    this.loadConfig();

    // Monitorar mudanças de plataforma
    effect(() => {
      const config = this._config();
      if (config.enabled) {
        this.initializeWatchConnection();
      }
    });

    // Auto-sync ao marcar doses
    effect(() => {
      const medications = this.medicationService.medications();
      const config = this._config();
      
      if (config.enabled && medications.length > 0) {
        this.syncPendingDoses();
      }
    });
  }

  /**
   * Verifica se plataforma suporta wearables
   */
  private checkSupport(): void {
    const isIOS = this.platform.is('ios') || this.platform.is('ipad');
    const isAndroid = this.platform.is('android');
    const isCapacitor = Capacitor.isNativePlatform();

    const supported = isCapacitor && (isIOS || isAndroid);
    this._isSupported.set(supported);

    if (supported) {
      if (isIOS) {
        this._config.update(c => ({ ...c, type: 'apple-watch' }));
      } else if (isAndroid) {
        this._config.update(c => ({ ...c, type: 'wear-os' }));
      }
    }

    this.logService.debug('WearableService', 'Support checked', { supported, isIOS, isAndroid, isCapacitor });
  }

  /**
   * Carrega configurações salvas
   */
  private async loadConfig(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      const saved = await this.indexedDB.get<WearableConfig>('wearable-config', userId);
      if (saved) {
        // Converter lastSync se necessário
        if (saved.lastSync) {
          saved.lastSync = new Date(saved.lastSync);
        }
        this._config.set(saved);
        this._lastSync.set(saved.lastSync || null);
      }
    } catch (error: any) {
      this.logService.error('WearableService', 'Failed to load config', error as Error);
    }
  }

  /**
   * Salva configurações
   */
  private async saveConfig(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      const config = this._config();
      await this.indexedDB.put('wearable-config', config);
    } catch (error: any) {
      this.logService.error('WearableService', 'Failed to save config', error as Error);
    }
  }

  /**
   * Inicializa conexão com wearable
   */
  private async initializeWatchConnection(): Promise<void> {
    if (!this._isSupported()) {
      this.logService.warn('WearableService', 'Wearable not supported on this platform');
      return;
    }

    try {
      this._connectionStatus.set('pairing');

      const config = this._config();
      
      if (config.type === 'apple-watch') {
        await this.initializeAppleWatch();
      } else if (config.type === 'wear-os') {
        await this.initializeWearOS();
      }

      this._connectionStatus.set('connected');
      this.isConnected.set(true);
      this.logService.debug('WearableService', 'Watch connection initialized');
    } catch (error: any) {
      this.logService.error('WearableService', 'Failed to initialize watch', error as Error);
      this._connectionStatus.set('disconnected');
      this.isConnected.set(false);
    }
  }

  /**
   * Inicializa Apple Watch
   */
  private async initializeAppleWatch(): Promise<void> {
    // Em produção, usaria WatchConnectivity framework via plugin Capacitor
    // Por enquanto, simula conexão
    this.logService.debug('WearableService', 'Initializing Apple Watch connection...');
    
    // Simulação: registrar handler de mensagens do watch
    this.watchMessageHandler = (message: any) => {
      this.handleWatchMessage(message);
    };

    // Request permissions se necessário
    if (this._config().hapticFeedback) {
      try {
        await this.hapticService.playPattern('notification');
      } catch (error: any) {
        this.logService.warn('WearableService', 'Haptic feedback not available');
      }
    }
  }

  /**
   * Inicializa Wear OS
   */
  private async initializeWearOS(): Promise<void> {
    // Em produção, usaria Wearable Data Layer API via plugin
    this.logService.debug('WearableService', 'Initializing Wear OS connection...');
    
    this.watchMessageHandler = (message: any) => {
      this.handleWatchMessage(message);
    };
  }

  /**
   * Trata mensagens recebidas do wearable
   */
  private async handleWatchMessage(message: any): Promise<void> {
    this.logService.debug('WearableService', 'Received watch message', message);

    try {
      const response: WearableResponse = {
        actionId: message.actionId,
        result: message.result,
        timestamp: new Date(),
        source: 'watch'
      };

      // Processar ação
      switch (message.type) {
        case 'dose-confirm':
          await this.confirmDoseFromWatch(message.medicationId, message.time);
          break;
        case 'dose-skip':
          await this.skipDoseFromWatch(message.medicationId, message.time);
          break;
        case 'dose-snooze':
          await this.snoozeDoseFromWatch(message.medicationId, message.time, message.snoozeMinutes);
          break;
      }

      // Feedback háptico com padrão avançado
      if (this._config().hapticFeedback) {
        if (message.action === 'confirmed') {
          await this.hapticService.playPattern('success-confirm');
        } else if (message.action === 'snoozed') {
          await this.hapticService.playPattern('gentle-reminder');
        }
      }

      // Remover ação pendente
      this._pendingActions.update(actions => 
        actions.filter(a => a.id !== message.actionId)
      );
    } catch (error: any) {
      this.logService.error('WearableService', 'Failed to handle watch message', error as Error);
      
      if (this._config().hapticFeedback) {
        await this.hapticService.playSimple('heavy');
      }
    }
  }

  /**
   * Confirma dose via wearable
   */
  private async confirmDoseFromWatch(medicationId: string, time: string): Promise<void> {
    this.logService.debug('WearableService', 'Confirming dose from watch', { medicationId, time });
    
    // Buscar medicação
    const medications = this.medicationService.medications();
    const medication = medications.find(m => m.id === medicationId);
    
    if (!medication) {
      throw new Error('Medication not found');
    }

    // Marcar como tomada via MedicationService
    await this.medicationService.updateDoseStatus(
      medicationId,
      time,
      'taken',
      'Wearable', // Nome do administrador
      'Confirmado via smartwatch'
    );

    this.logService.debug('WearableService', 'Dose confirmed successfully from watch');
  }

  /**
   * Pula dose via wearable
   */
  private async skipDoseFromWatch(medicationId: string, time: string): Promise<void> {
    this.logService.debug('WearableService', 'Skipping dose from watch', { medicationId, time });
    
    await this.medicationService.updateDoseStatus(
      medicationId,
      time,
      'missed',
      'Wearable',
      'Pulado via smartwatch'
    );
  }

  /**
   * Adia dose via wearable
   */
  private async snoozeDoseFromWatch(medicationId: string, time: string, snoozeMinutes: number): Promise<void> {
    this.logService.debug('WearableService', 'Snoozing dose from watch', { medicationId, time, snoozeMinutes });
    
    // Criar nova notificação com delay
    const [hours, minutes] = time.split(':').map(Number);
    const notificationTime = new Date();
    notificationTime.setHours(hours, minutes + snoozeMinutes, 0, 0);

    // Reagendar notificação (seria integrado com NotificationService)
    this.logService.debug('WearableService', `Dose snoozed for ${snoozeMinutes} minutes`);
  }

  /**
   * Sincroniza doses pendentes com wearable
   */
  private async syncPendingDoses(): Promise<void> {
    const config = this._config();
    if (!config.enabled || !this.isConnected()) return;

    try {
      const medications = this.medicationService.medications();
      const now = new Date();
      const pendingActions: WearableAction[] = [];

      // Identificar doses do dia de hoje que ainda não foram tomadas
      for (const med of medications) {
        if (!med.schedule) continue;

        for (const dose of med.schedule) {
          const [hours, minutes] = dose.time.split(':').map(Number);
          const doseTime = new Date(now);
          doseTime.setHours(hours, minutes, 0, 0);

          // Verificar se já passou ou está próximo (30 min antes)
          const timeDiff = doseTime.getTime() - now.getTime();
          const minutesUntilDose = Math.floor(timeDiff / (1000 * 60));

          if (minutesUntilDose >= -30 && minutesUntilDose <= 30 && dose.status === 'upcoming') {
            pendingActions.push({
              id: `${med.id}-${dose.time}-${now.getTime()}`,
              type: 'dose-reminder',
              medicationId: med.id,
              medicationName: med.name,
              dosage: med.dosage,
              time: dose.time,
              timestamp: now
            });
          }
        }
      }

      if (pendingActions.length > 0) {
        this._pendingActions.set(pendingActions);
        await this.sendToWatch(pendingActions);
        this.logService.debug('WearableService', `Synced ${pendingActions.length} pending doses to watch`);
      }

      this._lastSync.set(now);
      this._config.update(c => ({ ...c, lastSync: now }));
      await this.saveConfig();
    } catch (error: any) {
      this.logService.error('WearableService', 'Failed to sync pending doses', error as Error);
    }
  }

  /**
   * Envia dados para o wearable
   */
  private async sendToWatch(actions: WearableAction[]): Promise<void> {
    // Em produção, usaria API específica da plataforma
    this.logService.debug('WearableService', 'Sending to watch', actions);

    // Simulação: enviaria via WatchConnectivity (iOS) ou Wearable Data Layer (Android)
    // Por enquanto, apenas loga
  }

  /**
   * Envia feedback háptico usando padrões avançados
   */
  async sendHapticFeedback(type: 'success' | 'warning' | 'error'): Promise<void> {
    if (!this._config().hapticFeedback) return;

    try {
      switch (type) {
        case 'success':
          await this.hapticService.playPattern('success-confirm');
          break;
        case 'warning':
          await this.hapticService.playPattern('gentle-reminder');
          break;
        case 'error':
          await this.hapticService.playSimple('heavy');
          break;
      }
    } catch (error: any) {
      this.logService.warn('WearableService', 'Haptic feedback failed', error as Error);
    }
  }

  /**
   * Envia lembrete de dose para wearable com haptic
   */
  async sendDoseReminderToWatch(medicationId: string, medicationName: string, dosage: string, time: string): Promise<void> {
    const config = this._config();
    if (!config.enabled || !this.isConnected()) {
      this.logService.debug('WearableService', 'Watch not connected, skipping reminder');
      return;
    }

    try {
      const action: WearableAction = {
        id: `${medicationId}-${time}-${Date.now()}`,
        type: 'dose-reminder',
        medicationId,
        medicationName,
        dosage,
        time,
        timestamp: new Date()
      };

      await this.sendToWatch([action]);
      
      // Feedback háptico
      if (config.hapticFeedback) {
        await this.sendHapticFeedback('warning');
      }

      this.logService.debug('WearableService', 'Dose reminder sent to watch', { medicationName });
    } catch (error: any) {
      this.logService.error('WearableService', 'Failed to send dose reminder', error as Error);
    }
  }

  /**
   * Ativa/desativa wearable
   */
  async toggleWearable(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, enabled }));
    await this.saveConfig();

    if (enabled) {
      await this.initializeWatchConnection();
      await this.syncPendingDoses();
    } else {
      this._connectionStatus.set('disconnected');
      this.isConnected.set(false);
    }
  }

  /**
   * Atualiza configuração de haptic feedback
   */
  async setHapticFeedback(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, hapticFeedback: enabled }));
    await this.saveConfig();
  }

  /**
   * Atualiza configuração de quick confirm
   */
  async setQuickConfirm(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, quickConfirm: enabled }));
    await this.saveConfig();
  }

  /**
   * Atualiza configuração de auto confirm
   */
  async setAutoConfirmOnWatch(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, autoConfirmOnWatch: enabled }));
    await this.saveConfig();
  }

  /**
   * Atualiza configuração de sincronização com health apps
   */
  async setSyncWithHealth(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, syncWithHealth: enabled }));
    await this.saveConfig();
  }

  /**
   * Força sincronização manual
   */
  async forceSync(): Promise<void> {
    this.logService.debug('WearableService', 'Forcing manual sync...');
    await this.syncPendingDoses();
  }

  /**
   * Desconecta wearable
   */
  async disconnect(): Promise<void> {
    this._connectionStatus.set('disconnected');
    this.isConnected.set(false);
    this._pendingActions.set([]);
    this.watchMessageHandler = undefined;
    this.logService.debug('WearableService', 'Disconnected from wearable');
  }

  /**
   * Obtém estatísticas de uso do wearable
   */
  getWearableStats(): {
    dosesConfirmedFromWatch: number;
    lastSync: Date | null;
    pendingReminders: number;
  } {
    return {
      dosesConfirmedFromWatch: 0, // Seria calculado a partir dos logs
      lastSync: this._lastSync(),
      pendingReminders: this._pendingActions().length
    };
  }
}

