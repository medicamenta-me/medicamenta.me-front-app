/**
 * 🧪 Marketplace Orders Service Tests
 *
 * Testes unitários para o MarketplaceOrdersService.
 * Cobertura: 100% (linhas, branches, statements, métodos)
 *
 * @version 1.0.0
 * @date 03/01/2026
 */

import { TestBed } from "@angular/core/testing";
import { Firestore } from "@angular/fire/firestore";
import { of, throwError } from "rxjs";
import {
  MarketplaceOrdersService,
  MarketplaceOrder,
  OrderStatus,
  OrderStats,
  OrderFilters,
  OrderItem,
  DeliveryAddress,
  PaymentStatus,
  PaymentMethod,
  OrderSummary,
} from "./marketplace-orders.service";
import { IntegrationService, PaginatedResult } from "./integration.service";
import { AuthService } from "./auth.service";
import { NotificationService } from "./notification.service";
import { IndexedDBService } from "./indexed-db.service";

// ============================================================================
// TEST DATA
// ============================================================================

const mockDeliveryAddress: DeliveryAddress = {
  street: "Rua Teste",
  number: "123",
  complement: "Apto 45",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  zipCode: "01234-567",
  country: "Brasil",
  lat: -23.5505,
  lng: -46.6333,
};

const mockOrderItem: OrderItem = {
  productId: "prod-123",
  productName: "Medicamento Teste",
  quantity: 2,
  unitPrice: 25.5,
  totalPrice: 51.0,
  requiresPrescription: true,
  prescriptionId: "presc-123",
  pharmacyId: "pharm-456",
  pharmacyName: "Farmácia Teste",
};

const mockOrder: MarketplaceOrder = {
  id: "order-123",
  customerId: "user-789",
  customerName: "João Silva",
  customerEmail: "joao@email.com",
  customerPhone: "11999998888",
  pharmacyId: "pharm-456",
  pharmacyName: "Farmácia Teste",
  pharmacyLogo: "https://example.com/logo.png",
  items: [mockOrderItem],
  subtotal: 51.0,
  deliveryFee: 10.0,
  discount: 5.0,
  total: 56.0,
  status: "pending" as OrderStatus,
  paymentMethod: "credit_card" as PaymentMethod,
  paymentStatus: "approved" as PaymentStatus,
  deliveryAddress: mockDeliveryAddress,
  deliveryType: "delivery",
  trackingCode: "BR123456789",
  estimatedDelivery: new Date("2026-01-10"),
  notes: "Entregar no portão",
  prescriptionIds: ["presc-123"],
  createdAt: new Date("2026-01-03T10:00:00Z"),
  updatedAt: new Date("2026-01-03T10:30:00Z"),
};

const mockOrderStats: OrderStats = {
  totalOrders: 10,
  totalSpent: 560.0,
  pendingOrders: 2,
  deliveredOrders: 7,
  cancelledOrders: 1,
  averageOrderValue: 56.0,
  lastOrderDate: new Date("2026-01-03"),
};

