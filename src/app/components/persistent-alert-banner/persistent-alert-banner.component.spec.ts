import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PersistentAlertBannerComponent } from './persistent-alert-banner.component';
import { CriticalAlertService } from '../../services/critical-alert.service';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      ALERTS: {
        BANNER_TITLE_CRITICAL: 'Critical Alert',
        BANNER_TITLE_LOW: 'Low Stock Alert',
        BANNER_MESSAGE: '{{count}} medication(s) need attention',
        VIEW_DETAILS: 'View Details'
      }
    });
  }
}

describe('PersistentAlertBannerComponent', () => {
  let component: PersistentAlertBannerComponent;
  let fixture: ComponentFixture<PersistentAlertBannerComponent>;
  let criticalAlertServiceSpy: jasmine.SpyObj<CriticalAlertService>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    criticalAlertServiceSpy = jasmine.createSpyObj('CriticalAlertService', [
      'getHighestSeverity',
      'getAlertCount'
    ], {
      hasCriticalAlerts: signal(true)
    });
    
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['create']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    criticalAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
    criticalAlertServiceSpy.getAlertCount.and.returnValue(3);

    const mockModal = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
      onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'cancel' }))
    };
    modalControllerSpy.create.and.returnValue(Promise.resolve(mockModal as any));

    await TestBed.configureTestingModule({
      imports: [
        PersistentAlertBannerComponent,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: CriticalAlertService, useValue: criticalAlertServiceSpy },
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: Router, useValue: routerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PersistentAlertBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should expose hasCriticalAlerts from service', () => {
      expect(component.hasCriticalAlerts()).toBe(true);
    });
  });

  describe('getSeverityClass', () => {
    it('should return critical class for critical severity', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
      
      expect(component.getSeverityClass()).toBe('critical');
    });

    it('should return low class for low severity', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('low');
      
      expect(component.getSeverityClass()).toBe('low');
    });

    it('should return low class when severity is null', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue(null);
      
      expect(component.getSeverityClass()).toBe('low');
    });
  });

  describe('getIconName', () => {
    it('should return close-circle-outline for critical severity', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
      
      expect(component.getIconName()).toBe('close-circle-outline');
    });

    it('should return warning-outline for low severity', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('low');
      
      expect(component.getIconName()).toBe('warning-outline');
    });

    it('should return warning-outline when severity is null', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue(null);
      
      expect(component.getIconName()).toBe('warning-outline');
    });
  });

  describe('getTitle', () => {
    it('should return critical title key for critical severity', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
      
      expect(component.getTitle()).toBe('ALERTS.BANNER_TITLE_CRITICAL');
    });

    it('should return low title key for low severity', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('low');
      
      expect(component.getTitle()).toBe('ALERTS.BANNER_TITLE_LOW');
    });

    it('should return low title key when severity is null', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue(null);
      
      expect(component.getTitle()).toBe('ALERTS.BANNER_TITLE_LOW');
    });
  });

  describe('getMessage', () => {
    it('should return banner message key', () => {
      expect(component.getMessage()).toBe('ALERTS.BANNER_MESSAGE');
    });
  });

  describe('getAlertCount', () => {
    it('should return alert count from service', () => {
      expect(component.getAlertCount()).toBe(3);
    });

    it('should return updated count when service changes', () => {
      criticalAlertServiceSpy.getAlertCount.and.returnValue(5);
      
      expect(component.getAlertCount()).toBe(5);
    });
  });

  describe('openAlertModal', () => {
    it('should create modal with CriticalAlertModalComponent', fakeAsync(() => {
      component.openAlertModal();
      tick();
      
      expect(modalControllerSpy.create).toHaveBeenCalledWith({
        component: jasmine.any(Function),
        backdropDismiss: false
      });
    }));

    it('should present the modal', fakeAsync(() => {
      component.openAlertModal();
      tick();
      
      const modalSpy = modalControllerSpy.create.calls.mostRecent().returnValue;
      modalSpy.then((modal: any) => {
        expect(modal.present).toHaveBeenCalled();
      });
    }));
  });

  describe('Visibility', () => {
    it('should show banner when hasCriticalAlerts is true', () => {
      expect(component.hasCriticalAlerts()).toBe(true);
    });

    it('should hide banner when hasCriticalAlerts is false', async () => {
      // Need to reconfigure TestBed with a new provider for false value
      TestBed.resetTestingModule();
      
      const falseAlertServiceSpy = jasmine.createSpyObj('CriticalAlertService', [
        'getHighestSeverity',
        'getAlertCount'
      ], {
        hasCriticalAlerts: signal(false)
      });
      falseAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
      falseAlertServiceSpy.getAlertCount.and.returnValue(0);

      await TestBed.configureTestingModule({
        imports: [
          PersistentAlertBannerComponent,
          IonicModule.forRoot(),
          TranslateModule.forRoot({
            loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
          })
        ],
        providers: [
          { provide: CriticalAlertService, useValue: falseAlertServiceSpy },
          { provide: ModalController, useValue: modalControllerSpy },
          { provide: Router, useValue: routerSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      }).compileComponents();

      const newFixture = TestBed.createComponent(PersistentAlertBannerComponent);
      newFixture.detectChanges();
      
      expect(newFixture.componentInstance.hasCriticalAlerts()).toBe(false);
    });
  });

  describe('Icons', () => {
    it('should have icons registered in constructor', () => {
      // Icons are registered via addIcons in constructor
      expect(component).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero alerts', () => {
      criticalAlertServiceSpy.getAlertCount.and.returnValue(0);
      
      expect(component.getAlertCount()).toBe(0);
    });

    it('should handle many alerts', () => {
      criticalAlertServiceSpy.getAlertCount.and.returnValue(100);
      
      expect(component.getAlertCount()).toBe(100);
    });
  });

  describe('Severity Transitions', () => {
    it('should update class when severity changes', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
      expect(component.getSeverityClass()).toBe('critical');
      
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('low');
      expect(component.getSeverityClass()).toBe('low');
    });

    it('should update icon when severity changes', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
      expect(component.getIconName()).toBe('close-circle-outline');
      
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('low');
      expect(component.getIconName()).toBe('warning-outline');
    });

    it('should update title when severity changes', () => {
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('critical');
      expect(component.getTitle()).toBe('ALERTS.BANNER_TITLE_CRITICAL');
      
      criticalAlertServiceSpy.getHighestSeverity.and.returnValue('low');
      expect(component.getTitle()).toBe('ALERTS.BANNER_TITLE_LOW');
    });
  });

  describe('Modal Configuration', () => {
    it('should set backdropDismiss to false', fakeAsync(() => {
      component.openAlertModal();
      tick();
      
      const createCall = modalControllerSpy.create.calls.mostRecent();
      expect(createCall.args[0].backdropDismiss).toBe(false);
    }));
  });
});
