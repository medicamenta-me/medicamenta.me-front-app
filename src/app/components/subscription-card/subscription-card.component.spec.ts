import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { SubscriptionCardComponent } from './subscription-card.component';
import { SubscriptionService } from '../../services/subscription.service';
import { StripeService } from '../../services/stripe.service';

type PlanType = 'free' | 'premium' | 'family' | 'enterprise';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(): Observable<any> {
    return of({
      COMMON: { ERROR: 'Erro' },
      MANAGE_SUBSCRIPTION: {
        MESSAGES: {
          PORTAL_ERROR_GENERIC: 'Erro ao abrir portal',
          CANCEL_CONFIRM_HEADER: 'Confirmar cancelamento',
          CANCEL_CONFIRM_MESSAGE: 'Tem certeza que deseja cancelar?',
          CANCEL_KEEP: 'Manter',
          CANCEL_YES: 'Sim, cancelar'
        }
      }
    });
  }
}

describe('SubscriptionCardComponent', () => {
  let component: SubscriptionCardComponent;
  let fixture: ComponentFixture<SubscriptionCardComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSubscriptionService: { currentPlan: WritableSignal<PlanType>; subscription: WritableSignal<any> };
  let mockStripeService: jasmine.SpyObj<StripeService>;
  let mockAlertController: jasmine.SpyObj<AlertController>;
  let mockTranslate: jasmine.SpyObj<TranslateService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    mockSubscriptionService = {
      currentPlan: signal<PlanType>('premium'),
      subscription: signal({
        status: 'active',
        currentPeriodEnd: { toDate: () => new Date('2024-02-15') }
      })
    };

    mockStripeService = jasmine.createSpyObj('StripeService', ['createBillingPortalSession']);
    mockStripeService.createBillingPortalSession.and.returnValue(Promise.resolve());

    const mockAlert = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    mockAlertController = jasmine.createSpyObj('AlertController', ['create']);
    mockAlertController.create.and.returnValue(Promise.resolve(mockAlert as any));

    mockTranslate = jasmine.createSpyObj('TranslateService', ['instant']);
    mockTranslate.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [
        SubscriptionCardComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: StripeService, useValue: mockStripeService },
        { provide: AlertController, useValue: mockAlertController },
        { provide: TranslateService, useValue: mockTranslate }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Current Plan', () => {
    it('should return current plan from service', () => {
      expect(component.currentPlan()).toBe('premium');
    });

    it('should update when plan changes', () => {
      mockSubscriptionService.currentPlan.set('family');
      fixture.detectChanges();
      
      expect(component.currentPlan()).toBe('family');
    });
  });

  describe('Is Loading', () => {
    it('should return false when subscription exists', () => {
      expect(component.isLoading()).toBeFalse();
    });

    it('should return true when subscription is null', () => {
      mockSubscriptionService.subscription.set(null);
      fixture.detectChanges();
      
      expect(component.isLoading()).toBeTrue();
    });
  });

  describe('Is Premium Or Higher', () => {
    it('should return true for premium plan', () => {
      mockSubscriptionService.currentPlan.set('premium');
      fixture.detectChanges();
      
      expect(component.isPremiumOrHigher()).toBeTrue();
    });

    it('should return true for family plan', () => {
      mockSubscriptionService.currentPlan.set('family');
      fixture.detectChanges();
      
      expect(component.isPremiumOrHigher()).toBeTrue();
    });

    it('should return true for enterprise plan', () => {
      mockSubscriptionService.currentPlan.set('enterprise');
      fixture.detectChanges();
      
      expect(component.isPremiumOrHigher()).toBeTrue();
    });

    it('should return false for free plan', () => {
      mockSubscriptionService.currentPlan.set('free');
      fixture.detectChanges();
      
      expect(component.isPremiumOrHigher()).toBeFalse();
    });
  });

  describe('Plan Name', () => {
    it('should return "Premium" for premium plan', () => {
      mockSubscriptionService.currentPlan.set('premium');
      fixture.detectChanges();
      
      expect(component.planName()).toBe('Premium');
    });

    it('should return "Family" for family plan', () => {
      mockSubscriptionService.currentPlan.set('family');
      fixture.detectChanges();
      
      expect(component.planName()).toBe('Family');
    });

    it('should return "Enterprise" for enterprise plan', () => {
      mockSubscriptionService.currentPlan.set('enterprise');
      fixture.detectChanges();
      
      expect(component.planName()).toBe('Enterprise');
    });

    it('should return "Gratuito" for free plan', () => {
      mockSubscriptionService.currentPlan.set('free');
      fixture.detectChanges();
      
      expect(component.planName()).toBe('Gratuito');
    });

    it('should return "Desconhecido" for unknown plan', () => {
      mockSubscriptionService.currentPlan.set('unknown' as any);
      fixture.detectChanges();
      
      expect(component.planName()).toBe('Desconhecido');
    });
  });

  describe('Plan Badge', () => {
    it('should return uppercase plan name', () => {
      mockSubscriptionService.currentPlan.set('premium');
      fixture.detectChanges();
      
      expect(component.planBadge()).toBe('PREMIUM');
    });
  });

  describe('Badge Color', () => {
    it('should return "primary" for premium', () => {
      mockSubscriptionService.currentPlan.set('premium');
      fixture.detectChanges();
      
      expect(component.badgeColor()).toBe('primary');
    });

    it('should return "success" for family', () => {
      mockSubscriptionService.currentPlan.set('family');
      fixture.detectChanges();
      
      expect(component.badgeColor()).toBe('success');
    });

    it('should return "warning" for enterprise', () => {
      mockSubscriptionService.currentPlan.set('enterprise');
      fixture.detectChanges();
      
      expect(component.badgeColor()).toBe('warning');
    });

    it('should return "medium" for unknown plan', () => {
      mockSubscriptionService.currentPlan.set('free');
      fixture.detectChanges();
      
      expect(component.badgeColor()).toBe('medium');
    });
  });

  describe('Billing Cycle Name', () => {
    it('should return "Mensal" when subscription exists', () => {
      expect(component.billingCycleName()).toBe('Mensal');
    });

    it('should return "-" when subscription is null', () => {
      mockSubscriptionService.subscription.set(null);
      fixture.detectChanges();
      
      expect(component.billingCycleName()).toBe('-');
    });
  });

  describe('Next Payment Date', () => {
    it('should return date from subscription', () => {
      const result = component.nextPaymentDate();
      expect(result).toEqual(new Date('2024-02-15'));
    });

    it('should return null when subscription is null', () => {
      mockSubscriptionService.subscription.set(null);
      fixture.detectChanges();
      
      expect(component.nextPaymentDate()).toBeNull();
    });

    it('should return null when currentPeriodEnd is null', () => {
      mockSubscriptionService.subscription.set({ status: 'active', currentPeriodEnd: null });
      fixture.detectChanges();
      
      expect(component.nextPaymentDate()).toBeNull();
    });
  });

  describe('Subscription Status', () => {
    it('should return status from subscription', () => {
      expect(component.subscriptionStatus()).toBe('active');
    });

    it('should return undefined when subscription is null', () => {
      mockSubscriptionService.subscription.set(null);
      fixture.detectChanges();
      
      expect(component.subscriptionStatus()).toBeUndefined();
    });
  });

  describe('Status Name', () => {
    it('should return "Ativa" for active status', () => {
      mockSubscriptionService.subscription.set({ status: 'active' });
      fixture.detectChanges();
      
      expect(component.statusName()).toBe('Ativa');
    });

    it('should return "Em Teste" for trialing status', () => {
      mockSubscriptionService.subscription.set({ status: 'trialing' });
      fixture.detectChanges();
      
      expect(component.statusName()).toBe('Em Teste');
    });

    it('should return "Pagamento Pendente" for past_due status', () => {
      mockSubscriptionService.subscription.set({ status: 'past_due' });
      fixture.detectChanges();
      
      expect(component.statusName()).toBe('Pagamento Pendente');
    });

    it('should return "Cancelada" for canceled status', () => {
      mockSubscriptionService.subscription.set({ status: 'canceled' });
      fixture.detectChanges();
      
      expect(component.statusName()).toBe('Cancelada');
    });

    it('should return "Incompleta" for incomplete status', () => {
      mockSubscriptionService.subscription.set({ status: 'incomplete' });
      fixture.detectChanges();
      
      expect(component.statusName()).toBe('Incompleta');
    });

    it('should return "-" when status is null', () => {
      mockSubscriptionService.subscription.set(null);
      fixture.detectChanges();
      
      expect(component.statusName()).toBe('-');
    });
  });

  describe('Upgrade', () => {
    it('should navigate to upgrade page', () => {
      component.upgrade();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/upgrade']);
    });
  });

  describe('Manage Billing', () => {
    it('should call stripeService to create billing portal', fakeAsync(() => {
      component.manageBilling();
      tick();
      
      expect(mockStripeService.createBillingPortalSession).toHaveBeenCalled();
    }));

    it('should show alert on error', fakeAsync(() => {
      mockStripeService.createBillingPortalSession.and.returnValue(Promise.reject(new Error('Portal error')));
      
      component.manageBilling();
      tick();
      
      expect(mockAlertController.create).toHaveBeenCalled();
    }));
  });

  describe('Confirm Cancel', () => {
    it('should show confirmation alert', fakeAsync(() => {
      component.confirmCancel();
      tick();
      
      expect(mockAlertController.create).toHaveBeenCalled();
      const alertConfig = mockAlertController.create.calls.mostRecent().args[0];
      expect(alertConfig?.buttons?.length).toBe(2);
    }));
  });

  describe('DOM Rendering - Premium Plan', () => {
    beforeEach(() => {
      mockSubscriptionService.currentPlan.set('premium');
      mockSubscriptionService.subscription.set({
        status: 'active',
        currentPeriodEnd: { toDate: () => new Date('2024-02-15') }
      });
      fixture.detectChanges();
    });

    it('should render subscription card', () => {
      const card = fixture.nativeElement.querySelector('[data-cy="subscription-card"]');
      expect(card).toBeTruthy();
    });

    it('should render plan badge', () => {
      const badge = fixture.nativeElement.querySelector('[data-cy="plan-badge"]');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('PREMIUM');
    });

    it('should render subscription info', () => {
      const info = fixture.nativeElement.querySelector('[data-cy="subscription-info"]');
      expect(info).toBeTruthy();
    });

    it('should render current plan', () => {
      const planName = fixture.nativeElement.querySelector('[data-cy="plan-name"]');
      expect(planName).toBeTruthy();
      expect(planName.textContent).toBe('Premium');
    });

    it('should render billing cycle', () => {
      const cycle = fixture.nativeElement.querySelector('[data-cy="billing-cycle"]');
      expect(cycle).toBeTruthy();
    });

    it('should render next billing date', () => {
      const billing = fixture.nativeElement.querySelector('[data-cy="next-billing"]');
      expect(billing).toBeTruthy();
    });

    it('should render subscription status', () => {
      const status = fixture.nativeElement.querySelector('[data-cy="subscription-status"]');
      expect(status).toBeTruthy();
      expect(status.textContent).toBe('Ativa');
    });

    it('should render manage subscription button', () => {
      const btn = fixture.nativeElement.querySelector('[data-cy="manage-subscription-btn"]');
      expect(btn).toBeTruthy();
    });

    it('should render cancel button', () => {
      const btn = fixture.nativeElement.querySelector('[data-cy="cancel-subscription-btn"]');
      expect(btn).toBeTruthy();
    });
  });

  describe('DOM Rendering - Free Plan', () => {
    beforeEach(() => {
      mockSubscriptionService.currentPlan.set('free');
      fixture.detectChanges();
    });

    it('should NOT render plan badge', () => {
      const badge = fixture.nativeElement.querySelector('[data-cy="plan-badge"]');
      expect(badge).toBeNull();
    });

    it('should render upgrade button', () => {
      const btn = fixture.nativeElement.querySelector('[data-cy="upgrade-btn"]');
      expect(btn).toBeTruthy();
    });

    it('should NOT render manage subscription button', () => {
      const btn = fixture.nativeElement.querySelector('[data-cy="manage-subscription-btn"]');
      expect(btn).toBeNull();
    });
  });

  describe('DOM Rendering - Loading State', () => {
    beforeEach(() => {
      mockSubscriptionService.subscription.set(null);
      fixture.detectChanges();
    });

    it('should render loading spinner', () => {
      const loading = fixture.nativeElement.querySelector('[data-cy="subscription-loading"]');
      expect(loading).toBeTruthy();
    });

    it('should NOT render subscription info', () => {
      const info = fixture.nativeElement.querySelector('[data-cy="subscription-info"]');
      expect(info).toBeNull();
    });
  });

  describe('Button Interactions', () => {
    it('should call upgrade when upgrade button clicked', () => {
      mockSubscriptionService.currentPlan.set('free');
      fixture.detectChanges();
      
      spyOn(component, 'upgrade');
      const btn = fixture.nativeElement.querySelector('[data-cy="upgrade-btn"]');
      btn.click();
      
      expect(component.upgrade).toHaveBeenCalled();
    });

    it('should call manageBilling when manage button clicked', fakeAsync(() => {
      spyOn(component, 'manageBilling');
      const btn = fixture.nativeElement.querySelector('[data-cy="manage-subscription-btn"]');
      btn.click();
      tick();
      
      expect(component.manageBilling).toHaveBeenCalled();
    }));

    it('should call confirmCancel when cancel button clicked', fakeAsync(() => {
      spyOn(component, 'confirmCancel');
      const btn = fixture.nativeElement.querySelector('[data-cy="cancel-subscription-btn"]');
      btn.click();
      tick();
      
      expect(component.confirmCancel).toHaveBeenCalled();
    }));
  });
});
