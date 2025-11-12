import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  informationCircleOutline,
  chevronForwardOutline,
  trophyOutline,
  warningOutline,
  closeCircleOutline,
  thumbsUpOutline,
  timeOutline,
  calendarOutline,
  cubeOutline,
  trendingUpOutline,
  trendingDownOutline,
  medicalOutline,
  arrowForwardOutline
} from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';
import { Insight } from '../../services/dashboard-insights.service';

@Component({
  selector: 'app-insights-card',
  templateUrl: './insights-card.component.html',
  styleUrls: ['./insights-card.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    TranslateModule
  ]
})
export class InsightsCardComponent {
  private readonly router = inject(Router);

  @Input() insights: Insight[] = [];
  @Input() maxVisible: number = 5;
  @Output() insightDismissed = new EventEmitter<string>();
  @Output() insightAction = new EventEmitter<Insight>();

  constructor() {
    addIcons({
      alertCircleOutline,
      informationCircleOutline,
      chevronForwardOutline,
      trophyOutline,
      warningOutline,
      closeCircleOutline,
      thumbsUpOutline,
      timeOutline,
      calendarOutline,
      cubeOutline,
      trendingUpOutline,
      trendingDownOutline,
      medicalOutline,
      arrowForwardOutline
    });
  }

  /**
   * Obter insights visíveis (limitados)
   */
  get visibleInsights(): Insight[] {
    return this.insights.slice(0, this.maxVisible);
  }

  /**
   * Verificar se há mais insights
   */
  get hasMoreInsights(): boolean {
    return this.insights.length > this.maxVisible;
  }

  /**
   * Obter cor baseada no tipo
   */
  getColor(type: Insight['type']): string {
    const colors = {
      success: 'success',
      warning: 'warning',
      info: 'primary',
      danger: 'danger'
    };
    return colors[type];
  }

  /**
   * Dispensar insight
   */
  dismissInsight(event: Event, insightId: string): void {
    event.stopPropagation();
    this.insightDismissed.emit(insightId);
  }

  /**
   * Executar ação do insight
   */
  handleAction(event: Event, insight: Insight): void {
    event.stopPropagation();
    
    if (!insight.actionData) return;

    // Se tem rota, navegar
    if (insight.actionData.route) {
      this.router.navigate([insight.actionData.route]);
    }

    // Emitir evento para ação customizada
    this.insightAction.emit(insight);
  }

  /**
   * Obter classe de animação baseada na prioridade
   */
  getAnimationClass(priority: number): string {
    if (priority >= 5) return 'pulse-animation';
    if (priority >= 4) return 'fade-in-animation';
    return 'slide-in-animation';
  }

  /**
   * Navegar para página de relatórios
   */
  viewAllInsights(): void {
    this.router.navigate(['/reports']);
  }
}
