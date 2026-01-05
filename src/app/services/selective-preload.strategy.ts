import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Selective Preloading Strategy
 * 
 * Preloads routes based on priority and user connection type:
 * - High priority routes: preloaded immediately
 * - Medium priority routes: preloaded after 3 seconds
 * - Low priority routes: only preloaded on fast connections
 * - No preload: never preloaded (loaded on-demand)
 * 
 * Configure routes with data.preload property:
 * - 'high': critical routes (dashboard, medications)
 * - 'medium': secondary routes (history, profile)
 * - 'low': rarely used routes (settings, help)
 * - false/undefined: no preload (admin features)
 * 
 * @example
 * {
 *   path: 'dashboard',
 *   loadComponent: () => import('./dashboard/dashboard.component'),
 *   data: { preload: 'high' }
 * }
 */
@Injectable({
  providedIn: 'root'
})
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  /** Routes that have been preloaded */
  preloadedModules: string[] = [];

  /** Connection speed detection */
  private get isFastConnection(): boolean {
    const connection = (navigator as any).connection;
    if (!connection) return true; // Assume fast if API not available

    const effectiveType = connection.effectiveType;
    return effectiveType === '4g' || effectiveType === '5g';
  }

  /** Data saver mode detection */
  private get isDataSaverEnabled(): boolean {
    const connection = (navigator as any).connection;
    return connection?.saveData === true;
  }

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Don't preload if data saver is enabled
    if (this.isDataSaverEnabled) {
      return of(null);
    }

    const preloadConfig = route.data?.['preload'];

    // No preload configured
    if (preloadConfig === false || preloadConfig === undefined) {
      return of(null);
    }

    // High priority: preload immediately
    if (preloadConfig === 'high' || preloadConfig === true) {
      return this.preloadRoute(route, load);
    }

    // Medium priority: preload after 3 seconds
    if (preloadConfig === 'medium') {
      return timer(3000).pipe(
        mergeMap(() => this.preloadRoute(route, load))
      );
    }

    // Low priority: only preload on fast connections after 5 seconds
    if (preloadConfig === 'low') {
      if (!this.isFastConnection) {
        return of(null);
      }
      return timer(5000).pipe(
        mergeMap(() => this.preloadRoute(route, load))
      );
    }

    // Default: no preload
    return of(null);
  }

  private preloadRoute(route: Route, load: () => Observable<any>): Observable<any> {
    const path = route.path || 'unknown';
    console.log(`🔄 Preloading: ${path}`);
    this.preloadedModules.push(path);
    return load();
  }
}
