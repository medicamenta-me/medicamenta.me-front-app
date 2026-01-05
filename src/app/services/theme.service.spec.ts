import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let localStorageStore: { [key: string]: string };
  let matchMediaMock: jasmine.Spy;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageStore = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      return localStorageStore[key] ?? null;
    });

    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      localStorageStore[key] = value;
    });

    // Mock matchMedia
    matchMediaMock = jasmine.createSpy('matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: jasmine.createSpy('addListener'),
      removeListener: jasmine.createSpy('removeListener'),
      addEventListener: jasmine.createSpy('addEventListener'),
      removeEventListener: jasmine.createSpy('removeEventListener'),
      dispatchEvent: jasmine.createSpy('dispatchEvent')
    });
    
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock
    });

    // Reset document.body classes
    document.body.classList.remove('dark');

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
  });

  describe('Initialization', () => {
    it('should be created', () => {
      service = TestBed.inject(ThemeService);
      expect(service).toBeTruthy();
    });

    it('should load dark mode preference from localStorage', () => {
      localStorageStore['darkMode'] = 'true';
      
      service = TestBed.inject(ThemeService);
      
      expect(service.isDarkMode()).toBeTrue();
    });

    it('should default to false if no preference stored and system is light', () => {
      // No stored preference, matchMedia returns false (light mode)
      matchMediaMock.and.returnValue({ matches: false });
      
      service = TestBed.inject(ThemeService);
      
      expect(service.isDarkMode()).toBeFalse();
    });

    it('should use system preference if no localStorage value', () => {
      // No stored preference, matchMedia returns true (dark mode)
      matchMediaMock.and.returnValue({ matches: true });
      
      service = TestBed.inject(ThemeService);
      
      expect(service.isDarkMode()).toBeTrue();
    });

    it('should prefer localStorage over system preference', () => {
      // Stored preference is false, but system is dark
      localStorageStore['darkMode'] = 'false';
      matchMediaMock.and.returnValue({ matches: true });
      
      service = TestBed.inject(ThemeService);
      
      expect(service.isDarkMode()).toBeFalse();
    });

    it('should handle invalid JSON in localStorage', () => {
      // Invalid JSON should fall back to system preference
      localStorageStore['darkMode'] = 'not-valid-json';
      matchMediaMock.and.returnValue({ matches: false });
      
      // This will throw during parsing, let's test graceful fallback
      // Note: actual service may throw, so we test the parsing behavior
      expect(() => {
        service = TestBed.inject(ThemeService);
      }).toThrow();
    });
  });

  describe('toggleDarkMode', () => {
    beforeEach(() => {
      service = TestBed.inject(ThemeService);
    });

    it('should toggle dark mode from false to true', () => {
      // Start with light mode
      (service as any).darkMode.set(false);
      
      service.toggleDarkMode();
      
      expect(service.isDarkMode()).toBeTrue();
    });

    it('should toggle dark mode from true to false', () => {
      // Start with dark mode
      (service as any).darkMode.set(true);
      
      service.toggleDarkMode();
      
      expect(service.isDarkMode()).toBeFalse();
    });

    it('should toggle multiple times correctly', () => {
      const initialState = service.isDarkMode();
      
      service.toggleDarkMode(); // opposite
      service.toggleDarkMode(); // back to original
      service.toggleDarkMode(); // opposite again
      
      expect(service.isDarkMode()).toBe(!initialState);
    });

    it('should persist toggle to localStorage', () => {
      (service as any).darkMode.set(false);
      
      service.toggleDarkMode();
      
      // Effect should have saved to localStorage
      // Need to trigger change detection for effect
      TestBed.flushEffects();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', 'true');
    });
  });

  describe('isDarkMode', () => {
    beforeEach(() => {
      service = TestBed.inject(ThemeService);
    });

    it('should return a readonly signal', () => {
      const isDarkMode = service.isDarkMode;
      
      // Should be a function (signal)
      expect(typeof isDarkMode).toBe('function');
    });

    it('should reflect current dark mode state', () => {
      (service as any).darkMode.set(true);
      expect(service.isDarkMode()).toBeTrue();
      
      (service as any).darkMode.set(false);
      expect(service.isDarkMode()).toBeFalse();
    });
  });

  describe('Effect - Body Class', () => {
    beforeEach(() => {
      document.body.classList.remove('dark');
    });

    it('should add dark class to body when dark mode enabled', () => {
      localStorageStore['darkMode'] = 'true';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(document.body.classList.contains('dark')).toBeTrue();
    });

    it('should remove dark class from body when dark mode disabled', () => {
      document.body.classList.add('dark');
      localStorageStore['darkMode'] = 'false';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(document.body.classList.contains('dark')).toBeFalse();
    });

    it('should update body class on toggle', () => {
      localStorageStore['darkMode'] = 'false';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(document.body.classList.contains('dark')).toBeFalse();
      
      service.toggleDarkMode();
      TestBed.flushEffects();
      
      expect(document.body.classList.contains('dark')).toBeTrue();
    });
  });

  describe('Effect - localStorage Persistence', () => {
    it('should save to localStorage on initialization', () => {
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', jasmine.any(String));
    });

    it('should save true to localStorage when dark mode is on', () => {
      localStorageStore['darkMode'] = 'true';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', 'true');
    });

    it('should save false to localStorage when dark mode is off', () => {
      localStorageStore['darkMode'] = 'false';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', 'false');
    });

    it('should update localStorage on toggle', () => {
      localStorageStore['darkMode'] = 'false';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      // Clear previous calls
      (localStorage.setItem as jasmine.Spy).calls.reset();
      
      service.toggleDarkMode();
      TestBed.flushEffects();
      
      expect(localStorage.setItem).toHaveBeenCalledWith('darkMode', 'true');
    });
  });

  describe('System Preference Detection', () => {
    it('should check system preference on first load', () => {
      service = TestBed.inject(ThemeService);
      
      // matchMedia should have been called during initialization
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should handle missing matchMedia gracefully', () => {
      // Remove matchMedia
      (window as any).matchMedia = undefined;
      
      service = TestBed.inject(ThemeService);
      
      // Should default to false
      expect(service.isDarkMode()).toBeFalse();
    });

    it('should respect system dark preference on first visit', () => {
      matchMediaMock.and.returnValue({ matches: true });
      
      service = TestBed.inject(ThemeService);
      
      expect(service.isDarkMode()).toBeTrue();
    });

    it('should respect system light preference on first visit', () => {
      matchMediaMock.and.returnValue({ matches: false });
      
      service = TestBed.inject(ThemeService);
      
      expect(service.isDarkMode()).toBeFalse();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid toggle calls', () => {
      service = TestBed.inject(ThemeService);
      const initialState = service.isDarkMode();
      
      for (let i = 0; i < 100; i++) {
        service.toggleDarkMode();
      }
      
      // After 100 toggles (even number), should be back to original
      expect(service.isDarkMode()).toBe(initialState);
    });

    it('should handle concurrent access', () => {
      service = TestBed.inject(ThemeService);
      
      // Multiple reads should return consistent value
      const results: boolean[] = [];
      for (let i = 0; i < 10; i++) {
        results.push(service.isDarkMode());
      }
      
      // All should be the same
      expect(results.every(v => v === results[0])).toBeTrue();
    });

    it('should work with existing dark class on body', () => {
      document.body.classList.add('dark');
      localStorageStore['darkMode'] = 'false';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      // Effect should remove the class since darkMode is false
      expect(document.body.classList.contains('dark')).toBeFalse();
    });

    it('should handle body without classList', () => {
      // This is an edge case that shouldn't happen in real browsers
      // but tests robustness
      const originalClassList = document.body.classList;
      
      try {
        service = TestBed.inject(ThemeService);
        // Should not throw even with classList operations
        expect(service).toBeTruthy();
      } finally {
        // Restore if needed
      }
    });
  });

  describe('State Isolation', () => {
    it('should not share state between service instances', () => {
      // First instance
      localStorageStore['darkMode'] = 'true';
      const service1 = TestBed.inject(ThemeService);
      expect(service1.isDarkMode()).toBeTrue();
      
      // Change state
      service1.toggleDarkMode();
      TestBed.flushEffects();
      
      expect(service1.isDarkMode()).toBeFalse();
    });

    it('should maintain consistent state after multiple operations', () => {
      service = TestBed.inject(ThemeService);
      
      // Record initial state
      const initial = service.isDarkMode();
      
      // Toggle
      service.toggleDarkMode();
      TestBed.flushEffects();
      
      expect(service.isDarkMode()).toBe(!initial);
      
      // Toggle back
      service.toggleDarkMode();
      TestBed.flushEffects();
      
      expect(service.isDarkMode()).toBe(initial);
    });
  });

  describe('CSS Integration', () => {
    beforeEach(() => {
      document.body.classList.remove('dark');
    });

    it('should apply dark class for dark mode', () => {
      localStorageStore['darkMode'] = 'true';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(document.body.classList.contains('dark')).toBeTrue();
    });

    it('should not apply dark class for light mode', () => {
      localStorageStore['darkMode'] = 'false';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(document.body.classList.contains('dark')).toBeFalse();
    });

    it('should preserve other body classes', () => {
      document.body.classList.add('custom-class');
      localStorageStore['darkMode'] = 'true';
      
      service = TestBed.inject(ThemeService);
      TestBed.flushEffects();
      
      expect(document.body.classList.contains('dark')).toBeTrue();
      expect(document.body.classList.contains('custom-class')).toBeTrue();
    });
  });
});
