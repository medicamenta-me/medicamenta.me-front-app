/**
 * 🧪 StockAlertBannerComponent Tests
 *
 * Testes unitários para o banner de alertas de estoque.
 * Cobertura: status, ícones, detalhes, dismiss.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StockAlertBannerComponent } from './stock-alert-banner.component';
import { CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { StockAlert } from '../../services/stock.service';

// Fake loader for translations
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      STOCK: {
        CRITICAL_ALERT_TITLE: 'Critical Stock Alert',
        LOW_ALERT_TITLE: 'Low Stock Alert',
        CRITICAL_ALERT_MESSAGE: '{{count}} medications out of stock',
        LOW_ALERT_MESSAGE: '{{count}} medications running low',
        SHOW_DETAILS: 'Show Details',
        HIDE_DETAILS: 'Hide Details',
        MANAGE_STOCK: 'Manage Stock'
      },
      COMMON: {
        CLOSE: 'Close'
      }
    });
  }
}

describe('StockAlertBannerComponent', () => {
  let component: StockAlertBannerComponent;
  let fixture: ComponentFixture<StockAlertBannerComponent>;

  const mockAlerts: StockAlert[] = [
    {
      medicationId: 'med-1',
      medicationName: 'Aspirin',
      status: 'critical',
      message: 'Out of stock',
      currentStock: 0,
      daysRemaining: 0,
      suggestedRestockDate: new Date()
    },
    {
      medicationId: 'med-2',
      medicationName: 'Vitamin D',
      status: 'low',
      message: '3 days remaining',
      currentStock: 3,
      daysRemaining: 3,
      suggestedRestockDate: new Date()
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StockAlertBannerComponent,
        RouterTestingModule,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(StockAlertBannerComponent);
    component = fixture.componentInstance;
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty alerts', () => {
      expect(component.alerts).toEqual([]);
    });

    it('should initialize isDismissed as false', () => {
      expect(component.isDismissed).toBe(false);
    });

    it('should initialize showDetails as false', () => {
      expect(component.showDetails).toBe(false);
    });
  });

  // ============================================================================
  // GET MOST CRITICAL STATUS TESTS
  // ============================================================================

  describe('Get Most Critical Status', () => {
    it('should return critical when at least one critical alert', () => {
      component.alerts = mockAlerts;
      expect(component.getMostCriticalStatus()).toBe('critical');
    });

    it('should return low when no critical alerts', () => {
      component.alerts = mockAlerts.filter(a => a.status !== 'critical');
      expect(component.getMostCriticalStatus()).toBe('low');
    });

    it('should return low for empty alerts', () => {
      component.alerts = [];
      expect(component.getMostCriticalStatus()).toBe('low');
    });
  });

  // ============================================================================
  // GET ALERT ICON TESTS
  // ============================================================================

  describe('Get Alert Icon', () => {
    it('should return alert-circle-outline for critical', () => {
      component.alerts = mockAlerts;
      expect(component.getAlertIcon()).toBe('alert-circle-outline');
    });

    it('should return warning-outline for low', () => {
      component.alerts = [mockAlerts[1]]; // Only low alert
      expect(component.getAlertIcon()).toBe('warning-outline');
    });
  });

  // ============================================================================
  // GET STATUS ICON TESTS
  // ============================================================================

  describe('Get Status Icon', () => {
    it('should return alert-circle-outline for critical status', () => {
      expect(component.getStatusIcon('critical')).toBe('alert-circle-outline');
    });

    it('should return warning-outline for low status', () => {
      expect(component.getStatusIcon('low')).toBe('warning-outline');
    });

    it('should return refresh-circle-outline for unknown status', () => {
      expect(component.getStatusIcon('unknown')).toBe('refresh-circle-outline');
    });
  });

  // ============================================================================
  // GET ALERT TITLE TESTS
  // ============================================================================

  describe('Get Alert Title', () => {
    it('should return critical title for critical alerts', () => {
      component.alerts = mockAlerts;
      expect(component.getAlertTitle()).toBe('STOCK.CRITICAL_ALERT_TITLE');
    });

    it('should return low title for low alerts only', () => {
      component.alerts = [mockAlerts[1]];
      expect(component.getAlertTitle()).toBe('STOCK.LOW_ALERT_TITLE');
    });
  });

  // ============================================================================
  // GET ALERT MESSAGE TESTS
  // ============================================================================

  describe('Get Alert Message', () => {
    it('should return critical message for critical alerts', () => {
      component.alerts = mockAlerts;
      expect(component.getAlertMessage()).toBe('STOCK.CRITICAL_ALERT_MESSAGE');
    });

    it('should return low message for low alerts only', () => {
      component.alerts = [mockAlerts[1]];
      expect(component.getAlertMessage()).toBe('STOCK.LOW_ALERT_MESSAGE');
    });
  });

  // ============================================================================
  // TOGGLE DETAILS TESTS
  // ============================================================================

  describe('Toggle Details', () => {
    it('should toggle showDetails from false to true', () => {
      expect(component.showDetails).toBe(false);
      component.toggleDetails();
      expect(component.showDetails).toBe(true);
    });

    it('should toggle showDetails from true to false', () => {
      component.showDetails = true;
      component.toggleDetails();
      expect(component.showDetails).toBe(false);
    });
  });

  // ============================================================================
  // DISMISS TESTS
  // ============================================================================

  describe('Dismiss', () => {
    it('should set isDismissed to true', () => {
      expect(component.isDismissed).toBe(false);
      component.dismiss();
      expect(component.isDismissed).toBe(true);
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    beforeEach(() => {
      component.alerts = mockAlerts;
      fixture.detectChanges();
    });

    it('should render banner when alerts exist', () => {
      const banner = fixture.nativeElement.querySelector('.stock-alert-banner');
      expect(banner).toBeTruthy();
    });

    it('should not render banner when no alerts', () => {
      component.alerts = [];
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.stock-alert-banner');
      expect(banner).toBeFalsy();
    });

    it('should not render banner when dismissed', () => {
      component.isDismissed = true;
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      const banner = fixture.nativeElement.querySelector('.stock-alert-banner');
      expect(banner).toBeFalsy();
    });

    it('should apply critical class for critical alerts', () => {
      const banner = fixture.nativeElement.querySelector('.stock-alert-banner');
      expect(banner.classList.contains('alert-critical')).toBe(true);
    });

    it('should apply low class for low alerts only', () => {
      component.alerts = [mockAlerts[1]];
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('.stock-alert-banner');
      expect(banner.classList.contains('alert-low')).toBe(true);
    });

    it('should not show details by default', () => {
      const details = fixture.nativeElement.querySelector('.alert-details');
      expect(details).toBeFalsy();
    });

    it('should show details when toggled', () => {
      component.showDetails = true;
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      const details = fixture.nativeElement.querySelector('.alert-details');
      expect(details).toBeTruthy();
    });

    it('should render dismiss button', () => {
      const dismissBtn = fixture.nativeElement.querySelector('.dismiss-btn');
      expect(dismissBtn).toBeTruthy();
    });

    it('should render action buttons', () => {
      const actions = fixture.nativeElement.querySelectorAll('.action-btn');
      expect(actions.length).toBe(2);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle single alert', () => {
      component.alerts = [mockAlerts[0]];
      fixture.detectChanges();
      
      expect(component.alerts.length).toBe(1);
      const banner = fixture.nativeElement.querySelector('.stock-alert-banner');
      expect(banner).toBeTruthy();
    });

    it('should handle many alerts', () => {
      component.alerts = Array(10).fill(mockAlerts[0]);
      fixture.detectChanges();
      
      expect(component.alerts.length).toBe(10);
    });

    it('should render all alert items in details', () => {
      component.alerts = mockAlerts;
      component.showDetails = true;
      fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
      
      const items = fixture.nativeElement.querySelectorAll('.alert-item');
      expect(items.length).toBe(mockAlerts.length);
    });
  });
});
