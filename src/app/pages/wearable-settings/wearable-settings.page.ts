import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSpinner,
  IonRange,
  IonSegment,
  IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  watch,
  fitness,
  sync,
  notifications,
  pulse,
  checkmarkCircle,
  closeCircle,
  informationCircle,
  phonePortraitOutline,
  settingsOutline,
  statsChartOutline
} from 'ionicons/icons';
import { WearableService } from '../../services/wearable.service';
import { HealthSyncService } from '../../services/health-sync.service';
import { HapticPatternsService, HapticPatternType } from '../../services/haptic-patterns.service';

@Component({
  selector: 'app-wearable-settings',
  templateUrl: './wearable-settings.page.html',
  styleUrls: ['./wearable-settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonRange,
    IonSegment,
    IonSegmentButton
  ]
})
export class WearableSettingsPage {
  private readonly router = inject(Router);
  private readonly wearableService = inject(WearableService);
  private readonly healthSyncService = inject(HealthSyncService);
  private readonly hapticService = inject(HapticPatternsService);
  private readonly translate = inject(TranslateService);

  // Sinais
  wearableConfig = this.wearableService.config;
  wearableStatus = this.wearableService.connectionStatus;
  wearableSupported = this.wearableService.isSupported;
  wearableConnected = this.wearableService.isConnected;
  lastSync = this.wearableService.lastSync;

  healthConfig = this.healthSyncService.config;
  healthPermissions = this.healthSyncService.permissions;
  healthSupported = this.healthSyncService.isSupported;
  healthSyncing = this.healthSyncService.isSyncing;
  healthStats = this.healthSyncService.stats;

  // Estado local
  selectedTab: 'wearable' | 'health' | 'haptic' = 'wearable';
  testingPattern = false;

  // Padrões de haptic disponíveis
  hapticPatterns: HapticPatternType[] = [
    'gentle-reminder',
    'urgent-reminder',
    'missed-dose',
    'success-confirm',
    'notification'
  ];

  constructor() {
    addIcons({
      watch,
      fitness,
      sync,
      notifications,
      pulse,
      checkmarkCircle,
      closeCircle,
      informationCircle,
      phonePortraitOutline,
      settingsOutline,
      statsChartOutline
    });
  }

  /**
   * Ativa/desativa smartwatch
   */
  async toggleWearable(event: any): Promise<void> {
    const enabled = event.detail.checked;
    await this.wearableService.toggleWearable(enabled);
    
    if (enabled) {
      await this.hapticService.playPattern('success-confirm');
    }
  }

  /**
   * Ativa/desativa haptic feedback
   */
  async toggleHaptic(event: any): Promise<void> {
    const enabled = event.detail.checked;
    await this.wearableService.setHapticFeedback(enabled);
    
    if (enabled) {
      await this.hapticService.playSimple('medium');
    }
  }

  /**
   * Ativa/desativa confirmação rápida
   */
  async toggleQuickConfirm(event: any): Promise<void> {
    const enabled = event.detail.checked;
    await this.wearableService.setQuickConfirm(enabled);
  }

  /**
   * Ativa/desativa auto-confirmação no relógio
   */
  async toggleAutoConfirm(event: any): Promise<void> {
    const enabled = event.detail.checked;
    await this.wearableService.setAutoConfirmOnWatch(enabled);
  }

  /**
   * Força sincronização manual
   */
  async forceSync(): Promise<void> {
    await this.hapticService.playSimple('light');
    await this.wearableService.forceSync();
    await this.hapticService.playPattern('success-confirm');
  }

  /**
   * Ativa/desativa Health sync
   */
  async toggleHealthSync(event: any): Promise<void> {
    const enabled = event.detail.checked;
    await this.healthSyncService.toggleSync(enabled);
    
    if (enabled) {
      await this.hapticService.playPattern('success-confirm');
    }
  }

  /**
   * Ativa/desativa auto-sync do Health
   */
  async toggleHealthAutoSync(event: any): Promise<void> {
    const enabled = event.detail.checked;
    await this.healthSyncService.setAutoSync(enabled);
  }

  /**
   * Ativa/desativa sync de medicações
   */
  async toggleSyncMedications(event: any): Promise<void> {
    const enabled = event.detail.checked;
    await this.healthSyncService.setSyncMedications(enabled);
  }

  /**
   * Atualiza intervalo de sync
   */
  async updateSyncInterval(event: any): Promise<void> {
    const minutes = event.detail.value;
    await this.healthSyncService.setSyncInterval(minutes);
  }

  /**
   * Força sincronização com Health
   */
  async syncWithHealth(): Promise<void> {
    await this.hapticService.playSimple('light');
    const success = await this.healthSyncService.syncWithHealth();
    
    if (success) {
      await this.hapticService.playPattern('success-confirm');
    } else {
      await this.hapticService.playSimple('heavy');
    }
  }

  /**
   * Testa padrão de haptic
   */
  async testHapticPattern(pattern: HapticPatternType): Promise<void> {
    this.testingPattern = true;
    await this.hapticService.playPattern(pattern);
    
    setTimeout(() => {
      this.testingPattern = false;
    }, 1000);
  }

  /**
   * Obtém nome formatado do padrão
   */
  getPatternName(pattern: HapticPatternType): string {
    const key = pattern.toUpperCase().replaceAll('-', '_');
    return this.translate.instant(`WEARABLE_SETTINGS.HAPTIC_PATTERNS.${key}`);
  }

  /**
   * Obtém badge de status do wearable
   */
  getStatusBadge(): { text: string; color: string } {
    const status = this.wearableStatus();
    const badges: Record<string, { text: string; color: string }> = {
      connected: { text: this.translate.instant('WEARABLE_SETTINGS.STATUS.CONNECTED'), color: 'success' },
      disconnected: { text: this.translate.instant('WEARABLE_SETTINGS.STATUS.DISCONNECTED'), color: 'medium' },
      pairing: { text: this.translate.instant('WEARABLE_SETTINGS.STATUS.SYNCING'), color: 'warning' },
      unavailable: { text: this.translate.instant('WEARABLE_SETTINGS.STATUS.DISCONNECTED'), color: 'danger' }
    };
    return badges[status] || badges['disconnected'];
  }

  /**
   * Obtém nome da plataforma wearable
   */
  getPlatformName(): string {
    const platform = this.wearableConfig().type;
    const names: Record<string, string> = {
      'apple-watch': 'Apple Watch',
      'wear-os': 'Wear OS',
      'unknown': 'Desconhecido'
    };
    return names[platform] || 'Desconhecido';
  }

  /**
   * Obtém nome da plataforma health
   */
  getHealthPlatformName(): string {
    const platform = this.healthConfig().platform;
    const names: Record<string, string> = {
      'apple-health': 'Apple Health',
      'google-fit': 'Google Fit',
      'none': 'Nenhuma'
    };
    return names[platform] || 'Nenhuma';
  }

  /**
   * Formata data do último sync
   */
  formatLastSync(date: Date | null | undefined): string {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `${minutes}min atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  }

  /**
   * Voltar para página anterior
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

