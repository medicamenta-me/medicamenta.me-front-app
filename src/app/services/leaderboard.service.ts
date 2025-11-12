import { Injectable, inject, signal } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  getDoc,
  onSnapshot,
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint,
  Timestamp,
  Unsubscribe
} from '@angular/fire/firestore';
import { UserService } from './user.service';
import { GamificationService } from './gamification.service';
import { AnalyticsService } from './analytics.service';
import { CareNetworkService } from './care-network.service';
import { NotificationService } from './notification.service';
import { LogService } from './log.service';
import { 
  LeaderboardEntry, 
  LeaderboardPeriod, 
  LeaderboardData,
  UserLeaderboardScore 
} from '../models/leaderboard.model';

/**
 * LeaderboardService
 * Manages leaderboard rankings within care network
 * Tracks weekly, monthly, and all-time scores
 */
@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private firestore = inject(Firestore);
  private userService = inject(UserService);
  private gamificationService = inject(GamificationService);
  private analytics = inject(AnalyticsService);
  private careNetworkService = inject(CareNetworkService);
  private notificationService = inject(NotificationService);
  private logService = inject(LogService);

  // Reactive state
  public readonly leaderboard = signal<LeaderboardData | null>(null);
  public readonly isLoading = signal<boolean>(false);
  
  // Cache for care network IDs to avoid reprocessing
  private careNetworkCache = signal<{
    userId: string;
    ids: string[];
    timestamp: number;
  } | null>(null);
  
  // Cache TTL: 5 minutes
  private readonly CACHE_TTL = 5 * 60 * 1000;
  
  // Real-time listener unsubscribe function
  private leaderboardUnsubscribe: Unsubscribe | null = null;
  
  // Previous leaderboard state for detecting position changes
  private previousLeaderboard = signal<LeaderboardData | null>(null);

  /**
   * Get current period identifier
   */
  private getCurrentPeriodId(period: LeaderboardPeriod): string {
    const now = new Date();
    
    switch (period) {
      case 'week':
        // Format: 2025-W45
        const weekNumber = this.getWeekNumber(now);
        return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      
      case 'month':
        // Format: 2025-11
        return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      
      case 'allTime':
        return 'all';
    }
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Load leaderboard for a specific period
   * @param period - Time period for leaderboard (week, month, allTime)
   * @param showGlobal - If true, show global leaderboard; if false, show care network only
   */
  async loadLeaderboard(period: LeaderboardPeriod = 'allTime', showGlobal: boolean = false): Promise<void> {
    this.isLoading.set(true);

    try {
      const currentUser = this.userService.currentUser();
      if (!currentUser) {
        this.logService.warn('LeaderboardService', 'No current user');
        this.isLoading.set(false);
        return;
      }

      // Get care network members (includes self, people I care for, people who care for me)
      // Skip if showing global leaderboard
      const careNetworkIds = showGlobal 
        ? [] // Empty array means fetch all (global)
        : await this.getCareNetworkIds(currentUser.id);

      // Get leaderboard entries
      const entries = await this.fetchLeaderboardEntries(period, careNetworkIds, showGlobal);

      // Find user position
      const userPosition = entries.findIndex(e => e.userId === currentUser.id) + 1;
      const userEntry = entries.find(e => e.userId === currentUser.id);

      // Build leaderboard data
      const leaderboardData: LeaderboardData = {
        period,
        entries: entries.slice(0, 10), // Top 10
        userPosition: userPosition > 0 ? userPosition : undefined,
        userEntry: userEntry,
        lastUpdated: new Date()
      };

      this.leaderboard.set(leaderboardData);

      // Track analytics
      this.analytics.logEvent('leaderboard_view', {
        period,
        leaderboard_type: showGlobal ? 'global' : 'care_network',
        user_rank: userPosition > 0 ? userPosition : 'unranked',
        total_entries: entries.length,
        in_top_10: userPosition > 0 && userPosition <= 10,
        care_network_size: showGlobal ? 0 : careNetworkIds.length
      });

    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error loading leaderboard', error as Error);
      this.leaderboard.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Start real-time listener for leaderboard updates
   * @param period - Time period for leaderboard (week, month, allTime)
   * @param showGlobal - If true, show global leaderboard; if false, show care network only
   */
  async startRealtimeLeaderboard(period: LeaderboardPeriod = 'allTime', showGlobal: boolean = false): Promise<void> {
    // Stop existing listener if any
    this.stopRealtimeLeaderboard();

    const currentUser = this.userService.currentUser();
    if (!currentUser) {
      this.logService.warn('LeaderboardService', 'No current user for real-time listener');
      return;
    }

    this.isLoading.set(true);

    try {
      // Get care network members
      const careNetworkIds = showGlobal 
        ? [] 
        : await this.getCareNetworkIds(currentUser.id);

      const periodId = this.getCurrentPeriodId(period);
      const leaderboardRef = collection(this.firestore, `leaderboards/${period}/${periodId}`);

      // Build query based on scope
      let q;
      if (showGlobal) {
        // Global: top 100
        const constraints: QueryConstraint[] = [
          orderBy('points', 'desc'),
          limit(100)
        ];
        q = query(leaderboardRef, ...constraints);
      } else if (careNetworkIds.length <= 10 && careNetworkIds.length > 0) {
        // Small network: use 'in' filter
        const constraints: QueryConstraint[] = [
          where('userId', 'in', careNetworkIds),
          orderBy('points', 'desc')
        ];
        q = query(leaderboardRef, ...constraints);
      } else {
        // Large network: fetch top 100 and filter in memory
        const constraints: QueryConstraint[] = [
          orderBy('points', 'desc'),
          limit(100)
        ];
        q = query(leaderboardRef, ...constraints);
      }

      this.logService.debug('LeaderboardService', `Starting real-time listener (${showGlobal ? 'global' : 'care network'})`);

      // Start listening
      this.leaderboardUnsubscribe = onSnapshot(q, async (snapshot) => {
        this.logService.debug('LeaderboardService', `Real-time update received (${snapshot.docs.length} docs)`);
        
        let entries = snapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as LeaderboardEntry));

        // Filter by care network if needed (for large networks)
        if (!showGlobal && careNetworkIds.length > 10) {
          const networkSet = new Set(careNetworkIds);
          entries = entries.filter(e => networkSet.has(e.userId));
        }

        // Enrich with user data
        await this.enrichEntriesWithUserData(entries);

        // Find user position
        const userPosition = entries.findIndex(e => e.userId === currentUser.id) + 1;
        const userEntry = entries.find(e => e.userId === currentUser.id);

        // Build new leaderboard data
        const leaderboardData: LeaderboardData = {
          period,
          entries: entries.slice(0, 10),
          userPosition: userPosition > 0 ? userPosition : undefined,
          userEntry: userEntry,
          lastUpdated: new Date()
        };

        // Detect position changes and send notifications
        this.detectAndNotifyOvertakes(currentUser.id, leaderboardData, careNetworkIds);

        // Update state
        this.leaderboard.set(leaderboardData);
        this.previousLeaderboard.set(leaderboardData);
        this.isLoading.set(false);
      }, (error) => {
        this.logService.error('LeaderboardService', 'Real-time listener error', error as Error);
        this.leaderboard.set(null);
        this.isLoading.set(false);
      });

    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error starting real-time listener', error as Error);
      this.leaderboard.set(null);
      this.isLoading.set(false);
    }
  }

  /**
   * Stop real-time leaderboard listener
   */
  stopRealtimeLeaderboard(): void {
    if (this.leaderboardUnsubscribe) {
      this.logService.debug('LeaderboardService', 'Stopping real-time listener');
      this.leaderboardUnsubscribe();
      this.leaderboardUnsubscribe = null;
    }
  }

  /**
   * Detect when someone from care network overtakes the user and send notification
   * @param userId - Current user ID
   * @param newLeaderboard - New leaderboard state
   * @param careNetworkIds - Array of care network member IDs
   */
  private detectAndNotifyOvertakes(
    userId: string, 
    newLeaderboard: LeaderboardData,
    careNetworkIds: string[]
  ): void {
    const previous = this.previousLeaderboard();
    
    // Skip if no previous state (first load)
    if (!previous || !previous.userPosition || !newLeaderboard.userPosition) {
      return;
    }

    // Skip if position improved or stayed the same
    if (newLeaderboard.userPosition <= previous.userPosition) {
      return;
    }

    // Position got worse - someone overtook the user
    const positionDrop = newLeaderboard.userPosition - previous.userPosition;
    
    this.logService.info('LeaderboardService', `User position dropped from ${previous.userPosition} to ${newLeaderboard.userPosition}`);

    // Find who overtook the user (people now ahead who weren't before)
    const previousAhead = new Set(
      previous.entries
        .filter(e => e.rank < previous.userPosition!)
        .map(e => e.userId)
    );

    const newOvertakers = newLeaderboard.entries
      .filter(e => 
        e.rank < newLeaderboard.userPosition! && 
        !previousAhead.has(e.userId) &&
        e.userId !== userId
      );

    // Send notification for each overtaker in care network
    for (const overtaker of newOvertakers) {
      // Only notify for care network members
      if (!careNetworkIds.includes(overtaker.userId)) {
        continue;
      }

      this.sendOvertakeNotification(overtaker, newLeaderboard.userPosition);
    }

    // Log analytics
    if (newOvertakers.length > 0) {
      this.analytics.logEvent('leaderboard_overtaken', {
        position_drop: positionDrop,
        new_position: newLeaderboard.userPosition,
        overtakers_count: newOvertakers.length,
        period: newLeaderboard.period
      });
    }
  }

  /**
   * Send notification when someone overtakes the user
   */
  private async sendOvertakeNotification(overtaker: LeaderboardEntry, userPosition: number): Promise<void> {
    try {
      // Check if notifications are enabled
      if (!this.notificationService.isPermissionGranted()) {
        return;
      }

      const title = '🏆 Você foi ultrapassado!';
      const body = `${overtaker.userName} passou você no ranking! Você está agora em #${userPosition}. Continue se esforçando! 💪`;

      await this.notificationService.sendNotification(title, {
        body,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: `leaderboard-overtake-${overtaker.userId}`,
        requireInteraction: false,
        data: {
          type: 'leaderboard_overtake',
          overtakerId: overtaker.userId,
          overtakerName: overtaker.userName,
          userPosition
        }
      });

      this.logService.debug('LeaderboardService', `Sent overtake notification for ${overtaker.userName}`);

    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error sending overtake notification', error as Error);
    }
  }

  /**
   * Fetch leaderboard entries from Firestore
   * Optimized for care network filtering or global view
   * @param period - Time period for leaderboard
   * @param userIds - Array of user IDs to filter by (empty = global)
   * @param showGlobal - If true, fetch top 100 globally
   */
  private async fetchLeaderboardEntries(
    period: LeaderboardPeriod, 
    userIds: string[],
    showGlobal: boolean = false
  ): Promise<LeaderboardEntry[]> {
    try {
      const periodId = this.getCurrentPeriodId(period);
      const leaderboardRef = collection(this.firestore, `leaderboards/${period}/${periodId}`);

      // Global leaderboard: fetch top 100
      if (showGlobal) {
        this.logService.debug('LeaderboardService', 'Fetching global leaderboard (top 100)');
        const constraints: QueryConstraint[] = [
          orderBy('points', 'desc'),
          limit(100)
        ];
        const q = query(leaderboardRef, ...constraints);
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id } as LeaderboardEntry));
        this.logService.debug('LeaderboardService', `Fetched ${entries.length} global entries`);
        return entries;
      }

      // Care network: if empty (only self), return empty or self only
      if (userIds.length === 0) {
        this.logService.debug('LeaderboardService', 'No care network members, showing empty leaderboard');
        return [];
      }

      // If care network is small (≤10 users), use optimized query with 'in' filter
      if (userIds.length <= 10) {
        const constraints: QueryConstraint[] = [
          where('userId', 'in', userIds),
          orderBy('points', 'desc')
        ];

        const q = query(leaderboardRef, ...constraints);
        const snapshot = await getDocs(q);

        const entries: LeaderboardEntry[] = [];
        let rank = 1;

        snapshot.forEach((doc) => {
          const data = doc.data() as UserLeaderboardScore;
          entries.push({
            userId: data.userId,
            userName: 'Usuário', // Will be enriched
            points: data.points,
            level: data.level,
            rank: rank++,
            isCurrentUser: data.userId === this.userService.currentUser()?.id,
            achievements: data.achievements,
            streak: data.streak
          });
        });

        this.logService.debug('LeaderboardService', `Fetched ${entries.length} entries using optimized query (care network size: ${userIds.length})`);

        // Enrich with user data
        await this.enrichEntriesWithUserData(entries);
        return entries;
      }

      // If care network is large (>10 users), fetch all and filter in memory
      // This is less efficient but necessary due to Firestore 'in' query limit of 10
      const constraints: QueryConstraint[] = [
        orderBy('points', 'desc'),
        limit(100) // Fetch top 100 to increase chance of finding network members
      ];

      const q = query(leaderboardRef, ...constraints);
      const snapshot = await getDocs(q);

      const entries: LeaderboardEntry[] = [];
      let rank = 1;

      snapshot.forEach((doc) => {
        const data = doc.data() as UserLeaderboardScore;
        
        // Filter by care network in memory
        if (userIds.includes(data.userId)) {
          entries.push({
            userId: data.userId,
            userName: 'Usuário', // Will be enriched
            points: data.points,
            level: data.level,
            rank: rank++,
            isCurrentUser: data.userId === this.userService.currentUser()?.id,
            achievements: data.achievements,
            streak: data.streak
          });
        }
      });

      this.logService.debug('LeaderboardService', `Fetched ${entries.length} entries after filtering by care network (total scanned: ${snapshot.size}, network size: ${userIds.length})`);

      // Enrich with user data
      await this.enrichEntriesWithUserData(entries);

      return entries;

    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error fetching entries', error as Error);
      return [];
    }
  }

  /**
   * Enrich entries with user names and avatars
   * Also filters out users who have disabled leaderboard visibility
   */
  private async enrichEntriesWithUserData(entries: LeaderboardEntry[]): Promise<void> {
    const userIds = entries.map(entry => entry.userId);
    
    // Batch fetch user data from Firestore
    if (userIds.length === 0) return;
    
    try {
      const usersRef = collection(this.firestore, 'users');
      const chunks = this.chunkArray(userIds, 10); // Firestore 'in' query limit is 10
      
      const userDataMap = new Map<string, { name: string; avatarUrl?: string; leaderboardVisible?: boolean }>();
      
      for (const chunk of chunks) {
        const q = query(usersRef, where('__name__', 'in', chunk));
        const snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          userDataMap.set(doc.id, {
            name: data['name'] || 'Usuário',
            avatarUrl: data['avatarUrl'],
            leaderboardVisible: data['leaderboardVisible'] !== false // Default to true if not set
          });
        });
      }
      
      // Filter out users who disabled leaderboard visibility and enrich remaining entries
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        const userData = userDataMap.get(entry.userId);
        
        if (userData) {
          // Remove entry if user disabled leaderboard visibility (unless it's current user)
          if (!userData.leaderboardVisible && !entry.isCurrentUser) {
            entries.splice(i, 1);
            continue;
          }
          
          entry.userName = userData.name;
          entry.avatarUrl = userData.avatarUrl;
        } else {
          // User data not found, use placeholder
          entry.userName = `Usuário ${entry.rank}`;
        }
      }
      
      // Recalculate ranks after filtering
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });
      
    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error enriching user data', error as Error);
      // Fallback to placeholder names
      entries.forEach(entry => {
        entry.userName = `Usuário ${entry.rank}`;
      });
    }
  }
  
  /**
   * Helper to split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get care network member IDs
   * Returns list of user IDs in the same care network (bidirectional)
   * Includes:
   * - People I care for (iCareFor)
   * - People who care for me (whoCareForMe)
   * - Current user
   * 
   * Uses cache to avoid reprocessing on every load
   */
  private async getCareNetworkIds(userId: string): Promise<string[]> {
    try {
      // Check cache first
      const cache = this.careNetworkCache();
      const now = Date.now();
      
      if (cache && cache.userId === userId && (now - cache.timestamp) < this.CACHE_TTL) {
        this.logService.debug('LeaderboardService', `Using cached care network (${cache.ids.length} members, age: ${Math.round((now - cache.timestamp) / 1000)}s)`);
        return cache.ids;
      }

      // Cache miss or expired - recompute
      this.logService.debug('LeaderboardService', 'Cache miss or expired, recomputing care network...');
      
      const networkIds = new Set<string>();
      
      // Always include self
      networkIds.add(userId);

      // Get people I care for
      const iCareFor = this.careNetworkService.iCareFor();
      for (const person of iCareFor) {
        // Only include registered users with active status
        if (person.isRegisteredUser && person.status === 'active') {
          networkIds.add(person.userId);
        }
      }

      // Get people who care for me
      const whoCareForMe = this.careNetworkService.whoCareForMe();
      for (const carer of whoCareForMe) {
        // Only include carers with active status
        if (carer.status === 'active') {
          networkIds.add(carer.userId);
        }
      }

      const networkArray = Array.from(networkIds);
      
      // Update cache
      this.careNetworkCache.set({
        userId,
        ids: networkArray,
        timestamp: now
      });

      this.logService.debug('LeaderboardService', `Care network for user ${userId}`, {
        total: networkArray.length,
        iCareFor: iCareFor.filter(p => p.isRegisteredUser && p.status === 'active').length,
        whoCareForMe: whoCareForMe.filter(c => c.status === 'active').length,
        networkIds: networkArray,
        cached: true
      });

      return networkArray;

    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error getting care network', error as Error);
      // Fallback: return only current user
      return [userId];
    }
  }

  /**
   * Invalidate care network cache
   * Call this when care network changes (add/remove connections)
   */
  public invalidateCareNetworkCache(): void {
    this.logService.debug('LeaderboardService', 'Invalidating care network cache');
    this.careNetworkCache.set(null);
  }

  /**
   * Update user score in leaderboard
   * Should be called after point changes (achievement unlock, level up, etc.)
   */
  async updateUserScore(userId?: string): Promise<void> {
    try {
      const currentUser = userId || this.userService.currentUser()?.id;
      if (!currentUser) return;

      // Get stats from gamification service
      const totalPoints = this.gamificationService.totalPoints();
      const currentLevel = this.gamificationService.currentLevel();
      const unlockedAchievements = this.gamificationService.unlockedAchievements().length;
      const streak = this.gamificationService.streak();

      const scoreData: UserLeaderboardScore = {
        userId: currentUser,
        points: totalPoints,
        level: currentLevel.level,
        achievements: unlockedAchievements,
        streak: streak?.currentStreak || 0,
        lastUpdated: new Date()
      };

      // Update all periods
      await this.updatePeriodScore('week', scoreData);
      await this.updatePeriodScore('month', scoreData);
      await this.updatePeriodScore('allTime', scoreData);

      this.logService.debug('LeaderboardService', 'User score updated', scoreData);

    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error updating user score', error as Error);
    }
  }

  /**
   * Update score for a specific period
   */
  private async updatePeriodScore(
    period: LeaderboardPeriod, 
    scoreData: UserLeaderboardScore
  ): Promise<void> {
    const periodId = this.getCurrentPeriodId(period);
    const docRef = doc(this.firestore, `leaderboards/${period}/${periodId}/${scoreData.userId}`);

    await setDoc(docRef, {
      ...scoreData,
      lastUpdated: Timestamp.fromDate(scoreData.lastUpdated)
    }, { merge: true });
  }

  /**
   * Get user rank in a specific period
   */
  async getUserRank(userId: string, period: LeaderboardPeriod = 'allTime'): Promise<number> {
    try {
      const periodId = this.getCurrentPeriodId(period);
      const leaderboardRef = collection(this.firestore, `leaderboards/${period}/${periodId}`);
      
      const q = query(leaderboardRef, orderBy('points', 'desc'));
      const snapshot = await getDocs(q);

      let rank = 1;
      for (const doc of snapshot.docs) {
        if (doc.id === userId) {
          return rank;
        }
        rank++;
      }

      return 0; // Not found
    } catch (error: any) {
      this.logService.error('LeaderboardService', 'Error getting user rank', error as Error);
      return 0;
    }
  }

  /**
   * Reset weekly leaderboard (should be called by scheduled function)
   */
  async resetWeeklyLeaderboard(): Promise<void> {
    // In production, this would be a Cloud Function triggered on Monday 00:00
    this.logService.info('LeaderboardService', 'Weekly leaderboard reset');
  }

  /**
   * Reset monthly leaderboard (should be called by scheduled function)
   */
  async resetMonthlyLeaderboard(): Promise<void> {
    // In production, this would be a Cloud Function triggered on 1st of each month
    this.logService.info('LeaderboardService', 'Monthly leaderboard reset');
  }
}

