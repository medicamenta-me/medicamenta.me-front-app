import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonIcon,
  IonBadge,
  IonSpinner,
  ToastController,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudOutline,
  cloudOfflineOutline,
  cloudDoneOutline,
  syncOutline,
  alertCircleOutline,
  warningOutline
} from 'ionicons/icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { ConflictResolutionModalComponent } from '../conflict-resolution-modal/conflict-resolution-modal.component';

@Component({
  selector: 'app-sync-status-indicator',
  templateUrl: './sync-status-indicator.component.html',
  styleUrls: ['./sync-status-indicator.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    IonBadge,
    IonSpinner,
    TranslateModule
  ]
})
export class SyncStatusIndicatorComponent {
  private readonly offlineSyncService = inject(OfflineSyncService);
  private readonly toastController = inject(ToastController);
  private readonly modalController = inject(ModalController);
  private readonly translateService = inject(TranslateService);

  // Signals from service
  public readonly isOnline = this.offlineSyncService.isOnline;
  public readonly syncStatus = this.offlineSyncService.syncStatus;
  public readonly hasPendingOperations = this.offlineSyncService.hasPendingOperations;
  public readonly hasUnresolvedConflicts = this.offlineSyncService.hasUnresolvedConflicts;
  public readonly operationQueue = this.offlineSyncService.operationQueue;
  public readonly conflicts = this.offlineSyncService.conflicts;
  public readonly syncStats = this.offlineSyncService.syncStats;

  /**
   * Get count of unresolved conflicts
   */
  getUnresolvedConflictCount(): number {
    return this.conflicts().filter(c => !c.resolved).length;
  }

  constructor() {
    addIcons({
      cloudOutline,
      cloudOfflineOutline,
      cloudDoneOutline,
      syncOutline,
      alertCircleOutline,
      warningOutline
    });
  }

  /**
   * Get icon based on status
   */
  getStatusIcon(): string {
    const status = this.syncStatus();
    switch (status) {
      case 'online':
        return this.hasPendingOperations() ? 'cloud-outline' : 'cloud-done-outline';
      case 'offline':
        return 'cloud-offline-outline';
      case 'syncing':
        return 'sync-outline';
      case 'error':
        return 'alert-circle-outline';
      default:
        return 'cloud-outline';
    }
  }

  /**
   * Get color based on status
   */
  getStatusColor(): string {
    const status = this.syncStatus();
    if (this.hasUnresolvedConflicts()) return 'warning';
    
    switch (status) {
      case 'online':
        return this.hasPendingOperations() ? 'primary' : 'success';
      case 'offline':
        return 'medium';
      case 'syncing':
        return 'primary';
      case 'error':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    if (this.hasUnresolvedConflicts()) {
      return this.translateService.instant('OFFLINE.CONFLICTS_PENDING', {
        count: this.conflicts().filter(c => !c.resolved).length
      });
    }

    const status = this.syncStatus();
    const pendingCount = this.operationQueue().length;

    switch (status) {
      case 'online':
        if (pendingCount > 0) {
          return this.translateService.instant('OFFLINE.PENDING_SYNC', { count: pendingCount });
        }
        return this.translateService.instant('OFFLINE.SYNCED');
      case 'offline':
        if (pendingCount > 0) {
          return this.translateService.instant('OFFLINE.OFFLINE_WITH_PENDING', { count: pendingCount });
        }
        return this.translateService.instant('OFFLINE.OFFLINE');
      case 'syncing':
        return this.translateService.instant('OFFLINE.SYNCING');
      case 'error':
        return this.translateService.instant('OFFLINE.SYNC_ERROR');
      default:
        return '';
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerSync(): Promise<void> {
    if (!this.isOnline() || !this.hasPendingOperations()) {
      return;
    }

    try {
      await this.offlineSyncService.forceSyncNow();
      
      const toast = await this.toastController.create({
        message: this.translateService.instant('OFFLINE.SYNC_SUCCESS'),
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

    } catch (error) {
      console.error('Sync error:', error);
      
      const toast = await this.toastController.create({
        message: this.translateService.instant('OFFLINE.SYNC_FAILED'),
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Open conflict resolution modal for first unresolved conflict
   */
  async resolveConflicts(): Promise<void> {
    const unresolvedConflicts = this.conflicts().filter(c => !c.resolved);
    if (unresolvedConflicts.length === 0) return;

    const modal = await this.modalController.create({
      component: ConflictResolutionModalComponent,
      componentProps: {
        conflict: unresolvedConflicts[0]
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.resolved) {
      const toast = await this.toastController.create({
        message: this.translateService.instant('OFFLINE.CONFLICT_RESOLVED'),
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

      // If more conflicts remain, ask to resolve next
      const remaining = this.conflicts().filter(c => !c.resolved).length;
      if (remaining > 0) {
        setTimeout(() => this.resolveConflicts(), 500);
      }
    }
  }

  /**
   * Check if component should be visible
   */
  shouldShow(): boolean {
    return (
      !this.isOnline() ||
      this.hasPendingOperations() ||
      this.hasUnresolvedConflicts() ||
      this.syncStatus() === 'syncing' ||
      this.syncStatus() === 'error'
    );
  }
}
