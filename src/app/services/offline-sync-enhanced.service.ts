/**
 * 🔄 Offline Sync Enhanced Service
 *
 * Serviço de sincronização offline aprimorado que integra:
 * - OfflineSyncService (gestão de conflitos, persistência)
 * - OfflineQueueService (fila com prioridade e backoff exponencial)
 *
 * Este serviço atua como orquestrador, delegando:
 * - Operações de fila para OfflineQueueService
 * - Resolução de conflitos para OfflineSyncService
 *
 * @version 1.0.0
 * @date 03/01/2026
 */

import { Injectable, inject, computed, OnDestroy, effect } from "@angular/core";
import { OfflineSyncService, SyncStrategy, SyncConflict, OperationType, OperationPriority } from "./offline-sync.service";
import {
  OfflineQueueService,
  QueuePriority,
  QueueItemStatus,
  OperationHandler,
  QueueOperationType,
} from "./offline-queue.service";
import { LogService } from "./log.service";
import { ToastService } from "./toast.service";

// ============================================================================
// MAPPING
// ============================================================================

/** Mapeamento de prioridade legado para novo sistema */
const PRIORITY_MAP: Record<OperationPriority, QueuePriority> = {
  critical: QueuePriority.CRITICAL,
  high: QueuePriority.HIGH,
  normal: QueuePriority.NORMAL,
  low: QueuePriority.LOW,
};

/** Mapeamento de tipo de operação */
const OPERATION_TYPE_MAP: Record<OperationType, QueueOperationType> = {
  create: "create",
  update: "update",
  delete: "delete",
};

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: "root",
})
export class OfflineSyncEnhancedService implements OnDestroy {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  private readonly offlineSyncService = inject(OfflineSyncService);
  private readonly offlineQueueService = inject(OfflineQueueService);
  private readonly logService = inject(LogService);
  private readonly toastService = inject(ToastService);

  // ============================================================================
  // COMPUTED - Delegados para os serviços originais
  // ============================================================================

  /** Status online/offline */
  readonly isOnline = this.offlineQueueService.isOnline;

  /** Status de sincronização */
  readonly syncStatus = this.offlineSyncService.syncStatus;

  /** Se tem operações pendentes */
  readonly hasPendingOperations = computed(() => this.offlineQueueService.pendingCount() > 0);

  /** Conflitos não resolvidos */
  readonly unresolvedConflicts = computed(
    () => this.offlineSyncService.conflicts().filter((c) => !c.resolved)
  );

  /** Se tem conflitos não resolvidos */
  readonly hasUnresolvedConflicts = computed(() => this.unresolvedConflicts().length > 0);

  /** Contagem de itens pendentes */
  readonly pendingCount = this.offlineQueueService.pendingCount;

  /** Contagem de itens críticos pendentes */
  readonly criticalPendingCount = this.offlineQueueService.criticalPendingCount;

  /** Métricas da fila */
  readonly queueMetrics = this.offlineQueueService.metrics;

  /** Estatísticas de sync legado */
  readonly syncStats = this.offlineSyncService.syncStats;

  /** Se está processando a fila */
  readonly isProcessing = this.offlineQueueService.isProcessing;

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor() {
    this.registerDefaultHandlers();
    this.setupAutoSync();

    this.logService.info("OfflineSyncEnhancedService", "Service initialized");
  }

