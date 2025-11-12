import { Injectable, inject, signal, computed } from '@angular/core';
import { Firestore, collection, addDoc } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';

export interface OfflineSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // milliseconds
  operationsPerformed: number;
  syncAttempts: number;
  syncSuccesses: number;
  syncFailures: number;
}

export interface OperationMetric {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'create' | 'update' | 'delete' | 'read';
  collection: string;
  offline: boolean;
  duration: number; // milliseconds
}

export interface SyncMetric {
  id: string;
  userId: string;
  timestamp: Date;
  success: boolean;
  itemsSynced: number;
  duration: number;
  error?: string;
}

export interface AnalyticsSummary {
  totalOfflineTime: number; // milliseconds
  totalSessions: number;
  averageSessionDuration: number;
  totalOperations: number;
  operationsByType: Record<string, number>;
  syncSuccessRate: number;
  conflictRate: number;
  mostUsedCollections: Array<{ collection: string; count: number }>;
}

/**
 * Offline Analytics Service
 * 
 * Tracks and analyzes offline usage patterns and performance.
 * Features:
 * - Track offline sessions
 * - Record operation metrics
 * - Monitor sync performance
 * - Generate usage reports
 * - Export to CSV
 * - Periodic upload to Firestore
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineAnalyticsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly logService = inject(LogService);

  private readonly _currentSession = signal<OfflineSession | null>(null);
  private readonly _summary = signal<AnalyticsSummary>({
    totalOfflineTime: 0,
    totalSessions: 0,
    averageSessionDuration: 0,
    totalOperations: 0,
    operationsByType: {},
    syncSuccessRate: 100,
    conflictRate: 0,
    mostUsedCollections: []
  });

  readonly currentSession = this._currentSession.asReadonly();
  readonly summary = this._summary.asReadonly();

  readonly isOfflineSession = computed(() => this._currentSession() !== null);

  private uploadIntervalId: any = null;
  private readonly STORE_NAME = 'analytics';

  constructor() {
    this.initializeAnalyticsStore();
    this.loadSummary();
    this.startPeriodicUpload();

    // Listen to online/offline events
    window.addEventListener('offline', () => this.startOfflineSession());
    window.addEventListener('online', () => this.endOfflineSession());

    // Start session if already offline
    if (!navigator.onLine) {
      this.startOfflineSession();
    }
  }

  /**
   * Initialize analytics store in IndexedDB
   */
  private initializeAnalyticsStore(): void {
    // Analytics store should already exist from the config
    // Wait for IndexedDB to be ready automatically
  }

  /**
   * Start tracking an offline session
   */
  private startOfflineSession(): void {
    if (this._currentSession()) {
      this.logService.debug('OfflineAnalyticsService', 'Session already active');
      return;
    }

    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    const session: OfflineSession = {
      id: `session_${Date.now()}`,
      userId,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      operationsPerformed: 0,
      syncAttempts: 0,
      syncSuccesses: 0,
      syncFailures: 0
    };

    this._currentSession.set(session);
    this.logService.info('OfflineAnalyticsService', 'Started offline session', { sessionId: session.id });
  }

  /**
   * End current offline session
   */
  private async endOfflineSession(): Promise<void> {
    const session = this._currentSession();
    if (!session) {
      return;
    }

    session.endTime = new Date();
    session.duration = session.endTime.getTime() - session.startTime.getTime();

    // Save session
    await this.saveSession(session);

    // Update summary
    this.updateSummary();

    this._currentSession.set(null);
    this.logService.info('OfflineAnalyticsService', 'Ended offline session', { sessionId: session.id, durationMs: session.duration });
  }

  /**
   * Record an operation
   */
  async recordOperation(
    type: 'create' | 'update' | 'delete' | 'read',
    collection: string,
    duration: number = 0
  ): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    const metric: OperationMetric = {
      id: `op_${Date.now()}_${Math.random()}`,
      userId,
      timestamp: new Date(),
      type,
      collection,
      offline: !navigator.onLine,
      duration
    };

    try {
      await this.indexedDB.put('analytics', metric);

      // Update current session
      const session = this._currentSession();
      if (session) {
        session.operationsPerformed++;
      }

      // Update summary periodically (every 10 operations)
      if (Math.random() < 0.1) {
        this.updateSummary();
      }
    } catch (error: any) {
      this.logService.error('OfflineAnalyticsService', 'Failed to record operation', error);
    }
  }

  /**
   * Record a sync attempt
   */
  async recordSyncAttempt(
    success: boolean,
    itemsSynced: number,
    duration: number,
    error?: string
  ): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    const metric: SyncMetric = {
      id: `sync_${Date.now()}`,
      userId,
      timestamp: new Date(),
      success,
      itemsSynced,
      duration,
      error
    };

    try {
      await this.indexedDB.put('analytics', metric);

      // Update current session
      const session = this._currentSession();
      if (session) {
        session.syncAttempts++;
        if (success) {
          session.syncSuccesses++;
        } else {
          session.syncFailures++;
        }
      }

      this.updateSummary();
    } catch (error: any) {
      this.logService.error('OfflineAnalyticsService', 'Failed to record sync', error);
    }
  }

  /**
   * Save session to IndexedDB
   */
  private async saveSession(session: OfflineSession): Promise<void> {
    try {
      await this.indexedDB.put('analytics', session);
    } catch (error: any) {
      this.logService.error('OfflineAnalyticsService', 'Failed to save session', error);
    }
  }

  /**
   * Update analytics summary
   */
  private async updateSummary(): Promise<void> {
    try {
      const userId = this.auth.currentUser()?.uid;
      if (!userId) {
        return;
      }

      // Get all analytics data
      const allData = await this.indexedDB.getByIndex<any>('analytics', 'userId', userId);

      const sessions = allData.filter((d: any) => d.id?.startsWith('session_')) as OfflineSession[];
      const operations = allData.filter((d: any) => d.id?.startsWith('op_')) as OperationMetric[];
      const syncs = allData.filter((d: any) => d.id?.startsWith('sync_')) as SyncMetric[];

      // Calculate summary
      const totalOfflineTime = sessions.reduce((sum, s) => sum + s.duration, 0);
      const totalSessions = sessions.length;
      const averageSessionDuration = totalSessions > 0 ? totalOfflineTime / totalSessions : 0;
      const totalOperations = operations.length;

      // Operations by type
      const operationsByType: Record<string, number> = {};
      operations.forEach(op => {
        operationsByType[op.type] = (operationsByType[op.type] || 0) + 1;
      });

      // Sync success rate
      const totalSyncs = syncs.length;
      const successfulSyncs = syncs.filter(s => s.success).length;
      const syncSuccessRate = totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100;

      // Most used collections
      const collectionCounts: Record<string, number> = {};
      operations.forEach(op => {
        collectionCounts[op.collection] = (collectionCounts[op.collection] || 0) + 1;
      });

      const mostUsedCollections = Object.entries(collectionCounts)
        .map(([collection, count]) => ({ collection, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Conflict rate (estimate based on sync failures)
      const conflictRate = totalSyncs > 0 ? ((totalSyncs - successfulSyncs) / totalSyncs) * 100 : 0;

      const summary: AnalyticsSummary = {
        totalOfflineTime,
        totalSessions,
        averageSessionDuration,
        totalOperations,
        operationsByType,
        syncSuccessRate,
        conflictRate,
        mostUsedCollections
      };

      this._summary.set(summary);
      this.saveSummary();

    } catch (error: any) {
      this.logService.error('OfflineAnalyticsService', 'Failed to update summary', error);
    }
  }

  /**
   * Load summary from localStorage
   */
  private loadSummary(): void {
    try {
      const stored = localStorage.getItem('medicamenta_analytics_summary');
      if (stored) {
        const summary = JSON.parse(stored);
        this._summary.set(summary);
      }
    } catch (error: any) {
      this.logService.error('OfflineAnalyticsService', 'Failed to load summary', error);
    }
  }

  /**
   * Save summary to localStorage
   */
  private saveSummary(): void {
    try {
      localStorage.setItem('medicamenta_analytics_summary', JSON.stringify(this._summary()));
    } catch (error: any) {
      this.logService.error('OfflineAnalyticsService', 'Failed to save summary', error);
    }
  }

  /**
   * Start periodic upload to Firestore (every 24h)
   */
  private startPeriodicUpload(): void {
    if (this.uploadIntervalId) {
      return;
    }

    // Upload every 24 hours
    this.uploadIntervalId = setInterval(() => {
      this.uploadToFirestore();
    }, 24 * 60 * 60 * 1000);

    this.logService.debug('OfflineAnalyticsService', 'Periodic upload started (24 hours)');
  }

  /**
   * Upload analytics to Firestore
   */
  async uploadToFirestore(): Promise<void> {
    if (!navigator.onLine) {
      this.logService.debug('OfflineAnalyticsService', 'Device offline, skipping upload');
      return;
    }

    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    try {
      this.logService.debug('OfflineAnalyticsService', 'Uploading analytics to Firestore...');

      const summary = this._summary();
      const analyticsRef = collection(this.firestore, 'analytics');
      
      await addDoc(analyticsRef, {
        userId,
        timestamp: new Date().toISOString(),
        ...summary
      });

      this.logService.info('OfflineAnalyticsService', 'Upload completed');
    } catch (error: any) {
      this.logService.error('OfflineAnalyticsService', 'Upload failed', error);
    }
  }

  /**
   * Export analytics to CSV
   */
  async exportToCSV(): Promise<string> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      throw new Error('User must be authenticated');
    }

    const allData = await this.indexedDB.getByIndex<any>('analytics', 'userId', userId);

    // Sessions CSV
    const sessions = allData.filter((d: any) => d.id?.startsWith('session_')) as OfflineSession[];
    let csv = 'Type,ID,Start Time,End Time,Duration (ms),Operations,Sync Attempts,Sync Successes,Sync Failures\n';
    
    sessions.forEach(s => {
      csv += `Session,${s.id},${s.startTime.toISOString()},${s.endTime?.toISOString() || ''},${s.duration},${s.operationsPerformed},${s.syncAttempts},${s.syncSuccesses},${s.syncFailures}\n`;
    });

    csv += '\n';

    // Operations CSV
    const operations = allData.filter((d: any) => d.id?.startsWith('op_')) as OperationMetric[];
    csv += 'Type,ID,Timestamp,Operation Type,Collection,Offline,Duration (ms)\n';
    
    operations.forEach(op => {
      csv += `Operation,${op.id},${op.timestamp.toISOString()},${op.type},${op.collection},${op.offline},${op.duration}\n`;
    });

    csv += '\n';

    // Syncs CSV
    const syncs = allData.filter((d: any) => d.id?.startsWith('sync_')) as SyncMetric[];
    csv += 'Type,ID,Timestamp,Success,Items Synced,Duration (ms),Error\n';
    
    syncs.forEach(sync => {
      csv += `Sync,${sync.id},${sync.timestamp.toISOString()},${sync.success},${sync.itemsSynced},${sync.duration},${sync.error || ''}\n`;
    });

    return csv;
  }

  /**
   * Download CSV file
   */
  async downloadCSV(): Promise<void> {
    const csv = await this.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medicamenta_analytics_${Date.now()}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Clear all analytics data
   */
  async clearAnalytics(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return;
    }

    this.logService.debug('OfflineAnalyticsService', 'Clearing analytics data...');

    const allData = await this.indexedDB.getByIndex<any>('analytics', 'userId', userId);
    const keys = allData.map((d: any) => d.id);

    if (keys.length > 0) {
      await this.indexedDB.deleteBatch('analytics', keys);
    }

    // Reset summary
    this._summary.set({
      totalOfflineTime: 0,
      totalSessions: 0,
      averageSessionDuration: 0,
      totalOperations: 0,
      operationsByType: {},
      syncSuccessRate: 100,
      conflictRate: 0,
      mostUsedCollections: []
    });

    this.saveSummary();
    this.logService.info('OfflineAnalyticsService', 'Analytics cleared');
  }

  /**
   * Get formatted summary
   */
  getFormattedSummary() {
    const summary = this._summary();
    
    return {
      totalOfflineTime: this.formatDuration(summary.totalOfflineTime),
      totalSessions: summary.totalSessions,
      averageSessionDuration: this.formatDuration(summary.averageSessionDuration),
      totalOperations: summary.totalOperations,
      operationsByType: summary.operationsByType,
      syncSuccessRate: `${summary.syncSuccessRate.toFixed(1)}%`,
      conflictRate: `${summary.conflictRate.toFixed(1)}%`,
      mostUsedCollections: summary.mostUsedCollections
    };
  }

  /**
   * Format duration in milliseconds
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

