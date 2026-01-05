/**
 * 📦 Order Status Card Component
 *
 * Componente visual para exibir o status de um pedido do Marketplace.
 * Mostra informações resumidas do pedido com indicadores visuais de status.
 *
 * Features:
 * - Exibição visual de status com cores e ícones
 * - Progress indicator para status de entrega
 * - Ações rápidas (ver detalhes, rastrear)
 * - Animações de transição de status
 * - Suporte a dark mode
 * - Totalmente responsivo
 *
 * Princípios SOLID:
 * - S: Apenas exibição de card de status de pedido
 * - O: Extensível via inputs para customização
 * - L: Interface consistente com outros cards
 * - I: Outputs específicos para cada ação
 * - D: Depende apenas de interfaces de dados
 *
 * @version 1.0.0
 * @date 03/01/2026
 * @author AI Assistant
 */

import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { CommonModule, CurrencyPipe, DatePipe } from "@angular/common";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonChip,
  IonIcon,
  IonButton,
  IonBadge,
  IonRippleEffect,
  IonAvatar,
  IonLabel,
  IonItem,
  IonText,
  IonProgressBar,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  timeOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  alertCircle,
  closeCircle,
  cube,
  car,
  storefront,
  bicycle,
  location,
  chevronForward,
  receiptOutline,
  refreshOutline,
  chatbubbleOutline,
  callOutline,
  navigateOutline,
} from "ionicons/icons";
import { OrderStatus, OrderSummary, MarketplaceOrder } from "../../services/marketplace-orders.service";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuração visual de status
 */
export interface StatusConfig {
  color: string;
  icon: string;
  labelKey: string;
  progressValue: number;
  isActive: boolean;
  isFinal: boolean;
}

/**
 * Display modes do card
 */
export type CardDisplayMode = "compact" | "default" | "detailed";

// ============================================================================
// COMPONENT
// ============================================================================

@Component({
  selector: "app-order-status-card",
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CurrencyPipe,
    DatePipe,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonChip,
    IonIcon,
    IonButton,
    IonBadge,
    IonRippleEffect,
    IonAvatar,
    IonLabel,
    IonItem,
    IonText,
    IonProgressBar,
  ],
  templateUrl: "./order-status-card.component.html",
  styleUrls: ["./order-status-card.component.scss"],
})
export class OrderStatusCardComponent {
  // ============================================================================
  // INPUTS
  // ============================================================================

  /** Pedido completo */
  @Input() order?: MarketplaceOrder;

  /** Resumo do pedido (alternativa ao order completo) */
  @Input() orderSummary?: OrderSummary;

  /** Modo de exibição */
  @Input() displayMode: CardDisplayMode = "default";

  /** Mostrar ações */
  @Input() showActions = true;

  /** Mostrar progress bar */
  @Input() showProgress = true;

  /** Mostrar estimativa de entrega */
  @Input() showEstimatedDelivery = true;

  /** Habilitar click no card */
  @Input() clickable = true;

  /** Destacar card (ex: novo pedido) */
  @Input() highlighted = false;

  /** Animação de status alterado */
  @Input() animateStatusChange = false;

  // ============================================================================
  // OUTPUTS
  // ============================================================================

  /** Evento de click no card */
  @Output() cardClick = new EventEmitter<string>();

  /** Evento de click em ver detalhes */
  @Output() viewDetails = new EventEmitter<string>();

  /** Evento de click em rastrear */
  @Output() trackOrder = new EventEmitter<string>();

  /** Evento de click em contato */
  @Output() contactPharmacy = new EventEmitter<string>();

  /** Evento de click em reordenar */
  @Output() reorder = new EventEmitter<string>();

  // ============================================================================
  // INJECTED SERVICES
  // ============================================================================

  private readonly translateService = inject(TranslateService);

  // ============================================================================
  // CONSTRUCTOR
  // ============================================================================

  constructor() {
    addIcons({
      timeOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      alertCircle,
      closeCircle,
      cube,
      car,
      storefront,
      bicycle,
      location,
      chevronForward,
      receiptOutline,
      refreshOutline,
      chatbubbleOutline,
      callOutline,
      navigateOutline,
    });
  }

  // ============================================================================
  // COMPUTED PROPERTIES
  // ============================================================================

  /**
   * ID do pedido
   */
  get orderId(): string {
    return this.order?.id ?? this.orderSummary?.id ?? "";
  }

  /**
   * Status do pedido
   */
  get status(): OrderStatus {
    return this.order?.status ?? this.orderSummary?.status ?? "pending";
  }

  /**
   * Nome da farmácia
   */
  get pharmacyName(): string {
    return this.order?.pharmacyName ?? this.orderSummary?.pharmacyName ?? "";
  }

  /**
   * Logo da farmácia
   */
  get pharmacyLogo(): string | undefined {
    return this.order?.pharmacyLogo ?? this.orderSummary?.pharmacyLogo;
  }

  /**
   * Total do pedido
   */
  get total(): number {
    return this.order?.total ?? this.orderSummary?.total ?? 0;
  }

  /**
   * Quantidade de itens
   */
  get itemCount(): number {
    return this.order?.items?.length ?? this.orderSummary?.itemCount ?? 0;
  }

  /**
   * Data de criação
   */
  get createdAt(): Date | undefined {
    return this.order?.createdAt ?? this.orderSummary?.createdAt;
  }

  /**
   * Estimativa de entrega
   */
  get estimatedDelivery(): Date | undefined {
    return this.order?.estimatedDelivery ?? this.orderSummary?.estimatedDelivery;
  }

  /**
   * Código de rastreio
   */
  get trackingCode(): string | undefined {
    return this.order?.trackingCode;
  }

