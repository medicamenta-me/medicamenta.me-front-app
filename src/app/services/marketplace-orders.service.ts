/**
 * 🛒 Marketplace Orders Service - Mobile App
 *
 * Serviço para integração de pedidos do Marketplace no App Mobile.
 * Implementa listeners real-time, sincronização offline e notificações.
 *
 * Responsabilidades:
 * 1. Buscar pedidos do Marketplace via API v2
 * 2. Monitorar status em tempo real via Firestore onSnapshot
 * 3. Sincronizar dados offline via IndexedDB
 * 4. Integrar com sistema de notificações
 *
 * Princípios SOLID:
 * - S: Responsabilidade única - apenas pedidos do marketplace
 * - O: Extensível para novos status/eventos
 * - L: Interfaces bem definidas
 * - I: Métodos específicos por funcionalidade
 * - D: Depende de abstrações (IntegrationService)
 *
 * @version 1.0.0
 * @date 03/01/2026
 * @author AI Assistant
 */

import { Injectable, inject, signal, computed, OnDestroy, effect } from "@angular/core";
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  doc,
  QueryConstraint,
} from "@angular/fire/firestore";
import { IntegrationService, PaginatedResult } from "./integration.service";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { IndexedDBService } from "./indexed-db.service";
import { firstValueFrom } from "rxjs";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

/**
 * Status do pedido no Marketplace
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

/**
 * Status de pagamento
 */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "approved"
  | "declined"
  | "refunded"
  | "cancelled";

/**
 * Método de pagamento
 */
export type PaymentMethod = "credit_card" | "debit_card" | "pix" | "boleto";

/**
 * Item do pedido
 */
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requiresPrescription: boolean;
  prescriptionId?: string;
  pharmacyId: string;
  pharmacyName: string;
}

/**
 * Endereço de entrega
 */
export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lat?: number;
  lng?: number;
}

/**
 * Pedido do Marketplace
 */
export interface MarketplaceOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyLogo?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: DeliveryAddress;
  deliveryType: "delivery" | "pickup";
  trackingCode?: string;
  estimatedDelivery?: Date;
  notes?: string;
  prescriptionIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

/**
 * Resumo do pedido para listagem
 */
export interface OrderSummary {
  id: string;
  pharmacyName: string;
  pharmacyLogo?: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: Date;
  estimatedDelivery?: Date;
}

/**
 * Estatísticas de pedidos do usuário
 */
export interface OrderStats {
  totalOrders: number;
  totalSpent: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  lastOrderDate?: Date;
}

/**
 * Filtros para busca de pedidos
 */
export interface OrderFilters {
  status?: OrderStatus | OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  pharmacyId?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Evento de mudança de status
 */
export interface StatusChangeEvent {
  orderId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  timestamp: Date;
  message?: string;
}

/**
 * Resultado de listener
 */
export interface ListenerResult {
  success: boolean;
  listenerId: string;
  error?: string;
}

/**
 * Configuração de listener
 */
export interface ListenerConfig {
  maxOrders?: number;
  includeStatuses?: OrderStatus[];
  excludeStatuses?: OrderStatus[];
  onlyRecent?: boolean; // últimos 30 dias
}

// ============================================================================
// CONSTANTES
// ============================================================================

const ORDERS_COLLECTION = "orders";
const INDEXED_DB_STORE = "marketplace_orders";
const DEFAULT_PAGE_SIZE = 20;
const MAX_ORDERS_LIMIT = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const NOTIFICATION_STATUSES: OrderStatus[] = [
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

/**
 * Mapeamento de status para mensagens
 */
const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: "Aguardando confirmação",
  confirmed: "Pedido confirmado",
  preparing: "Pedido em preparação",
  ready_for_pickup: "Pronto para retirada",
  out_for_delivery: "Saiu para entrega",
  delivered: "Pedido entregue",
  cancelled: "Pedido cancelado",
  refunded: "Reembolso processado",
};

/**
 * Mapeamento de status para ícones
 */
const STATUS_ICONS: Record<OrderStatus, string> = {
  pending: "time-outline",
  confirmed: "checkmark-circle-outline",
  preparing: "construct-outline",
  ready_for_pickup: "bag-check-outline",
  out_for_delivery: "bicycle-outline",
  delivered: "checkmark-done-circle-outline",
  cancelled: "close-circle-outline",
  refunded: "cash-outline",
};

/**
 * Mapeamento de status para cores
 */
const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "warning",
  confirmed: "primary",
  preparing: "secondary",
  ready_for_pickup: "tertiary",
  out_for_delivery: "primary",
  delivered: "success",
  cancelled: "danger",
  refunded: "medium",
};

