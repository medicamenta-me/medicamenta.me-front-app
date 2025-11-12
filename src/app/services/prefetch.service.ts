import { Injectable, inject, signal } from '@angular/core';
import { IndexedDBService } from './indexed-db.service';
import { AuthService } from './auth.service';
import { LogService } from './log.service';

export interface PrefetchStats {
  totalPrefetches: number;
  successfulPrefetches: number;
  failedPrefetches: number;
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  lastPrefetchTime: Date | null;
}

export interface UsagePattern {
  userId: string;
  mostAccessedHour: number;
  mostAccessedDay: number;
  frequentlyViewedMedications: string[];
  averageSessionDuration: number;
  lastAccess: Date;
}

/**
 * Prefetch Service
 * 
 * Intelligently prefetches data based on user patterns to improve
 * perceived performance and reduce loading times.
 */
@Injectable({
  providedIn: 'root'
})
export class PrefetchService {
  private readonly indexedDB = inject(IndexedDBService);
  private readonly authService = inject(AuthService);
  private readonly logService = inject(LogService);
  
  private readonly _stats = signal<PrefetchStats>({
    totalPrefetches: 0,
    successfulPrefetches: 0,
    failedPrefetches: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLoadTime: 0,
    lastPrefetchTime: null
  });
  
  readonly stats = this._stats.asReadonly();
  
  private usagePatterns = new Map<string, UsagePattern>();
  private prefetchQueue: string[] = [];
  private isPrefetching = false;

  /**
   * Initialize prefetch service
   */
  async initialize(): Promise<void> {
    this.logService.debug('PrefetchService', 'Initializing...');
    
    // Load usage patterns from storage
    await this.loadUsagePatterns();
    
    // Start monitoring usage
    this.startMonitoring();
  }

  /**
   * Prefetch data based on current time and user patterns
   */
  async prefetchForCurrentTime(): Promise<void> {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) return;

    const pattern = this.usagePatterns.get(userId);
    if (!pattern) {
      this.logService.debug('PrefetchService', 'No usage pattern found for user');
      return;
    }

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();

