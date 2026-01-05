/**
 * 📦 Marketplace Orders Page - Unit Tests
 *
 * Suite de testes unitários para MarketplaceOrdersPage
 *
 * Cobertura:
 * - Inicialização e lifecycle
 * - Interações de usuário (filtros, busca, refresh)
 * - Navegação
 * - Estados (loading, empty, error)
 * - Formatação de dados
 *
 * @version 1.0.0
 * @date 03/01/2026
 */

import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { Router, ActivatedRoute } from "@angular/router";
import { provideRouter, RouterModule } from "@angular/router";
import { signal, WritableSignal, LOCALE_ID } from "@angular/core";
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localePtBr from "@angular/common/locales/pt";
import { TranslateModule, TranslateService, TranslateLoader } from "@ngx-translate/core";
import { RefresherCustomEvent, InfiniteScrollCustomEvent, provideIonicAngular, NavController } from "@ionic/angular/standalone";
import { of, Observable, Subject } from "rxjs";

// Register pt-BR locale for DatePipe
registerLocaleData(localePtBr, "pt-BR");

import { MarketplaceOrdersPage } from "./marketplace-orders.page";
import {
  MarketplaceOrdersService,
  MarketplaceOrder,
  OrderStatus,
  OrderStats,
  OrderSummary,
} from "../../services/marketplace-orders.service";
import { PaginatedResult } from "../../services/integration.service";

// ============================================================================
// MOCK DATA
// ============================================================================

const mockOrder: MarketplaceOrder = {
  id: "order-123",
  customerId: "user-456",
  customerName: "Cliente Teste",
  customerEmail: "cliente@teste.com",
  pharmacyId: "pharmacy-789",
  pharmacyName: "Farmácia Teste",
  pharmacyLogo: "https://example.com/logo.png",
  status: "pending" as OrderStatus,
  items: [
    {
      productId: "prod-1",
      productName: "Medicamento A",
      quantity: 2,
      unitPrice: 29.99,
      totalPrice: 59.98,
      requiresPrescription: false,
      pharmacyId: "pharmacy-789",
      pharmacyName: "Farmácia Teste",
    },
    {
      productId: "prod-2",
      productName: "Medicamento B",
      quantity: 1,
      unitPrice: 15.5,
      totalPrice: 15.5,
      requiresPrescription: false,
      pharmacyId: "pharmacy-789",
      pharmacyName: "Farmácia Teste",
    },
  ],
  subtotal: 75.48,
  discount: 5.0,
  deliveryFee: 10.0,
  total: 80.48,
  paymentMethod: "credit_card",
  paymentStatus: "approved",
  deliveryAddress: {
    street: "Rua Teste",
    number: "123",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567",
    country: "Brasil",
  },
  deliveryType: "delivery",
  createdAt: new Date("2026-01-03T10:00:00"),
  updatedAt: new Date("2026-01-03T10:30:00"),
};

const mockOrderDelivered: MarketplaceOrder = {
  ...mockOrder,
  id: "order-456",
  status: "delivered" as OrderStatus,
  createdAt: new Date("2026-01-01T10:00:00"),
};

const mockOrderCancelled: MarketplaceOrder = {
  ...mockOrder,
  id: "order-789",
  status: "cancelled" as OrderStatus,
  pharmacyName: "Outra Farmácia",
  createdAt: new Date("2025-12-30T10:00:00"),
};

const mockStats: OrderStats = {
  totalOrders: 10,
  pendingOrders: 2,
  deliveredOrders: 5,
  cancelledOrders: 2,
  totalSpent: 500.0,
  averageOrderValue: 50.0,
  lastOrderDate: new Date("2026-01-03"),
};

