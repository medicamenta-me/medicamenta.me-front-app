import { Component, computed, inject } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { GamificationService } from '../../services/gamification.service';

/**
 * Streak Widget Component
 * Compact widget showing current streak with flame icon
 * Displayed in dashboard header or top section
 */
@Component({
  selector: 'app-streak-widget',
  standalone: true,
  imports: [IonicModule],
  template: `
    <div class="streak-widget" [class.active]="isActive()" [class.at-risk]="isAtRisk()">
      <div class="streak-icon">
        <ion-icon [name]="streakIcon()" [class.pulse]="isActive()"></ion-icon>
      </div>
      <div class="streak-content">
        <div class="streak-number">{{ currentStreak() }}</div>
        <div class="streak-label">{{ streakLabel() }}</div>
      </div>
      @if (showProgress() && currentStreak() > 0) {
        <div class="streak-progress">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="progressPercent()"></div>
          </div>
          <div class="progress-text">{{ progressText() }}</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .streak-widget {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, var(--ion-color-light) 0%, var(--ion-color-light-shade) 100%);
      border-radius: 12px;
      border: 2px solid var(--ion-color-medium-tint);
      transition: all 0.3s ease;
    }

    .streak-widget.active {
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border-color: #ff9800;
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2);
    }

    .streak-widget.at-risk {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      border-color: #f44336;
      animation: pulse-risk 2s infinite;
    }

    @keyframes pulse-risk {
      0%, 100% {
        box-shadow: 0 2px 8px rgba(244, 67, 54, 0.2);
      }
      50% {
        box-shadow: 0 4px 16px rgba(244, 67, 54, 0.4);
      }
    }

    .streak-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .streak-icon ion-icon {
      font-size: 28px;
      color: #9e9e9e;
    }

    .streak-widget.active .streak-icon ion-icon {
      color: #ff6f00;
    }

    .streak-widget.at-risk .streak-icon ion-icon {
      color: #d32f2f;
    }

    .streak-icon ion-icon.pulse {
      animation: pulse-flame 1.5s infinite;
    }

    @keyframes pulse-flame {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    .streak-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .streak-number {
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      color: var(--ion-color-dark);
    }

    .streak-widget.active .streak-number {
      color: #ff6f00;
    }

    .streak-widget.at-risk .streak-number {
      color: #d32f2f;
    }

    .streak-label {
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ion-color-medium);
    }

    .streak-progress {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 80px;
    }

    .progress-bar {
      height: 6px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .streak-widget.active .progress-fill {
      background: linear-gradient(90deg, #ff9800 0%, #ffc107 100%);
    }

    .streak-widget.at-risk .progress-fill {
      background: linear-gradient(90deg, #f44336 0%, #ff5722 100%);
    }

    .progress-text {
      font-size: 10px;
      font-weight: 600;
      color: var(--ion-color-medium);
      text-align: right;
    }
  `]
})
export class StreakWidgetComponent {
  private readonly gamificationService = inject(GamificationService);

  // Data from service
  protected readonly streak = this.gamificationService.streak;
  protected readonly currentStreak = computed(() => this.streak()?.currentStreak || 0);
  protected readonly longestStreak = computed(() => this.streak()?.longestStreak || 0);
  protected readonly isActive = computed(() => this.streak()?.isActive || false);

  // Configuration
  protected readonly showProgress = computed(() => true); // Can be input if needed

  // UI computed values
  protected readonly streakIcon = computed(() => {
    const current = this.currentStreak();
    if (current === 0) return 'flame-outline';
    return 'flame';
  });

  protected readonly streakLabel = computed(() => {
    const current = this.currentStreak();
    if (current === 0) return 'Sem Streak';
    if (current === 1) return 'Dia de Streak';
    return 'Dias de Streak';
  });

  protected readonly isAtRisk = computed(() => {
    return this.gamificationService.checkStreakRisk();
  });

  protected readonly progressPercent = computed(() => {
    const current = this.currentStreak();
    const longest = this.longestStreak();
    
    if (longest === 0 || current === 0) return 0;
    if (current >= longest) return 100;
    
    return Math.round((current / longest) * 100);
  });

  protected readonly progressText = computed(() => {
    const current = this.currentStreak();
    const longest = this.longestStreak();
    
    if (longest === 0) return 'Comece agora!';
    if (current >= longest) return 'Recorde! 🎉';
    
    const remaining = longest - current;
    return `${remaining} para recorde`;
  });
}