  ngOnDestroy(): void {
    this.logService.info("OfflineSyncEnhancedService", "Service destroyed");
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Registra handlers padrão para operações
   */
  private registerDefaultHandlers(): void {
    // Handler genérico para todas as operações
    // Services específicos podem registrar seus próprios handlers
    const defaultHandler: OperationHandler = {
      type: "sync",
      collections: ["*"],
      process: async (item) => {
        this.logService.debug("OfflineSyncEnhancedService", "Processing sync operation", {
          id: item.id,
          collection: item.collection,
        });

        // Por padrão, marca como sucesso
        // Services específicos devem sobrescrever com lógica real
        return true;
      },
    };

    this.offlineQueueService.registerHandler(defaultHandler);
  }

  /**
   * Configura auto-sync quando ficar online
   */
  private setupAutoSync(): void {
    effect(() => {
      if (this.isOnline() && this.hasPendingOperations() && !this.isProcessing()) {
        this.logService.info("OfflineSyncEnhancedService", "Online detected, starting auto-sync");
        this.syncNow();
      }
    });
  }

  // ============================================================================
  // PUBLIC API - Queue Operations
  // ============================================================================

  /**
   * Enfileira operação para sincronização
   * Usa o novo sistema de fila com prioridade e backoff
   */
  queueOperation(
    type: OperationType,
    collection: string,
    documentId: string,
    data?: unknown,
    priority: OperationPriority = "normal"
  ): string {
    const queuePriority = PRIORITY_MAP[priority];
    const queueType = OPERATION_TYPE_MAP[type];

    const itemId = this.offlineQueueService.enqueue(queueType, collection, data, {
      documentId,
      priority: queuePriority,
      metadata: {
        originalType: type,
        originalPriority: priority,
      },
    });

    this.logService.debug("OfflineSyncEnhancedService", "Operation queued", {
      itemId,
      type,
      collection,
      documentId,
      priority,
    });

    return itemId;
  }

  /**
   * Enfileira operação crítica (doses, alertas médicos)
   * Usa prioridade máxima
   */
  queueCriticalOperation(
    type: OperationType,
    collection: string,
    documentId: string,
    data?: unknown
  ): string {
    return this.queueOperation(type, collection, documentId, data, "critical");
  }

  /**
   * Remove operação da fila
   */
  removeOperation(operationId: string): boolean {
    return this.offlineQueueService.dequeue(operationId);
  }

  /**
   * Obtém operação por ID
   */
  getOperation(operationId: string) {
    return this.offlineQueueService.getItem(operationId);
  }

  // ============================================================================
  // PUBLIC API - Sync Operations
  // ============================================================================

  /**
   * Força sincronização imediata
   */
  async syncNow(): Promise<{ succeeded: number; failed: number; discarded: number }> {
    if (!this.isOnline()) {
      this.logService.warn("OfflineSyncEnhancedService", "Cannot sync while offline");
      this.toastService.showOffline();
      return { succeeded: 0, failed: 0, discarded: 0 };
    }

    try {
      const result = await this.offlineQueueService.forceProcess();

      if (result.succeeded > 0) {
        this.toastService.showSyncComplete(result.succeeded, result.failed);
      } else if (result.failed > 0) {
        this.toastService.showSyncError();
      }

      this.logService.info("OfflineSyncEnhancedService", "Sync complete", result);
      return {
        succeeded: result.succeeded,
        failed: result.failed,
        discarded: result.discarded,
      };
    } catch (error) {
      this.logService.error("OfflineSyncEnhancedService", "Sync failed", error as Error);
      this.toastService.showSyncError();
      return { succeeded: 0, failed: 0, discarded: 0 };
    }
  }

  /**
   * Obtém resumo da fila
   */
  getQueueSummary() {
    return this.offlineQueueService.getQueueSummary();
  }

  /**
   * Limpa operações completadas
   */
  clearCompleted(): number {
    return this.offlineQueueService.clearCompleted();
  }

  /**
   * Limpa operações descartadas
   */
  clearDiscarded(): number {
    return this.offlineQueueService.clearDiscarded();
  }

  /**
   * Reseta métricas
   */
  resetMetrics(): void {
    this.offlineQueueService.resetMetrics();
  }

  // ============================================================================
  // PUBLIC API - Conflict Resolution
  // ============================================================================

  /**
   * Registra um conflito para resolução
   */
  registerConflict(
    collection: string,
    documentId: string,
    localData: unknown,
    serverData: unknown,
    localTimestamp: Date,
    serverTimestamp: Date
  ): SyncConflict {
    return this.offlineSyncService.registerConflict(
      collection,
      documentId,
      localData,
      serverData,
      localTimestamp,
      serverTimestamp
    );
  }

  /**
   * Resolve conflito com estratégia
   */
  async resolveConflict(conflictId: string, strategy: SyncStrategy): Promise<boolean> {
    return this.offlineSyncService.resolveConflict(conflictId, strategy);
  }

  /**
   * Resolve conflito com merge manual
   */
  async resolveConflictWithMerge(conflictId: string, mergedData: unknown): Promise<boolean> {
    return this.offlineSyncService.resolveConflictWithMerge(conflictId, mergedData);
  }

  /**
   * Limpa conflitos resolvidos
   */
  clearResolvedConflicts(): void {
    this.offlineSyncService.clearResolvedConflicts();
  }

  // ============================================================================
  // PUBLIC API - Handler Registration
  // ============================================================================

  /**
   * Registra handler customizado para processar operações
   * Services específicos devem usar isso para registrar sua lógica de sync
   */
  registerOperationHandler(handler: OperationHandler): void {
    this.offlineQueueService.registerHandler(handler);
    this.logService.debug("OfflineSyncEnhancedService", "Handler registered", {
      type: handler.type,
      collections: handler.collections,
    });
  }

  /**
   * Remove handler
   */
  unregisterOperationHandler(type: QueueOperationType, collections: string[]): boolean {
    return this.offlineQueueService.unregisterHandler(type, collections);
  }

  // ============================================================================
  // PUBLIC API - Configuration
  // ============================================================================

  /**
   * Atualiza configuração da fila
   */
  updateQueueConfig(config: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    autoProcess?: boolean;
    processIntervalMs?: number;
  }): void {
    this.offlineQueueService.updateConfig(config);
  }

  /**
   * Obtém configuração atual
   */
  getQueueConfig() {
    return this.offlineQueueService.config();
  }

  /**
   * Reseta configuração para padrões
   */
  resetQueueConfig(): void {
    this.offlineQueueService.resetConfig();
  }
}
