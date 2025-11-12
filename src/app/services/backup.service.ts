import { Injectable, inject, signal } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, listAll, deleteObject } from '@angular/fire/storage';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexed-db.service';
import { CompressionService } from './compression.service';
import { LogService } from './log.service';

export interface BackupMetadata {
  id: string;
  userId: string;
  timestamp: Date;
  size: number;
  compressed: boolean;
  itemCounts: {
    medications: number;
    logs: number;
    users: number;
    insights: number;
    stats: number;
    queue: number;
  };
}

export interface BackupStats {
  totalBackups: number;
  lastBackupTime: Date | null;
  lastBackupSize: number;
  totalStorageUsed: number;
  autoBackupEnabled: boolean;
}

/**
 * Backup Service
 * 
 * Handles automatic and manual backups of IndexedDB data to Firebase Storage.
 * Features:
 * - Automatic daily backups
 * - Manual backup on demand
 * - Compression of backup data
 * - Keep last 7 backups
 * - Backup metadata tracking
 */
@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private readonly storage = inject(Storage);
  private readonly auth = inject(AuthService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly compression = inject(CompressionService);
  private readonly logService = inject(LogService);

  private readonly _stats = signal<BackupStats>({
    totalBackups: 0,
    lastBackupTime: null,
    lastBackupSize: 0,
    totalStorageUsed: 0,
    autoBackupEnabled: true
  });

  readonly stats = this._stats.asReadonly();

  private readonly MAX_BACKUPS = 7;
  private readonly AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private autoBackupIntervalId: any = null;

  /**
   * Start automatic backup service
   */
  startAutoBackup(): void {
    if (this.autoBackupIntervalId) {
      this.logService.debug('BackupService', 'Auto backup already running');
      return;
    }

    this.logService.info('BackupService', 'Starting automatic backup service');

    // Run backup immediately if last backup was > 24h ago
    this.checkAndRunBackup();

    // Schedule periodic backups
    this.autoBackupIntervalId = setInterval(() => {
      this.checkAndRunBackup();
    }, this.AUTO_BACKUP_INTERVAL_MS);

    this._stats.update(s => ({ ...s, autoBackupEnabled: true }));
  }

  /**
   * Stop automatic backup service
   */
  stopAutoBackup(): void {
    if (this.autoBackupIntervalId) {
      clearInterval(this.autoBackupIntervalId);
      this.autoBackupIntervalId = null;
      this.logService.info('BackupService', 'Auto backup stopped');
    }
    this._stats.update(s => ({ ...s, autoBackupEnabled: false }));
  }

  /**
   * Check if backup should run and execute if needed
   */
  private async checkAndRunBackup(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      this.logService.debug('BackupService', 'No user logged in, skipping backup');
      return;
    }

    const lastBackup = this._stats().lastBackupTime;
    if (lastBackup) {
      const hoursSinceBackup = (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60);
      if (hoursSinceBackup < 24) {
        this.logService.debug('BackupService', 'Last backup too recent, skipping', { hoursSince: Number(hoursSinceBackup.toFixed(1)) });
        return;
      }
    }

    this.logService.info('BackupService', 'Running automatic backup...');
    await this.createBackup();
  }

  /**
   * Create a backup of all IndexedDB data
   */
  async createBackup(): Promise<BackupMetadata> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      throw new Error('User must be authenticated to create backup');
    }

    this.logService.debug('BackupService', 'Creating backup...');
    const startTime = Date.now();

    try {
      // 1. Export all data from IndexedDB
      const data = await this.indexedDB.exportData();

      // 2. Count items per store
      const itemCounts = {
        medications: data['medications']?.length || 0,
        logs: data['logs']?.length || 0,
        users: data['users']?.length || 0,
        insights: data['insights']?.length || 0,
        stats: data['stats']?.length || 0,
        queue: data['queue']?.length || 0
      };

      // 3. Compress data
      const compressed = this.compression.compress(data);
      const blob = new Blob([compressed], { type: 'application/octet-stream' });

      // 4. Create metadata
      const backupId = `backup_${Date.now()}`;
      const metadata: BackupMetadata = {
        id: backupId,
        userId,
        timestamp: new Date(),
        size: blob.size,
        compressed: true,
        itemCounts
      };

      // 5. Upload to Firebase Storage
      const backupPath = `backups/${userId}/${backupId}.dat`;
      const backupRef = ref(this.storage, backupPath);
      await uploadBytes(backupRef, blob);

      // 6. Upload metadata
      const metadataPath = `backups/${userId}/${backupId}.meta.json`;
      const metadataRef = ref(this.storage, metadataPath);
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      await uploadBytes(metadataRef, metadataBlob);

      // 7. Cleanup old backups
      await this.cleanupOldBackups(userId);

      // 8. Update stats
      const duration = Date.now() - startTime;
      this._stats.update(s => ({
        ...s,
        totalBackups: s.totalBackups + 1,
        lastBackupTime: new Date(),
        lastBackupSize: blob.size
      }));

      this.logService.info('BackupService', 'Backup created successfully', { durationMs: duration });
      this.logService.debug('BackupService', 'Backup details', { sizeFormatted: this.formatSize(blob.size), sizeBytes: blob.size, itemCounts });

      return metadata;
    } catch (error: any) {
      this.logService.error('BackupService', 'Failed to create backup', error as Error);
      throw error;
    }
  }

  /**
   * List all available backups for user
   */
  async listBackups(): Promise<BackupMetadata[]> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      throw new Error('User must be authenticated to list backups');
    }

    try {
      const backupsRef = ref(this.storage, `backups/${userId}`);
      const result = await listAll(backupsRef);

      // Get all metadata files
      const metadataFiles = result.items.filter((item: any) => item.name.endsWith('.meta.json'));

      // Download and parse each metadata
      const backups: BackupMetadata[] = [];
      for (const metaFile of metadataFiles) {
        try {
          const url = await getDownloadURL(metaFile);
          const response = await fetch(url);
          const metadata = await response.json() as BackupMetadata;
          
          // Convert timestamp string to Date
          metadata.timestamp = new Date(metadata.timestamp);
          
          backups.push(metadata);
        } catch (error: any) {
          this.logService.error('BackupService', 'Failed to load metadata', { error, fileName: metaFile.name } as any);
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      this.logService.debug('BackupService', 'Found backups', { count: backups.length });
      return backups;
    } catch (error: any) {
      this.logService.error('BackupService', 'Failed to list backups', error as Error);
      throw error;
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      throw new Error('User must be authenticated to delete backup');
    }

    try {
      // Delete data file
      const dataRef = ref(this.storage, `backups/${userId}/${backupId}.dat`);
      await deleteObject(dataRef);

      // Delete metadata file
      const metaRef = ref(this.storage, `backups/${userId}/${backupId}.meta.json`);
      await deleteObject(metaRef);

      this.logService.info('BackupService', 'Deleted backup', { backupId });
    } catch (error: any) {
      this.logService.error('BackupService', 'Failed to delete backup', { error, backupId } as any);
      throw error;
    }
  }

  /**
   * Cleanup old backups (keep only last MAX_BACKUPS)
   */
  private async cleanupOldBackups(userId: string): Promise<void> {
    try {
      const backups = await this.listBackups();

      if (backups.length > this.MAX_BACKUPS) {
        const toDelete = backups.slice(this.MAX_BACKUPS);
        this.logService.info('BackupService', 'Cleaning up old backups', { count: toDelete.length });

        for (const backup of toDelete) {
          await this.deleteBackup(backup.id);
        }
      }
    } catch (error: any) {
      this.logService.error('BackupService', 'Failed to cleanup old backups', error as Error);
    }
  }

  /**
   * Download backup data
   */
  async downloadBackup(backupId: string): Promise<any> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      throw new Error('User must be authenticated to download backup');
    }

    try {
      const dataRef = ref(this.storage, `backups/${userId}/${backupId}.dat`);
      const url = await getDownloadURL(dataRef);
      
      const response = await fetch(url);
      const compressed = await response.text();
      
      const data = this.compression.decompress(compressed);
      return data;
    } catch (error: any) {
      this.logService.error('BackupService', 'Failed to download backup', { error, backupId } as any);
      throw error;
    }
  }

  /**
   * Calculate total storage used by backups
   */
  async calculateStorageUsed(): Promise<number> {
    const backups = await this.listBackups();
    const total = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    this._stats.update(s => ({ ...s, totalStorageUsed: total }));
    return total;
  }

  /**
   * Format size in bytes to human readable
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Get formatted stats
   */
  getFormattedStats() {
    const stats = this._stats();
    return {
      ...stats,
      lastBackupSize: this.formatSize(stats.lastBackupSize),
      totalStorageUsed: this.formatSize(stats.totalStorageUsed)
    };
  }
}

