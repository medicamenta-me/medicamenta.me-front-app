/**
 * 🧪 AchievementUnlockModalComponent Tests
 *
 * Testes unitários para o modal de desbloqueio de conquistas.
 * Cobertura: animações, som, haptic, share, screenshot.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AchievementUnlockModalComponent } from './achievement-unlock-modal.component';
import { IonicModule, ModalController } from '@ionic/angular';
import { AudioService } from '../../services/audio.service';
import { HapticService } from '../../services/haptic.service';
import { ShareService } from '../../services/share.service';
import { AnalyticsService } from '../../services/analytics.service';
import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Achievement, AchievementCategory, AchievementTier } from '../../models/achievement.model';

// Mock component to provide required input
@Component({
  template: '<app-achievement-unlock-modal [achievement]="achievementValue" />',
  standalone: true,
  imports: [AchievementUnlockModalComponent]
})
class TestHostComponent {
  achievementValue: any = {
    id: 'first_dose',
    name: 'First Dose',
    description: 'Take your first medication',
    icon: 'medal',
    category: 'adherence' as AchievementCategory,
    tier: 'bronze' as AchievementTier,
    points: 10,
    requirement: 1,
    currentProgress: 1,
    unlocked: true,
    unlockedAt: new Date()
  };
  
  setAchievement(achievement: any): void {
    this.achievementValue = achievement;
  }
}

describe('AchievementUnlockModalComponent', () => {
  let component: AchievementUnlockModalComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let audioServiceSpy: jasmine.SpyObj<AudioService>;
  let hapticServiceSpy: jasmine.SpyObj<HapticService>;
  let shareServiceSpy: jasmine.SpyObj<ShareService>;
  let analyticsServiceSpy: jasmine.SpyObj<AnalyticsService>;

  const mockAchievements: any = {
    bronze: {
      id: 'first_dose',
      name: 'First Dose',
      description: 'Take your first medication',
      icon: 'medal',
      category: 'adherence' as AchievementCategory,
      tier: 'bronze' as AchievementTier,
      points: 10,
      requirement: 1,
      currentProgress: 1,
      unlocked: true,
      unlockedAt: new Date()
    },
    silver: {
      id: 'week_streak',
      name: 'Week Streak',
      description: 'Complete 7 days streak',
      icon: 'star',
      category: 'streak' as AchievementCategory,
      tier: 'silver' as AchievementTier,
      points: 50,
      requirement: 7,
      currentProgress: 7,
      unlocked: true,
      unlockedAt: new Date()
    },
    gold: {
      id: 'perfect_week',
      name: 'Perfect Week',
      description: 'Perfect adherence for a week',
      icon: 'trophy',
      category: 'adherence' as AchievementCategory,
      tier: 'gold' as AchievementTier,
      points: 100,
      requirement: 7,
      currentProgress: 7,
      unlocked: true,
      unlockedAt: new Date()
    },
    platinum: {
      id: 'perfect_month',
      name: 'Perfect Month',
      description: 'Perfect adherence for a month',
      icon: 'diamond',
      category: 'adherence' as AchievementCategory,
      tier: 'platinum' as AchievementTier,
      points: 200,
      requirement: 30,
      currentProgress: 30,
      unlocked: true,
      unlockedAt: new Date()
    },
    levelUp: {
      id: 'level_5',
      name: 'Level 5',
      description: 'Reach level 5',
      icon: 'arrow-up',
      category: 'progression' as AchievementCategory,
      tier: 'gold' as AchievementTier,
      points: 150,
      requirement: 5,
      currentProgress: 5,
      unlocked: true,
      unlockedAt: new Date()
    }
  };

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalControllerSpy.dismiss.and.returnValue(Promise.resolve(true));
    audioServiceSpy = jasmine.createSpyObj('AudioService', [
      'playConfetti',
      'playStarburst',
      'playFireworks'
    ]);
    hapticServiceSpy = jasmine.createSpyObj('HapticService', [
      'light',
      'medium',
      'levelUp',
      'bronzeAchievement',
      'silverAchievement',
      'goldAchievement',
      'platinumAchievement'
    ]);
    shareServiceSpy = jasmine.createSpyObj('ShareService', ['shareAchievement']);
    shareServiceSpy.shareAchievement.and.returnValue(Promise.resolve());
    analyticsServiceSpy = jasmine.createSpyObj('AnalyticsService', ['logEvent']);

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, NoopAnimationsModule, IonicModule.forRoot(),
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: AudioService, useValue: audioServiceSpy },
        { provide: HapticService, useValue: hapticServiceSpy },
        { provide: ShareService, useValue: shareServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    
    // Get the actual component instance
    const debugElement = fixture.debugElement.query((de) => de.componentInstance instanceof AchievementUnlockModalComponent);
    component = debugElement?.componentInstance as AchievementUnlockModalComponent;
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have achievement input', () => {
      expect(component.achievement()).toBeTruthy();
      expect(component.achievement().name).toBe('First Dose');
    });

    it('should play sound on init', () => {
      expect(audioServiceSpy.playConfetti).toHaveBeenCalled();
    });

    it('should trigger haptic on init', () => {
      expect(hapticServiceSpy.bronzeAchievement).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TIER LABEL TESTS
  // ============================================================================

  describe('Tier Label', () => {
    it('should return bronze label', () => {
      hostComponent.setAchievement(mockAchievements['bronze']);
      fixture.detectChanges();
      expect((component as any).tierLabel()).toBe('🥉 Bronze');
    });

    it('should return silver label', () => {
      hostComponent.setAchievement(mockAchievements['silver']);
      fixture.detectChanges();
      expect((component as any).tierLabel()).toBe('🥈 Prata');
    });

    it('should return gold label', () => {
      hostComponent.setAchievement(mockAchievements['gold']);
      fixture.detectChanges();
      expect((component as any).tierLabel()).toBe('🥇 Ouro');
    });

    it('should return platinum label', () => {
      hostComponent.setAchievement(mockAchievements['platinum']);
      fixture.detectChanges();
      expect((component as any).tierLabel()).toBe('💎 Platina');
    });
  });

  // ============================================================================
  // HAPTIC FEEDBACK TESTS
  // ============================================================================

  describe('Haptic Feedback', () => {
    beforeEach(() => {
      // Reset spy counts
      hapticServiceSpy.bronzeAchievement.calls.reset();
      hapticServiceSpy.silverAchievement.calls.reset();
      hapticServiceSpy.goldAchievement.calls.reset();
      hapticServiceSpy.platinumAchievement.calls.reset();
      hapticServiceSpy.levelUp.calls.reset();
    });

    it('should trigger bronze haptic for bronze tier', async () => {
      hostComponent.setAchievement(mockAchievements['bronze']);
      
      // Recreate component to trigger ngOnInit
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.componentInstance.setAchievement(mockAchievements['bronze']);
      newFixture.detectChanges();
      
      expect(hapticServiceSpy.bronzeAchievement).toHaveBeenCalled();
    });

    it('should trigger level up haptic for level achievements', async () => {
      hostComponent.setAchievement(mockAchievements['levelUp']);
      
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.componentInstance.setAchievement(mockAchievements['levelUp']);
      newFixture.detectChanges();
      
      expect(hapticServiceSpy.levelUp).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SOUND EFFECT TESTS
  // ============================================================================

  describe('Sound Effects', () => {
    beforeEach(() => {
      audioServiceSpy.playConfetti.calls.reset();
      audioServiceSpy.playStarburst.calls.reset();
      audioServiceSpy.playFireworks.calls.reset();
    });

    it('should play confetti for regular achievements', async () => {
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.componentInstance.setAchievement(mockAchievements['bronze']);
      newFixture.detectChanges();
      
      expect(audioServiceSpy.playConfetti).toHaveBeenCalled();
    });

    it('should play starburst for level achievements', async () => {
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.componentInstance.setAchievement(mockAchievements['levelUp']);
      newFixture.detectChanges();
      
      expect(audioServiceSpy.playStarburst).toHaveBeenCalled();
    });

    it('should play fireworks for perfect week', async () => {
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.componentInstance.setAchievement(mockAchievements['gold']); // perfect_week
      newFixture.detectChanges();
      
      expect(audioServiceSpy.playFireworks).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REPLAY ANIMATION TESTS
  // ============================================================================

  describe('Replay Animation', () => {
    beforeEach(() => {
      // Mock lottieAnimation since it fails to load in test environment
      (component as any).lottieAnimation = {
        goToAndPlay: jasmine.createSpy('goToAndPlay'),
        setSpeed: jasmine.createSpy('setSpeed'),
        pause: jasmine.createSpy('pause'),
        play: jasmine.createSpy('play'),
        destroy: jasmine.createSpy('destroy')
      };
    });

    it('should trigger haptic on replay', fakeAsync(() => {
      hapticServiceSpy.light.calls.reset();
      (component as any).replayAnimation();
      
      expect(hapticServiceSpy.light).toHaveBeenCalled();
    }));

    it('should log analytics event on replay', () => {
      (component as any).replayAnimation();
      
      expect(analyticsServiceSpy.logEvent).toHaveBeenCalledWith(
        'animation_replay',
        jasmine.objectContaining({
          achievement_id: jasmine.any(String),
          tier: jasmine.any(String)
        })
      );
    });

    it('should set isReplaying to true', () => {
      (component as any).replayAnimation();
      expect((component as any).isReplaying()).toBe(true);
    });

    it('should reset isReplaying after delay', fakeAsync(() => {
      (component as any).replayAnimation();
      expect((component as any).isReplaying()).toBe(true);
      
      tick(350);
      expect((component as any).isReplaying()).toBe(false);
    }));
  });

  // ============================================================================
  // SLOW MOTION TESTS
  // ============================================================================

  describe('Slow Motion', () => {
    beforeEach(() => {
      // Mock lottieAnimation since it fails to load in test environment
      (component as any).lottieAnimation = {
        goToAndPlay: jasmine.createSpy('goToAndPlay'),
        setSpeed: jasmine.createSpy('setSpeed'),
        pause: jasmine.createSpy('pause'),
        play: jasmine.createSpy('play'),
        destroy: jasmine.createSpy('destroy')
      };
    });

    it('should start slow motion', () => {
      (component as any).startSlowMotion();
      expect((component as any).isSlowMotionActive()).toBe(true);
    });

    it('should trigger haptic on slow motion start', () => {
      hapticServiceSpy.medium.calls.reset();
      (component as any).startSlowMotion();
      expect(hapticServiceSpy.medium).toHaveBeenCalled();
    });

    it('should log analytics on slow motion', () => {
      (component as any).startSlowMotion();
      expect(analyticsServiceSpy.logEvent).toHaveBeenCalledWith(
        'animation_slowmotion',
        jasmine.objectContaining({
          achievement_id: jasmine.any(String),
          tier: jasmine.any(String)
        })
      );
    });

    it('should end slow motion', () => {
      (component as any).startSlowMotion();
      expect((component as any).isSlowMotionActive()).toBe(true);
      
      (component as any).endSlowMotion();
      expect((component as any).isSlowMotionActive()).toBe(false);
    });
  });

  // ============================================================================
  // SHARE TESTS
  // ============================================================================

  describe('Share Achievement', () => {
    it('should call share service', async () => {
      await (component as any).shareAchievement();
      
      expect(shareServiceSpy.shareAchievement).toHaveBeenCalledWith(
        jasmine.objectContaining({ id: 'first_dose' }),
        true
      );
    });

    it('should set isSharing during share', async () => {
      let wasSharing = false;
      shareServiceSpy.shareAchievement.and.callFake(() => {
        wasSharing = (component as any).isSharing();
        return Promise.resolve();
      });

      await (component as any).shareAchievement();
      
      expect(wasSharing).toBe(true);
    });

    it('should reset isSharing after share', async () => {
      await (component as any).shareAchievement();
      
      expect((component as any).isSharing()).toBe(false);
    });

    it('should reset isSharing on error', async () => {
      shareServiceSpy.shareAchievement.and.returnValue(Promise.reject(new Error('Share failed')));
      
      try {
        await (component as any).shareAchievement();
      } catch {
        // Ignore error
      }
      
      expect((component as any).isSharing()).toBe(false);
    });
  });

  // ============================================================================
  // DISMISS TESTS
  // ============================================================================

  describe('Dismiss', () => {
    it('should call modal controller dismiss', () => {
      // Access the private modalCtrl and replace with spy
      (component as any).modalCtrl = modalControllerSpy;
      (component as any).dismiss();
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should render modal container', () => {
      const container = fixture.nativeElement.querySelector('.modal-container');
      expect(container).toBeTruthy();
    });

    it('should render achievement card', () => {
      const card = fixture.nativeElement.querySelector('.achievement-modal-card');
      expect(card).toBeTruthy();
    });

    it('should render animation controls', () => {
      const controls = fixture.nativeElement.querySelector('.animation-controls');
      expect(controls).toBeTruthy();
    });

    it('should render achievement name', () => {
      const name = fixture.nativeElement.querySelector('.achievement-name');
      expect(name?.textContent).toContain('First Dose');
    });

    it('should render achievement description', () => {
      const description = fixture.nativeElement.querySelector('.achievement-description');
      expect(description?.textContent).toContain('Take your first medication');
    });

    it('should render points earned', () => {
      const points = fixture.nativeElement.querySelector('.points-earned');
      expect(points?.textContent).toContain('+10');
    });

    it('should render continue button', () => {
      const button = fixture.nativeElement.querySelector('.celebrate-button');
      expect(button).toBeTruthy();
    });

    it('should not show slow motion badge by default', () => {
      const badge = fixture.nativeElement.querySelector('.slow-motion-badge');
      expect(badge).toBeFalsy();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle achievement with maximum points', () => {
      const maxPointsAchievement: Achievement = {
        ...mockAchievements['platinum'],
        points: 9999
      };
      hostComponent.setAchievement(maxPointsAchievement);
      fixture.detectChanges();
      
      const points = fixture.nativeElement.querySelector('.points-earned');
      expect(points?.textContent).toContain('+9999');
    });

    it('should handle long achievement name', () => {
      const longNameAchievement: Achievement = {
        ...mockAchievements['bronze'],
        name: 'This is a very long achievement name that should still render properly'
      };
      hostComponent.setAchievement(longNameAchievement);
      fixture.detectChanges();
      
      const name = fixture.nativeElement.querySelector('.achievement-name');
      expect(name?.textContent).toContain('This is a very long');
    });
  });
});


