import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Achievement } from '../../models/achievement.model';
import { ShareService } from '../../services/share.service';

/**
 * Achievement Card Component
 * Displays individual achievement with icon, name, description, progress bar, tier badge
 */
@Component({
  selector: 'app-achievement-card',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    @if (achievement()) {
      <div 
        class="achievement-card" 
        [class.unlocked]="achievement()!.unlocked"
        [class.locked]="!achievement()!.unlocked"
        [attr.data-tier]="achievement()!.tier"
        (click)="onCardClick()"
      >
        <!-- Tier Badge -->
        <div class="tier-badge" [attr.data-tier]="achievement()!.tier">
          <ion-icon [name]="tierIcon()"></ion-icon>
        </div>

        <!-- Achievement Icon -->
        <div class="achievement-icon" [class.unlocked]="achievement()!.unlocked">
          <ion-icon [name]="achievement()!.icon"></ion-icon>
        </div>

        <!-- Achievement Info -->
        <div class="achievement-info">
          <div class="achievement-name">{{ achievement()!.name }}</div>
          <div class="achievement-description">{{ achievement()!.description }}</div>
          
          <!-- Progress Bar (only for locked achievements) -->
          @if (!achievement()!.unlocked) {
            <div class="achievement-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  [style.width.%]="progressPercent()"
                  [attr.data-tier]="achievement()!.tier"
                ></div>
              </div>
              <div class="progress-text">
                {{ achievement()!.currentProgress }} / {{ achievement()!.requirement }}
              </div>
            </div>
          }

          <!-- Unlocked Badge -->
          @if (achievement()!.unlocked) {
            <div class="unlocked-badge">
              <ion-icon name="checkmark-circle"></ion-icon>
              <span>Desbloqueada</span>
              @if (achievement()!.unlockedAt) {
                <span class="unlock-date">{{ formatDate(achievement()!.unlockedAt!) }}</span>
              }
            </div>
            
            <!-- Share Button (only for unlocked achievements) -->
            <ion-button 
              fill="clear" 
              size="small" 
              class="share-button"
              (click)="onShareClick($event)"
              [disabled]="isSharing()"
            >
              <ion-icon slot="icon-only" name="share-social-outline"></ion-icon>
            </ion-button>
          }

          <!-- Points -->
          <div class="achievement-points">
            <ion-icon name="star"></ion-icon>
            <span>{{ achievement()!.points }} pontos</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .achievement-card {
      position: relative;
      display: flex;
      gap: 16px;
      padding: 16px;
      background: var(--ion-color-light);
      border-radius: 12px;
      border: 2px solid var(--ion-color-medium-tint);
      transition: all 0.3s ease;
      cursor: pointer;
      overflow: hidden;
    }

    .achievement-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .achievement-card[data-tier="bronze"]::before {
      background: linear-gradient(90deg, #CD7F32 0%, #A0522D 100%);
    }

    .achievement-card[data-tier="silver"]::before {
      background: linear-gradient(90deg, #C0C0C0 0%, #A8A8A8 100%);
    }

    .achievement-card[data-tier="gold"]::before {
      background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
    }

    .achievement-card[data-tier="platinum"]::before {
      background: linear-gradient(90deg, #E5E4E2 0%, #B0B0B0 100%);
    }

    .achievement-card.unlocked::before {
      opacity: 1;
    }

    .achievement-card.unlocked {
      background: white;
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .achievement-card.locked {
      opacity: 0.8;
    }

    .achievement-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .tier-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .tier-badge ion-icon {
      font-size: 18px;
    }

    .tier-badge[data-tier="bronze"] ion-icon {
      color: #CD7F32;
    }

    .tier-badge[data-tier="silver"] ion-icon {
      color: #C0C0C0;
    }

    .tier-badge[data-tier="gold"] ion-icon {
      color: #FFD700;
    }

    .tier-badge[data-tier="platinum"] ion-icon {
      color: #E5E4E2;
    }

    .achievement-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      min-width: 64px;
      border-radius: 12px;
      background: var(--ion-color-medium-tint);
      transition: all 0.3s ease;
    }

    .achievement-icon ion-icon {
      font-size: 36px;
      color: var(--ion-color-medium);
      transition: all 0.3s ease;
    }

    .achievement-icon.unlocked {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .achievement-icon.unlocked ion-icon {
      color: white;
      transform: scale(1.1);
    }

    .achievement-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-right: 40px;
    }

    .achievement-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--ion-color-dark);
      line-height: 1.2;
    }

    .achievement-description {
      font-size: 13px;
      color: var(--ion-color-medium-shade);
      line-height: 1.4;
    }

    .achievement-progress {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 4px;
    }

    .progress-bar {
      height: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .progress-fill[data-tier="bronze"] {
      background: linear-gradient(90deg, #CD7F32 0%, #A0522D 100%);
    }

    .progress-fill[data-tier="silver"] {
      background: linear-gradient(90deg, #C0C0C0 0%, #A8A8A8 100%);
    }

    .progress-fill[data-tier="gold"] {
      background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
    }

    .progress-fill[data-tier="platinum"] {
      background: linear-gradient(90deg, #E5E4E2 0%, #B0B0B0 100%);
    }

    .progress-text {
      font-size: 11px;
      font-weight: 600;
      color: var(--ion-color-medium);
    }

    .unlocked-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #4caf50;
    }

    .unlocked-badge ion-icon {
      font-size: 16px;
    }

    .unlock-date {
      margin-left: auto;
      font-size: 11px;
      font-weight: 500;
      color: var(--ion-color-medium);
    }

    .achievement-points {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--ion-color-primary);
      margin-top: auto;
    }

    .achievement-points ion-icon {
      font-size: 14px;
    }

    .share-button {
      position: absolute;
      top: 50px;
      right: 8px;
      --padding-start: 8px;
      --padding-end: 8px;
      z-index: 10;
    }

    .share-button ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary);
    }

    .share-button:hover ion-icon {
      color: var(--ion-color-primary-shade);
      transform: scale(1.1);
    }
  `]
})
export class AchievementCardComponent {
  // Services
  private readonly shareService = inject(ShareService);

  // Inputs
  public readonly achievement = input.required<Achievement>();

  // Outputs
  public readonly cardClick = output<Achievement>();

  // State
  private isShareLoading = false;

  // Computed values
  protected readonly progressPercent = () => {
    const ach = this.achievement();
    if (!ach || ach.requirement === 0) return 0;
    return Math.min(100, Math.round((ach.currentProgress / ach.requirement) * 100));
  };

  protected readonly tierIcon = () => {
    const tier = this.achievement()?.tier;
    switch (tier) {
      case 'bronze': return 'medal-outline';
      case 'silver': return 'medal-outline';
      case 'gold': return 'medal';
      case 'platinum': return 'diamond-outline';
      default: return 'medal-outline';
    }
  };

  protected onCardClick(): void {
    this.cardClick.emit(this.achievement());
  }

  protected async onShareClick(event: Event): Promise<void> {
    // Stop propagation to prevent card click
    event.stopPropagation();

    if (this.isShareLoading) return;

    this.isShareLoading = true;
    
    try {
      await this.shareService.shareAchievement(this.achievement(), true);
    } catch (error) {
      console.error('[AchievementCard] Error sharing:', error);
    } finally {
      this.isShareLoading = false;
    }
  }

  protected isSharing(): boolean {
    return this.isShareLoading;
  }

  protected formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
