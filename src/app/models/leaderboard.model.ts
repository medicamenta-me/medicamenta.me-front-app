/**
 * Leaderboard Entry Model
 * Represents a user's position in the ranking
 */
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatarUrl?: string;
  points: number;
  level: number;
  rank: number;
  isCurrentUser: boolean;
  achievements: number;
  streak: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
}

/**
 * Leaderboard Period
 */
export type LeaderboardPeriod = 'week' | 'month' | 'allTime';

/**
 * Leaderboard Data
 */
export interface LeaderboardData {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  userPosition?: number;
  userEntry?: LeaderboardEntry;
  lastUpdated: Date;
}

/**
 * User Leaderboard Score (Firestore Document)
 */
export interface UserLeaderboardScore {
  userId: string;
  points: number;
  level: number;
  achievements: number;
  streak: number;
  lastUpdated: Date;
}
