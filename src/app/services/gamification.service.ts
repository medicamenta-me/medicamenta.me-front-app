import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { 
  Achievement, 
  Streak, 
  UserGamification, 
  WeeklyProgress,
  ACHIEVEMENT_DEFINITIONS,
  calculateLevel,
  calculateLevelProgress,
  AchievementTier
} from '../models/achievement.model';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { AnalyticsService } from './analytics.service';
import { PatientSelectorService } from './patient-selector.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { UserService } from './user.service';
import { IndexedDBService } from './indexed-db.service';
import { ToastService } from './toast.service';
import { NotificationService } from './notification.service';
import { ModalController } from '@ionic/angular/standalone';
import { AchievementUnlockModalComponent } from '../components/achievement-unlock-modal/achievement-unlock-modal.component';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Service de Gamificação
 * Gerencia conquistas, streaks, níveis e progresso do usuário
 */
@Injectable({
  providedIn: 'root'
})
export class GamificationService {
  private readonly authService = inject(AuthService);
  private readonly firebaseService = inject(FirebaseService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly patientSelectorService = inject(PatientSelectorService);
  private readonly medicationService = inject(MedicationService);
  private readonly logService = inject(LogService);
  private readonly userService = inject(UserService);
  private readonly indexedDB = inject(IndexedDBService);
  private readonly toastService = inject(ToastService);
  private readonly notificationService = inject(NotificationService);
  private readonly modalCtrl = inject(ModalController);

  // Gamification data
  private readonly _gamificationData = signal<UserGamification | null>(null);
  public readonly gamificationData = this._gamificationData.asReadonly();

  // Computed signals
  public readonly achievements = computed(() => this._gamificationData()?.achievements || []);
  public readonly unlockedAchievements = computed(() => this.achievements().filter(a => a.unlocked));
  public readonly lockedAchievements = computed(() => this.achievements().filter(a => !a.unlocked));
  public readonly totalPoints = computed(() => this._gamificationData()?.totalPoints || 0);
  public readonly currentLevel = computed(() => calculateLevel(this.totalPoints()));
  public readonly levelProgress = computed(() => calculateLevelProgress(this.totalPoints()));
  public readonly streak = computed(() => this._gamificationData()?.streak);
  public readonly weeklyProgress = computed(() => this._gamificationData()?.weeklyProgress);

  constructor() {
    // Load gamification data when patient changes
    effect(() => {
      const patientId = this.patientSelectorService.activePatientId();
      if (patientId) {
        this.loadGamificationData(patientId);
      } else {
        this._gamificationData.set(null);
      }
    });

    // Update achievements when medications or logs change
    effect(() => {
      const medications = this.medicationService.medications();
      const logs = this.logService.logs();
      const patientId = this.patientSelectorService.activePatientId();
      
      if (patientId && (medications.length > 0 || logs.length > 0)) {
        // Debounce updates
        setTimeout(() => this.updateAchievements(), 1000);
      }
    });
  }

  /**
   * Load gamification data from Firestore
   */
  private async loadGamificationData(userId: string): Promise<void> {
    try {
      // Try cache first
      const cached = await this.indexedDB.get<UserGamification>('gamification', userId);
      if (cached) {
        this._gamificationData.set(cached);
      }

      // Load from Firestore
      const docRef = doc(this.firebaseService.firestore, `users/${userId}/gamification/data`);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserGamification;
        this._gamificationData.set(data);
        await this.indexedDB.put('gamification', data);
      } else {
        // Initialize new gamification data
        await this.initializeGamification(userId);
      }
    } catch (error: any) {
      this.logService.error('GamificationService', 'Failed to load data', error as Error);
    }
  }

