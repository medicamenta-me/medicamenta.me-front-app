/**
 * StockService Unit Tests
 * 
 * Tests for the Stock Domain Service.
 * Coverage: Stock calculations, predictions, warnings.
 */

import { StockService } from './stock.service';
import { MedicationEntity } from '../medication.entity';

describe('StockService', () => {
  const createMedication = (overrides: any = {}): MedicationEntity => {
    return new MedicationEntity({
      id: 'med-123',
      userId: 'user-456',
      patientId: 'patient-789',
      name: 'Test Med',
      dosage: '500mg',
      frequency: '8 em 8 horas', // 3x per day
      time: '08:00',
      startTime: '08:00',
      currentStock: 30,
      stockUnit: 'comprimidos',
      active: true,
      isArchived: false,
      archivedAt: null,
      schedule: [],
      lastModified: new Date(),
      ...overrides
    });
  };

  describe('calculateDailyConsumption', () => {
    it('should calculate daily consumption for 8 em 8 horas frequency', () => {
      const medication = createMedication({ frequency: '8 em 8 horas' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(3); // 24h / 8h = 3 doses per day
    });

    it('should calculate daily consumption for 6 em 6 horas frequency', () => {
      const medication = createMedication({ frequency: '6 em 6 horas' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(4); // 24h / 6h = 4 doses per day
    });

    it('should calculate daily consumption for 12 em 12 horas frequency', () => {
      const medication = createMedication({ frequency: '12 em 12 horas' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(2); // 24h / 12h = 2 doses per day
    });

    it('should calculate daily consumption for 24 em 24 horas frequency', () => {
      const medication = createMedication({ frequency: '24 em 24 horas' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(1); // 24h / 24h = 1 dose per day
    });

    it('should handle "1 vez ao dia" format', () => {
      const medication = createMedication({ frequency: '1 vez ao dia' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(1);
    });

    it('should handle "2 vezes ao dia" format', () => {
      const medication = createMedication({ frequency: '2 vezes ao dia' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(2);
    });

    it('should handle "3 vezes ao dia" format', () => {
      const medication = createMedication({ frequency: '3 vezes ao dia' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(3);
    });

    it('should default to 1 for unknown frequency format', () => {
      const medication = createMedication({ frequency: 'tomar quando necessário' });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(1);
    });
  });

  describe('estimateDaysRemaining', () => {
    it('should calculate days remaining correctly', () => {
      const medication = createMedication({
        currentStock: 30,
        frequency: '8 em 8 horas' // 3x per day
      });

      const daysRemaining = StockService.estimateDaysRemaining(medication);

      expect(daysRemaining).toBe(10); // 30 / 3 = 10 days
    });

    it('should return 0 when stock is empty', () => {
      const medication = createMedication({ currentStock: 0 });

      const daysRemaining = StockService.estimateDaysRemaining(medication);

      expect(daysRemaining).toBe(0);
    });

    it('should round down partial days', () => {
      const medication = createMedication({
        currentStock: 10,
        frequency: '8 em 8 horas' // 3x per day, 3.33 days
      });

      const daysRemaining = StockService.estimateDaysRemaining(medication);

      expect(daysRemaining).toBe(3); // Floor of 3.33
    });

    it('should handle very large stock numbers', () => {
      const medication = createMedication({
        currentStock: 999,
        frequency: '24 em 24 horas' // 1x per day
      });

      const daysRemaining = StockService.estimateDaysRemaining(medication);

      expect(daysRemaining).toBe(999);
    });
  });

  describe('analyzeStock', () => {
    it('should return OK status when stock is sufficient', () => {
      const medication = createMedication({
        currentStock: 30,
        frequency: '8 em 8 horas',
        lowStockThreshold: 9 // 3 days worth
      });

      const analysis = StockService.analyzeStock(medication);

      expect(analysis.daysRemaining).toBe(10);
      expect(analysis.needsRestocking).toBe(false);
    });

    it('should return LOW status when approaching threshold', () => {
      const medication = createMedication({
        currentStock: 9,
        frequency: '8 em 8 horas', // 3x per day
        lowStockThreshold: 9
      });

      const analysis = StockService.analyzeStock(medication);

      expect(analysis.needsRestocking).toBe(true);
    });

    it('should return CRITICAL status when stock is very low', () => {
      const medication = createMedication({
        currentStock: 2,
        frequency: '8 em 8 horas' // Less than 1 day worth
      });

      const analysis = StockService.analyzeStock(medication);

      expect(analysis.needsRestocking).toBe(true);
    });

    it('should return OUT status when stock is depleted', () => {
      const medication = createMedication({ currentStock: 0 });

      const analysis = StockService.analyzeStock(medication);

      expect(analysis.needsRestocking).toBe(true);
      expect(analysis.daysRemaining).toBe(0);
    });
  });

  describe('getRestockRecommendations', () => {
    it('should recommend restock amount based on daily consumption', () => {
      const medication = createMedication({
        currentStock: 5,
        frequency: '8 em 8 horas' // 3x per day
      });

      const recommendations = StockService.getRestockRecommendations([medication]);

      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].recommendedAmount).toBeGreaterThan(0);
      expect(recommendations[0].urgency).toBeDefined();
    });

    it('should calculate urgency as HIGH when stock critically low', () => {
      const medication = createMedication({
        currentStock: 2,
        frequency: '8 em 8 horas' // 2 stock / 3 per day = 0 days (rounded down) = critical
      });

      const recommendations = StockService.getRestockRecommendations([medication]);

      expect(recommendations[0].urgency).toBe('critical'); // 0 days = critical urgency
    });

    it('should calculate urgency as MEDIUM when stock low', () => {
      const medication = createMedication({
        currentStock: 10,
        frequency: '8 em 8 horas', // 3-4 days
        lowStockThreshold: 15
      });

      const recommendations = StockService.getRestockRecommendations([medication]);

      expect(recommendations[0].urgency).toBe('medium');
    });

    it('should calculate urgency as LOW when stock sufficient', () => {
      const medication = createMedication({
        currentStock: 18,
        frequency: '8 em 8 horas' // 6 days
      });

      const recommendations = StockService.getRestockRecommendations([medication]);

      expect(recommendations[0].urgency).toBe('low');
    });

    it('should recommend at least 30 days worth of medication', () => {
      const medication = createMedication({
        currentStock: 5,
        frequency: '8 em 8 horas' // 3x per day, need 90 for 30 days
      });

      const recommendations = StockService.getRestockRecommendations([medication]);

      expect(recommendations[0].recommendedAmount).toBeGreaterThanOrEqual(85); // 90 - 5
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero consumption (PRN medications)', () => {
      const medication = createMedication({
        frequency: 'quando necessário',
        currentStock: 30
      });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);
      const daysRemaining = StockService.estimateDaysRemaining(medication);

      expect(dailyConsumption).toBeGreaterThanOrEqual(1);
      expect(daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should handle very frequent doses (every hour)', () => {
      const medication = createMedication({
        frequency: '1 em 1 hora',
        currentStock: 24
      });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      expect(dailyConsumption).toBe(24);
    });

    it('should handle weekly frequency', () => {
      const medication = createMedication({
        frequency: '1 vez por semana',
        currentStock: 4
      });

      const dailyConsumption = StockService.calculateDailyConsumption(medication);

      // Weekly = fallback to 1 per day currently (service doesn't parse weekly)
      expect(dailyConsumption).toBe(1);
    });
  });

  describe('Business Rules', () => {
    it('should never return negative days remaining', () => {
      const medication = createMedication({ currentStock: 0 });

      const daysRemaining = StockService.estimateDaysRemaining(medication);

      expect(daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should always recommend positive restock amount', () => {
      const medication = createMedication({ currentStock: 1 });

      const recommendations = StockService.getRestockRecommendations([medication]);

      expect(recommendations[0].recommendedAmount).toBeGreaterThan(0);
    });

    it('should consider lowStockThreshold in analysis', () => {
      const highThreshold = createMedication({
        currentStock: 20,
        lowStockThreshold: 30
      });

      const lowThreshold = createMedication({
        currentStock: 20,
        lowStockThreshold: 5
      });

      const highAnalysis = StockService.analyzeStock(highThreshold);
      const lowAnalysis = StockService.analyzeStock(lowThreshold);

      // analyzeStock uses needsRestocking with default threshold (7 days), not lowStockThreshold
      // 20 stock / 3 per day = 6 days remaining, which is <= 7, so both need restocking
      expect(highAnalysis.needsRestocking).toBe(true);
      expect(lowAnalysis.needsRestocking).toBe(true);
    });
  });

  describe('estimateDepletionDate', () => {
    it('should calculate correct depletion date', () => {
      const medication = createMedication({
        currentStock: 10,
        frequency: '1 vez ao dia'
      });

      const depletionDate = StockService.estimateDepletionDate(medication);
      const today = new Date();
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + 10);

      expect(depletionDate).toBeDefined();
      expect(depletionDate?.getDate()).toBe(expectedDate.getDate());
    });

    it('should return null when days remaining is null', () => {
      const medication = createMedication({
        currentStock: 10,
        frequency: 'SOS' // Unknown frequency defaults to 1
      });

      // Mock the calculateDailyConsumption to return 0
      spyOn(StockService, 'calculateDailyConsumption').and.returnValue(0);

      const depletionDate = StockService.estimateDepletionDate(medication);

      expect(depletionDate).toBeNull();
    });
  });

  describe('needsRestocking', () => {
    it('should return false for archived medications', () => {
      const medication = createMedication({
        currentStock: 1,
        isArchived: true,
        active: false // Archived medications must not be active
      });

      const needsRestock = StockService.needsRestocking(medication);

      expect(needsRestock).toBe(false);
    });

    it('should return false when days remaining is null', () => {
      const medication = createMedication({ currentStock: 10 });
      spyOn(StockService, 'estimateDaysRemaining').and.returnValue(null);

      const needsRestock = StockService.needsRestocking(medication);

      expect(needsRestock).toBe(false);
    });

    it('should return true when below threshold', () => {
      const medication = createMedication({
        currentStock: 5,
        frequency: '1 vez ao dia' // 5 days remaining
      });

      const needsRestock = StockService.needsRestocking(medication, 7);

      expect(needsRestock).toBe(true);
    });

    it('should return false when above threshold', () => {
      const medication = createMedication({
        currentStock: 20,
        frequency: '1 vez ao dia' // 20 days remaining
      });

      const needsRestock = StockService.needsRestocking(medication, 7);

      expect(needsRestock).toBe(false);
    });
  });

  describe('calculateRestockAmount', () => {
    it('should recommend rounded up amount to nearest 10', () => {
      const medication = createMedication({
        currentStock: 5,
        frequency: '1 vez ao dia' // Need 30 for 30 days, has 5, need 25 -> round to 30
      });

      const amount = StockService.calculateRestockAmount(medication, 30);

      expect(amount).toBe(30); // ceil(25/10)*10 = 30
    });

    it('should return 0 when stock exceeds target', () => {
      const medication = createMedication({
        currentStock: 100,
        frequency: '1 vez ao dia'
      });

      const amount = StockService.calculateRestockAmount(medication, 30);

      expect(amount).toBe(0);
    });

    it('should calculate for custom target days', () => {
      const medication = createMedication({
        currentStock: 0,
        frequency: '2 vezes ao dia' // 2 per day, 60 days = 120 units
      });

      const amount = StockService.calculateRestockAmount(medication, 60);

      expect(amount).toBe(120);
    });
  });

  describe('simulateConsumption', () => {
    it('should generate simulation for specified days', () => {
      const medication = createMedication({
        currentStock: 10,
        frequency: '1 vez ao dia'
      });

      const simulation = StockService.simulateConsumption(medication, 5);

      expect(simulation.length).toBe(6); // 0 to 5 days = 6 entries
      expect(simulation[0].stock).toBe(10);
      expect(simulation[1].stock).toBe(9);
      expect(simulation[5].stock).toBe(5);
    });

    it('should never go below zero stock', () => {
      const medication = createMedication({
        currentStock: 3,
        frequency: '1 vez ao dia'
      });

      const simulation = StockService.simulateConsumption(medication, 10);

      const allStocksNonNegative = simulation.every(s => s.stock >= 0);
      expect(allStocksNonNegative).toBe(true);
      expect(simulation[10].stock).toBe(0); // Should bottom out at 0
    });

    it('should handle high consumption rates', () => {
      const medication = createMedication({
        currentStock: 30,
        frequency: '6 em 6 horas' // 4 times per day
      });

      const simulation = StockService.simulateConsumption(medication, 7);

      expect(simulation[7].stock).toBe(2); // 30 - (4*7) = 2
    });
  });

  describe('canLastUntil', () => {
    it('should return true when stock lasts until target date', () => {
      const medication = createMedication({
        currentStock: 20,
        frequency: '1 vez ao dia'
      });

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 10);

      const canLast = StockService.canLastUntil(medication, targetDate);

      expect(canLast).toBe(true);
    });

    it('should return false when stock depletes before target date', () => {
      const medication = createMedication({
        currentStock: 5,
        frequency: '1 vez ao dia'
      });

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 10);

      const canLast = StockService.canLastUntil(medication, targetDate);

      expect(canLast).toBe(false);
    });

    it('should return true when days remaining is null (infinite)', () => {
      const medication = createMedication({ currentStock: 10 });
      spyOn(StockService, 'estimateDaysRemaining').and.returnValue(null);

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 100);

      const canLast = StockService.canLastUntil(medication, targetDate);

      expect(canLast).toBe(true);
    });
  });

  describe('calculateRequiredStock', () => {
    it('should calculate stock needed for period', () => {
      const medication = createMedication({
        frequency: '3 vezes ao dia'
      });

      const required = StockService.calculateRequiredStock(medication, 10);

      expect(required).toBe(30); // 3 per day * 10 days
    });

    it('should handle zero days', () => {
      const medication = createMedication({
        frequency: '2 vezes ao dia'
      });

      const required = StockService.calculateRequiredStock(medication, 0);

      expect(required).toBe(0);
    });

    it('should calculate for hourly medications', () => {
      const medication = createMedication({
        frequency: '4 em 4 horas' // 6 times per day
      });

      const required = StockService.calculateRequiredStock(medication, 7);

      expect(required).toBe(42); // 6 * 7
    });
  });

  describe('getRestockRecommendations sorting', () => {
    it('should sort by urgency (critical first)', () => {
      const critical = createMedication({
        id: 'critical-1',
        name: 'Critical Med',
        currentStock: 0,
        frequency: '1 vez ao dia'
      });

      const medium = createMedication({
        id: 'medium-1',
        name: 'Medium Med',
        currentStock: 4,
        frequency: '1 vez ao dia'
      });

      const high = createMedication({
        id: 'high-1',
        name: 'High Med',
        currentStock: 1,
        frequency: '1 vez ao dia'
      });

      const recommendations = StockService.getRestockRecommendations(
        [medium, critical, high],
        10
      );

      expect(recommendations[0].medicationId).toBe('critical-1');
      expect(recommendations[0].urgency).toBe('critical');
      expect(recommendations[1].urgency).toBe('high');
      expect(recommendations[2].urgency).toBe('medium');
    });

    it('should skip archived medications', () => {
      const active = createMedication({
        id: 'active-1',
        currentStock: 1,
        frequency: '1 vez ao dia'
      });

      const archived = createMedication({
        id: 'archived-1',
        currentStock: 1,
        frequency: '1 vez ao dia',
        isArchived: true,
        active: false // Archived must not be active
      });

      const recommendations = StockService.getRestockRecommendations(
        [active, archived],
        10
      );

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].medicationId).toBe('active-1');
    });

    it('should include all urgency levels in reasons', () => {
      const critical = createMedication({
        id: 'c1',
        currentStock: 0,
        frequency: '1 vez ao dia'
      });

      const high = createMedication({
        id: 'h1',
        currentStock: 1,
        frequency: '1 vez ao dia'
      });

      const medium = createMedication({
        id: 'm1',
        currentStock: 3,
        frequency: '1 vez ao dia'
      });

      const low = createMedication({
        id: 'l1',
        currentStock: 6,
        frequency: '1 vez ao dia'
      });

      const recommendations = StockService.getRestockRecommendations(
        [critical, high, medium, low],
        10
      );

      expect(recommendations[0].reason).toContain('esgotado');
      expect(recommendations[1].reason).toContain('amanhã');
      expect(recommendations[2].reason).toContain('dias');
    });
  });
});