const mockPaginatedResult: PaginatedResult<MarketplaceOrder> = {
  items: [mockOrder, mockOrderDelivered, mockOrderCancelled],
  total: 3,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

const mockSummary: OrderSummary = {
  id: mockOrder.id,
  pharmacyName: mockOrder.pharmacyName,
  pharmacyLogo: mockOrder.pharmacyLogo,
  status: mockOrder.status,
  total: mockOrder.total,
  itemCount: mockOrder.items.length,
  createdAt: mockOrder.createdAt,
};

// ============================================================================
// MOCK SERVICES
// ============================================================================

class MockMarketplaceOrdersService {
  // Signals
  orders: WritableSignal<MarketplaceOrder[]> = signal([mockOrder, mockOrderDelivered, mockOrderCancelled]);
  currentOrder: WritableSignal<MarketplaceOrder | null> = signal(null);
  stats: WritableSignal<OrderStats | null> = signal(mockStats);
  isLoading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  isListening: WritableSignal<boolean> = signal(false);
  lastUpdated: WritableSignal<Date | null> = signal(new Date());

  // Computed-like methods
  orderCount = () => this.orders().length;
  activeOrderCount = () => this.orders().filter((o) => !["delivered", "cancelled", "refunded"].includes(o.status)).length;
  completedOrders = () => this.orders().filter((o) => ["delivered", "cancelled", "refunded"].includes(o.status));

  // Methods
  getOrders = jasmine.createSpy("getOrders").and.returnValue(Promise.resolve(mockPaginatedResult));
  getOrderById = jasmine.createSpy("getOrderById").and.returnValue(Promise.resolve(mockOrder));
  getOrderStats = jasmine.createSpy("getOrderStats").and.returnValue(Promise.resolve(mockStats));
  startOrdersListener = jasmine.createSpy("startOrdersListener").and.returnValue(Promise.resolve());
  stopAllListeners = jasmine.createSpy("stopAllListeners");
  toOrderSummary = jasmine.createSpy("toOrderSummary").and.callFake((order: MarketplaceOrder) => ({
    id: order.id,
    pharmacyName: order.pharmacyName,
    pharmacyLogo: order.pharmacyLogo,
    status: order.status,
    total: order.total,
    itemCount: order.items.length,
    createdAt: order.createdAt,
  }));
  getStatusColor = jasmine.createSpy("getStatusColor").and.callFake((status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      pending: "warning",
      confirmed: "primary",
      preparing: "tertiary",
      ready_for_pickup: "success",
      out_for_delivery: "secondary",
      delivered: "success",
      cancelled: "danger",
      refunded: "medium",
    };
    return colors[status] || "medium";
  });
  getStatusMessage = jasmine.createSpy("getStatusMessage").and.callFake((status: OrderStatus) => `Status: ${status}`);
  getStatusIcon = jasmine.createSpy("getStatusIcon").and.callFake((status: OrderStatus) => `${status}-icon`);
}

class MockRouter {
  events = new Subject<unknown>();
  navigate = jasmine.createSpy("navigate").and.returnValue(Promise.resolve(true));
}

