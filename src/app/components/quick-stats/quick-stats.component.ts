import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonCard, 
  IonCardContent, 
  IonIcon
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { QuickStats } from '../../services/dashboard-insights.service';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircle, 
  time, 
  cube, 
  medical,
  trendingUp,
  trendingDown
} from 'ionicons/icons';

@Component({
  selector: 'app-quick-stats',
  templateUrl: './quick-stats.component.html',
  styleUrls: ['./quick-stats.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardContent,
    IonIcon,
    TranslateModule
  ]
})
export class QuickStatsComponent {
  @Input() stats: QuickStats = {
    weeklyAdherence: 0,
    upcomingDoses: 0,
    criticalStock: 0,
    totalActive: 0
  };

  constructor() {
    addIcons({
      'checkmark-circle': checkmarkCircle,
      time,
      cube,
      medical,
      'trending-up': trendingUp,
      'trending-down': trendingDown
    });
  }

  /**
   * Obter cor da aderência baseada na porcentagem
   */
  getAdherenceColor(percentage: number): string {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'warning';
    return 'danger';
  }

  /**
   * Obter cor do estoque crítico
   */
  getStockColor(count: number): string {
    if (count === 0) return 'success';
    if (count <= 2) return 'warning';
    return 'danger';
  }

  /**
   * Formatar porcentagem
   */
  formatPercentage(value: number): string {
    return Math.round(value).toString();
  }

  /**
   * Obter ícone de tendência (placeholder para implementação futura)
   */
  getTrendIcon(): string {
    // Futuramente pode comparar com semana anterior
    return 'trending-up';
  }
}
