import { Component, input, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Achievement } from '../../models/achievement.model';
import { AudioService } from '../../services/audio.service';
import { HapticService } from '../../services/haptic.service';
import { ShareService } from '../../services/share.service';
import { AnalyticsService } from '../../services/analytics.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import type { AnimationItem } from 'lottie-web';

/**
 * Achievement Unlock Modal Component
 * Celebration modal when achievement is unlocked
 * Shows confetti animation and achievement details
 */
@Component({
  selector: 'app-achievement-unlock-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  animations: [
    trigger('scaleIn', [
      state('void', style({ transform: 'scale(0.5)', opacity: 0 })),
      state('*', style({ transform: 'scale(1)', opacity: 1 })),
      transition('void => *', animate('500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'))
    ]),
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition('void => *', animate('300ms ease-in'))
    ]),
    trigger('bounceIn', [
      state('void', style({ transform: 'translateY(-100px)', opacity: 0 })),
      state('*', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void => *', animate('600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)'))
    ])
  ],
  template: `
    <div class="modal-container" [@fadeIn]>
      <!-- Slow Motion Indicator -->
      @if (isSlowMotionActive()) {
        <div class="slow-motion-badge" [@fadeIn]>
          <ion-icon name="speedometer-outline"></ion-icon>
          <span>0.3x</span>
        </div>
      }

      <!-- Lottie Animation Container -->
      <div class="lottie-animation-container" 
           #lottieContainer
           [class.replaying]="isReplaying()"
           (click)="replayAnimation()"
           (press)="startSlowMotion()"
           (pressup)="endSlowMotion()">
      </div>

      <!-- Animation Controls -->
      <div class="animation-controls">
        <ion-button fill="clear" size="small" (click)="replayAnimation()" [disabled]="isSharing()">
          <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" size="small" (click)="captureScreenshot()" [disabled]="isSharing()">
          <ion-icon slot="icon-only" name="camera-outline"></ion-icon>
        </ion-button>
        <ion-button fill="clear" size="small" (click)="shareAchievement()" [disabled]="isSharing()">
          @if (isSharing()) {
            <ion-spinner name="circular" slot="icon-only"></ion-spinner>
          } @else {
            <ion-icon slot="icon-only" name="share-social-outline"></ion-icon>
          }
        </ion-button>
      </div>

      <!-- Achievement Card -->
      @if (achievement()) {
        <div class="achievement-modal-card" [@scaleIn]>
          <!-- Header -->
          <div class="modal-header">
            <div class="header-icon" [@bounceIn]>
              <ion-icon name="trophy"></ion-icon>
            </div>
            <h2>Conquista Desbloqueada!</h2>
          </div>

          <!-- Achievement Icon -->
          <div class="achievement-icon-large" [attr.data-tier]="achievement()!.tier">
            <div class="icon-glow"></div>
            <ion-icon [name]="achievement()!.icon"></ion-icon>
          </div>

          <!-- Achievement Info -->
          <div class="achievement-info">
            <!-- Tier Badge -->
            <div class="tier-badge-large" [attr.data-tier]="achievement()!.tier">
              {{ tierLabel() }}
            </div>

            <!-- Name -->
            <h3 class="achievement-name">{{ achievement()!.name }}</h3>

            <!-- Description -->
            <p class="achievement-description">{{ achievement()!.description }}</p>

            <!-- Points -->
            <div class="points-earned">
              <ion-icon name="star"></ion-icon>
              <span>+{{ achievement()!.points }} pontos</span>
            </div>
          </div>

          <!-- Action Button -->
          <ion-button 
            expand="block" 
            size="large"
            (click)="dismiss()"
            class="celebrate-button"
          >
            <ion-icon slot="start" name="checkmark-circle"></ion-icon>
            Continuar
          </ion-button>
        </div>
      }
    </div>
  `,
  styles: [`
    .modal-container {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10000;
    }

    .lottie-animation-container {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: all;
      z-index: 1;
      cursor: pointer;
    }

    /* Slow Motion Badge */
    .slow-motion-badge {
      position: absolute;
      top: 20px;
      left: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 11;
      background: rgba(255, 152, 0, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 8px 16px;
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .slow-motion-badge ion-icon {
      font-size: 20px;
      color: white;
    }

    .slow-motion-badge span {
      font-size: 16px;
      font-weight: 700;
      color: white;
      letter-spacing: 0.5px;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 6px 20px rgba(255, 152, 0, 0.6);
      }
    }

    /* Replay Animation Feedback */
    .lottie-animation-container.replaying {
      animation: replayPulse 0.3s ease-out;
    }

    @keyframes replayPulse {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        transform: scale(1);
      }
    }

    .animation-controls {
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 8px;
      z-index: 10;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border-radius: 30px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .animation-controls ion-button {
      --padding-start: 12px;
      --padding-end: 12px;
    }

    .animation-controls ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary);
    }

    .animation-controls ion-spinner {
      --color: var(--ion-color-primary);
    }

    .animation-controls ion-button:disabled {
      opacity: 0.5;
    }

    .achievement-modal-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 400px;
      padding: 32px 24px 24px;
      background: white;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 1;
    }

    .modal-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .header-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
    }

    .header-icon ion-icon {
      font-size: 32px;
      color: white;
    }

    .modal-header h2 {
      font-size: 24px;
      font-weight: 700;
      color: var(--ion-color-dark);
      margin: 0;
      text-align: center;
    }

    .achievement-icon-large {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 120px;
      height: 120px;
      border-radius: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .achievement-icon-large[data-tier="bronze"] {
      background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
    }

    .achievement-icon-large[data-tier="silver"] {
      background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
    }

    .achievement-icon-large[data-tier="gold"] {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    }

    .achievement-icon-large[data-tier="platinum"] {
      background: linear-gradient(135deg, #E5E4E2 0%, #B0B0B0 100%);
    }

    .icon-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
      animation: pulse-glow 2s infinite;
    }

    @keyframes pulse-glow {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.5;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.2);
        opacity: 0.8;
      }
    }

    .achievement-icon-large ion-icon {
      position: relative;
      font-size: 64px;
      color: white;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
      z-index: 1;
    }

    .achievement-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      width: 100%;
      margin-bottom: 24px;
    }

    .tier-badge-large {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: white;
    }

    .tier-badge-large[data-tier="bronze"] {
      background: linear-gradient(135deg, #CD7F32 0%, #A0522D 100%);
    }

    .tier-badge-large[data-tier="silver"] {
      background: linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%);
    }

    .tier-badge-large[data-tier="gold"] {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    }

    .tier-badge-large[data-tier="platinum"] {
      background: linear-gradient(135deg, #E5E4E2 0%, #B0B0B0 100%);
    }

    .achievement-name {
      font-size: 22px;
      font-weight: 700;
      color: var(--ion-color-dark);
      margin: 0;
      text-align: center;
    }

    .achievement-description {
      font-size: 15px;
      color: var(--ion-color-medium-shade);
      margin: 0;
      text-align: center;
      line-height: 1.5;
    }

    .points-earned {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      font-size: 18px;
      font-weight: 700;
      color: white;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .points-earned ion-icon {
      font-size: 24px;
    }

    .celebrate-button {
      width: 100%;
      margin: 0;
      --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --background-hover: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
      --border-radius: 12px;
      --box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      font-weight: 600;
    }
  `]
})
export class AchievementUnlockModalComponent implements OnInit, OnDestroy {
  private readonly modalCtrl = inject(ModalController);
  private readonly audioService = inject(AudioService);
  private readonly hapticService = inject(HapticService);
  private readonly shareService = inject(ShareService);
  private readonly analytics = inject(AnalyticsService);