  /**
   * Initialize gamification data for new user
   */
  private async initializeGamification(userId: string): Promise<void> {
    const initialData: UserGamification = {
      userId,
      totalPoints: 0,
      level: 1,
      achievements: ACHIEVEMENT_DEFINITIONS.map(def => ({
        ...def,
        currentProgress: 0,
        unlocked: false
      })),
      streak: {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastDoseDate: null,
        streakStartDate: null,
        isActive: false
      },
      weeklyProgress: this.calculateWeeklyProgress(),
      lastUpdated: new Date()
    };

    try {
      const docRef = doc(this.firebaseService.firestore, `users/${userId}/gamification/data`);
      await setDoc(docRef, initialData);
      this._gamificationData.set(initialData);
      await this.indexedDB.put('gamification', initialData);
    } catch (error: any) {
      this.logService.error('GamificationService', 'Failed to initialize', error as Error);
    }
  }

  /**
   * Update all achievements based on current data
   */
  async updateAchievements(): Promise<void> {
    const userId = this.patientSelectorService.activePatientId();
    if (!userId) return;

    const currentData = this._gamificationData();
    if (!currentData) return;

    let pointsEarned = 0;
    const updatedAchievements = [...currentData.achievements];

    // Update streak
    const updatedStreak = await this.updateStreak(userId);

    // Update weekly progress
    const weeklyProgress = this.calculateWeeklyProgress();

    // Check each achievement
    for (let i = 0; i < updatedAchievements.length; i++) {
      const achievement = updatedAchievements[i];
      if (achievement.unlocked) continue; // Skip already unlocked

      const progress = await this.calculateAchievementProgress(achievement.id, userId);
      achievement.currentProgress = progress;

      // Check if unlocked
      if (progress >= achievement.requirement) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        pointsEarned += achievement.points;

        // Show unlock notification
        this.showAchievementUnlocked(achievement);
      }
    }

    // Update total points and level
    const newTotalPoints = currentData.totalPoints + pointsEarned;
    const newLevel = calculateLevel(newTotalPoints);

    const updatedData: UserGamification = {
      ...currentData,
      totalPoints: newTotalPoints,
      level: newLevel.level,
      achievements: updatedAchievements,
      streak: updatedStreak,
      weeklyProgress,
      lastUpdated: new Date()
    };

    // Check for level up
    if (newLevel.level > currentData.level) {
      this.showLevelUp(newLevel.level, newLevel.name);
      
      // Update analytics user properties with new level
      this.analyticsService.setUserProperties({
        level: newLevel.level.toString(),
        total_points: newTotalPoints.toString()
      });
      this.logService.info('GamificationService', 'Analytics updated with new level', { level: newLevel.level });
    }

