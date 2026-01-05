import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let isLoggedIn$: BehaviorSubject<boolean>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let mockUrlTree: UrlTree;

  beforeEach(() => {
    isLoggedIn$ = new BehaviorSubject<boolean>(false);
    mockUrlTree = { toString: () => '/login' } as UrlTree;

    authService = jasmine.createSpyObj('AuthService', [], {
      isLoggedIn$: isLoggedIn$.asObservable()
    });

    router = jasmine.createSpyObj('Router', ['createUrlTree']);
    router.createUrlTree.and.returnValue(mockUrlTree);

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = { url: '/protected' } as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
  });

  describe('when user is logged in', () => {
    beforeEach(() => {
      isLoggedIn$.next(true);
    });

    it('should allow navigation', (done) => {
      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);
        (result as Observable<boolean | UrlTree>).subscribe(value => {
          expect(value).toBe(true);
          done();
        });
      });
    });

    it('should not call createUrlTree', (done) => {
      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);
        (result as Observable<boolean | UrlTree>).subscribe(() => {
          expect(router.createUrlTree).not.toHaveBeenCalled();
          done();
        });
      });
    });
  });

  describe('when user is not logged in', () => {
    beforeEach(() => {
      isLoggedIn$.next(false);
    });

    it('should redirect to login', (done) => {
      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);
        (result as Observable<boolean | UrlTree>).subscribe(value => {
          expect(value).toBe(mockUrlTree);
          done();
        });
      });
    });

    it('should create URL tree with /login path', (done) => {
      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);
        (result as Observable<boolean | UrlTree>).subscribe(() => {
          expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
          done();
        });
      });
    });
  });

  describe('observable behavior', () => {
    it('should take only the first value', (done) => {
      let emitCount = 0;
      
      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);
        (result as Observable<boolean | UrlTree>).subscribe({
          next: () => {
            emitCount++;
          },
          complete: () => {
            expect(emitCount).toBe(1);
            done();
          }
        });
        
        // Emit multiple values - should only process first
        isLoggedIn$.next(true);
        isLoggedIn$.next(false);
        isLoggedIn$.next(true);
      });
    });

    it('should complete after first emission', (done) => {
      isLoggedIn$.next(true);
      let completed = false;
      
      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);
        (result as Observable<boolean | UrlTree>).subscribe({
          complete: () => {
            completed = true;
            expect(completed).toBe(true);
            done();
          }
        });
      });
    });
  });

  describe('return type', () => {
    it('should return an Observable', () => {
      TestBed.runInInjectionContext(() => {
        const result = authGuard(mockRoute, mockState);
        expect(result).toBeInstanceOf(Observable);
      });
    });
  });
});
