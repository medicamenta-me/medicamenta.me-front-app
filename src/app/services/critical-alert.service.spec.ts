/**
 * CriticalAlertService Unit Tests
 * 
 * Tests for the Critical Alert Service that manages critical stock alerts
 * and determines when to show warnings for medications.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CriticalAlertService, CriticalAlert } from './critical-alert.service';
import { MedicationService } from './medication.service';
import { StockService, StockStatus } from './stock.service';
import { PatientSelectorService } from './patient-selector.service';
import { Medication } from '../models/medication.model';

describe('CriticalAlertService', () => {
  let service: CriticalAlertService;
  let mockMedicationService: any;
  let mockStockService: any;
  let mockPatientSelectorService: any;
  
  // Writable signals for tests
  let medicationsSignal: ReturnType<typeof signal<Medication[]>>;
  let activePatientIdSignal: ReturnType<typeof signal<string | null>>;

  const createMockMedication = (overrides: Partial<Medication> = {}): Medication => ({
    id: 'med-123',
    userId: 'user-123',
    patientId: 'patient-123',
    name: 'Aspirina',
    dosage: '100mg',
    frequency: '1 vez por dia',
    schedule: [{ time: '08:00', status: 'upcoming' }],
    stock: 30,
    currentStock: 30,
    lowStockThreshold: 14,
    isContinuousUse: true,
    isArchived: false,
    lastModified: new Date(),
    ...overrides
  });

  beforeEach(() => {
    // Create writable signals
    medicationsSignal = signal<Medication[]>([]);
    activePatientIdSignal = signal<string | null>('patient-123');
    
    // Create mocks
    mockMedicationService = {
      medications: medicationsSignal.asReadonly()
    };
    
    mockStockService = {
      getStockStatus: jasmine.createSpy('getStockStatus').and.returnValue('adequate' as StockStatus),
      calculateDaysRemaining: jasmine.createSpy('calculateDaysRemaining').and.returnValue(10)
    };
    
    mockPatientSelectorService = {
      activePatientId: activePatientIdSignal.asReadonly()
    };

    // Clear localStorage
    localStorage.removeItem('medicamenta_alert_modal_shown');

    TestBed.configureTestingModule({
      providers: [
        CriticalAlertService,
        { provide: MedicationService, useValue: mockMedicationService },
        { provide: StockService, useValue: mockStockService },
        { provide: PatientSelectorService, useValue: mockPatientSelectorService }
      ]
    });

    service = TestBed.inject(CriticalAlertService);
  });

  afterEach(() => {
    localStorage.removeItem('medicamenta_alert_modal_shown');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // =============================================
  // criticalAlerts Tests
  // =============================================
  describe('criticalAlerts', () => {
    it('should return empty array when no active patient', () => {
      activePatientIdSignal.set(null);
      
      const alerts = service.criticalAlerts();
      
      expect(alerts).toEqual([]);
    });

    it('should return empty array when no medications', () => {
      medicationsSignal.set([]);
      
      const alerts = service.criticalAlerts();
      
      expect(alerts).toEqual([]);
    });

    it('should filter medications by active patient', () => {
      const meds = [
        createMockMedication({ id: '1', patientId: 'patient-123', currentStock: 0 }),
        createMockMedication({ id: '2', patientId: 'other-patient', currentStock: 0 })
      ];
      medicationsSignal.set(meds);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(1);
      expect(alerts[0].medication.id).toBe('1');
    });

    it('should exclude archived medications', () => {
      const meds = [
        createMockMedication({ id: '1', isArchived: false, currentStock: 0 }),
        createMockMedication({ id: '2', isArchived: true, currentStock: 0 })
      ];
      medicationsSignal.set(meds);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(1);
      expect(alerts[0].medication.id).toBe('1');
    });

    it('should generate alerts for critical status', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(1);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].message).toBe('ALERTS.OUT_OF_STOCK');
    });

    it('should generate alerts for low status with days remaining', () => {
      const med = createMockMedication({ 
        currentStock: 5, 
        isContinuousUse: true 
      });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('low');
      mockStockService.calculateDaysRemaining.and.returnValue(3);
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(1);
      expect(alerts[0].severity).toBe('low');
      expect(alerts[0].message).toBe('ALERTS.LOW_STOCK_DAYS');
      expect(alerts[0].daysRemaining).toBe(3);
    });

    it('should generate alerts for low status without days (as-needed)', () => {
      const med = createMockMedication({ 
        currentStock: 3, 
        isContinuousUse: false 
      });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('low');
      mockStockService.calculateDaysRemaining.and.returnValue(null);
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(1);
      expect(alerts[0].severity).toBe('low');
      expect(alerts[0].message).toBe('ALERTS.LOW_STOCK_UNITS');
      expect(alerts[0].daysRemaining).toBeNull();
    });

    it('should not generate alerts for adequate status', () => {
      const med = createMockMedication({ currentStock: 30 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('adequate');
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(0);
    });

    it('should sort critical alerts before low alerts', () => {
      const meds = [
        createMockMedication({ id: '1', currentStock: 5 }), // will be low
        createMockMedication({ id: '2', currentStock: 0 })  // will be critical
      ];
      medicationsSignal.set(meds);
      
      mockStockService.getStockStatus.and.callFake((med: Medication) => {
        return med.currentStock === 0 ? 'critical' : 'low';
      });
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(2);
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].medication.id).toBe('2');
    });

    it('should sort by days remaining within same severity', () => {
      const meds = [
        createMockMedication({ id: '1', currentStock: 8 }),
        createMockMedication({ id: '2', currentStock: 4 })
      ];
      medicationsSignal.set(meds);
      
      mockStockService.getStockStatus.and.returnValue('low');
      mockStockService.calculateDaysRemaining.and.callFake((med: Medication) => {
        return med.id === '1' ? 8 : 4;
      });
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(2);
      expect(alerts[0].medication.id).toBe('2'); // fewer days first
      expect(alerts[1].medication.id).toBe('1');
    });
  });

  // =============================================
  // allCriticalAlerts Tests
  // =============================================
  describe('allCriticalAlerts', () => {
    it('should include medications from all patients', () => {
      const meds = [
        createMockMedication({ id: '1', patientId: 'patient-1', currentStock: 0 }),
        createMockMedication({ id: '2', patientId: 'patient-2', currentStock: 0 })
      ];
      medicationsSignal.set(meds);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      const alerts = service.allCriticalAlerts();
      
      expect(alerts.length).toBe(2);
    });

    it('should still exclude archived medications', () => {
      const meds = [
        createMockMedication({ id: '1', isArchived: false, currentStock: 0 }),
        createMockMedication({ id: '2', isArchived: true, currentStock: 0 })
      ];
      medicationsSignal.set(meds);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      const alerts = service.allCriticalAlerts();
      
      expect(alerts.length).toBe(1);
    });
  });

  // =============================================
  // hasCriticalAlerts Tests
  // =============================================
  describe('hasCriticalAlerts', () => {
    it('should return false when no alerts', () => {
      medicationsSignal.set([]);
      
      expect(service.hasCriticalAlerts()).toBe(false);
    });

    it('should return true when has alerts', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      expect(service.hasCriticalAlerts()).toBe(true);
    });
  });

  // =============================================
  // hasCriticalOutOfStock Tests
  // =============================================
  describe('hasCriticalOutOfStock', () => {
    it('should return false when no critical alerts', () => {
      const med = createMockMedication({ currentStock: 5 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('low');
      
      expect(service.hasCriticalOutOfStock()).toBe(false);
    });

    it('should return true when has critical alerts', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      expect(service.hasCriticalOutOfStock()).toBe(true);
    });
  });

  // =============================================
  // shouldShowModal Tests
  // =============================================
  describe('shouldShowModal', () => {
    it('should return false when no alerts', () => {
      medicationsSignal.set([]);
      
      expect(service.shouldShowModal()).toBe(false);
    });

    it('should return true when has alerts and not shown today', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      expect(service.shouldShowModal()).toBe(true);
    });

    it('should return false when already shown today', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      service.markModalShown();
      
      expect(service.shouldShowModal()).toBe(false);
    });

    it('should return true if shown yesterday', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem('medicamenta_alert_modal_shown', yesterday.toDateString());
      
      // Reinject to load from localStorage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CriticalAlertService,
          { provide: MedicationService, useValue: mockMedicationService },
          { provide: StockService, useValue: mockStockService },
          { provide: PatientSelectorService, useValue: mockPatientSelectorService }
        ]
      });
      service = TestBed.inject(CriticalAlertService);
      
      expect(service.shouldShowModal()).toBe(true);
    });
  });

  // =============================================
  // markModalShown Tests
  // =============================================
  describe('markModalShown', () => {
    it('should update lastModalShownDate', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      expect(service.shouldShowModal()).toBe(true);
      
      service.markModalShown();
      
      expect(service.shouldShowModal()).toBe(false);
    });

    it('should persist to localStorage', () => {
      service.markModalShown();
      
      const stored = localStorage.getItem('medicamenta_alert_modal_shown');
      expect(stored).toBe(new Date().toDateString());
    });
  });

  // =============================================
  // getHighestSeverity Tests
  // =============================================
  describe('getHighestSeverity', () => {
    it('should return null when no alerts', () => {
      medicationsSignal.set([]);
      
      expect(service.getHighestSeverity()).toBeNull();
    });

    it('should return critical when has critical alerts', () => {
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      expect(service.getHighestSeverity()).toBe('critical');
    });

    it('should return low when only low alerts', () => {
      const med = createMockMedication({ currentStock: 5 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('low');
      
      expect(service.getHighestSeverity()).toBe('low');
    });

    it('should return critical when mixed alerts', () => {
      const meds = [
        createMockMedication({ id: '1', currentStock: 5 }),
        createMockMedication({ id: '2', currentStock: 0 })
      ];
      medicationsSignal.set(meds);
      
      mockStockService.getStockStatus.and.callFake((med: Medication) => {
        return med.currentStock === 0 ? 'critical' : 'low';
      });
      
      expect(service.getHighestSeverity()).toBe('critical');
    });
  });

  // =============================================
  // getAlertCount Tests
  // =============================================
  describe('getAlertCount', () => {
    it('should return 0 when no alerts', () => {
      medicationsSignal.set([]);
      
      expect(service.getAlertCount()).toBe(0);
    });

    it('should return count of alerts', () => {
      const meds = [
        createMockMedication({ id: '1', currentStock: 0 }),
        createMockMedication({ id: '2', currentStock: 0 }),
        createMockMedication({ id: '3', currentStock: 0 })
      ];
      medicationsSignal.set(meds);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      expect(service.getAlertCount()).toBe(3);
    });
  });

  // =============================================
  // localStorage Integration Tests
  // =============================================
  describe('localStorage integration', () => {
    it('should load lastModalShownDate from localStorage on init', () => {
      const today = new Date().toDateString();
      localStorage.setItem('medicamenta_alert_modal_shown', today);
      
      // Reinitialize service to load from localStorage
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          CriticalAlertService,
          { provide: MedicationService, useValue: mockMedicationService },
          { provide: StockService, useValue: mockStockService },
          { provide: PatientSelectorService, useValue: mockPatientSelectorService }
        ]
      });
      
      const newService = TestBed.inject(CriticalAlertService);
      const med = createMockMedication({ currentStock: 0 });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      // Should be false because shown today
      expect(newService.shouldShowModal()).toBe(false);
    });
  });

  // =============================================
  // Edge Cases Tests
  // =============================================
  describe('edge cases', () => {
    it('should handle medication with undefined currentStock', () => {
      const med = createMockMedication({ currentStock: undefined });
      medicationsSignal.set([med]);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      const alerts = service.criticalAlerts();
      
      expect(alerts.length).toBe(1);
      expect(alerts[0].stockRemaining).toBe(0);
    });

    it('should handle null daysRemaining in sorting', () => {
      const meds = [
        createMockMedication({ id: '1', currentStock: 5, isContinuousUse: false }),
        createMockMedication({ id: '2', currentStock: 4, isContinuousUse: true })
      ];
      medicationsSignal.set(meds);
      
      mockStockService.getStockStatus.and.returnValue('low');
      mockStockService.calculateDaysRemaining.and.callFake((med: Medication) => {
        return med.isContinuousUse ? 4 : null;
      });
      
      const alerts = service.criticalAlerts();
      
      // Both should be present, sorted by remaining (days or stock)
      expect(alerts.length).toBe(2);
    });

    it('should update when patient changes', () => {
      const meds = [
        createMockMedication({ id: '1', patientId: 'patient-1', currentStock: 0 }),
        createMockMedication({ id: '2', patientId: 'patient-2', currentStock: 0 })
      ];
      medicationsSignal.set(meds);
      mockStockService.getStockStatus.and.returnValue('critical');
      
      activePatientIdSignal.set('patient-1');
      expect(service.criticalAlerts().length).toBe(1);
      expect(service.criticalAlerts()[0].medication.id).toBe('1');
      
      activePatientIdSignal.set('patient-2');
      expect(service.criticalAlerts().length).toBe(1);
      expect(service.criticalAlerts()[0].medication.id).toBe('2');
    });
  });
});
