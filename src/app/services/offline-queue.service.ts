/**
 * 🔄 Offline Queue Service - Priority Queue with Exponential Backoff
 *
 * Serviço especializado para gerenciamento de fila offline com:
 * - Priorização inteligente por criticidade
 * - Retry com backoff exponencial
 * - Persistência em IndexedDB
 * - Métricas e monitoramento
 *
 * Seguindo especificação ROADMAP-FRONTAPP-2026.md - Sprint A2
 *
 * Princípios SOLID:
 * - S: Responsabilidade única - gerenciamento de fila offline
 * - O: Extensível via handlers de operação
 * - L: Interface consistente para todos os tipos de operação
 * - I: Métodos específicos para cada funcionalidade
 * - D: Depende de abstrações (IndexedDBService)
 *
 * @version 1.0.0
 * @date 03/01/2026
 * @author AI Assistant
 */

import { Injectable, inject, signal, computed, OnDestroy, effect } from "@angular/core";
import { IndexedDBService } from "./indexed-db.service";
import { LogService } from "./log.service";
import { AuthService } from "./auth.service";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Nome do store IndexedDB para a fila */
const QUEUE_STORE = "offline_queue";

/** Nome do store IndexedDB para métricas */
const METRICS_STORE = "queue_metrics";

/** Chave localStorage para configurações */
const CONFIG_KEY = "medicamenta_queue_config";

/** Máximo de retries antes de descartar operação */
const DEFAULT_MAX_RETRIES = 5;

/** Delay base para backoff exponencial (ms) */
const BASE_DELAY_MS = 1000;

/** Delay máximo para backoff (ms) */
const MAX_DELAY_MS = 60000;

/** Fator multiplicador para backoff */
const BACKOFF_MULTIPLIER = 2;

/** Jitter máximo para evitar thundering herd (ms) */
const MAX_JITTER_MS = 500;

/** Intervalo de processamento da fila (ms) */
const PROCESS_INTERVAL_MS = 5000;

// ============================================================================
// ENUMS & TYPES
// ============================================================================

/**
 * Prioridade da operação na fila
 * Menor número = maior prioridade
 */
export enum QueuePriority {
  /** Operações críticas: registro de dose, alertas médicos */
  CRITICAL = 1,
  /** Alta prioridade: criação de medicamentos, agendamentos */
  HIGH = 2,
  /** Normal: atualizações regulares */
  NORMAL = 3,
  /** Baixa: analytics, logs não críticos */
  LOW = 4,
}

/**
 * Status de um item na fila
 */
export enum QueueItemStatus {
  /** Aguardando processamento */
  PENDING = "pending",
  /** Em processamento */
  PROCESSING = "processing",
  /** Processado com sucesso */
  COMPLETED = "completed",
  /** Falhou (pode tentar novamente) */
  FAILED = "failed",
  /** Descartado (excedeu retries) */
  DISCARDED = "discarded",
}

/**
 * Tipo de operação
 */
export type QueueOperationType = "create" | "update" | "delete" | "sync" | "custom";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Item da fila offline
 */
export interface QueueItem {
  /** ID único do item */
  id: string;
  /** Tipo da operação */
  type: QueueOperationType;
  /** Collection/entity alvo */
  collection: string;
  /** ID do documento (se aplicável) */
  documentId?: string;
  /** Dados da operação */
  payload: unknown;
  /** Prioridade */
  priority: QueuePriority;
  /** Status atual */
  status: QueueItemStatus;
  /** Número de tentativas */
  retryCount: number;
  /** Máximo de tentativas */
  maxRetries: number;
  /** Próximo retry agendado */
  nextRetryAt?: Date;
  /** Timestamp de criação */
  createdAt: Date;
  /** Timestamp da última tentativa */
  lastAttemptAt?: Date;
  /** Erro da última tentativa */
  lastError?: string;
  /** ID do usuário */
  userId: string;
  /** Metadados adicionais */
  metadata?: Record<string, unknown>;
}

/**
 * Handler de operação - define como processar cada tipo
 */
export interface OperationHandler {
  /** Tipo de operação que este handler processa */
  type: QueueOperationType;
  /** Collections que este handler processa */
  collections: string[];
  /** Função de processamento */
  process: (item: QueueItem) => Promise<boolean>;
}

