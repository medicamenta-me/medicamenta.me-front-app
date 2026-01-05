import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { StreakWidgetComponent } from './streak-widget.component';
import { GamificationService } from '../../services/gamification.service';

// Mock GamificationService
const createMockGamificationService = () => {
  const streak = signal({
    currentStreak: 7,
    longestStreak: 15,
    isActive: true,
    lastActivityDate: new Date(),
    streakStartDate: new Date()
  });

  return {
    streak,
    checkStreakRisk: jasmine.createSpy('checkStreakRisk').and.returnValue(false),
    setStreak: (data: any) => streak.set(data)
  };
};

describe('StreakWidgetComponent', () => {
  let component: StreakWidgetComponent;
  let fixture: ComponentFixture<StreakWidgetComponent>;
  let mockGamificationService: ReturnType<typeof createMockGamificationService>;

  beforeEach(async () => {
    mockGamificationService = createMockGamificationService();

    await TestBed.configureTestingModule({
      imports: [StreakWidgetComponent, IonicModule.forRoot(),
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ]
    })
      .overrideComponent(StreakWidgetComponent, {
        set: {
          providers: [
            { provide: GamificationService, useValue: mockGamificationService }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(StreakWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Current Streak', () => {
    it('should return current streak from service', () => {
      expect((component as any).currentStreak()).toBe(7);
    });

    it('should return 0 when streak is null', () => {
      mockGamificationService.setStreak(null);
      fixture.detectChanges();
      
      expect((component as any).currentStreak()).toBe(0);
    });

    it('should return 0 when streak object has no currentStreak', () => {
      mockGamificationService.setStreak({ longestStreak: 10, isActive: false });
      fixture.detectChanges();
      
      expect((component as any).currentStreak()).toBe(0);
    });
  });

  describe('Longest Streak', () => {
    it('should return longest streak from service', () => {
      expect((component as any).longestStreak()).toBe(15);
    });

    it('should return 0 when streak is null', () => {
      mockGamificationService.setStreak(null);
      fixture.detectChanges();
      
      expect((component as any).longestStreak()).toBe(0);
    });
  });

  describe('Is Active', () => {
    it('should return true when streak is active', () => {
      expect((component as any).isActive()).toBeTrue();
    });

    it('should return false when streak is inactive', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 15,
        isActive: false
      });
      fixture.detectChanges();
      
      expect((component as any).isActive()).toBeFalse();
    });

    it('should return false when streak is null', () => {
      mockGamificationService.setStreak(null);
      fixture.detectChanges();
      
      expect((component as any).isActive()).toBeFalse();
    });
  });

  describe('Streak Icon', () => {
    it('should return flame icon for active streak', () => {
      expect((component as any).streakIcon()).toBe('flame');
    });

    it('should return flame-outline for zero streak', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 15,
        isActive: false
      });
      fixture.detectChanges();
      
      expect((component as any).streakIcon()).toBe('flame-outline');
    });
  });

  describe('Streak Label', () => {
    it('should return "Dias de Streak" for multiple days', () => {
      expect((component as any).streakLabel()).toBe('Dias de Streak');
    });

    it('should return "Dia de Streak" for single day', () => {
      mockGamificationService.setStreak({
        currentStreak: 1,
        longestStreak: 15,
        isActive: true
      });
      fixture.detectChanges();
      
      expect((component as any).streakLabel()).toBe('Dia de Streak');
    });

    it('should return "Sem Streak" for zero days', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 15,
        isActive: false
      });
      fixture.detectChanges();
      
      expect((component as any).streakLabel()).toBe('Sem Streak');
    });
  });

  describe('Is At Risk', () => {
    it('should call checkStreakRisk from service', () => {
      (component as any).isAtRisk();
      expect(mockGamificationService.checkStreakRisk).toHaveBeenCalled();
    });

    it('should return false when not at risk', () => {
      // Default mock returns false
      expect((component as any).isAtRisk()).toBeFalse();
    });

    // Note: Testing dynamic return value changes is complex with Angular computed signals
    // because computed values don't re-evaluate when spy return values change mid-test.
    // The component correctly uses checkStreakRisk() which we've verified is called.
  });

  describe('Progress Percent', () => {
    it('should calculate progress as percentage of longest streak', () => {
      // 7 / 15 * 100 = 46.67 rounded to 47
      expect((component as any).progressPercent()).toBe(47);
    });

    it('should return 0 when longest streak is 0', () => {
      mockGamificationService.setStreak({
        currentStreak: 5,
        longestStreak: 0,
        isActive: true
      });
      fixture.detectChanges();
      
      expect((component as any).progressPercent()).toBe(0);
    });

    it('should return 0 when current streak is 0', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 15,
        isActive: false
      });
      fixture.detectChanges();
      
      expect((component as any).progressPercent()).toBe(0);
    });

    it('should return 100 when at or exceeding record', () => {
      mockGamificationService.setStreak({
        currentStreak: 15,
        longestStreak: 15,
        isActive: true
      });
      fixture.detectChanges();
      
      expect((component as any).progressPercent()).toBe(100);
    });

    it('should return 100 when exceeding record', () => {
      mockGamificationService.setStreak({
        currentStreak: 20,
        longestStreak: 15,
        isActive: true
      });
      fixture.detectChanges();
      
      expect((component as any).progressPercent()).toBe(100);
    });
  });

  describe('Progress Text', () => {
    it('should show remaining days to record', () => {
      // 15 - 7 = 8 remaining
      expect((component as any).progressText()).toBe('8 para recorde');
    });

    it('should show "Comece agora!" when longest is 0', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 0,
        isActive: false
      });
      fixture.detectChanges();
      
      expect((component as any).progressText()).toBe('Comece agora!');
    });

    it('should show "Recorde! 🎉" when at record', () => {
      mockGamificationService.setStreak({
        currentStreak: 15,
        longestStreak: 15,
        isActive: true
      });
      fixture.detectChanges();
      
      expect((component as any).progressText()).toBe('Recorde! 🎉');
    });

    it('should show "Recorde! 🎉" when exceeding record', () => {
      mockGamificationService.setStreak({
        currentStreak: 20,
        longestStreak: 15,
        isActive: true
      });
      fixture.detectChanges();
      
      expect((component as any).progressText()).toBe('Recorde! 🎉');
    });
  });

  describe('Show Progress', () => {
    it('should return true by default', () => {
      expect((component as any).showProgress()).toBeTrue();
    });
  });

  describe('DOM Rendering', () => {
    it('should render streak widget', () => {
      const widget = fixture.nativeElement.querySelector('.streak-widget');
      expect(widget).toBeTruthy();
    });

    it('should have active class when streak is active', () => {
      const widget = fixture.nativeElement.querySelector('.streak-widget');
      expect(widget.classList.contains('active')).toBeTrue();
    });

    it('should NOT have active class when streak is inactive', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 15,
        isActive: false
      });
      fixture.detectChanges();
      
      const widget = fixture.nativeElement.querySelector('.streak-widget');
      expect(widget.classList.contains('active')).toBeFalse();
    });

    // Note: at-risk class testing is skipped because Angular computed signals
    // don't re-evaluate when spy return values change mid-test

    it('should render streak icon', () => {
      const icon = fixture.nativeElement.querySelector('.streak-icon ion-icon');
      expect(icon).toBeTruthy();
      expect(icon.getAttribute('name')).toBe('flame');
    });

    it('should render streak number', () => {
      const number = fixture.nativeElement.querySelector('.streak-number');
      expect(number).toBeTruthy();
      expect(number.textContent.trim()).toBe('7');
    });

    it('should render streak label', () => {
      const label = fixture.nativeElement.querySelector('.streak-label');
      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Dias de Streak');
    });

    it('should render progress section when streak > 0', () => {
      const progress = fixture.nativeElement.querySelector('.streak-progress');
      expect(progress).toBeTruthy();
    });

    it('should NOT render progress section when streak is 0', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 15,
        isActive: false
      });
      fixture.detectChanges();
      
      const progress = fixture.nativeElement.querySelector('.streak-progress');
      expect(progress).toBeNull();
    });

    it('should render progress bar', () => {
      const bar = fixture.nativeElement.querySelector('.progress-bar');
      expect(bar).toBeTruthy();
    });

    it('should set progress fill width', () => {
      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill).toBeTruthy();
      expect(fill.style.width).toBe('47%');
    });

    it('should render progress text', () => {
      const text = fixture.nativeElement.querySelector('.progress-text');
      expect(text).toBeTruthy();
      expect(text.textContent.trim()).toBe('8 para recorde');
    });
  });

  describe('Icon Pulse Animation', () => {
    it('should have pulse class when active', () => {
      const icon = fixture.nativeElement.querySelector('.streak-icon ion-icon');
      expect(icon.classList.contains('pulse')).toBeTrue();
    });

    it('should NOT have pulse class when inactive', () => {
      mockGamificationService.setStreak({
        currentStreak: 0,
        longestStreak: 15,
        isActive: false
      });
      fixture.detectChanges();
      
      const icon = fixture.nativeElement.querySelector('.streak-icon ion-icon');
      expect(icon.classList.contains('pulse')).toBeFalse();
    });
  });

  describe('Reactive Updates', () => {
    it('should update when streak changes', () => {
      mockGamificationService.setStreak({
        currentStreak: 10,
        longestStreak: 20,
        isActive: true
      });
      fixture.detectChanges();
      
      expect((component as any).currentStreak()).toBe(10);
      expect((component as any).longestStreak()).toBe(20);
    });

    it('should update DOM when streak changes', () => {
      mockGamificationService.setStreak({
        currentStreak: 30,
        longestStreak: 25,
        isActive: true
      });
      fixture.detectChanges();
      
      const number = fixture.nativeElement.querySelector('.streak-number');
      expect(number.textContent.trim()).toBe('30');
      
      const text = fixture.nativeElement.querySelector('.progress-text');
      expect(text.textContent.trim()).toBe('Recorde! 🎉');
    });
  });
});

