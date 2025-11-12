import { Injectable, inject, signal } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { UserService } from './user.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { IndexedDBService } from './indexed-db.service';

/**
 * Tipo de plataforma de saúde
 */
export type HealthPlatform = 'apple-health' | 'google-fit' | 'none';

/**
 * Permissões de Health
 */
export interface HealthPermissions {
  readMedication: boolean;
  writeMedication: boolean;
  readActivityData: boolean;
  granted: boolean;
}

/**
 * Dados de medicação para Health apps
 */
export interface HealthMedicationData {
  name: string;
  dosage: string;
  timestamp: Date;
  taken: boolean;
  notes?: string;
}

/**
 * Configuração de sincronização
 */
export interface HealthSyncConfig {
  enabled: boolean;
  platform: HealthPlatform;
  autoSync: boolean;
  syncInterval: number; // minutos
  lastSync?: Date;
  syncMedications: boolean;
  syncVitals: boolean;
}

/**
 * Estatísticas de sincronização
 */
export interface HealthSyncStats {
  totalSyncs: number;
  lastSync: Date | null;
  medicationsSynced: number;
  errors: number;
}

/**
 * Serviço de Sincronização com Health Apps
 * Integra com Apple Health e Google Fit
 */
@Injectable({
  providedIn: 'root'
})
export class HealthSyncService {
  private readonly platform = inject(Platform);
  private readonly userService = inject(UserService);
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);
  private readonly indexedDB = inject(IndexedDBService);

  // Estado
  private readonly _config = signal<HealthSyncConfig>({
    enabled: false,
    platform: 'none',
    autoSync: true,
    syncInterval: 60, // 1 hora
    syncMedications: true,
    syncVitals: false
  });

  private readonly _permissions = signal<HealthPermissions>({
    readMedication: false,
    writeMedication: false,
    readActivityData: false,
    granted: false
  });

  private readonly _isSupported = signal<boolean>(false);
  private readonly _isSyncing = signal<boolean>(false);
  private readonly _stats = signal<HealthSyncStats>({
    totalSyncs: 0,
    lastSync: null,
    medicationsSynced: 0,
    errors: 0
  });

  // Sinais públicos
  public readonly config = this._config.asReadonly();
  public readonly permissions = this._permissions.asReadonly();
  public readonly isSupported = this._isSupported.asReadonly();
  public readonly isSyncing = this._isSyncing.asReadonly();
  public readonly stats = this._stats.asReadonly();

  // Interval para auto-sync
  private syncIntervalId?: ReturnType<typeof setInterval>;

  constructor() {
    this.checkSupport();
    this.loadConfig();
    this.loadStats();
  }

  /**
   * Verifica suporte da plataforma
   */
  private checkSupport(): void {
    const isIOS = this.platform.is('ios') || this.platform.is('ipad');
    const isAndroid = this.platform.is('android');
    const isNative = Capacitor.isNativePlatform();

    const supported = isNative && (isIOS || isAndroid);
    this._isSupported.set(supported);

    if (supported) {
      if (isIOS) {
        this._config.update(c => ({ ...c, platform: 'apple-health' }));
      } else if (isAndroid) {
        this._config.update(c => ({ ...c, platform: 'google-fit' }));
      }
    }

    this.logService.debug('HealthSyncService', 'Support checked', { supported, isIOS, isAndroid, isNative });
  }

  /**
   * Carrega configurações
   */
  private async loadConfig(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      const saved = await this.indexedDB.get<HealthSyncConfig>('health-sync-config', userId);
      if (saved) {
        if (saved.lastSync) {
          saved.lastSync = new Date(saved.lastSync);
        }
        this._config.set(saved);
      }
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Failed to load config', error as Error);
    }
  }

  /**
   * Salva configurações
   */
  private async saveConfig(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      await this.indexedDB.put('health-sync-config', this._config());
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Failed to save config', error as Error);
    }
  }

  /**
   * Carrega estatísticas
   */
  private async loadStats(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      const saved = await this.indexedDB.get<HealthSyncStats>('health-sync-stats', userId);
      if (saved) {
        if (saved.lastSync) {
          saved.lastSync = new Date(saved.lastSync);
        }
        this._stats.set(saved);
      }
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Failed to load stats', error as Error);
    }
  }

  /**
   * Salva estatísticas
   */
  private async saveStats(): Promise<void> {
    try {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;

      await this.indexedDB.put('health-sync-stats', this._stats());
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Failed to save stats', error as Error);
    }
  }

  /**
   * Solicita permissões de acesso ao Health
   */
  async requestPermissions(): Promise<boolean> {
    if (!this._isSupported()) {
      this.logService.warn('HealthSyncService', 'Health APIs not supported on this platform');
      return false;
    }

    try {
      const config = this._config();

      if (config.platform === 'apple-health') {
        return await this.requestAppleHealthPermissions();
      } else if (config.platform === 'google-fit') {
        return await this.requestGoogleFitPermissions();
      }

      return false;
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Failed to request permissions', error as Error);
      return false;
    }
  }

  /**
   * Solicita permissões do Apple Health
   */
  private async requestAppleHealthPermissions(): Promise<boolean> {
    this.logService.debug('HealthSyncService', 'Requesting Apple Health permissions...');
    
    try {
      // Em produção, usaria @capacitor-community/health plugin:
      // await HealthKit.requestAuthorization({
      //   read: ['HKCategoryTypeIdentifierMedicationTracking'],
      //   write: ['HKCategoryTypeIdentifierMedicationTracking']
      // });

      this._permissions.set({
        readMedication: true,
        writeMedication: true,
        readActivityData: true,
        granted: true
      });

      this.logService.debug('HealthSyncService', 'Apple Health permissions granted');
      return true;
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Apple Health permission denied', error as Error);
      return false;
    }
  }

  /**
   * Solicita permissões do Google Fit
   */
  private async requestGoogleFitPermissions(): Promise<boolean> {
    this.logService.debug('HealthSyncService', 'Requesting Google Fit permissions...');

    // Em produção, usaria Google Fit API via plugin
    try {
      // Simulação: await GoogleFit.requestPermissions({
      //   scopes: [
      //     'https://www.googleapis.com/auth/fitness.nutrition.write',
      //     'https://www.googleapis.com/auth/fitness.activity.read'
      //   ]
      // });

      this._permissions.set({
        readMedication: true,
        writeMedication: true,
        readActivityData: true,
        granted: true
      });

      this.logService.debug('HealthSyncService', 'Google Fit permissions granted');
      return true;
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Google Fit permission denied', error as Error);
      return false;
    }
  }

  /**
   * Sincroniza dados com Health app
   */
  async syncWithHealth(): Promise<boolean> {
    if (!this._config().enabled || !this._permissions().granted) {
      this.logService.warn('HealthSyncService', 'Sync not enabled or permissions not granted');
      return false;
    }

    if (this._isSyncing()) {
      this.logService.warn('HealthSyncService', 'Sync already in progress');
      return false;
    }

    try {
      this._isSyncing.set(true);
      this.logService.debug('HealthSyncService', 'Starting health sync...');

      const config = this._config();
      let success = false;

      if (config.platform === 'apple-health') {
        success = await this.syncWithAppleHealth();
      } else if (config.platform === 'google-fit') {
        success = await this.syncWithGoogleFit();
      }

      // Atualizar estatísticas
      if (success) {
        this._stats.update(s => ({
          ...s,
          totalSyncs: s.totalSyncs + 1,
          lastSync: new Date()
        }));

        this._config.update(c => ({
          ...c,
          lastSync: new Date()
        }));

        await this.saveStats();
        await this.saveConfig();
      }

      this.logService.debug('HealthSyncService', 'Sync completed', { success });
      return success;
    } catch (error: any) {
      this.logService.error('HealthSyncService', 'Sync failed', error as Error);
      
      this._stats.update(s => ({
        ...s,
        errors: s.errors + 1
      }));
      await this.saveStats();

      return false;
    } finally {
      this._isSyncing.set(false);
    }
  }

  /**
   * Sincroniza com Apple Health
   */
  private async syncWithAppleHealth(): Promise<boolean> {
    this.logService.debug('HealthSyncService', 'Syncing with Apple Health...');

    const logs = this.logService.logs();
    let synced = 0;

    // Filtrar logs de doses tomadas hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return log.eventType === 'taken' && logDate >= today;
    });

    // Enviar dados para Apple Health
    for (let i = 0; i < todayLogs.length; i++) {
      try {
        // Em produção com @capacitor-community/health:
        // await HealthKit.saveMedicationSample({
        //   identifier: todayLogs[i].id,
        //   startDate: todayLogs[i].timestamp,
        //   endDate: todayLogs[i].timestamp
        // });

        synced++;
      } catch (error: any) {
        this.logService.error('HealthSyncService', 'Failed to sync medication to Apple Health', error as Error);
      }
    }

    this._stats.update(s => ({
      ...s,
      medicationsSynced: s.medicationsSynced + synced
    }));

    this.logService.debug('HealthSyncService', `Synced ${synced} medications to Apple Health`);
    return synced > 0;
  }

  /**
   * Sincroniza com Google Fit
   */
  private async syncWithGoogleFit(): Promise<boolean> {
    this.logService.debug('HealthSyncService', 'Syncing with Google Fit...');

    const logs = this.logService.logs();
    let synced = 0;

    // Filtrar logs de doses tomadas hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return log.eventType === 'taken' && logDate >= today;
    });

    // Enviar dados para Google Fit
    // Em produção, cada log seria enviado via Google Fit API
    if (todayLogs.length > 0) {
      synced = todayLogs.length;
    }

    this._stats.update(s => ({
      ...s,
      medicationsSynced: s.medicationsSynced + synced
    }));

    this.logService.debug('HealthSyncService', `Synced ${synced} medications to Google Fit`);
    return synced > 0;
  }

  /**
   * Ativa/desativa sincronização
   */
  async toggleSync(enabled: boolean): Promise<void> {
    if (enabled && !this._permissions().granted) {
      const granted = await this.requestPermissions();
      if (!granted) {
        this.logService.warn('HealthSyncService', 'Permissions not granted, cannot enable sync');
        return;
      }
    }

    this._config.update(c => ({ ...c, enabled }));
    await this.saveConfig();

    if (enabled) {
      await this.startAutoSync();
      await this.syncWithHealth();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Inicia sincronização automática
   */
  private async startAutoSync(): Promise<void> {
    if (!this._config().autoSync) return;

    this.stopAutoSync(); // Limpar anterior

    const intervalMinutes = this._config().syncInterval;
    this.syncIntervalId = globalThis.setInterval(() => {
      this.syncWithHealth();
    }, intervalMinutes * 60 * 1000);

    this.logService.debug('HealthSyncService', `Auto-sync started (interval: ${intervalMinutes} minutes)`);
  }

  /**
   * Para sincronização automática
   */
  private stopAutoSync(): void {
    if (this.syncIntervalId) {
      globalThis.clearInterval(this.syncIntervalId);
      this.syncIntervalId = undefined;
      this.logService.debug('HealthSyncService', 'Auto-sync stopped');
    }
  }

  /**
   * Atualiza intervalo de sincronização
   */
  async setSyncInterval(minutes: number): Promise<void> {
    this._config.update(c => ({ ...c, syncInterval: minutes }));
    await this.saveConfig();

    if (this._config().enabled && this._config().autoSync) {
      await this.startAutoSync();
    }
  }

  /**
   * Ativa/desativa auto-sync
   */
  async setAutoSync(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, autoSync: enabled }));
    await this.saveConfig();

    if (enabled && this._config().enabled) {
      await this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
  }

  /**
   * Ativa/desativa sync de medicações
   */
  async setSyncMedications(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, syncMedications: enabled }));
    await this.saveConfig();
  }

  /**
   * Ativa/desativa sync de sinais vitais
   */
  async setSyncVitals(enabled: boolean): Promise<void> {
    this._config.update(c => ({ ...c, syncVitals: enabled }));
    await this.saveConfig();
  }

  /**
   * Reseta estatísticas
   */
  async resetStats(): Promise<void> {
    this._stats.set({
      totalSyncs: 0,
      lastSync: null,
      medicationsSynced: 0,
      errors: 0
    });
    await this.saveStats();
  }

  /**
   * Cleanup ao destruir serviço
   */
  destroy(): void {
    this.stopAutoSync();
  }
}

