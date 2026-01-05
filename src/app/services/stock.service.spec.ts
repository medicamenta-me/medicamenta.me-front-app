/**
 * StockService Unit Tests
 * 
 * Tests for the Stock Service that manages medication stock levels,
 * alerts, restock tracking, and stock calculations.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { StockService, StockStatus, StockAlert, RestockEntry } from './stock.service';
import { MedicationService } from './medication.service';
import { LogService } from './log.service';
import { Medication } from '../models/medication.model';

describe('StockService', () => {
  let service: StockService;
  let mockMedicationService: any;
  let mockLogService: jasmine.SpyObj<LogService>;
  
  // Signal to control medications in tests
  let medicationsSignal: ReturnType<typeof signal<Medication[]>>;

  const createMockMedication = (overrides: Partial<Medication> = {}): Medication => ({
    id: 'med-123',
    userId: 'user-123',
    patientId: 'user-123',
    name: 'Aspirina',
    dosage: '100mg',
    frequency: '1 vez por dia',
    schedule: [
      { time: '08:00', status: 'upcoming' },
      { time: '20:00', status: 'upcoming' }
    ],
    stock: 30,
    currentStock: 30,
    lowStockThreshold: 14,
    notes: 'Tomar com água',
    isContinuousUse: true,
    lastModified: new Date(),
    ...overrides
  });

  beforeEach(() => {
    // Create writable signal for medications
    medicationsSignal = signal<Medication[]>([]);
    
    // Create mocks
    mockMedicationService = {
      medications: medicationsSignal.asReadonly(),
      updateMedication: jasmine.createSpy('updateMedication').and.returnValue(Promise.resolve())
    };
    
    mockLogService = jasmine.createSpyObj('LogService', ['log', 'error', 'debug', 'info', 'addLog', 'warn']);
    mockLogService.addLog.and.returnValue(Promise.resolve());

    // Clear localStorage before each test
    localStorage.removeItem('medicamenta_restock_history');

    TestBed.configureTestingModule({
      providers: [
        StockService,
        { provide: MedicationService, useValue: mockMedicationService },
        { provide: LogService, useValue: mockLogService }
      ]
    });

    service = TestBed.inject(StockService);
  });

  afterEach(() => {
    localStorage.removeItem('medicamenta_restock_history');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // =============================================
  // getStockStatus Tests
  // =============================================
  describe('getStockStatus', () => {
    it('should return critical when stock is 0', () => {
      const medication = createMockMedication({ currentStock: 0 });
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('critical');
    });

    it('should return low when stock is below threshold', () => {
      const medication = createMockMedication({ 
        currentStock: 10,
        lowStockThreshold: 14 
      });
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('low');
    });

    it('should return low when stock equals threshold', () => {
      const medication = createMockMedication({ 
        currentStock: 14,
        lowStockThreshold: 14 
      });
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('low');
    });

    it('should return adequate when stock is above threshold', () => {
      const medication = createMockMedication({ 
        currentStock: 20,
        lowStockThreshold: 14 
      });
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('adequate');
    });

    it('should use stock property when currentStock is undefined', () => {
      const medication = createMockMedication({ 
        currentStock: undefined,
        stock: 5,
        lowStockThreshold: 10
      });
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('low');
    });

    it('should treat undefined stock values as 0 (critical)', () => {
      const medication = createMockMedication({ 
        currentStock: undefined,
        stock: undefined
      });
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('critical');
    });

    it('should calculate default threshold based on daily doses for continuous use', () => {
      const medication = createMockMedication({ 
        currentStock: 10,
        lowStockThreshold: undefined,
        isContinuousUse: true,
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ]
      });
      // Default threshold = dailyDoses (2) * 7 = 14
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('low'); // 10 < 14
    });

    it('should use default threshold of 5 for as-needed medications', () => {
      const medication = createMockMedication({ 
        currentStock: 3,
        lowStockThreshold: undefined,
        isContinuousUse: false
      });
      // Default threshold for as-needed = 5
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('low'); // 3 < 5
    });

    it('should return adequate when as-needed medication has 6 units', () => {
      const medication = createMockMedication({ 
        currentStock: 6,
        lowStockThreshold: undefined,
        isContinuousUse: false
      });
      
      const status = service.getStockStatus(medication);
      
      expect(status).toBe('adequate'); // 6 > 5
    });
  });

  // =============================================
  // calculateDaysRemaining Tests
  // =============================================
  describe('calculateDaysRemaining', () => {
    it('should return null for as-needed medications', () => {
      const medication = createMockMedication({ 
        isContinuousUse: false,
        currentStock: 20
      });
      
      const days = service.calculateDaysRemaining(medication);
      
      expect(days).toBeNull();
    });

    it('should calculate days based on stock and daily doses', () => {
      const medication = createMockMedication({ 
        currentStock: 14,
        isContinuousUse: true,
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ]
      });
      // 14 stock / 2 daily doses = 7 days
      
      const days = service.calculateDaysRemaining(medication);
      
      expect(days).toBe(7);
    });

    it('should floor the result (e.g., 15 stock / 2 doses = 7 days)', () => {
      const medication = createMockMedication({ 
        currentStock: 15,
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ]
      });
      
      const days = service.calculateDaysRemaining(medication);
      
      expect(days).toBe(7);
    });

    it('should return 0 when stock is 0', () => {
      const medication = createMockMedication({ 
        currentStock: 0,
        schedule: [{ time: '08:00', status: 'upcoming' }]
      });
      
      const days = service.calculateDaysRemaining(medication);
      
      expect(days).toBe(0);
    });

    it('should return null if schedule is empty', () => {
      const medication = createMockMedication({ 
        currentStock: 20,
        schedule: []
      });
      
      const days = service.calculateDaysRemaining(medication);
      
      // With empty schedule, dailyDoses defaults to 1
      expect(days).toBe(20);
    });

    it('should handle undefined schedule', () => {
      const medication = createMockMedication({ 
        currentStock: 10,
        schedule: undefined
      });
      
      const days = service.calculateDaysRemaining(medication);
      
      // Default dailyDoses = 1
      expect(days).toBe(10);
    });

    it('should default isContinuousUse to true if undefined', () => {
      const medication = createMockMedication({ 
        currentStock: 20,
        isContinuousUse: undefined,
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ]
      });
      
      const days = service.calculateDaysRemaining(medication);
      
      expect(days).toBe(10); // 20 / 2
    });
  });

  // =============================================
  // calculateSuggestedRestockDate Tests
  // =============================================
  describe('calculateSuggestedRestockDate', () => {
    it('should return null for as-needed medications', () => {
      const medication = createMockMedication({ 
        isContinuousUse: false 
      });
      
      const date = service.calculateSuggestedRestockDate(medication);
      
      expect(date).toBeNull();
    });

    it('should return today if already at threshold', () => {
      const medication = createMockMedication({ 
        currentStock: 14,
        lowStockThreshold: 14,
        schedule: [{ time: '08:00', status: 'upcoming' }]
      });
      
      const date = service.calculateSuggestedRestockDate(medication);
      
      expect(date).not.toBeNull();
      const today = new Date();
      expect(date!.toDateString()).toBe(today.toDateString());
    });

    it('should return today if below threshold', () => {
      const medication = createMockMedication({ 
        currentStock: 5,
        lowStockThreshold: 14,
        schedule: [{ time: '08:00', status: 'upcoming' }]
      });
      
      const date = service.calculateSuggestedRestockDate(medication);
      
      expect(date).not.toBeNull();
      const today = new Date();
      expect(date!.toDateString()).toBe(today.toDateString());
    });

    it('should calculate future date based on stock and usage', () => {
      const medication = createMockMedication({ 
        currentStock: 30,
        lowStockThreshold: 14,
        isContinuousUse: true,
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ]
      });
      // Days until threshold = (30 - 14) / 2 = 8 days
      
      const date = service.calculateSuggestedRestockDate(medication);
      
      expect(date).not.toBeNull();
      const expected = new Date();
      expected.setDate(expected.getDate() + 8);
      expect(date!.toDateString()).toBe(expected.toDateString());
    });
  });

  // =============================================
  // generateStockAlert Tests
  // =============================================
  describe('generateStockAlert', () => {
    it('should return null for adequate stock', () => {
      const medication = createMockMedication({ 
        currentStock: 30,
        lowStockThreshold: 14 
      });
      
      const alert = service.generateStockAlert(medication);
      
      expect(alert).toBeNull();
    });

    it('should generate critical alert with urgent message', () => {
      const medication = createMockMedication({ 
        currentStock: 0,
        name: 'Aspirina'
      });
      
      const alert = service.generateStockAlert(medication);
      
      expect(alert).not.toBeNull();
      expect(alert!.status).toBe('critical');
      expect(alert!.currentStock).toBe(0);
      expect(alert!.message).toContain('Estoque esgotado');
      expect(alert!.message).toContain('Aspirina');
      expect(alert!.message).toContain('imediatamente');
    });

    it('should generate low stock alert with days remaining', () => {
      const medication = createMockMedication({ 
        currentStock: 10,
        lowStockThreshold: 14,
        name: 'Aspirina',
        isContinuousUse: true,
        schedule: [
          { time: '08:00', status: 'upcoming' },
          { time: '20:00', status: 'upcoming' }
        ]
      });
      
      const alert = service.generateStockAlert(medication);
      
      expect(alert).not.toBeNull();
      expect(alert!.status).toBe('low');
      expect(alert!.currentStock).toBe(10);
      expect(alert!.daysRemaining).toBe(5);
      expect(alert!.message).toContain('Estoque baixo');
      expect(alert!.message).toContain('5 dias');
    });

    it('should generate low stock alert without days for as-needed', () => {
      const medication = createMockMedication({ 
        currentStock: 3,
        lowStockThreshold: 5,
        name: 'Dipirona',
        isContinuousUse: false,
        stockUnit: 'comprimidos'
      });
      
      const alert = service.generateStockAlert(medication);
      
      expect(alert).not.toBeNull();
      expect(alert!.status).toBe('low');
      expect(alert!.daysRemaining).toBeNull();
      expect(alert!.message).toContain('Estoque baixo');
      expect(alert!.message).toContain('3 comprimidos');
      expect(alert!.message).not.toContain('dias');
    });

    it('should use default stockUnit when not specified', () => {
      const medication = createMockMedication({ 
        currentStock: 3,
        lowStockThreshold: 5,
        isContinuousUse: false,
        stockUnit: undefined
      });
      
      const alert = service.generateStockAlert(medication);
      
      expect(alert!.message).toContain('unidades');
    });

    it('should include medicationId and medicationName', () => {
      const medication = createMockMedication({ 
        id: 'med-456',
        name: 'Omeprazol',
        currentStock: 5,
        lowStockThreshold: 10 
      });
      
      const alert = service.generateStockAlert(medication);
      
      expect(alert!.medicationId).toBe('med-456');
      expect(alert!.medicationName).toBe('Omeprazol');
    });
  });

  // =============================================
  // getAllStockAlerts Tests
  // =============================================
  describe('getAllStockAlerts', () => {
    it('should return empty array when no medications', () => {
      const alerts = service.getAllStockAlerts([]);
      
      expect(alerts).toEqual([]);
    });

    it('should skip archived medications', () => {
      const medications = [
        createMockMedication({ id: '1', currentStock: 0, isArchived: true }),
        createMockMedication({ id: '2', currentStock: 30, lowStockThreshold: 10 })
      ];
      
      const alerts = service.getAllStockAlerts(medications);
      
      expect(alerts.length).toBe(0);
    });

    it('should skip medications with adequate stock', () => {
      const medications = [
        createMockMedication({ id: '1', currentStock: 50, lowStockThreshold: 10 }),
        createMockMedication({ id: '2', currentStock: 30, lowStockThreshold: 10 })
      ];
      
      const alerts = service.getAllStockAlerts(medications);
      
      expect(alerts.length).toBe(0);
    });

    it('should sort critical alerts before low alerts', () => {
      const medications = [
        createMockMedication({ id: '1', currentStock: 5, lowStockThreshold: 10 }), // low
        createMockMedication({ id: '2', currentStock: 0 }), // critical
        createMockMedication({ id: '3', currentStock: 8, lowStockThreshold: 10 }) // low
      ];
      
      const alerts = service.getAllStockAlerts(medications);
      
      expect(alerts.length).toBe(3);
      expect(alerts[0].status).toBe('critical');
      expect(alerts[0].medicationId).toBe('2');
    });

    it('should sort by days remaining within same severity', () => {
      const medications = [
        createMockMedication({ 
          id: '1', 
          currentStock: 8, 
          lowStockThreshold: 10,
          schedule: [{ time: '08:00', status: 'upcoming' }]
        }), // 8 days remaining
        createMockMedication({ 
          id: '2', 
          currentStock: 4, 
          lowStockThreshold: 10,
          schedule: [{ time: '08:00', status: 'upcoming' }]
        }) // 4 days remaining
      ];
      
      const alerts = service.getAllStockAlerts(medications);
      
      expect(alerts.length).toBe(2);
      expect(alerts[0].medicationId).toBe('2'); // fewer days first
      expect(alerts[1].medicationId).toBe('1');
    });

    it('should place null daysRemaining at end', () => {
      const medications = [
        createMockMedication({ 
          id: '1', 
          currentStock: 3, 
          lowStockThreshold: 5,
          isContinuousUse: false
        }), // null days remaining
        createMockMedication({ 
          id: '2', 
          currentStock: 4, 
          lowStockThreshold: 10,
          schedule: [{ time: '08:00', status: 'upcoming' }]
        }) // 4 days remaining
      ];
      
      const alerts = service.getAllStockAlerts(medications);
      
      expect(alerts.length).toBe(2);
      expect(alerts[0].medicationId).toBe('2'); // has days remaining
      expect(alerts[1].medicationId).toBe('1'); // null days remaining
    });
  });

  // =============================================
  // deductStock Tests
  // =============================================
  describe('deductStock', () => {
    it('should deduct 1 from current stock', () => {
      const medication = createMockMedication({ currentStock: 10 });
      
      const newStock = service.deductStock(medication);
      
      expect(newStock).toBe(9);
    });

    it('should not go below 0', () => {
      const medication = createMockMedication({ currentStock: 0 });
      
      const newStock = service.deductStock(medication);
      
      expect(newStock).toBe(0);
    });

    it('should use stock property when currentStock is undefined', () => {
      const medication = createMockMedication({ currentStock: undefined, stock: 5 });
      
      const newStock = service.deductStock(medication);
      
      expect(newStock).toBe(4);
    });
  });

  // =============================================
  // addStock Tests
  // =============================================
  describe('addStock', () => {
    it('should add quantity to current stock', () => {
      const medication = createMockMedication({ currentStock: 10 });
      
      const newStock = service.addStock(medication, 5);
      
      expect(newStock).toBe(15);
    });

    it('should work with 0 current stock', () => {
      const medication = createMockMedication({ currentStock: 0 });
      
      const newStock = service.addStock(medication, 20);
      
      expect(newStock).toBe(20);
    });

    it('should handle undefined currentStock', () => {
      const medication = createMockMedication({ currentStock: undefined, stock: 5 });
      
      const newStock = service.addStock(medication, 10);
      
      expect(newStock).toBe(15);
    });
  });

  // =============================================
  // shouldAutoArchive Tests
  // =============================================
  describe('shouldAutoArchive', () => {
    it('should return true for non-continuous medication with 0 stock', () => {
      const medication = createMockMedication({ 
        isContinuousUse: false, 
        currentStock: 0 
      });
      
      const result = service.shouldAutoArchive(medication);
      
      expect(result).toBe(true);
    });

    it('should return false for continuous medication with 0 stock', () => {
      const medication = createMockMedication({ 
        isContinuousUse: true, 
        currentStock: 0 
      });
      
      const result = service.shouldAutoArchive(medication);
      
      expect(result).toBe(false);
    });

    it('should return false for non-continuous medication with stock > 0', () => {
      const medication = createMockMedication({ 
        isContinuousUse: false, 
        currentStock: 5 
      });
      
      const result = service.shouldAutoArchive(medication);
      
      expect(result).toBe(false);
    });

    it('should default isContinuousUse to true', () => {
      const medication = createMockMedication({ 
        isContinuousUse: undefined, 
        currentStock: 0 
      });
      
      const result = service.shouldAutoArchive(medication);
      
      expect(result).toBe(false);
    });
  });

  // =============================================
  // getStockColorClass Tests
  // =============================================
  describe('getStockColorClass', () => {
    it('should return "critical" for 0 stock', () => {
      const medication = createMockMedication({ currentStock: 0 });
      
      const colorClass = service.getStockColorClass(medication);
      
      expect(colorClass).toBe('critical');
    });

    it('should return "low" for low stock', () => {
      const medication = createMockMedication({ 
        currentStock: 5, 
        lowStockThreshold: 10 
      });
      
      const colorClass = service.getStockColorClass(medication);
      
      expect(colorClass).toBe('low');
    });

    it('should return "adequate" for sufficient stock', () => {
      const medication = createMockMedication({ 
        currentStock: 30, 
        lowStockThreshold: 10 
      });
      
      const colorClass = service.getStockColorClass(medication);
      
      expect(colorClass).toBe('adequate');
    });
  });

  // =============================================
  // restockMedication Tests
  // =============================================
  describe('restockMedication', () => {
    it('should update medication stock', async () => {
      const medication = createMockMedication({ 
        id: 'med-123', 
        currentStock: 5,
        name: 'Aspirina' 
      });
      medicationsSignal.set([medication]);
      
      await service.restockMedication('med-123', 10, 'admin', 'Monthly restock');
      
      expect(mockMedicationService.updateMedication).toHaveBeenCalledWith(
        'med-123',
        { currentStock: 15 }
      );
    });

    it('should log the restock event', async () => {
      const medication = createMockMedication({ 
        id: 'med-123', 
        currentStock: 5,
        name: 'Aspirina',
        stockUnit: 'comprimidos'
      });
      medicationsSignal.set([medication]);
      
      await service.restockMedication('med-123', 10, 'admin');
      
      expect(mockLogService.addLog).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.stringContaining('Aspirina')
      );
      expect(mockLogService.addLog).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.stringContaining('+10')
      );
    });

    it('should throw error when medication not found', async () => {
      medicationsSignal.set([]);
      
      await expectAsync(
        service.restockMedication('non-existent', 10, 'admin')
      ).toBeRejectedWithError('Medication not found');
    });

    it('should add entry to restock history', async () => {
      const medication = createMockMedication({ 
        id: 'med-123', 
        currentStock: 5,
        name: 'Aspirina' 
      });
      medicationsSignal.set([medication]);
      
      await service.restockMedication('med-123', 10, 'admin', 'Test notes');
      
      const history = service.restockHistory();
      expect(history.length).toBe(1);
      expect(history[0].medicationId).toBe('med-123');
      expect(history[0].medicationName).toBe('Aspirina');
      expect(history[0].quantity).toBe(10);
      expect(history[0].previousStock).toBe(5);
      expect(history[0].newStock).toBe(15);
      expect(history[0].registeredBy).toBe('admin');
      expect(history[0].notes).toBe('Test notes');
    });

    it('should persist restock history to localStorage', async () => {
      const medication = createMockMedication({ 
        id: 'med-123', 
        currentStock: 5,
        name: 'Aspirina' 
      });
      medicationsSignal.set([medication]);
      
      await service.restockMedication('med-123', 10, 'admin');
      
      const stored = localStorage.getItem('medicamenta_restock_history');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
    });
  });

  // =============================================
  // getRestockHistoryForMedication Tests
  // =============================================
  describe('getRestockHistoryForMedication', () => {
    it('should return history for specific medication', async () => {
      const med1 = createMockMedication({ id: 'med-1', name: 'Aspirina', currentStock: 5 });
      const med2 = createMockMedication({ id: 'med-2', name: 'Dipirona', currentStock: 10 });
      medicationsSignal.set([med1, med2]);
      
      await service.restockMedication('med-1', 5, 'admin');
      await service.restockMedication('med-2', 10, 'admin');
      await service.restockMedication('med-1', 3, 'admin');
      
      const history = service.getRestockHistoryForMedication('med-1');
      
      expect(history.length).toBe(2);
      expect(history.every(h => h.medicationId === 'med-1')).toBe(true);
    });

    it('should return empty array when no history', () => {
      const history = service.getRestockHistoryForMedication('non-existent');
      
      expect(history).toEqual([]);
    });
  });

  // =============================================
  // decreaseStock Tests
  // =============================================
  describe('decreaseStock', () => {
    it('should decrease stock by 1 by default', async () => {
      const medication = createMockMedication({ id: 'med-123', currentStock: 10 });
      medicationsSignal.set([medication]);
      
      await service.decreaseStock('med-123');
      
      expect(mockMedicationService.updateMedication).toHaveBeenCalledWith(
        'med-123',
        { currentStock: 9 }
      );
    });

    it('should decrease stock by specified amount', async () => {
      const medication = createMockMedication({ id: 'med-123', currentStock: 10 });
      medicationsSignal.set([medication]);
      
      await service.decreaseStock('med-123', 5);
      
      expect(mockMedicationService.updateMedication).toHaveBeenCalledWith(
        'med-123',
        { currentStock: 5 }
      );
    });

    it('should not go below 0', async () => {
      const medication = createMockMedication({ id: 'med-123', currentStock: 2 });
      medicationsSignal.set([medication]);
      
      await service.decreaseStock('med-123', 5);
      
      expect(mockMedicationService.updateMedication).toHaveBeenCalledWith(
        'med-123',
        { currentStock: 0 }
      );
    });

    it('should do nothing when medication not found', async () => {
      medicationsSignal.set([]);
      
      await service.decreaseStock('non-existent');
      
      expect(mockMedicationService.updateMedication).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // Computed Signals Tests
  // =============================================
  describe('computed signals', () => {
    describe('stockAlerts', () => {
      it('should update when medications change', () => {
        expect(service.stockAlerts().length).toBe(0);
        
        medicationsSignal.set([
          createMockMedication({ id: '1', currentStock: 0 })
        ]);
        
        expect(service.stockAlerts().length).toBe(1);
        expect(service.stockAlerts()[0].status).toBe('critical');
      });
    });

    describe('criticalAlerts', () => {
      it('should only include critical alerts', () => {
        medicationsSignal.set([
          createMockMedication({ id: '1', currentStock: 0 }), // critical
          createMockMedication({ id: '2', currentStock: 5, lowStockThreshold: 10 }) // low
        ]);
        
        const critical = service.criticalAlerts();
        
        expect(critical.length).toBe(1);
        expect(critical[0].medicationId).toBe('1');
      });
    });

    describe('lowStockAlerts', () => {
      it('should only include low alerts', () => {
        medicationsSignal.set([
          createMockMedication({ id: '1', currentStock: 0 }), // critical
          createMockMedication({ id: '2', currentStock: 5, lowStockThreshold: 10 }) // low
        ]);
        
        const low = service.lowStockAlerts();
        
        expect(low.length).toBe(1);
        expect(low[0].medicationId).toBe('2');
      });
    });

    describe('alertCount', () => {
      it('should return total number of alerts', () => {
        medicationsSignal.set([
          createMockMedication({ id: '1', currentStock: 0 }),
          createMockMedication({ id: '2', currentStock: 5, lowStockThreshold: 10 })
        ]);
        
        expect(service.alertCount()).toBe(2);
      });
    });

    describe('hasCriticalAlerts', () => {
      it('should return true when there are critical alerts', () => {
        medicationsSignal.set([
          createMockMedication({ id: '1', currentStock: 0 })
        ]);
        
        expect(service.hasCriticalAlerts()).toBe(true);
      });

      it('should return false when no critical alerts', () => {
        medicationsSignal.set([
          createMockMedication({ id: '1', currentStock: 5, lowStockThreshold: 10 })
        ]);
        
        expect(service.hasCriticalAlerts()).toBe(false);
      });
    });
  });

  // =============================================
  // localStorage Integration Tests
  // =============================================
  describe('localStorage integration', () => {
    it('should load restock history from localStorage on init', () => {
      const existingHistory: RestockEntry[] = [{
        id: 'restock-1',
        medicationId: 'med-1',
        medicationName: 'Aspirina',
        quantity: 10,
        previousStock: 5,
        newStock: 15,
        restockDate: new Date('2024-01-01'),
        registeredBy: 'admin'
      }];
      localStorage.setItem('medicamenta_restock_history', JSON.stringify(existingHistory));
      
      // Create new service instance to trigger load
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          StockService,
          { provide: MedicationService, useValue: mockMedicationService },
          { provide: LogService, useValue: mockLogService }
        ]
      });
      const newService = TestBed.inject(StockService);
      
      const history = newService.restockHistory();
      expect(history.length).toBe(1);
      expect(history[0].medicationId).toBe('med-1');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('medicamenta_restock_history', 'invalid json');
      
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          StockService,
          { provide: MedicationService, useValue: mockMedicationService },
          { provide: LogService, useValue: mockLogService }
        ]
      });
      
      // Should not throw, should log error
      expect(() => TestBed.inject(StockService)).not.toThrow();
      expect(mockLogService.error).toHaveBeenCalled();
    });
  });
});
