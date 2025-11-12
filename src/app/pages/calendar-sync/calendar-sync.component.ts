import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote,
  IonRadioGroup,
  IonRadio,
  IonRange,
  IonBadge,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  IonProgressBar,
  LoadingController,
  ToastController,
  AlertController,
  ActionSheetController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkCircle,
  closeCircle,
  syncOutline,
  settingsOutline,
  timeOutline,
  warningOutline,
  listOutline,
  trashOutline,
  informationCircle,
  chevronForward,
  alertCircle
} from 'ionicons/icons';
import { 
  CalendarIntegrationService, 
  CalendarConflict, 
  SyncStats, 
  CalendarSyncConfig 
} from '../../services/calendar-integration.service';
import { Calendar } from '@ebarooni/capacitor-calendar';

@Component({
  selector: 'app-calendar-sync',
  templateUrl: './calendar-sync.component.html',
  styleUrls: ['./calendar-sync.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRadioGroup,
    IonRadio,
    IonRange,
    IonBadge,
    IonChip,
    IonRefresher,
    IonRefresherContent
  ]
})
export class CalendarSyncPage implements OnInit {
  private calendarService = inject(CalendarIntegrationService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);

  // Estado da página
  isLoadingCalendars = signal<boolean>(false);
  isSyncing = signal<boolean>(false);
  showConflicts = signal<boolean>(false);
  conflicts = signal<CalendarConflict[]>([]);
  syncStats = signal<SyncStats | null>(null);

  // Getters para os signals do serviço
  get hasPermission() { return this.calendarService.hasPermission; }
  get availableCalendars() { return this.calendarService.availableCalendars; }
  get syncConfig() { return this.calendarService.syncConfig; }
  get syncedEvents() { return this.calendarService.syncedEvents; }
  get isInitialized() { return this.calendarService.isInitialized; }

  constructor() {
    addIcons({
      calendarOutline,
      checkmarkCircle,
      closeCircle,
      syncOutline,
      settingsOutline,
      timeOutline,
      warningOutline,
      listOutline,
      trashOutline,
      informationCircle,
      chevronForward,
      alertCircle
    });
  }

  async ngOnInit() {
    // Aguardar inicialização do serviço
    if (!this.isInitialized()) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Se tem permissão, carregar calendários
    if (this.hasPermission()) {
      await this.loadCalendars();
    }
  }

