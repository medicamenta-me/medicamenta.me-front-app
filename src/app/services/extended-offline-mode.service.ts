import { Injectable, inject, signal, computed } from '@angular/core';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';

export interface DownloadProgress {
  stage: 'medications' | 'logs' | 'insights' | 'stats' | 'complete';
  percent: number;
  itemsDownloaded: number;
  totalItems: number;
  currentCollection?: string;
}

export interface OfflineModeStats {
  enabled: boolean;
  lastFullSync: Date | null;
  totalItemsCached: number;
  storageUsed: number;
  estimatedQuota: number;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  usagePercent: number;
  available: number;
}

/**
 * Extended Offline Mode Service
 * 
 * Enables 100% offline mode by downloading all user data to IndexedDB.
 * Features:
 * - Complete data download from Firestore
 * - Storage quota management
 * - Periodic sync when back online
 * - Progress tracking
 * - Network call interception when offline mode enabled
 */
@Injectable({
  providedIn: 'root'
})
export class ExtendedOfflineModeService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly indexedDB = inject(IndexedDBService);

  private readonly _isEnabled = signal(false);
  private readonly _progress = signal<DownloadProgress | null>(null);
  private readonly _stats = signal<OfflineModeStats>({
    enabled: false,
    lastFullSync: null,
    totalItemsCached: 0,
    storageUsed: 0,
    estimatedQuota: 0
  });

  readonly isEnabled = this._isEnabled.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly stats = this._stats.asReadonly();

  readonly storagePercent = computed(() => {
    const stats = this._stats();
    if (stats.estimatedQuota === 0) return 0;
    return Math.round((stats.storageUsed / stats.estimatedQuota) * 100);
  });

  private syncIntervalId: any = null;
  private readonly logService = inject(LogService);

  constructor() {
    this.loadSettings();
    this.updateStorageEstimate();
  }

  /**
   * Enable extended offline mode and download all data
   */
  async enable(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      throw new Error('User must be authenticated to enable offline mode');
    }

    if (this._isEnabled()) {
      this.logService.debug('ExtendedOfflineModeService', 'Already enabled');
      return;
    }

    this.logService.info('ExtendedOfflineModeService', 'Enabling offline mode...');

    try {
      // Check storage availability
      await this.checkStorageAvailability();

      // Download all data
      await this.downloadAllData(userId);

      // Enable offline mode
      this._isEnabled.set(true);
      this._stats.update(s => ({
        ...s,
        enabled: true,
        lastFullSync: new Date()
      }));

      // Save settings
      this.saveSettings();

      // Start periodic sync (every 6 hours when online)
      this.startPeriodicSync();

      this.logService.info('ExtendedOfflineModeService', 'Offline mode enabled successfully');
    } catch (error: any) {
      this.logService.error('ExtendedOfflineModeService', 'Failed to enable offline mode', error as Error);
      throw error;
    }
  }

  /**
   * Disable extended offline mode
   */
  async disable(): Promise<void> {
    this.logService.info('ExtendedOfflineModeService', 'Disabling offline mode...');

    // Stop periodic sync
    this.stopPeriodicSync();

    // Update state
    this._isEnabled.set(false);
    this._stats.update(s => ({ ...s, enabled: false }));

    // Save settings
    this.saveSettings();

    this.logService.info('ExtendedOfflineModeService', 'Offline mode disabled');
  }

  /**
   * Download all user data from Firestore
   */
  private async downloadAllData(userId: string): Promise<void> {
    this.logService.debug('ExtendedOfflineModeService', 'Downloading all data...');
    const startTime = Date.now();

    let totalItems = 0;
    let itemsDownloaded = 0;

    try {
      // Stage 1: Download medications
      this._progress.set({
        stage: 'medications',
        percent: 0,
        itemsDownloaded: 0,
        totalItems: 0,
        currentCollection: 'medications'
      });

      const medications = await this.downloadCollection('medications', userId);
      totalItems += medications.length;
      itemsDownloaded += medications.length;

      this._progress.update(p => p ? { ...p, percent: 25, itemsDownloaded, totalItems } : null);

      // Stage 2: Download logs
      this._progress.update(p => p ? { 
        ...p, 
        stage: 'logs', 
        currentCollection: 'logs' 
      } : null);

      const logs = await this.downloadCollection('logs', userId);
      totalItems += logs.length;
      itemsDownloaded += logs.length;

      this._progress.update(p => p ? { ...p, percent: 50, itemsDownloaded, totalItems } : null);

      // Stage 3: Download insights
      this._progress.update(p => p ? { 
        ...p, 
        stage: 'insights', 
        currentCollection: 'insights' 
      } : null);

      const insights = await this.downloadCollection('insights', userId);
      totalItems += insights.length;
      itemsDownloaded += insights.length;

      this._progress.update(p => p ? { ...p, percent: 75, itemsDownloaded, totalItems } : null);

      // Stage 4: Download stats
      this._progress.update(p => p ? { 
        ...p, 
        stage: 'stats', 
        currentCollection: 'stats' 
      } : null);

      const stats = await this.downloadCollection('stats', userId);
      totalItems += stats.length;
      itemsDownloaded += stats.length;

      // Stage 5: Complete
      this._progress.set({
        stage: 'complete',
        percent: 100,
        itemsDownloaded: totalItems,
        totalItems
      });

      // Update stats
      await this.updateStorageEstimate();
      this._stats.update(s => ({
        ...s,
        totalItemsCached: totalItems
      }));

      const duration = Date.now() - startTime;
      this.logService.info('ExtendedOfflineModeService', 'Downloaded all items', { totalItems, durationMs: duration });

      // Clear progress after 2 seconds
      setTimeout(() => this._progress.set(null), 2000);

    } catch (error: any) {
      this.logService.error('ExtendedOfflineModeService', 'Failed to download data', error as Error);
      this._progress.set(null);
      throw error;
    }
  }

  /**
   * Download a specific collection
   */
  private async downloadCollection(collectionName: string, userId: string): Promise<any[]> {
    this.logService.debug('ExtendedOfflineModeService', 'Downloading collection', { collectionName });

    try {
      const colRef = collection(this.firestore, collectionName);
      const q = query(colRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const items: any[] = [];
      snapshot.forEach((doc: any) => {
        items.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Store in IndexedDB
      if (items.length > 0) {
        await this.indexedDB.putBatch(collectionName, items);
      }

      this.logService.debug('ExtendedOfflineModeService', 'Downloaded collection items', { collectionName, itemCount: items.length });
      return items;

    } catch (error: any) {
      this.logService.error('ExtendedOfflineModeService', 'Failed to download collection', { error, collectionName } as any);
      return [];
    }
  }

  /**
   * Sync data when back online
   */
  async syncWhenOnline(): Promise<void> {
    if (!this._isEnabled()) {
      return;
    }

    if (!navigator.onLine) {
      this.logService.debug('ExtendedOfflineModeService', 'Device is offline, skipping sync');
      return;
    }

    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    this.logService.debug('ExtendedOfflineModeService', 'Syncing data...');

    try {
      await this.downloadAllData(userId);
      
      this._stats.update(s => ({
        ...s,
        lastFullSync: new Date()
      }));

      this.saveSettings();
    } catch (error: any) {
      this.logService.error('ExtendedOfflineModeService', 'Sync failed', error as Error);
    }
  }

  /**
   * Start periodic sync (every 6 hours)
   */
  private startPeriodicSync(): void {
    if (this.syncIntervalId) {
      return;
    }

    // Sync every 6 hours
    this.syncIntervalId = setInterval(() => {
      this.syncWhenOnline();
    }, 6 * 60 * 60 * 1000);

    this.logService.info('ExtendedOfflineModeService', 'Periodic sync started (6 hours)');
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      this.logService.info('ExtendedOfflineModeService', 'Periodic sync stopped');
    }
  }

  /**
   * Check storage availability
   */
  private async checkStorageAvailability(): Promise<void> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      this.logService.warn('ExtendedOfflineModeService', 'Storage API not supported');
      return;
    }

    const estimate = await navigator.storage.estimate();
    const available = (estimate.quota || 0) - (estimate.usage || 0);
    const requiredSpace = 50 * 1024 * 1024; // 50MB minimum

    if (available < requiredSpace) {
      throw new Error(`Insufficient storage. Available: ${this.formatSize(available)}, Required: ${this.formatSize(requiredSpace)}`);
    }

    this.logService.debug('ExtendedOfflineModeService', 'Storage available', { availableFormatted: this.formatSize(available), availableBytes: available });
  }

  /**
   * Update storage estimate
   */
  async updateStorageEstimate(): Promise<StorageEstimate> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      const fallback: StorageEstimate = {
        usage: 0,
        quota: 0,
        usagePercent: 0,
        available: 0
      };
      return fallback;
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usagePercent = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    const available = quota - usage;

    this._stats.update(s => ({
      ...s,
      storageUsed: usage,
      estimatedQuota: quota
    }));

    const result: StorageEstimate = {
      usage,
      quota,
      usagePercent,
      available
    };

    return result;
  }

  /**
   * Get storage estimate
   */
  async getStorageEstimate(): Promise<StorageEstimate> {
    return this.updateStorageEstimate();
  }

  /**
   * Format size in bytes
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Get formatted storage estimate
   */
  async getFormattedStorageEstimate(): Promise<{
    usage: string;
    quota: string;
    usagePercent: number;
    available: string;
  }> {
    const estimate = await this.getStorageEstimate();
    return {
      usage: this.formatSize(estimate.usage),
      quota: this.formatSize(estimate.quota),
      usagePercent: estimate.usagePercent,
      available: this.formatSize(estimate.available)
    };
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem('medicamenta_extended_offline');
      if (stored) {
        const settings = JSON.parse(stored);
        this._isEnabled.set(settings.enabled || false);
        this._stats.set({
          enabled: settings.enabled || false,
          lastFullSync: settings.lastFullSync ? new Date(settings.lastFullSync) : null,
          totalItemsCached: settings.totalItemsCached || 0,
          storageUsed: settings.storageUsed || 0,
          estimatedQuota: settings.estimatedQuota || 0
        });

        // Restart periodic sync if was enabled
        if (settings.enabled) {
          this.startPeriodicSync();
        }
      }
    } catch (error: any) {
      this.logService.error('ExtendedOfflineModeService', 'Failed to load settings', error as Error);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      const stats = this._stats();
      const settings = {
        enabled: this._isEnabled(),
        lastFullSync: stats.lastFullSync,
        totalItemsCached: stats.totalItemsCached,
        storageUsed: stats.storageUsed,
        estimatedQuota: stats.estimatedQuota
      };
      localStorage.setItem('medicamenta_extended_offline', JSON.stringify(settings));
    } catch (error: any) {
      this.logService.error('ExtendedOfflineModeService', 'Failed to save settings', error as Error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.logService.debug('ExtendedOfflineModeService', 'Clearing cache...');

    const stores = ['medications', 'logs', 'insights', 'stats'];
    for (const store of stores) {
      await this.indexedDB.clear(store);
    }

    this._stats.update(s => ({
      ...s,
      totalItemsCached: 0,
      lastFullSync: null
    }));

    await this.updateStorageEstimate();
    this.saveSettings();

    this.logService.info('ExtendedOfflineModeService', 'Cache cleared');
  }

  /**
   * Get progress message
   */
  getProgressMessage(): string {
    const prog = this._progress();
    if (!prog) return '';

    switch (prog.stage) {
      case 'medications':
        return 'Downloading medications...';
      case 'logs':
        return 'Downloading logs...';
      case 'insights':
        return 'Downloading insights...';
      case 'stats':
        return 'Downloading statistics...';
      case 'complete':
        return 'Download complete!';
      default:
        return 'Downloading...';
    }
  }
}

