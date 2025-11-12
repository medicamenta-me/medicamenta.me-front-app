import { inject } from '@angular/core';
import { GarbageCollectionService } from '../services/garbage-collection.service';
import { PrefetchService } from '../services/prefetch.service';

/**
 * Initialize optimization services on app startup
 */
export function initializeOptimizations() {
  return () => {
    const gcService = inject(GarbageCollectionService);
    const prefetchService = inject(PrefetchService);

    console.log('[Optimizations] Initializing...');

    // Start garbage collection
    gcService.start();
    console.log('[Optimizations] Garbage collection started');

    // Initialize prefetch service
    prefetchService.initialize().then(() => {
      console.log('[Optimizations] Prefetch service initialized');
    });

    return Promise.resolve();
  };
}