    // Save to Firestore and cache
    try {
      const docRef = doc(this.firebaseService.firestore, `users/${userId}/gamification/data`);
      await updateDoc(docRef, updatedData as any);
      this._gamificationData.set(updatedData);
      await this.indexedDB.put('gamification', updatedData);
      
      // Notify family gamification service if user is part of a family
      await this.notifyFamilyGamification();
    } catch (error: any) {
      this.logService.error('GamificationService', 'Failed to update', error as Error);
    }
  }

  /**
   * Calculate progress for specific achievement
   */
  private async calculateAchievementProgress(achievementId: string, userId: string): Promise<number> {
    const logs = this.logService.logs();
    const medications = this.medicationService.medications();
    const user = this.userService.currentUser();
    const currentData = this._gamificationData();

    switch (achievementId) {
      case 'perfect_week':
      case 'perfect_month':
      case 'perfect_quarter':
        return currentData?.streak.currentStreak || 0;

      case 'streak_warrior':
      case 'streak_champion':
      case 'streak_legend':
        return currentData?.streak.longestStreak || 0;

      case 'caregiver_starter':
      case 'caregiver_dedicated':
      case 'caregiver_hero':
        return user?.dependents.length || 0;

      case 'organizer_basic':
      case 'organizer_pro':
        return medications.filter(m => 
          !m.isArchived && 
          !m.isCompleted && 
          m.currentStock !== undefined && 
          m.currentStock > 0
        ).length;

      case 'organizer_master': {
        // Check if all medications have adequate stock for 30 days
        const allAdequate = medications.every(m => {
          if (m.isArchived || m.isCompleted) return true;
          const threshold = m.lowStockThreshold || 7;
          return (m.currentStock || 0) >= threshold;
        });
        return allAdequate ? 30 : 0;
      }

      case 'adherence_90':
      case 'adherence_95':
        return currentData?.weeklyProgress.adherenceRate || 0;

      case 'first_dose': {
        const takenLogs = logs.filter(l => l.eventType === 'taken');
        return takenLogs.length > 0 ? 1 : 0;
      }

      case 'early_bird': {
        const morningDoses = logs.filter(l => {
          const hour = new Date(l.timestamp).getHours();
          return l.eventType === 'taken' && hour < 8;
        });
        return morningDoses.length;
      }

      case 'night_owl': {
        const nightDoses = logs.filter(l => {
          const hour = new Date(l.timestamp).getHours();
          return l.eventType === 'taken' && hour >= 22;
        });
        return nightDoses.length;
      }

      default:
        return 0;
    }
  }

  /**
   * Update streak based on dose history
   */
  private async updateStreak(userId: string): Promise<Streak> {
    const currentStreak = this._gamificationData()?.streak;
    if (!currentStreak) {
      return {
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastDoseDate: null,
        streakStartDate: null,
        isActive: false
      };
    }

    const logs = this.logService.logs();
    const medications = this.medicationService.medications();

    // Get all doses from today and yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if user missed any dose today or yesterday
    let hasMissedRecently = false;
    
    for (const med of medications) {
      if (med.isArchived || med.isCompleted) continue;
      
      for (const dose of med.schedule) {
        if (dose.status === 'missed') {
          // Check if this missed dose is from today or yesterday
          const missedLogs = logs.filter(l => 
            l.eventType === 'missed'
          );
          
          if (missedLogs.length > 0) {
            const lastMissed = new Date(missedLogs[missedLogs.length - 1].timestamp);
            if (lastMissed >= yesterday) {
              hasMissedRecently = true;
              break;
            }
          }
        }
      }
      if (hasMissedRecently) break;
    }

    // Calculate new streak
    let newCurrentStreak = currentStreak.currentStreak;
    let newLongestStreak = currentStreak.longestStreak;
    let newStreakStartDate = currentStreak.streakStartDate;
    const isActive = !hasMissedRecently;

    if (hasMissedRecently) {
      // Streak broken
      newCurrentStreak = 0;
      newStreakStartDate = null;
    } else {
      // Streak continues or starts
      const takenToday = logs.some(l => {
        const logDate = new Date(l.timestamp);
        return l.eventType === 'taken' && logDate >= today;
      });

      if (takenToday) {
        newCurrentStreak++;
        if (!newStreakStartDate) {
          newStreakStartDate = today;
        }
        if (newCurrentStreak > newLongestStreak) {
          newLongestStreak = newCurrentStreak;
        }
      }
    }

    const lastTakenLog = logs.filter(l => l.eventType === 'taken').pop();
    const lastDoseDate = lastTakenLog ? new Date(lastTakenLog.timestamp) : null;

    return {
      userId,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastDoseDate,
      streakStartDate: newStreakStartDate,
      isActive
    };
  }

  /**
   * Calculate weekly progress
   */
  private calculateWeeklyProgress(): WeeklyProgress {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Saturday
    weekEnd.setHours(23, 59, 59, 999);

    const logs = this.logService.logs().filter(l => {
      const logDate = new Date(l.timestamp);
      return logDate >= weekStart && logDate <= weekEnd;
    });

    const medications = this.medicationService.medications();
    
    // Count total doses this week
    let totalDoses = 0;
    let takenDoses = 0;
    let missedDoses = 0;

    for (const med of medications) {
      if (med.isArchived || med.isCompleted) continue;
      
      // Each medication has doses per day
      const daysInWeek = Math.min(7, Math.ceil((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)));
      totalDoses += med.schedule.length * daysInWeek;
      
      for (const dose of med.schedule) {
        const taken = logs.filter(l => 
          l.eventType === 'taken'
        ).length;
        
        const missed = logs.filter(l => 
          l.eventType === 'missed'
        ).length;
        
        takenDoses += taken;
        missedDoses += missed;
      }
    }

    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;
    const perfectWeek = adherenceRate === 100 && totalDoses > 0;

    return {
      weekStart,
      weekEnd,
      totalDoses,
      takenDoses,
      missedDoses,
      adherenceRate,
      perfectWeek
    };
  }

  /**
   * Show achievement unlocked notification
   */
  private async showAchievementUnlocked(achievement: Achievement): Promise<void> {
    const tierEmoji = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎'
    };

    // Show toast notification
    this.toastService.show({
      message: `${tierEmoji[achievement.tier]} Conquista Desbloqueada!\n${achievement.name}`,
      color: 'success',
      duration: 5000,
      icon: 'trophy'
    });

    // Show celebration modal
    const modal = await this.modalCtrl.create({
      component: AchievementUnlockModalComponent,
      componentProps: {
        achievement
      },
      cssClass: 'achievement-unlock-modal',
      backdropDismiss: true
    });

    await modal.present();

    // Send browser push notification
    await this.notificationService.sendNotification(
      '🏆 Conquista Desbloqueada!',
      {
        body: `${achievement.name} - +${achievement.points} pontos`,
        icon: '/assets/icons/icon-512x512.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: `achievement-${achievement.id}`,
        requireInteraction: false,
        data: {
          type: 'achievement_unlocked',
          achievementId: achievement.id,
          url: '/achievements'
        }
      }
    );

    // Log analytics event
    this.trackAchievementUnlocked(achievement);

    this.logService.info('GamificationService', 'Achievement unlocked', { name: achievement.name, points: achievement.points });
  }

  /**
   * Show level up notification
   */
  private async showLevelUp(level: number, levelName: string): Promise<void> {
    // Show toast notification
    this.toastService.show({
      message: `🎉 Parabéns! Você subiu para o Nível ${level}: ${levelName}!`,
      color: 'success',
      duration: 5000,
      icon: 'star'
    });

    // Send browser push notification
    await this.notificationService.sendNotification(
      '🎉 Level Up!',
      {
        body: `Você alcançou o Nível ${level}: ${levelName}`,
        icon: '/assets/icons/icon-512x512.png',
        badge: '/assets/icons/badge-72x72.png',
        tag: 'level-up',
        requireInteraction: false,
        data: {
          type: 'level_up',
          level,
          url: '/achievements'
        }
      }
    );

    // Log analytics event
    this.trackLevelUp(level, levelName);
  }

  /**
   * Check if user is at risk of losing streak
   */
  checkStreakRisk(): boolean {
    const streak = this.streak();
    if (!streak || streak.currentStreak === 0) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const medications = this.medicationService.medications();
    const logs = this.logService.logs();

    // Check if there are any upcoming doses today that haven't been taken
    for (const med of medications) {
      if (med.isArchived || med.isCompleted) continue;
      
      for (const dose of med.schedule) {
        if (dose.status === 'upcoming') {
          // Check if this dose's time has passed
          const [hours, minutes] = dose.time.split(':').map(Number);
          const doseTime = new Date(today);
          doseTime.setHours(hours, minutes, 0, 0);
          
          if (new Date() > doseTime) {
            // Dose time passed and not taken = risk!
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Send streak risk notification
   */
  sendStreakRiskNotification(): void {
    const streak = this.streak();
    if (streak && streak.currentStreak > 0) {
      this.toastService.show({
        message: `⚠️ Atenção! Você pode perder seu streak de ${streak.currentStreak} dias!`,
        color: 'warning',
        duration: 10000,
        icon: 'warning'
      });
    }
  }

  /**
   * Get achievement by ID
   */
  getAchievementById(id: string): Achievement | undefined {
    return this.achievements().find(a => a.id === id);
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category: string): Achievement[] {
    return this.achievements().filter(a => a.category === category);
  }

  /**
   * Get achievements by tier
   */
  getAchievementsByTier(tier: AchievementTier): Achievement[] {
    return this.achievements().filter(a => a.tier === tier);
  }

  /**
   * Check and send streak risk notification (should be called daily)
   */
  async checkAndNotifyStreakRisk(): Promise<void> {
    const isAtRisk = this.checkStreakRisk();
    const streak = this.streak();

    if (isAtRisk && streak && streak.currentStreak > 0) {
      // Send toast
      this.sendStreakRiskNotification();

      // Send browser push notification
      await this.notificationService.sendNotification(
        '⚠️ Streak em Risco!',
        {
          body: `Não esqueça suas medicações! Seu streak de ${streak.currentStreak} dias está em risco.`,
          icon: '/assets/icons/icon-512x512.png',
          badge: '/assets/icons/badge-72x72.png',
          tag: 'streak-risk',
          requireInteraction: true,
          data: {
            type: 'streak_risk',
            currentStreak: streak.currentStreak,
            url: '/tabs/dashboard'
          }
        }
      );

      // Log analytics event
      this.trackStreakRisk(streak.currentStreak);
    }
  }

  /**
   * Track achievement unlocked event (Analytics)
   */
  private trackAchievementUnlocked(achievement: Achievement): void {
    // Firebase Analytics or custom analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'achievement_unlocked', {
        achievement_id: achievement.id,
        achievement_name: achievement.name,
        achievement_tier: achievement.tier,
        achievement_category: achievement.category,
        achievement_points: achievement.points,
        user_id: this.patientSelectorService.activePatientId()
      });
    }

    this.logService.debug('GamificationService', 'Analytics: achievement_unlocked', {
      id: achievement.id,
      name: achievement.name,
      tier: achievement.tier,
      points: achievement.points
    });
  }

  /**
   * Track level up event (Analytics)
   */
  private trackLevelUp(level: number, levelName: string): void {
    const totalPoints = this.totalPoints();

    // Firebase Analytics or custom analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'level_up', {
        level,
        level_name: levelName,
        total_points: totalPoints,
        user_id: this.patientSelectorService.activePatientId()
      });
    }

    this.logService.debug('GamificationService', 'Analytics: level_up', {
      level,
      levelName,
      totalPoints
    });
  }

  /**
   * Track streak milestone event (Analytics)
   */
  trackStreakMilestone(streakDays: number): void {
    // Firebase Analytics or custom analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'streak_milestone', {
        streak_days: streakDays,
        user_id: this.patientSelectorService.activePatientId()
      });
    }

    this.logService.debug('GamificationService', 'Analytics: streak_milestone', { streakDays });
  }

  /**
   * Track streak risk event (Analytics)
   */
  private trackStreakRisk(currentStreak: number): void {
    // Firebase Analytics or custom analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'streak_risk', {
        current_streak: currentStreak,
        user_id: this.patientSelectorService.activePatientId()
      });
    }

    this.logService.debug('GamificationService', 'Analytics: streak_risk', { currentStreak });
  }

  /**
   * Track gamification engagement metrics
   */
  trackGamificationEngagement(): void {
    const data = this._gamificationData();
    if (!data) return;

    const unlockedCount = data.achievements.filter(a => a.unlocked).length;
    const totalAchievements = data.achievements.length;
    const completionRate = (unlockedCount / totalAchievements) * 100;

    // Firebase Analytics or custom analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'gamification_engagement', {
        total_points: data.totalPoints,
        level: data.level,
        achievements_unlocked: unlockedCount,
        achievements_total: totalAchievements,
        completion_rate: completionRate,
        current_streak: data.streak.currentStreak,
        longest_streak: data.streak.longestStreak,
        weekly_adherence: data.weeklyProgress.adherenceRate,
        user_id: this.patientSelectorService.activePatientId()
      });
    }

    this.logService.debug('GamificationService', 'Analytics: gamification_engagement', {
      totalPoints: data.totalPoints,
      level: data.level,
      unlockedCount,
      completionRate: `${completionRate.toFixed(1)}%`
    });
  }

  /**
   * Notify family gamification service of points update
   * Called after individual achievements are updated
   */
  async notifyFamilyGamification(): Promise<void> {
    try {
      // Lazy load to avoid circular dependency
      const { FamilyGamificationService } = await import('./family-gamification.service');
      const familyGamificationService = inject(FamilyGamificationService);
      await familyGamificationService.updateFamilyProgress();
    } catch (error: any) {
      this.logService.warn('GamificationService', 'Failed to notify family gamification', { error });
    }
  }
}

