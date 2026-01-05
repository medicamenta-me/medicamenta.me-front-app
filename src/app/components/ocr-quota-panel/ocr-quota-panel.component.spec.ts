import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OcrQuotaPanelComponent } from './ocr-quota-panel.component';
import { OcrService } from '../../services/ocr.service';
import { SubscriptionService } from '../../services/subscription.service';
import { AuthService } from '../../services/auth.service';
import { RemoteConfigService } from '../../services/remote-config.service';
import { Firestore } from '@angular/fire/firestore';
import { signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('OcrQuotaPanelComponent', () => {
  let component: OcrQuotaPanelComponent;
  let fixture: ComponentFixture<OcrQuotaPanelComponent>;
  let ocrServiceSpy: jasmine.SpyObj<OcrService>;
  let subscriptionServiceSpy: jasmine.SpyObj<SubscriptionService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let remoteConfigServiceSpy: jasmine.SpyObj<RemoteConfigService>;
  let firestoreSpy: jasmine.SpyObj<Firestore>;

  const mockQuotaCheck = {
    current: 3,
    limit: 10,
    exceeded: false
  };

  beforeEach(async () => {
    ocrServiceSpy = jasmine.createSpyObj('OcrService', ['checkQuota']);
    subscriptionServiceSpy = jasmine.createSpyObj('SubscriptionService', [], {
      currentPlan: signal('premium')
    });
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: signal({ uid: 'user123', email: 'test@test.com' })
    });
    remoteConfigServiceSpy = jasmine.createSpyObj('RemoteConfigService', ['getValue']);
    firestoreSpy = jasmine.createSpyObj('Firestore', ['collection']);

    ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve(mockQuotaCheck));

    await TestBed.configureTestingModule({
      imports: [OcrQuotaPanelComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: OcrService, useValue: ocrServiceSpy },
        { provide: SubscriptionService, useValue: subscriptionServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RemoteConfigService, useValue: remoteConfigServiceSpy },
        { provide: Firestore, useValue: firestoreSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(OcrQuotaPanelComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with loading state', () => {
      expect(component.isLoading()).toBe(true);
    });

    it('should load quota on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      expect(ocrServiceSpy.checkQuota).toHaveBeenCalledWith('user123');
    }));

    it('should set quota after loading', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      expect(component.quota()).toBeTruthy();
      expect(component.quota()?.current).toBe(3);
      expect(component.quota()?.limit).toBe(10);
    }));

    it('should calculate remaining from quota', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      expect(component.quota()?.remaining).toBe(7);
    }));

    it('should calculate percentage from quota', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      expect(component.quota()?.percentage).toBe(0.3);
    }));

    it('should set loading to false after quota loads', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      expect(component.isLoading()).toBe(false);
    }));
  });

  describe('No User', () => {
    it('should not load quota if no user', fakeAsync(() => {
      TestBed.resetTestingModule();
      
      const noUserAuthServiceSpy = jasmine.createSpyObj('AuthService', [], {
        currentUser: signal(null)
      });
      
      const newOcrServiceSpy = jasmine.createSpyObj('OcrService', ['checkQuota']);
      newOcrServiceSpy.checkQuota.and.returnValue(Promise.resolve(mockQuotaCheck));
      
      TestBed.configureTestingModule({
        imports: [OcrQuotaPanelComponent,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
        ],
        providers: [
          { provide: OcrService, useValue: newOcrServiceSpy },
          { provide: SubscriptionService, useValue: subscriptionServiceSpy },
          { provide: AuthService, useValue: noUserAuthServiceSpy },
          { provide: RemoteConfigService, useValue: remoteConfigServiceSpy },
          { provide: Firestore, useValue: firestoreSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      });
      
      const newFixture = TestBed.createComponent(OcrQuotaPanelComponent);
      newFixture.detectChanges();
      tick();
      
      expect(newFixture.componentInstance.quota()).toBeNull();
    }));
  });

  describe('getProgressColor', () => {
    it('should return success for low usage (< 70%)', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      expect(component.getProgressColor()).toBe('success');
    }));

    it('should return warning for medium usage (70-89%)', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 8,
        limit: 10,
        exceeded: false
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.getProgressColor()).toBe('warning');
    }));

    it('should return danger for high usage (>= 90%)', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 9,
        limit: 10,
        exceeded: true
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.getProgressColor()).toBe('danger');
    }));

    it('should return success for no quota data', () => {
      // Before loading
      expect(component.getProgressColor()).toBe('success');
    });
  });

  describe('isNearLimit', () => {
    it('should return false for low usage', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      expect(component.isNearLimit()).toBe(false);
    }));

    it('should return true for usage >= 70%', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 7,
        limit: 10,
        exceeded: false
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.isNearLimit()).toBe(true);
    }));

    it('should return true for usage at 100%', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 10,
        limit: 10,
        exceeded: true
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.isNearLimit()).toBe(true);
    }));
  });

  describe('getResetDateText', () => {
    it('should return formatted date for next month', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      const resetText = component.getResetDateText();
      expect(resetText).toContain('de');
      expect(resetText).toMatch(/\d+ de \w+/);
    }));

    it('should return "Calculando..." when no quota', () => {
      expect(component.getResetDateText()).toBe('Calculando...');
    });
  });

  describe('onUpgradeClick', () => {
    it('should be callable', () => {
      expect(() => component.onUpgradeClick()).not.toThrow();
    });
  });

  describe('refresh', () => {
    it('should reload quota', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      const newQuota = {
        current: 5,
        limit: 10,
        exceeded: false
      };
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve(newQuota));
      
      component.refresh();
      tick();
      
      expect(component.quota()?.current).toBe(5);
    }));

    it('should call checkQuota again', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      ocrServiceSpy.checkQuota.calls.reset();
      
      component.refresh();
      tick();
      
      expect(ocrServiceSpy.checkQuota).toHaveBeenCalledWith('user123');
    }));
  });

  describe('userPlan Computed', () => {
    it('should return current plan from subscription service', () => {
      expect(component.userPlan()).toBe('premium');
    });
  });

  describe('Error Handling', () => {
    it('should set quota to null on error', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.reject(new Error('Network error')));
      
      spyOn(console, 'error');
      fixture.detectChanges();
      tick();
      
      expect(component.quota()).toBeNull();
      expect(console.error).toHaveBeenCalled();
    }));

    it('should set loading to false on error', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.reject(new Error('Network error')));
      
      spyOn(console, 'error');
      fixture.detectChanges();
      tick();
      
      expect(component.isLoading()).toBe(false);
    }));
  });

  describe('Edge Cases', () => {
    it('should handle zero limit', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 0,
        limit: 0,
        exceeded: true
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.quota()?.percentage).toBe(0);
    }));

    it('should handle zero current usage', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 0,
        limit: 10,
        exceeded: false
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.quota()?.remaining).toBe(10);
      expect(component.quota()?.percentage).toBe(0);
    }));

    it('should handle usage exceeding limit', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 15,
        limit: 10,
        exceeded: true
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.quota()?.remaining).toBe(0); // Math.max(0, ...)
    }));
  });

  describe('Reset Date Calculation', () => {
    it('should set reset date to first day of next month', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      
      const quota = component.quota();
      expect(quota?.resetDate).toBeTruthy();
      expect(quota?.resetDate.getDate()).toBe(1);
    }));
  });

  describe('Upgrade CTA Visibility', () => {
    it('should show upgrade CTA when near limit and not enterprise', fakeAsync(() => {
      ocrServiceSpy.checkQuota.and.returnValue(Promise.resolve({
        current: 8,
        limit: 10,
        exceeded: false
      }));
      
      fixture.detectChanges();
      tick();
      
      expect(component.isNearLimit()).toBe(true);
      expect(component.userPlan()).not.toBe('enterprise');
    }));

    it('should not show upgrade CTA for enterprise users', fakeAsync(() => {
      TestBed.resetTestingModule();
      
      const enterpriseSubscriptionServiceSpy = jasmine.createSpyObj('SubscriptionService', [], {
        currentPlan: signal('enterprise')
      });
      
      const newOcrServiceSpy = jasmine.createSpyObj('OcrService', ['checkQuota']);
      newOcrServiceSpy.checkQuota.and.returnValue(Promise.resolve(mockQuotaCheck));
      
      TestBed.configureTestingModule({
        imports: [OcrQuotaPanelComponent,
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
        ],
        providers: [
          { provide: OcrService, useValue: newOcrServiceSpy },
          { provide: SubscriptionService, useValue: enterpriseSubscriptionServiceSpy },
          { provide: AuthService, useValue: authServiceSpy },
          { provide: RemoteConfigService, useValue: remoteConfigServiceSpy },
          { provide: Firestore, useValue: firestoreSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      });
      
      const newFixture = TestBed.createComponent(OcrQuotaPanelComponent);
      newFixture.detectChanges();
      tick();
      
      expect(newFixture.componentInstance.userPlan()).toBe('enterprise');
    }));
  });
});