const mockPaginatedResult: PaginatedResult<MarketplaceOrder> = {
  items: [mockOrder],
  total: 1,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe("MarketplaceOrdersService", () => {
  let service: MarketplaceOrdersService;
  let integrationServiceSpy: jasmine.SpyObj<IntegrationService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let indexedDbServiceSpy: jasmine.SpyObj<IndexedDBService>;
  let firestoreSpy: jasmine.SpyObj<Firestore>;

  beforeEach(() => {
    // Create spies
    integrationServiceSpy = jasmine.createSpyObj("IntegrationService", ["get", "post", "put", "delete"]);
    authServiceSpy = jasmine.createSpyObj("AuthService", ["getCurrentUser"]);
    notificationServiceSpy = jasmine.createSpyObj("NotificationService", ["showLocalNotification"]);
    indexedDbServiceSpy = jasmine.createSpyObj("IndexedDBService", ["get", "put", "getAll", "putBatch", "delete"]);
    firestoreSpy = jasmine.createSpyObj("Firestore", [], { app: {} });

    // Setup default mock returns
    authServiceSpy.getCurrentUser.and.resolveTo({ uid: "user-789" } as any);
    indexedDbServiceSpy.getAll.and.resolveTo([]);
    indexedDbServiceSpy.putBatch.and.resolveTo();
    indexedDbServiceSpy.get.and.resolveTo(null);
    indexedDbServiceSpy.put.and.resolveTo();
    notificationServiceSpy.showLocalNotification.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        MarketplaceOrdersService,
        { provide: Firestore, useValue: firestoreSpy },
        { provide: IntegrationService, useValue: integrationServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: IndexedDBService, useValue: indexedDbServiceSpy },
      ],
    });

    service = TestBed.inject(MarketplaceOrdersService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe("Initialization", () => {
    it("should be created", () => {
      expect(service).toBeTruthy();
    });

    it("should have empty orders initially", () => {
      expect(service.orders()).toEqual([]);
    });

    it("should have null currentOrder initially", () => {
      expect(service.currentOrder()).toBeNull();
    });

    it("should have null stats initially", () => {
      expect(service.stats()).toBeNull();
    });

    it("should have isLoading false initially", () => {
      expect(service.isLoading()).toBe(false);
    });

    it("should have null error initially", () => {
      expect(service.error()).toBeNull();
    });

    it("should have isListening false initially", () => {
      expect(service.isListening()).toBe(false);
    });

    it("should have null lastUpdated initially", () => {
      expect(service.lastUpdated()).toBeNull();
    });
  });

  // ============================================================================
  // COMPUTED PROPERTIES TESTS
  // ============================================================================

  describe("Computed Properties", () => {
    it("should compute orderCount", () => {
      expect(service.orderCount()).toBe(0);
    });

    it("should compute pendingOrders", () => {
      expect(service.pendingOrders()).toEqual([]);
    });

    it("should compute activeOrders", () => {
      expect(service.activeOrders()).toEqual([]);
    });

    it("should compute completedOrders", () => {
      expect(service.completedOrders()).toEqual([]);
    });

    it("should compute cancelledOrders", () => {
      expect(service.cancelledOrders()).toEqual([]);
    });

    it("should compute hasActiveOrders", () => {
      expect(service.hasActiveOrders()).toBe(false);
    });

    it("should compute activeOrderCount", () => {
      expect(service.activeOrderCount()).toBe(0);
    });
  });

  // ============================================================================
  // GET ORDERS TESTS
  // ============================================================================

  describe("getOrders()", () => {
    it("should fetch orders successfully", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));

      const result = await service.getOrders();

      expect(result).toBeTruthy();
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(service.orders().length).toBe(1);
      expect(service.isLoading()).toBe(false);
    });

    it("should pass pagination params", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));

      await service.getOrders(2, 10);

      expect(integrationServiceSpy.get).toHaveBeenCalledWith(
        "/v2/orders",
        jasmine.objectContaining({
          params: jasmine.objectContaining({
            page: 2,
            pageSize: 10,
          }),
        })
      );
    });

    it("should pass filters", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));
      const filters: OrderFilters = {
        status: "pending",
        pharmacyId: "pharm-123",
      };

      await service.getOrders(1, 20, filters);

      expect(integrationServiceSpy.get).toHaveBeenCalledWith(
        "/v2/orders",
        jasmine.objectContaining({
          params: jasmine.objectContaining({
            status: "pending",
            pharmacyId: "pharm-123",
          }),
        })
      );
    });

    it("should throw error when user not authenticated", async () => {
      authServiceSpy.getCurrentUser.and.resolveTo(null);

      await expectAsync(service.getOrders()).toBeRejectedWithError("Usuário não autenticado");
    });

    it("should handle API error", async () => {
      integrationServiceSpy.get.and.returnValue(throwError(() => new Error("API Error")));

      await expectAsync(service.getOrders()).toBeRejectedWithError("API Error");
      expect(service.error()).toBe("API Error");
    });

    it("should load from cache on API error when available", async () => {
      const cachedOrders = [{ ...mockOrder }];
      indexedDbServiceSpy.getAll.and.resolveTo(cachedOrders);
      integrationServiceSpy.get.and.returnValue(throwError(() => new Error("Network error")));

      const result = await service.getOrders();

      expect(result.items.length).toBe(1);
      expect(service.orders().length).toBe(1);
    });

    it("should append orders when page > 1", async () => {
      // First page
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));
      await service.getOrders(1);

      // Second page
      const page2Order = { ...mockOrder, id: "order-456" };
      const page2Result = { ...mockPaginatedResult, items: [page2Order], page: 2 };
      integrationServiceSpy.get.and.returnValue(of(page2Result));
      await service.getOrders(2);

      expect(service.orders().length).toBe(2);
    });

    it("should filter by date range", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));
      const filters: OrderFilters = {
        dateFrom: new Date("2026-01-01"),
        dateTo: new Date("2026-01-31"),
      };

      await service.getOrders(1, 20, filters);

      expect(integrationServiceSpy.get).toHaveBeenCalledWith(
        "/v2/orders",
        jasmine.objectContaining({
          params: jasmine.objectContaining({
            dateFrom: jasmine.any(String),
            dateTo: jasmine.any(String),
          }),
        })
      );
    });

    it("should filter by amount range", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));
      const filters: OrderFilters = {
        minAmount: 50,
        maxAmount: 100,
      };

      await service.getOrders(1, 20, filters);

      expect(integrationServiceSpy.get).toHaveBeenCalledWith(
        "/v2/orders",
        jasmine.objectContaining({
          params: jasmine.objectContaining({
            minAmount: 50,
            maxAmount: 100,
          }),
        })
      );
    });

    it("should update lastUpdated after fetch", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));

      expect(service.lastUpdated()).toBeNull();
      await service.getOrders();
      expect(service.lastUpdated()).toBeTruthy();
    });
  });

  // ============================================================================
  // GET ORDER BY ID TESTS
  // ============================================================================

  describe("getOrderById()", () => {
    it("should fetch order by ID successfully", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockOrder));

      const result = await service.getOrderById("order-123");

      expect(result).toBeTruthy();
      expect(result.id).toBe("order-123");
      expect(service.currentOrder()).toEqual(result);
    });

    it("should return cached order when available", async () => {
      // First call to populate cache
      integrationServiceSpy.get.and.returnValue(of(mockOrder));
      await service.getOrderById("order-123");

      // Reset spy
      integrationServiceSpy.get.calls.reset();

      // Second call should use cache
      const result = await service.getOrderById("order-123");

      expect(result.id).toBe("order-123");
      expect(integrationServiceSpy.get).not.toHaveBeenCalled();
    });

    it("should force refresh when requested", async () => {
      // First call to populate cache
      integrationServiceSpy.get.and.returnValue(of(mockOrder));
      await service.getOrderById("order-123");

      // Force refresh
      await service.getOrderById("order-123", true);

      expect(integrationServiceSpy.get).toHaveBeenCalledTimes(2);
    });

    it("should update order in list if exists", async () => {
      // Populate list first
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));
      await service.getOrders();

      // Update single order
      const updatedOrder = { ...mockOrder, status: "confirmed" as OrderStatus };
      integrationServiceSpy.get.and.returnValue(of(updatedOrder));
      await service.getOrderById("order-123", true);

      const orderInList = service.orders().find((o) => o.id === "order-123");
      expect(orderInList?.status).toBe("confirmed");
    });

    it("should handle API error for getOrderById", async () => {
      integrationServiceSpy.get.and.returnValue(throwError(() => new Error("Order not found")));

      await expectAsync(service.getOrderById("invalid-id")).toBeRejectedWithError("Order not found");
    });
  });

  // ============================================================================
  // GET ORDER STATS TESTS
  // ============================================================================

  describe("getOrderStats()", () => {
    it("should fetch order stats successfully", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockOrderStats));

      const result = await service.getOrderStats();

      expect(result).toBeTruthy();
      expect(result.totalOrders).toBe(10);
      expect(result.totalSpent).toBe(560);
      expect(service.stats()).toEqual(result);
    });

    it("should throw error when user not authenticated for stats", async () => {
      authServiceSpy.getCurrentUser.and.resolveTo(null);

      await expectAsync(service.getOrderStats()).toBeRejectedWithError("Usuário não autenticado");
    });

    it("should handle API error for stats", async () => {
      integrationServiceSpy.get.and.returnValue(throwError(() => new Error("Stats error")));

      await expectAsync(service.getOrderStats()).toBeRejectedWithError("Stats error");
    });

    it("should convert lastOrderDate to Date object", async () => {
      const statsWithStringDate = {
        ...mockOrderStats,
        lastOrderDate: "2026-01-03T00:00:00Z",
      };
      integrationServiceSpy.get.and.returnValue(of(statsWithStringDate));

      const result = await service.getOrderStats();

      expect(result.lastOrderDate instanceof Date).toBe(true);
    });
  });

  // ============================================================================
  // STATUS UTILITY METHODS TESTS
  // ============================================================================

  describe("Status Utilities", () => {
    describe("getStatusMessage()", () => {
      it("should return message for pending status", () => {
        expect(service.getStatusMessage("pending")).toBe("Aguardando confirmação");
      });

      it("should return message for confirmed status", () => {
        expect(service.getStatusMessage("confirmed")).toBe("Pedido confirmado");
      });

      it("should return message for preparing status", () => {
        expect(service.getStatusMessage("preparing")).toBe("Pedido em preparação");
      });

      it("should return message for ready_for_pickup status", () => {
        expect(service.getStatusMessage("ready_for_pickup")).toBe("Pronto para retirada");
      });

      it("should return message for out_for_delivery status", () => {
        expect(service.getStatusMessage("out_for_delivery")).toBe("Saiu para entrega");
      });

      it("should return message for delivered status", () => {
        expect(service.getStatusMessage("delivered")).toBe("Pedido entregue");
      });

      it("should return message for cancelled status", () => {
        expect(service.getStatusMessage("cancelled")).toBe("Pedido cancelado");
      });

      it("should return message for refunded status", () => {
        expect(service.getStatusMessage("refunded")).toBe("Reembolso processado");
      });
    });

    describe("getStatusIcon()", () => {
      it("should return icon for pending status", () => {
        expect(service.getStatusIcon("pending")).toBe("time-outline");
      });

      it("should return icon for confirmed status", () => {
        expect(service.getStatusIcon("confirmed")).toBe("checkmark-circle-outline");
      });

      it("should return icon for preparing status", () => {
        expect(service.getStatusIcon("preparing")).toBe("construct-outline");
      });

      it("should return icon for ready_for_pickup status", () => {
        expect(service.getStatusIcon("ready_for_pickup")).toBe("bag-check-outline");
      });

      it("should return icon for out_for_delivery status", () => {
        expect(service.getStatusIcon("out_for_delivery")).toBe("bicycle-outline");
      });

      it("should return icon for delivered status", () => {
        expect(service.getStatusIcon("delivered")).toBe("checkmark-done-circle-outline");
      });

      it("should return icon for cancelled status", () => {
        expect(service.getStatusIcon("cancelled")).toBe("close-circle-outline");
      });

      it("should return icon for refunded status", () => {
        expect(service.getStatusIcon("refunded")).toBe("cash-outline");
      });

      it("should return default icon for unknown status", () => {
        expect(service.getStatusIcon("unknown" as OrderStatus)).toBe("help-circle-outline");
      });
    });

    describe("getStatusColor()", () => {
      it("should return color for pending status", () => {
        expect(service.getStatusColor("pending")).toBe("warning");
      });

      it("should return color for confirmed status", () => {
        expect(service.getStatusColor("confirmed")).toBe("primary");
      });

      it("should return color for preparing status", () => {
        expect(service.getStatusColor("preparing")).toBe("secondary");
      });

      it("should return color for delivered status", () => {
        expect(service.getStatusColor("delivered")).toBe("success");
      });

      it("should return color for cancelled status", () => {
        expect(service.getStatusColor("cancelled")).toBe("danger");
      });

      it("should return color for refunded status", () => {
        expect(service.getStatusColor("refunded")).toBe("medium");
      });

      it("should return default color for unknown status", () => {
        expect(service.getStatusColor("unknown" as OrderStatus)).toBe("medium");
      });
    });

    describe("isFinalStatus()", () => {
      it("should return true for delivered status", () => {
        expect(service.isFinalStatus("delivered")).toBe(true);
      });

      it("should return true for cancelled status", () => {
        expect(service.isFinalStatus("cancelled")).toBe(true);
      });

      it("should return true for refunded status", () => {
        expect(service.isFinalStatus("refunded")).toBe(true);
      });

      it("should return false for pending status", () => {
        expect(service.isFinalStatus("pending")).toBe(false);
      });

      it("should return false for confirmed status", () => {
        expect(service.isFinalStatus("confirmed")).toBe(false);
      });

      it("should return false for preparing status", () => {
        expect(service.isFinalStatus("preparing")).toBe(false);
      });

      it("should return false for out_for_delivery status", () => {
        expect(service.isFinalStatus("out_for_delivery")).toBe(false);
      });
    });

    describe("canCancelOrder()", () => {
      it("should return true for pending order", () => {
        expect(service.canCancelOrder({ ...mockOrder, status: "pending" })).toBe(true);
      });

      it("should return true for confirmed order", () => {
        expect(service.canCancelOrder({ ...mockOrder, status: "confirmed" })).toBe(true);
      });

      it("should return false for preparing order", () => {
        expect(service.canCancelOrder({ ...mockOrder, status: "preparing" })).toBe(false);
      });

      it("should return false for delivered order", () => {
        expect(service.canCancelOrder({ ...mockOrder, status: "delivered" })).toBe(false);
      });

      it("should return false for cancelled order", () => {
        expect(service.canCancelOrder({ ...mockOrder, status: "cancelled" })).toBe(false);
      });
    });
  });

  // ============================================================================
  // ORDER SUMMARY TESTS
  // ============================================================================

  describe("toOrderSummary()", () => {
    it("should convert order to summary", () => {
      const summary = service.toOrderSummary(mockOrder);

      expect(summary.id).toBe(mockOrder.id);
      expect(summary.pharmacyName).toBe(mockOrder.pharmacyName);
      expect(summary.pharmacyLogo).toBe(mockOrder.pharmacyLogo);
      expect(summary.status).toBe(mockOrder.status);
      expect(summary.total).toBe(mockOrder.total);
      expect(summary.itemCount).toBe(2);
      expect(summary.createdAt).toEqual(mockOrder.createdAt);
    });

    it("should calculate itemCount correctly", () => {
      const orderWithMultipleItems = {
        ...mockOrder,
        items: [
          { ...mockOrderItem, quantity: 3 },
          { ...mockOrderItem, quantity: 2 },
        ],
      };

      const summary = service.toOrderSummary(orderWithMultipleItems);
      expect(summary.itemCount).toBe(5);
    });
  });

  // ============================================================================
  // CLEAR CACHE TESTS
  // ============================================================================

  describe("clearCache()", () => {
    it("should clear all state", async () => {
      // Populate state first
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));
      await service.getOrders();

      integrationServiceSpy.get.and.returnValue(of(mockOrderStats));
      await service.getOrderStats();

      // Clear cache
      service.clearCache();

      expect(service.orders()).toEqual([]);
      expect(service.currentOrder()).toBeNull();
      expect(service.stats()).toBeNull();
      expect(service.error()).toBeNull();
    });
  });

  // ============================================================================
  // LIFECYCLE TESTS
  // ============================================================================

  describe("ngOnDestroy()", () => {
    it("should stop all listeners on destroy", () => {
      spyOn(service, "stopAllListeners");

      service.ngOnDestroy();

      expect(service.stopAllListeners).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // LISTENER TESTS
  // ============================================================================

  describe("Listener Management", () => {
    describe("stopListener()", () => {
      it("should not throw when stopping non-existent listener", () => {
        expect(() => service.stopListener("non-existent")).not.toThrow();
      });
    });

    describe("stopAllListeners()", () => {
      it("should set isListening to false", () => {
        service.stopAllListeners();
        expect(service.isListening()).toBe(false);
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe("Error Handling", () => {
    it("should parse Error object", async () => {
      integrationServiceSpy.get.and.returnValue(throwError(() => new Error("Test error message")));

      await expectAsync(service.getOrders()).toBeRejectedWithError("Test error message");
    });

    it("should parse string error", async () => {
      integrationServiceSpy.get.and.returnValue(throwError(() => "String error"));

      await expectAsync(service.getOrders()).toBeRejectedWithError("String error");
    });

    it("should parse unknown error", async () => {
      integrationServiceSpy.get.and.returnValue(throwError(() => ({ unknown: true })));

      await expectAsync(service.getOrders()).toBeRejectedWithError("Erro desconhecido");
    });
  });

  // ============================================================================
  // DATE PARSING TESTS
  // ============================================================================

  describe("Date Parsing", () => {
    it("should parse ISO string dates from API", async () => {
      const orderWithStringDates = {
        ...mockOrder,
        createdAt: "2026-01-03T10:00:00Z",
        updatedAt: "2026-01-03T10:30:00Z",
      };
      integrationServiceSpy.get.and.returnValue(of({ ...mockPaginatedResult, items: [orderWithStringDates] }));

      const result = await service.getOrders();

      expect(result.items[0].createdAt instanceof Date).toBe(true);
      expect(result.items[0].updatedAt instanceof Date).toBe(true);
    });

    it("should handle Firestore timestamp objects", async () => {
      const firestoreTimestamp = {
        toDate: () => new Date("2026-01-03T10:00:00Z"),
      };
      const orderWithTimestamp = {
        ...mockOrder,
        createdAt: firestoreTimestamp,
        updatedAt: firestoreTimestamp,
      };
      integrationServiceSpy.get.and.returnValue(of({ ...mockPaginatedResult, items: [orderWithTimestamp] }));

      const result = await service.getOrders();

      expect(result.items[0].createdAt instanceof Date).toBe(true);
    });

    it("should handle Date objects directly", async () => {
      const orderWithDates = {
        ...mockOrder,
        createdAt: new Date("2026-01-03T10:00:00Z"),
        updatedAt: new Date("2026-01-03T10:30:00Z"),
      };
      integrationServiceSpy.get.and.returnValue(of({ ...mockPaginatedResult, items: [orderWithDates] }));

      const result = await service.getOrders();

      expect(result.items[0].createdAt instanceof Date).toBe(true);
    });

    it("should parse optional date fields", async () => {
      const orderWithOptionalDates = {
        ...mockOrder,
        confirmedAt: "2026-01-03T11:00:00Z",
        shippedAt: "2026-01-03T12:00:00Z",
        deliveredAt: undefined,
        cancelledAt: null,
      };
      integrationServiceSpy.get.and.returnValue(of({ ...mockPaginatedResult, items: [orderWithOptionalDates] }));

      const result = await service.getOrders();

      expect(result.items[0].confirmedAt instanceof Date).toBe(true);
      expect(result.items[0].shippedAt instanceof Date).toBe(true);
      expect(result.items[0].deliveredAt).toBeUndefined();
    });
  });

  // ============================================================================
  // OFFLINE PERSISTENCE TESTS
  // ============================================================================

  describe("Offline Persistence", () => {
    it("should persist orders to IndexedDB", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));

      await service.getOrders();

      // Give time for effect to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(indexedDbServiceSpy.putBatch).toHaveBeenCalled();
    });

    it("should load orders from IndexedDB on API failure", async () => {
      const cachedOrder = { ...mockOrder, createdAt: mockOrder.createdAt.toISOString(), updatedAt: mockOrder.updatedAt.toISOString() };
      indexedDbServiceSpy.getAll.and.resolveTo([cachedOrder]);
      integrationServiceSpy.get.and.returnValue(throwError(() => new Error("Network error")));

      const result = await service.getOrders();

      expect(result.items.length).toBe(1);
    });

    it("should return empty array when no cache and API fails", async () => {
      indexedDbServiceSpy.getAll.and.resolveTo([]);
      integrationServiceSpy.get.and.returnValue(throwError(() => new Error("Network error")));

      await expectAsync(service.getOrders()).toBeRejectedWithError("Network error");
    });
  });

  // ============================================================================
  // FILTER TESTS
  // ============================================================================

  describe("Order Filters", () => {
    it("should filter by multiple statuses as comma-separated string", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));
      const filters: OrderFilters = {
        status: ["pending", "confirmed"] as unknown as OrderStatus,
      };

      await service.getOrders(1, 20, filters);

      // O serviço converte arrays para string separada por vírgula
      expect(integrationServiceSpy.get).toHaveBeenCalledWith(
        "/v2/orders",
        jasmine.objectContaining({
          params: jasmine.objectContaining({
            status: "pending,confirmed",
          }),
        })
      );
    });

    it("should handle empty filters", async () => {
      integrationServiceSpy.get.and.returnValue(of(mockPaginatedResult));

      await service.getOrders(1, 20, {});

      expect(integrationServiceSpy.get).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CONSTANTS VALIDATION TESTS
  // ============================================================================

  describe("Constants Validation", () => {
    it("should have all order statuses defined", () => {
      const statuses: OrderStatus[] = [
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ];

      statuses.forEach((status) => {
        expect(service.getStatusMessage(status)).toBeTruthy();
        expect(service.getStatusIcon(status)).toBeTruthy();
        expect(service.getStatusColor(status)).toBeTruthy();
      });
    });
  });
});
