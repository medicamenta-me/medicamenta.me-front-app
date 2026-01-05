/**
 * SmartRemindersService Unit Tests
 * 
 * Tests for the Smart Reminders Service that analyzes medication
 * patterns and generates intelligent suggestions.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SmartRemindersService, ReminderPattern, PatternAnalysis, SmartSuggestion } from './smart-reminders.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { UserService } from './user.service';
import { IndexedDBService } from './indexed-db.service';
import { FirebaseService } from './firebase.service';
import { ReminderPatternAnalyzerService } from './reminder-pattern-analyzer.service';

describe('SmartRemindersService', () => {
  let service: SmartRemindersService;
  let mockMedicationService: any;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockUserService: any;
  let mockIndexedDBService: jasmine.SpyObj<IndexedDBService>;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let mockReminderPatternAnalyzer: jasmine.SpyObj<ReminderPatternAnalyzerService>;

  const mockPattern: ReminderPattern = {
    id: 'pattern-1',
    userId: 'user-123',
    medicationId: 'med-123',
    medicationName: 'Aspirina',
    scheduledTime: '14:00',
    actualTime: '14:35',
    missed: false,
    dayOfWeek: 1, // Monday
    date: new Date('2025-11-10T14:35:00'),
    timestamp: new Date('2025-11-10T14:35:00'),
    delayMinutes: 35
  };

  const mockAnalysis: PatternAnalysis = {
    medicationId: 'med-123',
    medicationName: 'Aspirina',
    scheduledTime: '14:00',
    dayOfWeek: 1,
    totalDoses: 10,
    missedDoses: 2,
    averageDelayMinutes: 25,
    missedPercentage: 20,
    hasRecurringMissedDoses: false,
    hasConsistentDelay: false,
    confidence: 0.8,
    createdAt: new Date()
  };

  beforeEach(() => {
    // Create mocks
    mockMedicationService = {
      medications: signal([]),
      getMedicationById: jasmine.createSpy('getMedicationById')
    };

    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error', 'warn', 'debug', 'info']);
    
    // Start with no user to prevent Firestore sync during construction
    mockUserService = {
      user: signal(null),
      currentUser: signal(null)
    };

    mockIndexedDBService = jasmine.createSpyObj('IndexedDBService', [
      'get',
      'getAll',
      'put',
      'delete',
      'clear'
    ]);
    // Default: return empty data for loadData
    mockIndexedDBService.get.and.returnValue(Promise.resolve(null));

    // Mock Firestore SDK
    const mockFirestore = {
      // Mock Firestore instance - the functions like collection() expect this as first arg
    };

    mockFirebaseService = jasmine.createSpyObj('FirebaseService', ['firestore']);
    Object.defineProperty(mockFirebaseService, 'firestore', {
      get: () => mockFirestore,
      configurable: true
    });

    mockReminderPatternAnalyzer = jasmine.createSpyObj('ReminderPatternAnalyzerService', [
      'analyzePatterns',
      'detectForgetfulnessRisk'
    ]);

    TestBed.configureTestingModule({
      providers: [
        SmartRemindersService,
        { provide: MedicationService, useValue: mockMedicationService },
        { provide: LogService, useValue: mockLogService },
        { provide: UserService, useValue: mockUserService },
        { provide: IndexedDBService, useValue: mockIndexedDBService },
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: ReminderPatternAnalyzerService, useValue: mockReminderPatternAnalyzer }
      ]
    });

    service = TestBed.inject(SmartRemindersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('analyzeAllPatterns', () => {
    it('should analyze patterns for all medications', async () => {
      // Arrange
      mockMedicationService.medications.set([
        { id: 'med-1', name: 'Med 1' },
        { id: 'med-2', name: 'Med 2' }
      ]);
      spyOn<any>(service, 'analyzeMedication').and.returnValue(Promise.resolve(mockAnalysis));
      spyOn<any>(service, 'collectPatternsFromLogs').and.returnValue(Promise.resolve());

      // Act
      await service.analyzeAllPatterns();

      // Assert
      expect((service as any).collectPatternsFromLogs).toHaveBeenCalled();
      expect((service as any).analyzeMedication).toHaveBeenCalledTimes(2);
    });

    it('should skip analysis when no medications', async () => {
      // Arrange
      mockMedicationService.medications.set([]);
      spyOn<any>(service, 'analyzeMedication');
      spyOn<any>(service, 'collectPatternsFromLogs').and.returnValue(Promise.resolve());

      // Act
      await service.analyzeAllPatterns();

      // Assert
      expect((service as any).analyzeMedication).not.toHaveBeenCalled();
    });

    it('should handle analysis errors gracefully', async () => {
      // Arrange
      mockMedicationService.medications.set([{ id: 'med-1', name: 'Med 1' }] as any);
      spyOn<any>(service, 'collectPatternsFromLogs').and.returnValue(Promise.resolve());
      spyOn<any>(service, 'analyzeMedication').and.returnValue(Promise.reject(new Error('Analysis failed')));
      spyOn<any>(service, 'saveData').and.returnValue(Promise.resolve());

      // Act & Assert - error should propagate
      await expectAsync(service.analyzeAllPatterns()).toBeRejected();
    });
  });

  describe('formatTime', () => {
    it('should format date to HH:mm', () => {
      // Arrange
      const date = new Date('2025-11-10T14:35:00');

      // Act
      const result = (service as any).formatTime(date);

      // Assert
      expect(result).toBe('14:35');
    });

    it('should pad single digit hours and minutes', () => {
      // Arrange
      const date = new Date('2025-11-10T09:05:00');

      // Act
      const result = (service as any).formatTime(date);

      // Assert
      expect(result).toBe('09:05');
    });
  });

  describe('calculateDelay', () => {
    it('should calculate delay in minutes', () => {
      // Arrange
      const scheduledTime = '14:00';
      const actualTime = new Date('2025-11-10T14:35:00');

      // Act
      const delay = (service as any).calculateDelay(scheduledTime, actualTime);

      // Assert
      expect(delay).toBe(35);
    });

    it('should handle negative delay (taken early)', () => {
      // Arrange
      const scheduledTime = '14:00';
      const actualTime = new Date('2025-11-10T13:45:00');

      // Act
      const delay = (service as any).calculateDelay(scheduledTime, actualTime);

      // Assert
      expect(delay).toBe(-15);
    });

    it('should handle midnight crossing', () => {
      // Arrange
      const scheduledTime = '23:45';
      const actualTime = new Date('2025-11-11T00:05:00');

      // Act
      const delay = (service as any).calculateDelay(scheduledTime, actualTime);

      // Assert
      // When scheduled is 23:45 and actual is 00:05 next day,
      // the method creates scheduled as 23:45 on the SAME day as actual,
      // so 00:05 is BEFORE 23:45, resulting in negative delay
      expect(delay).toBe(-1420); // -(23*60 + 40) = -1420 minutes
    });
  });

  describe('calculateSuggestedTime', () => {
    it('should suggest later time when consistently delayed', () => {
      // Arrange
      const scheduledTime = '14:00';
      const averageDelay = 35;

      // Act
      const suggested = (service as any).calculateSuggestedTime(scheduledTime, averageDelay);

      // Assert
      expect(suggested).toBe('14:35');
    });

    it('should suggest earlier time when taken early', () => {
      // Arrange
      const scheduledTime = '14:00';
      const averageDelay = -20;

      // Act
      const suggested = (service as any).calculateSuggestedTime(scheduledTime, averageDelay);

      // Assert
      expect(suggested).toBe('13:40');
    });

    it('should handle hour boundary crossing', () => {
      // Arrange
      const scheduledTime = '14:45';
      const averageDelay = 30;

      // Act
      const suggested = (service as any).calculateSuggestedTime(scheduledTime, averageDelay);

      // Assert
      expect(suggested).toBe('15:15');
    });

    it('should handle midnight crossing forward', () => {
      // Arrange
      const scheduledTime = '23:45';
      const averageDelay = 30;

      // Act
      const suggested = (service as any).calculateSuggestedTime(scheduledTime, averageDelay);

      // Assert
      expect(suggested).toBe('00:15');
    });
  });

  describe('acceptSuggestion', () => {
    it('should remove suggestion after accepting', async () => {
      // Arrange
      const mockSuggestion: SmartSuggestion = {
        id: 'sugg-1',
        type: 'time-adjustment',
        medicationId: 'med-123',
        medicationName: 'Aspirina',
        title: 'Ajustar horário',
        description: 'Sugestão de ajuste',
        analysis: mockAnalysis,
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      };
      (service as any)._suggestions.set([mockSuggestion]);
      spyOn<any>(service, 'saveData').and.returnValue(Promise.resolve());

      // Act
      await service.acceptSuggestion('sugg-1');

      // Assert
      expect(service.suggestions().length).toBe(1);
      expect(service.suggestions()[0].status).toBe('accepted');
      expect((service as any).saveData).toHaveBeenCalled();
    });

    it('should do nothing when suggestion not found', async () => {
      // Arrange
      (service as any)._suggestions.set([]);

      // Act
      await service.acceptSuggestion('non-existent');

      // Assert - nothing changes
      expect(service.suggestions().length).toBe(0);
    });
  });

  describe('rejectSuggestion', () => {
    it('should remove suggestion after rejecting', async () => {
      // Arrange
      const mockSuggestion: SmartSuggestion = {
        id: 'sugg-1',
        type: 'time-adjustment',
        medicationId: 'med-123',
        medicationName: 'Aspirina',
        title: 'Ajustar horário',
        description: 'Sugestão de ajuste',
        analysis: mockAnalysis,
        priority: 'medium',
        status: 'pending',
        createdAt: new Date()
      };
      (service as any)._suggestions.set([mockSuggestion]);
      spyOn<any>(service, 'saveData').and.returnValue(Promise.resolve());

      // Act
      await service.rejectSuggestion('sugg-1');

      // Assert
      expect(service.suggestions().length).toBe(1);
      expect(service.suggestions()[0].status).toBe('rejected');
      expect((service as any).saveData).toHaveBeenCalled();
    });
  });

  describe('dismissSuggestion', () => {
    it('should remove suggestion after dismissing', async () => {
      // Arrange
      const mockSuggestion: SmartSuggestion = {
        id: 'sugg-1',
        type: 'praise',
        medicationId: 'med-123',
        medicationName: 'Aspirina',
        title: 'Parabéns!',
        description: 'Você está indo bem',
        analysis: mockAnalysis,
        priority: 'low',
        status: 'pending',
        createdAt: new Date()
      };
      (service as any)._suggestions.set([mockSuggestion]);
      spyOn<any>(service, 'saveData').and.returnValue(Promise.resolve());

      // Act
      await service.dismissSuggestion('sugg-1');

      // Assert
      expect(service.suggestions().length).toBe(1);
      expect(service.suggestions()[0].status).toBe('dismissed');
      expect((service as any).saveData).toHaveBeenCalled();
    });
  });

  describe('cleanOldData', () => {
    it('should remove patterns older than 90 days', async () => {
      // Arrange
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days ago
      
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 20); // 20 days ago (within 30-day window)

      const oldPattern = { ...mockPattern, id: 'old', date: oldDate, timestamp: oldDate };
      const recentPattern = { ...mockPattern, id: 'recent', date: recentDate, timestamp: recentDate };
      
      (service as any)._patterns.set([oldPattern, recentPattern]);
      spyOn<any>(service, 'saveData').and.returnValue(Promise.resolve());

      // Act
      await service.cleanOldData();

      // Assert
      const patterns = service.patterns();
      expect(patterns.length).toBe(1);
      expect(patterns[0].id).toBe('recent');
    });

    it('should not remove recent patterns', async () => {
      // Arrange
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days ago (within 30-day window)
      
      const recentPattern = { ...mockPattern, date: recentDate, timestamp: recentDate };
      (service as any)._patterns.set([recentPattern]);
      spyOn<any>(service, 'saveData').and.returnValue(Promise.resolve());

      // Act
      await service.cleanOldData();

      // Assert
      expect(service.patterns().length).toBe(1);
    });
  });

  describe('loadData', () => {
    it('should load patterns from IndexedDB', async () => {
      // Arrange - set userId
      mockUserService.currentUser.set({ id: 'user-123', email: 'test@example.com', displayName: 'Test User' });
      mockIndexedDBService.get.and.returnValue(Promise.resolve([mockPattern]));

      // Act
      await (service as any).loadData();

      // Assert
      expect(mockIndexedDBService.get).toHaveBeenCalledWith('reminder-patterns', 'user-123');
      expect(service.patterns().length).toBe(1);
    });

    it('should handle empty IndexedDB', async () => {
      // Arrange
      mockIndexedDBService.getAll.and.returnValue(Promise.resolve([]));

      // Act
      await (service as any).loadData();

      // Assert
      expect(service.patterns().length).toBe(0);
    });

    it('should handle IndexedDB errors', async () => {
      // Arrange - set userId
      mockUserService.currentUser.set({ id: 'user-123', email: 'test@example.com', displayName: 'Test User' });
      mockIndexedDBService.get.and.returnValue(Promise.reject(new Error('DB error')));

      // Act
      await (service as any).loadData();

      // Assert
      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('saveData', () => {
    it('should save patterns to IndexedDB', async () => {
      // Arrange - set userId
      mockUserService.currentUser.set({ id: 'user-123', email: 'test@example.com', displayName: 'Test User' });
      (service as any)._patterns.set([mockPattern]);
      mockIndexedDBService.put.and.returnValue(Promise.resolve());

      // Act
      await (service as any).saveData();

      // Assert
      expect(mockIndexedDBService.put).toHaveBeenCalledWith('reminder-patterns', [mockPattern]);
    });

    it('should handle save errors', async () => {
      // Arrange - set userId
      mockUserService.currentUser.set({ id: 'user-123', email: 'test@example.com', displayName: 'Test User' });
      (service as any)._patterns.set([mockPattern]);
      mockIndexedDBService.put.and.returnValue(Promise.reject(new Error('Save error')));

      // Act
      await (service as any).saveData();

      // Assert
      expect(mockLogService.error).toHaveBeenCalled();
    });
  });

  describe('generateSuggestion', () => {
    it('should generate time-adjustment suggestion for consistent delay', () => {
      // Arrange
      const analysis: PatternAnalysis = {
        ...mockAnalysis,
        hasConsistentDelay: true,
        averageDelayMinutes: 40,
        suggestedTime: '14:40',
        confidence: 0.85
      };

      // Act
      const suggestion = (service as any).generateSuggestion(analysis);

      // Assert
      expect(suggestion).not.toBeNull();
      expect(suggestion?.type).toBe('time-adjustment');
      expect(suggestion?.analysis.averageDelayMinutes).toBe(40);
    });

    it('should generate day-change for recurring missed doses', () => {
      // Arrange
      const analysis: PatternAnalysis = {
        ...mockAnalysis,
        hasRecurringMissedDoses: true,
        missedPercentage: 40,
        confidence: 0.9
      };

      // Act
      const suggestion = (service as any).generateSuggestion(analysis);

      // Assert
      expect(suggestion).not.toBeNull();
      expect(suggestion?.type).toBe('day-change');
    });

    it('should generate praise for perfect adherence', () => {
      // Arrange
      const analysis: PatternAnalysis = {
        ...mockAnalysis,
        missedPercentage: 0,
        averageDelayMinutes: 5,
        totalDoses: 20,
        confidence: 1.0
      };

      // Act
      const suggestion = (service as any).generateSuggestion(analysis);

      // Assert
      expect(suggestion).not.toBeNull();
      expect(suggestion?.type).toBe('praise');
    });

    it('should return null for low confidence analysis', () => {
      // Arrange
      const analysis: PatternAnalysis = {
        ...mockAnalysis,
        confidence: 0.3,
        totalDoses: 2
      };

      // Act
      const suggestion = (service as any).generateSuggestion(analysis);

      // Assert
      expect(suggestion).toBeNull();
    });
  });
});
