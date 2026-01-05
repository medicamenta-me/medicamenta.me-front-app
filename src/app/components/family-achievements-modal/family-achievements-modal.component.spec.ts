import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FamilyAchievementsModalComponent } from './family-achievements-modal.component';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { FamilyGamificationService, FAMILY_ACHIEVEMENT_DEFINITIONS } from '../../services/family-gamification.service';
import { signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('FamilyAchievementsModalComponent', () => {
  let component: FamilyAchievementsModalComponent;
  let fixture: ComponentFixture<FamilyAchievementsModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let familyGamificationServiceSpy: jasmine.SpyObj<FamilyGamificationService>;

  const mockFamilyGamification = {
    totalDosesTaken: 1000,
    perfectDays: 50,
    currentStreak: 7,
    longestStreak: 14,
    achievements: [
      { id: 'first_dose', unlockedAt: new Date() }
    ],
    memberStats: [
      { memberId: '1', name: 'João', contributions: 500 },
      { memberId: '2', name: 'Maria', contributions: 300 }
    ]
  };

  const mockAchievementsWithStatus: any[] = [
    { id: 'first_dose', name: 'First Dose', unlocked: true, rarity: 'common' as const, unlockedAt: new Date(), description: 'First', icon: 'star', points: 10, color: 'gold' },
    { id: 'streak_7', name: '7 Day Streak', unlocked: true, rarity: 'rare' as const, unlockedAt: new Date(), description: 'Streak', icon: 'flame', points: 50, color: 'purple' },
    { id: 'legend', name: 'Legend', unlocked: false, rarity: 'legendary' as const, description: 'Legendary', icon: 'trophy', points: 100, color: 'gold' }
  ];

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    
    familyGamificationServiceSpy = jasmine.createSpyObj('FamilyGamificationService', [
      'getAllAchievementsWithStatus'
    ], {
      familyGamification: signal(mockFamilyGamification),
      totalFamilyPoints: signal(5000),
      familyLevel: signal(5),
      levelProgress: signal(0.6),
      memberStatsRanking: signal([
        { memberId: '1', name: 'João', contributions: 500, rank: 1 },
        { memberId: '2', name: 'Maria', contributions: 300, rank: 2 }
      ]),
      currentStreak: signal(7),
      longestStreak: signal(14)
    });
    
    familyGamificationServiceSpy.getAllAchievementsWithStatus.and.returnValue(mockAchievementsWithStatus);

    await TestBed.configureTestingModule({
      imports: [FamilyAchievementsModalComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: FamilyGamificationService, useValue: familyGamificationServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyAchievementsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with achievements tab selected', () => {
      expect(component.selectedTab()).toBe('achievements');
    });

    it('should load achievements on init', () => {
      expect(familyGamificationServiceSpy.getAllAchievementsWithStatus).toHaveBeenCalled();
      expect(component.allAchievements().length).toBe(3);
    });

    it('should sort achievements: unlocked first, then by rarity', () => {
      const achievements = component.allAchievements();
      // Unlocked achievements should come first
      expect(achievements[0].unlocked).toBe(true);
      expect(achievements[1].unlocked).toBe(true);
      // Then locked
      expect(achievements[2].unlocked).toBe(false);
    });

    it('should have animatingAchievement as null initially', () => {
      expect(component.animatingAchievement()).toBeNull();
    });
  });

  describe('Tab Navigation', () => {
    it('should change tab to ranking', () => {
      component.changeTab({ detail: { value: 'ranking' } });
      expect(component.selectedTab()).toBe('ranking');
    });

    it('should change tab to stats', () => {
      component.changeTab({ detail: { value: 'stats' } });
      expect(component.selectedTab()).toBe('stats');
    });

    it('should change back to achievements', () => {
      component.changeTab({ detail: { value: 'stats' } });
      component.changeTab({ detail: { value: 'achievements' } });
      expect(component.selectedTab()).toBe('achievements');
    });
  });

  describe('Modal Dismiss', () => {
    it('should dismiss modal', () => {
      component.dismiss();
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  describe('formatDate', () => {
    it('should return empty string for undefined date', () => {
      expect(component.formatDate(undefined)).toBe('');
    });

    it('should return "Hoje" for today', () => {
      const today = new Date();
      expect(component.formatDate(today)).toBe('Hoje');
    });

    it('should return "Ontem" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(component.formatDate(yesterday)).toBe('Ontem');
    });

    it('should return "X dias atrás" for days less than a week', () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      expect(component.formatDate(fiveDaysAgo)).toBe('5 dias atrás');
    });

    it('should return "X semanas atrás" for days less than a month', () => {
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      expect(component.formatDate(twoWeeksAgo)).toBe('2 semanas atrás');
    });

    it('should return "X meses atrás" for days less than a year', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      expect(component.formatDate(twoMonthsAgo)).toBe('2 meses atrás');
    });

    it('should return "X anos atrás" for more than a year', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      expect(component.formatDate(twoYearsAgo)).toBe('2 anos atrás');
    });
  });

  describe('getRarityClass', () => {
    it('should return correct class for common rarity', () => {
      expect(component.getRarityClass('common')).toBe('rarity-common');
    });

    it('should return correct class for rare rarity', () => {
      expect(component.getRarityClass('rare')).toBe('rarity-rare');
    });

    it('should return correct class for epic rarity', () => {
      expect(component.getRarityClass('epic')).toBe('rarity-epic');
    });

    it('should return correct class for legendary rarity', () => {
      expect(component.getRarityClass('legendary')).toBe('rarity-legendary');
    });
  });

  describe('getRankingBadgeColor', () => {
    it('should return warning (gold) for 1st place', () => {
      expect(component.getRankingBadgeColor(0)).toBe('warning');
    });

    it('should return medium (silver) for 2nd place', () => {
      expect(component.getRankingBadgeColor(1)).toBe('medium');
    });

    it('should return primary (bronze) for 3rd place', () => {
      expect(component.getRankingBadgeColor(2)).toBe('primary');
    });

    it('should return light for 4th place and beyond', () => {
      expect(component.getRankingBadgeColor(3)).toBe('light');
      expect(component.getRankingBadgeColor(10)).toBe('light');
    });
  });

  describe('getRankingIcon', () => {
    it('should return gold medal for 1st place', () => {
      expect(component.getRankingIcon(0)).toBe('🥇');
    });

    it('should return silver medal for 2nd place', () => {
      expect(component.getRankingIcon(1)).toBe('🥈');
    });

    it('should return bronze medal for 3rd place', () => {
      expect(component.getRankingIcon(2)).toBe('🥉');
    });

    it('should return position number for 4th place and beyond', () => {
      expect(component.getRankingIcon(3)).toBe('4º');
      expect(component.getRankingIcon(9)).toBe('10º');
    });
  });

  describe('animateAchievement', () => {
    it('should set animating achievement', () => {
      component.animateAchievement('first_dose');
      expect(component.animatingAchievement()).toBe('first_dose');
    });

    it('should clear animation after 1 second', fakeAsync(() => {
      component.animateAchievement('first_dose');
      expect(component.animatingAchievement()).toBe('first_dose');
      
      tick(1000);
      
      expect(component.animatingAchievement()).toBeNull();
    }));
  });

  describe('getNextLevelMessage', () => {
    it('should return message with points needed for next level', () => {
      const message = component.getNextLevelMessage();
      expect(message).toContain('Faltam');
      expect(message).toContain('pontos para o nível');
    });
  });

  describe('getFamilyStats', () => {
    it('should return array of stats', () => {
      const stats = component.getFamilyStats();
      expect(Array.isArray(stats)).toBe(true);
    });

    it('should include doses taken stat', () => {
      const stats = component.getFamilyStats();
      const dosesStat = stats.find(s => s.label === 'Doses Tomadas');
      expect(dosesStat).toBeTruthy();
      // toLocaleString uses system locale - accept both formats
      expect(['1,000', '1.000']).toContain(dosesStat!.value);
    });

    it('should include perfect days stat', () => {
      const stats = component.getFamilyStats();
      const perfectDaysStat = stats.find(s => s.label === 'Dias Perfeitos');
      expect(perfectDaysStat).toBeTruthy();
      expect(perfectDaysStat?.value).toBe('50');
    });

    it('should include current streak stat', () => {
      const stats = component.getFamilyStats();
      const streakStat = stats.find(s => s.label === 'Streak Atual');
      expect(streakStat).toBeTruthy();
      expect(streakStat?.value).toBe('7 dias');
    });

    it('should include longest streak stat', () => {
      const stats = component.getFamilyStats();
      const longestStreakStat = stats.find(s => s.label === 'Maior Streak');
      expect(longestStreakStat).toBeTruthy();
      expect(longestStreakStat?.value).toBe('14 dias');
    });

    it('should include achievements stat', () => {
      const stats = component.getFamilyStats();
      const achievementsStat = stats.find(s => s.label === 'Conquistas');
      expect(achievementsStat).toBeTruthy();
    });

    it('should include members stat', () => {
      const stats = component.getFamilyStats();
      const membersStat = stats.find(s => s.label === 'Membros Ativos');
      expect(membersStat).toBeTruthy();
      expect(membersStat?.value).toBe('2');
    });

    it('should return empty array when no family data', () => {
      // Use the existing component and mock the signal's return
      spyOn(component as any, 'familyGamification').and.returnValue(null);
      
      const stats = component.getFamilyStats();
      expect(stats).toEqual([]);
    });
  });

  describe('Data Bindings', () => {
    it('should expose totalPoints from service', () => {
      expect(component.totalPoints()).toBe(5000);
    });

    it('should expose level from service', () => {
      expect(component.level()).toBe(5);
    });

    it('should expose levelProgress from service', () => {
      expect(component.levelProgress()).toBe(0.6);
    });

    it('should expose memberRanking from service', () => {
      expect(component.memberRanking().length).toBe(2);
    });

    it('should expose currentStreak from service', () => {
      expect(component.currentStreak()).toBe(7);
    });

    it('should expose longestStreak from service', () => {
      expect(component.longestStreak()).toBe(14);
    });

    it('should expose FAMILY_ACHIEVEMENT_DEFINITIONS constant', () => {
      expect(component.FAMILY_ACHIEVEMENT_DEFINITIONS).toBe(FAMILY_ACHIEVEMENT_DEFINITIONS);
    });
  });

  describe('Achievement Sorting', () => {
    it('should sort by unlocked status first', () => {
      const achievements = component.allAchievements();
      const firstLocked = achievements.findIndex(a => !a.unlocked);
      // ES2023 findLastIndex alternative
      let lastUnlocked = -1;
      for (let i = achievements.length - 1; i >= 0; i--) {
        if (achievements[i].unlocked) {
          lastUnlocked = i;
          break;
        }
      }
      
      if (firstLocked !== -1 && lastUnlocked !== -1) {
        expect(lastUnlocked).toBeLessThan(firstLocked);
      }
    });

    it('should sort by rarity within unlocked achievements', () => {
      const mixedAchievements: any[] = [
        { id: 'common1', name: 'Common', description: 'Common achievement', icon: 'medal', points: 10, color: 'gray', unlocked: true, rarity: 'common' as const },
        { id: 'legendary1', name: 'Legendary', description: 'Legendary achievement', icon: 'trophy', points: 200, color: 'gold', unlocked: true, rarity: 'legendary' as const },
        { id: 'rare1', name: 'Rare', description: 'Rare achievement', icon: 'star', points: 50, color: 'blue', unlocked: true, rarity: 'rare' as const },
        { id: 'epic1', name: 'Epic', description: 'Epic achievement', icon: 'diamond', points: 100, color: 'purple', unlocked: true, rarity: 'epic' as const }
      ];
      
      familyGamificationServiceSpy.getAllAchievementsWithStatus.and.returnValue(mixedAchievements);
      
      // Force reload of achievements
      component.ngOnInit();
      
      const sorted = component.allAchievements();
      
      // Verify achievements are sorted (length should be 4)
      expect(sorted.length).toBe(4);
      const rarityOrder = sorted.map(a => a.rarity);
      expect(rarityOrder).toEqual(['legendary', 'epic', 'rare', 'common']);
    });
  });
});