    // Check if user typically accesses app at this time
    if (this.isLikelyToUseApp(pattern, currentHour, currentDay)) {
      this.logService.info('PrefetchService', 'User likely to use app, prefetching data...');
      await this.prefetchUserData(userId);
    }
  }

  /**
   * Prefetch all user data
   */
  private async prefetchUserData(userId: string): Promise<void> {
    if (this.isPrefetching) {
      this.logService.debug('PrefetchService', 'Already prefetching, skipping...');
      return;
    }

    this.isPrefetching = true;
    const startTime = Date.now();

    try {
      // Prefetch medications
      await this.prefetchMedications(userId);
      
      // Prefetch recent logs
      await this.prefetchRecentLogs(userId);
      
      // Prefetch user profile
      await this.prefetchUserProfile(userId);
      
      // Prefetch stats
      await this.prefetchStats(userId);
      
      // Prefetch insights
      await this.prefetchInsights(userId);

      const loadTime = Date.now() - startTime;
      this.updateStats({
        totalPrefetches: this._stats().totalPrefetches + 1,
        successfulPrefetches: this._stats().successfulPrefetches + 1,
        lastPrefetchTime: new Date(),
        averageLoadTime: this.calculateAverageLoadTime(loadTime)
      });

      this.logService.info('PrefetchService', 'Completed', { durationMs: loadTime });
    } catch (error: any) {
      this.logService.error('PrefetchService', 'Failed', error);
      this.updateStats({
        totalPrefetches: this._stats().totalPrefetches + 1,
        failedPrefetches: this._stats().failedPrefetches + 1
      });
    } finally {
      this.isPrefetching = false;
    }
  }

  /**
   * Prefetch medications for user
   */
  private async prefetchMedications(userId: string): Promise<void> {
    const medications = await this.indexedDB.getByIndex('medications', 'userId', userId);
    if (medications.length > 0) {
      this.logService.debug('PrefetchService', 'Loaded medications', { count: medications.length });
      this.recordCacheHit();
    } else {
      this.recordCacheMiss();
    }
  }

  /**
   * Prefetch recent logs (last 30 days)
   */
  private async prefetchRecentLogs(userId: string): Promise<void> {
    const allLogs = await this.indexedDB.getByIndex('logs', 'userId', userId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    const recentLogs = allLogs.filter(log => {
      const logDate = new Date((log as any).timestamp);
      return logDate >= cutoffDate;
    });

    if (recentLogs.length > 0) {
      this.logService.debug('PrefetchService', 'Loaded recent logs', { count: recentLogs.length });
      this.recordCacheHit();
    } else {
      this.recordCacheMiss();
    }
  }

  /**
   * Prefetch user profile
   */
  private async prefetchUserProfile(userId: string): Promise<void> {
    const user = await this.indexedDB.get('users', userId);
    if (user) {
      this.logService.debug('PrefetchService', 'Loaded user profile');
      this.recordCacheHit();
    } else {
      this.recordCacheMiss();
    }
  }

  /**
   * Prefetch stats
   */
  private async prefetchStats(userId: string): Promise<void> {
    const stats = await this.indexedDB.getByIndex('stats', 'userId', userId);
    if (stats.length > 0) {
      this.logService.debug('PrefetchService', 'Loaded stats', { count: stats.length });
      this.recordCacheHit();
    } else {
      this.recordCacheMiss();
    }
  }

  /**
   * Prefetch insights
   */
  private async prefetchInsights(userId: string): Promise<void> {
    const insights = await this.indexedDB.getByIndex('insights', 'userId', userId);
    if (insights.length > 0) {
      this.logService.debug('PrefetchService', 'Loaded insights', { count: insights.length });
      this.recordCacheHit();
    } else {
      this.recordCacheMiss();
    }
  }

  /**
   * Record user access for pattern learning
   */
  recordAccess(userId: string): void {
    const pattern = this.usagePatterns.get(userId) || this.createDefaultPattern(userId);
    
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Update pattern (simplified - in production, use more sophisticated ML)
    pattern.mostAccessedHour = currentHour;
    pattern.mostAccessedDay = currentDay;
    pattern.lastAccess = new Date();
    
    this.usagePatterns.set(userId, pattern);
    this.saveUsagePatterns();
  }

  /**
   * Record medication view for prefetch prioritization
   */
  recordMedicationView(userId: string, medicationId: string): void {
    const pattern = this.usagePatterns.get(userId) || this.createDefaultPattern(userId);
    
    // Add to frequently viewed (keep top 10)
    if (!pattern.frequentlyViewedMedications.includes(medicationId)) {
      pattern.frequentlyViewedMedications.unshift(medicationId);
      pattern.frequentlyViewedMedications = pattern.frequentlyViewedMedications.slice(0, 10);
    }
    
    this.usagePatterns.set(userId, pattern);
    this.saveUsagePatterns();
  }

  /**
   * Check if user is likely to use app at this time
   */
  private isLikelyToUseApp(pattern: UsagePattern, hour: number, day: number): boolean {
    // User typically uses app within 2 hours of this time
    const hourDiff = Math.abs(pattern.mostAccessedHour - hour);
    const hourMatch = hourDiff <= 2;
    
    // Same day of week
    const dayMatch = pattern.mostAccessedDay === day;
    
    return hourMatch || dayMatch;
  }

  /**
   * Create default usage pattern
   */
  private createDefaultPattern(userId: string): UsagePattern {
    return {
      userId,
      mostAccessedHour: new Date().getHours(),
      mostAccessedDay: new Date().getDay(),
      frequentlyViewedMedications: [],
      averageSessionDuration: 0,
      lastAccess: new Date()
    };
  }

  /**
   * Load usage patterns from IndexedDB
   */
  private async loadUsagePatterns(): Promise<void> {
    try {
      // Note: We'd need to add a 'patterns' store to IndexedDB
      // For now, use localStorage as fallback
      const stored = localStorage.getItem('usage_patterns');
      if (stored) {
        const patterns = JSON.parse(stored);
        this.usagePatterns = new Map(Object.entries(patterns));
        this.logService.debug('PrefetchService', 'Loaded usage patterns', { count: this.usagePatterns.size });
      }
    } catch (error: any) {
      this.logService.error('PrefetchService', 'Failed to load usage patterns', error);
    }
  }

  /**
   * Save usage patterns to storage
   */
  private async saveUsagePatterns(): Promise<void> {
    try {
      const patterns = Object.fromEntries(this.usagePatterns);
      localStorage.setItem('usage_patterns', JSON.stringify(patterns));
    } catch (error: any) {
      this.logService.error('PrefetchService', 'Failed to save usage patterns', error);
    }
  }

  /**
   * Start monitoring usage
   */
  private startMonitoring(): void {
    // Check every hour if we should prefetch
    setInterval(() => {
      const userId = this.authService.currentUser()?.uid;
      if (userId) {
        this.prefetchForCurrentTime();
      }
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Record cache hit
   */
  private recordCacheHit(): void {
    this.updateStats({
      cacheHits: this._stats().cacheHits + 1
    });
  }

  /**
   * Record cache miss
   */
  private recordCacheMiss(): void {
    this.updateStats({
      cacheMisses: this._stats().cacheMisses + 1
    });
  }

  /**
   * Calculate average load time
   */
  private calculateAverageLoadTime(newLoadTime: number): number {
    const currentAvg = this._stats().averageLoadTime;
    const totalPrefetches = this._stats().totalPrefetches;
    
    if (totalPrefetches === 0) return newLoadTime;
    
    return Math.round((currentAvg * totalPrefetches + newLoadTime) / (totalPrefetches + 1));
  }

  /**
   * Update stats
   */
  private updateStats(updates: Partial<PrefetchStats>): void {
    this._stats.update(current => ({ ...current, ...updates }));
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this._stats().cacheHits + this._stats().cacheMisses;
    if (total === 0) return 0;
    return Math.round((this._stats().cacheHits / total) * 100);
  }

  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.usagePatterns.clear();
    localStorage.removeItem('usage_patterns');
    this.logService.info('PrefetchService', 'Cleared all usage patterns');
  }
}

