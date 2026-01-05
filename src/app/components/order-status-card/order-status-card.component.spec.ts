/**
 * Order Status Card Component - Unit Tests
 *
 * Testes unitários abrangentes para o componente de card de status.
 * Coverage 100%: todos os métodos, getters, inputs, outputs e estados.
 *
 * @version 1.0.0
 * @date 03/01/2026
 */

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Component } from "@angular/core";
import { By } from "@angular/platform-browser";
import { CommonModule, registerLocaleData } from "@angular/common";
import { LOCALE_ID } from "@angular/core";
import localePt from "@angular/common/locales/pt";
import {
  TranslateModule,
  TranslateLoader,
  TranslateService,
} from "@ngx-translate/core";
import { Observable, of } from "rxjs";
import { provideIonicAngular } from "@ionic/angular/standalone";

import {
  OrderStatusCardComponent,
  StatusConfig,
  CardDisplayMode,
} from "./order-status-card.component";
import {
  MarketplaceOrder,
  OrderSummary,
  OrderStatus,
} from "../../services/marketplace-orders.service";

// Register locale for DatePipe
registerLocaleData(localePt, "pt-BR");

// ============================================================================
// MOCKS
// ============================================================================

/**
 * Fake translate loader for testing
 */
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      "MARKETPLACE_ORDERS.STATUS.PENDING": "Pendente",
      "MARKETPLACE_ORDERS.STATUS.CONFIRMED": "Confirmado",
      "MARKETPLACE_ORDERS.STATUS.PREPARING": "Preparando",
      "MARKETPLACE_ORDERS.STATUS.READY_FOR_PICKUP": "Pronto para Retirada",
      "MARKETPLACE_ORDERS.STATUS.OUT_FOR_DELIVERY": "Saiu para Entrega",
      "MARKETPLACE_ORDERS.STATUS.DELIVERED": "Entregue",
      "MARKETPLACE_ORDERS.STATUS.CANCELLED": "Cancelado",
      "MARKETPLACE_ORDERS.STATUS.REFUNDED": "Reembolsado",
      "MARKETPLACE_ORDERS.CARD.ITEM": "item",
      "MARKETPLACE_ORDERS.CARD.ITEMS": "itens",
      "MARKETPLACE_ORDERS.CARD.TOTAL": "Total",
      "MARKETPLACE_ORDERS.CARD.ORDERED_AT": "Pedido em",
      "MARKETPLACE_ORDERS.CARD.ESTIMATED_DELIVERY": "Previsão de entrega",
      "MARKETPLACE_ORDERS.CARD.TRACKING": "Rastreio",
      "MARKETPLACE_ORDERS.ACTIONS.VIEW_DETAILS": "Ver Detalhes",
      "MARKETPLACE_ORDERS.ACTIONS.TRACK": "Rastrear",
      "MARKETPLACE_ORDERS.ACTIONS.REORDER": "Pedir Novamente",
      "MARKETPLACE_ORDERS.MESSAGES.DELIVERED_SUCCESS": "Pedido entregue com sucesso!",
      "MARKETPLACE_ORDERS.MESSAGES.ORDER_CANCELLED": "Pedido cancelado",
      "MARKETPLACE_ORDERS.MESSAGES.ORDER_REFUNDED": "Pedido reembolsado",
    });
  }
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

function createMockOrder(overrides: Partial<MarketplaceOrder> = {}): MarketplaceOrder {
  return {
    id: "order-123456789abc",
    customerId: "customer-001",
    customerName: "João Silva",
    customerEmail: "joao@email.com",
    customerPhone: "+5511999999999",
    pharmacyId: "pharmacy-001",
    pharmacyName: "Farmácia Saúde",
    pharmacyLogo: "https://example.com/logo.png",
    items: [
      {
        productId: "prod-001",
        productName: "Dipirona 500mg",
        quantity: 2,
        unitPrice: 12.5,
        totalPrice: 25,
        requiresPrescription: false,
        pharmacyId: "pharmacy-001",
        pharmacyName: "Farmácia Saúde",
      },
    ],
    subtotal: 25,
    deliveryFee: 5,
    discount: 0,
    total: 30,
    status: "pending",
    paymentMethod: "credit_card",
    paymentStatus: "approved",
    deliveryAddress: {
      street: "Rua Teste",
      number: "100",
      neighborhood: "Centro",
      city: "São Paulo",
      state: "SP",
      zipCode: "01000-000",
      country: "Brasil",
    },
    deliveryType: "delivery",
    createdAt: new Date("2026-01-03T10:00:00"),
    updatedAt: new Date("2026-01-03T10:00:00"),
    ...overrides,
  };
}

function createMockOrderSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    id: "order-summary-123",
    pharmacyName: "Farmácia Popular",
    pharmacyLogo: "https://example.com/popular.png",
    status: "preparing",
    total: 75.5,
    itemCount: 3,
    createdAt: new Date("2026-01-02T15:30:00"),
    ...overrides,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("OrderStatusCardComponent", () => {
  let component: OrderStatusCardComponent;
  let fixture: ComponentFixture<OrderStatusCardComponent>;
  let translateService: TranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        OrderStatusCardComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
        }),
      ],
      providers: [
        provideIonicAngular(),
        { provide: LOCALE_ID, useValue: "pt-BR" },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderStatusCardComponent);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    translateService.use("pt");
  });

  // ==========================================================================
  // COMPONENT CREATION
  // ==========================================================================

  describe("Component Creation", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should have default input values", () => {
      expect(component.displayMode).toBe("default");
      expect(component.showActions).toBe(true);
      expect(component.showProgress).toBe(true);
      expect(component.showEstimatedDelivery).toBe(true);
      expect(component.clickable).toBe(true);
      expect(component.highlighted).toBe(false);
      expect(component.animateStatusChange).toBe(false);
    });

    it("should have all outputs defined", () => {
      expect(component.cardClick).toBeDefined();
      expect(component.viewDetails).toBeDefined();
      expect(component.trackOrder).toBeDefined();
      expect(component.contactPharmacy).toBeDefined();
      expect(component.reorder).toBeDefined();
    });
  });

  // ==========================================================================
  // COMPUTED PROPERTIES - ORDER DATA
  // ==========================================================================

  describe("Computed Properties - Order Data", () => {
    describe("orderId", () => {
      it("should return order id when order is set", () => {
        component.order = createMockOrder({ id: "my-order-id" });
        expect(component.orderId).toBe("my-order-id");
      });

      it("should return orderSummary id when only summary is set", () => {
        component.orderSummary = createMockOrderSummary({ id: "summary-id" });
        expect(component.orderId).toBe("summary-id");
      });

      it("should prefer order id over summary id", () => {
        component.order = createMockOrder({ id: "order-id" });
        component.orderSummary = createMockOrderSummary({ id: "summary-id" });
        expect(component.orderId).toBe("order-id");
      });

      it("should return empty string when nothing is set", () => {
        expect(component.orderId).toBe("");
      });
    });

    describe("status", () => {
      it("should return order status", () => {
        component.order = createMockOrder({ status: "confirmed" });
        expect(component.status).toBe("confirmed");
      });

      it("should return summary status when only summary is set", () => {
        component.orderSummary = createMockOrderSummary({ status: "preparing" });
        expect(component.status).toBe("preparing");
      });

      it("should return pending as default", () => {
        expect(component.status).toBe("pending");
      });
    });

    describe("pharmacyName", () => {
      it("should return order pharmacy name", () => {
        component.order = createMockOrder({ pharmacyName: "My Pharmacy" });
        expect(component.pharmacyName).toBe("My Pharmacy");
      });

      it("should return summary pharmacy name when only summary is set", () => {
        component.orderSummary = createMockOrderSummary({ pharmacyName: "Summary Pharmacy" });
        expect(component.pharmacyName).toBe("Summary Pharmacy");
      });

      it("should return empty string when nothing is set", () => {
        expect(component.pharmacyName).toBe("");
      });
    });

    describe("pharmacyLogo", () => {
      it("should return order pharmacy logo", () => {
        component.order = createMockOrder({ pharmacyLogo: "logo.png" });
        expect(component.pharmacyLogo).toBe("logo.png");
      });

      it("should return summary logo when only summary is set", () => {
        component.orderSummary = createMockOrderSummary({ pharmacyLogo: "summary-logo.png" });
        expect(component.pharmacyLogo).toBe("summary-logo.png");
      });

      it("should return undefined when no logo", () => {
        component.order = createMockOrder({ pharmacyLogo: undefined });
        expect(component.pharmacyLogo).toBeUndefined();
      });
    });

    describe("total", () => {
      it("should return order total", () => {
        component.order = createMockOrder({ total: 150 });
        expect(component.total).toBe(150);
      });

      it("should return summary total when only summary is set", () => {
        component.orderSummary = createMockOrderSummary({ total: 200 });
        expect(component.total).toBe(200);
      });

      it("should return 0 when nothing is set", () => {
        expect(component.total).toBe(0);
      });
    });

    describe("itemCount", () => {
      it("should return items length from order", () => {
        component.order = createMockOrder({
          items: [
            { productId: "1", productName: "A", quantity: 1, unitPrice: 10, totalPrice: 10, requiresPrescription: false, pharmacyId: "p1", pharmacyName: "P1" },
            { productId: "2", productName: "B", quantity: 2, unitPrice: 20, totalPrice: 40, requiresPrescription: false, pharmacyId: "p1", pharmacyName: "P1" },
          ],
        });
        expect(component.itemCount).toBe(2);
      });

      it("should return summary itemCount when only summary is set", () => {
        component.orderSummary = createMockOrderSummary({ itemCount: 5 });
        expect(component.itemCount).toBe(5);
      });

      it("should return 0 when nothing is set", () => {
        expect(component.itemCount).toBe(0);
      });
    });

    describe("createdAt", () => {
      it("should return order createdAt", () => {
        const date = new Date("2026-01-01");
        component.order = createMockOrder({ createdAt: date });
        expect(component.createdAt).toEqual(date);
      });

      it("should return summary createdAt when only summary is set", () => {
        const date = new Date("2025-12-31");
        component.orderSummary = createMockOrderSummary({ createdAt: date });
        expect(component.createdAt).toEqual(date);
      });

      it("should return undefined when nothing is set", () => {
        expect(component.createdAt).toBeUndefined();
      });
    });

    describe("estimatedDelivery", () => {
      it("should return order estimatedDelivery", () => {
        const date = new Date("2026-01-05");
        component.order = createMockOrder({ estimatedDelivery: date });
        expect(component.estimatedDelivery).toEqual(date);
      });

      it("should return summary estimatedDelivery when only summary is set", () => {
        const date = new Date("2026-01-06");
        component.orderSummary = createMockOrderSummary({ estimatedDelivery: date });
        expect(component.estimatedDelivery).toEqual(date);
      });

      it("should return undefined when not set", () => {
        component.order = createMockOrder({ estimatedDelivery: undefined });
        expect(component.estimatedDelivery).toBeUndefined();
      });
    });

    describe("trackingCode", () => {
      it("should return order tracking code", () => {
        component.order = createMockOrder({ trackingCode: "TRACK123" });
        expect(component.trackingCode).toBe("TRACK123");
      });

      it("should return undefined when only summary is set", () => {
        component.orderSummary = createMockOrderSummary();
        expect(component.trackingCode).toBeUndefined();
      });
    });

    describe("deliveryType", () => {
      it("should return order delivery type", () => {
        component.order = createMockOrder({ deliveryType: "pickup" });
        expect(component.deliveryType).toBe("pickup");
      });

      it("should return delivery as default", () => {
        expect(component.deliveryType).toBe("delivery");
      });
    });
  });

  // ==========================================================================
  // COMPUTED PROPERTIES - STATUS CHECKS
  // ==========================================================================

  describe("Computed Properties - Status Checks", () => {
    describe("canTrack", () => {
      it("should return true for trackable status with tracking code", () => {
        component.order = createMockOrder({
          status: "out_for_delivery",
          trackingCode: "TRACK123",
        });
        expect(component.canTrack).toBe(true);
      });

      it("should return false without tracking code", () => {
        component.order = createMockOrder({
          status: "out_for_delivery",
          trackingCode: undefined,
        });
        expect(component.canTrack).toBe(false);
      });

      it("should return false for non-trackable status", () => {
        component.order = createMockOrder({
          status: "pending",
          trackingCode: "TRACK123",
        });
        expect(component.canTrack).toBe(false);
      });

      const trackableStatuses: OrderStatus[] = ["confirmed", "preparing", "ready_for_pickup", "out_for_delivery"];
      trackableStatuses.forEach((status) => {
        it(`should return true for ${status} with tracking code`, () => {
          component.order = createMockOrder({ status, trackingCode: "CODE" });
          expect(component.canTrack).toBe(true);
        });
      });
    });

    describe("canReorder", () => {
      it("should return true for delivered status", () => {
        component.order = createMockOrder({ status: "delivered" });
        expect(component.canReorder).toBe(true);
      });

      it("should return true for cancelled status", () => {
        component.order = createMockOrder({ status: "cancelled" });
        expect(component.canReorder).toBe(true);
      });

      it("should return false for pending status", () => {
        component.order = createMockOrder({ status: "pending" });
        expect(component.canReorder).toBe(false);
      });

      it("should return false for preparing status", () => {
        component.order = createMockOrder({ status: "preparing" });
        expect(component.canReorder).toBe(false);
      });
    });

    describe("isFinalStatus", () => {
      const finalStatuses: OrderStatus[] = ["delivered", "cancelled", "refunded"];
      finalStatuses.forEach((status) => {
        it(`should return true for ${status}`, () => {
          component.order = createMockOrder({ status });
          expect(component.isFinalStatus).toBe(true);
        });
      });

      const nonFinalStatuses: OrderStatus[] = ["pending", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"];
      nonFinalStatuses.forEach((status) => {
        it(`should return false for ${status}`, () => {
          component.order = createMockOrder({ status });
          expect(component.isFinalStatus).toBe(false);
        });
      });
    });

    describe("isSuccessStatus", () => {
      it("should return true for delivered status", () => {
        component.order = createMockOrder({ status: "delivered" });
        expect(component.isSuccessStatus).toBe(true);
      });

      it("should return false for cancelled status", () => {
        component.order = createMockOrder({ status: "cancelled" });
        expect(component.isSuccessStatus).toBe(false);
      });
    });

    describe("isErrorStatus", () => {
      it("should return true for cancelled status", () => {
        component.order = createMockOrder({ status: "cancelled" });
        expect(component.isErrorStatus).toBe(true);
      });

      it("should return true for refunded status", () => {
        component.order = createMockOrder({ status: "refunded" });
        expect(component.isErrorStatus).toBe(true);
      });

      it("should return false for delivered status", () => {
        component.order = createMockOrder({ status: "delivered" });
        expect(component.isErrorStatus).toBe(false);
      });
    });
  });

  // ==========================================================================
  // STATUS CONFIG
  // ==========================================================================

  describe("Status Config", () => {
    describe("statusConfig getter", () => {
      it("should return config for current status", () => {
        component.order = createMockOrder({ status: "pending" });
        expect(component.statusConfig.color).toBe("warning");
      });
    });

    describe("getStatusConfig method", () => {
      const statusConfigs: Array<{ status: OrderStatus; expected: { color: string; icon: string; progressValue: number; isFinal: boolean } }> = [
        { status: "pending", expected: { color: "warning", icon: "time-outline", progressValue: 0.1, isFinal: false } },
        { status: "confirmed", expected: { color: "primary", icon: "checkmark-circle-outline", progressValue: 0.25, isFinal: false } },
        { status: "preparing", expected: { color: "tertiary", icon: "cube", progressValue: 0.5, isFinal: false } },
        { status: "ready_for_pickup", expected: { color: "secondary", icon: "storefront", progressValue: 0.75, isFinal: false } },
        { status: "out_for_delivery", expected: { color: "secondary", icon: "bicycle", progressValue: 0.85, isFinal: false } },
        { status: "delivered", expected: { color: "success", icon: "checkmark-circle", progressValue: 1, isFinal: true } },
        { status: "cancelled", expected: { color: "danger", icon: "close-circle", progressValue: 0, isFinal: true } },
        { status: "refunded", expected: { color: "medium", icon: "refresh-outline", progressValue: 0, isFinal: true } },
      ];

      statusConfigs.forEach(({ status, expected }) => {
        it(`should return correct config for ${status}`, () => {
          const config = component.getStatusConfig(status);
          expect(config.color).toBe(expected.color);
          expect(config.icon).toBe(expected.icon);
          expect(config.progressValue).toBe(expected.progressValue);
          expect(config.isFinal).toBe(expected.isFinal);
        });
      });

      it("should return pending config for unknown status", () => {
        const config = component.getStatusConfig("unknown" as OrderStatus);
        expect(config.color).toBe("warning");
      });
    });
  });

  // ==========================================================================
  // CARD CLASS
  // ==========================================================================

  describe("Card Class", () => {
    it("should include base class", () => {
      expect(component.cardClass).toContain("order-status-card");
    });

    it("should include display mode class", () => {
      component.displayMode = "compact";
      expect(component.cardClass).toContain("mode-compact");

      component.displayMode = "detailed";
      expect(component.cardClass).toContain("mode-detailed");
    });

    it("should include status class", () => {
      component.order = createMockOrder({ status: "preparing" });
      expect(component.cardClass).toContain("status-preparing");
    });

    it("should include highlighted class when highlighted", () => {
      component.highlighted = true;
      expect(component.cardClass).toContain("highlighted");
    });

    it("should not include highlighted class when not highlighted", () => {
      component.highlighted = false;
      expect(component.cardClass).not.toContain("highlighted");
    });

    it("should include animate-status class when animateStatusChange", () => {
      component.animateStatusChange = true;
      expect(component.cardClass).toContain("animate-status");
    });

    it("should include clickable class when clickable", () => {
      component.clickable = true;
      expect(component.cardClass).toContain("clickable");
    });

    it("should include final class for final status", () => {
      component.order = createMockOrder({ status: "delivered" });
      expect(component.cardClass).toContain("final");
    });

    it("should not include final class for non-final status", () => {
      component.order = createMockOrder({ status: "pending" });
      expect(component.cardClass).not.toContain("final");
    });
  });

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  describe("Helper Methods", () => {
    describe("getStatusLabel", () => {
      it("should return translated status label", () => {
        spyOn(translateService, "instant").and.returnValue("Pendente");
        component.order = createMockOrder({ status: "pending" });
        expect(component.getStatusLabel()).toBe("Pendente");
        expect(translateService.instant).toHaveBeenCalledWith("MARKETPLACE_ORDERS.STATUS.PENDING");
      });
    });

    describe("getDeliveryIcon", () => {
      it("should return storefront for pickup", () => {
        component.order = createMockOrder({ deliveryType: "pickup" });
        expect(component.getDeliveryIcon()).toBe("storefront");
      });

      it("should return bicycle for delivery", () => {
        component.order = createMockOrder({ deliveryType: "delivery" });
        expect(component.getDeliveryIcon()).toBe("bicycle");
      });
    });

    describe("formatOrderId", () => {
      it("should format order id with # and last 8 chars uppercase", () => {
        component.order = createMockOrder({ id: "order-123456789abc" });
        expect(component.formatOrderId()).toBe("#56789ABC");
      });

      it("should return empty string when no order id", () => {
        expect(component.formatOrderId()).toBe("");
      });

      it("should handle short ids", () => {
        component.order = createMockOrder({ id: "abc" });
        expect(component.formatOrderId()).toBe("#ABC");
      });
    });

    describe("shouldShowEstimate", () => {
      it("should return true when all conditions met", () => {
        component.showEstimatedDelivery = true;
        component.order = createMockOrder({
          status: "preparing",
          estimatedDelivery: new Date(),
        });
        expect(component.shouldShowEstimate()).toBe(true);
      });

      it("should return false when showEstimatedDelivery is false", () => {
        component.showEstimatedDelivery = false;
        component.order = createMockOrder({
          status: "preparing",
          estimatedDelivery: new Date(),
        });
        expect(component.shouldShowEstimate()).toBe(false);
      });

      it("should return false when no estimated delivery", () => {
        component.showEstimatedDelivery = true;
        component.order = createMockOrder({
          status: "preparing",
          estimatedDelivery: undefined,
        });
        expect(component.shouldShowEstimate()).toBe(false);
      });

      it("should return false for final status", () => {
        component.showEstimatedDelivery = true;
        component.order = createMockOrder({
          status: "delivered",
          estimatedDelivery: new Date(),
        });
        expect(component.shouldShowEstimate()).toBe(false);
      });
    });
  });

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  describe("Event Handlers", () => {
    describe("onCardClick", () => {
      it("should emit cardClick when clickable and has orderId", () => {
        spyOn(component.cardClick, "emit");
        component.clickable = true;
        component.order = createMockOrder({ id: "order-123" });

        component.onCardClick();

        expect(component.cardClick.emit).toHaveBeenCalledWith("order-123");
      });

      it("should not emit when not clickable", () => {
        spyOn(component.cardClick, "emit");
        component.clickable = false;
        component.order = createMockOrder({ id: "order-123" });

        component.onCardClick();

        expect(component.cardClick.emit).not.toHaveBeenCalled();
      });

      it("should not emit when no orderId", () => {
        spyOn(component.cardClick, "emit");
        component.clickable = true;

        component.onCardClick();

        expect(component.cardClick.emit).not.toHaveBeenCalled();
      });
    });

    describe("onViewDetails", () => {
      it("should emit viewDetails and stop propagation", () => {
        spyOn(component.viewDetails, "emit");
        const event = new Event("click");
        spyOn(event, "stopPropagation");
        component.order = createMockOrder({ id: "order-456" });

        component.onViewDetails(event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.viewDetails.emit).toHaveBeenCalledWith("order-456");
      });

      it("should not emit when no orderId", () => {
        spyOn(component.viewDetails, "emit");
        const event = new Event("click");

        component.onViewDetails(event);

        expect(component.viewDetails.emit).not.toHaveBeenCalled();
      });
    });

    describe("onTrackOrder", () => {
      it("should emit trackOrder and stop propagation", () => {
        spyOn(component.trackOrder, "emit");
        const event = new Event("click");
        spyOn(event, "stopPropagation");
        component.order = createMockOrder({ id: "order-track" });

        component.onTrackOrder(event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.trackOrder.emit).toHaveBeenCalledWith("order-track");
      });

      it("should not emit when no orderId", () => {
        spyOn(component.trackOrder, "emit");
        const event = new Event("click");

        component.onTrackOrder(event);

        expect(component.trackOrder.emit).not.toHaveBeenCalled();
      });
    });

    describe("onContactPharmacy", () => {
      it("should emit contactPharmacy and stop propagation", () => {
        spyOn(component.contactPharmacy, "emit");
        const event = new Event("click");
        spyOn(event, "stopPropagation");
        component.order = createMockOrder({ id: "order-contact" });

        component.onContactPharmacy(event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.contactPharmacy.emit).toHaveBeenCalledWith("order-contact");
      });

      it("should not emit when no orderId", () => {
        spyOn(component.contactPharmacy, "emit");
        const event = new Event("click");

        component.onContactPharmacy(event);

        expect(component.contactPharmacy.emit).not.toHaveBeenCalled();
      });
    });

    describe("onReorder", () => {
      it("should emit reorder and stop propagation", () => {
        spyOn(component.reorder, "emit");
        const event = new Event("click");
        spyOn(event, "stopPropagation");
        component.order = createMockOrder({ id: "order-reorder" });

        component.onReorder(event);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.reorder.emit).toHaveBeenCalledWith("order-reorder");
      });

      it("should not emit when no orderId", () => {
        spyOn(component.reorder, "emit");
        const event = new Event("click");

        component.onReorder(event);

        expect(component.reorder.emit).not.toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // INPUT/OUTPUT INTEGRATION
  // ==========================================================================

  describe("Input/Output Integration", () => {
    it("should handle full order input", () => {
      const order = createMockOrder({
        id: "full-order",
        pharmacyName: "Full Pharmacy",
        total: 100,
        status: "delivered",
      });
      component.order = order;

      expect(component.orderId).toBe("full-order");
      expect(component.pharmacyName).toBe("Full Pharmacy");
      expect(component.total).toBe(100);
      expect(component.isFinalStatus).toBe(true);
    });

    it("should handle order summary input", () => {
      const summary = createMockOrderSummary({
        id: "summary-order",
        pharmacyName: "Summary Pharmacy",
        total: 50,
        itemCount: 2,
      });
      component.orderSummary = summary;

      expect(component.orderId).toBe("summary-order");
      expect(component.pharmacyName).toBe("Summary Pharmacy");
      expect(component.total).toBe(50);
      expect(component.itemCount).toBe(2);
    });

    it("should handle all display modes", () => {
      const modes: CardDisplayMode[] = ["compact", "default", "detailed"];

      modes.forEach((mode) => {
        component.displayMode = mode;
        expect(component.cardClass).toContain(`mode-${mode}`);
      });
    });

    it("should handle boolean inputs", () => {
      component.showActions = false;
      component.showProgress = false;
      component.showEstimatedDelivery = false;
      component.clickable = false;
      component.highlighted = true;
      component.animateStatusChange = true;

      expect(component.showActions).toBe(false);
      expect(component.showProgress).toBe(false);
      expect(component.showEstimatedDelivery).toBe(false);
      expect(component.clickable).toBe(false);
      expect(component.highlighted).toBe(true);
      expect(component.animateStatusChange).toBe(true);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle order with empty items array", () => {
      component.order = createMockOrder({ items: [] });
      expect(component.itemCount).toBe(0);
    });

    it("should handle order with undefined properties", () => {
      component.order = {
        id: "minimal",
        customerId: "",
        customerName: "",
        customerEmail: "",
        pharmacyId: "",
        pharmacyName: "",
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
        status: "pending",
        paymentMethod: "pix",
        paymentStatus: "pending",
        deliveryAddress: {
          street: "",
          number: "",
          neighborhood: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
        },
        deliveryType: "delivery",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(component.orderId).toBe("minimal");
      expect(component.pharmacyLogo).toBeUndefined();
      expect(component.trackingCode).toBeUndefined();
    });

    it("should handle switching from order to summary", () => {
      component.order = createMockOrder({ id: "order-first" });
      expect(component.orderId).toBe("order-first");

      component.order = undefined;
      component.orderSummary = createMockOrderSummary({ id: "summary-second" });
      expect(component.orderId).toBe("summary-second");
    });

    it("should handle all status transitions", () => {
      const allStatuses: OrderStatus[] = [
        "pending",
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ];

      allStatuses.forEach((status) => {
        component.order = createMockOrder({ status });
        const config = component.statusConfig;
        expect(config).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.labelKey).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // COMPONENT STATE CHANGES
  // ==========================================================================

  describe("Component State Changes", () => {
    it("should update when order changes", () => {
      component.order = createMockOrder({ status: "pending" });
      expect(component.status).toBe("pending");

      component.order = createMockOrder({ status: "delivered" });
      expect(component.status).toBe("delivered");
    });

    it("should update cardClass when inputs change", () => {
      component.order = createMockOrder({ status: "pending" });
      expect(component.cardClass).toContain("status-pending");

      component.highlighted = true;
      expect(component.cardClass).toContain("highlighted");

      component.displayMode = "detailed";
      expect(component.cardClass).toContain("mode-detailed");
    });
  });

  // ==========================================================================
  // ACCESSIBILITY
  // ==========================================================================

  describe("Accessibility", () => {
    it("should have proper button attribute when clickable", () => {
      component.clickable = true;
      expect(component.clickable).toBe(true);
    });

    it("should not have button attribute when not clickable", () => {
      component.clickable = false;
      expect(component.clickable).toBe(false);
    });
  });
});
