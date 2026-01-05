import { Component, computed, inject, input } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { GamificationService } from '../../services/gamification.service';

/**
 * Level Badge Component
 * Shows user level with circular progress bar and level name
 * Can be compact (icon + number) or full (icon + number + name + progress)
 */
@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [IonicModule],
  template: `
    <div class="level-badge" [class.compact]="compact()">
      <div class="level-circle" [style.background]="circleGradient()">
        <!-- Progress ring -->
        <svg class="progress-ring" viewBox="0 0 100 100">
          <circle
            class="progress-ring-bg"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            stroke-width="4"
          />
          <circle
            class="progress-ring-fill"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            [attr.stroke]="progressColor()"
            stroke-width="4"
            stroke-linecap="round"
            [style.stroke-dasharray]="circumference"
            [style.stroke-dashoffset]="dashOffset()"
            transform="rotate(-90 50 50)"
          />
        </svg>

        <!-- Level icon and number -->
        <div class="level-content">
          <ion-icon [name]="levelIcon()"></ion-icon>
          <div class="level-number">{{ currentLevel() }}</div>
        </div>
      </div>

      @if (!compact()) {
        <div class="level-info">
          <div class="level-name">{{ levelName() }}</div>
          <div class="level-points">{{ currentPoints() }} pts</div>
          @if (nextLevel()) {
            <div class="level-progress-text">
              {{ pointsToNext() }} pts para {{ nextLevel()?.name }}
            </div>
          }
          @if (!nextLevel()) {
            <div class="level-progress-text max-level">
              🏆 Nível Máximo!
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .level-badge {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .level-badge.compact {
      gap: 0;
    }

    .level-circle {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.3s ease;
    }

    .level-badge.compact .level-circle {
      width: 56px;
      height: 56px;
    }

    .level-circle:hover {
      transform: scale(1.05);
    }

    .progress-ring {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      transform: scale(1.05);
    }

    .progress-ring-fill {
      transition: stroke-dashoffset 0.5s ease;
    }

    .level-content {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      z-index: 1;
    }

    .level-content ion-icon {
      font-size: 24px;
      color: white;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
    }

    .level-badge.compact .level-content ion-icon {
      font-size: 20px;
    }

    .level-number {
      font-size: 16px;
      font-weight: 700;
      color: white;
      line-height: 1;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .level-badge.compact .level-number {
      font-size: 14px;
    }

    .level-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .level-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--ion-color-dark);
    }

    .level-points {
      font-size: 14px;
      font-weight: 600;
      color: var(--ion-color-medium);
    }

    .level-progress-text {
      font-size: 12px;
      color: var(--ion-color-medium-shade);
      margin-top: 2px;
    }

    .level-progress-text.max-level {
      color: #ffa000;
      font-weight: 600;
    }
  `]
})
export class LevelBadgeComponent {
  private readonly gamificationService = inject(GamificationService);

  // Input
  public readonly compact = input<boolean>(false);

  // Data from service
  protected readonly currentPoints = this.gamificationService.totalPoints;
  protected readonly levelProgress = this.gamificationService.levelProgress;

  // Computed values
  protected readonly currentLevel = computed(() => this.levelProgress().current.level);
  protected readonly levelName = computed(() => this.levelProgress().current.name);
  protected readonly levelIcon = computed(() => this.levelProgress().current.icon);
  protected readonly levelColor = computed(() => this.levelProgress().current.color);
  protected readonly nextLevel = computed(() => this.levelProgress().next);
  protected readonly progress = computed(() => this.levelProgress().progress);

  protected readonly pointsToNext = computed(() => {
    const next = this.nextLevel();
    const current = this.currentPoints();
    if (!next) return 0;
    return next.minPoints - current;
  });

  // Circle gradient
  protected readonly circleGradient = computed(() => {
    const color = this.levelColor();
    return `linear-gradient(135deg, ${color} 0%, ${this.adjustBrightness(color, -20)} 100%)`;
  });

  // Progress ring
  protected readonly circumference = 2 * Math.PI * 45; // r=45

  protected readonly dashOffset = computed(() => {
    const progress = this.progress();
    return this.circumference * (1 - progress / 100);
  });

  protected readonly progressColor = computed(() => {
    const next = this.nextLevel();
    if (!next) return '#FFD700'; // Gold for max level
    return 'rgba(255, 255, 255, 0.9)';
  });

  /**
   * Adjust color brightness
   */
  private adjustBrightness(color: string, percent: number): string {
    const num = Number.parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    
    // Clamp values between 0 and 255
    R = R < 1 ? 0 : (R > 255 ? 255 : R);
    G = G < 1 ? 0 : (G > 255 ? 255 : G);
    B = B < 1 ? 0 : (B > 255 ? 255 : B);
    
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}
