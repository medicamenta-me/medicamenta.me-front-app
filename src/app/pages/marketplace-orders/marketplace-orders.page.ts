/**
 * 📦 Marketplace Orders Page
 *
 * Página para visualização de pedidos do Marketplace no App Mobile.
 * Lista pedidos com filtros, atualizações em tempo real e navegação para detalhes.
 *
 * Funcionalidades:
 * - Lista de pedidos com paginação infinita
 * - Filtros por status, data e farmácia
 * - Real-time updates via Firestore listeners
 * - Navegação para detalhes do pedido
 * - Pull-to-refresh
 * - Offline support
 *
 * @version 1.0.0
 * @date 03/01/2026
 * @author AI Assistant
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { Router } from "@angular/router";
import { DatePipe, SlicePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonButton,
  IonButtons,
  IonBackButton,
  IonList,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSearchbar,
  IonText,
  RefresherCustomEvent,
  InfiniteScrollCustomEvent,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  bagOutline,
  timeOutline,
  checkmarkCircleOutline,
  constructOutline,
  bagCheckOutline,
  bicycleOutline,
  checkmarkDoneCircleOutline,
  closeCircleOutline,
  cashOutline,
  filterOutline,
  refreshOutline,
  chevronForwardOutline,
  storefront,
  locationOutline,
  calendarOutline,
  receiptOutline,
  alertCircleOutline,
  searchOutline,
  radioOutline,
} from "ionicons/icons";

import {
  MarketplaceOrdersService,
  MarketplaceOrder,
  OrderStatus,
  OrderFilters,
  OrderSummary,
} from "../../services/marketplace-orders.service";

/**
 * Tipo de visualização da lista
 */
type ViewType = "all" | "active" | "completed";

/**
 * Interface para filtros ativos
 */
interface ActiveFilters {
  status: OrderStatus | OrderStatus[] | null;
  pharmacyId: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  searchQuery: string;
}

@Component({
  selector: "app-marketplace-orders",
  templateUrl: "./marketplace-orders.page.html",
  styleUrls: ["./marketplace-orders.page.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DatePipe,
    SlicePipe,
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButton,
    IonButtons,
    IonBackButton,
    IonList,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSearchbar,
    IonText,
  ],
})
export class MarketplaceOrdersPage implements OnInit, OnDestroy {
  // Injeções
  private readonly ordersService = inject(MarketplaceOrdersService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  // Estado da página
  readonly currentView = signal<ViewType>("all");
  readonly currentPage = signal<number>(1);
  readonly hasMorePages = signal<boolean>(true);
  readonly isRefreshing = signal<boolean>(false);
  readonly showFilters = signal<boolean>(false);

  // Filtros
  readonly filters = signal<ActiveFilters>({
    status: null,
    pharmacyId: null,
    dateFrom: null,
    dateTo: null,
    searchQuery: "",
  });

  // Estado do service (proxied)
  readonly orders = this.ordersService.orders;
  readonly isLoading = this.ordersService.isLoading;
  readonly error = this.ordersService.error;
  readonly stats = this.ordersService.stats;
  readonly isListening = this.ordersService.isListening;
  readonly lastUpdated = this.ordersService.lastUpdated;

  // Computed - Pedidos filtrados por view
  readonly displayedOrders = computed(() => {
    const view = this.currentView();
    const allOrders = this.orders();
    const searchQuery = this.filters().searchQuery.toLowerCase();

    let filtered = allOrders;

    // Filtrar por view
    switch (view) {
      case "active":
        filtered = filtered.filter((o) =>
          ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"].includes(
            o.status
          )
        );
        break;
      case "completed":
        filtered = filtered.filter((o) =>
          ["delivered", "cancelled", "refunded"].includes(o.status)
        );
        break;
    }

    // Filtrar por busca
    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.pharmacyName.toLowerCase().includes(searchQuery) ||
          o.id.toLowerCase().includes(searchQuery) ||
          o.items.some((item) => item.productName.toLowerCase().includes(searchQuery))
      );
    }

