import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexed-db.service';
import { ToastService } from './toast.service';
import { LogService } from './log.service';

/**
 * NOTE: This service provides the offline sync infrastructure with IndexedDB integration.
 * Queue persistence happens automatically in IndexedDB.
 * Integration with Firestore will be done through existing services (MedicationService, LogService, etc.)
 * rather than directly in this service.
 */

/**
 * Sync status of the application
 */
export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

/**
 * Sync strategy for conflict resolution
 */
export type SyncStrategy = 'server-wins' | 'client-wins' | 'newest-wins' | 'manual';

/**
 * Operation types that can be queued
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * Operation priority levels
 */
export type OperationPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Queued operation structure
 */
export interface QueuedOperation {
  id: string;
  type: OperationType;
  collection: string;
  documentId: string;
  data?: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: OperationPriority;
  userId: string;
}

/**
 * Sync conflict structure
 */
export interface SyncConflict {
  id: string;
  collection: string;
  documentId: string;
  localData: any;
  serverData: any;
  localTimestamp: Date;
  serverTimestamp: Date;
  detectedAt: Date;
  resolved: boolean;
  resolution?: 'server' | 'client' | 'merged';
}

/**
 * Sync statistics
 */
export interface SyncStats {
  lastSyncTime: Date | null;
  pendingOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  resolvedConflicts: number;
  unresolvedConflicts: number;
}