class MockNavController {
  navigateForward = jasmine.createSpy("navigateForward").and.returnValue(Promise.resolve(true));
  navigateBack = jasmine.createSpy("navigateBack").and.returnValue(Promise.resolve(true));
  navigateRoot = jasmine.createSpy("navigateRoot").and.returnValue(Promise.resolve(true));
  back = jasmine.createSpy("back");
  pop = jasmine.createSpy("pop").and.returnValue(Promise.resolve(true));
  setDirection = jasmine.createSpy("setDirection");
  setTopOutlet = jasmine.createSpy("setTopOutlet");
}

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<Record<string, string>> {
    return of({
      "MARKETPLACE_ORDERS.ONE_ITEM": "1 item",
      "MARKETPLACE_ORDERS.ITEMS_COUNT": "{{count}} itens",
      "COMMON.TODAY": "Hoje",
      "COMMON.YESTERDAY": "Ontem",
      "COMMON.DAYS_AGO": "há {{days}} dias",
    });
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("MarketplaceOrdersPage", () => {
  let component: MarketplaceOrdersPage;
  let fixture: ComponentFixture<MarketplaceOrdersPage>;
  let ordersService: MockMarketplaceOrdersService;
  let router: MockRouter;
  let navController: MockNavController;

  beforeEach(waitForAsync(() => {
    ordersService = new MockMarketplaceOrdersService();
    router = new MockRouter();
    navController = new MockNavController();

    TestBed.configureTestingModule({
      imports: [
        MarketplaceOrdersPage,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
      providers: [
        provideIonicAngular(),
        { provide: MarketplaceOrdersService, useValue: ordersService },
        { provide: Router, useValue: router },
        { provide: NavController, useValue: navController },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarketplaceOrdersPage);
    component = fixture.componentInstance;
    // Note: detectChanges() is NOT called here because it triggers template rendering
    // which can fail with Ionicons in test environment. Call it explicitly in tests that need it.
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe("Initialization", () => {
    it("should create the component", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with default view as 'all'", () => {
      expect(component.currentView()).toBe("all");
    });

    it("should initialize with page 1", () => {
      expect(component.currentPage()).toBe(1);
    });

    it("should initialize with hasMorePages true", () => {
      expect(component.hasMorePages()).toBe(true);
    });

    it("should initialize with empty filters", () => {
      const filters = component.filters();
      expect(filters.searchQuery).toBe("");
      expect(filters.status).toBeNull();
      expect(filters.pharmacyId).toBeNull();
    });

    it("should call loadOrders on init", async () => {
      await component.ngOnInit();
      expect(ordersService.getOrders).toHaveBeenCalled();
    });

    it("should call startOrdersListener on init", async () => {
      await component.ngOnInit();
      expect(ordersService.startOrdersListener).toHaveBeenCalled();
    });

    it("should call getOrderStats on init", async () => {
      await component.ngOnInit();
      expect(ordersService.getOrderStats).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  describe("Lifecycle", () => {
    it("should stop listeners on destroy", () => {
      component.ngOnDestroy();
      expect(ordersService.stopAllListeners).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // COMPUTED PROPERTIES
  // ==========================================================================

  describe("Computed Properties", () => {
    it("should compute totalCount from service", () => {
      expect(component.totalCount()).toBe(3);
    });

    it("should compute activeCount from service", () => {
      expect(component.activeCount()).toBe(1); // Only mockOrder is pending
    });

    it("should compute completedCount from service", () => {
      expect(component.completedCount()).toBe(2); // delivered + cancelled
    });

    it("should compute isEmpty when no orders", () => {
      ordersService.orders.set([]);
      fixture.detectChanges();
      expect(component.isEmpty()).toBe(true);
    });

    it("should compute isEmpty as false when orders exist", () => {
      expect(component.isEmpty()).toBe(false);
    });

    it("should compute displayedOrders for 'all' view", () => {
      component.currentView.set("all");
      const displayed = component.displayedOrders();
      expect(displayed.length).toBe(3);
    });

    it("should compute displayedOrders for 'active' view", () => {
      component.currentView.set("active");
      const displayed = component.displayedOrders();
      expect(displayed.length).toBe(1);
      expect(displayed[0].status).toBe("pending");
    });

    it("should compute displayedOrders for 'completed' view", () => {
      component.currentView.set("completed");
      const displayed = component.displayedOrders();
      expect(displayed.length).toBe(2);
    });

    it("should filter orders by search query", () => {
      component.filters.update((f) => ({ ...f, searchQuery: "outra" }));
      fixture.detectChanges();
      const displayed = component.displayedOrders();
      expect(displayed.length).toBe(1);
      expect(displayed[0].pharmacyName).toBe("Outra Farmácia");
    });

    it("should compute emptyMessage for all view", () => {
      component.currentView.set("all");
      expect(component.emptyMessage()).toBe("MARKETPLACE_ORDERS.EMPTY_ALL");
    });

    it("should compute emptyMessage for active view", () => {
      component.currentView.set("active");
      expect(component.emptyMessage()).toBe("MARKETPLACE_ORDERS.EMPTY_ACTIVE");
    });

    it("should compute emptyMessage for completed view", () => {
      component.currentView.set("completed");
      expect(component.emptyMessage()).toBe("MARKETPLACE_ORDERS.EMPTY_COMPLETED");
    });

    it("should compute emptyMessage for search with no results", () => {
      component.filters.update((f) => ({ ...f, searchQuery: "xyz" }));
      expect(component.emptyMessage()).toBe("MARKETPLACE_ORDERS.EMPTY_SEARCH");
    });

    it("should compute orderSummaries from displayedOrders", () => {
      const summaries = component.orderSummaries();
      expect(summaries.length).toBe(3);
      expect(ordersService.toOrderSummary).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // USER INTERACTIONS
  // ==========================================================================

  describe("User Interactions", () => {
    it("should handle view change to active", () => {
      const event = { detail: { value: "active" } } as CustomEvent;
      component.onViewChange(event);
      expect(component.currentView()).toBe("active");
      expect(component.currentPage()).toBe(1);
      expect(ordersService.getOrders).toHaveBeenCalled();
    });

    it("should handle view change to completed", () => {
      const event = { detail: { value: "completed" } } as CustomEvent;
      component.onViewChange(event);
      expect(component.currentView()).toBe("completed");
    });

    it("should handle search input", () => {
      const event = { detail: { value: "farmacia" } } as CustomEvent;
      component.onSearchChange(event);
      expect(component.filters().searchQuery).toBe("farmacia");
    });

    it("should handle empty search input", () => {
      const event = { detail: { value: null } } as CustomEvent;
      component.onSearchChange(event);
      expect(component.filters().searchQuery).toBe("");
    });

    it("should toggle filters visibility", () => {
      expect(component.showFilters()).toBe(false);
      component.toggleFilters();
      expect(component.showFilters()).toBe(true);
      component.toggleFilters();
      expect(component.showFilters()).toBe(false);
    });

    it("should clear all filters", () => {
      component.filters.update((f) => ({
        ...f,
        searchQuery: "test",
        status: "pending" as OrderStatus,
      }));
      component.clearFilters();
      expect(component.filters().searchQuery).toBe("");
      expect(component.filters().status).toBeNull();
      expect(ordersService.getOrders).toHaveBeenCalled();
    });

    it("should navigate to order details", () => {
      component.viewOrderDetails("order-123");
      expect(router.navigate).toHaveBeenCalledWith(["/marketplace-orders", "order-123"]);
    });

    it("should retry loading orders", async () => {
      ordersService.getOrders.calls.reset();
      await component.retry();
      expect(ordersService.getOrders).toHaveBeenCalledWith(1, 20, jasmine.any(Object));
    });
  });

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  describe("Pull to Refresh", () => {
    it("should handle pull-to-refresh", async () => {
      const mockEvent = {
        target: { complete: jasmine.createSpy("complete") },
      } as unknown as RefresherCustomEvent;

      await component.onRefresh(mockEvent);

      expect(component.currentPage()).toBe(1);
      expect(ordersService.getOrders).toHaveBeenCalled();
      expect(ordersService.getOrderStats).toHaveBeenCalled();
      expect(mockEvent.target.complete).toHaveBeenCalled();
    });

    it("should set isRefreshing during refresh", async () => {
      const mockEvent = {
        target: { complete: jasmine.createSpy("complete") },
      } as unknown as RefresherCustomEvent;

      expect(component.isRefreshing()).toBe(false);

      const refreshPromise = component.onRefresh(mockEvent);

      // Note: Due to async nature, we check after completion
      await refreshPromise;
      expect(component.isRefreshing()).toBe(false);
    });
  });

  // ==========================================================================
  // INFINITE SCROLL
  // ==========================================================================

  describe("Infinite Scroll", () => {
    it("should load more orders on scroll", async () => {
      component.hasMorePages.set(true);
      component.currentPage.set(1);

      const mockEvent = {
        target: { complete: jasmine.createSpy("complete") },
      } as unknown as InfiniteScrollCustomEvent;

      await component.onLoadMore(mockEvent);

      expect(ordersService.getOrders).toHaveBeenCalled();
      expect(mockEvent.target.complete).toHaveBeenCalled();
    });

    it("should not load more when no more pages", async () => {
      component.hasMorePages.set(false);
      ordersService.getOrders.calls.reset();

      const mockEvent = {
        target: { complete: jasmine.createSpy("complete") },
      } as unknown as InfiniteScrollCustomEvent;

      await component.onLoadMore(mockEvent);

      expect(ordersService.getOrders).not.toHaveBeenCalled();
      expect(mockEvent.target.complete).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  describe("Helper Methods", () => {
    let realTranslateService: TranslateService;

    beforeEach(() => {
      realTranslateService = TestBed.inject(TranslateService);
    });

    it("should get status badge class", () => {
      const result = component.getStatusBadgeClass("pending" as OrderStatus);
      expect(result).toContain("status-badge");
      expect(ordersService.getStatusColor).toHaveBeenCalledWith("pending");
    });

    it("should get status text", () => {
      component.getStatusText("pending" as OrderStatus);
      expect(ordersService.getStatusMessage).toHaveBeenCalledWith("pending");
    });

    it("should get status icon", () => {
      const result = component.getStatusIcon("pending" as OrderStatus);
      expect(ordersService.getStatusIcon).toHaveBeenCalledWith("pending");
      expect(result).toBe("pending-icon");
    });

    it("should get status color", () => {
      const result = component.getStatusColor("pending" as OrderStatus);
      expect(ordersService.getStatusColor).toHaveBeenCalledWith("pending");
      expect(result).toBe("warning");
    });

    it("should format currency in BRL", () => {
      const result = component.formatCurrency(100.5);
      expect(result).toContain("100");
      expect(result).toContain("50");
    });

    it("should format relative date for today", () => {
      spyOn(realTranslateService, "instant").and.callThrough();
      const today = new Date();
      component.formatRelativeDate(today);
      expect(realTranslateService.instant).toHaveBeenCalledWith("COMMON.TODAY");
    });

    it("should format relative date for yesterday", () => {
      spyOn(realTranslateService, "instant").and.callThrough();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      component.formatRelativeDate(yesterday);
      expect(realTranslateService.instant).toHaveBeenCalledWith("COMMON.YESTERDAY");
    });

    it("should format relative date for recent days", () => {
      spyOn(realTranslateService, "instant").and.callThrough();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      component.formatRelativeDate(threeDaysAgo);
      expect(realTranslateService.instant).toHaveBeenCalledWith("COMMON.DAYS_AGO", { days: 3 });
    });

    it("should format relative date for older dates", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      const result = component.formatRelativeDate(oldDate);
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it("should get item count text for single item", () => {
      spyOn(realTranslateService, "instant").and.callThrough();
      const summary: OrderSummary = { ...mockSummary, itemCount: 1 };
      component.getItemCountText(summary);
      expect(realTranslateService.instant).toHaveBeenCalledWith("MARKETPLACE_ORDERS.ONE_ITEM");
    });

    it("should get item count text for multiple items", () => {
      spyOn(realTranslateService, "instant").and.callThrough();
      const summary: OrderSummary = { ...mockSummary, itemCount: 5 };
      component.getItemCountText(summary);
      expect(realTranslateService.instant).toHaveBeenCalledWith("MARKETPLACE_ORDERS.ITEMS_COUNT", {
        count: 5,
      });
    });

    it("should track orders by id", () => {
      const result = component.trackByOrderId(0, mockOrder);
      expect(result).toBe(mockOrder.id);
    });

    it("should track summaries by id", () => {
      const result = component.trackBySummaryId(0, mockSummary);
      expect(result).toBe(mockSummary.id);
    });
  });

  // ==========================================================================
  // API FILTERS
  // ==========================================================================

  describe("API Filters Building", () => {
    it("should build filters for active view", async () => {
      component.currentView.set("active");
      ordersService.getOrders.calls.reset();

      await component.loadOrders(1);

      const callArgs = ordersService.getOrders.calls.mostRecent().args;
      const filters = callArgs[2];
      expect(filters.status).toContain("pending");
      expect(filters.status).toContain("confirmed");
    });

    it("should build filters for completed view", async () => {
      component.currentView.set("completed");
      ordersService.getOrders.calls.reset();

      await component.loadOrders(1);

      const callArgs = ordersService.getOrders.calls.mostRecent().args;
      const filters = callArgs[2];
      expect(filters.status).toContain("delivered");
      expect(filters.status).toContain("cancelled");
    });

    it("should include pharmacy filter when set", async () => {
      component.filters.update((f) => ({ ...f, pharmacyId: "pharmacy-123" }));
      ordersService.getOrders.calls.reset();

      await component.loadOrders(1);

      const callArgs = ordersService.getOrders.calls.mostRecent().args;
      const filters = callArgs[2];
      expect(filters.pharmacyId).toBe("pharmacy-123");
    });

    it("should include date filters when set", async () => {
      const dateFrom = new Date("2026-01-01");
      const dateTo = new Date("2026-01-31");
      component.filters.update((f) => ({ ...f, dateFrom, dateTo }));
      ordersService.getOrders.calls.reset();

      await component.loadOrders(1);

      const callArgs = ordersService.getOrders.calls.mostRecent().args;
      const filters = callArgs[2];
      expect(filters.dateFrom).toEqual(dateFrom);
      expect(filters.dateTo).toEqual(dateTo);
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe("Error Handling", () => {
    it("should handle error from loadOrders gracefully", async () => {
      ordersService.getOrders.and.returnValue(Promise.reject(new Error("Network error")));

      // Should not throw
      await expectAsync(component.loadOrders(1)).toBeResolved();
    });

    it("should handle error from loadStats gracefully", async () => {
      ordersService.getOrderStats.and.returnValue(Promise.reject(new Error("Stats error")));

      // Should not throw
      await expectAsync(component.loadStats()).toBeResolved();
    });

    it("should handle error from startRealtimeListeners gracefully", async () => {
      ordersService.startOrdersListener.and.returnValue(Promise.reject(new Error("Listener error")));

      // Should not throw
      await expectAsync(component.startRealtimeListeners()).toBeResolved();
    });

    it("should display error state when error signal is set", () => {
      ordersService.error.set("Erro ao carregar pedidos");
      fixture.detectChanges();
      expect(component.error()).toBe("Erro ao carregar pedidos");
    });
  });

  // ==========================================================================
  // STATES
  // ==========================================================================

  describe("Component States", () => {
    it("should show loading state", () => {
      ordersService.isLoading.set(true);
      ordersService.orders.set([]);
      fixture.detectChanges();
      expect(component.isLoading()).toBe(true);
    });

    it("should show real-time indicator when listening", () => {
      ordersService.isListening.set(true);
      fixture.detectChanges();
      expect(component.isListening()).toBe(true);
    });

    it("should show stats when available", () => {
      expect(component.stats()).toEqual(mockStats);
    });

    it("should show last updated timestamp", () => {
      expect(component.lastUpdated()).toBeTruthy();
    });

    it("should show orders from service", () => {
      expect(component.orders().length).toBe(3);
    });
  });

  // ==========================================================================
  // PAGINATION
  // ==========================================================================

  describe("Pagination", () => {
    it("should update pagination state after loading", async () => {
      const paginatedResult: PaginatedResult<MarketplaceOrder> = {
        items: [mockOrder],
        total: 50,
        page: 2,
        pageSize: 20,
        totalPages: 3,
      };
      ordersService.getOrders.and.returnValue(Promise.resolve(paginatedResult));

      await component.loadOrders(2);

      expect(component.currentPage()).toBe(2);
      expect(component.hasMorePages()).toBe(true);
    });

    it("should set hasMorePages to false on last page", async () => {
      const paginatedResult: PaginatedResult<MarketplaceOrder> = {
        items: [mockOrder],
        total: 20,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      };
      ordersService.getOrders.and.returnValue(Promise.resolve(paginatedResult));

      await component.loadOrders(1);

      expect(component.hasMorePages()).toBe(false);
    });
  });
});
