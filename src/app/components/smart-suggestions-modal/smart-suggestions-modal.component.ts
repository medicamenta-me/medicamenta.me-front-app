import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonNote,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  checkmark,
  closeCircle,
  alertCircle,
  timeOutline,
  calendarOutline,
  trendingUp,
  sparkles,
  bulbOutline, notificationsOutline } from 'ionicons/icons';
import { SmartRemindersService, SmartSuggestion } from '../../services/smart-reminders.service';
import { HapticPatternsService } from '../../services/haptic-patterns.service';

@Component({
  selector: 'app-smart-suggestions-modal',
  templateUrl: './smart-suggestions-modal.component.html',
  styleUrls: ['./smart-suggestions-modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonNote
  ]
})
export class SmartSuggestionsModalComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly smartRemindersService = inject(SmartRemindersService);
  private readonly hapticService = inject(HapticPatternsService);

  suggestions = this.smartRemindersService.pendingSuggestions;

  constructor() {
    addIcons({close,bulbOutline,timeOutline,notificationsOutline,calendarOutline,checkmark,closeCircle,alertCircle,trendingUp,sparkles});
  }

  /**
   * Fecha o modal
   */
  dismiss(): void {
    this.modalCtrl.dismiss();
  }

  /**
   * Aceita sugestão
   */
  async acceptSuggestion(suggestion: SmartSuggestion): Promise<void> {
    await this.hapticService.playPattern('success-confirm');
    await this.smartRemindersService.acceptSuggestion(suggestion.id);
  }

  /**
   * Rejeita sugestão
   */
  async rejectSuggestion(suggestion: SmartSuggestion): Promise<void> {
    await this.hapticService.playSimple('light');
    await this.smartRemindersService.rejectSuggestion(suggestion.id);
  }

  /**
   * Dispensa sugestão
   */
  async dismissSuggestion(suggestion: SmartSuggestion): Promise<void> {
    await this.smartRemindersService.dismissSuggestion(suggestion.id);
  }

  /**
   * Obtém ícone por tipo de sugestão
   */
  getIconForType(type: SmartSuggestion['type']): string {
    const icons: Record<SmartSuggestion['type'], string> = {
      'time-adjustment': 'time-outline',
      'day-change': 'calendar-outline',
      'risk-alert': 'alert-circle',
      'praise': 'sparkles'
    };
    return icons[type];
  }

  /**
   * Obtém cor por prioridade
   */
  getColorForPriority(priority: SmartSuggestion['priority']): string {
    const colors: Record<SmartSuggestion['priority'], string> = {
      high: 'danger',
      medium: 'warning',
      low: 'success'
    };
    return colors[priority];
  }

  /**
   * Formata porcentagem
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Formata minutos como texto
   */
  formatMinutes(minutes: number): string {
    if (minutes === 0) return 'no horário';
    if (minutes > 0) return `${minutes} min atrasado`;
    return `${Math.abs(minutes)} min adiantado`;
  }
}