  // ViewChild for Lottie container
  @ViewChild('lottieContainer', { static: true }) lottieContainer!: ElementRef;

  // Inputs
  public readonly achievement = input.required<Achievement>();

  // Visual feedback signals
  protected readonly isSlowMotionActive = signal<boolean>(false);
  protected readonly isReplaying = signal<boolean>(false);
  protected readonly isSharing = signal<boolean>(false);

  // Lottie animation instance
  private lottieAnimation: AnimationItem | null = null;

  ngOnInit(): void {
    this.loadLottieAnimation();
    this.playSound();
    this.triggerHaptic();
  }

  ngOnDestroy(): void {
    if (this.lottieAnimation) {
      this.lottieAnimation.destroy();
    }
  }

  /**
   * Load appropriate Lottie animation based on achievement type
   */
  private loadLottieAnimation(): void {
    const achievement = this.achievement();
    if (!achievement || !this.lottieContainer) return;

    // Determine animation path based on achievement
    let animationPath = 'assets/animations/confetti.json'; // Default

    // Level up achievements get starburst
    if (achievement.id.includes('level_')) {
      animationPath = 'assets/animations/starburst.json';
    }
    // Perfect week/month gets fireworks
    else if (achievement.id === 'perfect_week' || achievement.id === 'perfect_month') {
      animationPath = 'assets/animations/fireworks.json';
    }

    // Load animation with lazy loading
    import('lottie-web').then((lottieModule) => {
      const lottie = lottieModule.default;
      this.lottieAnimation = lottie.loadAnimation({
        container: this.lottieContainer.nativeElement,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: animationPath
      });
    }).catch((error) => {
      console.error('[AchievementModal] Failed to load lottie-web:', error);
    });
  }

