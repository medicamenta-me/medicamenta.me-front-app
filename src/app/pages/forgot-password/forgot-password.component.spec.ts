import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule, ToastController } from '@ionic/angular';
import { ForgotPasswordComponent } from './forgot-password.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let mockRouter: Router;
  let mockToastController: jasmine.SpyObj<ToastController>;
  let mockToast: any;

  beforeEach(async () => {
    mockToast = {
      present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
    };
    mockToastController = jasmine.createSpyObj('ToastController', ['create']);
    mockToastController.create.and.returnValue(Promise.resolve(mockToast as any));

    await TestBed.configureTestingModule({
      imports: [
        ForgotPasswordComponent,
        ReactiveFormsModule,
        IonicModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        { provide: ToastController, useValue: mockToastController }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(mockRouter, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize form with email control', () => {
      expect(component.forgotPasswordForm).toBeTruthy();
      expect(component.forgotPasswordForm.get('email')).toBeTruthy();
    });

    it('should have loading as false initially', () => {
      expect(component.loading()).toBeFalse();
    });
  });

  describe('Form Validation', () => {
    it('should be invalid when email is empty', () => {
      component.forgotPasswordForm.get('email')?.setValue('');
      expect(component.forgotPasswordForm.invalid).toBeTrue();
    });

    it('should be invalid when email format is incorrect', () => {
      component.forgotPasswordForm.get('email')?.setValue('invalid-email');
      expect(component.forgotPasswordForm.get('email')?.hasError('email')).toBeTrue();
    });

    it('should be valid when email format is correct', () => {
      component.forgotPasswordForm.get('email')?.setValue('test@example.com');
      expect(component.forgotPasswordForm.valid).toBeTrue();
    });

    it('should have required error when email is touched and empty', () => {
      const emailControl = component.forgotPasswordForm.get('email');
      emailControl?.markAsTouched();
      emailControl?.setValue('');
      
      expect(emailControl?.hasError('required')).toBeTrue();
    });
  });

  describe('sendResetEmail', () => {
    it('should not proceed when form is invalid', () => {
      component.forgotPasswordForm.get('email')?.setValue('');
      
      component.sendResetEmail();
      
      // Loading should not have been set to true when form is invalid
      expect(component.loading()).toBeFalse();
    });

    it('should set loading to true when form is valid and submission begins', fakeAsync(() => {
      component.forgotPasswordForm.get('email')?.setValue('test@example.com');
      
      component.sendResetEmail();
      
      // Loading should be true immediately after calling sendResetEmail
      expect(component.loading()).toBeTrue();
      
      // Flush all pending async operations
      flush();
    }));

    it('should handle valid email format', () => {
      component.forgotPasswordForm.get('email')?.setValue('valid@email.com');
      expect(component.forgotPasswordForm.valid).toBeTrue();
    });

    it('should reject invalid email format', () => {
      component.forgotPasswordForm.get('email')?.setValue('invalid-email');
      expect(component.forgotPasswordForm.get('email')?.hasError('email')).toBeTrue();
    });

    it('should require email field', () => {
      component.forgotPasswordForm.get('email')?.setValue('');
      expect(component.forgotPasswordForm.get('email')?.hasError('required')).toBeTrue();
    });
  });

  describe('DOM Rendering', () => {
    it('should render form', () => {
      const form = fixture.nativeElement.querySelector('form');
      expect(form).toBeTruthy();
    });

    it('should render email input', () => {
      const input = fixture.nativeElement.querySelector('ion-input[formControlName="email"]');
      expect(input).toBeTruthy();
    });

    it('should render submit button', () => {
      const button = fixture.nativeElement.querySelector('ion-button[type="submit"]');
      expect(button).toBeTruthy();
    });

    it('should render page title', () => {
      const title = fixture.nativeElement.querySelector('.accessible-page-title');
      expect(title?.textContent).toContain('Recuperar Senha');
    });

    it('should render instructions', () => {
      const instructions = fixture.nativeElement.querySelector('.accessible-instructions');
      expect(instructions?.textContent).toContain('Digite seu e-mail');
    });

    it('should render back to login link', () => {
      const link = fixture.nativeElement.querySelector('a[routerLink="/login"]');
      expect(link).toBeTruthy();
    });
  });

  describe('Button State', () => {
    it('should disable button when form is invalid', () => {
      component.forgotPasswordForm.get('email')?.setValue('');
      fixture.detectChanges();
      
      const button = fixture.nativeElement.querySelector('ion-button[type="submit"]');
      // Ionic buttons can have disabled as attribute or property
      expect(button.disabled || button.getAttribute('disabled') === 'true' || button.getAttribute('disabled') === '').toBeTrue();
    });

    it('should disable button when loading', () => {
      component.forgotPasswordForm.get('email')?.setValue('test@example.com');
      // Manually set loading state since we can't mock Firebase
      component.loading.set(true);
      fixture.detectChanges();
      
      const button = fixture.nativeElement.querySelector('ion-button[type="submit"]');
      // Ionic buttons can have disabled as attribute or property
      expect(button.disabled || button.getAttribute('disabled') === 'true' || button.getAttribute('disabled') === '').toBeTrue();
    });

    it('should show spinner when loading', () => {
      component.forgotPasswordForm.get('email')?.setValue('test@example.com');
      // Manually set loading state since we can't mock Firebase
      component.loading.set(true);
      fixture.detectChanges();
      
      const spinner = fixture.nativeElement.querySelector('ion-spinner');
      expect(spinner).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label on email input', () => {
      const input = fixture.nativeElement.querySelector('ion-input[formControlName="email"]');
      expect(input.getAttribute('aria-label')).toBe('Campo de e-mail');
    });

    it('should have aria-label on submit button', () => {
      const button = fixture.nativeElement.querySelector('ion-button[type="submit"]');
      expect(button.getAttribute('aria-label')).toBe('Botão de enviar link de recuperação');
    });

    it('should have for attribute on label', () => {
      const label = fixture.nativeElement.querySelector('label[for="email-input"]');
      expect(label).toBeTruthy();
    });
  });
});
