import { Injectable, inject, signal } from '@angular/core';
import { BackupService, BackupMetadata } from './backup.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';

export interface RestoreProgress {
  stage: 'downloading' | 'validating' | 'clearing' | 'importing' | 'complete';
  percent: number;
  itemsProcessed: number;
  totalItems: number;
  currentStore?: string;
}

export interface RestoreResult {
  success: boolean;
  backupId: string;
  itemsRestored: number;
  duration: number;
  error?: string;
}

export interface RestoreHistory {
  timestamp: Date;
  backupId: string;
  success: boolean;
  itemsRestored: number;
}

/**
 * Restore Service
 * 
 * Handles restoration of IndexedDB data from Firebase Storage backups.
 * Features:
 * - Download and validate backup data
 * - Progress tracking during restore
 * - Rollback on failure
 * - Restore history tracking
 * - Conflict resolution strategies
 */
@Injectable({
  providedIn: 'root'
})
export class RestoreService {
  private readonly backup = inject(BackupService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly logService = inject(LogService);

  private readonly _progress = signal<RestoreProgress | null>(null);
  private readonly _history = signal<RestoreHistory[]>([]);

  readonly progress = this._progress.asReadonly();
  readonly history = this._history.asReadonly();

  private backupBeforeRestore: any = null;

  constructor() {
    this.loadHistory();
  }

  /**
   * Restore data from a specific backup
   * @param backupId Backup ID to restore from
   * @param clearExisting Clear existing data before restore (default: true)
   */
  async restoreFromBackup(backupId: string, clearExisting: boolean = true): Promise<RestoreResult> {
    this.logService.info('RestoreService', 'Starting restore from backup', { backupId });
    const startTime = Date.now();

    try {
      // Stage 1: Download backup data
      this._progress.set({
        stage: 'downloading',
        percent: 0,
        itemsProcessed: 0,
        totalItems: 0
      });

      const data = await this.backup.downloadBackup(backupId);
      
      this._progress.update(p => p ? { ...p, percent: 20 } : null);

      // Stage 2: Validate backup data
      this._progress.update(p => p ? { ...p, stage: 'validating', percent: 30 } : null);
      
      this.validateBackupData(data);
      const totalItems = this.countTotalItems(data);

      // Stage 3: Create backup of current data (for rollback)
      if (clearExisting) {
        this.logService.info('RestoreService', 'Creating safety backup of current data...');
        this.backupBeforeRestore = await this.indexedDB.exportData();
      }

      // Stage 4: Clear existing data if requested
      if (clearExisting) {
        this._progress.update(p => p ? { 
          ...p, 
          stage: 'clearing', 
          percent: 40,
          totalItems 
        } : null);

        await this.clearAllStores();
      }

      // Stage 5: Import data
      this._progress.update(p => p ? { 
        ...p, 
        stage: 'importing', 
        percent: 50,
        totalItems
      } : null);

      let itemsProcessed = 0;

      for (const [storeName, items] of Object.entries(data)) {
        if (!Array.isArray(items) || items.length === 0) {
          continue;
        }

        this._progress.update(p => p ? { ...p, currentStore: storeName } : null);

        // Import in batches for better performance
        const batchSize = 50;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await this.indexedDB.putBatch(storeName, batch);
          
          itemsProcessed += batch.length;
          const percent = 50 + Math.round((itemsProcessed / totalItems) * 45);
          
          this._progress.update(p => p ? { 
            ...p, 
            percent, 
            itemsProcessed 
          } : null);
        }
      }

      // Stage 6: Complete
      const duration = Date.now() - startTime;
      
      this._progress.set({
        stage: 'complete',
        percent: 100,
        itemsProcessed: totalItems,
        totalItems
      });

      // Record in history
      this.addToHistory({
        timestamp: new Date(),
        backupId,
        success: true,
        itemsRestored: totalItems
      });

      // Clear backup
      this.backupBeforeRestore = null;

      this.logService.info('RestoreService', 'Restore completed successfully', { durationMs: duration });
      this.logService.info('RestoreService', 'Items restored', { totalItems });

      // Clear progress after 2 seconds
      setTimeout(() => this._progress.set(null), 2000);

      return {
        success: true,
        backupId,
        itemsRestored: totalItems,
        duration
      };

    } catch (error: any) {
      this.logService.error('RestoreService', 'Failed to restore backup', error);
      
      // Attempt rollback if we have a backup
      if (this.backupBeforeRestore) {
        this.logService.warn('RestoreService', 'Attempting rollback...');
        try {
          await this.rollback();
        } catch (rollbackError) {
          this.logService.error('RestoreService', 'Rollback failed', rollbackError);
        }
      }

      // Record failure in history
      this.addToHistory({
        timestamp: new Date(),
        backupId,
        success: false,
        itemsRestored: 0
      });

      this._progress.set(null);

      const duration = Date.now() - startTime;
      return {
        success: false,
        backupId,
        itemsRestored: 0,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Rollback to state before restore
   */
  private async rollback(): Promise<void> {
    if (!this.backupBeforeRestore) {
      throw new Error('No backup available for rollback');
    }

    this.logService.info('RestoreService', 'Rolling back to previous state...');
    
    await this.clearAllStores();
    await this.indexedDB.importData(this.backupBeforeRestore);
    
    this.backupBeforeRestore = null;
    this.logService.info('RestoreService', 'Rollback completed');
  }

  /**
   * Clear all stores in IndexedDB
   */
  private async clearAllStores(): Promise<void> {
    const stores = ['medications', 'logs', 'users', 'insights', 'stats', 'queue'];
    
    for (const store of stores) {
      try {
        await this.indexedDB.clear(store);
      } catch (error: any) {
        this.logService.error('RestoreService', 'Failed to clear store', { store, error } as any);
      }
    }
  }

  /**
   * Validate backup data structure
   */
  private validateBackupData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backup data: not an object');
    }

    const requiredStores = ['medications', 'logs', 'users'];
    for (const store of requiredStores) {
      if (!Array.isArray(data[store])) {
        throw new Error(`Invalid backup data: missing or invalid store "${store}"`);
      }
    }

    this.logService.info('RestoreService', 'Backup data validated successfully');
  }

  /**
   * Count total items in backup
   */
  private countTotalItems(data: Record<string, any[]>): number {
    return Object.values(data)
      .filter(items => Array.isArray(items))
      .reduce((sum, items) => sum + items.length, 0);
  }

  /**
   * Get available backups for restore
   */
  async getAvailableBackups(): Promise<BackupMetadata[]> {
    return this.backup.listBackups();
  }

  /**
   * Preview backup contents without restoring
   */
  async previewBackup(backupId: string): Promise<{
    metadata: BackupMetadata;
    itemCounts: Record<string, number>;
    totalItems: number;
  }> {
    const data = await this.backup.downloadBackup(backupId);
    const backups = await this.backup.listBackups();
    const metadata = backups.find(b => b.id === backupId);

    if (!metadata) {
      throw new Error('Backup metadata not found');
    }

    const itemCounts: Record<string, number> = {};
    let totalItems = 0;

    for (const [storeName, items] of Object.entries(data)) {
      if (Array.isArray(items)) {
        itemCounts[storeName] = items.length;
        totalItems += items.length;
      }
    }

    return {
      metadata,
      itemCounts,
      totalItems
    };
  }

  /**
   * Add restore to history
   */
  private addToHistory(entry: RestoreHistory): void {
    const history = [...this._history()];
    history.unshift(entry);

    // Keep last 20 restores
    if (history.length > 20) {
      history.splice(20);
    }

    this._history.set(history);
    this.saveHistory();
  }

  /**
   * Load restore history from localStorage
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('medicamenta_restore_history');
      if (stored) {
        const history = JSON.parse(stored);
        // Convert timestamp strings to Date objects
        history.forEach((h: any) => h.timestamp = new Date(h.timestamp));
        this._history.set(history);
      }
    } catch (error: any) {
      this.logService.error('RestoreService', 'Failed to load history', error);
    }
  }

  /**
   * Save restore history to localStorage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem('medicamenta_restore_history', JSON.stringify(this._history()));
    } catch (error: any) {
      this.logService.error('RestoreService', 'Failed to save history', error);
    }
  }

  /**
   * Clear restore history
   */
  clearHistory(): void {
    this._history.set([]);
    localStorage.removeItem('medicamenta_restore_history');
  }

  /**
   * Get formatted progress message
   */
  getProgressMessage(): string {
    const prog = this._progress();
    if (!prog) return '';

    switch (prog.stage) {
      case 'downloading':
        return 'Downloading backup...';
      case 'validating':
        return 'Validating backup data...';
      case 'clearing':
        return 'Clearing existing data...';
      case 'importing':
        return prog.currentStore 
          ? `Importing ${prog.currentStore}... (${prog.itemsProcessed}/${prog.totalItems})`
          : `Importing data... (${prog.itemsProcessed}/${prog.totalItems})`;
      case 'complete':
        return 'Restore complete!';
      default:
        return 'Processing...';
    }
  }
}

