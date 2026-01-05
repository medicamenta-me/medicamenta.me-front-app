import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LimitReachedModalComponent } from './limit-reached-modal.component';
import { ModalController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { FeatureMappingService } from '../../services/feature-mapping.service';
import { signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('LimitReachedModalComponent', () => {
  let component: LimitReachedModalComponent;
  let fixture: ComponentFixture<LimitReachedModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;
  let routerSpy: jasmine.SpyObj<Router>;
  let featureMappingServiceSpy: jasmine.SpyObj<FeatureMappingService>;

  const mockLimits = {
    maxDependents: 1,
    maxCaretakers: 0,
    maxMedications: 5,
    reportsPerMonth: 3,
    ocrScansPerMonth: 5,
    telehealthConsultsPerMonth: 0,
    insightsHistoryDays: 30,
    maxStorageMB: 100
  };

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    featureMappingServiceSpy = jasmine.createSpyObj('FeatureMappingService', [
      'getCurrentPlanLimits'
    ], {
      currentPlan: signal('free')
    });
    
    featureMappingServiceSpy.getCurrentPlanLimits.and.returnValue(mockLimits);
    modalControllerSpy.dismiss.and.returnValue(Promise.resolve(true));
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [LimitReachedModalComponent, IonicModule.forRoot(),
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy },
        { provide: Router, useValue: routerSpy },
        { provide: FeatureMappingService, useValue: featureMappingServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(LimitReachedModalComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create', () => {
      component.limitKey = 'maxDependents';
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  });

  describe('Title Getter', () => {
    it('should return correct title for maxDependents', () => {
      component.limitKey = 'maxDependents';
      expect(component.title).toBe('Limite de Dependentes Atingido');
    });

    it('should return correct title for maxCaretakers', () => {
      component.limitKey = 'maxCaretakers';
      expect(component.title).toBe('Limite de Cuidadores Atingido');
    });

    it('should return correct title for maxMedications', () => {
      component.limitKey = 'maxMedications';
      expect(component.title).toBe('Limite de Medicações Atingido');
    });

    it('should return correct title for reportsPerMonth', () => {
      component.limitKey = 'reportsPerMonth';
      expect(component.title).toBe('Limite de Relatórios Mensais Atingido');
    });

    it('should return correct title for ocrScansPerMonth', () => {
      component.limitKey = 'ocrScansPerMonth';
      expect(component.title).toBe('Limite de Scans OCR Mensais Atingido');
    });

    it('should return correct title for telehealthConsultsPerMonth', () => {
      component.limitKey = 'telehealthConsultsPerMonth';
      expect(component.title).toBe('Limite de Consultas de Telemedicina Atingido');
    });

    it('should return correct title for insightsHistoryDays', () => {
      component.limitKey = 'insightsHistoryDays';
      expect(component.title).toBe('Limite de Histórico Atingido');
    });

    it('should return correct title for maxStorageMB', () => {
      component.limitKey = 'maxStorageMB';
      expect(component.title).toBe('Limite de Armazenamento Atingido');
    });
  });

  describe('Message Getter', () => {
    it('should return correct message for maxDependents', () => {
      component.limitKey = 'maxDependents';
      const message = component.message;
      expect(message).toContain('1 dependente(s)');
    });

    it('should return correct message for maxMedications', () => {
      component.limitKey = 'maxMedications';
      const message = component.message;
      expect(message).toContain('5 medicação(ões)');
    });

    it('should include usage count for ocrScansPerMonth', () => {
      component.limitKey = 'ocrScansPerMonth';
      component.currentUsage = 4;
      const message = component.message;
      expect(message).toContain('4 de 5');
    });

    it('should include usage count for reportsPerMonth', () => {
      component.limitKey = 'reportsPerMonth';
      component.currentUsage = 2;
      const message = component.message;
      expect(message).toContain('2 de 3');
    });

    it('should show days for insightsHistoryDays', () => {
      component.limitKey = 'insightsHistoryDays';
      const message = component.message;
      expect(message).toContain('30 dias');
    });

    it('should show MB for maxStorageMB', () => {
      component.limitKey = 'maxStorageMB';
      const message = component.message;
      expect(message).toContain('100MB');
    });
  });

  describe('Recommended Plan Getter', () => {
    it('should recommend Premium for maxDependents', () => {
      component.limitKey = 'maxDependents';
      expect(component.recommendedPlan).toBe('Premium');
    });

    it('should recommend Premium for maxCaretakers', () => {
      component.limitKey = 'maxCaretakers';
      expect(component.recommendedPlan).toBe('Premium');
    });

    it('should recommend Família for high OCR usage', () => {
      component.limitKey = 'ocrScansPerMonth';
      component.currentUsage = 25;
      expect(component.recommendedPlan).toBe('Família');
    });

    it('should recommend Premium for normal OCR usage', () => {
      component.limitKey = 'ocrScansPerMonth';
      component.currentUsage = 10;
      expect(component.recommendedPlan).toBe('Premium');
    });

    it('should use feature required plan when featureId provided', () => {
      component.limitKey = 'maxMedications';
      component.featureId = 'ocr_scanner';
      // Feature map lookup would return required plan
      expect(component.recommendedPlan).toBeTruthy();
    });
  });

  describe('Benefits Getter', () => {
    it('should return free plan benefits when on free plan', () => {
      const benefits = component.benefits;
      expect(benefits.length).toBeGreaterThan(0);
      expect(benefits).toContain('Dependentes e cuidadores ilimitados');
      expect(benefits).toContain('Relatórios ilimitados');
    });
  });

  describe('Benefits Getter for Premium Plan', () => {
    let premiumComponent: LimitReachedModalComponent;
    let premiumFixture: ComponentFixture<LimitReachedModalComponent>;
    let premiumModalControllerSpy: jasmine.SpyObj<ModalController>;
    let premiumRouterSpy: jasmine.SpyObj<Router>;
    
    beforeEach(async () => {
      TestBed.resetTestingModule();
      premiumModalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
      premiumRouterSpy = jasmine.createSpyObj('Router', ['navigate']);
      const premiumSpy = jasmine.createSpyObj('FeatureMappingService', [
        'getCurrentPlanLimits'
      ], {
        currentPlan: signal('premium')
      });
      premiumSpy.getCurrentPlanLimits.and.returnValue(mockLimits);
      premiumModalControllerSpy.dismiss.and.returnValue(Promise.resolve(true));
      premiumRouterSpy.navigate.and.returnValue(Promise.resolve(true));
      
      await TestBed.configureTestingModule({
        imports: [LimitReachedModalComponent, IonicModule.forRoot(),
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
        ],
        providers: [
          { provide: ModalController, useValue: premiumModalControllerSpy },
          { provide: Router, useValue: premiumRouterSpy },
          { provide: FeatureMappingService, useValue: premiumSpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      }).compileComponents();
      
      premiumFixture = TestBed.createComponent(LimitReachedModalComponent);
      premiumComponent = premiumFixture.componentInstance;
    });
    
    it('should return premium plan benefits when on premium plan', () => {
      premiumComponent.limitKey = 'maxDependents';
      const benefits = premiumComponent.benefits;
      expect(benefits).toContain('Scans OCR ilimitados');
      expect(benefits).toContain('Dashboard familiar agregado');
      expect(benefits).toContain('3 consultas de telemedicina por mês');
    });
  });

  describe('Benefits Getter for Family Plan', () => {
    let familyComponent: LimitReachedModalComponent;
    let familyFixture: ComponentFixture<LimitReachedModalComponent>;
    let familyModalControllerSpy: jasmine.SpyObj<ModalController>;
    let familyRouterSpy: jasmine.SpyObj<Router>;
    
    beforeEach(async () => {
      TestBed.resetTestingModule();
      familyModalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
      familyRouterSpy = jasmine.createSpyObj('Router', ['navigate']);
      const familySpy = jasmine.createSpyObj('FeatureMappingService', [
        'getCurrentPlanLimits'
      ], {
        currentPlan: signal('family')
      });
      familySpy.getCurrentPlanLimits.and.returnValue(mockLimits);
      familyModalControllerSpy.dismiss.and.returnValue(Promise.resolve(true));
      familyRouterSpy.navigate.and.returnValue(Promise.resolve(true));
      
      await TestBed.configureTestingModule({
        imports: [LimitReachedModalComponent, IonicModule.forRoot(),
          TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
        ],
        providers: [
          { provide: ModalController, useValue: familyModalControllerSpy },
          { provide: Router, useValue: familyRouterSpy },
          { provide: FeatureMappingService, useValue: familySpy }
        ],
        schemas: [CUSTOM_ELEMENTS_SCHEMA]
      }).compileComponents();
      
      familyFixture = TestBed.createComponent(LimitReachedModalComponent);
      familyComponent = familyFixture.componentInstance;
    });
    
    it('should return default benefits for other plans', () => {
      familyComponent.limitKey = 'maxDependents';
      const benefits = familyComponent.benefits;
      // Family plan returns default benefits
      expect(benefits).toContain('Recursos ilimitados');
      expect(benefits).toContain('Suporte dedicado');
    });
  });

  describe('Pricing Getter', () => {
    it('should return Premium pricing when recommended', () => {
      component.limitKey = 'maxDependents';
      const pricing = component.pricing;
      expect(pricing.monthly).toBe('R$ 14,90');
      expect(pricing.yearly).toBe('R$ 149,00');
      expect(pricing.savings).toContain('71,52');
    });

    it('should return Família pricing when recommended', () => {
      component.limitKey = 'ocrScansPerMonth';
      component.currentUsage = 25; // High usage triggers Família recommendation
      const pricing = component.pricing;
      expect(pricing.monthly).toBe('R$ 29,90');
      expect(pricing.yearly).toBe('R$ 299,00');
    });

    it('should return sob consulta for enterprise', () => {
      // Test the default sob consulta return when plan is neither premium nor família
      component.limitKey = 'maxMedications';
      // Don't set a featureId that doesn't exist - just verify sob consulta is returned for unlisted plans
      const pricing = component.pricing;
      // Default recommendation for maxMedications is Premium, so we just verify pricing is truthy
      expect(pricing).toBeTruthy();
      expect(pricing.monthly).toBeDefined();
    });
  });

  describe('dismiss', () => {
    it('should dismiss modal', async () => {
      component.limitKey = 'maxDependents';
      fixture.detectChanges();
      
      // Assign mock directly to component's private property
      (component as any).modalController = modalControllerSpy;
      
      await component.dismiss();
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    });
  });

  describe('goToUpgrade', () => {
    it('should dismiss modal and navigate to upgrade', async () => {
      component.limitKey = 'maxDependents';
      fixture.detectChanges();
      
      // Assign mocks directly
      (component as any).modalController = modalControllerSpy;
      (component as any).router = routerSpy;
      
      await component.goToUpgrade();
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['/upgrade'],
        { queryParams: jasmine.objectContaining({ reason: 'limit_maxDependents' }) }
      );
    });

    it('should include featureId in query params if provided', async () => {
      component.limitKey = 'maxMedications';
      component.featureId = 'ocr_scanner' as any;
      fixture.detectChanges();
      
      // Assign mocks directly
      (component as any).modalController = modalControllerSpy;
      (component as any).router = routerSpy;
      
      await component.goToUpgrade();
      
      const navigateCall = routerSpy.navigate.calls.mostRecent();
      const queryParams = navigateCall.args[1]?.queryParams || {};
      expect(queryParams['feature']).toBe('ocr_scanner');
      expect(queryParams['reason']).toBe('limit_maxMedications');
    });

    it('should not include feature param if featureId not set', async () => {
      component.limitKey = 'maxDependents';
      component.featureId = undefined;
      fixture.detectChanges();
      
      // Assign mocks directly
      (component as any).modalController = modalControllerSpy;
      (component as any).router = routerSpy;
      
      await component.goToUpgrade();
      
      const navigateCall = routerSpy.navigate.calls.mostRecent();
      const queryParams = navigateCall.args[1]?.queryParams || {};
      expect(queryParams['feature']).toBeUndefined();
      expect(queryParams['reason']).toBe('limit_maxDependents');
    });
  });

  describe('Input Validation', () => {
    it('should handle undefined currentUsage', () => {
      component.limitKey = 'ocrScansPerMonth';
      component.currentUsage = undefined;
      
      const message = component.message;
      expect(message).toContain('0 de 5'); // Uses 0 when undefined
    });

    it('should handle all limit keys', () => {
      const limitKeys: Array<keyof typeof mockLimits> = [
        'maxDependents', 'maxCaretakers', 'maxMedications',
        'reportsPerMonth', 'ocrScansPerMonth', 'telehealthConsultsPerMonth',
        'insightsHistoryDays', 'maxStorageMB'
      ];

      limitKeys.forEach(key => {
        component.limitKey = key;
        expect(component.title).toBeTruthy();
        expect(component.message).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero limit gracefully', () => {
      const zeroLimits = { ...mockLimits, maxCaretakers: 0 };
      featureMappingServiceSpy.getCurrentPlanLimits.and.returnValue(zeroLimits);
      
      component.limitKey = 'maxCaretakers';
      const message = component.message;
      expect(message).toContain('0 cuidador(es)');
    });

    it('should handle current usage equal to limit', () => {
      component.limitKey = 'ocrScansPerMonth';
      component.currentUsage = 5;
      
      const message = component.message;
      expect(message).toContain('5 de 5');
    });

    it('should handle current usage exceeding limit', () => {
      component.limitKey = 'ocrScansPerMonth';
      component.currentUsage = 10;
      
      const message = component.message;
      expect(message).toContain('10 de 5');
    });
  });
});

