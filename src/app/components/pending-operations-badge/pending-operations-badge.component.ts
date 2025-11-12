import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonBadge } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { OfflineSyncService } from '../../services/offline-sync.service';

/**
 * Pending Operations Badge Component
 * 
 * Displays a badge with the count of pending sync operations.
 * Only visible when there are operations in the queue.
 * Badge animates when count changes.
 */
@Component({
  selector: 'app-pending-operations-badge',
  standalone: true,
  imports: [CommonModule, IonBadge, TranslateModule],
  template: `
    @if (pendingCount() > 0) {
      <div class="pending-badge-container" [class.pulse]="isPulsing">
        <ion-badge 
          [color]="getBadgeColor()"
          class="pending-badge">
          {{ pendingCount() }}
        </ion-badge>
        <span class="badge-label">{{ 'OFFLINE.PENDING_OPERATIONS' | translate }}</span>
      </div>
    }
  `,
  styles: [`
    .pending-badge-container {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 12px;
      background: var(--ion-color-light);
      transition: all 0.3s ease;
    }

    .pending-badge {
      font-size: 0.75rem;
      font-weight: 700;
      min-width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
    }

    .badge-label {
      font-size: 0.813rem;
      font-weight: 500;
      color: var(--ion-color-medium-shade);
    }

    .pulse {
      animation: pulse 0.6s ease-in-out;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      .badge-label {
        display: none;
      }
      
      .pending-badge-container {
        padding: 4px;
      }

      .pending-badge {
        min-width: 24px;
        height: 24px;
        font-size: 0.875rem;
      }
    }
  `]
})
export class PendingOperationsBadgeComponent {
  private readonly offlineSync = inject(OfflineSyncService);

  readonly operationQueue = this.offlineSync.operationQueue;
  readonly isOnline = this.offlineSync.isOnline;
  readonly syncStatus = this.offlineSync.syncStatus;

  isPulsing = false;
  private previousCount = 0;

  constructor() {
    // Watch for count changes to trigger animation
    this.operationQueue.subscribe(queue => {
      const currentCount = queue.length;
      if (currentCount !== this.previousCount) {
        this.triggerPulse();
        this.previousCount = currentCount;
      }
    });
  }

  pendingCount(): number {
    return this.operationQueue().length;
  }

  getBadgeColor(): string {
    const count = this.pendingCount();
    const isOnline = this.isOnline();
    
    if (!isOnline) {
      return 'medium'; // Gray when offline
    }
    
    if (count >= 10) {
      return 'danger'; // Red for many operations
    } else if (count >= 5) {
      return 'warning'; // Orange for several operations
    } else {
      return 'primary'; // Blue for few operations
    }
  }

  private triggerPulse(): void {
    this.isPulsing = true;
    setTimeout(() => {
      this.isPulsing = false;
    }, 600);
  }
}