  /**
   * Tipo de entrega
   */
  get deliveryType(): "delivery" | "pickup" {
    return this.order?.deliveryType ?? "delivery";
  }

  /**
   * Pode rastrear pedido
   */
  get canTrack(): boolean {
    const trackableStatuses: OrderStatus[] = [
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "out_for_delivery",
    ];
    return trackableStatuses.includes(this.status) && !!this.trackingCode;
  }

  /**
   * Pode reordenar
   */
  get canReorder(): boolean {
    const reorderableStatuses: OrderStatus[] = ["delivered", "cancelled"];
    return reorderableStatuses.includes(this.status);
  }

  /**
   * É status final
   */
  get isFinalStatus(): boolean {
    const finalStatuses: OrderStatus[] = ["delivered", "cancelled", "refunded"];
    return finalStatuses.includes(this.status);
  }

  /**
   * É status de sucesso
   */
  get isSuccessStatus(): boolean {
    return this.status === "delivered";
  }

  /**
   * É status de erro/cancelamento
   */
  get isErrorStatus(): boolean {
    return this.status === "cancelled" || this.status === "refunded";
  }

  /**
   * Configuração do status atual
   */
  get statusConfig(): StatusConfig {
    return this.getStatusConfig(this.status);
  }

  /**
   * Classe CSS do card
   */
  get cardClass(): string {
    const classes = ["order-status-card", `mode-${this.displayMode}`, `status-${this.status}`];

    if (this.highlighted) {
      classes.push("highlighted");
    }

    if (this.animateStatusChange) {
      classes.push("animate-status");
    }

    if (this.clickable) {
      classes.push("clickable");
    }

    if (this.isFinalStatus) {
      classes.push("final");
    }

    return classes.join(" ");
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Obtém configuração visual para um status
   */
  getStatusConfig(status: OrderStatus): StatusConfig {
    const configs: Record<OrderStatus, StatusConfig> = {
      pending: {
        color: "warning",
        icon: "time-outline",
        labelKey: "MARKETPLACE_ORDERS.STATUS.PENDING",
        progressValue: 0.1,
        isActive: true,
        isFinal: false,
      },
      confirmed: {
        color: "primary",
        icon: "checkmark-circle-outline",
        labelKey: "MARKETPLACE_ORDERS.STATUS.CONFIRMED",
        progressValue: 0.25,
        isActive: true,
        isFinal: false,
      },
      preparing: {
        color: "tertiary",
        icon: "cube",
        labelKey: "MARKETPLACE_ORDERS.STATUS.PREPARING",
        progressValue: 0.5,
        isActive: true,
        isFinal: false,
      },
      ready_for_pickup: {
        color: "secondary",
        icon: "storefront",
        labelKey: "MARKETPLACE_ORDERS.STATUS.READY_FOR_PICKUP",
        progressValue: 0.75,
        isActive: true,
        isFinal: false,
      },
      out_for_delivery: {
        color: "secondary",
        icon: "bicycle",
        labelKey: "MARKETPLACE_ORDERS.STATUS.OUT_FOR_DELIVERY",
        progressValue: 0.85,
        isActive: true,
        isFinal: false,
      },
      delivered: {
        color: "success",
        icon: "checkmark-circle",
        labelKey: "MARKETPLACE_ORDERS.STATUS.DELIVERED",
        progressValue: 1,
        isActive: false,
        isFinal: true,
      },
      cancelled: {
        color: "danger",
        icon: "close-circle",
        labelKey: "MARKETPLACE_ORDERS.STATUS.CANCELLED",
        progressValue: 0,
        isActive: false,
        isFinal: true,
      },
      refunded: {
        color: "medium",
        icon: "refresh-outline",
        labelKey: "MARKETPLACE_ORDERS.STATUS.REFUNDED",
        progressValue: 0,
        isActive: false,
        isFinal: true,
      },
    };

    return configs[status] ?? configs.pending;
  }

  /**
   * Traduz o status
   */
  getStatusLabel(): string {
    return this.translateService.instant(this.statusConfig.labelKey);
  }

  /**
   * Obtém ícone de entrega
   */
  getDeliveryIcon(): string {
    return this.deliveryType === "pickup" ? "storefront" : "bicycle";
  }

  /**
   * Formata o ID do pedido (últimos 8 caracteres)
   */
  formatOrderId(): string {
    if (!this.orderId) return "";
    return `#${this.orderId.slice(-8).toUpperCase()}`;
  }

  /**
   * Verifica se deve mostrar estimativa
   */
  shouldShowEstimate(): boolean {
    return this.showEstimatedDelivery && !!this.estimatedDelivery && !this.isFinalStatus;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handler de click no card
   */
  onCardClick(): void {
    if (this.clickable && this.orderId) {
      this.cardClick.emit(this.orderId);
    }
  }

  /**
   * Handler de click em ver detalhes
   */
  onViewDetails(event: Event): void {
    event.stopPropagation();
    if (this.orderId) {
      this.viewDetails.emit(this.orderId);
    }
  }

  /**
   * Handler de click em rastrear
   */
  onTrackOrder(event: Event): void {
    event.stopPropagation();
    if (this.orderId) {
      this.trackOrder.emit(this.orderId);
    }
  }

  /**
   * Handler de click em contato
   */
  onContactPharmacy(event: Event): void {
    event.stopPropagation();
    if (this.orderId) {
      this.contactPharmacy.emit(this.orderId);
    }
  }

  /**
   * Handler de click em reordenar
   */
  onReorder(event: Event): void {
    event.stopPropagation();
    if (this.orderId) {
      this.reorder.emit(this.orderId);
    }
  }
}
