import { Component, inject, computed } from '@angular/core';

import { IonProgressBar } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { OfflineSyncService } from '../../services/offline-sync.service';

/**
 * Sync Progress Bar Component
 * 
 * Displays a progress bar during active synchronization.
 * Shows percentage complete and current operation details.
 * Auto-hides when sync is complete.
 */
@Component({
  selector: 'app-sync-progress-bar',
  standalone: true,
  imports: [IonProgressBar, TranslateModule],
  template: `
    @if (showProgress()) {
      <div class="sync-progress-container">
        <ion-progress-bar 
          [value]="progressValue()"
          [color]="getProgressColor()"
          [type]="progressValue() > 0 ? 'determinate' : 'indeterminate'">
        </ion-progress-bar>
        
        <div class="progress-details">
          <span class="progress-text">
            {{ getProgressText() }}
          </span>
          <span class="progress-percentage">
            {{ getProgressPercentage() }}
          </span>
        </div>
      </div>
    }
  `,
  styles: [`
    .sync-progress-container {
      width: 100%;
      background: var(--ion-color-light);
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    ion-progress-bar {
      height: 6px;
      border-radius: 3px;
      margin-bottom: 8px;
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.813rem;
    }

    .progress-text {
      color: var(--ion-color-medium-shade);
      font-weight: 500;
    }

    .progress-percentage {
      color: var(--ion-color-primary);
      font-weight: 700;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .sync-progress-container {
        padding: 8px 12px;
      }

      .progress-details {
        font-size: 0.75rem;
      }
    }
  `]
})
export class SyncProgressBarComponent {
  private readonly offlineSync = inject(OfflineSyncService);

  readonly syncStatus = this.offlineSync.syncStatus;
  readonly syncStats = this.offlineSync.syncStats;
  readonly operationQueue = this.offlineSync.operationQueue;

  // Computed values
  readonly showProgress = computed(() => {
    return this.syncStatus() === 'syncing' && this.operationQueue().length > 0;
  });

  readonly progressValue = computed(() => {
    const stats = this.syncStats();
    const total = stats.pendingOperations;
    const processed = stats.successfulSyncs + stats.failedSyncs;
    
    if (total === 0) return 0;
    return processed / total;
  });

  getProgressColor(): string {
    const value = this.progressValue();
    if (value === 0) return 'primary';
    if (value < 0.5) return 'warning';
    return 'success';
  }

  getProgressText(): string {
    const stats = this.syncStats();
    const total = stats.pendingOperations;
    const processed = stats.successfulSyncs + stats.failedSyncs;
    
    if (total === 0) {
      return 'Iniciando sincronização...';
    }
    
    return `Sincronizando ${processed} de ${total} operações`;
  }

  getProgressPercentage(): string {
    const value = this.progressValue();
    if (value === 0) return '0%';
    return `${Math.round(value * 100)}%`;
  }
}