  /**
   * Solicita permissão para acessar calendários
   */
  async requestPermission() {
    const loading = await this.loadingCtrl.create({
      message: 'Solicitando permissão...'
    });
    await loading.present();

    try {
      const granted = await this.calendarService.requestPermission();
      
      if (granted) {
        await this.showToast('Permissão concedida!', 'success');
        await this.loadCalendars();
      } else {
        await this.showToast('Permissão negada. Habilite nas configurações do dispositivo.', 'warning');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      await this.showToast('Erro ao solicitar permissão', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Carrega calendários disponíveis
   */
  async loadCalendars() {
    this.isLoadingCalendars.set(true);

    try {
      await this.calendarService.loadCalendars();
    } catch (error) {
      console.error('Erro ao carregar calendários:', error);
      await this.showToast('Erro ao carregar calendários', 'danger');
    } finally {
      this.isLoadingCalendars.set(false);
    }
  }

  /**
   * Seleciona calendário para sincronização
   */
  async selectCalendar(event: any) {
    const calendarId = event.detail.value;
    
    try {
      await this.calendarService.selectCalendar(calendarId);
      await this.showToast('Calendário selecionado', 'success');
    } catch (error) {
      console.error('Erro ao selecionar calendário:', error);
      await this.showToast('Erro ao selecionar calendário', 'danger');
    }
  }

  /**
   * Toggle de sincronização
   */
  async onSyncToggle(event: any) {
    const enabled = event.detail.checked;

    if (enabled && !this.syncConfig().selectedCalendarId) {
      // Se não tem calendário selecionado, desfaz toggle e pede pra selecionar
      event.target.checked = false;
      await this.showToast('Selecione um calendário primeiro', 'warning');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: enabled ? 'Ativando sincronização...' : 'Desativando sincronização...'
    });
    await loading.present();

    try {
      await this.calendarService.toggleSync(enabled);
      
      if (enabled) {
        const stats = this.calendarService.getSyncStats();
        this.syncStats.set(stats);
        await this.showToast(`Sincronização ativada! ${stats.totalEvents} eventos criados.`, 'success');
      } else {
        await this.showToast('Sincronização desativada', 'success');
      }
    } catch (error) {
      console.error('Erro ao alternar sincronização:', error);
      await this.showToast('Erro ao alternar sincronização', 'danger');
      event.target.checked = !enabled; // Reverte toggle
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Atualiza configurações
   */
  async updateConfig(key: keyof CalendarSyncConfig, value: any) {
    try {
      await this.calendarService.updateSyncConfig({ [key]: value });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
    }
  }

  /**
   * Sincroniza manualmente
   */
  async syncNow() {
    if (!this.syncConfig().enabled) {
      await this.showToast('Ative a sincronização primeiro', 'warning');
      return;
    }

    this.isSyncing.set(true);
    const loading = await this.loadingCtrl.create({
      message: 'Sincronizando medicamentos...'
    });
    await loading.present();

    try {
      const stats = await this.calendarService.syncAll();
      this.syncStats.set(stats);
      
      await this.showToast(
        `Sincronização concluída! ${stats.eventsCreated} eventos criados.`,
        'success'
      );
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      await this.showToast('Erro ao sincronizar', 'danger');
    } finally {
      this.isSyncing.set(false);
      await loading.dismiss();
    }
  }

  /**
   * Detecta conflitos
   */
  async detectConflicts() {
    const loading = await this.loadingCtrl.create({
      message: 'Verificando conflitos...'
    });
    await loading.present();

    try {
      const conflicts = await this.calendarService.detectConflicts();
      this.conflicts.set(conflicts);
      this.showConflicts.set(true);

      if (conflicts.length === 0) {
        await this.showToast('Nenhum conflito detectado', 'success');
      } else {
        await this.showToast(`${conflicts.length} conflito(s) detectado(s)`, 'warning');
      }
    } catch (error) {
      console.error('Erro ao detectar conflitos:', error);
      await this.showToast('Erro ao detectar conflitos', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Mostra opções avançadas
   */
  async showAdvancedOptions() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Opções Avançadas',
      buttons: [
        {
          text: 'Verificar Conflitos',
          icon: 'warning-outline',
          handler: () => {
            this.detectConflicts();
          }
        },
        {
          text: 'Ver Eventos Sincronizados',
          icon: 'list-outline',
          handler: () => {
            this.showSyncedEventsList();
          }
        },
        {
          text: 'Remover Todos os Eventos',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.confirmRemoveAllEvents();
          }
        },
        {
          text: 'Cancelar',
          icon: 'close-circle',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Mostra lista de eventos sincronizados
   */
  async showSyncedEventsList() {
    const events = this.syncedEvents();
    
    if (events.length === 0) {
      await this.showToast('Nenhum evento sincronizado', 'warning');
      return;
    }

    const eventsList = events
      .map(e => `• ${e.medicationName} às ${e.scheduledTime} em ${this.formatDate(new Date(e.date))}`)
      .join('\n');

    const alert = await this.alertCtrl.create({
      header: 'Eventos Sincronizados',
      message: `Total: ${events.length} eventos\n\n${eventsList}`,
      buttons: ['OK']
    });

    await alert.present();
  }

  /**
   * Confirma remoção de todos os eventos
   */
  async confirmRemoveAllEvents() {
    const alert = await this.alertCtrl.create({
      header: 'Remover Eventos',
      message: 'Deseja remover todos os eventos sincronizados do calendário?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Remover',
          role: 'destructive',
          handler: async () => {
            await this.removeAllEvents();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Remove todos os eventos
   */
  async removeAllEvents() {
    const loading = await this.loadingCtrl.create({
      message: 'Removendo eventos...'
    });
    await loading.present();

    try {
      await this.calendarService.removeAllSyncedEvents();
      this.syncStats.set(null);
      await this.showToast('Todos os eventos foram removidos', 'success');
    } catch (error) {
      console.error('Erro ao remover eventos:', error);
      await this.showToast('Erro ao remover eventos', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  /**
   * Refresh pull-to-refresh
   */
  async handleRefresh(event: any) {
    try {
      await this.loadCalendars();
      
      if (this.syncConfig().enabled) {
        await this.syncNow();
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      event.target.complete();
    }
  }

  /**
   * Formata data
   */
  formatDate(date: Date): string {
    return this.calendarService.formatDate(date);
  }

  /**
   * Formata data/hora
   */
  formatDateTime(date: Date): string {
    return this.calendarService.formatDateTime(date);
  }

  /**
   * Mostra toast
   */
  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Obtém cor do calendário (para exibição)
   */
  getCalendarColor(calendar: Calendar): string {
    // Mapear cor do calendário para cor Ionic
    const color = (calendar as any).color || '#3880ff';
    return color;
  }

  /**
   * Obtém nome do dia da semana do conflito
   */
  getConflictDay(conflict: CalendarConflict): string {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    // Tentar extrair da data do evento conflitante
    return days[conflict.conflictingEvent.startDate.getDay()];
  }
}