/**
 * Configuração da fila
 */
export interface QueueConfig {
  /** Máximo de retries padrão */
  maxRetries: number;
  /** Delay base para backoff (ms) */
  baseDelayMs: number;
  /** Delay máximo para backoff (ms) */
  maxDelayMs: number;
  /** Multiplicador do backoff */
  backoffMultiplier: number;
  /** Processamento automático habilitado */
  autoProcess: boolean;
  /** Intervalo de processamento (ms) */
  processIntervalMs: number;
}

/**
 * Métricas da fila
 */
export interface QueueMetrics {
  /** Total de operações enfileiradas */
  totalQueued: number;
  /** Total de operações processadas com sucesso */
  totalSucceeded: number;
  /** Total de operações que falharam */
  totalFailed: number;
  /** Total de operações descartadas */
  totalDiscarded: number;
  /** Tempo médio de processamento (ms) */
  avgProcessingTimeMs: number;
  /** Última sincronização */
  lastSyncAt?: Date;
  /** Métricas por prioridade */
  byPriority: Record<QueuePriority, { queued: number; succeeded: number; failed: number }>;
}

/**
 * Resultado do processamento de um item
 */
export interface ProcessResult {
  /** Sucesso ou falha */
  success: boolean;
  /** Item processado */
  item: QueueItem;
  /** Tempo de processamento (ms) */
  processingTimeMs: number;
  /** Erro se houver */
  error?: string;
}

/**
 * Resultado do processamento em lote
 */
export interface BatchProcessResult {
  /** Total processado */
  total: number;
  /** Sucessos */
  succeeded: number;
  /** Falhas */
  failed: number;
  /** Descartados */
  discarded: number;
  /** Resultados individuais */
  results: ProcessResult[];
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: "root",
})
export class OfflineQueueService implements OnDestroy {
  // ============================================================================
  // DEPENDENCIES
  // ============================================================================

  private readonly indexedDB = inject(IndexedDBService);
  private readonly logService = inject(LogService);
  private readonly authService = inject(AuthService);

  // ============================================================================
  // STATE
  // ============================================================================

  /** Fila de operações */
  private readonly _queue = signal<QueueItem[]>([]);
  public readonly queue = this._queue.asReadonly();

  /** Handlers registrados */
  private readonly handlers = new Map<string, OperationHandler>();

  /** Configuração atual */
  private readonly _config = signal<QueueConfig>({
    maxRetries: DEFAULT_MAX_RETRIES,
    baseDelayMs: BASE_DELAY_MS,
    maxDelayMs: MAX_DELAY_MS,
    backoffMultiplier: BACKOFF_MULTIPLIER,
    autoProcess: true,
    processIntervalMs: PROCESS_INTERVAL_MS,
  });
  public readonly config = this._config.asReadonly();

  /** Status online */
  private readonly _isOnline = signal<boolean>(navigator.onLine);
  public readonly isOnline = this._isOnline.asReadonly();

  /** Processando no momento */
  private readonly _isProcessing = signal<boolean>(false);
  public readonly isProcessing = this._isProcessing.asReadonly();

  /** Métricas */
  private readonly _metrics = signal<QueueMetrics>({
    totalQueued: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalDiscarded: 0,
    avgProcessingTimeMs: 0,
    byPriority: {
      [QueuePriority.CRITICAL]: { queued: 0, succeeded: 0, failed: 0 },
      [QueuePriority.HIGH]: { queued: 0, succeeded: 0, failed: 0 },
      [QueuePriority.NORMAL]: { queued: 0, succeeded: 0, failed: 0 },
      [QueuePriority.LOW]: { queued: 0, succeeded: 0, failed: 0 },
    },
  });
  public readonly metrics = this._metrics.asReadonly();

  /** Intervalo de processamento */
  private processInterval: ReturnType<typeof setInterval> | null = null;

  // ============================================================================
  // COMPUTED
  // ============================================================================

  /** Itens pendentes */
  readonly pendingItems = computed(() =>
    this._queue().filter(
      (item) => item.status === QueueItemStatus.PENDING || item.status === QueueItemStatus.FAILED
    )
  );

