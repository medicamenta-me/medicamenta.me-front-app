import { SelectivePreloadingStrategy } from './selective-preload.strategy';
import { Route } from '@angular/router';
import { of, firstValueFrom } from 'rxjs';

describe('SelectivePreloadingStrategy', () => {
  let strategy: SelectivePreloadingStrategy;
  let mockLoad: jasmine.Spy;

  beforeEach(() => {
    strategy = new SelectivePreloadingStrategy();
    mockLoad = jasmine.createSpy('load').and.returnValue(of('module'));
  });

  describe('preload priority: high', () => {
    it('should preload immediately when preload is "high"', async () => {
      const route: Route = { path: 'test', data: { preload: 'high' } };
      
      const result = await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(result).toBe('module');
      expect(mockLoad).toHaveBeenCalled();
      expect(strategy.preloadedModules).toContain('test');
    });

    it('should preload immediately when preload is true', async () => {
      const route: Route = { path: 'other', data: { preload: true } };
      
      const result = await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(result).toBe('module');
      expect(mockLoad).toHaveBeenCalled();
      expect(strategy.preloadedModules).toContain('other');
    });
  });

  describe('preload priority: none', () => {
    it('should NOT preload when preload is undefined', async () => {
      const route: Route = { path: 'lazy', data: {} };
      
      const result = await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(result).toBeNull();
      expect(mockLoad).not.toHaveBeenCalled();
    });

    it('should NOT preload when preload is false', async () => {
      const route: Route = { path: 'manual', data: { preload: false } };
      
      const result = await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(result).toBeNull();
      expect(mockLoad).not.toHaveBeenCalled();
    });

    it('should NOT preload when no data property', async () => {
      const route: Route = { path: 'nodata' };
      
      const result = await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(result).toBeNull();
      expect(mockLoad).not.toHaveBeenCalled();
    });
  });

  describe('preloaded modules tracking', () => {
    it('should track all preloaded routes', async () => {
      const route1: Route = { path: 'first', data: { preload: 'high' } };
      const route2: Route = { path: 'second', data: { preload: 'high' } };
      
      await firstValueFrom(strategy.preload(route1, mockLoad));
      await firstValueFrom(strategy.preload(route2, mockLoad));
      
      expect(strategy.preloadedModules).toContain('first');
      expect(strategy.preloadedModules).toContain('second');
      expect(strategy.preloadedModules.length).toBe(2);
    });

    it('should handle unknown path gracefully', async () => {
      const route: Route = { data: { preload: 'high' } };
      
      await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(strategy.preloadedModules).toContain('unknown');
    });
  });

  describe('data saver mode', () => {
    it('should NOT preload when data saver is enabled', async () => {
      // Mock navigator.connection.saveData
      const mockConnection = { saveData: true };
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true
      });
      
      const route: Route = { path: 'blocked', data: { preload: 'high' } };
      
      const result = await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(result).toBeNull();
      expect(mockLoad).not.toHaveBeenCalled();
      
      // Cleanup
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        configurable: true
      });
    });
  });

  describe('connection speed detection', () => {
    afterEach(() => {
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        configurable: true
      });
    });

    it('should consider 4g as fast connection', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', saveData: false },
        configurable: true
      });
      
      // Access private property via any cast for testing
      expect((strategy as any).isFastConnection).toBe(true);
    });

    it('should consider 3g as slow connection', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g', saveData: false },
        configurable: true
      });
      
      expect((strategy as any).isFastConnection).toBe(false);
    });

    it('should default to fast when API not available', () => {
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        configurable: true
      });
      
      expect((strategy as any).isFastConnection).toBe(true);
    });
  });

  describe('preload priority: medium', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('should delay preload for medium priority', () => {
      const route: Route = { path: 'medium', data: { preload: 'medium' } };
      
      const observable = strategy.preload(route, mockLoad);
      let result: any;
      observable.subscribe(r => result = r);
      
      // Should not have loaded yet
      expect(mockLoad).not.toHaveBeenCalled();
      
      // Advance time by 3 seconds
      jasmine.clock().tick(3000);
      
      expect(mockLoad).toHaveBeenCalled();
    });
  });

  describe('preload priority: low', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });

    afterEach(() => {
      jasmine.clock().uninstall();
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        configurable: true
      });
    });

    it('should delay preload for low priority on fast connection', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g', saveData: false },
        configurable: true
      });
      
      const route: Route = { path: 'low', data: { preload: 'low' } };
      
      const observable = strategy.preload(route, mockLoad);
      let result: any;
      observable.subscribe(r => result = r);
      
      // Should not have loaded yet
      expect(mockLoad).not.toHaveBeenCalled();
      
      // Advance time by 5 seconds
      jasmine.clock().tick(5000);
      
      expect(mockLoad).toHaveBeenCalled();
    });

    it('should NOT preload low priority on slow connection', async () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g', saveData: false },
        configurable: true
      });
      
      const route: Route = { path: 'low-slow', data: { preload: 'low' } };
      
      const result = await firstValueFrom(strategy.preload(route, mockLoad));
      
      expect(result).toBeNull();
      expect(mockLoad).not.toHaveBeenCalled();
    });
  });
});
