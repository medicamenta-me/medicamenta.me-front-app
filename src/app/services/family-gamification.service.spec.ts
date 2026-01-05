import { 
  FamilyAchievementType,
  FamilyAchievementDefinition,
  FamilyAchievement,
  FamilyMemberStats,
  FamilyGamificationData,
  FAMILY_ACHIEVEMENT_DEFINITIONS
} from './family-gamification.service';

/**
 * Family Gamification Service Tests
 * Testing the family gamification types, definitions and logic
 */
describe('FamilyGamificationService', () => {
  describe('FAMILY_ACHIEVEMENT_DEFINITIONS', () => {
    it('should have 12 achievement definitions', () => {
      expect(FAMILY_ACHIEVEMENT_DEFINITIONS.length).toBe(12);
    });

    it('should have all required properties for each achievement', () => {
      FAMILY_ACHIEVEMENT_DEFINITIONS.forEach(def => {
        expect(def.id).toBeDefined();
        expect(def.name).toBeDefined();
        expect(def.description).toBeDefined();
        expect(def.icon).toBeDefined();
        expect(def.points).toBeDefined();
        expect(def.color).toBeDefined();
        expect(def.rarity).toBeDefined();
      });
    });

    it('should have unique achievement IDs', () => {
      const ids = FAMILY_ACHIEVEMENT_DEFINITIONS.map(d => d.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid rarity values', () => {
      const validRarities = ['common', 'rare', 'epic', 'legendary'];
      FAMILY_ACHIEVEMENT_DEFINITIONS.forEach(def => {
        expect(validRarities).toContain(def.rarity);
      });
    });

    describe('Common Achievements', () => {
      it('should have all_members_active as common', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'all_members_active');
        expect(achievement?.rarity).toBe('common');
        expect(achievement?.points).toBe(200);
      });

      it('should have early_bird_family as common', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'early_bird_family');
        expect(achievement?.rarity).toBe('common');
        expect(achievement?.points).toBe(300);
      });

      it('should have night_owl_family as common', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'night_owl_family');
        expect(achievement?.rarity).toBe('common');
        expect(achievement?.points).toBe(300);
      });
    });

    describe('Rare Achievements', () => {
      it('should have family_perfect_week as rare', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'family_perfect_week');
        expect(achievement?.rarity).toBe('rare');
        expect(achievement?.points).toBe(500);
      });

      it('should have teamwork_champion as rare', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'teamwork_champion');
        expect(achievement?.rarity).toBe('rare');
        expect(achievement?.points).toBe(400);
      });

      it('should have family_unity as rare', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'family_unity');
        expect(achievement?.rarity).toBe('rare');
        expect(achievement?.points).toBe(800);
      });
    });

    describe('Epic Achievements', () => {
      it('should have no_missed_month as epic', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'no_missed_month');
        expect(achievement?.rarity).toBe('epic');
        expect(achievement?.points).toBe(1000);
      });

      it('should have perfect_month as epic', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'perfect_month');
        expect(achievement?.rarity).toBe('epic');
        expect(achievement?.points).toBe(1500);
      });

      it('should have family_veteran as epic', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'family_veteran');
        expect(achievement?.rarity).toBe('epic');
        expect(achievement?.points).toBe(1000);
      });
    });

    describe('Legendary Achievements', () => {
      it('should have consistency_king as legendary', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'consistency_king');
        expect(achievement?.rarity).toBe('legendary');
        expect(achievement?.points).toBe(2000);
      });

      it('should have perfect_quarter as legendary', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'perfect_quarter');
        expect(achievement?.rarity).toBe('legendary');
        expect(achievement?.points).toBe(3000);
      });

      it('should have gold_standard as legendary', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'gold_standard');
        expect(achievement?.rarity).toBe('legendary');
        expect(achievement?.points).toBe(5000);
      });
    });

    describe('Achievement Icons', () => {
      it('should have emoji icons', () => {
        FAMILY_ACHIEVEMENT_DEFINITIONS.forEach(def => {
          expect(def.icon.length).toBeGreaterThan(0);
        });
      });

      it('family_perfect_week should have trophy icon', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'family_perfect_week');
        expect(achievement?.icon).toBe('🏆');
      });

      it('no_missed_month should have star icon', () => {
        const achievement = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === 'no_missed_month');
        expect(achievement?.icon).toBe('🌟');
      });
    });

    describe('Achievement Colors', () => {
      it('should have valid hex colors', () => {
        FAMILY_ACHIEVEMENT_DEFINITIONS.forEach(def => {
          expect(def.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });

      it('gold achievements should have gold color', () => {
        const goldAchievements = FAMILY_ACHIEVEMENT_DEFINITIONS.filter(
          d => d.id === 'family_perfect_week' || d.id === 'consistency_king' || d.id === 'gold_standard'
        );
        goldAchievements.forEach(a => {
          expect(a.color).toBe('#FFD700');
        });
      });
    });
  });

  describe('FamilyAchievementType', () => {
    it('should accept valid achievement types', () => {
      const validTypes: FamilyAchievementType[] = [
        'family_perfect_week',
        'no_missed_month',
        'all_members_active',
        'perfect_month',
        'early_bird_family',
        'night_owl_family',
        'teamwork_champion',
        'consistency_king',
        'perfect_quarter',
        'family_veteran',
        'gold_standard',
        'family_unity'
      ];
      
      expect(validTypes.length).toBe(12);
    });
  });

  describe('FamilyAchievementDefinition Interface', () => {
    it('should have correct structure', () => {
      const definition: FamilyAchievementDefinition = {
        id: 'family_perfect_week',
        name: 'Test Achievement',
        description: 'Test description',
        icon: '🏆',
        points: 500,
        color: '#FFD700',
        rarity: 'rare'
      };

      expect(definition.id).toBe('family_perfect_week');
      expect(definition.points).toBe(500);
      expect(definition.rarity).toBe('rare');
    });
  });

  describe('FamilyAchievement Interface', () => {
    it('should track unlocked achievement', () => {
      const achievement: FamilyAchievement = {
        achievementId: 'family_perfect_week',
        unlockedAt: new Date(),
        contributingMembers: ['member1', 'member2']
      };

      expect(achievement.achievementId).toBe('family_perfect_week');
      expect(achievement.contributingMembers.length).toBe(2);
      expect(achievement.unlockedAt).toBeInstanceOf(Date);
    });

    it('should allow empty contributing members', () => {
      const achievement: FamilyAchievement = {
        achievementId: 'all_members_active',
        unlockedAt: new Date(),
        contributingMembers: []
      };

      expect(achievement.contributingMembers.length).toBe(0);
    });
  });

  describe('FamilyMemberStats Interface', () => {
    it('should track member statistics', () => {
      const stats: FamilyMemberStats = {
        memberId: 'member123',
        memberName: 'João',
        individualPoints: 1500,
        contributedAchievements: 5,
        adherenceRate: 95.5,
        activeDays: 30
      };

      expect(stats.memberId).toBe('member123');
      expect(stats.memberName).toBe('João');
      expect(stats.individualPoints).toBe(1500);
      expect(stats.adherenceRate).toBe(95.5);
    });

    it('should allow zero values', () => {
      const stats: FamilyMemberStats = {
        memberId: 'new_member',
        memberName: 'Novo',
        individualPoints: 0,
        contributedAchievements: 0,
        adherenceRate: 0,
        activeDays: 0
      };

      expect(stats.individualPoints).toBe(0);
      expect(stats.adherenceRate).toBe(0);
    });
  });

  describe('FamilyGamificationData Interface', () => {
    it('should have all required fields', () => {
      const data: FamilyGamificationData = {
        familyId: 'family123',
        totalPoints: 5000,
        level: 3,
        achievements: [],
        memberStats: [],
        currentStreak: 10,
        longestStreak: 30,
        totalDosesTaken: 500,
        perfectDays: 25,
        lastUpdated: new Date()
      };

      expect(data.familyId).toBe('family123');
      expect(data.totalPoints).toBe(5000);
      expect(data.level).toBe(3);
      expect(data.currentStreak).toBe(10);
      expect(data.perfectDays).toBe(25);
    });

    it('should contain achievements array', () => {
      const achievement: FamilyAchievement = {
        achievementId: 'family_perfect_week',
        unlockedAt: new Date(),
        contributingMembers: ['m1', 'm2']
      };

      const data: FamilyGamificationData = {
        familyId: 'family123',
        totalPoints: 500,
        level: 1,
        achievements: [achievement],
        memberStats: [],
        currentStreak: 7,
        longestStreak: 7,
        totalDosesTaken: 50,
        perfectDays: 7,
        lastUpdated: new Date()
      };

      expect(data.achievements.length).toBe(1);
      expect(data.achievements[0].achievementId).toBe('family_perfect_week');
    });

    it('should contain member stats array', () => {
      const memberStats: FamilyMemberStats[] = [
        { memberId: 'm1', memberName: 'Alice', individualPoints: 100, contributedAchievements: 1, adherenceRate: 90, activeDays: 10 },
        { memberId: 'm2', memberName: 'Bob', individualPoints: 200, contributedAchievements: 2, adherenceRate: 95, activeDays: 20 }
      ];

      const data: FamilyGamificationData = {
        familyId: 'family123',
        totalPoints: 300,
        level: 1,
        achievements: [],
        memberStats,
        currentStreak: 5,
        longestStreak: 10,
        totalDosesTaken: 100,
        perfectDays: 5,
        lastUpdated: new Date()
      };

      expect(data.memberStats.length).toBe(2);
      expect(data.memberStats[0].memberName).toBe('Alice');
    });
  });

  describe('Level Calculation Logic', () => {
    function calculatePointsForLevel(level: number): number {
      // Exponential growth formula
      return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    it('should calculate level 1 points correctly', () => {
      expect(calculatePointsForLevel(1)).toBe(100);
    });

    it('should calculate level 2 points correctly', () => {
      expect(calculatePointsForLevel(2)).toBe(150);
    });

    it('should calculate level 5 points correctly', () => {
      expect(calculatePointsForLevel(5)).toBe(506);
    });

    it('should show exponential growth', () => {
      const level3 = calculatePointsForLevel(3);
      const level4 = calculatePointsForLevel(4);
      const level5 = calculatePointsForLevel(5);
      
      expect(level4 - level3).toBeLessThan(level5 - level4);
    });
  });

  describe('Level Progress Calculation', () => {
    function calculateLevelProgress(points: number, level: number): number {
      const calculatePointsForLevel = (l: number) => Math.floor(100 * Math.pow(1.5, l - 1));
      const currentLevelPoints = calculatePointsForLevel(level);
      const nextLevelPoints = calculatePointsForLevel(level + 1);
      const progress = ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
      return Math.min(100, Math.max(0, progress));
    }

    it('should return 0% at level start', () => {
      const progress = calculateLevelProgress(100, 1);
      expect(progress).toBe(0);
    });

    it('should return 100% at level end', () => {
      const progress = calculateLevelProgress(150, 1);
      expect(progress).toBe(100);
    });

    it('should return 50% at midpoint', () => {
      const progress = calculateLevelProgress(125, 1);
      expect(progress).toBe(50);
    });

    it('should clamp to 0-100 range', () => {
      const negativeProgress = calculateLevelProgress(50, 1);
      expect(negativeProgress).toBe(0);
    });
  });

  describe('Member Stats Ranking', () => {
    it('should sort members by points descending', () => {
      const memberStats: FamilyMemberStats[] = [
        { memberId: 'm1', memberName: 'Alice', individualPoints: 100, contributedAchievements: 1, adherenceRate: 90, activeDays: 10 },
        { memberId: 'm2', memberName: 'Bob', individualPoints: 300, contributedAchievements: 3, adherenceRate: 95, activeDays: 30 },
        { memberId: 'm3', memberName: 'Carol', individualPoints: 200, contributedAchievements: 2, adherenceRate: 85, activeDays: 20 }
      ];

      const ranked = [...memberStats].sort((a, b) => b.individualPoints - a.individualPoints);
      
      expect(ranked[0].memberName).toBe('Bob');
      expect(ranked[1].memberName).toBe('Carol');
      expect(ranked[2].memberName).toBe('Alice');
    });
  });

  describe('Streak Logic', () => {
    it('should track current streak', () => {
      let currentStreak = 0;
      const adherenceThreshold = 80;

      // Day 1: 85% adherence - streak continues
      if (85 > adherenceThreshold) currentStreak++;
      expect(currentStreak).toBe(1);

      // Day 2: 90% adherence - streak continues
      if (90 > adherenceThreshold) currentStreak++;
      expect(currentStreak).toBe(2);

      // Day 3: 70% adherence - streak breaks
      if (70 > adherenceThreshold) {
        currentStreak++;
      } else {
        currentStreak = 0;
      }
      expect(currentStreak).toBe(0);
    });

    it('should update longest streak', () => {
      let currentStreak = 0;
      let longestStreak = 0;

      // Simulate 5-day streak
      for (let i = 0; i < 5; i++) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      }

      expect(currentStreak).toBe(5);
      expect(longestStreak).toBe(5);

      // Break streak
      currentStreak = 0;
      expect(longestStreak).toBe(5);

      // New 3-day streak
      for (let i = 0; i < 3; i++) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      }

      expect(currentStreak).toBe(3);
      expect(longestStreak).toBe(5); // Still 5
    });
  });

  describe('Perfect Days Calculation', () => {
    it('should count days with 100% adherence', () => {
      const dailyAdherence = [100, 95, 100, 80, 100, 100, 90];
      const perfectDays = dailyAdherence.filter(a => a === 100).length;
      expect(perfectDays).toBe(4);
    });

    it('should return 0 for no perfect days', () => {
      const dailyAdherence = [95, 90, 85, 80, 75];
      const perfectDays = dailyAdherence.filter(a => a === 100).length;
      expect(perfectDays).toBe(0);
    });
  });

  describe('Total Doses Taken', () => {
    it('should sum doses across all members', () => {
      const memberDoses = [50, 30, 45, 25];
      const totalDosesTaken = memberDoses.reduce((sum, d) => sum + d, 0);
      expect(totalDosesTaken).toBe(150);
    });
  });

  describe('Achievement Points', () => {
    it('should sum points from unlocked achievements', () => {
      const unlockedIds: FamilyAchievementType[] = ['all_members_active', 'early_bird_family', 'family_perfect_week'];
      
      const totalPoints = unlockedIds.reduce((sum, id) => {
        const def = FAMILY_ACHIEVEMENT_DEFINITIONS.find(d => d.id === id);
        return sum + (def?.points || 0);
      }, 0);

      // 200 + 300 + 500 = 1000
      expect(totalPoints).toBe(1000);
    });
  });

  describe('Rarity Distribution', () => {
    it('should have balanced rarity distribution', () => {
      const byRarity = FAMILY_ACHIEVEMENT_DEFINITIONS.reduce((acc, def) => {
        acc[def.rarity] = (acc[def.rarity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byRarity['common']).toBe(3);
      expect(byRarity['rare']).toBe(3);
      expect(byRarity['epic']).toBe(3);
      expect(byRarity['legendary']).toBe(3);
    });
  });
});