    return filtered;
  });

  // Computed - Resumo dos pedidos
  readonly orderSummaries = computed(() => {
    return this.displayedOrders().map((order) => this.ordersService.toOrderSummary(order));
  });

  // Computed - Contadores por status
  readonly activeCount = computed(() => this.ordersService.activeOrderCount());
  readonly completedCount = computed(() => this.ordersService.completedOrders().length);
  readonly totalCount = computed(() => this.ordersService.orderCount());

  // Computed - Estado vazio
  readonly isEmpty = computed(() => this.displayedOrders().length === 0 && !this.isLoading());

  // Computed - Mensagem de estado vazio
  readonly emptyMessage = computed(() => {
    const view = this.currentView();
    const hasSearch = this.filters().searchQuery.length > 0;

    if (hasSearch) {
      return "MARKETPLACE_ORDERS.EMPTY_SEARCH";
    }

    switch (view) {
      case "active":
        return "MARKETPLACE_ORDERS.EMPTY_ACTIVE";
      case "completed":
        return "MARKETPLACE_ORDERS.EMPTY_COMPLETED";
      default:
        return "MARKETPLACE_ORDERS.EMPTY_ALL";
    }
  });

  constructor() {
    // Registra ícones
    addIcons({
      bagOutline,
      timeOutline,
      checkmarkCircleOutline,
      constructOutline,
      bagCheckOutline,
      bicycleOutline,
      checkmarkDoneCircleOutline,
      closeCircleOutline,
      cashOutline,
      filterOutline,
      refreshOutline,
      chevronForwardOutline,
      storefront,
      locationOutline,
      calendarOutline,
      receiptOutline,
      alertCircleOutline,
      searchOutline,
      radioOutline,
    });
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  async ngOnInit(): Promise<void> {
    console.log("[MarketplaceOrdersPage] Initializing...");
    await this.loadOrders();
    await this.startRealtimeListeners();
    await this.loadStats();
  }

  ngOnDestroy(): void {
    console.log("[MarketplaceOrdersPage] Destroying...");
    this.ordersService.stopAllListeners();
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  /**
   * Carrega pedidos com filtros atuais
   */
  async loadOrders(page: number = 1): Promise<void> {
    try {
      const apiFilters = this.buildApiFilters();
      const result = await this.ordersService.getOrders(page, 20, apiFilters);

      this.currentPage.set(result.page);
      this.hasMorePages.set(result.page < result.totalPages);
    } catch (err) {
      console.error("[MarketplaceOrdersPage] Error loading orders:", err);
    }
  }

  /**
   * Carrega estatísticas
   */
  async loadStats(): Promise<void> {
    try {
      await this.ordersService.getOrderStats();
    } catch (err) {
      console.error("[MarketplaceOrdersPage] Error loading stats:", err);
    }
  }

  /**
   * Inicia listeners em tempo real
   */
  async startRealtimeListeners(): Promise<void> {
    try {
      const config = {
        maxOrders: 50,
        onlyRecent: true,
      };
      await this.ordersService.startOrdersListener(config);
    } catch (err) {
      console.error("[MarketplaceOrdersPage] Error starting listeners:", err);
    }
  }

  /**
   * Constrói filtros para API
   */
  private buildApiFilters(): OrderFilters {
    const activeFilters = this.filters();
    const apiFilters: OrderFilters = {};

    // Status baseado na view
    const view = this.currentView();
    if (view === "active") {
      apiFilters.status = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"] as unknown as OrderStatus;
    } else if (view === "completed") {
      apiFilters.status = ["delivered", "cancelled", "refunded"] as unknown as OrderStatus;
    }

    // Filtros manuais
    if (activeFilters.status) {
      apiFilters.status = activeFilters.status;
    }

    if (activeFilters.pharmacyId) {
      apiFilters.pharmacyId = activeFilters.pharmacyId;
    }

    if (activeFilters.dateFrom) {
      apiFilters.dateFrom = activeFilters.dateFrom;
    }

    if (activeFilters.dateTo) {
      apiFilters.dateTo = activeFilters.dateTo;
    }

    return apiFilters;
  }

  // ============================================================================
  // USER INTERACTIONS
  // ============================================================================

  /**
   * Muda a view (all/active/completed)
   */
  onViewChange(event: CustomEvent): void {
    const newView = event.detail.value as ViewType;
    this.currentView.set(newView);
    this.currentPage.set(1);
    this.loadOrders(1);
  }

  /**
   * Pull-to-refresh
   */
  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    this.isRefreshing.set(true);

    try {
      this.currentPage.set(1);
      await this.loadOrders(1);
      await this.loadStats();
    } finally {
      this.isRefreshing.set(false);
      event.target.complete();
    }
  }

  /**
   * Infinite scroll - carrega próxima página
   */
  async onLoadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    if (!this.hasMorePages()) {
      event.target.complete();
      return;
    }

    const nextPage = this.currentPage() + 1;

    try {
      await this.loadOrders(nextPage);
    } finally {
      event.target.complete();
    }
  }

  /**
   * Busca por texto
   */
  onSearchChange(event: CustomEvent): void {
    const query = event.detail.value || "";
    this.filters.update((f) => ({ ...f, searchQuery: query }));
  }

  /**
   * Toggle filtros
   */
  toggleFilters(): void {
    this.showFilters.update((v) => !v);
  }

  /**
   * Limpa filtros
   */
  clearFilters(): void {
    this.filters.set({
      status: null,
      pharmacyId: null,
      dateFrom: null,
      dateTo: null,
      searchQuery: "",
    });
    this.loadOrders(1);
  }

  /**
   * Navega para detalhes do pedido
   */
  viewOrderDetails(orderId: string): void {
    this.router.navigate(["/marketplace-orders", orderId]);
  }

  /**
   * Retry após erro
   */
  async retry(): Promise<void> {
    await this.loadOrders(1);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Retorna classe CSS para badge de status
   */
  getStatusBadgeClass(status: OrderStatus): string {
    const color = this.ordersService.getStatusColor(status);
    return `status-badge status-${color}`;
  }

  /**
   * Retorna texto traduzido do status
   */
  getStatusText(status: OrderStatus): string {
    return this.ordersService.getStatusMessage(status);
  }

  /**
   * Retorna ícone do status
   */
  getStatusIcon(status: OrderStatus): string {
    return this.ordersService.getStatusIcon(status);
  }

  /**
   * Retorna cor do status
   */
  getStatusColor(status: OrderStatus): string {
    return this.ordersService.getStatusColor(status);
  }

  /**
   * Formata valor monetário
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  /**
   * Formata data relativa
   */
  formatRelativeDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return this.translate.instant("COMMON.TODAY");
    } else if (days === 1) {
      return this.translate.instant("COMMON.YESTERDAY");
    } else if (days < 7) {
      return this.translate.instant("COMMON.DAYS_AGO", { days });
    } else {
      return new DatePipe("pt-BR").transform(date, "dd/MM/yyyy") || "";
    }
  }

  /**
   * Retorna contagem de itens formatada
   */
  getItemCountText(summary: OrderSummary): string {
    const count = summary.itemCount;
    return count === 1
      ? this.translate.instant("MARKETPLACE_ORDERS.ONE_ITEM")
      : this.translate.instant("MARKETPLACE_ORDERS.ITEMS_COUNT", { count });
  }

  /**
   * TrackBy para lista de pedidos
   */
  trackByOrderId(index: number, order: MarketplaceOrder): string {
    return order.id;
  }

  /**
   * TrackBy para lista de summaries
   */
  trackBySummaryId(index: number, summary: OrderSummary): string {
    return summary.id;
  }
}
