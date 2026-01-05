import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { LogService } from './log.service';

/**
 * Cache entry structure
 */
export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: Date;
  expiresAt: Date | null;
  priority: CachePriority;
  size: number; // in bytes
  accessCount: number;
  lastAccessed: Date;
}

/**
 * Cache priority levels
 */
export type CachePriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSize: number; // in bytes
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number; // percentage
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxSize: number; // in bytes (default: 50MB)
  maxEntries: number; // maximum number of entries (default: 1000)
  defaultTTL: number; // default time-to-live in milliseconds (default: 1 hour)
  enableAutoCleanup: boolean; // auto cleanup expired entries
  cleanupInterval: number; // cleanup interval in milliseconds (default: 5 minutes)
}

/**
 * Service to manage intelligent caching with prioritization and automatic cleanup
 */
@Injectable({
  providedIn: 'root'
})
export class CacheManagerService implements OnDestroy {
  private readonly logService = inject(LogService);
  
  private cache = new Map<string, CacheEntry>();
  
  private readonly _stats = signal<CacheStats>({
    totalEntries: 0,
    totalSize: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0
  });
  public readonly stats = this._stats.asReadonly();

  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 1000,
    defaultTTL: 60 * 60 * 1000, // 1 hour
    enableAutoCleanup: true,
    cleanupInterval: 5 * 60 * 1000 // 5 minutes
  };

  private cleanupTimer: any;

  constructor() {
    this.loadPersistedCache();
    this.startAutoCleanup();
  }

  /**
   * Set cache entry with optional TTL and priority
   */
  set<T>(
    key: string, 
    data: T, 
    ttl?: number, 
    priority: CachePriority = 'normal'
  ): void {
    const size = this.calculateSize(data);
    const now = new Date();
    const expiresAt = ttl ? new Date(now.getTime() + ttl) : null;

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: now,
      expiresAt,
      priority,
      size,
      accessCount: 0,
      lastAccessed: now
    };

    // Check if we need to evict entries
    if (this.needsEviction(size)) {
      this.evictEntries(size);
    }

    this.cache.set(key, entry);
    this.updateStats();
    this.persistCache();

    this.logService.debug('CacheManagerService', 'Cached', { key, sizeFormatted: this.formatSize(size), priority });
  }

  /**
   * Get cache entry if exists and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss();
      return null;
    }

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.updateStats();
      this.persistCache();
      this.recordMiss();
      this.logService.debug('CacheManagerService', 'Cache expired', { key });
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.cache.set(key, entry);

    this.recordHit();
    this.logService.debug('CacheManagerService', 'Cache hit', { key, accessCount: entry.accessCount });
    
    return entry.data as T;
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.updateStats();
      this.persistCache();
      return false;
    }

    return true;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
      this.persistCache();
      this.logService.debug('CacheManagerService', 'Deleted cache entry', { key });
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.updateStats();
    this.persistCache();
    this.logService.info('CacheManagerService', 'Cache cleared');
  }

  /**
   * Clear cache entries by priority
   */
  clearByPriority(priority: CachePriority): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.priority === priority) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.updateStats();
    this.persistCache();

    this.logService.info('CacheManagerService', 'Cleared entries with priority', { count: keysToDelete.length, priority });
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.updateStats();
      this.persistCache();
      this.logService.info('CacheManagerService', 'Cleared expired entries', { count: keysToDelete.length });
    }
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entry metadata
   */
  getMetadata(key: string): Omit<CacheEntry, 'data'> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const { data, ...metadata } = entry;
    return metadata;
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('medicamenta_cache_config', JSON.stringify(this.config));
    
    // Restart cleanup timer if interval changed
    if (config.cleanupInterval || config.enableAutoCleanup !== undefined) {
      this.stopAutoCleanup();
      this.startAutoCleanup();
    }

    this.logService.info('CacheManagerService', 'Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Check if cache needs eviction
   */
  private needsEviction(newEntrySize: number): boolean {
    const stats = this._stats();
    return (
      stats.totalEntries >= this.config.maxEntries ||
      stats.totalSize + newEntrySize > this.config.maxSize
    );
  }

  /**
   * Evict entries using LRU strategy with priority consideration
   */
  private evictEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by priority (low first) and then by last accessed time (oldest first)
    entries.sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, normal: 1, low: 0 };
      const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime();
    });

    let freedSpace = 0;
    let evictedCount = 0;
    const stats = this._stats();

    for (const [key, entry] of entries) {
      // Don't evict critical items unless absolutely necessary
      if (entry.priority === 'critical' && freedSpace > 0) {
        break;
      }

      this.cache.delete(key);
      freedSpace += entry.size;
      evictedCount++;

      if (
        stats.totalSize - freedSpace + requiredSpace <= this.config.maxSize &&
        stats.totalEntries - evictedCount < this.config.maxEntries
      ) {
        break;
      }
    }

    this.updateStats({ evictions: stats.evictions + evictedCount });
    this.logService.info('CacheManagerService', 'Evicted entries', { count: evictedCount, freedSpace: this.formatSize(freedSpace) });
  }

  /**
   * Calculate approximate size of data in bytes
   */
  private calculateSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * Format size in human-readable format
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    const stats = this._stats();
    const newHits = stats.hits + 1;
    const totalAccesses = newHits + stats.misses;
    const hitRate = (newHits / totalAccesses) * 100;

    this._stats.set({
      ...stats,
      hits: newHits,
      hitRate: parseFloat(hitRate.toFixed(2))
    });
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    const stats = this._stats();
    const newMisses = stats.misses + 1;
    const totalAccesses = stats.hits + newMisses;
    const hitRate = (stats.hits / totalAccesses) * 100;

    this._stats.set({
      ...stats,
      misses: newMisses,
      hitRate: parseFloat(hitRate.toFixed(2))
    });
  }

  /**
   * Update cache statistics
   */
  private updateStats(updates?: Partial<CacheStats>): void {
    let totalSize = 0;
    let totalEntries = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      totalEntries++;
    }

    const currentStats = this._stats();
    this._stats.set({
      ...currentStats,
      totalSize,
      totalEntries,
      ...updates
    });
  }

  /**
   * Start automatic cleanup timer
   */
  private startAutoCleanup(): void {
    if (!this.config.enableAutoCleanup) return;

    this.cleanupTimer = setInterval(() => {
      this.clearExpired();
    }, this.config.cleanupInterval);

    this.logService.debug('CacheManagerService', 'Auto-cleanup started', { interval: this.config.cleanupInterval });
  }

  /**
   * Stop automatic cleanup timer
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logService.debug('CacheManagerService', 'Auto-cleanup stopped');
    }
  }

  /**
   * Persist cache to localStorage (only critical and high priority items)
   */
  private persistCache(): void {
    try {
      const entriesToPersist: [string, CacheEntry][] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (entry.priority === 'critical' || entry.priority === 'high') {
          entriesToPersist.push([key, entry]);
        }
      }

      localStorage.setItem('medicamenta_cache', JSON.stringify(entriesToPersist));
    } catch (error: any) {
      this.logService.error('CacheManagerService', 'Error persisting cache', error);
    }
  }

  /**
   * Load persisted cache from localStorage
   */
  private loadPersistedCache(): void {
    try {
      const stored = localStorage.getItem('medicamenta_cache');
      if (stored) {
        const entries: [string, CacheEntry][] = JSON.parse(stored);
        
        for (const [key, entry] of entries) {
          // Convert date strings back to Date objects
          entry.timestamp = new Date(entry.timestamp);
          entry.lastAccessed = new Date(entry.lastAccessed);
          if (entry.expiresAt) {
            entry.expiresAt = new Date(entry.expiresAt);
          }

          // Only restore if not expired
          if (!entry.expiresAt || entry.expiresAt > new Date()) {
            this.cache.set(key, entry);
          }
        }

        this.updateStats();
        this.logService.debug('CacheManagerService', 'Loaded persisted entries', { count: this.cache.size });
      }

      // Load configuration
      const configStored = localStorage.getItem('medicamenta_cache_config');
      if (configStored) {
        this.config = JSON.parse(configStored);
      }

    } catch (error: any) {
      this.logService.error('CacheManagerService', 'Error loading persisted cache', error);
    }
  }

  /**
   * Get cache entries sorted by priority and access count
   */
  getMostUsedEntries(limit: number = 10): Array<{ key: string; accessCount: number; priority: CachePriority }> {
    const entries = Array.from(this.cache.entries());
    
    entries.sort((a, b) => {
      const priorityOrder = { critical: 3, high: 2, normal: 1, low: 0 };
      const priorityDiff = priorityOrder[b[1].priority] - priorityOrder[a[1].priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return b[1].accessCount - a[1].accessCount;
    });

    return entries.slice(0, limit).map(([key, entry]) => ({
      key,
      accessCount: entry.accessCount,
      priority: entry.priority
    }));
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.stopAutoCleanup();
  }
}

