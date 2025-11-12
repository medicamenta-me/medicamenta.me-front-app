import { Injectable, inject, signal } from '@angular/core';
import { Firestore, doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs, Unsubscribe } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { IndexedDBService } from './indexed-db.service';
import { LogService } from './log.service';
import { v4 as uuidv4 } from 'uuid';

export interface SyncEvent {
  id: string;
  userId: string;
  deviceId: string;
  timestamp: Date;
  operation: 'create' | 'update' | 'delete';
  store: string;
  itemId: string;
  data?: any;
  syncToken: string;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  name: string;
  lastSeen: Date;
  platform: string;
  isCurrentDevice: boolean;
}

export interface SyncStats {
  eventsReceived: number;
  eventsSent: number;
  conflicts: number;
  lastSyncTime: Date | null;
  connectedDevices: number;
}

/**
 * Multi-Device Sync Service
 * 
 * Handles real-time synchronization of data across multiple devices.
 * Features:
 * - Firestore real-time listeners
 * - Last-write-wins conflict resolution
 * - Device identification and tracking
 * - Sync token to prevent loops
 * - Broadcast changes to other devices
 */
@Injectable({
  providedIn: 'root'
})
export class MultiDeviceSyncService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly logService = inject(LogService);

  private readonly _isActive = signal(false);
  private readonly _stats = signal<SyncStats>({
    eventsReceived: 0,
    eventsSent: 0,
    conflicts: 0,
    lastSyncTime: null,
    connectedDevices: 0
  });
  private readonly _devices = signal<DeviceInfo[]>([]);

  readonly isActive = this._isActive.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly devices = this._devices.asReadonly();

  private deviceId: string;
  private syncToken: string = '';
  private unsubscribers: Unsubscribe[] = [];
  private heartbeatIntervalId: any = null;

  constructor() {
    // Generate or load device ID
    this.deviceId = this.getOrCreateDeviceId();
    this.logService.debug('MultiDeviceSyncService', 'Device ID initialized', { deviceId: this.deviceId });
  }

  /**
   * Start multi-device sync
   */
  async start(): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      this.logService.error('MultiDeviceSyncService', 'No user logged in', new Error('Cannot start sync without user'));
      return;
    }

    if (this._isActive()) {
      this.logService.debug('MultiDeviceSyncService', 'Already active');
      return;
    }

    this.logService.info('MultiDeviceSyncService', 'Starting sync...');

    try {
      // Register this device
      await this.registerDevice(userId);

      // Start listening to sync events
      this.startSyncListener(userId);

      // Start heartbeat
      this.startHeartbeat(userId);

      // Update device list
      await this.updateDeviceList(userId);

      this._isActive.set(true);
      this.logService.info('MultiDeviceSyncService', 'Sync started successfully');
    } catch (error: any) {
      this.logService.error('MultiDeviceSyncService', 'Failed to start', error as Error);
    }
  }

  /**
   * Stop multi-device sync
   */
  stop(): void {
    this.logService.info('MultiDeviceSyncService', 'Stopping sync...');

    // Unsubscribe from all listeners
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];

    // Stop heartbeat
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }

    this._isActive.set(false);
    this.logService.info('MultiDeviceSyncService', 'Sync stopped');
  }

  /**
   * Broadcast a sync event to other devices
   */
  async broadcastChange(
    operation: 'create' | 'update' | 'delete',
    store: string,
    itemId: string,
    data?: any
  ): Promise<void> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId || !this._isActive()) {
      return;
    }

    try {
      // Generate new sync token for this event
      const syncToken = uuidv4();
      this.syncToken = syncToken;

      const event: SyncEvent = {
        id: uuidv4(),
        userId,
        deviceId: this.deviceId,
        timestamp: new Date(),
        operation,
        store,
        itemId,
        data,
        syncToken
      };

      // Write to Firestore
      const eventRef = doc(this.firestore, `sync_events/${event.id}`);
      await setDoc(eventRef, {
        ...event,
        timestamp: new Date().toISOString()
      });

      this._stats.update(s => ({
        ...s,
        eventsSent: s.eventsSent + 1,
        lastSyncTime: new Date()
      }));

      this.logService.debug('MultiDeviceSyncService', 'Broadcasted change', { operation, store, itemId });
    } catch (error: any) {
      this.logService.error('MultiDeviceSyncService', 'Failed to broadcast change', error as Error);
    }
  }

  /**
   * Start listening to sync events from other devices
   */
  private startSyncListener(userId: string): void {
    const eventsRef = collection(this.firestore, 'sync_events');
    const q = query(
      eventsRef,
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const event = change.doc.data() as any;
          
          // Convert timestamp string to Date
          event.timestamp = new Date(event.timestamp);
          
          this.handleSyncEvent(event);
        }
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  /**
   * Handle incoming sync event
   */
  private async handleSyncEvent(event: SyncEvent): Promise<void> {
    // Ignore events from this device
    if (event.deviceId === this.deviceId) {
      return;
    }

    // Ignore events with our current sync token (prevents loops)
    if (event.syncToken === this.syncToken) {
      return;
    }

    this.logService.debug('MultiDeviceSyncService', 'Received sync event', { operation: event.operation, store: event.store, itemId: event.itemId, deviceId: event.deviceId });

    try {
      switch (event.operation) {
        case 'create':
        case 'update':
          await this.handleCreateOrUpdate(event);
          break;
        case 'delete':
          await this.handleDelete(event);
          break;
      }

      this._stats.update(s => ({
        ...s,
        eventsReceived: s.eventsReceived + 1,
        lastSyncTime: new Date()
      }));
    } catch (error: any) {
      this.logService.error('MultiDeviceSyncService', 'Failed to handle event', error as Error);
    }
  }

  /**
   * Handle create/update event
   */
  private async handleCreateOrUpdate(event: SyncEvent): Promise<void> {
    if (!event.data) {
      this.logService.warn('MultiDeviceSyncService', 'No data in create/update event');
      return;
    }

    // Check if item exists locally
    const existing = await this.indexedDB.get(event.store, event.itemId);

    if (existing) {
      // Conflict resolution: last-write-wins
      const existingTimestamp = (existing as any).lastModified || (existing as any).createdAt || 0;
      const eventTimestamp = event.data.lastModified || event.data.createdAt || 0;

      if (eventTimestamp <= existingTimestamp) {
        this.logService.debug('MultiDeviceSyncService', 'Local version is newer, ignoring event');
        this._stats.update(s => ({ ...s, conflicts: s.conflicts + 1 }));
        return;
      }
    }

    // Apply the change
    await this.indexedDB.put(event.store, event.data);
    this.logService.debug('MultiDeviceSyncService', 'Applied sync event', { operation: event.operation, store: event.store, itemId: event.itemId });
  }

  /**
   * Handle delete event
   */
  private async handleDelete(event: SyncEvent): Promise<void> {
    await this.indexedDB.delete(event.store, event.itemId);
    this.logService.debug('MultiDeviceSyncService', 'Applied delete', { store: event.store, itemId: event.itemId });
  }

  /**
   * Register this device in Firestore
   */
  private async registerDevice(userId: string): Promise<void> {
    const deviceRef = doc(this.firestore, `devices/${this.deviceId}`);
    
    const deviceInfo = {
      id: this.deviceId,
      userId,
      name: this.getDeviceName(),
      lastSeen: new Date().toISOString(),
      platform: this.getPlatform()
    };

    await setDoc(deviceRef, deviceInfo, { merge: true });
    this.logService.debug('MultiDeviceSyncService', 'Device registered');
  }

  /**
   * Update device list
   */
  private async updateDeviceList(userId: string): Promise<void> {
    try {
      const devicesRef = collection(this.firestore, 'devices');
      const q = query(devicesRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const devices: DeviceInfo[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as any;
        devices.push({
          id: data.id,
          userId: data.userId,
          name: data.name,
          lastSeen: new Date(data.lastSeen),
          platform: data.platform,
          isCurrentDevice: data.id === this.deviceId
        });
      });

      // Filter out stale devices (not seen in last 7 days)
      const now = Date.now();
      const activeDevices = devices.filter(d => {
        const daysSinceLastSeen = (now - d.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastSeen < 7;
      });

      this._devices.set(activeDevices);
      this._stats.update(s => ({ ...s, connectedDevices: activeDevices.length }));

      this.logService.debug('MultiDeviceSyncService', 'Active devices found', { count: activeDevices.length });
    } catch (error: any) {
      this.logService.error('MultiDeviceSyncService', 'Failed to update device list', error as Error);
    }
  }

  /**
   * Start heartbeat to keep device alive
   */
  private startHeartbeat(userId: string): void {
    // Send heartbeat every 5 minutes
    this.heartbeatIntervalId = setInterval(() => {
      this.registerDevice(userId);
      this.updateDeviceList(userId);
    }, 5 * 60 * 1000);
  }

  /**
   * Get or create device ID
   */
  private getOrCreateDeviceId(): string {
    const stored = localStorage.getItem('medicamenta_device_id');
    if (stored) {
      return stored;
    }

    const newId = uuidv4();
    localStorage.setItem('medicamenta_device_id', newId);
    return newId;
  }

  /**
   * Get device name
   */
  private getDeviceName(): string {
    const stored = localStorage.getItem('medicamenta_device_name');
    if (stored) {
      return stored;
    }

    const platform = this.getPlatform();
    const name = `${platform} Device`;
    return name;
  }

  /**
   * Set custom device name
   */
  setDeviceName(name: string): void {
    localStorage.setItem('medicamenta_device_name', name);
    
    const userId = this.auth.currentUser()?.uid;
    if (userId && this._isActive()) {
      this.registerDevice(userId);
    }
  }

  /**
   * Get platform name
   */
  private getPlatform(): string {
    const ua = navigator.userAgent;
    
    if (/android/i.test(ua)) return 'Android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
    if (/Win/.test(ua)) return 'Windows';
    if (/Mac/.test(ua)) return 'macOS';
    if (/Linux/.test(ua)) return 'Linux';
    
    return 'Unknown';
  }

  /**
   * Clear sync events older than 7 days
   */
  async cleanupOldEvents(): Promise<number> {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) {
      return 0;
    }

    try {
      const eventsRef = collection(this.firestore, 'sync_events');
      const q = query(eventsRef, where('userId', '==', userId));
      const snapshot = await getDocs(q);

      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

      let deleted = 0;
      const deletePromises: Promise<void>[] = [];

      snapshot.forEach(docSnap => {
        const event = docSnap.data() as any;
        const eventTime = new Date(event.timestamp).getTime();

        if (eventTime < sevenDaysAgo) {
          const docRef = doc(this.firestore, `sync_events/${docSnap.id}`);
          deletePromises.push(setDoc(docRef, { _deleted: true }, { merge: true }));
          deleted++;
        }
      });

      await Promise.all(deletePromises);
      this.logService.debug('MultiDeviceSyncService', 'Cleaned up old events', { deletedCount: deleted });

      return deleted;
    } catch (error: any) {
      this.logService.error('MultiDeviceSyncService', 'Failed to cleanup events', error as Error);
      return 0;
    }
  }

  /**
   * Get sync statistics
   */
  getStats() {
    return this._stats();
  }

  /**
   * Reset sync statistics
   */
  resetStats(): void {
    this._stats.set({
      eventsReceived: 0,
      eventsSent: 0,
      conflicts: 0,
      lastSyncTime: null,
      connectedDevices: this._devices().length
    });
  }
}

