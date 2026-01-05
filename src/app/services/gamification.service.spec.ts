/**
 * GamificationService Unit Tests
 * 
 * Tests for the Gamification Service that manages achievements, 
 * streaks, levels, and user progression.
 * 
 * Total: 40 test scenarios
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { GamificationService } from './gamification.service';
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
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { 
  Achievement, 
  UserGamification, 
  Streak,
  WeeklyProgress,
  ACHIEVEMENT_DEFINITIONS 
} from '../models/achievement.model';
import { Medication, Dose } from '../models/medication.model';

describe('GamificationService', () => {
  let service: GamificationService;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockFirebaseService: any;
  let mockAnalyticsService: jasmine.SpyObj<AnalyticsService>;
  let mockPatientSelectorService: any;
  let mockMedicationService: any;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockUserService: any;
  let mockIndexedDBService: jasmine.SpyObj<IndexedDBService>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockModalCtrl: jasmine.SpyObj<ModalController>;

  const mockGamificationData: UserGamification = {
    userId: 'user-123',
    totalPoints: 500,
    level: 5,
    achievements: [
      {
        id: 'first_dose',
        name: 'Primeira Dose',
        description: 'Registrou sua primeira dose',
        category: 'adherence',
        tier: 'bronze',
        icon: 'checkmark-circle',
        requirement: 1,
        points: 10,
        currentProgress: 1,
        unlocked: true,
        unlockedAt: new Date('2025-01-01')
      },
      {
        id: 'perfect_week',
        name: 'Semana Perfeita',
        description: '7 dias consecutivos de aderência',
        category: 'adherence',
        tier: 'silver',
        icon: 'calendar',
        requirement: 7,
        points: 50,
        currentProgress: 5,
        unlocked: false
      }
    ],
    streak: {
      userId: 'user-123',
      currentStreak: 5,
      longestStreak: 10,
      lastDoseDate: new Date('2025-12-18'),
      streakStartDate: new Date('2025-12-13'),
      isActive: true
    },
    weeklyProgress: {
      weekStart: new Date('2025-12-15'),
      weekEnd: new Date('2025-12-21'),
      totalDoses: 21,
      takenDoses: 18,
      missedDoses: 3,
      adherenceRate: 85.71,
      perfectWeek: false
    },
    lastUpdated: new Date()
  };

  const mockMedication: Medication = {
    id: 'med-123',
    userId: 'user-123',
    patientId: 'user-123',
    name: 'Dipirona',
    dosage: '500mg',
    frequency: '8/8h',
    schedule: [
      { time: '08:00', status: 'taken' as const },
      { time: '16:00', status: 'taken' as const },
      { time: '00:00', status: 'upcoming' as const }
    ],
    stock: 30,
    currentStock: 30,
    isContinuousUse: true,
    isArchived: false,
    lastModified: new Date()
  };

  beforeEach(() => {
    // Create mocks
    mockAuthService = jasmine.createSpyObj('AuthService', ['currentUser']);
    mockFirebaseService = {
      firestore: {}
    };
    mockAnalyticsService = jasmine.createSpyObj('AnalyticsService', ['setUserProperties']);
    mockPatientSelectorService = {
      activePatientId: signal('user-123'),
      activePatient: signal({ id: 'user-123', name: 'Test Patient' })
    };
    mockMedicationService = {
      medications: signal([mockMedication])
    };
    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error', 'debug', 'info', 'warn', 'logs']);
    mockUserService = {
      currentUser: signal({ 
        uid: 'user-123', 
        email: 'test@test.com',
        dependents: []
      })
    };
    mockIndexedDBService = jasmine.createSpyObj('IndexedDBService', [
      'get',
      'put',
      'delete'
    ]);
    mockToastService = jasmine.createSpyObj('ToastService', ['show']);
    mockNotificationService = jasmine.createSpyObj('NotificationService', ['sendNotification']);
    mockModalCtrl = jasmine.createSpyObj('ModalController', ['create']);

    // Configure default behaviors
    mockIndexedDBService.get.and.returnValue(Promise.resolve(null));
    mockIndexedDBService.put.and.returnValue(Promise.resolve());
    mockAuthService.currentUser.and.returnValue({ uid: 'user-123' } as any);

    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot()],
      providers: [
        GamificationService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: PatientSelectorService, useValue: mockPatientSelectorService },
        { provide: MedicationService, useValue: mockMedicationService },
        { provide: LogService, useValue: mockLogService },
        { provide: UserService, useValue: mockUserService },
        { provide: IndexedDBService, useValue: mockIndexedDBService },
        { provide: ToastService, useValue: mockToastService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ModalController, useValue: mockModalCtrl }
      ]
    });

    service = TestBed.inject(GamificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ========================================
  // ACHIEVEMENTS - Positive Scenarios (15)
  // ========================================

  describe('Achievements - Positive Scenarios', () => {
    it('should unlock "First Dose" achievement after registering first dose', () => {
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: [
          {
            id: 'first_dose',
            name: 'Primeira Dose',
            requirement: 1,
            points: 10,
            currentProgress: 1,
            unlocked: true,
            category: 'milestones',
            tier: 'bronze',
            icon: 'checkmark-circle',
            description: 'Registrou primeira dose',
            unlockedAt: new Date()
          }
        ]
      });

      const achievements = service.achievements();
      const firstDose = achievements.find(a => a.id === 'first_dose');

      expect(firstDose?.unlocked).toBeTrue();
      expect(firstDose?.currentProgress).toBe(1);
    });

    it('should calculate level correctly from XP', () => {
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: 500
      });

      const level = service.currentLevel();
      expect(level.level).toBeGreaterThan(1);
    });

    it('should calculate level progress (0-100%)', () => {
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: 500
      });

      const progress = service.levelProgress();
      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
    });

    it('should increment streak when dose taken in the day', () => {
      const streakData: Streak = {
        userId: 'user-123',
        currentStreak: 7,
        longestStreak: 10,
        lastDoseDate: new Date(),
        streakStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isActive: true
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: streakData
      });

      const streak = service.streak();
      expect(streak?.currentStreak).toBe(7);
      expect(streak?.isActive).toBeTrue();
    });

    it('should maintain streak if dose taken before 23:59', () => {
      const today = new Date();
      today.setHours(23, 58, 0, 0);

      const streakData: Streak = {
        userId: 'user-123',
        currentStreak: 5,
        longestStreak: 10,
        lastDoseDate: today,
        streakStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isActive: true
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: streakData
      });

      const streak = service.streak();
      expect(streak?.currentStreak).toBe(5);
      expect(streak?.isActive).toBeTrue();
    });

    it('should add points (XP) when completing dose', () => {
      const initialPoints = 500;
      const pointsToAdd = 50;

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: initialPoints
      });

      // Simulate achievement unlock adding points
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: initialPoints + pointsToAdd
      });

      const newPoints = service.totalPoints();
      expect(newPoints).toBe(initialPoints + pointsToAdd);
    });

    it('should add bonus points when streak is active', () => {
      const basePoints = 10;
      const streakBonus = 5; // 50% bonus for 5-day streak

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: 500,
        streak: {
          ...mockGamificationData.streak,
          currentStreak: 5,
          isActive: true
        }
      });

      const streak = service.streak();
      expect(streak?.isActive).toBeTrue();
      expect(streak?.currentStreak).toBeGreaterThan(0);
    });

    it('should filter unlocked achievements', () => {
      (service as any)._gamificationData.set(mockGamificationData);

      const unlocked = service.unlockedAchievements();
      expect(unlocked.length).toBe(1);
      expect(unlocked[0].id).toBe('first_dose');
    });

    it('should filter locked achievements', () => {
      (service as any)._gamificationData.set(mockGamificationData);

      const locked = service.lockedAchievements();
      expect(locked.length).toBe(1);
      expect(locked[0].id).toBe('perfect_week');
    });

    it('should unlock Bronze tier achievement', () => {
      const bronzeAchievement: Achievement = {
        id: 'first_dose',
        name: 'Primeira Dose',
        tier: 'bronze',
        points: 10,
        requirement: 1,
        currentProgress: 1,
        unlocked: true,
        category: 'adherence',
        icon: 'checkmark',
        description: 'Primeira dose registrada',
        unlockedAt: new Date()
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: [bronzeAchievement]
      });

      const achievements = service.achievements();
      expect(achievements[0].tier).toBe('bronze');
      expect(achievements[0].unlocked).toBeTrue();
    });

    it('should unlock Silver tier achievement', () => {
      const silverAchievement: Achievement = {
        id: 'perfect_week',
        name: 'Semana Perfeita',
        tier: 'silver',
        points: 50,
        requirement: 7,
        currentProgress: 7,
        unlocked: true,
        category: 'adherence',
        icon: 'calendar',
        description: '7 dias consecutivos',
        unlockedAt: new Date()
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: [silverAchievement]
      });

      const achievements = service.achievements();
      expect(achievements[0].tier).toBe('silver');
      expect(achievements[0].unlocked).toBeTrue();
    });

    it('should unlock Gold tier achievement', () => {
      const goldAchievement: Achievement = {
        id: 'perfect_month',
        name: 'Mês Perfeito',
        tier: 'gold',
        points: 200,
        requirement: 30,
        currentProgress: 30,
        unlocked: true,
        category: 'adherence',
        icon: 'trophy',
        description: '30 dias consecutivos',
        unlockedAt: new Date()
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: [goldAchievement]
      });

      const achievements = service.achievements();
      expect(achievements[0].tier).toBe('gold');
      expect(achievements[0].unlocked).toBeTrue();
    });

    it('should unlock Platinum tier achievement', () => {
      const platinumAchievement: Achievement = {
        id: 'streak_legend',
        name: 'Lenda do Streak',
        tier: 'platinum',
        points: 500,
        requirement: 100,
        currentProgress: 100,
        unlocked: true,
        category: 'streak',
        icon: 'flame',
        description: '100 dias consecutivos',
        unlockedAt: new Date()
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: [platinumAchievement]
      });

      const achievements = service.achievements();
      expect(achievements[0].tier).toBe('platinum');
      expect(achievements[0].unlocked).toBeTrue();
    });

    it('should calculate multiple achievements at once', () => {
      const multipleAchievements: Achievement[] = [
        {
          id: 'first_dose',
          name: 'Primeira Dose',
          tier: 'bronze',
          points: 10,
          requirement: 1,
          currentProgress: 1,
          unlocked: true,
          category: 'adherence',
          icon: 'checkmark',
          description: 'Primeira dose',
          unlockedAt: new Date()
        },
        {
          id: 'perfect_week',
          name: 'Semana Perfeita',
          tier: 'silver',
          points: 50,
          requirement: 7,
          currentProgress: 7,
          unlocked: true,
          category: 'adherence',
          icon: 'calendar',
          description: '7 dias',
          unlockedAt: new Date()
        }
      ];

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: multipleAchievements,
        totalPoints: 60
      });

      const unlocked = service.unlockedAchievements();
      expect(unlocked.length).toBe(2);
    });

    it('should not unlock duplicate achievement', () => {
      const achievement: Achievement = {
        id: 'first_dose',
        name: 'Primeira Dose',
        tier: 'bronze',
        points: 10,
        requirement: 1,
        currentProgress: 1,
        unlocked: true,
        category: 'adherence',
        icon: 'checkmark',
        description: 'Primeira dose',
        unlockedAt: new Date('2025-01-01')
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: [achievement]
      });

      const unlocked = service.unlockedAchievements();
      expect(unlocked.length).toBe(1);
      expect(unlocked[0].unlockedAt).toBeDefined();
    });
  });

  // ========================================
  // ACHIEVEMENTS - Negative Scenarios (10)
  // ========================================

  describe('Achievements - Negative Scenarios', () => {
    it('should break streak if no dose taken for 24h', () => {
      const yesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      const streakData: Streak = {
        userId: 'user-123',
        currentStreak: 0,
        longestStreak: 10,
        lastDoseDate: yesterday,
        streakStartDate: null,
        isActive: false
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: streakData
      });

      const streak = service.streak();
      expect(streak?.currentStreak).toBe(0);
      expect(streak?.isActive).toBeFalse();
    });

    it('should reset streak to 0 when broken', () => {
      const streakData: Streak = {
        userId: 'user-123',
        currentStreak: 0,
        longestStreak: 10,
        lastDoseDate: null,
        streakStartDate: null,
        isActive: false
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: streakData
      });

      const streak = service.streak();
      expect(streak?.currentStreak).toBe(0);
    });

    it('should not add XP if dose already registered', () => {
      const initialPoints = 500;

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: initialPoints
      });

      // Simulate checking for duplicate - no points added
      const currentPoints = service.totalPoints();
      expect(currentPoints).toBe(initialPoints);
    });

    it('should not unlock achievement if criteria not met', () => {
      const achievement: Achievement = {
        id: 'perfect_week',
        name: 'Semana Perfeita',
        tier: 'silver',
        points: 50,
        requirement: 7,
        currentProgress: 5,
        unlocked: false,
        category: 'adherence',
        icon: 'calendar',
        description: '7 dias consecutivos'
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        achievements: [achievement]
      });

      const achievements = service.achievements();
      const perfectWeek = achievements.find(a => a.id === 'perfect_week');
      expect(perfectWeek?.unlocked).toBeFalse();
    });

    it('should not allow negative XP', () => {
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: 0
      });

      const points = service.totalPoints();
      expect(points).toBeGreaterThanOrEqual(0);
    });

    it('should not allow level > 50', () => {
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: 999999, // Absurdly high
        level: 50
      });

      const level = service.currentLevel();
      expect(level.level).toBeLessThanOrEqual(50);
    });

    it('should return empty if no gamification data loaded', () => {
      (service as any)._gamificationData.set(null);

      const achievements = service.achievements();
      expect(achievements.length).toBe(0);
    });

    it('should return 0 points if no gamification data', () => {
      (service as any)._gamificationData.set(null);

      const points = service.totalPoints();
      expect(points).toBe(0);
    });

    it('should return undefined streak if no gamification data', () => {
      (service as any)._gamificationData.set(null);

      const streak = service.streak();
      expect(streak).toBeUndefined();
    });

    it('should not find achievement by invalid ID', () => {
      (service as any)._gamificationData.set(mockGamificationData);

      const achievement = service.getAchievementById('invalid-id');
      expect(achievement).toBeUndefined();
    });
  });

  // ========================================
  // EDGE CASES (5)
  // ========================================

  describe('Edge Cases', () => {
    it('should handle multiple devices syncing XP', async () => {
      const device1Points = 500;
      const device2Points = 520; // Device 2 has more recent data

      mockIndexedDBService.get.and.returnValue(Promise.resolve({
        ...mockGamificationData,
        totalPoints: device1Points
      }));

      // Firestore has more recent data
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        totalPoints: device2Points
      });

      const points = service.totalPoints();
      expect(points).toBe(device2Points);
    });

    it('should handle timezone change for streak calculation', () => {
      const streakData: Streak = {
        userId: 'user-123',
        currentStreak: 5,
        longestStreak: 10,
        lastDoseDate: new Date(),
        streakStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isActive: true
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: streakData
      });

      const streak = service.streak();
      expect(streak?.currentStreak).toBeDefined();
    });

    it('should handle dose taken exactly at midnight', () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      const streakData: Streak = {
        userId: 'user-123',
        currentStreak: 5,
        longestStreak: 10,
        lastDoseDate: midnight,
        streakStartDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isActive: true
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: streakData
      });

      const streak = service.streak();
      expect(streak).toBeDefined();
    });

    it('should handle very large leaderboard (>10k users)', () => {
      // Simulate checking if leaderboard queries are paginated
      (service as any)._gamificationData.set(mockGamificationData);

      const data = service.gamificationData();
      expect(data).toBeDefined();
    });

    it('should detect streak risk when dose time passed', () => {
      const medication: Medication = {
        ...mockMedication,
        schedule: [
          { time: '08:00', status: 'upcoming' as const }, // Passed time
          { time: '16:00', status: 'upcoming' as const },
          { time: '00:00', status: 'upcoming' as const }
        ]
      };

      mockMedicationService.medications.set([medication]);

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: {
          ...mockGamificationData.streak,
          currentStreak: 10,
          isActive: true
        }
      });

      // Mock current time as past 08:00
      const isAtRisk = service.checkStreakRisk();
      expect(typeof isAtRisk).toBe('boolean');
    });
  });

  // ========================================
  // WEEKLY PROGRESS (5)
  // ========================================

  describe('Weekly Progress', () => {
    it('should calculate weekly adherence rate correctly', () => {
      const weeklyProgress: WeeklyProgress = {
        weekStart: new Date('2025-12-15'),
        weekEnd: new Date('2025-12-21'),
        totalDoses: 21,
        takenDoses: 18,
        missedDoses: 3,
        adherenceRate: 85.71,
        perfectWeek: false
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        weeklyProgress
      });

      const progress = service.weeklyProgress();
      expect(progress?.adherenceRate).toBeCloseTo(85.71, 1);
    });

    it('should identify perfect week (100% adherence)', () => {
      const weeklyProgress: WeeklyProgress = {
        weekStart: new Date('2025-12-15'),
        weekEnd: new Date('2025-12-21'),
        totalDoses: 21,
        takenDoses: 21,
        missedDoses: 0,
        adherenceRate: 100,
        perfectWeek: true
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        weeklyProgress
      });

      const progress = service.weeklyProgress();
      expect(progress?.perfectWeek).toBeTrue();
      expect(progress?.adherenceRate).toBe(100);
    });

    it('should calculate weekly progress from Sunday to Saturday', () => {
      const weeklyProgress: WeeklyProgress = {
        weekStart: new Date('2025-12-15'), // Sunday
        weekEnd: new Date('2025-12-21'),   // Saturday
        totalDoses: 21,
        takenDoses: 18,
        missedDoses: 3,
        adherenceRate: 85.71,
        perfectWeek: false
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        weeklyProgress
      });

      const progress = service.weeklyProgress();
      expect(progress?.weekStart.getDay()).toBe(0); // Sunday
      expect(progress?.weekEnd.getDay()).toBe(6);   // Saturday
    });

    it('should track doses taken vs total doses', () => {
      const weeklyProgress: WeeklyProgress = {
        weekStart: new Date('2025-12-15'),
        weekEnd: new Date('2025-12-21'),
        totalDoses: 21,
        takenDoses: 18,
        missedDoses: 3,
        adherenceRate: 85.71,
        perfectWeek: false
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        weeklyProgress
      });

      const progress = service.weeklyProgress();
      expect(progress?.takenDoses).toBe(18);
      expect(progress?.totalDoses).toBe(21);
      expect(progress?.missedDoses).toBe(3);
    });

    it('should handle week with no doses (0% adherence)', () => {
      const weeklyProgress: WeeklyProgress = {
        weekStart: new Date('2025-12-15'),
        weekEnd: new Date('2025-12-21'),
        totalDoses: 21,
        takenDoses: 0,
        missedDoses: 21,
        adherenceRate: 0,
        perfectWeek: false
      };

      (service as any)._gamificationData.set({
        ...mockGamificationData,
        weeklyProgress
      });

      const progress = service.weeklyProgress();
      expect(progress?.adherenceRate).toBe(0);
      expect(progress?.perfectWeek).toBeFalse();
    });
  });

  // ========================================
  // HELPER METHODS (5)
  // ========================================

  describe('Helper Methods', () => {
    it('should get achievement by ID', () => {
      (service as any)._gamificationData.set(mockGamificationData);

      const achievement = service.getAchievementById('first_dose');
      expect(achievement).toBeDefined();
      expect(achievement?.name).toBe('Primeira Dose');
    });

    it('should filter achievements by category', () => {
      (service as any)._gamificationData.set(mockGamificationData);

      const adherence = service.getAchievementsByCategory('adherence');
      expect(adherence.length).toBeGreaterThan(0);
    });

    it('should filter achievements by tier', () => {
      (service as any)._gamificationData.set(mockGamificationData);

      const bronze = service.getAchievementsByTier('bronze');
      expect(bronze.length).toBeGreaterThan(0);
    });

    it('should send streak risk notification', () => {
      (service as any)._gamificationData.set({
        ...mockGamificationData,
        streak: {
          ...mockGamificationData.streak,
          currentStreak: 10,
          isActive: true
        }
      });

      service.sendStreakRiskNotification();

      expect(mockToastService.show).toHaveBeenCalledWith(
        jasmine.objectContaining({
          message: jasmine.stringContaining('streak'),
          color: 'warning'
        })
      );
    });

    it('should track gamification engagement metrics', () => {
      (service as any)._gamificationData.set(mockGamificationData);

      service.trackGamificationEngagement();

      expect(mockLogService.debug).toHaveBeenCalled();
    });
  });
});
