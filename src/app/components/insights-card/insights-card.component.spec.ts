/**
 * 🧪 InsightsCardComponent Tests
 *
 * Testes unitários para o componente de insights.
 * Cobertura: visibilidade, cores, ações, dismissal e navegação.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InsightsCardComponent } from './insights-card.component';
import { Router } from '@angular/router';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Insight } from '../../services/dashboard-insights.service';

// Fake TranslateLoader for tests
class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<Record<string, string>> {
    return of({
      'INSIGHTS.TITLE': 'Insights',
      'INSIGHTS.VIEW_ALL': 'View All',
      'INSIGHTS.DISMISS': 'Dismiss'
    });
  }
}

describe('InsightsCardComponent', () => {
  let component: InsightsCardComponent;
  let fixture: ComponentFixture<InsightsCardComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  // Use any[] to accommodate both test structure and actual interface
  const mockInsights: any[] = [
    {
      id: 'insight-1',
      type: 'success',
      icon: 'trophy-outline',
      title: 'Achievement Unlocked',
      description: 'You completed your streak!',
      priority: 5,
      color: 'success',
      actionLabel: 'View',
      actionData: { route: '/achievements' },
      timestamp: new Date()
    },
    {
      id: 'insight-2',
      type: 'warning',
      icon: 'warning-outline',
      title: 'Low Stock',
      description: 'Some medications are running low',
      priority: 4,
      color: 'warning',
      actionLabel: 'Check',
      actionData: { route: '/stock' },
      timestamp: new Date()
    },
    {
      id: 'insight-3',
      type: 'info',
      icon: 'information-circle-outline',
      title: 'Tip of the Day',
      description: 'Remember to take medications with food',
      priority: 1,
      color: 'primary',
      timestamp: new Date()
    },
    {
      id: 'insight-4',
      type: 'danger',
      icon: 'alert-circle-outline',
      title: 'Missed Dose',
      description: 'You missed a dose yesterday',
      priority: 5,
      color: 'danger',
      actionLabel: 'Log',
      actionData: { route: '/history' },
      timestamp: new Date()
    },
    {
      id: 'insight-5',
      type: 'info',
      icon: 'trending-up-outline',
      title: 'Progress Update',
      description: 'Your adherence improved',
      priority: 3,
      color: 'primary',
      timestamp: new Date()
    },
    {
      id: 'insight-6',
      type: 'success',
      icon: 'thumbs-up-outline',
      title: 'Weekly Goal',
      description: 'You met your weekly goal',
      priority: 2,
      color: 'success',
      timestamp: new Date()
    }
  ];

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        InsightsCardComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: Router, useValue: routerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(InsightsCardComponent);
    component = fixture.componentInstance;
    component.insights = mockInsights;
    fixture.detectChanges();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default maxVisible of 5', () => {
      expect(component.maxVisible).toBe(5);
    });

    it('should accept insights input', () => {
      expect(component.insights.length).toBe(6);
    });
  });

  // ============================================================================
  // VISIBLE INSIGHTS TESTS
  // ============================================================================

  describe('visibleInsights', () => {
    it('should return only maxVisible insights', () => {
      expect(component.visibleInsights.length).toBe(5);
    });

    it('should return all insights when less than maxVisible', () => {
      component.insights = mockInsights.slice(0, 3);
      expect(component.visibleInsights.length).toBe(3);
    });

    it('should return first N insights', () => {
      const visible = component.visibleInsights;
      expect(visible[0].id).toBe('insight-1');
      expect(visible[4].id).toBe('insight-5');
    });

    it('should respect custom maxVisible', () => {
      component.maxVisible = 3;
      expect(component.visibleInsights.length).toBe(3);
    });
  });

  // ============================================================================
  // HAS MORE INSIGHTS TESTS
  // ============================================================================

  describe('hasMoreInsights', () => {
    it('should return true when more insights exist', () => {
      expect(component.hasMoreInsights).toBe(true);
    });

    it('should return false when all insights are visible', () => {
      component.insights = mockInsights.slice(0, 3);
      expect(component.hasMoreInsights).toBe(false);
    });

    it('should return false when exactly maxVisible insights', () => {
      component.insights = mockInsights.slice(0, 5);
      expect(component.hasMoreInsights).toBe(false);
    });
  });

  // ============================================================================
  // GET COLOR TESTS
  // ============================================================================

  describe('getColor()', () => {
    it('should return success for success type', () => {
      expect(component.getColor('success')).toBe('success');
    });

    it('should return warning for warning type', () => {
      expect(component.getColor('warning')).toBe('warning');
    });

    it('should return primary for info type', () => {
      expect(component.getColor('info')).toBe('primary');
    });

    it('should return danger for danger type', () => {
      expect(component.getColor('danger')).toBe('danger');
    });
  });

  // ============================================================================
  // GET ANIMATION CLASS TESTS
  // ============================================================================

  describe('getAnimationClass()', () => {
    it('should return pulse-animation for priority >= 5', () => {
      expect(component.getAnimationClass(5)).toBe('pulse-animation');
      expect(component.getAnimationClass(6)).toBe('pulse-animation');
    });

    it('should return fade-in-animation for priority 4', () => {
      expect(component.getAnimationClass(4)).toBe('fade-in-animation');
    });

    it('should return slide-in-animation for priority < 4', () => {
      expect(component.getAnimationClass(3)).toBe('slide-in-animation');
      expect(component.getAnimationClass(1)).toBe('slide-in-animation');
    });
  });

  // ============================================================================
  // DISMISS INSIGHT TESTS
  // ============================================================================

  describe('dismissInsight()', () => {
    it('should emit insightDismissed event', () => {
      spyOn(component.insightDismissed, 'emit');
      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      component.dismissInsight(event, 'insight-1');

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.insightDismissed.emit).toHaveBeenCalledWith('insight-1');
    });
  });

  // ============================================================================
  // HANDLE ACTION TESTS
  // ============================================================================

  describe('handleAction()', () => {
    it('should navigate to route when actionData has route', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      component.handleAction(event, mockInsights[0]);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/achievements']);
    });

    it('should emit insightAction event', () => {
      spyOn(component.insightAction, 'emit');
      const event = new Event('click');

      component.handleAction(event, mockInsights[0]);

      expect(component.insightAction.emit).toHaveBeenCalledWith(mockInsights[0]);
    });

    it('should not navigate when no actionData', () => {
      const event = new Event('click');
      const insightNoAction: any = {
        id: 'no-action',
        type: 'info',
        icon: 'info',
        title: 'No Action',
        message: 'Test',
        priority: 'low',
        color: 'primary'
      };

      component.handleAction(event, insightNoAction);

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should not navigate when actionData has no route', () => {
      const event = new Event('click');
      const insightCustomAction: any = {
        id: 'custom-action',
        type: 'info',
        icon: 'info',
        title: 'Custom',
        description: 'Test',
        priority: 1,
        timestamp: new Date(),
        actionLabel: 'Click'
      };

      component.handleAction(event, insightCustomAction);

      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // VIEW ALL INSIGHTS TESTS
  // ============================================================================

  describe('viewAllInsights()', () => {
    it('should navigate to /reports', () => {
      component.viewAllInsights();

      expect(routerSpy.navigate).toHaveBeenCalledWith(['/reports']);
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should render insights card', () => {
      const card = fixture.nativeElement.querySelector('ion-card');
      expect(card).toBeTruthy();
    });

    it('should render visible insights', () => {
      const items = fixture.nativeElement.querySelectorAll('ion-item');
      // Number may vary based on template structure
      expect(items.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INPUT CHANGES TESTS
  // ============================================================================

  describe('Input Changes', () => {
    it('should update when insights change', () => {
      const newInsights = mockInsights.slice(0, 2);
      component.insights = newInsights;
      fixture.detectChanges();

      expect(component.visibleInsights.length).toBe(2);
      expect(component.hasMoreInsights).toBe(false);
    });

    it('should update when maxVisible changes', () => {
      component.maxVisible = 2;
      fixture.detectChanges();

      expect(component.visibleInsights.length).toBe(2);
      expect(component.hasMoreInsights).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty insights array', () => {
      component.insights = [];
      fixture.detectChanges();

      expect(component.visibleInsights.length).toBe(0);
      expect(component.hasMoreInsights).toBe(false);
    });

    it('should handle maxVisible = 0', () => {
      component.maxVisible = 0;
      fixture.detectChanges();

      expect(component.visibleInsights.length).toBe(0);
      expect(component.hasMoreInsights).toBe(true);
    });

    it('should handle undefined actionData', () => {
      const event = new Event('click');
      const insightUndefined: any = {
        id: 'undefined-action',
        type: 'info',
        icon: 'info',
        title: 'Undefined',
        message: 'Test',
        priority: 'low',
        color: 'primary'
      };

      // Should not throw
      expect(() => component.handleAction(event, insightUndefined)).not.toThrow();
    });
  });
});
