import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { onboardingGuard } from './onboarding.guard';
import { UserService } from '../services/user.service';
import { take } from 'rxjs/operators';

describe('onboardingGuard', () => {
  let userService: jasmine.SpyObj<UserService>;
  let router: jasmine.SpyObj<Router>;
  let mockUserSignal: ReturnType<typeof signal<any>>;

  const createValidUser = (overrides = {}) => ({
    country: 'BR',
    name: 'Test User',
    birthDate: new Date('1990-01-01'),
    gender: 'male',
    document: '12345678900',
    phone: '+5511999999999',
    onboardingCompleted: true,
    termsAcceptance: [{ version: '1.0', acceptedAt: new Date() }],
    ...overrides
  });

  beforeEach(() => {
    mockUserSignal = signal<any>(null);

    userService = jasmine.createSpyObj('UserService', ['currentUser']);
    Object.defineProperty(userService, 'currentUser', {
      value: () => mockUserSignal(),
      writable: true
    });
    
    // Mock the signal as a callable function
    (userService as any).currentUser = mockUserSignal;

    router = jasmine.createSpyObj('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        { provide: UserService, useValue: userService },
        { provide: Router, useValue: router }
      ]
    });
  });

  describe('when user has completed onboarding', () => {
    it('should allow navigation for valid user', (done) => {
      const validUser = createValidUser();
      mockUserSignal.set(validUser);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(true);
          done();
        });
      });
    });

    it('should not redirect for valid user', (done) => {
      const validUser = createValidUser();
      mockUserSignal.set(validUser);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(() => {
          expect(router.navigate).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('when user has not completed onboarding', () => {
    it('should redirect to /onboarding when onboardingCompleted is false', (done) => {
      const incompleteUser = createValidUser({ onboardingCompleted: false });
      mockUserSignal.set(incompleteUser);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });
  });

  describe('when user is missing required fields', () => {
    it('should redirect when country is missing', (done) => {
      const user = createValidUser({ country: null });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });

    it('should redirect when name is missing', (done) => {
      const user = createValidUser({ name: '' });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });

    it('should redirect when birthDate is missing', (done) => {
      const user = createValidUser({ birthDate: null });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });

    it('should redirect when gender is missing', (done) => {
      const user = createValidUser({ gender: null });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });

    it('should redirect when document is missing', (done) => {
      const user = createValidUser({ document: '' });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });

    it('should redirect when phone is missing', (done) => {
      const user = createValidUser({ phone: '' });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });

    it('should redirect when termsAcceptance is empty array', (done) => {
      const user = createValidUser({ termsAcceptance: [] });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });

    it('should redirect when termsAcceptance is null', (done) => {
      const user = createValidUser({ termsAcceptance: null });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(false);
          expect(router.navigate).toHaveBeenCalledWith(['/onboarding']);
          done();
        });
      });
    });
  });

  describe('return type', () => {
    it('should return an Observable', () => {
      mockUserSignal.set(createValidUser());
      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        expect(result.subscribe).toBeDefined();
      });
    });
  });

  describe('validation function', () => {
    it('should allow user with all required fields', (done) => {
      const validUser = createValidUser();
      mockUserSignal.set(validUser);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(true);
          done();
        });
      });
    });

    it('should allow user with multiple terms acceptances', (done) => {
      const user = createValidUser({
        termsAcceptance: [
          { version: '1.0', acceptedAt: new Date('2023-01-01') },
          { version: '2.0', acceptedAt: new Date('2024-01-01') }
        ]
      });
      mockUserSignal.set(user);

      TestBed.runInInjectionContext(() => {
        const result = onboardingGuard();
        result.pipe(take(1)).subscribe(allowed => {
          expect(allowed).toBe(true);
          done();
        });
      });
    });
  });
});
