import {
  Achievement,
  AchievementCategory,
  AchievementTier,
  Streak,
  UserGamification,
  WeeklyProgress,
  Level,
  ACHIEVEMENT_DEFINITIONS,
  LEVELS,
  calculateLevel,
  calculateLevelProgress
} from './achievement.model';

describe('AchievementModel', () => {
  describe('AchievementCategory type', () => {
    it('should have all expected categories', () => {
      const categories: AchievementCategory[] = [
        'adherence',
        'caregiving',
        'organization',
        'streak',
        'social'
      ];

      expect(categories.length).toBe(5);
    });
  });

  describe('AchievementTier type', () => {
    it('should have all tier levels', () => {
      const tiers: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum'];

      expect(tiers.length).toBe(4);
    });

    it('should have tiers in ascending order', () => {
      const tiers: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum'];
      
      expect(tiers[0]).toBe('bronze');
      expect(tiers[3]).toBe('platinum');
    });
  });

  describe('Achievement interface', () => {
    it('should create valid achievement', () => {
      const achievement: Achievement = {
        id: 'test_achievement',
        name: 'Test Achievement',
        description: 'Test description',
        icon: 'trophy',
        category: 'adherence',
        tier: 'gold',
        requirement: 30,
        currentProgress: 15,
        unlocked: false,
        points: 200
      };

      expect(achievement.id).toBe('test_achievement');
      expect(achievement.name).toBe('Test Achievement');
      expect(achievement.unlocked).toBe(false);
      expect(achievement.points).toBe(200);
    });

    it('should create unlocked achievement with date', () => {
      const unlockedDate = new Date();
      const achievement: Achievement = {
        id: 'unlocked_test',
        name: 'Unlocked Test',
        description: 'Already unlocked',
        icon: 'checkmark',
        category: 'streak',
        tier: 'bronze',
        requirement: 7,
        currentProgress: 7,
        unlocked: true,
        unlockedAt: unlockedDate,
        points: 50
      };

      expect(achievement.unlocked).toBe(true);
      expect(achievement.unlockedAt).toBe(unlockedDate);
      expect(achievement.currentProgress).toBe(achievement.requirement);
    });
  });

  describe('Streak interface', () => {
    it('should create active streak', () => {
      const streak: Streak = {
        userId: 'user123',
        currentStreak: 15,
        longestStreak: 30,
        lastDoseDate: new Date(),
        streakStartDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        isActive: true
      };

      expect(streak.currentStreak).toBe(15);
      expect(streak.longestStreak).toBe(30);
      expect(streak.isActive).toBe(true);
    });

    it('should create inactive streak', () => {
      const streak: Streak = {
        userId: 'user456',
        currentStreak: 0,
        longestStreak: 10,
        lastDoseDate: null,
        streakStartDate: null,
        isActive: false
      };

      expect(streak.currentStreak).toBe(0);
      expect(streak.isActive).toBe(false);
      expect(streak.lastDoseDate).toBeNull();
    });

    it('should track current and longest streak separately', () => {
      const streak: Streak = {
        userId: 'user789',
        currentStreak: 5,
        longestStreak: 50,
        lastDoseDate: new Date(),
        streakStartDate: new Date(),
        isActive: true
      };

      expect(streak.currentStreak).toBeLessThan(streak.longestStreak);
    });
  });

  describe('WeeklyProgress interface', () => {
    it('should create perfect week', () => {
      const weekStart = new Date();
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const progress: WeeklyProgress = {
        weekStart,
        weekEnd,
        totalDoses: 21,
        takenDoses: 21,
        missedDoses: 0,
        adherenceRate: 100,
        perfectWeek: true
      };

      expect(progress.perfectWeek).toBe(true);
      expect(progress.adherenceRate).toBe(100);
      expect(progress.missedDoses).toBe(0);
    });

    it('should calculate adherence rate correctly', () => {
      const progress: WeeklyProgress = {
        weekStart: new Date(),
        weekEnd: new Date(),
        totalDoses: 20,
        takenDoses: 18,
        missedDoses: 2,
        adherenceRate: 90, // 18/20 * 100
        perfectWeek: false
      };

      expect(progress.adherenceRate).toBe(90);
      expect(progress.takenDoses + progress.missedDoses).toBe(progress.totalDoses);
    });
  });

  describe('ACHIEVEMENT_DEFINITIONS', () => {
    it('should have at least 10 achievements defined', () => {
      expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(10);
    });

    it('should have achievements for all categories', () => {
      const categories = new Set(ACHIEVEMENT_DEFINITIONS.map(a => a.category));
      
      expect(categories.has('adherence')).toBe(true);
      expect(categories.has('streak')).toBe(true);
      expect(categories.has('caregiving')).toBe(true);
      expect(categories.has('organization')).toBe(true);
    });

    it('should have achievements for all tiers', () => {
      const tiers = new Set(ACHIEVEMENT_DEFINITIONS.map(a => a.tier));
      
      expect(tiers.has('bronze')).toBe(true);
      expect(tiers.has('silver')).toBe(true);
      expect(tiers.has('gold')).toBe(true);
      expect(tiers.has('platinum')).toBe(true);
    });

    it('should have unique achievement IDs', () => {
      const ids = ACHIEVEMENT_DEFINITIONS.map(a => a.id);
      const uniqueIds = new Set(ids);
      
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have positive points for all achievements', () => {
      ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
        expect(achievement.points).toBeGreaterThan(0);
      });
    });

    it('should have positive requirements for all achievements', () => {
      ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
        expect(achievement.requirement).toBeGreaterThan(0);
      });
    });

    it('should have valid icon names', () => {
      ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
        expect(achievement.icon).toBeDefined();
        expect(achievement.icon.length).toBeGreaterThan(0);
      });
    });

    describe('specific achievements', () => {
      it('should have perfect_week achievement', () => {
        const perfectWeek = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'perfect_week');
        
        expect(perfectWeek).toBeDefined();
        expect(perfectWeek?.requirement).toBe(7);
        expect(perfectWeek?.tier).toBe('bronze');
        expect(perfectWeek?.category).toBe('adherence');
      });

      it('should have perfect_month achievement', () => {
        const perfectMonth = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'perfect_month');
        
        expect(perfectMonth).toBeDefined();
        expect(perfectMonth?.requirement).toBe(30);
        expect(perfectMonth?.tier).toBe('gold');
      });

      it('should have first_dose achievement', () => {
        const firstDose = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'first_dose');
        
        expect(firstDose).toBeDefined();
        expect(firstDose?.requirement).toBe(1);
        expect(firstDose?.tier).toBe('bronze');
      });

      it('should have streak_legend achievement', () => {
        const streakLegend = ACHIEVEMENT_DEFINITIONS.find(a => a.id === 'streak_legend');
        
        expect(streakLegend).toBeDefined();
        expect(streakLegend?.requirement).toBe(100);
        expect(streakLegend?.tier).toBe('platinum');
        expect(streakLegend?.points).toBe(1000);
      });
    });

    describe('point values by tier', () => {
      it('should have bronze achievements with lower points', () => {
        const bronzeAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.tier === 'bronze');
        
        bronzeAchievements.forEach(achievement => {
          expect(achievement.points).toBeLessThanOrEqual(100);
        });
      });

      it('should have platinum achievements with higher points', () => {
        const platinumAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => a.tier === 'platinum');
        
        platinumAchievements.forEach(achievement => {
          expect(achievement.points).toBeGreaterThanOrEqual(500);
        });
      });
    });
  });

  describe('LEVELS', () => {
    it('should have exactly 10 levels', () => {
      expect(LEVELS.length).toBe(10);
    });

    it('should start at level 1', () => {
      expect(LEVELS[0].level).toBe(1);
    });

    it('should end at level 10', () => {
      expect(LEVELS[LEVELS.length - 1].level).toBe(10);
    });

    it('should have sequential level numbers', () => {
      LEVELS.forEach((level, index) => {
        expect(level.level).toBe(index + 1);
      });
    });

    it('should have increasing minPoints', () => {
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].minPoints).toBeGreaterThan(LEVELS[i - 1].minPoints);
      }
    });

    it('should have level 1 start at 0 points', () => {
      expect(LEVELS[0].minPoints).toBe(0);
    });

    it('should have level 10 maxPoints as Infinity', () => {
      expect(LEVELS[9].maxPoints).toBe(Infinity);
    });

    it('should have valid level names in Portuguese', () => {
      const expectedNames = [
        'Iniciante',
        'Aprendiz',
        'Praticante',
        'Dedicado',
        'Especialista',
        'Mestre',
        'Campeão',
        'Lendário',
        'Imortal',
        'Divino'
      ];

      LEVELS.forEach((level, index) => {
        expect(level.name).toBe(expectedNames[index]);
      });
    });

    it('should have valid icons for all levels', () => {
      LEVELS.forEach(level => {
        expect(level.icon).toBeDefined();
        expect(level.icon.length).toBeGreaterThan(0);
      });
    });

    it('should have valid colors for all levels', () => {
      LEVELS.forEach(level => {
        expect(level.color).toBeDefined();
        expect(level.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should have continuous point ranges', () => {
      for (let i = 0; i < LEVELS.length - 1; i++) {
        expect(LEVELS[i].maxPoints + 1).toBe(LEVELS[i + 1].minPoints);
      }
    });
  });

  describe('calculateLevel', () => {
    it('should return level 1 for 0 points', () => {
      const level = calculateLevel(0);
      expect(level.level).toBe(1);
      expect(level.name).toBe('Iniciante');
    });

    it('should return level 1 for 50 points', () => {
      const level = calculateLevel(50);
      expect(level.level).toBe(1);
    });

    it('should return level 2 for 100 points', () => {
      const level = calculateLevel(100);
      expect(level.level).toBe(2);
      expect(level.name).toBe('Aprendiz');
    });

    it('should return level 2 for 200 points', () => {
      const level = calculateLevel(200);
      expect(level.level).toBe(2);
    });

    it('should return level 3 for 250 points', () => {
      const level = calculateLevel(250);
      expect(level.level).toBe(3);
      expect(level.name).toBe('Praticante');
    });

    it('should return level 5 for 1000 points', () => {
      const level = calculateLevel(1000);
      expect(level.level).toBe(5);
      expect(level.name).toBe('Especialista');
    });

    it('should return level 10 for very high points', () => {
      const level = calculateLevel(100000);
      expect(level.level).toBe(10);
      expect(level.name).toBe('Divino');
    });

    it('should return level 10 for exactly 32000 points', () => {
      const level = calculateLevel(32000);
      expect(level.level).toBe(10);
    });

    it('should return level 9 for 31999 points', () => {
      const level = calculateLevel(31999);
      expect(level.level).toBe(9);
      expect(level.name).toBe('Imortal');
    });

    it('should return level 1 for negative points (default)', () => {
      const level = calculateLevel(-10);
      // Falls back to first level since no level matches
      expect(level).toBeDefined();
    });

    it('should return correct level for boundary values', () => {
      // Test each level boundary
      expect(calculateLevel(99).level).toBe(1);
      expect(calculateLevel(249).level).toBe(2);
      expect(calculateLevel(499).level).toBe(3);
      expect(calculateLevel(999).level).toBe(4);
      expect(calculateLevel(1999).level).toBe(5);
      expect(calculateLevel(3999).level).toBe(6);
      expect(calculateLevel(7999).level).toBe(7);
      expect(calculateLevel(15999).level).toBe(8);
    });
  });

  describe('calculateLevelProgress', () => {
    it('should return 0% progress at level start', () => {
      const result = calculateLevelProgress(0);
      
      expect(result.current.level).toBe(1);
      expect(result.next?.level).toBe(2);
      expect(result.progress).toBe(0);
    });

    it('should return 50% progress at midpoint', () => {
      // Level 1: 0-99, Level 2: 100-249
      // Midpoint of level 1 is 50
      const result = calculateLevelProgress(50);
      
      expect(result.current.level).toBe(1);
      expect(result.progress).toBe(50);
    });

    it('should return 100% progress at max level', () => {
      const result = calculateLevelProgress(50000);
      
      expect(result.current.level).toBe(10);
      expect(result.next).toBeNull();
      expect(result.progress).toBe(100);
    });

    it('should calculate progress correctly for level 2', () => {
      // Level 2: 100-249, range is 150 points
      const result = calculateLevelProgress(175);
      
      expect(result.current.level).toBe(2);
      expect(result.next?.level).toBe(3);
      // Progress: (175-100) / (250-100) = 75 / 150 = 50%
      expect(result.progress).toBe(50);
    });

    it('should return next level info', () => {
      const result = calculateLevelProgress(100);
      
      expect(result.current.name).toBe('Aprendiz');
      expect(result.next?.name).toBe('Praticante');
      expect(result.next?.minPoints).toBe(250);
    });

    it('should return null next for max level', () => {
      const result = calculateLevelProgress(32000);
      
      expect(result.current.level).toBe(10);
      expect(result.next).toBeNull();
    });

    it('should have current and next be different levels', () => {
      const result = calculateLevelProgress(500);
      
      if (result.next) {
        expect(result.current.level).not.toBe(result.next.level);
      }
    });

    it('should calculate approximately 75% at 3/4 through level', () => {
      // Level 1: 0-99 (100 point range)
      // 75 points = 75% through
      const result = calculateLevelProgress(75);
      
      expect(result.progress).toBe(75);
    });
  });

  describe('UserGamification interface', () => {
    it('should create valid user gamification state', () => {
      const userGamification: UserGamification = {
        userId: 'user123',
        totalPoints: 500,
        level: 4,
        achievements: [],
        streak: {
          userId: 'user123',
          currentStreak: 10,
          longestStreak: 15,
          lastDoseDate: new Date(),
          streakStartDate: new Date(),
          isActive: true
        },
        weeklyProgress: {
          weekStart: new Date(),
          weekEnd: new Date(),
          totalDoses: 21,
          takenDoses: 20,
          missedDoses: 1,
          adherenceRate: 95.24,
          perfectWeek: false
        },
        lastUpdated: new Date()
      };

      expect(userGamification.userId).toBe('user123');
      expect(userGamification.totalPoints).toBe(500);
      expect(userGamification.level).toBe(4);
      expect(userGamification.streak.isActive).toBe(true);
    });

    it('should include achievements array', () => {
      const achievement: Achievement = {
        id: 'first_dose',
        name: 'Primeira Dose',
        description: 'Registre sua primeira dose',
        icon: 'medical',
        category: 'adherence',
        tier: 'bronze',
        requirement: 1,
        currentProgress: 1,
        unlocked: true,
        unlockedAt: new Date(),
        points: 10
      };

      const userGamification: UserGamification = {
        userId: 'user456',
        totalPoints: 10,
        level: 1,
        achievements: [achievement],
        streak: {
          userId: 'user456',
          currentStreak: 1,
          longestStreak: 1,
          lastDoseDate: new Date(),
          streakStartDate: new Date(),
          isActive: true
        },
        weeklyProgress: {
          weekStart: new Date(),
          weekEnd: new Date(),
          totalDoses: 3,
          takenDoses: 1,
          missedDoses: 0,
          adherenceRate: 100,
          perfectWeek: false
        },
        lastUpdated: new Date()
      };

      expect(userGamification.achievements.length).toBe(1);
      expect(userGamification.achievements[0].unlocked).toBe(true);
    });
  });
});
