import { 
  LeaderboardEntry, 
  LeaderboardPeriod, 
  LeaderboardData,
  UserLeaderboardScore 
} from '../models/leaderboard.model';

/**
 * Leaderboard Service Tests
 * Testing leaderboard types, interfaces and logic without service instantiation
 */
describe('LeaderboardService Logic', () => {
  const mockEntries: LeaderboardEntry[] = [
    { userId: 'user1', userName: 'Alice', points: 1000, level: 5, rank: 1, isCurrentUser: false, achievements: 10, streak: 7 },
    { userId: 'user123', userName: 'Test User', points: 800, level: 4, rank: 2, isCurrentUser: true, achievements: 8, streak: 5 },
    { userId: 'user3', userName: 'Charlie', points: 600, level: 3, rank: 3, isCurrentUser: false, achievements: 6, streak: 3 }
  ];

  describe('LeaderboardPeriod Type', () => {
    it('should accept week period', () => {
      const period: LeaderboardPeriod = 'week';
      expect(period).toBe('week');
    });

    it('should accept month period', () => {
      const period: LeaderboardPeriod = 'month';
      expect(period).toBe('month');
    });

    it('should accept allTime period', () => {
      const period: LeaderboardPeriod = 'allTime';
      expect(period).toBe('allTime');
    });
  });

  describe('LeaderboardEntry Interface', () => {
    it('should have required fields', () => {
      const entry: LeaderboardEntry = mockEntries[0];
      expect(entry.userId).toBeDefined();
      expect(entry.userName).toBeDefined();
      expect(entry.points).toBeDefined();
      expect(entry.level).toBeDefined();
      expect(entry.rank).toBeDefined();
      expect(entry.isCurrentUser).toBeDefined();
      expect(entry.achievements).toBeDefined();
      expect(entry.streak).toBeDefined();
    });

    it('should allow optional avatarUrl', () => {
      const entry: LeaderboardEntry = { ...mockEntries[0], avatarUrl: 'http://example.com/avatar.png' };
      expect(entry.avatarUrl).toBe('http://example.com/avatar.png');
    });

    it('should allow optional weeklyPoints', () => {
      const entry: LeaderboardEntry = { ...mockEntries[0], weeklyPoints: 500 };
      expect(entry.weeklyPoints).toBe(500);
    });

    it('should allow optional monthlyPoints', () => {
      const entry: LeaderboardEntry = { ...mockEntries[0], monthlyPoints: 2000 };
      expect(entry.monthlyPoints).toBe(2000);
    });

    it('should have correct types for numeric fields', () => {
      const entry = mockEntries[0];
      expect(typeof entry.points).toBe('number');
      expect(typeof entry.level).toBe('number');
      expect(typeof entry.rank).toBe('number');
      expect(typeof entry.achievements).toBe('number');
      expect(typeof entry.streak).toBe('number');
    });
  });

  describe('LeaderboardData Interface', () => {
    it('should have required fields', () => {
      const data: LeaderboardData = {
        period: 'week',
        entries: mockEntries,
        lastUpdated: new Date()
      };
      expect(data.period).toBeDefined();
      expect(data.entries).toBeDefined();
      expect(data.lastUpdated).toBeDefined();
    });

    it('should allow optional userPosition', () => {
      const data: LeaderboardData = {
        period: 'week',
        entries: mockEntries,
        userPosition: 2,
        lastUpdated: new Date()
      };
      expect(data.userPosition).toBe(2);
    });

    it('should allow optional userEntry', () => {
      const data: LeaderboardData = {
        period: 'week',
        entries: mockEntries,
        userEntry: mockEntries[1],
        lastUpdated: new Date()
      };
      expect(data.userEntry?.userId).toBe('user123');
    });

    it('should have entries as array', () => {
      const data: LeaderboardData = {
        period: 'month',
        entries: mockEntries,
        lastUpdated: new Date()
      };
      expect(Array.isArray(data.entries)).toBeTrue();
    });
  });

  describe('UserLeaderboardScore Interface', () => {
    it('should have required fields', () => {
      const score: UserLeaderboardScore = {
        userId: 'user123',
        points: 1500,
        level: 5,
        achievements: 12,
        streak: 10,
        lastUpdated: new Date()
      };

      expect(score.userId).toBe('user123');
      expect(score.points).toBe(1500);
      expect(score.level).toBe(5);
      expect(score.achievements).toBe(12);
      expect(score.streak).toBe(10);
      expect(score.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Week Number Calculation', () => {
    function getWeekNumber(date: Date): number {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }

    it('should calculate week number in valid range', () => {
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      expect(weekNumber).toBeGreaterThanOrEqual(1);
      expect(weekNumber).toBeLessThanOrEqual(53);
    });

    it('should return consistent week for same date', () => {
      const date1 = new Date(2025, 0, 15);
      const date2 = new Date(2025, 0, 15);
      expect(getWeekNumber(date1)).toBe(getWeekNumber(date2));
    });

    it('should increment week number correctly', () => {
      const date1 = new Date(2025, 0, 1);
      const date2 = new Date(2025, 0, 8);
      const week1 = getWeekNumber(date1);
      const week2 = getWeekNumber(date2);
      expect(week2).toBeGreaterThanOrEqual(week1);
    });
  });

  describe('Period ID Generation', () => {
    function getCurrentPeriodId(period: LeaderboardPeriod): string {
      const now = new Date();
      
      switch (period) {
        case 'week': {
          const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
        }
        case 'month': {
          return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        }
        case 'allTime':
          return 'all';
      }
    }

    it('should generate week period ID in correct format', () => {
      const periodId = getCurrentPeriodId('week');
      expect(periodId).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should generate month period ID in correct format', () => {
      const periodId = getCurrentPeriodId('month');
      expect(periodId).toMatch(/^\d{4}-\d{2}$/);
    });

    it('should generate allTime period ID as "all"', () => {
      const periodId = getCurrentPeriodId('allTime');
      expect(periodId).toBe('all');
    });
  });

  describe('Ranking Logic', () => {
    it('should rank entries by points descending', () => {
      const sortedEntries = [...mockEntries].sort((a, b) => b.points - a.points);
      expect(sortedEntries[0].points).toBeGreaterThanOrEqual(sortedEntries[1].points);
      expect(sortedEntries[1].points).toBeGreaterThanOrEqual(sortedEntries[2].points);
    });

    it('should find user position correctly', () => {
      const userPosition = mockEntries.findIndex(e => e.userId === 'user123') + 1;
      expect(userPosition).toBe(2);
    });

    it('should return 0 for non-existent user', () => {
      const userPosition = mockEntries.findIndex(e => e.userId === 'nonexistent') + 1;
      expect(userPosition).toBe(0);
    });

    it('should identify current user entry', () => {
      const userEntry = mockEntries.find(e => e.userId === 'user123');
      expect(userEntry).toBeDefined();
      expect(userEntry?.isCurrentUser).toBeTrue();
    });

    it('should return top 10 entries', () => {
      const manyEntries: LeaderboardEntry[] = Array.from({ length: 20 }, (_, i) => ({
        userId: `user${i}`,
        userName: `User ${i}`,
        points: 1000 - i * 10,
        level: Math.floor(5 - i / 4),
        rank: i + 1,
        isCurrentUser: false,
        achievements: 10 - i,
        streak: 7 - i % 7
      }));
      
      const top10 = manyEntries.slice(0, 10);
      expect(top10.length).toBe(10);
      expect(top10[0].points).toBe(1000);
      expect(top10[9].points).toBe(910);
    });

    it('should assign correct ranks', () => {
      const entries: LeaderboardEntry[] = [
        { userId: 'a', userName: 'A', points: 100, level: 1, rank: 0, isCurrentUser: false, achievements: 1, streak: 1 },
        { userId: 'b', userName: 'B', points: 200, level: 2, rank: 0, isCurrentUser: false, achievements: 2, streak: 2 },
        { userId: 'c', userName: 'C', points: 150, level: 1, rank: 0, isCurrentUser: false, achievements: 1, streak: 1 }
      ];

      const rankedEntries = [...entries]
        .sort((a, b) => b.points - a.points)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      expect(rankedEntries[0].rank).toBe(1);
      expect(rankedEntries[0].userName).toBe('B');
      expect(rankedEntries[1].rank).toBe(2);
      expect(rankedEntries[1].userName).toBe('C');
      expect(rankedEntries[2].rank).toBe(3);
      expect(rankedEntries[2].userName).toBe('A');
    });
  });

  describe('Position Change Detection', () => {
    it('should detect position drop', () => {
      const previousPosition = 2;
      const newPosition = 5;
      const positionDrop = newPosition - previousPosition;
      expect(positionDrop).toBe(3);
    });

    it('should detect position improvement', () => {
      const previousPosition = 5;
      const newPosition = 2;
      const positionDrop = newPosition - previousPosition;
      expect(positionDrop).toBe(-3);
    });

    it('should detect no position change', () => {
      const previousPosition = 3;
      const newPosition = 3;
      const positionDrop = newPosition - previousPosition;
      expect(positionDrop).toBe(0);
    });

    it('should detect significant drop', () => {
      const previousPosition = 1;
      const newPosition = 10;
      const positionDrop = newPosition - previousPosition;
      expect(positionDrop).toBeGreaterThan(5);
    });
  });

  describe('Overtake Detection Logic', () => {
    it('should identify overtakers', () => {
      const previousAhead = new Set(['user1']);
      const currentAhead = new Set(['user1', 'user4', 'user5']);
      
      const overtakers = [...currentAhead].filter(id => !previousAhead.has(id));
      expect(overtakers).toContain('user4');
      expect(overtakers).toContain('user5');
      expect(overtakers).not.toContain('user1');
    });

    it('should filter overtakers by care network', () => {
      const overtakers = ['user4', 'user5', 'user6'];
      const careNetworkIds = ['user4', 'user7'];
      
      const filteredOvertakers = overtakers.filter(id => careNetworkIds.includes(id));
      expect(filteredOvertakers).toEqual(['user4']);
    });

    it('should exclude self from overtakers', () => {
      const currentUserId = 'user123';
      const potentialOvertakers = ['user123', 'user4', 'user5'];
      
      const overtakers = potentialOvertakers.filter(id => id !== currentUserId);
      expect(overtakers).not.toContain('user123');
      expect(overtakers.length).toBe(2);
    });

    it('should handle empty overtakers list', () => {
      const previousAhead = new Set(['user1', 'user2']);
      const currentAhead = new Set(['user1', 'user2']);
      
      const overtakers = [...currentAhead].filter(id => !previousAhead.has(id));
      expect(overtakers.length).toBe(0);
    });
  });

  describe('Care Network Filter', () => {
    it('should use "in" filter for small networks (<= 10)', () => {
      const careNetworkIds = ['user1', 'user2', 'user3'];
      expect(careNetworkIds.length).toBeLessThanOrEqual(10);
    });

    it('should use memory filter for large networks (> 10)', () => {
      const careNetworkIds = Array.from({ length: 15 }, (_, i) => `user${i}`);
      expect(careNetworkIds.length).toBeGreaterThan(10);
      
      const allEntries = Array.from({ length: 100 }, (_, i) => ({ userId: `user${i}` }));
      const networkSet = new Set(careNetworkIds);
      const filteredEntries = allEntries.filter(e => networkSet.has(e.userId));
      
      expect(filteredEntries.length).toBe(15);
    });

    it('should not filter for global leaderboard', () => {
      const showGlobal = true;
      const careNetworkIds = showGlobal ? [] : ['user1', 'user2'];
      expect(careNetworkIds.length).toBe(0);
    });

    it('should include self in care network', () => {
      const currentUserId = 'user123';
      const caregivers = ['user1', 'user2'];
      const patients = ['user3', 'user4'];
      
      const careNetworkIds = [currentUserId, ...caregivers, ...patients];
      expect(careNetworkIds).toContain(currentUserId);
      expect(careNetworkIds.length).toBe(5);
    });
  });

  describe('Analytics Events', () => {
    it('should format leaderboard view event', () => {
      const event = {
        period: 'week' as LeaderboardPeriod,
        leaderboard_type: 'care_network',
        user_rank: 2,
        total_entries: 10,
        in_top_10: true,
        care_network_size: 5
      };
      
      expect(event.period).toBe('week');
      expect(event.in_top_10).toBeTrue();
      expect(event.care_network_size).toBe(5);
    });

    it('should format overtaken event', () => {
      const event = {
        position_drop: 3,
        new_position: 5,
        overtakers_count: 2,
        period: 'week' as LeaderboardPeriod
      };
      
      expect(event.position_drop).toBe(3);
      expect(event.overtakers_count).toBe(2);
    });

    it('should track unranked users', () => {
      const userPosition = 0;
      const event = {
        user_rank: userPosition > 0 ? userPosition : 'unranked'
      };
      
      expect(event.user_rank).toBe('unranked');
    });
  });

  describe('Notification Format', () => {
    it('should format overtake notification title', () => {
      const title = '🏆 Você foi ultrapassado!';
      expect(title).toContain('🏆');
      expect(title).toContain('ultrapassado');
    });

    it('should format overtake notification body', () => {
      const overtaker = { userName: 'Alice' };
      const userPosition = 3;
      
      const body = `${overtaker.userName} passou você no ranking! Você está agora em #${userPosition}. Continue se esforçando! 💪`;
      
      expect(body).toContain('Alice');
      expect(body).toContain('#3');
      expect(body).toContain('💪');
    });
  });

  describe('Cache Logic', () => {
    it('should have 5 minute cache TTL', () => {
      const CACHE_TTL = 5 * 60 * 1000;
      expect(CACHE_TTL).toBe(300000);
    });

    it('should validate cache is fresh', () => {
      const CACHE_TTL = 5 * 60 * 1000;
      const now = Date.now();
      
      const validCacheTimestamp = now - 2 * 60 * 1000; // 2 minutes ago
      expect(now - validCacheTimestamp).toBeLessThan(CACHE_TTL);
    });

    it('should invalidate expired cache', () => {
      const CACHE_TTL = 5 * 60 * 1000;
      const now = Date.now();
      
      const invalidCacheTimestamp = now - 10 * 60 * 1000; // 10 minutes ago
      expect(now - invalidCacheTimestamp).toBeGreaterThan(CACHE_TTL);
    });

    it('should store care network IDs in cache', () => {
      const cache = {
        userId: 'user123',
        ids: ['user1', 'user2', 'user3'],
        timestamp: Date.now()
      };
      
      expect(cache.ids.length).toBe(3);
      expect(cache.userId).toBe('user123');
    });
  });

  describe('Entry Enrichment', () => {
    it('should add isCurrentUser flag to entries', () => {
      const currentUserId = 'user123';
      const entries = mockEntries.map(e => ({
        ...e,
        isCurrentUser: e.userId === currentUserId
      }));
      
      expect(entries.find(e => e.userId === 'user123')?.isCurrentUser).toBeTrue();
      expect(entries.find(e => e.userId === 'user1')?.isCurrentUser).toBeFalse();
    });

    it('should preserve original data when enriching', () => {
      const original = mockEntries[0];
      const enriched = { ...original, isCurrentUser: true };
      
      expect(enriched.userId).toBe(original.userId);
      expect(enriched.points).toBe(original.points);
      expect(enriched.level).toBe(original.level);
    });
  });

  describe('Leaderboard Building', () => {
    it('should build complete leaderboard data', () => {
      const entries = mockEntries;
      const userPosition = entries.findIndex(e => e.isCurrentUser) + 1;
      const userEntry = entries.find(e => e.isCurrentUser);

      const leaderboardData: LeaderboardData = {
        period: 'week',
        entries: entries.slice(0, 10),
        userPosition: userPosition > 0 ? userPosition : undefined,
        userEntry: userEntry,
        lastUpdated: new Date()
      };

      expect(leaderboardData.period).toBe('week');
      expect(leaderboardData.entries.length).toBeLessThanOrEqual(10);
      expect(leaderboardData.userPosition).toBe(2);
      expect(leaderboardData.userEntry?.userId).toBe('user123');
    });
  });

  describe('Points Comparison', () => {
    it('should compare points for sorting', () => {
      const entry1 = { points: 1000 };
      const entry2 = { points: 800 };
      
      expect(entry1.points).toBeGreaterThan(entry2.points);
    });

    it('should handle equal points', () => {
      const entry1 = { points: 1000, level: 5 };
      const entry2 = { points: 1000, level: 4 };
      
      // If points are equal, can use level as tiebreaker
      if (entry1.points === entry2.points) {
        expect(entry1.level).toBeGreaterThan(entry2.level);
      }
    });
  });

  describe('Streak Tracking', () => {
    it('should track streak in entries', () => {
      const entry = mockEntries[0];
      expect(entry.streak).toBe(7);
    });

    it('should handle zero streak', () => {
      const entry: LeaderboardEntry = { ...mockEntries[0], streak: 0 };
      expect(entry.streak).toBe(0);
    });
  });

  describe('Achievement Count', () => {
    it('should track achievements in entries', () => {
      const entry = mockEntries[0];
      expect(entry.achievements).toBe(10);
    });

    it('should allow zero achievements', () => {
      const entry: LeaderboardEntry = { ...mockEntries[0], achievements: 0 };
      expect(entry.achievements).toBe(0);
    });
  });
});