  /**
   * Play sound effect based on achievement type
   */
  private playSound(): void {
    const achievement = this.achievement();
    if (!achievement) return;

    // Determine sound based on achievement
    if (achievement.id.includes('level_')) {
      this.audioService.playStarburst();
    } else if (achievement.id === 'perfect_week' || achievement.id === 'perfect_month') {
      this.audioService.playFireworks();
    } else {
      this.audioService.playConfetti();
    }
  }

  /**
   * Trigger haptic feedback based on achievement tier
   */
  private triggerHaptic(): void {
    const achievement = this.achievement();
    if (!achievement) return;

    // Level up gets special pattern
    if (achievement.id.includes('level_')) {
      this.hapticService.levelUp();
      return;
    }

    // Tier-based haptic patterns
    switch (achievement.tier) {
      case 'bronze':
        this.hapticService.bronzeAchievement();
        break;
      case 'silver':
        this.hapticService.silverAchievement();
        break;
      case 'gold':
        this.hapticService.goldAchievement();
        break;
      case 'platinum':
        this.hapticService.platinumAchievement();
        break;
      default:
        this.hapticService.medium();
    }
  }

  protected tierLabel = () => {
    const tier = this.achievement()?.tier;
    const labels = {
      bronze: '🥉 Bronze',
      silver: '🥈 Prata',
      gold: '🥇 Ouro',
      platinum: '💎 Platina'
    };
    return labels[tier] || '';
  };

  /**
   * Replay animation
   */
  protected replayAnimation(): void {
    if (this.lottieAnimation) {
      this.isReplaying.set(true);
      this.lottieAnimation.goToAndPlay(0);
      this.hapticService.light();
      this.playSound();
      
      // Track analytics
      this.analytics.logEvent('animation_replay', {
        achievement_id: this.achievement().id,
        tier: this.achievement().tier
      });

      // Reset replaying indicator after animation
      setTimeout(() => {
        this.isReplaying.set(false);
      }, 300);
    }
  }

  /**
   * Start slow motion
   */
  protected startSlowMotion(): void {
    if (this.lottieAnimation) {
      this.lottieAnimation.setSpeed(0.3);
      this.isSlowMotionActive.set(true);
      this.hapticService.medium();
      
      // Track analytics
      this.analytics.logEvent('animation_slowmotion', {
        achievement_id: this.achievement().id,
        tier: this.achievement().tier
      });
    }
  }

  /**
   * End slow motion
   */
  protected endSlowMotion(): void {
    if (this.lottieAnimation) {
      this.lottieAnimation.setSpeed(1);
      this.isSlowMotionActive.set(false);
    }
  }

  /**
   * Capture screenshot of modal
   */
  protected async captureScreenshot(): Promise<void> {
    try {
      // Pause animation
      if (this.lottieAnimation) {
        this.lottieAnimation.pause();
      }

      // Capture modal container
      const modalElement = this.lottieContainer.nativeElement.closest('.modal-container');
      if (!modalElement) return;

      // Lazy load html2canvas
      const html2canvas = await import('html2canvas').then(m => m.default);

      const canvas = await html2canvas(modalElement as HTMLElement, {
        backgroundColor: null,
        scale: 2,
        logging: false
      });

      // Convert to blob
      canvas.toBlob(async (blob: Blob | null) => {
        if (blob) {
          // Save or share
          const file = new File([blob], 'achievement.png', { type: 'image/png' });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Minha Conquista',
              files: [file]
            });
            
            // Track analytics
            this.analytics.logEvent('animation_screenshot', {
              achievement_id: this.achievement().id,
              tier: this.achievement().tier,
              method: 'share'
            });
          } else {
            // Fallback: Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'achievement.png';
            a.click();
            URL.revokeObjectURL(url);
            
            // Track analytics
            this.analytics.logEvent('animation_screenshot', {
              achievement_id: this.achievement().id,
              tier: this.achievement().tier,
              method: 'download'
            });
          }
        }
      });

      // Resume animation
      if (this.lottieAnimation) {
        this.lottieAnimation.play();
      }

      this.hapticService.light();
    } catch (error) {
      console.error('[Modal] Error capturing screenshot:', error);
    }
  }

  /**
   * Share achievement via ShareService
   */
  protected async shareAchievement(): Promise<void> {
    const achievement = this.achievement();
    if (achievement) {
      this.isSharing.set(true);
      try {
        await this.shareService.shareAchievement(achievement, true);
      } finally {
        this.isSharing.set(false);
      }
    }
  }

  protected dismiss(): void {
    this.modalCtrl.dismiss();
  }
}
