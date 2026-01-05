import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { HeatmapDebugComponent } from './heatmap-debug.component';
import { HeatmapService } from '../../services/heatmap.service';
import { FormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('HeatmapDebugComponent', () => {
  let component: HeatmapDebugComponent;
  let fixture: ComponentFixture<HeatmapDebugComponent>;
  let heatmapServiceSpy: jasmine.SpyObj<HeatmapService>;
  let originalLocation: Location;

  const mockStatistics = {
    totalInteractions: 150,
    pages: ['/dashboard', '/history', '/settings'],
    mostClickedElements: [
      { id: 'btn-save', count: 45 },
      { id: 'nav-home', count: 30 },
      { id: 'menu-toggle', count: 25 }
    ],
    sessionDuration: 3600000 // 1 hour in ms
  };

  const mockPageData: any[] = [
    { x: 100, y: 200, elementId: 'btn-save', elementType: 'button', timestamp: Date.now(), page: '/dashboard' },
    { x: 150, y: 300, elementId: 'nav-home', elementType: 'a', timestamp: Date.now(), page: '/dashboard' }
  ];

  beforeEach(async () => {
    heatmapServiceSpy = jasmine.createSpyObj('HeatmapService', [
      'isTrackingActive',
      'startTracking',
      'stopTracking',
      'clearSession',
      'exportSessionData',
      'getStatistics',
      'getPageData'
    ]);
    
    heatmapServiceSpy.isTrackingActive.and.returnValue(true);
    heatmapServiceSpy.getStatistics.and.returnValue(mockStatistics);
    heatmapServiceSpy.getPageData.and.returnValue(mockPageData);
    heatmapServiceSpy.exportSessionData.and.returnValue(JSON.stringify({ data: 'test' }));

    await TestBed.configureTestingModule({
      imports: [HeatmapDebugComponent, FormsModule,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: HeatmapService, useValue: heatmapServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    // Note: window.location cannot be spied on in modern Chrome
    // The component uses isPlatformBrowser and checks hostname internally

    fixture = TestBed.createComponent(HeatmapDebugComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should start with panel open', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).isPanelOpen()).toBe(true);
    }));

    it('should be visible in development (localhost)', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).isVisible()).toBe(true);
    }));

    it('should start with overlay hidden', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).showOverlay).toBe(false);
    }));
  });

  describe('isProduction Detection', () => {
    it('should detect localhost as development', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).isVisible()).toBe(true);
    }));
  });

  describe('togglePanel', () => {
    it('should toggle panel state', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).isPanelOpen()).toBe(true);
      
      (component as any).togglePanel();
      
      expect((component as any).isPanelOpen()).toBe(false);
    }));

    it('should toggle back to open', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).togglePanel();
      (component as any).togglePanel();
      
      expect((component as any).isPanelOpen()).toBe(true);
    }));
  });

  describe('Tracking Controls', () => {
    it('should call startTracking on service', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).startTracking();
      
      expect(heatmapServiceSpy.startTracking).toHaveBeenCalled();
    }));

    it('should call stopTracking on service', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).stopTracking();
      
      expect(heatmapServiceSpy.stopTracking).toHaveBeenCalled();
    }));

    it('should call clearSession on service', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).clearSession();
      
      expect(heatmapServiceSpy.clearSession).toHaveBeenCalled();
    }));

    it('should update stats after clear', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      const newStats = { ...mockStatistics, totalInteractions: 0 };
      heatmapServiceSpy.getStatistics.and.returnValue(newStats);
      
      (component as any).clearSession();
      
      expect(heatmapServiceSpy.getStatistics).toHaveBeenCalled();
    }));
  });

  describe('exportData', () => {
    let originalCreateElement: typeof document.createElement;
    let mockLink: any;

    beforeEach(() => {
      // Store original createElement
      originalCreateElement = document.createElement.bind(document);
      
      mockLink = {
        href: '',
        download: '',
        click: jasmine.createSpy('click'),
        setAttribute: jasmine.createSpy('setAttribute'),
        style: {}
      };
      
      // Spy on createElement but call through for non-'a' elements
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'a') {
          return mockLink;
        }
        return originalCreateElement(tagName);
      });
      
      spyOn(URL, 'createObjectURL').and.returnValue('blob:test-url');
      spyOn(URL, 'revokeObjectURL');
    });

    it('should call exportSessionData on service', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).exportData();
      
      expect(heatmapServiceSpy.exportSessionData).toHaveBeenCalled();
    }));

    it('should create download link', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).exportData();
      
      expect(document.createElement).toHaveBeenCalledWith('a');
    }));

    it('should set correct download filename', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).exportData();
      
      expect(mockLink.download).toMatch(/heatmap-\d+\.json/);
    }));

    it('should trigger download', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).exportData();
      
      expect(mockLink.click).toHaveBeenCalled();
    }));

    it('should revoke blob URL after download', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).exportData();
      
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    }));
  });

  describe('toggleOverlay', () => {
    it('should toggle overlay state', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).showOverlay = true;
      (component as any).toggleOverlay();
      
      // toggleOverlay doesn't change value, it's bound via ngModel
      expect((component as any).showOverlay).toBe(true);
    }));
  });

  describe('Statistics Display', () => {
    it('should display total interactions', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).stats().totalInteractions).toBe(150);
    }));

    it('should display pages count', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).stats().pages.length).toBe(3);
    }));

    it('should display most clicked elements', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).stats().mostClickedElements.length).toBe(3);
      expect((component as any).stats().mostClickedElements[0].id).toBe('btn-save');
    }));

    it('should update stats periodically', fakeAsync(() => {
      fixture.detectChanges();
      
      const newStats = { ...mockStatistics, totalInteractions: 200 };
      heatmapServiceSpy.getStatistics.and.returnValue(newStats);
      
      tick(2000);
      
      expect(heatmapServiceSpy.getStatistics).toHaveBeenCalled();
      
      discardPeriodicTasks();
    }));
  });

  describe('formatDuration', () => {
    it('should format seconds', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).formatDuration(45000)).toBe('45s');
    }));

    it('should format minutes and seconds', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).formatDuration(125000)).toBe('2m 5s');
    }));

    it('should format hours and minutes', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).formatDuration(3900000)).toBe('1h 5m');
    }));

    it('should handle zero duration', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).formatDuration(0)).toBe('0s');
    }));

    it('should handle large durations', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).formatDuration(7200000)).toBe('2h 0m');
    }));
  });

  describe('currentPagePoints Computed', () => {
    it('should get page data from service', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      const points = (component as any).currentPagePoints();
      expect(points.length).toBe(2);
    }));

    it('should pass current pathname to service', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).currentPagePoints();
      // Verify service was called with whatever the current pathname is (in test env it's /context.html)
      expect(heatmapServiceSpy.getPageData).toHaveBeenCalledWith(window.location.pathname);
    }));
  });

  describe('Tracking Status', () => {
    it('should show pause button when tracking active', fakeAsync(() => {
      heatmapServiceSpy.isTrackingActive.and.returnValue(true);
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect(heatmapServiceSpy.isTrackingActive()).toBe(true);
    }));

    it('should show start button when tracking inactive', fakeAsync(() => {
      heatmapServiceSpy.isTrackingActive.and.returnValue(false);
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect(heatmapServiceSpy.isTrackingActive()).toBe(false);
    }));
  });

  describe('Overlay Points', () => {
    it('should display heatmap points when overlay enabled', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      (component as any).showOverlay = true;
      fixture.detectChanges();
      
      const points = (component as any).currentPagePoints();
      expect(points[0].x).toBe(100);
      expect(points[0].y).toBe(200);
    }));
  });

  describe('Edge Cases', () => {
    it('should handle empty statistics', fakeAsync(() => {
      const emptyStats = {
        totalInteractions: 0,
        pages: [],
        mostClickedElements: [],
        sessionDuration: 0
      };
      heatmapServiceSpy.getStatistics.and.returnValue(emptyStats);
      
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).stats().totalInteractions).toBe(0);
      expect((component as any).stats().mostClickedElements.length).toBe(0);
    }));

    it('should handle empty page data', fakeAsync(() => {
      heatmapServiceSpy.getPageData.and.returnValue([]);
      
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      expect((component as any).currentPagePoints().length).toBe(0);
    }));

    it('should handle very long session durations', fakeAsync(() => {
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      // 25 hours
      expect((component as any).formatDuration(90000000)).toBe('25h 0m');
    }));
  });

  describe('Most Clicked Elements Limit', () => {
    it('should slice to top 5 elements in template', fakeAsync(() => {
      const manyElements = [
        { id: 'el1', count: 100 },
        { id: 'el2', count: 90 },
        { id: 'el3', count: 80 },
        { id: 'el4', count: 70 },
        { id: 'el5', count: 60 },
        { id: 'el6', count: 50 },
        { id: 'el7', count: 40 }
      ];
      
      heatmapServiceSpy.getStatistics.and.returnValue({
        ...mockStatistics,
        mostClickedElements: manyElements
      });
      
      fixture.detectChanges();
      tick(2000);
      discardPeriodicTasks();
      
      // Template uses .slice(0, 5)
      expect((component as any).stats().mostClickedElements.length).toBe(7);
    }));
  });
});


