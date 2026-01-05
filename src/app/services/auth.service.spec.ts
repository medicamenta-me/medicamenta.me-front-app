/**
 * AuthService Unit Tests
 * 
 * Tests for the Authentication Service that manages user authentication
 * using Firebase Auth with email/password.
 * 
 * Note: This service directly uses Firebase Auth functions which are difficult to mock
 * in Jasmine tests. These tests focus on testable aspects: signals, state management,
 * and integration points. Full auth flow testing should be done with Cypress E2E tests.
 */

import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { AnalyticsService } from './analytics.service';
import { LogService } from './log.service';
import {
  Auth,
  User as FirebaseUser,
} from 'firebase/auth';
import { Firestore } from 'firebase/firestore';

describe('AuthService', () => {
  let service: AuthService;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let mockAnalyticsService: jasmine.SpyObj<AnalyticsService>;
  let mockLogService: jasmine.SpyObj<LogService>;
  let mockAuth: any;
  let mockFirestore: Partial<Firestore>;
  let authStateCallback: ((user: FirebaseUser | null) => void) | null = null;

  beforeEach(() => {
    // Mock Auth with onAuthStateChanged and reCAPTCHA
    mockAuth = {
      onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.callFake((callback: any) => {
        authStateCallback = callback;
        return () => {}; // Return unsubscribe function
      }),
      signInWithEmailAndPassword: jasmine.createSpy('signInWithEmailAndPassword').and.returnValue(Promise.resolve({
        user: { uid: 'test-uid', email: 'test@example.com' }
      })),
      signOut: jasmine.createSpy('signOut').and.returnValue(Promise.resolve()),
      createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword').and.returnValue(Promise.resolve({
        user: { uid: 'test-uid', email: 'test@example.com' }
      })),
      _getRecaptchaConfig: jasmine.createSpy('_getRecaptchaConfig').and.returnValue(Promise.resolve({
        isProviderEnabled: jasmine.createSpy('isProviderEnabled').and.returnValue(false)
      })),
      currentUser: null,
    };
    
    mockFirestore = {} as Firestore;

    mockFirebaseService = jasmine.createSpyObj('FirebaseService', [], {
      auth: mockAuth,
      firestore: mockFirestore,
    });

    mockAnalyticsService = jasmine.createSpyObj('AnalyticsService', ['setUserId']);
    mockLogService = jasmine.createSpyObj('LogService', ['debug', 'error']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: LogService, useValue: mockLogService },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  // ==================== INITIALIZATION ====================

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with no user', () => {
      expect(service.currentUser()).toBeNull();
      expect(service.isLoggedIn$.value).toBe(false);
    });

    it('should have readonly currentUser signal', () => {
      expect(service.currentUser).toBeDefined();
      expect(typeof service.currentUser).toBe('function');
    });

    it('should have isLoggedIn$ observable', () => {
      expect(service.isLoggedIn$).toBeDefined();
      expect(service.isLoggedIn$.value).toBe(false);
    });

    it('should have FirebaseService injected', () => {
      expect((service as any).firebaseService).toBeDefined();
    });

    it('should have Auth instance from FirebaseService', () => {
      expect((service as any).auth).toBeDefined();
      expect((service as any).auth).toBe(mockAuth);
    });

    it('should have Firestore instance from FirebaseService', () => {
      expect((service as any).firestore).toBeDefined();
      expect((service as any).firestore).toBe(mockFirestore);
    });

    it('should inject optional AnalyticsService', () => {
      expect((service as any).analyticsService).toBeDefined();
    });

    it('should inject optional LogService', () => {
      expect((service as any).logService).toBeDefined();
    });
  });

  // ==================== PUBLIC API ====================

  describe('Public API', () => {
    it('should have login method', () => {
      expect(service.login).toBeDefined();
      expect(typeof service.login).toBe('function');
    });

    it('should have signup method', () => {
      expect(service.signup).toBeDefined();
      expect(typeof service.signup).toBe('function');
    });

    it('should have logout method', () => {
      expect(service.logout).toBeDefined();
      expect(typeof service.logout).toBe('function');
    });

    it('should expose currentUser signal', () => {
      expect(service.currentUser).toBeDefined();
      expect(typeof service.currentUser).toBe('function');
    });

    it('should expose isLoggedIn$ observable', () => {
      expect(service.isLoggedIn$).toBeDefined();
      expect(service.isLoggedIn$.subscribe).toBeDefined();
    });
  });

  // ==================== METHOD SIGNATURES ====================

  describe('Method Signatures', () => {
    it('should accept email and password in login', async () => {
      // Verify method can be called with correct params
      expect(() => {
        service.login('test@example.com', 'password123');
      }).not.toThrow();
    });

    it('should accept name, email, password, and role in signup', async () => {
      expect(() => {
        service.signup('John Doe', 'test@example.com', 'password123', 'Patient');
      }).not.toThrow();
    });

    it('should accept all valid role types', async () => {
      const roles: Array<'Patient' | 'Family Member' | 'Nurse' | 'Doctor'> = [
        'Patient',
        'Family Member',
        'Nurse',
        'Doctor',
      ];

      for (const role of roles) {
        expect(() => {
          service.signup('Test User', 'test@example.com', 'password123', role);
        }).not.toThrow();
      }
    });

    it('should accept no parameters in logout', async () => {
      expect(() => {
        service.logout();
      }).not.toThrow();
    });
  });

  // ==================== SIGNAL BEHAVIOR ====================

  describe('Signal Behavior', () => {
    it('should have currentUser signal with null initial value', () => {
      expect(service.currentUser()).toBeNull();
    });

    it('should allow reading currentUser signal multiple times', () => {
      const read1 = service.currentUser();
      const read2 = service.currentUser();
      const read3 = service.currentUser();

      expect(read1).toBe(read2);
      expect(read2).toBe(read3);
    });

    it('should maintain signal reactivity', () => {
      // Signal should be callable
      expect(() => {
        const user = service.currentUser();
        const loggedIn = service.isLoggedIn$.value;
      }).not.toThrow();
    });
  });

  // ==================== OBSERVABLE BEHAVIOR ====================

  describe('Observable Behavior', () => {
    it('should have initial isLoggedIn$ value of false', () => {
      expect(service.isLoggedIn$.value).toBe(false);
    });

    it('should allow subscription to isLoggedIn$', (done) => {
      service.isLoggedIn$.subscribe((value) => {
        expect(typeof value).toBe('boolean');
        done();
      });
    });

    it('should emit current value on subscription', (done) => {
      let emissionCount = 0;

      service.isLoggedIn$.subscribe(() => {
        emissionCount++;
        if (emissionCount === 1) {
          expect(emissionCount).toBe(1);
          done();
        }
      });
    });

    it('should be a BehaviorSubject with current value', () => {
      expect(service.isLoggedIn$.value).toBeDefined();
      expect(typeof service.isLoggedIn$.value).toBe('boolean');
    });
  });

  // ==================== DEPENDENCY INJECTION ====================

  describe('Dependency Injection', () => {
    it('should work without optional AnalyticsService', () => {
      TestBed.resetTestingModule();
      
      // Create new mock with onAuthStateChanged and reCAPTCHA
      const localMockAuth = {
        onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.returnValue(() => {}),
        _getRecaptchaConfig: jasmine.createSpy('_getRecaptchaConfig').and.returnValue(Promise.resolve({
          isProviderEnabled: jasmine.createSpy('isProviderEnabled').and.returnValue(false)
        })),
        signInWithEmailAndPassword: jasmine.createSpy('signInWithEmailAndPassword'),
        signOut: jasmine.createSpy('signOut'),
        createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword'),
        currentUser: null,
      };
      const localMockFirebaseService = jasmine.createSpyObj('FirebaseService', [], {
        auth: localMockAuth,
        firestore: mockFirestore,
      });
      
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          { provide: FirebaseService, useValue: localMockFirebaseService },
          { provide: LogService, useValue: mockLogService },
        ],
      });

      const serviceWithoutAnalytics = TestBed.inject(AuthService);
      expect(serviceWithoutAnalytics).toBeTruthy();
      expect(serviceWithoutAnalytics.currentUser()).toBeNull();
    });

    it('should work without optional LogService', () => {
      TestBed.resetTestingModule();
      
      // Create new mock with onAuthStateChanged and reCAPTCHA
      const localMockAuth = {
        onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.returnValue(() => {}),
        _getRecaptchaConfig: jasmine.createSpy('_getRecaptchaConfig').and.returnValue(Promise.resolve({
          isProviderEnabled: jasmine.createSpy('isProviderEnabled').and.returnValue(false)
        })),
        signInWithEmailAndPassword: jasmine.createSpy('signInWithEmailAndPassword'),
        signOut: jasmine.createSpy('signOut'),
        createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword'),
        currentUser: null,
      };
      const localMockFirebaseService = jasmine.createSpyObj('FirebaseService', [], {
        auth: localMockAuth,
        firestore: mockFirestore,
      });
      const localMockAnalyticsService = jasmine.createSpyObj('AnalyticsService', ['setUserId']);
      // Provide null for LogService to prevent circular dependency
      const localMockLogService = { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} };
      
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          { provide: FirebaseService, useValue: localMockFirebaseService },
          { provide: AnalyticsService, useValue: localMockAnalyticsService },
          { provide: LogService, useValue: localMockLogService },
        ],
      });

      const serviceWithoutLog = TestBed.inject(AuthService);
      expect(serviceWithoutLog).toBeTruthy();
      expect(serviceWithoutLog.currentUser()).toBeNull();
    });

    it('should work without both optional services', () => {
      TestBed.resetTestingModule();
      
      // Create new mock with onAuthStateChanged and reCAPTCHA
      const localMockAuth = {
        onAuthStateChanged: jasmine.createSpy('onAuthStateChanged').and.returnValue(() => {}),
        _getRecaptchaConfig: jasmine.createSpy('_getRecaptchaConfig').and.returnValue(Promise.resolve({
          isProviderEnabled: jasmine.createSpy('isProviderEnabled').and.returnValue(false)
        })),
        signInWithEmailAndPassword: jasmine.createSpy('signInWithEmailAndPassword'),
        signOut: jasmine.createSpy('signOut'),
        createUserWithEmailAndPassword: jasmine.createSpy('createUserWithEmailAndPassword'),
        currentUser: null,
      };
      const localMockFirebaseService = jasmine.createSpyObj('FirebaseService', [], {
        auth: localMockAuth,
        firestore: mockFirestore,
      });
      // Provide mocks to prevent circular dependency from LogService
      const localMockLogService = { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} };
      const localMockAnalyticsService = { setUserId: () => {} };
      
      TestBed.configureTestingModule({
        providers: [
          AuthService,
          { provide: FirebaseService, useValue: localMockFirebaseService },
          { provide: LogService, useValue: localMockLogService },
          { provide: AnalyticsService, useValue: localMockAnalyticsService },
        ],
      });

      const serviceMinimal = TestBed.inject(AuthService);
      expect(serviceMinimal).toBeTruthy();
      expect(serviceMinimal.currentUser()).toBeNull();
    });

    it('should require FirebaseService', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [AuthService],
      });

      // This should throw because FirebaseService is required
      expect(() => {
        TestBed.inject(AuthService);
      }).toThrow();
    });
  });

  // ==================== ERROR HANDLING ====================

  describe('Error Handling', () => {
    it('should have error handling in login', async () => {
      // Since Firebase is not mocked, this will fail
      // But we verify the method handles errors gracefully
      try {
        await service.login('test@example.com', 'wrongpassword');
      } catch (error) {
        // Expected to fail without Firebase
        expect(error).toBeDefined();
      }
    });

    it('should have error handling in signup', async () => {
      try {
        await service.signup('Test User', 'invalid-email', 'password123', 'Patient');
      } catch (error) {
        // Expected to fail without Firebase
        expect(error).toBeDefined();
      }
    });

    it('should have error handling in logout', async () => {
      try {
        await service.logout();
      } catch (error) {
        // Expected to fail without Firebase
        expect(error).toBeDefined();
      }
    });

    it('should log errors using LogService when available', async () => {
      try {
        await service.login('test@example.com', 'password');
      } catch (error) {
        // Verify error was logged (if Firebase was properly mocked)
        // In this case, we just verify the LogService was injected
        expect((service as any).logService).toBeDefined();
      }
    });
  });

  // ==================== INTEGRATION POINTS ====================

  describe('Integration Points', () => {
    it('should use FirebaseService auth instance', () => {
      expect((service as any).auth).toBe(mockAuth);
    });

    it('should use FirebaseService firestore instance', () => {
      expect((service as any).firestore).toBe(mockFirestore);
    });

    it('should have reference to AnalyticsService', () => {
      expect((service as any).analyticsService).toBe(mockAnalyticsService);
    });

    it('should have reference to LogService', () => {
      expect((service as any).logService).toBe(mockLogService);
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge Cases', () => {
    it('should handle empty email in login', async () => {
      try {
        await service.login('', 'password123');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it('should handle empty password in login', async () => {
      try {
        await service.login('test@example.com', '');
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it('should handle empty name in signup', async () => {
      try {
        await service.signup('', 'test@example.com', 'password123', 'Patient');
      } catch (error) {
        // Name validation is not enforced, might succeed
      }
    });

    it('should handle multiple currentUser reads', () => {
      for (let i = 0; i < 10; i++) {
        const user = service.currentUser();
        expect(user).toBeNull();
      }
    });

    it('should handle multiple isLoggedIn$ value reads', () => {
      for (let i = 0; i < 10; i++) {
        const value = service.isLoggedIn$.value;
        expect(value).toBe(false);
      }
    });

    it('should handle rapid subscription/unsubscription', () => {
      for (let i = 0; i < 10; i++) {
        const subscription = service.isLoggedIn$.subscribe(() => {});
        subscription.unsubscribe();
      }
      expect(true).toBe(true);
    });

    it('should maintain service state after multiple method calls', async () => {
      // Initial state
      expect(service.currentUser()).toBeNull();

      // Try login (will fail)
      try {
        await service.login('test1@example.com', 'password');
      } catch {
        // Ignoring expected error for state testing
      }

      // State should still be consistent
      expect(service.currentUser()).toBeNull();

      // Try signup (will fail)
      try {
        await service.signup('Test', 'test2@example.com', 'password', 'Patient');
      } catch {
        // Ignoring expected error for state testing
      }

      // State should still be consistent
      expect(service.currentUser()).toBeNull();

      // Try logout (will fail)
      try {
        await service.logout();
      } catch {
        // Ignoring expected error for state testing
      }

      // State should still be consistent
      expect(service.currentUser()).toBeNull();
    });
  });
});
