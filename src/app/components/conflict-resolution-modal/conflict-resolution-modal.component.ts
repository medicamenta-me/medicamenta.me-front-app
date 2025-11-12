import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonLabel,
  IonItem,
  IonList,
  IonBadge,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  cloudDownloadOutline,
  phonePortraitOutline,
  gitMergeOutline,
  timeOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { TranslateModule } from '@ngx-translate/core';
import { SyncConflict, OfflineSyncService } from '../../services/offline-sync.service';

@Component({
  selector: 'app-conflict-resolution-modal',
  templateUrl: './conflict-resolution-modal.component.html',
  styleUrls: ['./conflict-resolution-modal.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonLabel,
    IonItem,
    IonList,
    IonBadge,
    TranslateModule
  ]
})
export class ConflictResolutionModalComponent {
  private readonly modalController = inject(ModalController);
  private readonly offlineSyncService = inject(OfflineSyncService);

  @Input() conflict!: SyncConflict;

  public selectedResolution = signal<'server' | 'client' | 'merge' | null>(null);
  public isResolving = signal<boolean>(false);

  constructor() {
    addIcons({
      closeOutline,
      cloudDownloadOutline,
      phonePortraitOutline,
      gitMergeOutline,
      timeOutline,
      alertCircleOutline
    });
  }

  /**
   * Select resolution strategy
   */
  selectResolution(resolution: 'server' | 'client' | 'merge'): void {
    this.selectedResolution.set(resolution);
  }

  /**
   * Apply selected resolution
   */
  async applyResolution(): Promise<void> {
    const resolution = this.selectedResolution();
    if (!resolution || this.isResolving()) return;

    this.isResolving.set(true);

    try {
      let success = false;

      if (resolution === 'merge') {
        // For merge, we'll create a merged object with fields from both
        const mergedData = this.createMergedData();
        success = await this.offlineSyncService.resolveConflictWithMerge(
          this.conflict.id,
          mergedData
        );
      } else {
        const strategy = resolution === 'server' ? 'server-wins' : 'client-wins';
        success = await this.offlineSyncService.resolveConflict(
          this.conflict.id,
          strategy
        );
      }

      if (success) {
        await this.modalController.dismiss({ resolved: true, resolution });
      } else {
        console.error('Failed to resolve conflict');
        this.isResolving.set(false);
      }

    } catch (error) {
      console.error('Error resolving conflict:', error);
      this.isResolving.set(false);
    }
  }

  /**
   * Create merged data from local and server versions
   */
  private createMergedData(): any {
    const merged = { ...this.conflict.serverData };

    // For each field in local data, prefer newer value
    for (const key in this.conflict.localData) {
      if (key === 'updatedAt' || key === 'createdAt') continue;

      // If server doesn't have this field, use local
      if (!(key in this.conflict.serverData)) {
        merged[key] = this.conflict.localData[key];
      }
      // If local timestamp is newer, use local value
      else if (this.conflict.localTimestamp > this.conflict.serverTimestamp) {
        merged[key] = this.conflict.localData[key];
      }
    }

    return merged;
  }

  /**
   * Cancel and close modal
   */
  async cancel(): Promise<void> {
    await this.modalController.dismiss({ resolved: false });
  }

  /**
   * Get differences between local and server data
   */
  getDifferences(): Array<{ key: string; local: any; server: any }> {
    const differences: Array<{ key: string; local: any; server: any }> = [];
    const allKeys = new Set([
      ...Object.keys(this.conflict.localData),
      ...Object.keys(this.conflict.serverData)
    ]);

    for (const key of allKeys) {
      if (key === 'updatedAt' || key === 'createdAt') continue;

      const localValue = this.conflict.localData[key];
      const serverValue = this.conflict.serverData[key];

      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        differences.push({
          key,
          local: localValue,
          server: serverValue
        });
      }
    }

    return differences;
  }

  /**
   * Format value for display
   */
  formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }

  /**
   * Get human-readable field name
   */
  getFieldLabel(key: string): string {
    const labels: Record<string, string> = {
      name: 'Nome',
      dosage: 'Dosagem',
      frequency: 'Frequência',
      currentStock: 'Estoque',
      notes: 'Observações',
      isArchived: 'Arquivado',
      isCompleted: 'Concluído',
      startDate: 'Data de Início',
      endDate: 'Data de Término'
    };

    return labels[key] || key;
  }
}
