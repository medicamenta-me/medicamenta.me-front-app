import { Injectable, inject } from '@angular/core';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';

export interface GarbageCollectionStats {
  logsDeleted: number;
  insightsDeleted: number;
  statsDeleted: number;
  totalSpaceFreed: number;
  lastRun: Date;
}

/**
 * Garbage Collection Service
 * 
 * Automatically cleans old data from IndexedDB to maintain performance
 * and prevent storage bloat.
 */
@Injectable({
  providedIn: 'root'
})
export class GarbageCollectionService {
  private readonly indexedDB = inject(IndexedDBService);
  private readonly logService = inject(LogService);
  
  // Configuration
  private readonly MAX_AGE_DAYS = 90; // Delete data older than 90 days
  private readonly RUN_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run every 24 hours
  private readonly STATS_RETENTION_DAYS = 30; // Keep stats for 30 days only
  private readonly INSIGHTS_RETENTION_DAYS = 60; // Keep insights for 60 days
  
  private lastRun: Date | null = null;
  private intervalId: any = null;

  /**
   * Start automatic garbage collection
   */
  start(): void {
    if (this.intervalId) {
      this.logService.info('GarbageCollectionService', 'Already running');
      return;
    }

    this.logService.info('GarbageCollectionService', 'Starting automatic garbage collection');
    
    // Run immediately on start
    this.runGarbageCollection();
    
    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runGarbageCollection();
    }, this.RUN_INTERVAL_MS);
  }

  /**
   * Stop automatic garbage collection
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logService.info('GarbageCollectionService', 'Stopped automatic garbage collection');
    }
  }

  /**
   * Run garbage collection manually
   */
  async runGarbageCollection(): Promise<GarbageCollectionStats> {
    this.logService.info('GarbageCollectionService', 'Running garbage collection');
    
    const stats: GarbageCollectionStats = {
      logsDeleted: 0,
      insightsDeleted: 0,
      statsDeleted: 0,
      totalSpaceFreed: 0,
      lastRun: new Date()
    };

    try {
      // Clean old logs
      stats.logsDeleted = await this.cleanOldLogs();
      
      // Clean old insights
      stats.insightsDeleted = await this.cleanOldInsights();
      
      // Clean old stats
      stats.statsDeleted = await this.cleanOldStats();
      
      // Calculate space freed (approximate)
      stats.totalSpaceFreed = this.estimateSpaceFreed(stats);
      
      this.lastRun = stats.lastRun;
      
      this.logService.info('GarbageCollectionService', 'Completed', stats);
      
      return stats;
    } catch (error: any) {
      this.logService.error('GarbageCollectionService', 'Failed', error as Error);
      throw error;
    }
  }

  /**
   * Clean logs older than MAX_AGE_DAYS
   */
  private async cleanOldLogs(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.MAX_AGE_DAYS);
    const allLogs = await this.indexedDB.getAll<any>('logs');
    
    const oldLogs = allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate < cutoffDate;
    });

    if (oldLogs.length > 0) {
      const idsToDelete = oldLogs.map(log => log.id);
      await this.indexedDB.deleteBatch('logs', idsToDelete);
      this.logService.info('GarbageCollectionService', 'Deleted old logs', { count: oldLogs.length });
    }

    return oldLogs.length;
  }

  /**
   * Clean insights older than INSIGHTS_RETENTION_DAYS
   */
  private async cleanOldInsights(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.INSIGHTS_RETENTION_DAYS);
    const allInsights = await this.indexedDB.getAll<any>('insights');
    
    const oldInsights = allInsights.filter(insight => {
      const insightDate = new Date(insight.timestamp);
      return insightDate < cutoffDate;
    });

    if (oldInsights.length > 0) {
      const idsToDelete = oldInsights.map(insight => insight.id);
      await this.indexedDB.deleteBatch('insights', idsToDelete);
      this.logService.info('GarbageCollectionService', 'Deleted old insights', { count: oldInsights.length });
    }

    return oldInsights.length;
  }

  /**
   * Clean stats older than STATS_RETENTION_DAYS
   */
  private async cleanOldStats(): Promise<number> {
    const cutoffDate = this.getCutoffDate(this.STATS_RETENTION_DAYS);
    const allStats = await this.indexedDB.getAll<any>('stats');
    
    const oldStats = allStats.filter(stat => {
      const statDate = new Date(stat.calculatedAt);
      return statDate < cutoffDate;
    });

    if (oldStats.length > 0) {
      const idsToDelete = oldStats.map(stat => stat.id);
      await this.indexedDB.deleteBatch('stats', idsToDelete);
      this.logService.info('GarbageCollectionService', 'Deleted old stats', { count: oldStats.length });
    }

    return oldStats.length;
  }

  /**
   * Clean expired queue operations (older than 7 days)
   */
  async cleanExpiredQueue(): Promise<number> {
    const cutoffDate = this.getCutoffDate(7);
    const allQueue = await this.indexedDB.getAll<any>('queue');
    
    const expiredOps = allQueue.filter(op => {
      const opDate = new Date(op.timestamp);
      return opDate < cutoffDate;
    });

    if (expiredOps.length > 0) {
      const idsToDelete = expiredOps.map(op => op.id);
      await this.indexedDB.deleteBatch('queue', idsToDelete);
      this.logService.info('GarbageCollectionService', 'Deleted expired queue operations', { count: expiredOps.length });
    }

    return expiredOps.length;
  }

  /**
   * Get cutoff date (days ago from now)
   */
  private getCutoffDate(daysAgo: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  /**
   * Estimate space freed (in bytes)
   * Rough estimate: 1KB per log, 2KB per insight, 5KB per stat
   */
  private estimateSpaceFreed(stats: GarbageCollectionStats): number {
    const logSize = 1024; // 1KB per log
    const insightSize = 2048; // 2KB per insight
    const statSize = 5120; // 5KB per stat
    
    return (
      (stats.logsDeleted * logSize) +
      (stats.insightsDeleted * insightSize) +
      (stats.statsDeleted * statSize)
    );
  }

  /**
   * Get last run timestamp
   */
  getLastRun(): Date | null {
    return this.lastRun;
  }

  /**
   * Check if GC should run
   */
  shouldRun(): boolean {
    if (!this.lastRun) return true;
    
    const timeSinceLastRun = Date.now() - this.lastRun.getTime();
    return timeSinceLastRun >= this.RUN_INTERVAL_MS;
  }

  /**
   * Get configuration
   */
  getConfig() {
    return {
      maxAgeDays: this.MAX_AGE_DAYS,
      statsRetentionDays: this.STATS_RETENTION_DAYS,
      insightsRetentionDays: this.INSIGHTS_RETENTION_DAYS,
      runIntervalMs: this.RUN_INTERVAL_MS,
      isRunning: this.intervalId !== null,
      lastRun: this.lastRun
    };
  }
}

