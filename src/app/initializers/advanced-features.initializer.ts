import { inject } from '@angular/core';
import { BackupService } from '../services/backup.service';
import { MultiDeviceSyncService } from '../services/multi-device-sync.service';
import { ExtendedOfflineModeService } from '../services/extended-offline-mode.service';
import { OfflineAnalyticsService } from '../services/offline-analytics.service';

/**
 * Advanced Features Initializer
 * 
 * Initializes advanced offline features on app bootstrap:
 * - Backup Service (auto-backup)
 * - Multi-Device Sync (real-time sync)
 * - Extended Offline Mode (persistent settings)
 * - Offline Analytics (tracking)
 */
export function initializeAdvancedFeatures() {
  return () => {
    const backupService = inject(BackupService);
    const syncService = inject(MultiDeviceSyncService);
    const offlineMode = inject(ExtendedOfflineModeService);
    const analytics = inject(OfflineAnalyticsService);

    console.log('[Advanced Features] Initializing...');

    // Start automatic backup
    backupService.startAutoBackup();

    // Start multi-device sync if user was logged in
    // (will be called again on login)
    syncService.start();

    // Extended offline mode and analytics are auto-initialized in constructors

    console.log('[Advanced Features] Initialization complete');

    return Promise.resolve();
  };
}
