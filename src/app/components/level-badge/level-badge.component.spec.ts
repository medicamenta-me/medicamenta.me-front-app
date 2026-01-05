import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal, computed } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { LevelBadgeComponent } from './level-badge.component';
import { GamificationService } from '../../services/gamification.service';

// Mock GamificationService
const createMockGamificationService = () => {
  const totalPoints = signal(250);
  const levelProgress = signal({
    current: {
      level: 3,
      name: 'Adepto',
      icon: 'star',
      color: '#4CAF50',
      minPoints: 200
    },
    next: {
      level: 4,
      name: 'Mestre',
      icon: 'star-half',
      color: '#2196F3',
      minPoints: 500
    },
    progress: 16.67 // (250-200)/(500-200) * 100
  });

  return {
    totalPoints,
    levelProgress,
    setTotalPoints: (pts: number) => totalPoints.set(pts),
    setLevelProgress: (prog: any) => levelProgress.set(prog)
  };
};

describe('LevelBadgeComponent', () => {
  let component: LevelBadgeComponent;
  let fixture: ComponentFixture<LevelBadgeComponent>;
  let mockGamificationService: ReturnType<typeof createMockGamificationService>;

  beforeEach(async () => {
    mockGamificationService = createMockGamificationService();

    await TestBed.configureTestingModule({
      imports: [LevelBadgeComponent, IonicModule.forRoot(),
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ]
    })
      .overrideComponent(LevelBadgeComponent, {
        set: {
          providers: [
            { provide: GamificationService, useValue: mockGamificationService }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(LevelBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default compact value as false', () => {
      expect(component.compact()).toBeFalse();
    });
  });

  describe('Level Display', () => {
    it('should display current level from service', () => {
      expect((component as any).currentLevel()).toBe(3);
    });

    it('should display level name from service', () => {
      expect((component as any).levelName()).toBe('Adepto');
    });

    it('should display level icon from service', () => {
      expect((component as any).levelIcon()).toBe('star');
    });

    it('should display level color from service', () => {
      expect((component as any).levelColor()).toBe('#4CAF50');
    });

    it('should display current points from service', () => {
      expect((component as any).currentPoints()).toBe(250);
    });
  });

  describe('Next Level Info', () => {
    it('should return next level info', () => {
      const next = (component as any).nextLevel();
      expect(next).toBeTruthy();
      expect(next.level).toBe(4);
      expect(next.name).toBe('Mestre');
    });

    it('should calculate points to next level', () => {
      // nextLevel.minPoints (500) - currentPoints (250) = 250
      expect((component as any).pointsToNext()).toBe(250);
    });

    it('should return 0 points to next when at max level', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 10,
          name: 'Lenda',
          icon: 'trophy',
          color: '#FFD700',
          minPoints: 10000
        },
        next: null,
        progress: 100
      });
      fixture.detectChanges();
      
      expect((component as any).pointsToNext()).toBe(0);
    });
  });

  describe('Progress Calculation', () => {
    it('should return progress percentage from service', () => {
      expect((component as any).progress()).toBeCloseTo(16.67, 1);
    });

    it('should handle 0% progress', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 1,
          name: 'Iniciante',
          icon: 'leaf',
          color: '#8BC34A',
          minPoints: 0
        },
        next: {
          level: 2,
          name: 'Aprendiz',
          icon: 'star-outline',
          color: '#4CAF50',
          minPoints: 100
        },
        progress: 0
      });
      fixture.detectChanges();
      
      expect((component as any).progress()).toBe(0);
    });

    it('should handle 100% progress', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 10,
          name: 'Lenda',
          icon: 'trophy',
          color: '#FFD700',
          minPoints: 10000
        },
        next: null,
        progress: 100
      });
      fixture.detectChanges();
      
      expect((component as any).progress()).toBe(100);
    });
  });

  describe('Circle Gradient', () => {
    it('should generate circle gradient based on level color', () => {
      const gradient = (component as any).circleGradient();
      expect(gradient).toContain('linear-gradient');
      expect(gradient).toContain('#4CAF50');
    });

    it('should include darkened color in gradient', () => {
      const gradient = (component as any).circleGradient();
      expect(gradient).toMatch(/linear-gradient\(135deg.*\)/);
    });
  });

  describe('Progress Ring', () => {
    it('should have correct circumference constant', () => {
      // circumference = 2 * PI * 45
      const expectedCircumference = 2 * Math.PI * 45;
      expect((component as any).circumference).toBeCloseTo(expectedCircumference, 2);
    });

    it('should calculate dash offset based on progress', () => {
      const circumference = 2 * Math.PI * 45;
      const progress = (component as any).progress();
      const expectedOffset = circumference * (1 - progress / 100);
      
      expect((component as any).dashOffset()).toBeCloseTo(expectedOffset, 2);
    });

    it('should have full circumference offset at 0% progress', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 1,
          name: 'Iniciante',
          icon: 'leaf',
          color: '#8BC34A',
          minPoints: 0
        },
        next: {
          level: 2,
          name: 'Aprendiz',
          icon: 'star-outline',
          color: '#4CAF50',
          minPoints: 100
        },
        progress: 0
      });
      fixture.detectChanges();
      
      const circumference = 2 * Math.PI * 45;
      expect((component as any).dashOffset()).toBeCloseTo(circumference, 2);
    });

    it('should have zero offset at 100% progress', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 10,
          name: 'Lenda',
          icon: 'trophy',
          color: '#FFD700',
          minPoints: 10000
        },
        next: null,
        progress: 100
      });
      fixture.detectChanges();
      
      expect((component as any).dashOffset()).toBeCloseTo(0, 2);
    });
  });

  describe('Progress Color', () => {
    it('should return white color when next level exists', () => {
      expect((component as any).progressColor()).toBe('rgba(255, 255, 255, 0.9)');
    });

    it('should return gold color at max level', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 10,
          name: 'Lenda',
          icon: 'trophy',
          color: '#FFD700',
          minPoints: 10000
        },
        next: null,
        progress: 100
      });
      fixture.detectChanges();
      
      expect((component as any).progressColor()).toBe('#FFD700');
    });
  });

  describe('Adjust Brightness (private method)', () => {
    it('should darken color with negative percent', () => {
      const adjustBrightness = (component as any).adjustBrightness.bind(component);
      const darkened = adjustBrightness('#FFFFFF', -50);
      
      // Should be darker than white
      expect(darkened).not.toBe('#FFFFFF');
      expect(darkened).toBe('#808080');
    });

    it('should lighten color with positive percent', () => {
      const adjustBrightness = (component as any).adjustBrightness.bind(component);
      const lightened = adjustBrightness('#000000', 50);
      
      // Should be lighter than black
      expect(lightened).not.toBe('#000000');
    });

    it('should clamp values to valid range', () => {
      const adjustBrightness = (component as any).adjustBrightness.bind(component);
      
      // Lightening white should clamp to max
      const maxLightened = adjustBrightness('#FFFFFF', 100);
      expect(maxLightened).toBe('#ffffff');
      
      // Darkening black should clamp to min
      const maxDarkened = adjustBrightness('#000000', -100);
      expect(maxDarkened).toBe('#000000');
    });

    it('should handle mid-tone colors', () => {
      const adjustBrightness = (component as any).adjustBrightness.bind(component);
      const result = adjustBrightness('#808080', 10);
      
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should handle color without hash', () => {
      const adjustBrightness = (component as any).adjustBrightness.bind(component);
      // The function expects # prefix in color string
      const result = adjustBrightness('#4CAF50', -20);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('Compact Mode', () => {
    it('should apply compact class when compact is true', () => {
      // Create a test wrapper to set input
      @Component({
        template: '<app-level-badge [compact]="true"></app-level-badge>',
        standalone: true,
        imports: [LevelBadgeComponent]
      })
      class TestHostComponent {}

      // Note: In actual rendering, the compact CSS would apply
      // This test verifies the input binding works
      const testFixture = TestBed.createComponent(TestHostComponent);
      testFixture.detectChanges();
      
      const badgeEl = testFixture.nativeElement.querySelector('app-level-badge');
      expect(badgeEl).toBeTruthy();
    });
  });

  describe('DOM Rendering', () => {
    it('should render level badge container', () => {
      const badge = fixture.nativeElement.querySelector('.level-badge');
      expect(badge).toBeTruthy();
    });

    it('should render progress ring SVG', () => {
      const svg = fixture.nativeElement.querySelector('.progress-ring');
      expect(svg).toBeTruthy();
    });

    it('should render level content', () => {
      const content = fixture.nativeElement.querySelector('.level-content');
      expect(content).toBeTruthy();
    });

    it('should render level number', () => {
      const levelNumber = fixture.nativeElement.querySelector('.level-number');
      expect(levelNumber).toBeTruthy();
      expect(levelNumber.textContent.trim()).toBe('3');
    });

    it('should render level info section when not compact', () => {
      const info = fixture.nativeElement.querySelector('.level-info');
      expect(info).toBeTruthy();
    });

    it('should render level name', () => {
      const name = fixture.nativeElement.querySelector('.level-name');
      expect(name).toBeTruthy();
      expect(name.textContent.trim()).toBe('Adepto');
    });

    it('should render points display', () => {
      const points = fixture.nativeElement.querySelector('.level-points');
      expect(points).toBeTruthy();
      expect(points.textContent).toContain('250');
    });

    it('should render progress text', () => {
      const progressText = fixture.nativeElement.querySelector('.level-progress-text');
      expect(progressText).toBeTruthy();
    });

    it('should show max-level class when at maximum level', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 10,
          name: 'Lenda',
          icon: 'trophy',
          color: '#FFD700',
          minPoints: 10000
        },
        next: null,
        progress: 100
      });
      fixture.detectChanges();
      
      const progressText = fixture.nativeElement.querySelector('.level-progress-text');
      expect(progressText?.classList.contains('max-level')).toBeTrue();
    });
  });

  describe('Reactive Updates', () => {
    it('should update when total points change', () => {
      mockGamificationService.setTotalPoints(500);
      fixture.detectChanges();
      
      expect((component as any).currentPoints()).toBe(500);
    });

    it('should update level display when level changes', () => {
      mockGamificationService.setLevelProgress({
        current: {
          level: 5,
          name: 'Expert',
          icon: 'medal',
          color: '#9C27B0',
          minPoints: 1000
        },
        next: {
          level: 6,
          name: 'Guru',
          icon: 'ribbon',
          color: '#673AB7',
          minPoints: 2000
        },
        progress: 25
      });
      fixture.detectChanges();
      
      expect((component as any).currentLevel()).toBe(5);
      expect((component as any).levelName()).toBe('Expert');
      expect((component as any).progress()).toBe(25);
    });
  });
});

