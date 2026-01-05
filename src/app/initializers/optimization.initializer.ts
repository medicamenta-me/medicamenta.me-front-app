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

    // Start garbage collection
    gcService.start();

    // Initialize prefetch service
    prefetchService.initialize();

    return Promise.resolve();
  };
}
