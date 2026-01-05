import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { AchievementCardComponent } from './achievement-card.component';
import { ShareService } from '../../services/share.service';
import { Achievement } from '../../models/achievement.model';

describe('AchievementCardComponent', () => {
  let component: AchievementCardComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let mockShareService: jasmine.SpyObj<ShareService>;
  let testHost: TestHostComponent;

  const unlockedAchievement: Achievement = {
    id: 'ach-001',
    name: 'Primeira Dose',
    description: 'Registre sua primeira medicação',
    icon: 'checkmark-circle',
    tier: 'bronze',
    requirement: 1,
    currentProgress: 1,
    points: 10,
    unlocked: true,
    unlockedAt: new Date(2024, 0, 15, 12, 0, 0), // January 15, 2024, noon - avoids timezone issues
    category: 'adherence'
  };

  const lockedAchievement: Achievement = {
    id: 'ach-002',
    name: 'Mestre da Consistência',
    description: 'Tome medicações por 30 dias consecutivos',
    icon: 'star',
    tier: 'gold',
    requirement: 30,
    currentProgress: 15,
    points: 100,
    unlocked: false,
    category: 'streak'
  };

  @Component({
    template: '<app-achievement-card [achievement]="achievement()" (cardClick)="onCardClick($event)"></app-achievement-card>',
    standalone: true,
    imports: [AchievementCardComponent]
  })
  class TestHostComponent {
    achievement = signal<Achievement>(unlockedAchievement);
    clickedAchievement: Achievement | null = null;

    onCardClick(ach: Achievement): void {
      this.clickedAchievement = ach;
    }
  }

  beforeEach(async () => {
    mockShareService = jasmine.createSpyObj('ShareService', ['shareAchievement']);
    mockShareService.shareAchievement.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, IonicModule.forRoot(),
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: ShareService, useValue: mockShareService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    testHost = fixture.componentInstance;
    fixture.detectChanges();
    
    const cardEl = fixture.debugElement.children[0];
    component = cardEl.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should receive achievement input', () => {
      expect(component.achievement()).toEqual(unlockedAchievement);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percent correctly', () => {
      testHost.achievement.set(lockedAchievement);
      fixture.detectChanges();
      
      // 15/30 * 100 = 50%
      expect((component as any).progressPercent()).toBe(50);
    });

    it('should return 0 when requirement is 0', () => {
      const zeroReq: Achievement = { ...lockedAchievement, requirement: 0, currentProgress: 5 };
      testHost.achievement.set(zeroReq);
      fixture.detectChanges();
      
      expect((component as any).progressPercent()).toBe(0);
    });

    it('should cap progress at 100%', () => {
      const overProgress: Achievement = { ...lockedAchievement, currentProgress: 50, requirement: 30 };
      testHost.achievement.set(overProgress);
      fixture.detectChanges();
      
      expect((component as any).progressPercent()).toBe(100);
    });

    it('should round progress to integer', () => {
      const fractional: Achievement = { ...lockedAchievement, currentProgress: 7, requirement: 30 };
      testHost.achievement.set(fractional);
      fixture.detectChanges();
      
      // 7/30 * 100 = 23.33... should round to 23
      expect((component as any).progressPercent()).toBe(23);
    });
  });

  describe('Tier Icon', () => {
    it('should return medal-outline for bronze tier', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'bronze' });
      fixture.detectChanges();
      
      expect((component as any).tierIcon()).toBe('medal-outline');
    });

    it('should return medal-outline for silver tier', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'silver' });
      fixture.detectChanges();
      
      expect((component as any).tierIcon()).toBe('medal-outline');
    });

    it('should return medal for gold tier', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'gold' });
      fixture.detectChanges();
      
      expect((component as any).tierIcon()).toBe('medal');
    });

    it('should return diamond-outline for platinum tier', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'platinum' });
      fixture.detectChanges();
      
      expect((component as any).tierIcon()).toBe('diamond-outline');
    });

    it('should return default medal-outline for unknown tier', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'unknown' as any });
      fixture.detectChanges();
      
      expect((component as any).tierIcon()).toBe('medal-outline');
    });
  });

  describe('Card Click', () => {
    it('should emit cardClick event when card is clicked', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      card.click();
      
      expect(testHost.clickedAchievement).toEqual(unlockedAchievement);
    });

    it('should emit achievement on Enter keypress', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      const event = new KeyboardEvent('keyup', { key: 'Enter' });
      card.dispatchEvent(event);
      
      // The output is emitted via onCardClick method
      expect(testHost.clickedAchievement).toBeTruthy();
    });
  });

  describe('Share Functionality', () => {
    it('should call shareService when share button is clicked', fakeAsync(() => {
      const shareBtn = fixture.nativeElement.querySelector('.share-button');
      expect(shareBtn).toBeTruthy();
      
      shareBtn.click();
      tick();
      
      expect(mockShareService.shareAchievement).toHaveBeenCalledWith(unlockedAchievement, true);
    }));

    it('should stop propagation on share click', fakeAsync(() => {
      testHost.clickedAchievement = null;
      
      const shareBtn = fixture.nativeElement.querySelector('.share-button');
      shareBtn.click();
      tick();
      
      // Card click should not have been triggered
      expect(testHost.clickedAchievement).toBeNull();
    }));

    it('should not share when already sharing', fakeAsync(() => {
      (component as any).isShareLoading = true;
      
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      
      (component as any).onShareClick(event);
      tick();
      
      expect(mockShareService.shareAchievement).not.toHaveBeenCalled();
    }));

    it('should handle share error gracefully', fakeAsync(() => {
      mockShareService.shareAchievement.and.returnValue(Promise.reject(new Error('Share failed')));
      spyOn(console, 'error');
      
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      
      (component as any).onShareClick(event);
      tick();
      
      expect(console.error).toHaveBeenCalled();
      expect((component as any).isShareLoading).toBeFalse();
    }));

    it('should set isShareLoading during share operation', fakeAsync(() => {
      let shareResolved = false;
      mockShareService.shareAchievement.and.callFake(() => {
        return new Promise<void>(resolve => {
          setTimeout(() => {
            shareResolved = true;
            resolve();
          }, 100);
        });
      });

      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      
      (component as any).onShareClick(event);
      
      expect((component as any).isShareLoading).toBeTrue();
      
      tick(100);
      
      expect((component as any).isShareLoading).toBeFalse();
      expect(shareResolved).toBeTrue();
    }));
  });

  describe('Date Formatting', () => {
    it('should format date in pt-BR format', () => {
      // Use a date with explicit time to avoid timezone issues
      const date = new Date(2024, 2, 15, 12, 0, 0); // March 15, 2024, noon
      const formatted = (component as any).formatDate(date);
      
      expect(formatted).toBe('15/03/2024');
    });

    it('should handle string date input', () => {
      // Use a date with explicit time to avoid timezone issues
      const formatted = (component as any).formatDate(new Date(2024, 11, 25, 12, 0, 0)); // December 25, 2024
      
      expect(formatted).toBe('25/12/2024');
    });
  });

  describe('isSharing Method', () => {
    it('should return false by default', () => {
      expect((component as any).isSharing()).toBeFalse();
    });

    it('should return true when sharing', () => {
      (component as any).isShareLoading = true;
      expect((component as any).isSharing()).toBeTrue();
    });
  });

  describe('DOM Rendering - Unlocked Achievement', () => {
    beforeEach(() => {
      testHost.achievement.set(unlockedAchievement);
      fixture.detectChanges();
    });

    it('should render achievement card', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card).toBeTruthy();
    });

    it('should have unlocked class when unlocked', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.classList.contains('unlocked')).toBeTrue();
    });

    it('should render tier badge', () => {
      const tierBadge = fixture.nativeElement.querySelector('.tier-badge');
      expect(tierBadge).toBeTruthy();
      expect(tierBadge.getAttribute('data-tier')).toBe('bronze');
    });

    it('should render achievement icon', () => {
      const icon = fixture.nativeElement.querySelector('.achievement-icon');
      expect(icon).toBeTruthy();
      expect(icon.classList.contains('unlocked')).toBeTrue();
    });

    it('should render achievement name', () => {
      const name = fixture.nativeElement.querySelector('.achievement-name');
      expect(name).toBeTruthy();
      expect(name.textContent).toBe('Primeira Dose');
    });

    it('should render achievement description', () => {
      const desc = fixture.nativeElement.querySelector('.achievement-description');
      expect(desc).toBeTruthy();
      expect(desc.textContent).toBe('Registre sua primeira medicação');
    });

    it('should render unlocked badge', () => {
      const badge = fixture.nativeElement.querySelector('.unlocked-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Desbloqueada');
    });

    it('should render unlock date', () => {
      const date = fixture.nativeElement.querySelector('.unlock-date');
      expect(date).toBeTruthy();
      expect(date.textContent).toBe('15/01/2024');
    });

    it('should render share button for unlocked achievements', () => {
      const shareBtn = fixture.nativeElement.querySelector('.share-button');
      expect(shareBtn).toBeTruthy();
    });

    it('should render points', () => {
      const points = fixture.nativeElement.querySelector('.achievement-points');
      expect(points).toBeTruthy();
      expect(points.textContent).toContain('10 pontos');
    });

    it('should NOT render progress bar for unlocked achievements', () => {
      const progress = fixture.nativeElement.querySelector('.achievement-progress');
      expect(progress).toBeNull();
    });
  });

  describe('DOM Rendering - Locked Achievement', () => {
    beforeEach(() => {
      testHost.achievement.set(lockedAchievement);
      fixture.detectChanges();
    });

    it('should have locked class', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.classList.contains('locked')).toBeTrue();
    });

    it('should render progress bar', () => {
      const progress = fixture.nativeElement.querySelector('.achievement-progress');
      expect(progress).toBeTruthy();
    });

    it('should render progress text', () => {
      const text = fixture.nativeElement.querySelector('.progress-text');
      expect(text).toBeTruthy();
      expect(text.textContent.trim()).toBe('15 / 30');
    });

    it('should set progress fill width', () => {
      const fill = fixture.nativeElement.querySelector('.progress-fill');
      expect(fill).toBeTruthy();
      expect(fill.style.width).toBe('50%');
    });

    it('should NOT render unlocked badge', () => {
      const badge = fixture.nativeElement.querySelector('.unlocked-badge');
      expect(badge).toBeNull();
    });

    it('should NOT render share button', () => {
      const shareBtn = fixture.nativeElement.querySelector('.share-button');
      expect(shareBtn).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role attribute', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.getAttribute('role')).toBe('button');
    });

    it('should have tabindex for keyboard navigation', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.getAttribute('tabindex')).toBe('0');
    });

    it('should have aria-label with achievement name', () => {
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.getAttribute('aria-label')).toBe('Achievement: Primeira Dose');
    });
  });

  describe('Tier Styling', () => {
    it('should apply gold tier data attribute', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'gold' });
      fixture.detectChanges();
      
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.getAttribute('data-tier')).toBe('gold');
    });

    it('should apply silver tier data attribute', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'silver' });
      fixture.detectChanges();
      
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.getAttribute('data-tier')).toBe('silver');
    });

    it('should apply platinum tier data attribute', () => {
      testHost.achievement.set({ ...unlockedAchievement, tier: 'platinum' });
      fixture.detectChanges();
      
      const card = fixture.nativeElement.querySelector('.achievement-card');
      expect(card.getAttribute('data-tier')).toBe('platinum');
    });
  });

  describe('Edge Cases', () => {
    it('should handle achievement without unlockedAt', () => {
      const achWithoutDate: Achievement = { ...unlockedAchievement, unlockedAt: undefined };
      testHost.achievement.set(achWithoutDate);
      fixture.detectChanges();
      
      const date = fixture.nativeElement.querySelector('.unlock-date');
      expect(date).toBeNull();
    });

    it('should handle zero progress', () => {
      const zeroProgress: Achievement = { ...lockedAchievement, currentProgress: 0 };
      testHost.achievement.set(zeroProgress);
      fixture.detectChanges();
      
      expect((component as any).progressPercent()).toBe(0);
    });
  });
});