// ============================================================================
// SERVICE
// ============================================================================

@Injectable({
  providedIn: "root",
})
export class MarketplaceOrdersService implements OnDestroy {
  // Injeções de dependência
  private readonly firestore = inject(Firestore);
  private readonly api = inject(IntegrationService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly indexedDb = inject(IndexedDBService);

  // Estado interno
  private readonly listeners = new Map<string, Unsubscribe>();
  private readonly orderCache = new Map<string, { order: MarketplaceOrder; timestamp: number }>();
  private lastStatusMap = new Map<string, OrderStatus>();

  // Signals públicos - Estado reativo
  readonly orders = signal<MarketplaceOrder[]>([]);
  readonly currentOrder = signal<MarketplaceOrder | null>(null);
  readonly stats = signal<OrderStats | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isListening = signal<boolean>(false);
  readonly lastUpdated = signal<Date | null>(null);

  // Computed - Derivados
  readonly orderCount = computed(() => this.orders().length);
  readonly pendingOrders = computed(() =>
    this.orders().filter((o) => o.status === "pending")
  );
  readonly activeOrders = computed(() =>
    this.orders().filter((o) =>
      ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"].includes(
        o.status
      )
    )
  );
  readonly completedOrders = computed(() =>
    this.orders().filter((o) => o.status === "delivered")
  );
  readonly cancelledOrders = computed(() =>
    this.orders().filter((o) => ["cancelled", "refunded"].includes(o.status))
  );
  readonly hasActiveOrders = computed(() => this.activeOrders().length > 0);
  readonly activeOrderCount = computed(() => this.activeOrders().length);

  // Effect para persistência offline
  private readonly persistenceEffect = effect(() => {
    const currentOrders = this.orders();
    if (currentOrders.length > 0) {
      this.persistToIndexedDb(currentOrders);
    }
  });

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  ngOnDestroy(): void {
    this.stopAllListeners();
  }

  // ============================================================================
  // API METHODS - Busca de Pedidos
  // ============================================================================

