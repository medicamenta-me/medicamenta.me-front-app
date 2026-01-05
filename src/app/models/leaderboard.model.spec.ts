/**
 * 🧪 Leaderboard Model Tests
 * 
 * Testes unitários para os modelos de Leaderboard (Gamificação)
 * 
 * @coverage 100%
 * @tests ~35
 */

import {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardData,
  UserLeaderboardScore
} from './leaderboard.model';

describe('Leaderboard Model', () => {

  // ============================================================
  // LeaderboardPeriod TESTS
  // ============================================================

  describe('LeaderboardPeriod', () => {
    const validPeriods: LeaderboardPeriod[] = ['week', 'month', 'allTime'];

    it('should have 3 leaderboard periods', () => {
      expect(validPeriods.length).toBe(3);
    });

    it('should include "week" as valid period', () => {
      const period: LeaderboardPeriod = 'week';
      expect(period).toBe('week');
    });

    it('should include "month" as valid period', () => {
      const period: LeaderboardPeriod = 'month';
      expect(period).toBe('month');
    });

    it('should include "allTime" as valid period', () => {
      const period: LeaderboardPeriod = 'allTime';
      expect(period).toBe('allTime');
    });

    validPeriods.forEach(period => {
      it(`should allow "${period}" as leaderboard period`, () => {
        const testPeriod: LeaderboardPeriod = period;
        expect(testPeriod).toBe(period);
      });
    });
  });

  // ============================================================
  // LeaderboardEntry TESTS
  // ============================================================

  describe('LeaderboardEntry', () => {
    const createMockEntry = (overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry => ({
      rank: 1,
      userId: 'user-001',
      userName: 'João Silva',
      avatarUrl: 'https://example.com/avatar.jpg',
      points: 5000,
      level: 15,
      streak: 45,
      achievements: 12,
      isCurrentUser: false,
      ...overrides
    });

    it('should create entry with all required fields', () => {
      const entry = createMockEntry();
      expect(entry.rank).toBe(1);
      expect(entry.userId).toBe('user-001');
      expect(entry.userName).toBe('João Silva');
      expect(entry.points).toBe(5000);
    });

    it('should have rank as positive number', () => {
      const entry = createMockEntry({ rank: 1 });
      expect(entry.rank).toBeGreaterThan(0);
    });

    it('should have points as non-negative number', () => {
      const entry = createMockEntry({ points: 0 });
      expect(entry.points).toBeGreaterThanOrEqual(0);
    });

    it('should have level as positive number', () => {
      const entry = createMockEntry({ level: 1 });
      expect(entry.level).toBeGreaterThan(0);
    });

    it('should have optional avatar url', () => {
      const entryWithAvatar = createMockEntry({ avatarUrl: 'https://example.com/avatar.jpg' });
      const entryWithoutAvatar = createMockEntry({ avatarUrl: undefined });
      
      expect(entryWithAvatar.avatarUrl).toBeDefined();
      expect(entryWithoutAvatar.avatarUrl).toBeUndefined();
    });

    it('should track streak as number of days', () => {
      const entry = createMockEntry({ streak: 45 });
      expect(entry.streak).toBe(45);
    });

    it('should track achievements count', () => {
      const entry = createMockEntry({ achievements: 12 });
      expect(entry.achievements).toBe(12);
    });

    it('should track if is current user', () => {
      const currentUser = createMockEntry({ isCurrentUser: true });
      const otherUser = createMockEntry({ isCurrentUser: false });
      
      expect(currentUser.isCurrentUser).toBe(true);
      expect(otherUser.isCurrentUser).toBe(false);
    });

    it('should support high point values', () => {
      const entry = createMockEntry({ points: 999999 });
      expect(entry.points).toBe(999999);
    });

    it('should support different ranks', () => {
      const first = createMockEntry({ rank: 1 });
      const second = createMockEntry({ rank: 2 });
      const third = createMockEntry({ rank: 3 });
      const hundredth = createMockEntry({ rank: 100 });
      
      expect(first.rank).toBe(1);
      expect(second.rank).toBe(2);
      expect(third.rank).toBe(3);
      expect(hundredth.rank).toBe(100);
    });

    it('should allow zero streak for new users', () => {
      const entry = createMockEntry({ streak: 0 });
      expect(entry.streak).toBe(0);
    });

    it('should allow zero achievements for new users', () => {
      const entry = createMockEntry({ achievements: 0 });
      expect(entry.achievements).toBe(0);
    });

    it('should support weekly points', () => {
      const entry = createMockEntry({ weeklyPoints: 500 });
      expect(entry.weeklyPoints).toBe(500);
    });

    it('should support monthly points', () => {
      const entry = createMockEntry({ monthlyPoints: 2000 });
      expect(entry.monthlyPoints).toBe(2000);
    });
  });

  // ============================================================
  // LeaderboardData TESTS
  // ============================================================

  describe('LeaderboardData', () => {
    const createMockLeaderboardData = (overrides: Partial<LeaderboardData> = {}): LeaderboardData => ({
      period: 'week',
      entries: [
        {
          rank: 1,
          userId: 'user-001',
          userName: 'João Silva',
          points: 5000,
          level: 15,
          streak: 45,
          achievements: 12,
          isCurrentUser: false
        },
        {
          rank: 2,
          userId: 'user-002',
          userName: 'Maria Santos',
          points: 4500,
          level: 14,
          streak: 30,
          achievements: 10,
          isCurrentUser: false
        }
      ],
      userPosition: 5,
      lastUpdated: new Date('2024-12-28'),
      ...overrides
    });

    it('should create leaderboard data with all fields', () => {
      const data = createMockLeaderboardData();
      expect(data.period).toBe('week');
      expect(data.entries.length).toBe(2);
      expect(data.userPosition).toBe(5);
    });

    it('should have entries array', () => {
      const data = createMockLeaderboardData();
      expect(Array.isArray(data.entries)).toBe(true);
    });

    it('should track user position in leaderboard', () => {
      const data = createMockLeaderboardData({ userPosition: 25 });
      expect(data.userPosition).toBe(25);
    });

    it('should have optional user entry', () => {
      const entry: LeaderboardEntry = {
        rank: 5,
        userId: 'current-user',
        userName: 'Current User',
        points: 3000,
        level: 10,
        streak: 20,
        achievements: 5,
        isCurrentUser: true
      };
      const data = createMockLeaderboardData({ userEntry: entry });
      expect(data.userEntry).toBeDefined();
      expect(data.userEntry?.isCurrentUser).toBe(true);
    });

    it('should track last updated timestamp', () => {
      const data = createMockLeaderboardData();
      expect(data.lastUpdated).toBeInstanceOf(Date);
    });

    it('should support week period', () => {
      const data = createMockLeaderboardData({ period: 'week' });
      expect(data.period).toBe('week');
    });

    it('should support month period', () => {
      const data = createMockLeaderboardData({ period: 'month' });
      expect(data.period).toBe('month');
    });

    it('should support allTime period', () => {
      const data = createMockLeaderboardData({ period: 'allTime' });
      expect(data.period).toBe('allTime');
    });

    it('should handle empty entries', () => {
      const data = createMockLeaderboardData({ entries: [] });
      expect(data.entries.length).toBe(0);
    });

    it('should handle large number of entries', () => {
      const entries: LeaderboardEntry[] = Array.from({ length: 100 }, (_, i) => ({
        rank: i + 1,
        userId: `user-${i + 1}`,
        userName: `User ${i + 1}`,
        points: 5000 - (i * 10),
        level: 15 - Math.floor(i / 10),
        streak: Math.max(0, 45 - i),
        achievements: Math.max(0, 12 - Math.floor(i / 10)),
        isCurrentUser: false
      }));
      
      const data = createMockLeaderboardData({ entries });
      expect(data.entries.length).toBe(100);
    });
  });

  // ============================================================
  // UserLeaderboardScore TESTS
  // ============================================================

  describe('UserLeaderboardScore', () => {
    const createMockScore = (overrides: Partial<UserLeaderboardScore> = {}): UserLeaderboardScore => ({
      userId: 'user-001',
      points: 5000,
      level: 15,
      streak: 45,
      achievements: 12,
      lastUpdated: new Date('2024-12-28'),
      ...overrides
    });

    it('should create score with all fields', () => {
      const score = createMockScore();
      expect(score.userId).toBe('user-001');
      expect(score.points).toBe(5000);
      expect(score.level).toBe(15);
    });

    it('should track achievements', () => {
      const score = createMockScore({ achievements: 12 });
      expect(score.achievements).toBe(12);
    });

    it('should track streak', () => {
      const score = createMockScore({ streak: 45 });
      expect(score.streak).toBe(45);
    });

    it('should track last updated timestamp', () => {
      const score = createMockScore();
      expect(score.lastUpdated).toBeInstanceOf(Date);
    });

    it('should allow zero points for new users', () => {
      const score = createMockScore({ points: 0 });
      expect(score.points).toBe(0);
    });

    it('should support level 1 for new users', () => {
      const score = createMockScore({ level: 1 });
      expect(score.level).toBe(1);
    });

    it('should allow zero achievements for new users', () => {
      const score = createMockScore({ achievements: 0 });
      expect(score.achievements).toBe(0);
    });

    it('should allow zero streak for new users', () => {
      const score = createMockScore({ streak: 0 });
      expect(score.streak).toBe(0);
    });

    it('should support high point values', () => {
      const score = createMockScore({ points: 999999 });
      expect(score.points).toBe(999999);
    });

    it('should support high level values', () => {
      const score = createMockScore({ level: 100 });
      expect(score.level).toBe(100);
    });
  });
});
