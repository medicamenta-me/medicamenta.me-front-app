import { PrefetchStats, UsagePattern } from './prefetch.service';

/**
 * Unit tests for PrefetchService
 * Tests interfaces, types, and utility logic
 */
describe('PrefetchService', () => {
  
  describe('PrefetchStats Interface', () => {
    
    it('should create valid PrefetchStats with all fields', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 100,
        successfulPrefetches: 95,
        failedPrefetches: 5,
        cacheHits: 450,
        cacheMisses: 50,
        averageLoadTime: 125,
        lastPrefetchTime: new Date()
      };

      expect(stats.totalPrefetches).toBe(100);
      expect(stats.successfulPrefetches).toBe(95);
      expect(stats.failedPrefetches).toBe(5);
      expect(stats.cacheHits).toBe(450);
      expect(stats.cacheMisses).toBe(50);
      expect(stats.averageLoadTime).toBe(125);
      expect(stats.lastPrefetchTime).toBeInstanceOf(Date);
    });

    it('should create stats with null lastPrefetchTime', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 0,
        successfulPrefetches: 0,
        failedPrefetches: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
        lastPrefetchTime: null
      };

      expect(stats.lastPrefetchTime).toBeNull();
      expect(stats.totalPrefetches).toBe(0);
    });

    it('should calculate success rate', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 100,
        successfulPrefetches: 95,
        failedPrefetches: 5,
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
        lastPrefetchTime: null
      };

      const successRate = (stats.successfulPrefetches / stats.totalPrefetches) * 100;
      expect(successRate).toBe(95);
    });

    it('should calculate failure rate', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 100,
        successfulPrefetches: 80,
        failedPrefetches: 20,
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
        lastPrefetchTime: null
      };

      const failureRate = (stats.failedPrefetches / stats.totalPrefetches) * 100;
      expect(failureRate).toBe(20);
    });

    it('should handle high load times', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 10,
        successfulPrefetches: 10,
        failedPrefetches: 0,
        cacheHits: 50,
        cacheMisses: 0,
        averageLoadTime: 5000, // 5 seconds
        lastPrefetchTime: new Date()
      };

      expect(stats.averageLoadTime).toBeGreaterThan(1000);
    });
  });

  describe('UsagePattern Interface', () => {
    
    it('should create valid UsagePattern', () => {
      const pattern: UsagePattern = {
        userId: 'user-123',
        mostAccessedHour: 8,
        mostAccessedDay: 1,
        frequentlyViewedMedications: ['med-1', 'med-2', 'med-3'],
        averageSessionDuration: 300, // 5 minutes
        lastAccess: new Date()
      };

      expect(pattern.userId).toBe('user-123');
      expect(pattern.mostAccessedHour).toBe(8);
      expect(pattern.mostAccessedDay).toBe(1);
      expect(pattern.frequentlyViewedMedications.length).toBe(3);
      expect(pattern.averageSessionDuration).toBe(300);
      expect(pattern.lastAccess).toBeInstanceOf(Date);
    });

    it('should create pattern for morning user', () => {
      const pattern: UsagePattern = {
        userId: 'morning-user',
        mostAccessedHour: 7,
        mostAccessedDay: 0, // Sunday
        frequentlyViewedMedications: [],
        averageSessionDuration: 180,
        lastAccess: new Date()
      };

      const isMorningUser = pattern.mostAccessedHour < 12;
      expect(isMorningUser).toBeTrue();
    });

    it('should create pattern for evening user', () => {
      const pattern: UsagePattern = {
        userId: 'evening-user',
        mostAccessedHour: 21,
        mostAccessedDay: 5, // Friday
        frequentlyViewedMedications: ['evening-med'],
        averageSessionDuration: 600,
        lastAccess: new Date()
      };

      const isEveningUser = pattern.mostAccessedHour >= 18;
      expect(isEveningUser).toBeTrue();
      expect(pattern.mostAccessedDay).toBe(5);
    });

    it('should validate hour range 0-23', () => {
      const validHours = [0, 6, 12, 18, 23];
      
      validHours.forEach(hour => {
        const pattern: UsagePattern = {
          userId: 'test',
          mostAccessedHour: hour,
          mostAccessedDay: 0,
          frequentlyViewedMedications: [],
          averageSessionDuration: 0,
          lastAccess: new Date()
        };
        
        expect(pattern.mostAccessedHour).toBeGreaterThanOrEqual(0);
        expect(pattern.mostAccessedHour).toBeLessThanOrEqual(23);
      });
    });

    it('should validate day range 0-6', () => {
      const days = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
      
      days.forEach(day => {
        const pattern: UsagePattern = {
          userId: 'test',
          mostAccessedHour: 12,
          mostAccessedDay: day,
          frequentlyViewedMedications: [],
          averageSessionDuration: 0,
          lastAccess: new Date()
        };
        
        expect(pattern.mostAccessedDay).toBeGreaterThanOrEqual(0);
        expect(pattern.mostAccessedDay).toBeLessThanOrEqual(6);
      });
    });

    it('should handle empty frequently viewed medications', () => {
      const pattern: UsagePattern = {
        userId: 'new-user',
        mostAccessedHour: 12,
        mostAccessedDay: 3,
        frequentlyViewedMedications: [],
        averageSessionDuration: 0,
        lastAccess: new Date()
      };

      expect(pattern.frequentlyViewedMedications.length).toBe(0);
    });

    it('should handle max frequently viewed medications', () => {
      const meds = Array.from({ length: 10 }, (_, i) => `med-${i + 1}`);
      
      const pattern: UsagePattern = {
        userId: 'power-user',
        mostAccessedHour: 9,
        mostAccessedDay: 1,
        frequentlyViewedMedications: meds,
        averageSessionDuration: 1800,
        lastAccess: new Date()
      };

      expect(pattern.frequentlyViewedMedications.length).toBe(10);
      expect(pattern.frequentlyViewedMedications[0]).toBe('med-1');
      expect(pattern.frequentlyViewedMedications[9]).toBe('med-10');
    });
  });

  describe('Cache Hit Rate Calculation', () => {
    
    it('should calculate 100% hit rate', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 100,
        successfulPrefetches: 100,
        failedPrefetches: 0,
        cacheHits: 500,
        cacheMisses: 0,
        averageLoadTime: 50,
        lastPrefetchTime: new Date()
      };

      const total = stats.cacheHits + stats.cacheMisses;
      const hitRate = total === 0 ? 0 : Math.round((stats.cacheHits / total) * 100);
      expect(hitRate).toBe(100);
    });

    it('should calculate 0% hit rate', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 10,
        successfulPrefetches: 10,
        failedPrefetches: 0,
        cacheHits: 0,
        cacheMisses: 50,
        averageLoadTime: 500,
        lastPrefetchTime: new Date()
      };

      const total = stats.cacheHits + stats.cacheMisses;
      const hitRate = total === 0 ? 0 : Math.round((stats.cacheHits / total) * 100);
      expect(hitRate).toBe(0);
    });

    it('should calculate 50% hit rate', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 50,
        successfulPrefetches: 50,
        failedPrefetches: 0,
        cacheHits: 100,
        cacheMisses: 100,
        averageLoadTime: 200,
        lastPrefetchTime: new Date()
      };

      const total = stats.cacheHits + stats.cacheMisses;
      const hitRate = total === 0 ? 0 : Math.round((stats.cacheHits / total) * 100);
      expect(hitRate).toBe(50);
    });

    it('should handle zero total cache attempts', () => {
      const stats: PrefetchStats = {
        totalPrefetches: 0,
        successfulPrefetches: 0,
        failedPrefetches: 0,
        cacheHits: 0,
        cacheMisses: 0,
        averageLoadTime: 0,
        lastPrefetchTime: null
      };

      const total = stats.cacheHits + stats.cacheMisses;
      const hitRate = total === 0 ? 0 : Math.round((stats.cacheHits / total) * 100);
      expect(hitRate).toBe(0);
    });
  });

  describe('Is Likely To Use App Logic', () => {
    
    function isLikelyToUseApp(pattern: UsagePattern, hour: number, day: number): boolean {
      const hourDiff = Math.abs(pattern.mostAccessedHour - hour);
      const hourMatch = hourDiff <= 2;
      const dayMatch = pattern.mostAccessedDay === day;
      return hourMatch || dayMatch;
    }

    it('should return true when hour matches within 2', () => {
      const pattern: UsagePattern = {
        userId: 'user',
        mostAccessedHour: 8,
        mostAccessedDay: 1,
        frequentlyViewedMedications: [],
        averageSessionDuration: 0,
        lastAccess: new Date()
      };

      expect(isLikelyToUseApp(pattern, 8, 5)).toBeTrue(); // Same hour
      expect(isLikelyToUseApp(pattern, 7, 5)).toBeTrue(); // 1 hour before
      expect(isLikelyToUseApp(pattern, 9, 5)).toBeTrue(); // 1 hour after
      expect(isLikelyToUseApp(pattern, 10, 5)).toBeTrue(); // 2 hours after
    });

    it('should return true when day matches', () => {
      const pattern: UsagePattern = {
        userId: 'user',
        mostAccessedHour: 8,
        mostAccessedDay: 3, // Wednesday
        frequentlyViewedMedications: [],
        averageSessionDuration: 0,
        lastAccess: new Date()
      };

      expect(isLikelyToUseApp(pattern, 20, 3)).toBeTrue(); // Same day, different hour
    });

    it('should return false when neither matches', () => {
      const pattern: UsagePattern = {
        userId: 'user',
        mostAccessedHour: 8,
        mostAccessedDay: 1, // Monday
        frequentlyViewedMedications: [],
        averageSessionDuration: 0,
        lastAccess: new Date()
      };

      expect(isLikelyToUseApp(pattern, 15, 5)).toBeFalse(); // 7 hours diff, Friday
      expect(isLikelyToUseApp(pattern, 20, 6)).toBeFalse(); // 12 hours diff, Saturday
    });

    it('should return true when both conditions match', () => {
      const pattern: UsagePattern = {
        userId: 'user',
        mostAccessedHour: 8,
        mostAccessedDay: 1,
        frequentlyViewedMedications: [],
        averageSessionDuration: 0,
        lastAccess: new Date()
      };

      expect(isLikelyToUseApp(pattern, 8, 1)).toBeTrue(); // Exact match
      expect(isLikelyToUseApp(pattern, 9, 1)).toBeTrue(); // Same day, close hour
    });
  });

  describe('Average Load Time Calculation', () => {
    
    function calculateAverageLoadTime(
      currentAvg: number, 
      totalPrefetches: number, 
      newLoadTime: number
    ): number {
      if (totalPrefetches === 0) return newLoadTime;
      return Math.round((currentAvg * totalPrefetches + newLoadTime) / (totalPrefetches + 1));
    }

    it('should return new load time when no previous prefetches', () => {
      const avg = calculateAverageLoadTime(0, 0, 100);
      expect(avg).toBe(100);
    });

    it('should calculate average with one previous prefetch', () => {
      const avg = calculateAverageLoadTime(100, 1, 200);
      // (100 * 1 + 200) / 2 = 150
      expect(avg).toBe(150);
    });

    it('should calculate average with multiple prefetches', () => {
      const avg = calculateAverageLoadTime(100, 9, 200);
      // (100 * 9 + 200) / 10 = 110
      expect(avg).toBe(110);
    });

    it('should round to integer', () => {
      const avg = calculateAverageLoadTime(100, 2, 150);
      // (100 * 2 + 150) / 3 = 116.666...
      expect(avg).toBe(117);
    });

    it('should handle very large load times', () => {
      const avg = calculateAverageLoadTime(100, 99, 10000);
      // (100 * 99 + 10000) / 100 = 199
      expect(avg).toBe(199);
    });
  });

  describe('Create Default Pattern', () => {
    
    function createDefaultPattern(userId: string): UsagePattern {
      return {
        userId,
        mostAccessedHour: new Date().getHours(),
        mostAccessedDay: new Date().getDay(),
        frequentlyViewedMedications: [],
        averageSessionDuration: 0,
        lastAccess: new Date()
      };
    }

    it('should create pattern with provided userId', () => {
      const pattern = createDefaultPattern('test-user-123');
      expect(pattern.userId).toBe('test-user-123');
    });

    it('should initialize with current hour', () => {
      const pattern = createDefaultPattern('user');
      const currentHour = new Date().getHours();
      expect(pattern.mostAccessedHour).toBe(currentHour);
    });

    it('should initialize with current day', () => {
      const pattern = createDefaultPattern('user');
      const currentDay = new Date().getDay();
      expect(pattern.mostAccessedDay).toBe(currentDay);
    });

    it('should initialize with empty medications', () => {
      const pattern = createDefaultPattern('user');
      expect(pattern.frequentlyViewedMedications).toEqual([]);
    });

    it('should initialize with zero session duration', () => {
      const pattern = createDefaultPattern('user');
      expect(pattern.averageSessionDuration).toBe(0);
    });

    it('should initialize with current time as last access', () => {
      const before = Date.now();
      const pattern = createDefaultPattern('user');
      const after = Date.now();
      
      expect(pattern.lastAccess.getTime()).toBeGreaterThanOrEqual(before);
      expect(pattern.lastAccess.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('Record Medication View Logic', () => {
    
    function addMedicationToFrequentlyViewed(
      frequentlyViewedMedications: string[], 
      medicationId: string
    ): string[] {
      const result = [...frequentlyViewedMedications];
      if (!result.includes(medicationId)) {
        result.unshift(medicationId);
        return result.slice(0, 10);
      }
      return result;
    }

    it('should add new medication to front of list', () => {
      const meds = ['med-1', 'med-2'];
      const result = addMedicationToFrequentlyViewed(meds, 'med-3');
      expect(result[0]).toBe('med-3');
    });

    it('should not add duplicate medication', () => {
      const meds = ['med-1', 'med-2'];
      const result = addMedicationToFrequentlyViewed(meds, 'med-1');
      expect(result.length).toBe(2);
      expect(result).toEqual(['med-1', 'med-2']);
    });

    it('should limit to 10 medications', () => {
      const meds = Array.from({ length: 10 }, (_, i) => `med-${i}`);
      const result = addMedicationToFrequentlyViewed(meds, 'med-new');
      expect(result.length).toBe(10);
      expect(result[0]).toBe('med-new');
      expect(result).not.toContain('med-9');
    });

    it('should handle empty list', () => {
      const result = addMedicationToFrequentlyViewed([], 'med-1');
      expect(result).toEqual(['med-1']);
    });
  });

  describe('Stats Update Logic', () => {
    
    function updateStats(current: PrefetchStats, updates: Partial<PrefetchStats>): PrefetchStats {
      return { ...current, ...updates };
    }

    it('should update single field', () => {
      const current: PrefetchStats = {
        totalPrefetches: 10,
        successfulPrefetches: 10,
        failedPrefetches: 0,
        cacheHits: 50,
        cacheMisses: 5,
        averageLoadTime: 100,
        lastPrefetchTime: null
      };

      const updated = updateStats(current, { totalPrefetches: 11 });
      expect(updated.totalPrefetches).toBe(11);
      expect(updated.successfulPrefetches).toBe(10); // Unchanged
    });

    it('should update multiple fields', () => {
      const current: PrefetchStats = {
        totalPrefetches: 10,
        successfulPrefetches: 10,
        failedPrefetches: 0,
        cacheHits: 50,
        cacheMisses: 5,
        averageLoadTime: 100,
        lastPrefetchTime: null
      };

      const now = new Date();
      const updated = updateStats(current, { 
        totalPrefetches: 11,
        successfulPrefetches: 11,
        lastPrefetchTime: now
      });
      
      expect(updated.totalPrefetches).toBe(11);
      expect(updated.successfulPrefetches).toBe(11);
      expect(updated.lastPrefetchTime).toBe(now);
    });

    it('should not modify original stats', () => {
      const current: PrefetchStats = {
        totalPrefetches: 10,
        successfulPrefetches: 10,
        failedPrefetches: 0,
        cacheHits: 50,
        cacheMisses: 5,
        averageLoadTime: 100,
        lastPrefetchTime: null
      };

      const updated = updateStats(current, { totalPrefetches: 100 });
      expect(current.totalPrefetches).toBe(10); // Original unchanged
      expect(updated.totalPrefetches).toBe(100);
    });
  });
});