  /** Contagem de itens pendentes */
  readonly pendingCount = computed(() => this.pendingItems().length);

  /** Tem itens para processar */
  readonly hasItemsToProcess = computed(() => this.pendingCount() > 0);

  /** Itens críticos pendentes */
  readonly criticalPendingCount = computed(
    () =>
      this._queue().filter(
        (item) =>
          item.priority === QueuePriority.CRITICAL &&
          (item.status === QueueItemStatus.PENDING || item.status === QueueItemStatus.FAILED)
      ).length
  );

  /** Pode processar (online + tem itens + não está processando) */
  readonly canProcess = computed(
    () => this.isOnline() && this.hasItemsToProcess() && !this.isProcessing()
  );

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor() {
    this.initializeNetworkListeners();
    this.loadConfig();
    this.loadQueue();
    this.loadMetrics();
    this.startAutoProcess();

    // Auto-process quando ficar online
    effect(() => {
      if (this.isOnline() && this.hasItemsToProcess() && !this.isProcessing()) {
        this.processQueue();
      }
    });

    this.logService.info("OfflineQueueService", "Service initialized");
  }

  ngOnDestroy(): void {
    this.stopAutoProcess();
    this.logService.info("OfflineQueueService", "Service destroyed");
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Inicializa listeners de rede
   */
  private initializeNetworkListeners(): void {
    window.addEventListener("online", () => {
      this._isOnline.set(true);
      this.logService.info("OfflineQueueService", "Network online");
    });

    window.addEventListener("offline", () => {
      this._isOnline.set(false);
      this.logService.info("OfflineQueueService", "Network offline");
    });
  }

  /**
   * Carrega configuração do localStorage
   */
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const config = JSON.parse(stored) as QueueConfig;
        this._config.set({ ...this._config(), ...config });
      }
    } catch (error) {
      this.logService.error("OfflineQueueService", "Error loading config", error as Error);
    }
  }

  /**
   * Carrega fila do IndexedDB
   */
  private async loadQueue(): Promise<void> {
    try {
      const items = await this.indexedDB.getAll<QueueItem>(QUEUE_STORE);
      if (items && items.length > 0) {
        // Converte timestamps
        const converted = items.map((item) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          lastAttemptAt: item.lastAttemptAt ? new Date(item.lastAttemptAt) : undefined,
          nextRetryAt: item.nextRetryAt ? new Date(item.nextRetryAt) : undefined,
        }));

        // Ordena por prioridade
        converted.sort((a, b) => a.priority - b.priority);
        this._queue.set(converted);

        this.logService.info("OfflineQueueService", "Queue loaded", { count: converted.length });
      }
    } catch (error) {
      this.logService.error("OfflineQueueService", "Error loading queue", error as Error);
    }
  }

  /**
   * Carrega métricas do IndexedDB
   */
  private async loadMetrics(): Promise<void> {
    try {
      const stored = await this.indexedDB.get<QueueMetrics>(METRICS_STORE, "current");
      if (stored) {
        if (stored.lastSyncAt) {
          stored.lastSyncAt = new Date(stored.lastSyncAt);
        }
        this._metrics.set(stored);
      }
    } catch (error) {
      this.logService.error("OfflineQueueService", "Error loading metrics", error as Error);
    }
  }

  // ============================================================================
  // QUEUE OPERATIONS
  // ============================================================================

  /**
   * Adiciona item à fila
   */
  enqueue(
    type: QueueOperationType,
    collection: string,
    payload: unknown,
    options: {
      documentId?: string;
      priority?: QueuePriority;
      maxRetries?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): string {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      throw new Error("User must be authenticated to queue operations");
    }

    const item: QueueItem = {
      id: this.generateId(),
      type,
      collection,
      documentId: options.documentId,
      payload,
      priority: options.priority ?? QueuePriority.NORMAL,
      status: QueueItemStatus.PENDING,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this._config().maxRetries,
      createdAt: new Date(),
      userId,
      metadata: options.metadata,
    };

    // Adiciona e ordena por prioridade
    const newQueue = [...this._queue(), item].sort((a, b) => a.priority - b.priority);
    this._queue.set(newQueue);

    // Atualiza métricas
    this.incrementMetric("totalQueued");
    this.incrementPriorityMetric(item.priority, "queued");

    // Persiste
    this.persistQueue();

    this.logService.debug("OfflineQueueService", "Item enqueued", {
      id: item.id,
      type,
      collection,
      priority: item.priority,
    });

    return item.id;
  }

  /**
   * Remove item da fila
   */
  dequeue(itemId: string): boolean {
    const queue = this._queue();
    const index = queue.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return false;
    }

    const newQueue = [...queue];
    newQueue.splice(index, 1);
    this._queue.set(newQueue);
    this.persistQueue();

    this.logService.debug("OfflineQueueService", "Item dequeued", { id: itemId });
    return true;
  }

  /**
   * Obtém item por ID
   */
  getItem(itemId: string): QueueItem | undefined {
    return this._queue().find((item) => item.id === itemId);
  }

  /**
   * Obtém itens por status
   */
  getItemsByStatus(status: QueueItemStatus): QueueItem[] {
    return this._queue().filter((item) => item.status === status);
  }

  /**
   * Obtém itens por prioridade
   */
  getItemsByPriority(priority: QueuePriority): QueueItem[] {
    return this._queue().filter((item) => item.priority === priority);
  }

  /**
   * Atualiza status de um item
   */
  updateItemStatus(itemId: string, status: QueueItemStatus, error?: string): boolean {
    const queue = this._queue();
    const index = queue.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return false;
    }

    const updatedItem = { ...queue[index], status };
    if (error) {
      updatedItem.lastError = error;
    }
    if (status === QueueItemStatus.FAILED || status === QueueItemStatus.COMPLETED) {
      updatedItem.lastAttemptAt = new Date();
    }

    const newQueue = [...queue];
    newQueue[index] = updatedItem;
    this._queue.set(newQueue);
    this.persistQueue();

    return true;
  }

  /**
   * Limpa itens completados
   */
  clearCompleted(): number {
    const queue = this._queue();
    const remaining = queue.filter((item) => item.status !== QueueItemStatus.COMPLETED);
    const removed = queue.length - remaining.length;

    this._queue.set(remaining);
    this.persistQueue();

    this.logService.info("OfflineQueueService", "Cleared completed items", { count: removed });
    return removed;
  }

  /**
   * Limpa itens descartados
   */
  clearDiscarded(): number {
    const queue = this._queue();
    const remaining = queue.filter((item) => item.status !== QueueItemStatus.DISCARDED);
    const removed = queue.length - remaining.length;

    this._queue.set(remaining);
    this.persistQueue();

    this.logService.info("OfflineQueueService", "Cleared discarded items", { count: removed });
    return removed;
  }

  /**
   * Limpa toda a fila
   */
  clearAll(): void {
    this._queue.set([]);
    this.persistQueue();
    this.logService.warn("OfflineQueueService", "Queue cleared");
  }

  // ============================================================================
  // HANDLER REGISTRATION
  // ============================================================================

  /**
   * Registra handler para processar operações
   */
  registerHandler(handler: OperationHandler): void {
    const key = `${handler.type}:${handler.collections.join(",")}`;
    this.handlers.set(key, handler);
    this.logService.debug("OfflineQueueService", "Handler registered", {
      type: handler.type,
      collections: handler.collections,
    });
  }

  /**
   * Remove handler
   */
  unregisterHandler(type: QueueOperationType, collections: string[]): boolean {
    const key = `${type}:${collections.join(",")}`;
    return this.handlers.delete(key);
  }

  /**
   * Obtém handler para um item
   */
  private getHandler(item: QueueItem): OperationHandler | undefined {
    // Busca handler específico
    for (const [_, handler] of this.handlers) {
      if (handler.type === item.type && handler.collections.includes(item.collection)) {
        return handler;
      }
    }

    // Busca handler genérico por tipo
    for (const [_, handler] of this.handlers) {
      if (handler.type === item.type && handler.collections.includes("*")) {
        return handler;
      }
    }

    return undefined;
  }

  // ============================================================================
  // QUEUE PROCESSING
  // ============================================================================

  /**
   * Processa a fila
   */
  async processQueue(): Promise<BatchProcessResult> {
    if (!this.canProcess()) {
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        discarded: 0,
        results: [],
      };
    }

    this._isProcessing.set(true);
    const startTime = Date.now();

    const results: ProcessResult[] = [];
    const itemsToProcess = this.getItemsToProcess();

    this.logService.info("OfflineQueueService", "Processing queue", { count: itemsToProcess.length });

    for (const item of itemsToProcess) {
      const result = await this.processItem(item);
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success && r.item.status === QueueItemStatus.FAILED).length;
    const discarded = results.filter((r) => r.item.status === QueueItemStatus.DISCARDED).length;

    // Atualiza métricas
    this.updateMetrics({
      totalSucceeded: this._metrics().totalSucceeded + succeeded,
      totalFailed: this._metrics().totalFailed + failed,
      totalDiscarded: this._metrics().totalDiscarded + discarded,
      lastSyncAt: new Date(),
      avgProcessingTimeMs: this.calculateAvgProcessingTime(results),
    });

    this._isProcessing.set(false);

    this.logService.info("OfflineQueueService", "Queue processing complete", {
      total: results.length,
      succeeded,
      failed,
      discarded,
      durationMs: Date.now() - startTime,
    });

    return {
      total: results.length,
      succeeded,
      failed,
      discarded,
      results,
    };
  }

  /**
   * Processa um item individual
   */
  async processItem(item: QueueItem): Promise<ProcessResult> {
    const startTime = Date.now();

    // Verifica se pode processar
    if (!this.shouldProcessItem(item)) {
      return {
        success: false,
        item,
        processingTimeMs: 0,
        error: "Item not ready for processing",
      };
    }

    // Atualiza status
    this.updateItemStatus(item.id, QueueItemStatus.PROCESSING);

    try {
      const handler = this.getHandler(item);

      if (!handler) {
        // Sem handler - marca como sucesso (operação será tratada por outro serviço)
        this.updateItemStatus(item.id, QueueItemStatus.COMPLETED);
        this.incrementPriorityMetric(item.priority, "succeeded");

        return {
          success: true,
          item: { ...item, status: QueueItemStatus.COMPLETED },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Executa handler
      const success = await handler.process(item);

      if (success) {
        this.updateItemStatus(item.id, QueueItemStatus.COMPLETED);
        this.incrementPriorityMetric(item.priority, "succeeded");

        return {
          success: true,
          item: { ...item, status: QueueItemStatus.COMPLETED },
          processingTimeMs: Date.now() - startTime,
        };
      } else {
        return this.handleFailure(item, "Handler returned false", startTime);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.handleFailure(item, errorMessage, startTime);
    }
  }

  /**
   * Trata falha no processamento
   */
  private handleFailure(item: QueueItem, error: string, startTime: number): ProcessResult {
    const newRetryCount = item.retryCount + 1;

    if (newRetryCount >= item.maxRetries) {
      // Excedeu máximo de retries - descarta
      this.updateItemStatus(item.id, QueueItemStatus.DISCARDED, error);
      this.incrementPriorityMetric(item.priority, "failed");

      this.logService.error("OfflineQueueService", "Item discarded after max retries", {
        id: item.id,
        retries: newRetryCount,
        error,
      } as unknown as Error);

      return {
        success: false,
        item: { ...item, status: QueueItemStatus.DISCARDED, retryCount: newRetryCount },
        processingTimeMs: Date.now() - startTime,
        error,
      };
    }

    // Agenda próximo retry com backoff
    const nextRetryAt = this.calculateNextRetry(newRetryCount);

    const queue = this._queue();
    const index = queue.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      const updatedItem: QueueItem = {
        ...queue[index],
        status: QueueItemStatus.FAILED,
        retryCount: newRetryCount,
        lastAttemptAt: new Date(),
        nextRetryAt,
        lastError: error,
      };

      const newQueue = [...queue];
      newQueue[index] = updatedItem;
      this._queue.set(newQueue);
      this.persistQueue();
    }

    this.logService.warn("OfflineQueueService", "Item failed, will retry", {
      id: item.id,
      retryCount: newRetryCount,
      nextRetryAt,
      error,
    });

    return {
      success: false,
      item: { ...item, status: QueueItemStatus.FAILED, retryCount: newRetryCount },
      processingTimeMs: Date.now() - startTime,
      error,
    };
  }

  /**
   * Obtém itens prontos para processamento
   */
  private getItemsToProcess(): QueueItem[] {
    const now = new Date();
    return this._queue()
      .filter((item) => this.shouldProcessItem(item, now))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Verifica se item deve ser processado
   */
  private shouldProcessItem(item: QueueItem, now: Date = new Date()): boolean {
    // Só processa pending ou failed
    if (item.status !== QueueItemStatus.PENDING && item.status !== QueueItemStatus.FAILED) {
      return false;
    }

    // Se tem nextRetryAt, verifica se já passou
    if (item.nextRetryAt && item.nextRetryAt > now) {
      return false;
    }

    return true;
  }

  // ============================================================================
  // BACKOFF CALCULATION
  // ============================================================================

  /**
   * Calcula próximo retry com backoff exponencial + jitter
   */
  calculateNextRetry(retryCount: number): Date {
    const config = this._config();

    // Backoff exponencial: baseDelay * (multiplier ^ retryCount)
    let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, retryCount);

    // Cap no máximo
    delay = Math.min(delay, config.maxDelayMs);

    // Adiciona jitter aleatório para evitar thundering herd
    const jitter = Math.random() * MAX_JITTER_MS;
    delay += jitter;

    return new Date(Date.now() + delay);
  }

  /**
   * Calcula delay para um retry específico (para testes/debug)
   */
  calculateDelayForRetry(retryCount: number): number {
    const config = this._config();
    const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, retryCount);
    return Math.min(delay, config.maxDelayMs);
  }

  // ============================================================================
  // AUTO PROCESS
  // ============================================================================

  /**
   * Inicia processamento automático
   */
  startAutoProcess(): void {
    if (this.processInterval) {
      return;
    }

    const config = this._config();
    if (!config.autoProcess) {
      return;
    }

    this.processInterval = setInterval(() => {
      if (this.canProcess()) {
        this.processQueue();
      }
    }, config.processIntervalMs);

    this.logService.debug("OfflineQueueService", "Auto-process started", {
      intervalMs: config.processIntervalMs,
    });
  }

  /**
   * Para processamento automático
   */
  stopAutoProcess(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      this.logService.debug("OfflineQueueService", "Auto-process stopped");
    }
  }

  /**
   * Reinicia processamento automático
   */
  restartAutoProcess(): void {
    this.stopAutoProcess();
    this.startAutoProcess();
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Atualiza configuração
   */
  updateConfig(updates: Partial<QueueConfig>): void {
    const newConfig = { ...this._config(), ...updates };
    this._config.set(newConfig);

    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
    } catch (error) {
      this.logService.error("OfflineQueueService", "Error saving config", error as Error);
    }

    // Reinicia auto-process se intervalo mudou
    if (updates.processIntervalMs || updates.autoProcess !== undefined) {
      this.restartAutoProcess();
    }

    this.logService.info("OfflineQueueService", "Config updated", updates);
  }

  /**
   * Reseta configuração para padrão
   */
  resetConfig(): void {
    const defaultConfig: QueueConfig = {
      maxRetries: DEFAULT_MAX_RETRIES,
      baseDelayMs: BASE_DELAY_MS,
      maxDelayMs: MAX_DELAY_MS,
      backoffMultiplier: BACKOFF_MULTIPLIER,
      autoProcess: true,
      processIntervalMs: PROCESS_INTERVAL_MS,
    };

    this._config.set(defaultConfig);
    localStorage.removeItem(CONFIG_KEY);
    this.restartAutoProcess();

    this.logService.info("OfflineQueueService", "Config reset to default");
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  /**
   * Incrementa métrica
   */
  private incrementMetric(key: keyof Pick<QueueMetrics, "totalQueued" | "totalSucceeded" | "totalFailed" | "totalDiscarded">): void {
    const metrics = this._metrics();
    this._metrics.set({
      ...metrics,
      [key]: metrics[key] + 1,
    });
    this.persistMetrics();
  }

  /**
   * Incrementa métrica por prioridade
   */
  private incrementPriorityMetric(
    priority: QueuePriority,
    key: "queued" | "succeeded" | "failed"
  ): void {
    const metrics = this._metrics();
    const byPriority = { ...metrics.byPriority };
    byPriority[priority] = {
      ...byPriority[priority],
      [key]: byPriority[priority][key] + 1,
    };
    this._metrics.set({ ...metrics, byPriority });
    this.persistMetrics();
  }

  /**
   * Atualiza métricas
   */
  private updateMetrics(updates: Partial<QueueMetrics>): void {
    this._metrics.set({ ...this._metrics(), ...updates });
    this.persistMetrics();
  }

  /**
   * Calcula tempo médio de processamento
   */
  private calculateAvgProcessingTime(results: ProcessResult[]): number {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.processingTimeMs, 0);
    return Math.round(total / results.length);
  }

  /**
   * Reseta métricas
   */
  resetMetrics(): void {
    this._metrics.set({
      totalQueued: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      totalDiscarded: 0,
      avgProcessingTimeMs: 0,
      byPriority: {
        [QueuePriority.CRITICAL]: { queued: 0, succeeded: 0, failed: 0 },
        [QueuePriority.HIGH]: { queued: 0, succeeded: 0, failed: 0 },
        [QueuePriority.NORMAL]: { queued: 0, succeeded: 0, failed: 0 },
        [QueuePriority.LOW]: { queued: 0, succeeded: 0, failed: 0 },
      },
    });
    this.persistMetrics();
    this.logService.info("OfflineQueueService", "Metrics reset");
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Persiste fila no IndexedDB
   */
  private async persistQueue(): Promise<void> {
    try {
      await this.indexedDB.clear(QUEUE_STORE);
      const queue = this._queue();
      if (queue.length > 0) {
        await this.indexedDB.putBatch(QUEUE_STORE, queue);
      }
    } catch (error) {
      this.logService.error("OfflineQueueService", "Error persisting queue", error as Error);
    }
  }

  /**
   * Persiste métricas no IndexedDB
   */
  private async persistMetrics(): Promise<void> {
    try {
      await this.indexedDB.put(METRICS_STORE, { ...this._metrics(), id: "current" });
    } catch (error) {
      this.logService.error("OfflineQueueService", "Error persisting metrics", error as Error);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Força processamento imediato
   */
  async forceProcess(): Promise<BatchProcessResult> {
    if (!this.isOnline()) {
      throw new Error("Cannot process while offline");
    }

    return this.processQueue();
  }

  /**
   * Reprocessa item específico (reseta retry count)
   */
  reprocessItem(itemId: string): boolean {
    const queue = this._queue();
    const index = queue.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return false;
    }

    const updatedItem: QueueItem = {
      ...queue[index],
      status: QueueItemStatus.PENDING,
      retryCount: 0,
      nextRetryAt: undefined,
      lastError: undefined,
    };

    const newQueue = [...queue];
    newQueue[index] = updatedItem;
    this._queue.set(newQueue);
    this.persistQueue();

    this.logService.info("OfflineQueueService", "Item queued for reprocess", { id: itemId });
    return true;
  }

  /**
   * Obtém estatísticas resumidas
   */
  getQueueSummary(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    discarded: number;
    byPriority: Record<QueuePriority, number>;
  } {
    const queue = this._queue();

    return {
      pending: queue.filter((i) => i.status === QueueItemStatus.PENDING).length,
      processing: queue.filter((i) => i.status === QueueItemStatus.PROCESSING).length,
      completed: queue.filter((i) => i.status === QueueItemStatus.COMPLETED).length,
      failed: queue.filter((i) => i.status === QueueItemStatus.FAILED).length,
      discarded: queue.filter((i) => i.status === QueueItemStatus.DISCARDED).length,
      byPriority: {
        [QueuePriority.CRITICAL]: queue.filter((i) => i.priority === QueuePriority.CRITICAL).length,
        [QueuePriority.HIGH]: queue.filter((i) => i.priority === QueuePriority.HIGH).length,
        [QueuePriority.NORMAL]: queue.filter((i) => i.priority === QueuePriority.NORMAL).length,
        [QueuePriority.LOW]: queue.filter((i) => i.priority === QueuePriority.LOW).length,
      },
    };
  }
}
