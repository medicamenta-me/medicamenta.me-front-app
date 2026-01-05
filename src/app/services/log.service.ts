/* eslint-disable no-console */
// LogService is the implementation of logging - console methods are intentional here

import { Injectable, signal, effect, inject } from '@angular/core';
import { LogEntry, LogEventType, LogLevel, StructuredLog } from '../models/log-entry.model';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { PatientSelectorService } from './patient-selector.service';
import { CareNetworkService } from './care-network.service';
import { IndexedDBService } from './indexed-db.service';
import { OfflineSyncService } from './offline-sync.service';
import { environment } from '../../environments/environment';
import { collection, Firestore, addDoc, query, orderBy, onSnapshot, Unsubscribe, serverTimestamp } from 'firebase/firestore';

/**
 * Enhanced LogService with structured logging
 * - Supports multiple log levels (DEBUG, INFO, WARN, ERROR, FATAL)
 * - PII sanitization
 * - Production-ready with Sentry integration hooks
 * - Session tracking for correlation
 */
@Injectable({
  providedIn: 'root'
})
export class LogService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly authService = inject(AuthService, { optional: true });
  private readonly patientSelectorService = inject(PatientSelectorService, { optional: true });
  private readonly careNetworkService = inject(CareNetworkService, { optional: true });
  private readonly indexedDB = inject(IndexedDBService);
  private readonly offlineSync = inject(OfflineSyncService);
  private readonly firestore: Firestore;

  private readonly _logs = signal<LogEntry[]>([]);
  private logSubscription: Unsubscribe | null = null;
  private readonly sessionId: string = this.generateSessionId();
  private readonly appVersion: string = '1.0.0'; // NOTE: Version management via package.json pending
  
  public readonly logs = this._logs.asReadonly();
  
  // Production mode flag
  private readonly isProduction = environment.production;

  constructor() {
    this.firestore = this.firebaseService.firestore;

    // Listen to active patient changes and load their logs
    effect((onCleanup) => {
        const activePatientId = this.patientSelectorService?.activePatientId();
        const permissionsSynced = this.careNetworkService?.permissionsSynced();
        const isOnline = this.offlineSync.isOnline();
        
        this.debug('LogService', `Effect triggered - activePatientId: ${activePatientId}, permissionsSynced: ${permissionsSynced}, isOnline: ${isOnline}`);
        
        this.cleanupSubscription();

        if (activePatientId) {
            // Load from cache first
            this.loadFromCache(activePatientId);

            // CRITICAL: Wait for permissions to be synced before accessing Firestore
            if (permissionsSynced && isOnline) {
                this.debug('LogService', `✅ Starting Firestore listener for patient: ${activePatientId}`);
                const logsCol = collection(this.firestore, `users/${activePatientId}/logs`);
                const q = query(logsCol, orderBy('timestamp', 'desc'));
                this.logSubscription = onSnapshot(q, async (snapshot) => {
                    const logs = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return { 
                            id: doc.id,
                            userId: activePatientId,
                            ...data,
                            // Convert Firestore Timestamp to JS Date
                            timestamp: data['timestamp']?.toDate() 
                        } as LogEntry;
                    });
                    this.debug('LogService', `Received ${logs.length} logs from Firestore`);
                    this._logs.set(logs);
                    
                    // Cache logs in IndexedDB
                    await this.cacheToIndexedDB(logs);
                }, (error) => {
                    this.error('LogService', `Firestore listener error`, error);
                    // Fallback to cache on error
                    this.loadFromCache(activePatientId);
                });
            } else if (!permissionsSynced) {
                this.debug('LogService', '⏸️ Waiting for permissions to sync...');
            } else if (!isOnline) {
                this.info('LogService', '📴 Offline mode - using cached logs');
            }
        } else {
            this.debug('LogService', '⏸️ Waiting for active patient ID');
            this._logs.set([]);
        }

        onCleanup(() => this.cleanupSubscription());
    });
  }

  private cleanupSubscription() {
      if (this.logSubscription) {
          this.logSubscription();
          this.logSubscription = null;
      }
  }

  /**
   * Generate unique session ID for correlation
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Sanitize PII (Personally Identifiable Information) from metadata
   * Removes emails, CPF, phone numbers, etc.
   */
  private sanitizePII(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata };
    const piiKeys = ['email', 'cpf', 'phone', 'address', 'password', 'token'];
    
    for (const key of piiKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizePII(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  /**
   * Create structured log entry for external monitoring
   */
  private createStructuredLog(
    level: LogLevel,
    context: string,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): StructuredLog {
    const sanitizedMetadata = metadata ? this.sanitizePII(metadata) : undefined;
    
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      userId: this.authService?.currentUser()?.uid,
      sessionId: this.sessionId,
      metadata: sanitizedMetadata,
      stackTrace: error?.stack,
      environment: this.isProduction ? 'production' : 'development',
      appVersion: this.appVersion
    };
  }

  /**
   * Send structured log to external services (Sentry, Firebase Analytics)
   */
  private sendToExternalService(structuredLog: StructuredLog): void {
    if (!this.isProduction) return; // Only in production
    
    // NOTE: Sentry integration pending (see PRODUCT-ROADMAP-IMPROVEMENTS.md)
    // Future: Sentry.captureMessage() for errors/warnings
  }

  /**
   * DEBUG level logging (development only)
   */
  debug(context: string, message: string, metadata?: Record<string, any>): void {
    if (this.isProduction) return; // Skip in production
    
    console.debug(`[${context}] ${message}`, metadata || '');
  }

  /**
   * INFO level logging
   */
  info(context: string, message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog(LogLevel.INFO, context, message, metadata);
    
    if (!this.isProduction) {
      console.info(`[${context}] ${message}`, metadata || '');
    }
    
    this.sendToExternalService(structuredLog);
  }

  /**
   * WARN level logging
   */
  warn(context: string, message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog(LogLevel.WARN, context, message, metadata);
    
    if (!this.isProduction) {
      console.warn(`[${context}] ${message}`, metadata || '');
    }
    
    this.sendToExternalService(structuredLog);
  }

  /**
   * ERROR level logging
   */
  error(context: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog(LogLevel.ERROR, context, message, metadata, error);
    
    if (!this.isProduction) {
      console.error(`[${context}] ${message}`, error, metadata || '');
    }
    
    this.sendToExternalService(structuredLog);
    
    // NOTE: Sentry integration pending (see PRODUCT-ROADMAP-IMPROVEMENTS.md - Item 1.2)
  }

  /**
   * FATAL level logging (critical errors)
   */
  fatal(context: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog(LogLevel.FATAL, context, message, metadata, error);
    
    console.error(`[FATAL] [${context}] ${message}`, error, metadata || '');
    
    this.sendToExternalService(structuredLog);
    
    // NOTE: Sentry integration pending with FATAL priority (see PRODUCT-ROADMAP-IMPROVEMENTS.md)
  }

  /**
   * Load logs from IndexedDB cache
   */
  private async loadFromCache(userId: string): Promise<void> {
    try {
      const cachedLogs = await this.indexedDB.getByIndex<LogEntry>('logs', 'userId', userId);
      if (cachedLogs.length > 0) {
        // Sort by timestamp descending
        cachedLogs.sort((a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
          const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
          return timeB.getTime() - timeA.getTime();
        });
        this.debug('LogService', `Loaded ${cachedLogs.length} logs from cache`);
        this._logs.set(cachedLogs);
      }
    } catch (error: any) {
      this.error('LogService', 'Failed to load from cache', error as Error);
    }
  }

  /**
   * Cache logs to IndexedDB
   */
  private async cacheToIndexedDB(logs: LogEntry[]): Promise<void> {
    try {
      await this.indexedDB.putBatch('logs', logs);
      this.debug('LogService', `Cached ${logs.length} logs to IndexedDB`);
    } catch (error: any) {
      this.error('LogService', 'Failed to cache to IndexedDB', error as Error);
    }
  }

  /**
   * Add log entry to a patient's document
   * @param eventType Type of event
   * @param message Log message
   * @param patientId Optional patient ID. If not provided, uses active patient
   */
  async addLog(eventType: LogEventType, message: string, patientId?: string) {
    const targetPatientId = patientId || this.patientSelectorService?.activePatientId();
    if (!targetPatientId) return; // Don't log if no patient selected

    const isOnline = this.offlineSync.isOnline();
    const timestamp = new Date();
    
    if (isOnline) {
      // Online: Save to Firestore
      const logsCol = collection(this.firestore, `users/${targetPatientId}/logs`);
      await addDoc(logsCol, {
        eventType,
        message,
        timestamp: serverTimestamp()
      });
    }
    
    // Offline: Save to cache and queue
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const tempLog: LogEntry = {
      id: tempId,
      userId: targetPatientId,
      eventType,
      message,
      timestamp
    };
    
    // Add to local cache
    await this.indexedDB.put('logs', tempLog);
    
    // Update signal
    const currentLogs = this._logs();
    this._logs.set([tempLog, ...currentLogs]);
    
    // Queue for sync (CRITICAL priority for taken/missed events)
    const priority = (eventType === 'taken' || eventType === 'missed') ? 'critical' : 'normal';
    this.offlineSync.queueOperation(
      'create',
      `users/${targetPatientId}/logs`,
      tempId,
      { eventType, message, timestamp },
      priority
    );
    
    this.debug('LogService', `Log queued for sync (${priority}): ${eventType}`);
  }

  /**
   * Log when a caregiver views patient data
   * Only logs if viewing as caregiver (not self)
   * @param viewType What was viewed (dashboard, medications, history, etc)
   */
  async logCaregiversView(viewType: 'dashboard' | 'medications' | 'medication-detail' | 'history') {
    const currentUserId = this.authService?.currentUser()?.uid;
    const activePatientId = this.patientSelectorService?.activePatientId();

    if (!currentUserId || !activePatientId) return;
    
    // Only log if viewing someone else's data
    if (currentUserId === activePatientId) return;

    // Get caregiver name
    const careNetwork = this.careNetworkService?.iCareFor();
    const patient = careNetwork?.find(p => p.userId === activePatientId);
    if (!patient) return;

    const viewTypeTranslations = {
      'dashboard': 'Dashboard',
      'medications': 'Medicamentos',
      'medication-detail': 'Detalhes do Medicamento',
      'history': 'Histórico'
    };

    const message = `Cuidador visualizou: ${viewTypeTranslations[viewType]}`;
    await this.addLog('view', message, activePatientId);
  }
}

