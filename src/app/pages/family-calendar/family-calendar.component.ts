import { Component, inject, signal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonChip,
  IonBadge,
  IonModal,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  todayOutline,
  checkmarkCircle,
  alertCircle,
  timeOutline,
  syncOutline,
  closeOutline, calendarOutline } from 'ionicons/icons';
import { FamilyCalendarService, CalendarDay, DayDetail } from '../../services/family-calendar.service';
import { CalendarIntegrationService } from '../../services/calendar-integration.service';

@Component({
  selector: 'app-family-calendar',
  templateUrl: './family-calendar.component.html',
  styleUrls: ['./family-calendar.component.css'],
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonChip,
    IonBadge,
    IonModal,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner
]
})
export class FamilyCalendarComponent {
  calendarService = inject(FamilyCalendarService);
  calendarIntegrationService = inject(CalendarIntegrationService);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);

  // Estado do componente
  selectedDay = signal<DayDetail | null>(null);
  showDayModal = signal<boolean>(false);
  syncingWithGoogle = signal<boolean>(false);

  // Dados computados
  monthData = this.calendarService.monthData;
  memberFilters = this.calendarService.memberFilters;
  activeMembers = this.calendarService.activeMembers;

  // Nomes dos dias da semana
  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  constructor() {
    addIcons({
      syncOutline,
      chevronBackOutline,
      chevronForwardOutline,
      todayOutline,
      closeOutline,
      checkmarkCircle,
      alertCircle,
      timeOutline,
      calendarOutline
    });
  }

  /**
   * Navega para o mês anterior
   */
  previousMonth(): void {
    this.calendarService.previousMonth();
  }

  /**
   * Navega para o próximo mês
   */
  nextMonth(): void {
    this.calendarService.nextMonth();
  }

  /**
   * Volta para hoje
   */
  goToToday(): void {
    this.calendarService.goToToday();
  }

  /**
   * Toggle filtro de membro
   */
  toggleMember(memberId: string): void {
    this.calendarService.toggleMemberFilter(memberId);
  }

  /**
   * Mostra todos os membros
   */
  showAll(): void {
    this.calendarService.showAllMembers();
  }

  /**
   * Esconde todos os membros
   */
  hideAll(): void {
    this.calendarService.hideAllMembers();
  }

  /**
   * Abre modal de detalhes do dia
   */
  openDayDetails(day: CalendarDay): void {
    if (!day.isCurrentMonth) return;
    
    const details = this.calendarService.getDayDetails(day.date);
    this.selectedDay.set(details);
    this.showDayModal.set(true);
  }

  /**
   * Fecha modal de detalhes
   */
  closeDayModal(): void {
    this.showDayModal.set(false);
    this.selectedDay.set(null);
  }

  /**
   * Sincroniza com Google Calendar
   */
  async syncWithGoogleCalendar(): Promise<void> {
    try {
      this.syncingWithGoogle.set(true);

      // Verificar permissões
      const hasPermission = this.calendarIntegrationService.hasPermission();
      if (!hasPermission) {
        const toast = await this.toastController.create({
          message: 'Permissões de calendário necessárias',
          duration: 3000,
          color: 'warning',
          position: 'top'
        });
        await toast.present();
        this.syncingWithGoogle.set(false);
        return;
      }

      // Verificar se está configurado
      const config = this.calendarIntegrationService.syncConfig();
      if (!config.enabled || !config.selectedCalendarId) {
        const toast = await this.toastController.create({
          message: 'Configure a sincronização nas configurações primeiro',
          duration: 3000,
          color: 'warning',
          position: 'top'
        });
        await toast.present();
        this.syncingWithGoogle.set(false);
        return;
      }

      // Sincronizar todos os medicamentos
      const stats = await this.calendarIntegrationService.syncAll();

      // Mostrar resultado
      const toast = await this.toastController.create({
        message: `Sincronizado: ${stats.eventsCreated} eventos criados`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      const toast = await this.toastController.create({
        message: 'Erro ao sincronizar com Google Calendar',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.syncingWithGoogle.set(false);
    }
  }

  /**
   * Obtém classe CSS para célula do dia
   */
  getDayClass(day: CalendarDay): string {
    const classes = ['calendar-day'];
    
    if (!day.isCurrentMonth) {
      classes.push('other-month');
    }
    
    if (day.isToday) {
      classes.push('today');
    }
    
    if (day.totalDoses === 0) {
      classes.push('no-doses');
    }
    
    if (day.hasMissed) {
      classes.push('has-missed');
    } else if (day.hasTaken) {
      classes.push('has-taken');
    } else if (day.hasPending) {
      classes.push('has-pending');
    }

    return classes.join(' ');
  }

  /**
   * Obtém ícone de status para dose
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'taken':
        return 'checkmark-circle';
      case 'missed':
        return 'alert-circle';
      case 'pending':
        return 'time-outline';
      default:
        return 'time-outline';
    }
  }

  /**
   * Obtém cor de status para dose
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'taken':
        return 'success';
      case 'missed':
        return 'danger';
      case 'pending':
        return 'warning';
      default:
        return 'medium';
    }
  }

  /**
   * Obtém texto de status para dose
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'taken':
        return 'Tomada';
      case 'missed':
        return 'Perdida';
      case 'pending':
        return 'Pendente';
      default:
        return 'Desconhecido';
    }
  }

  /**
   * Formata horário (HH:MM)
   */
  formatTime(time: string): string {
    return time;
  }
}