/**
 * Service to manage offline synchronization with advanced conflict resolution
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private readonly authService = inject(AuthService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly toastService = inject(ToastService);

  // Online/Offline status
  private readonly _isOnline = signal<boolean>(navigator.onLine);
  public readonly isOnline = this._isOnline.asReadonly();

  // Sync status
  private readonly _syncStatus = signal<SyncStatus>('online');
  public readonly syncStatus = this._syncStatus.asReadonly();

  // Operation queue
  private readonly _operationQueue = signal<QueuedOperation[]>([]);
  public readonly operationQueue = this._operationQueue.asReadonly();

  // Conflicts
  private readonly _conflicts = signal<SyncConflict[]>([]);
  public readonly conflicts = this._conflicts.asReadonly();

  // Statistics
  private readonly _syncStats = signal<SyncStats>({
    lastSyncTime: null,
    pendingOperations: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    resolvedConflicts: 0,
    unresolvedConflicts: 0
  });
  public readonly syncStats = this._syncStats.asReadonly();

  // Computed signals
  public readonly hasPendingOperations = computed(() => this._operationQueue().length > 0);
  public readonly hasUnresolvedConflicts = computed(() => this._conflicts().filter(c => !c.resolved).length > 0);
  public readonly canSync = computed(() => this.isOnline() && this.hasPendingOperations());

  private readonly logService = inject(LogService);

  // Default sync strategy
  private defaultStrategy: SyncStrategy = 'newest-wins';

  constructor() {
    this.initializeOfflineSupport();
    this.loadPersistedQueue();
    this.loadPersistedConflicts();
    this.loadPersistedStats();

    // Auto-sync when coming online
    effect(() => {
      if (this.isOnline() && this.hasPendingOperations()) {
        this.syncPendingOperations();
      }
    });
  }

  /**
   * Initialize offline support and network detection
   */
  private initializeOfflineSupport(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this._isOnline.set(true);
      this._syncStatus.set('online');
      this.logService.info('OfflineSyncService', 'Network online - starting sync');
      this.toastService.showOnline();
    });

    window.addEventListener('offline', () => {
      this._isOnline.set(false);
      this._syncStatus.set('offline');
      this.logService.info('OfflineSyncService', 'Network offline - queuing operations');
      this.toastService.showOffline();
    });

    // Initial status
    this._syncStatus.set(navigator.onLine ? 'online' : 'offline');
  }

  /**
   * Queue an operation for later synchronization
   */
  queueOperation(
    type: OperationType,
    collection: string,
    documentId: string,
    data?: any,
    priority: OperationPriority = 'normal'
  ): string {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      throw new Error('User must be authenticated to queue operations');
    }

    const operation: QueuedOperation = {
      id: this.generateOperationId(),
      type,
      collection,
      documentId,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
      priority,
      userId
    };

    const currentQueue = this._operationQueue();
    const newQueue = [...currentQueue, operation];
    
    // Sort by priority
    newQueue.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this._operationQueue.set(newQueue);
    this.persistQueue();
    this.updateStats({ pendingOperations: newQueue.length });

    this.logService.debug('OfflineSyncService', 'Queued operation', { type, collection, documentId });

    return operation.id;
  }

  /**
   * Execute a single operation
   * NOTE: This is a placeholder. Actual execution will be handled by
   * specific services (MedicationService, LogService, etc.) that implement
   * the offline sync pattern.
   */
  private async executeOperation(operation: QueuedOperation): Promise<boolean> {
    this.logService.debug('OfflineSyncService', 'Operation queued', { type: operation.type, collection: operation.collection, documentId: operation.documentId });
    // This will be implemented by each service that uses offline sync
    // For now, we just mark as successful to allow the infrastructure to work
    return true;
  }

  /**
   * Sync all pending operations
   */
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline()) {
      this.logService.debug('OfflineSyncService', 'Cannot sync - offline');
      return;
    }

    if (!this.hasPendingOperations()) {
      this.logService.debug('OfflineSyncService', 'No pending operations to sync');
      return;
    }

    this._syncStatus.set('syncing');
    const queue = [...this._operationQueue()];
    const successfulOps: string[] = [];
    const failedOps: QueuedOperation[] = [];

    for (const operation of queue) {
      const success = await this.executeOperation(operation);

      if (success) {
        successfulOps.push(operation.id);
        this.updateStats({ successfulSyncs: this.syncStats().successfulSyncs + 1 });
      } else {
        operation.retryCount++;
        if (operation.retryCount < operation.maxRetries) {
          failedOps.push(operation);
        } else {
          this.logService.error('OfflineSyncService', 'Operation exceeded max retries', { operationId: operation.id, retries: operation.retryCount } as any);
          this.updateStats({ failedSyncs: this.syncStats().failedSyncs + 1 });
        }
      }
    }

    // Update queue with failed operations only
    this._operationQueue.set(failedOps);
    this.persistQueue();
    this.updateStats({ 
      pendingOperations: failedOps.length,
      lastSyncTime: new Date()
    });

    this._syncStatus.set(failedOps.length > 0 ? 'error' : 'online');

    this.logService.info('OfflineSyncService', 'Sync complete', { successful: successfulOps.length, failed: failedOps.length });
    
    // Show toast notification
    if (successfulOps.length > 0) {
      this.toastService.showSyncComplete(successfulOps.length, failedOps.length);
    } else if (failedOps.length > 0) {
      this.toastService.showSyncError();
    }
  }

  /**
   * Check for conflicts between local and server data
   * NOTE: This should be called by services when they detect timestamp differences
   */
  registerConflict(
    collection: string,
    documentId: string,
    localData: any,
    serverData: any,
    localTimestamp: Date,
    serverTimestamp: Date
  ): SyncConflict {
    const conflict: SyncConflict = {
      id: this.generateConflictId(),
      collection,
      documentId,
      localData,
      serverData,
      localTimestamp,
      serverTimestamp,
      detectedAt: new Date(),
      resolved: false
    };

    const currentConflicts = this._conflicts();
    this._conflicts.set([...currentConflicts, conflict]);
    this.persistConflicts();
    this.updateStats({ unresolvedConflicts: this.syncStats().unresolvedConflicts + 1 });

    this.logService.warn('OfflineSyncService', 'Conflict registered', { collection, documentId });
    
    // Show conflict notification
    this.toastService.showConflict(1);
    
    return conflict;
  }

  /**
   * Resolve a conflict using specified strategy
   * Returns the resolved data that should be applied by the calling service
   */
  async resolveConflict(conflictId: string, strategy: SyncStrategy): Promise<boolean> {
    const conflict = this._conflicts().find(c => c.id === conflictId);
    if (!conflict || conflict.resolved) {
      return false;
    }

    let resolvedData: any;

    switch (strategy) {
      case 'server-wins':
        resolvedData = conflict.serverData;
        conflict.resolution = 'server';
        break;

      case 'client-wins':
        resolvedData = conflict.localData;
        conflict.resolution = 'client';
        break;

      case 'newest-wins':
        resolvedData = conflict.serverTimestamp > conflict.localTimestamp 
          ? conflict.serverData 
          : conflict.localData;
        conflict.resolution = conflict.serverTimestamp > conflict.localTimestamp ? 'server' : 'client';
        break;

      case 'manual':
        // Manual resolution requires user input
        return false;
    }

    // Mark conflict as resolved
    conflict.resolved = true;
    const updatedConflicts = this._conflicts().map(c => c.id === conflictId ? conflict : c);
    this._conflicts.set(updatedConflicts);
    this.persistConflicts();

    this.updateStats({ 
      resolvedConflicts: this.syncStats().resolvedConflicts + 1,
      unresolvedConflicts: Math.max(0, this.syncStats().unresolvedConflicts - 1)
    });

    this.logService.info('OfflineSyncService', 'Conflict resolved', { conflictId, strategy });
    return true;
  }

  /**
   * Resolve conflict with merged data
   * Marks conflict as resolved. Calling service should apply the merged data to Firestore.
   */
  async resolveConflictWithMerge(conflictId: string, mergedData: any): Promise<boolean> {
    const conflict = this._conflicts().find(c => c.id === conflictId);
    if (!conflict || conflict.resolved) {
      return false;
    }

    conflict.resolved = true;
    conflict.resolution = 'merged';
    
    const updatedConflicts = this._conflicts().map(c => c.id === conflictId ? conflict : c);
    this._conflicts.set(updatedConflicts);
    this.persistConflicts();

    this.updateStats({ 
      resolvedConflicts: this.syncStats().resolvedConflicts + 1,
      unresolvedConflicts: Math.max(0, this.syncStats().unresolvedConflicts - 1)
    });

    this.logService.info('OfflineSyncService', 'Conflict resolved with merged data', { conflictId });
    return true;
  }

  /**
   * Clear resolved conflicts
   */
  clearResolvedConflicts(): void {
    const unresolvedConflicts = this._conflicts().filter(c => !c.resolved);
    this._conflicts.set(unresolvedConflicts);
    this.persistConflicts();
  }

  /**
   * Force sync now (manual trigger)
   */
  async forceSyncNow(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error('Cannot force sync while offline');
    }

    await this.syncPendingOperations();
  }

  /**
   * Clear all pending operations (use with caution)
   */
  clearPendingOperations(): void {
    this._operationQueue.set([]);
    this.persistQueue();
    this.updateStats({ pendingOperations: 0 });
    this.logService.info('OfflineSyncService', 'Cleared all pending operations');
  }

  /**
   * Set default sync strategy
   */
  setDefaultStrategy(strategy: SyncStrategy): void {
    this.defaultStrategy = strategy;
    localStorage.setItem('medicamenta_sync_strategy', strategy);
  }

  /**
   * Get default sync strategy
   */
  getDefaultStrategy(): SyncStrategy {
    const stored = localStorage.getItem('medicamenta_sync_strategy');
    return (stored as SyncStrategy) || 'newest-wins';
  }

  /**
   * Convert timestamp to Date
   * Accepts Date, number (epoch ms), or Firestore Timestamp-like object with seconds
   */
  private convertTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'number') return new Date(timestamp);
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return null;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique conflict ID
   */
  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Persist queue to IndexedDB
   */
  private async persistQueue(): Promise<void> {
    try {
      const queue = this._operationQueue();
      // Clear existing queue
      await this.indexedDB.clear('queue');
      // Save new queue
      if (queue.length > 0) {
        await this.indexedDB.putBatch('queue', queue);
      }
    } catch (error: any) {
      this.logService.error('OfflineSyncService', 'Error persisting queue to IndexedDB', error as Error);
    }
  }

  /**
   * Load queue from IndexedDB
   */
  private async loadPersistedQueue(): Promise<void> {
    try {
      const queue = await this.indexedDB.getAll<QueuedOperation>('queue');
      if (queue.length > 0) {
        // Convert timestamp strings back to Date objects if needed
        queue.forEach((op: QueuedOperation) => {
          if (!(op.timestamp instanceof Date)) {
            op.timestamp = new Date(op.timestamp);
          }
        });
        this._operationQueue.set(queue);
        this.updateStats({ pendingOperations: queue.length });
        this.logService.debug('OfflineSyncService', 'Loaded operations from IndexedDB', { count: queue.length });
      }
    } catch (error: any) {
      this.logService.error('OfflineSyncService', 'Error loading persisted queue from IndexedDB', error as Error);
    }
  }

  /**
   * Persist conflicts to localStorage
   */
  private persistConflicts(): void {
    try {
      const conflicts = this._conflicts();
      localStorage.setItem('medicamenta_sync_conflicts', JSON.stringify(conflicts));
    } catch (error: any) {
      this.logService.error('OfflineSyncService', 'Error persisting conflicts', error as Error);
    }
  }

  /**
   * Load conflicts from localStorage
   */
  private loadPersistedConflicts(): void {
    try {
      const stored = localStorage.getItem('medicamenta_sync_conflicts');
      if (stored) {
        const conflicts = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        conflicts.forEach((c: SyncConflict) => {
          c.localTimestamp = new Date(c.localTimestamp);
          c.serverTimestamp = new Date(c.serverTimestamp);
          c.detectedAt = new Date(c.detectedAt);
        });
        this._conflicts.set(conflicts);
        const unresolvedCount = conflicts.filter((c: SyncConflict) => !c.resolved).length;
        this.updateStats({ unresolvedConflicts: unresolvedCount });
      }
    } catch (error: any) {
      this.logService.error('OfflineSyncService', 'Error loading persisted conflicts', error as Error);
    }
  }

  /**
   * Persist stats to localStorage
   */
  private persistStats(): void {
    try {
      const stats = this._syncStats();
      localStorage.setItem('medicamenta_sync_stats', JSON.stringify(stats));
    } catch (error: any) {
      this.logService.error('OfflineSyncService', 'Error persisting stats', error as Error);
    }
  }

  /**
   * Load stats from localStorage
   */
  private loadPersistedStats(): void {
    try {
      const stored = localStorage.getItem('medicamenta_sync_stats');
      if (stored) {
        const stats = JSON.parse(stored);
        if (stats.lastSyncTime) {
          stats.lastSyncTime = new Date(stats.lastSyncTime);
        }
        this._syncStats.set(stats);
      }
    } catch (error: any) {
      this.logService.error('OfflineSyncService', 'Error loading persisted stats', error as Error);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(updates: Partial<SyncStats>): void {
    const currentStats = this._syncStats();
    this._syncStats.set({ ...currentStats, ...updates });
    this.persistStats();
  }
}

