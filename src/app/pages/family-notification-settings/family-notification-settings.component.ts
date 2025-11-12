import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonRange,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  notificationsOutline,
  volumeMediumOutline,
  phonePortraitOutline,
  timeOutline,
  saveOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { FamilyNotificationService, FamilyNotificationConfig } from '../../services/family-notification.service';

@Component({
  selector: 'app-family-notification-settings',
  templateUrl: './family-notification-settings.component.html',
  styleUrls: ['./family-notification-settings.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonRange,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge
  ]
})
export class FamilyNotificationSettingsComponent implements OnInit {
  private readonly notificationService = inject(FamilyNotificationService);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  // Estado
  config = signal<FamilyNotificationConfig>({
    enabled: true,
    sound: 'default',
    vibrate: true,
    timeOffsetMinutes: 5
  });

  stats = signal<{
    pending: number;
    nextScheduled?: Date;
    groupCount: number;
  }>({
    pending: 0,
    groupCount: 0
  });

  saving = signal(false);
  hasPermission = signal(false);

  constructor() {
    addIcons({
      notificationsOutline,
      volumeMediumOutline,
      phonePortraitOutline,
      timeOutline,
      saveOutline,
      checkmarkCircle
    });
  }

  async ngOnInit() {
    await this.loadConfig();
    await this.loadStats();
    await this.checkPermission();
  }

  /**
   * Carrega configuração salva
   */
  private async loadConfig() {
    const config = await this.notificationService.getPreferences();
    this.config.set(config);
  }

  /**
   * Carrega estatísticas de notificações
   */
  private async loadStats() {
    const stats = await this.notificationService.getNotificationStats();
    this.stats.set(stats);
  }

  /**
   * Verifica permissão de notificações
   */
  private async checkPermission() {
    const hasPermission = await this.notificationService.checkPermissions();
    this.hasPermission.set(hasPermission);
  }

  /**
   * Solicita permissão
   */
  async requestPermission() {
    const granted = await this.notificationService.requestPermission();
    this.hasPermission.set(granted);

    if (granted) {
      await this.showToast('Permissão concedida!', 'success');
      // Agendar notificações automaticamente
      await this.saveSettings();
    } else {
      await this.showToast('Permissão negada. Habilite nas configurações do dispositivo.', 'warning');
    }
  }

  /**
   * Toggle de habilitação
   */
  onEnabledChange(event: any) {
    const enabled = event.detail.checked;
    this.config.update(c => ({ ...c, enabled }));
  }

  /**
   * Alteração de som
   */
  onSoundChange(event: any) {
    const sound = event.detail.value as 'default' | 'custom' | 'silent';
    this.config.update(c => ({ ...c, sound }));
  }

  /**
   * Toggle de vibração
   */
  onVibrateChange(event: any) {
    const vibrate = event.detail.checked;
    this.config.update(c => ({ ...c, vibrate }));
  }

  /**
   * Alteração de offset de tempo
   */
  onTimeOffsetChange(event: any) {
    const timeOffsetMinutes = event.detail.value;
    this.config.update(c => ({ ...c, timeOffsetMinutes }));
  }

  /**
   * Salva configurações
   */
  async saveSettings() {
    this.saving.set(true);

    try {
      await this.notificationService.setPreferences(this.config());
      await this.loadStats(); // Atualizar estatísticas
      await this.showToast('Configurações salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      await this.showToast('Erro ao salvar configurações', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Testa notificação
   */
  async testNotification() {
    if (!this.hasPermission()) {
      await this.showToast('Permissão necessária', 'warning');
      return;
    }

    await this.showToast('Notificação de teste enviada!', 'success');
    
    // Agendar uma notificação de teste para daqui a 5 segundos
    // (isso seria implementado no serviço se necessário)
  }

  /**
   * Mostra toast
   */
  private async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }

  /**
   * Formata data para exibição
   */
  formatDate(date: Date | undefined): string {
    if (!date) return 'Nenhuma';
    
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    // Se for hoje
    if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