  /**
   * Busca todos os pedidos do usuário logado via API v2
   * @param page Página atual (1-indexed)
   * @param pageSize Tamanho da página
   * @param filters Filtros opcionais
   */
  async getOrders(
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE,
    filters?: OrderFilters
  ): Promise<PaginatedResult<MarketplaceOrder>> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error("Usuário não autenticado");
      }

      // Constrói query params
      const params: Record<string, string | number> = {
        page,
        pageSize: Math.min(pageSize, MAX_ORDERS_LIMIT),
        customerId: userId,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      // Adiciona filtros
      if (filters) {
        if (filters.status) {
          params["status"] = Array.isArray(filters.status)
            ? filters.status.join(",")
            : filters.status;
        }
        if (filters.dateFrom) {
          params["dateFrom"] = filters.dateFrom.toISOString();
        }
        if (filters.dateTo) {
          params["dateTo"] = filters.dateTo.toISOString();
        }
        if (filters.pharmacyId) {
          params["pharmacyId"] = filters.pharmacyId;
        }
        if (filters.minAmount !== undefined) {
          params["minAmount"] = filters.minAmount;
        }
        if (filters.maxAmount !== undefined) {
          params["maxAmount"] = filters.maxAmount;
        }
      }

      const response = await firstValueFrom(
        this.api.get<PaginatedResult<MarketplaceOrder>>("/v2/orders", { params })
      );

      // Converte datas
      const orders = response.items.map((o) => this.parseOrderDates(o));

      // Atualiza estado
      if (page === 1) {
        this.orders.set(orders);
      } else {
        this.orders.update((current) => [...current, ...orders]);
      }

      this.lastUpdated.set(new Date());

      // Atualiza cache
      orders.forEach((order) => {
        this.orderCache.set(order.id, { order, timestamp: Date.now() });
      });

      return {
        items: orders,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
        totalPages: response.totalPages,
      };
    } catch (err) {
      const errorMessage = this.parseError(err);
      this.error.set(errorMessage);
      console.error("[MarketplaceOrders] Erro ao buscar pedidos:", errorMessage);

      // Tenta carregar do cache offline
      const cachedOrders = await this.loadFromIndexedDb();
      if (cachedOrders.length > 0) {
        this.orders.set(cachedOrders);
        return {
          items: cachedOrders,
          total: cachedOrders.length,
          page: 1,
          pageSize: cachedOrders.length,
          totalPages: 1,
        };
      }

      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Busca um pedido específico por ID
   * @param orderId ID do pedido
   * @param forceRefresh Força atualização do cache
   */
  async getOrderById(orderId: string, forceRefresh: boolean = false): Promise<MarketplaceOrder> {
    // Verifica cache
    if (!forceRefresh) {
      const cached = this.orderCache.get(orderId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        this.currentOrder.set(cached.order);
        return cached.order;
      }
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.api.get<MarketplaceOrder>(`/v2/orders/${orderId}`)
      );

      const order = this.parseOrderDates(response);
      this.currentOrder.set(order);

      // Atualiza cache
      this.orderCache.set(orderId, { order, timestamp: Date.now() });

      // Atualiza lista se o pedido já existe
      this.orders.update((current) => {
        const index = current.findIndex((o) => o.id === orderId);
        if (index >= 0) {
          const updated = [...current];
          updated[index] = order;
          return updated;
        }
        return current;
      });

      return order;
    } catch (err) {
      const errorMessage = this.parseError(err);
      this.error.set(errorMessage);
      console.error(`[MarketplaceOrders] Erro ao buscar pedido ${orderId}:`, errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Busca estatísticas de pedidos do usuário
   */
  async getOrderStats(): Promise<OrderStats> {
    this.isLoading.set(true);

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error("Usuário não autenticado");
      }

      const response = await firstValueFrom(
        this.api.get<OrderStats>(`/v2/orders/stats`, {
          params: { customerId: userId },
        })
      );

      // Converte data se existir
      const stats: OrderStats = {
        ...response,
        lastOrderDate: response.lastOrderDate
          ? new Date(response.lastOrderDate)
          : undefined,
      };
      this.stats.set(stats);
      return stats;
    } catch (err) {
      const errorMessage = this.parseError(err);
      console.error("[MarketplaceOrders] Erro ao buscar stats:", errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ============================================================================
  // REAL-TIME LISTENERS
  // ============================================================================

  /**
   * Inicia listener para pedidos do usuário em tempo real
   * @param config Configuração do listener
   */
  async startOrdersListener(config?: ListenerConfig): Promise<ListenerResult> {
    const listenerId = "user-orders";

    // Remove listener existente
    this.stopListener(listenerId);

    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        return {
          success: false,
          listenerId,
          error: "Usuário não autenticado",
        };
      }

      // Constrói query
      const constraints: QueryConstraint[] = [
        where("customerId", "==", userId),
        orderBy("createdAt", "desc"),
      ];

      // Filtro de status
      if (config?.includeStatuses && config.includeStatuses.length > 0) {
        constraints.push(where("status", "in", config.includeStatuses));
      }

      // Limite
      const maxOrders = config?.maxOrders || MAX_ORDERS_LIMIT;
      constraints.push(limit(maxOrders));

      const ordersRef = collection(this.firestore, ORDERS_COLLECTION);
      const q = query(ordersRef, ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const orders: MarketplaceOrder[] = [];

          snapshot.docChanges().forEach((change) => {
            const orderData = change.doc.data() as MarketplaceOrder;
            const order = this.parseOrderDates({ ...orderData, id: change.doc.id });

            if (change.type === "modified") {
              // Verifica mudança de status para notificação
              const previousStatus = this.lastStatusMap.get(order.id);
              if (previousStatus && previousStatus !== order.status) {
                this.handleStatusChange({
                  orderId: order.id,
                  previousStatus,
                  newStatus: order.status,
                  timestamp: new Date(),
                });
              }
            }

            // Atualiza mapa de status
            this.lastStatusMap.set(order.id, order.status);
          });

          // Processa todos os documentos
          snapshot.docs.forEach((docSnapshot) => {
            const orderData = docSnapshot.data() as MarketplaceOrder;
            orders.push(this.parseOrderDates({ ...orderData, id: docSnapshot.id }));
          });

          // Atualiza estado
          this.orders.set(orders);
          this.lastUpdated.set(new Date());

          // Atualiza cache
          orders.forEach((order) => {
            this.orderCache.set(order.id, { order, timestamp: Date.now() });
          });

          console.log(`[MarketplaceOrders] Listener atualizado: ${orders.length} pedidos`);
        },
        (error) => {
          console.error("[MarketplaceOrders] Erro no listener:", error);
          this.error.set("Erro ao monitorar pedidos em tempo real");
          this.isListening.set(false);
        }
      );

      this.listeners.set(listenerId, unsubscribe);
      this.isListening.set(true);

      console.log(`[MarketplaceOrders] Listener ${listenerId} iniciado`);

      return {
        success: true,
        listenerId,
      };
    } catch (err) {
      const errorMessage = this.parseError(err);
      console.error("[MarketplaceOrders] Erro ao iniciar listener:", errorMessage);
      return {
        success: false,
        listenerId,
        error: errorMessage,
      };
    }
  }

  /**
   * Inicia listener para um pedido específico
   * @param orderId ID do pedido
   */
  async startOrderListener(orderId: string): Promise<ListenerResult> {
    const listenerId = `order-${orderId}`;

    // Remove listener existente
    this.stopListener(listenerId);

    try {
      const orderRef = doc(this.firestore, ORDERS_COLLECTION, orderId);

      const unsubscribe = onSnapshot(
        orderRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            console.warn(`[MarketplaceOrders] Pedido ${orderId} não encontrado`);
            return;
          }

          const orderData = snapshot.data() as MarketplaceOrder;
          const order = this.parseOrderDates({ ...orderData, id: snapshot.id });

          // Verifica mudança de status
          const previousStatus = this.lastStatusMap.get(orderId);
          if (previousStatus && previousStatus !== order.status) {
            this.handleStatusChange({
              orderId,
              previousStatus,
              newStatus: order.status,
              timestamp: new Date(),
            });
          }

          this.lastStatusMap.set(orderId, order.status);
          this.currentOrder.set(order);

          // Atualiza lista
          this.orders.update((current) => {
            const index = current.findIndex((o) => o.id === orderId);
            if (index >= 0) {
              const updated = [...current];
              updated[index] = order;
              return updated;
            }
            return [...current, order];
          });

          // Atualiza cache
          this.orderCache.set(orderId, { order, timestamp: Date.now() });

          console.log(`[MarketplaceOrders] Pedido ${orderId} atualizado: ${order.status}`);
        },
        (error) => {
          console.error(`[MarketplaceOrders] Erro no listener do pedido ${orderId}:`, error);
          this.error.set("Erro ao monitorar pedido");
        }
      );

      this.listeners.set(listenerId, unsubscribe);

      console.log(`[MarketplaceOrders] Listener ${listenerId} iniciado`);

      return {
        success: true,
        listenerId,
      };
    } catch (err) {
      const errorMessage = this.parseError(err);
      console.error(`[MarketplaceOrders] Erro ao iniciar listener para ${orderId}:`, errorMessage);
      return {
        success: false,
        listenerId,
        error: errorMessage,
      };
    }
  }

  /**
   * Para um listener específico
   * @param listenerId ID do listener
   */
  stopListener(listenerId: string): void {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
      console.log(`[MarketplaceOrders] Listener ${listenerId} parado`);
    }

    if (this.listeners.size === 0) {
      this.isListening.set(false);
    }
  }

  /**
   * Para todos os listeners
   */
  stopAllListeners(): void {
    this.listeners.forEach((unsubscribe, id) => {
      unsubscribe();
      console.log(`[MarketplaceOrders] Listener ${id} parado`);
    });
    this.listeners.clear();
    this.isListening.set(false);
  }

  // ============================================================================
  // NOTIFICATION INTEGRATION
  // ============================================================================

  /**
   * Trata mudança de status e envia notificação
   * @param event Evento de mudança de status
   */
  private async handleStatusChange(event: StatusChangeEvent): Promise<void> {
    console.log(
      `[MarketplaceOrders] Status changed: ${event.orderId} - ${event.previousStatus} -> ${event.newStatus}`
    );

    // Verifica se deve notificar
    if (!NOTIFICATION_STATUSES.includes(event.newStatus)) {
      return;
    }

    try {
      const order = this.orderCache.get(event.orderId)?.order;
      const pharmacyName = order?.pharmacyName || "Farmácia";

      const message = this.getStatusNotificationMessage(event.newStatus, pharmacyName);

      await this.notificationService.showLocalNotification({
        title: STATUS_MESSAGES[event.newStatus],
        body: message,
        data: {
          type: "order_status",
          orderId: event.orderId,
          status: event.newStatus,
        },
      });

      console.log(`[MarketplaceOrders] Notificação enviada para pedido ${event.orderId}`);
    } catch (err) {
      console.error("[MarketplaceOrders] Erro ao enviar notificação:", err);
    }
  }

  /**
   * Gera mensagem de notificação para status
   */
  private getStatusNotificationMessage(status: OrderStatus, pharmacyName: string): string {
    switch (status) {
      case "confirmed":
        return `Seu pedido em ${pharmacyName} foi confirmado!`;
      case "preparing":
        return `${pharmacyName} está preparando seu pedido.`;
      case "ready_for_pickup":
        return `Seu pedido está pronto para retirada em ${pharmacyName}!`;
      case "out_for_delivery":
        return `Seu pedido de ${pharmacyName} saiu para entrega!`;
      case "delivered":
        return `Seu pedido de ${pharmacyName} foi entregue. Obrigado!`;
      case "cancelled":
        return `Seu pedido em ${pharmacyName} foi cancelado.`;
      default:
        return `Status do pedido atualizado: ${STATUS_MESSAGES[status]}`;
    }
  }

  // ============================================================================
  // OFFLINE SUPPORT
  // ============================================================================

  /**
   * Persiste pedidos no IndexedDB
   */
  private async persistToIndexedDb(orders: MarketplaceOrder[]): Promise<void> {
    try {
      const serializedOrders = orders.map((order) => ({
        ...order,
        id: order.id, // Usado como keyPath
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        confirmedAt: order.confirmedAt?.toISOString(),
        shippedAt: order.shippedAt?.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString(),
        estimatedDelivery: order.estimatedDelivery?.toISOString(),
      }));

      await this.indexedDb.putBatch(INDEXED_DB_STORE, serializedOrders);
      console.log(`[MarketplaceOrders] ${orders.length} pedidos persistidos offline`);
    } catch (err) {
      console.error("[MarketplaceOrders] Erro ao persistir offline:", err);
    }
  }

  /**
   * Carrega pedidos do IndexedDB
   */
  private async loadFromIndexedDb(): Promise<MarketplaceOrder[]> {
    try {
      const data = await this.indexedDb.getAll<unknown>(INDEXED_DB_STORE);
      if (!data || !Array.isArray(data)) {
        return [];
      }

      const orders = data.map((item) => this.parseOrderDates(item as MarketplaceOrder));
      console.log(`[MarketplaceOrders] ${orders.length} pedidos carregados do cache offline`);
      return orders;
    } catch (err) {
      console.error("[MarketplaceOrders] Erro ao carregar do cache offline:", err);
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Obtém ID do usuário atual
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const user = await this.authService.getCurrentUser();
      return user?.uid || null;
    } catch {
      return null;
    }
  }

  /**
   * Converte strings de data para objetos Date
   */
  private parseOrderDates(order: MarketplaceOrder): MarketplaceOrder {
    return {
      ...order,
      createdAt: this.parseDate(order.createdAt),
      updatedAt: this.parseDate(order.updatedAt),
      confirmedAt: order.confirmedAt ? this.parseDate(order.confirmedAt) : undefined,
      shippedAt: order.shippedAt ? this.parseDate(order.shippedAt) : undefined,
      deliveredAt: order.deliveredAt ? this.parseDate(order.deliveredAt) : undefined,
      cancelledAt: order.cancelledAt ? this.parseDate(order.cancelledAt) : undefined,
      estimatedDelivery: order.estimatedDelivery
        ? this.parseDate(order.estimatedDelivery)
        : undefined,
    };
  }

  /**
   * Parse de data seguro
   */
  private parseDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "string") {
      return new Date(value);
    }
    if (typeof value === "object" && value !== null && "toDate" in value) {
      return (value as { toDate: () => Date }).toDate();
    }
    return new Date();
  }

  /**
   * Parse de erro para mensagem amigável
   */
  private parseError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === "string") {
      return error;
    }
    return "Erro desconhecido";
  }

  /**
   * Obtém mensagem para status
   */
  getStatusMessage(status: OrderStatus): string {
    return STATUS_MESSAGES[status] || status;
  }

  /**
   * Obtém ícone para status
   */
  getStatusIcon(status: OrderStatus): string {
    return STATUS_ICONS[status] || "help-circle-outline";
  }

  /**
   * Obtém cor para status
   */
  getStatusColor(status: OrderStatus): string {
    return STATUS_COLORS[status] || "medium";
  }

  /**
   * Verifica se o status é final
   */
  isFinalStatus(status: OrderStatus): boolean {
    return ["delivered", "cancelled", "refunded"].includes(status);
  }

  /**
   * Verifica se o pedido pode ser cancelado
   */
  canCancelOrder(order: MarketplaceOrder): boolean {
    return ["pending", "confirmed"].includes(order.status);
  }

  /**
   * Converte pedido para resumo
   */
  toOrderSummary(order: MarketplaceOrder): OrderSummary {
    return {
      id: order.id,
      pharmacyName: order.pharmacyName,
      pharmacyLogo: order.pharmacyLogo,
      status: order.status,
      total: order.total,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
    };
  }

  /**
   * Limpa cache e estado
   */
  clearCache(): void {
    this.orderCache.clear();
    this.lastStatusMap.clear();
    this.orders.set([]);
    this.currentOrder.set(null);
    this.stats.set(null);
    this.error.set(null);
    console.log("[MarketplaceOrders] Cache limpo");
  }
}
