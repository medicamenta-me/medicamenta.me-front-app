// Medicamenta.me Service Worker v2
// Advanced offline capabilities with Background Sync and multiple cache strategies

const CACHE_VERSION = 'v2';
const CACHE_NAME = `medicamenta-${CACHE_VERSION}`;
const RUNTIME_CACHE = `medicamenta-runtime-${CACHE_VERSION}`;
const DATA_CACHE = `medicamenta-data-${CACHE_VERSION}`;

// Assets to pre-cache (app shell)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Strategies configuration
const CACHE_STRATEGIES = {
  // Cache First: For static assets (fonts, images)
  cacheFirst: [/\.(?:png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf)$/],
  
  // Network First: For API calls
  networkFirst: [/\/api\//, /firestore\.googleapis\.com/],
  
  // Stale While Revalidate: For frequently updated content
  staleWhileRevalidate: [/\.(?:js|css)$/]
};

// Install event - cache app shell
globalThis.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Cache files individually to avoid failure if one is missing
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] App shell cached successfully');
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
  globalThis.skipWaiting();
});

// Activate event - clean up old caches
globalThis.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating v2...');
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, DATA_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  globalThis.clients.claim();
});

// Fetch event - multiple cache strategies
globalThis.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  
  // Determine strategy based on request
  let strategy = 'networkFirst'; // default
  
  // Check for Cache First patterns (static assets)
  if (CACHE_STRATEGIES.cacheFirst.some(pattern => pattern.test(requestUrl.pathname))) {
    strategy = 'cacheFirst';
  }
  // Check for Network First patterns (API calls)
  else if (CACHE_STRATEGIES.networkFirst.some(pattern => pattern.test(requestUrl.href))) {
    strategy = 'networkFirst';
  }
  // Check for Stale While Revalidate patterns (JS/CSS)
  else if (CACHE_STRATEGIES.staleWhileRevalidate.some(pattern => pattern.test(requestUrl.pathname))) {
    strategy = 'staleWhileRevalidate';
  }
  
  // Apply strategy
  event.respondWith(handleFetch(request, strategy));
});

/**
 * Handle fetch with specific strategy
 */
async function handleFetch(request, strategy) {
  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request);
    case 'networkFirst':
      return networkFirst(request);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request);
    default:
      return fetch(request);
  }
}

/**
 * Check if request can be cached
 * Cache API only supports http/https GET requests
 */
function canCache(request) {
  const url = new URL(request.url);
  // Only cache http/https schemes
  if (!['http:', 'https:'].includes(url.protocol)) {
    return false;
  }
  // Only cache GET requests
  if (request.method !== 'GET') {
    return false;
  }
  // Don't cache chrome extensions
  if (url.origin.includes('chrome-extension')) {
    return false;
  }
  return true;
}

/**
 * Cache First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok && canCache(request)) {
      const cache = await caches.open(RUNTIME_CACHE);
      // Silently handle cache errors during development
      cache.put(request, response.clone()).catch(err => {
        console.warn('[SW] Failed to cache response:', err.message);
      });
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network First Strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && canCache(request)) {
      const cache = await caches.open(DATA_CACHE);
      // Silently handle cache errors during development
      cache.put(request, response.clone()).catch(err => {
        console.warn('[SW] Failed to cache response:', err.message);
      });
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Don't log network errors during development (expected with webpack dev server)
    if (!request.url.includes('localhost') && !request.url.includes('sockjs-node')) {
      console.error('[SW] Network First failed:', error);
    }
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cache immediately, update in background
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  // Fetch and update cache in background
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok && canCache(request)) {
      const cache = await caches.open(RUNTIME_CACHE);
      // Silently handle cache errors during development
      cache.put(request, response.clone()).catch(err => {
        console.warn('[SW] Failed to cache response:', err.message);
      });
    }
    return response;
  }).catch(err => {
    // Don't log fetch errors for dev server requests
    if (!request.url.includes('localhost') && !request.url.includes('sockjs-node')) {
      console.warn('[SW] Stale While Revalidate fetch failed:', err.message);
    }
    // Return cached version or create offline response
    if (cached) {
      return cached;
    }
    return new Response('Offline', { status: 503 });
  });
  
  // Return cached if available, otherwise wait for network
  return cached || fetchPromise;
}

// Push notification event
globalThis.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Novo lembrete de medicamento',
    icon: '/assets/icon/icon-192x192.png',
    badge: '/assets/icon/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'medication-reminder',
    requireInteraction: false
  };
  
  event.waitUntil(
    globalThis.registration.showNotification('💊 Medicamenta.me', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/dashboard');
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
  
  // Track notification dismissal if needed
  event.waitUntil(
    Promise.resolve()
  );
});

// Message event - handle messages from app
globalThis.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    globalThis.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all([
        caches.delete(CACHE_NAME),
        caches.delete(RUNTIME_CACHE),
        caches.delete(DATA_CACHE)
      ]).then(() => {
        console.log('[Service Worker] All caches cleared');
      })
    );
  }
  
  if (event.data.type === 'REGISTER_BACKGROUND_SYNC') {
    // Register background sync when app requests it
    event.waitUntil(
      globalThis.registration.sync.register('sync-offline-queue')
        .then(() => console.log('[Service Worker] Background sync registered'))
        .catch(err => console.error('[Service Worker] Background sync registration failed:', err))
    );
  }
});

// Background sync event - sync queued operations
globalThis.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

/**
 * Sync offline queue with Firestore
 * Called by Background Sync API when connection is restored
 */
async function syncOfflineQueue() {
  console.log('[Service Worker] Syncing offline queue...');
  
  try {
    // Notify app to start sync
    const clients = await globalThis.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'START_SYNC'
      });
    });
    
    return true;
  } catch (error) {
    console.error('[Service Worker] Background sync failed:', error);
    throw error; // Retry sync
  }
}

/**
 * Periodic Background Sync (if supported)
 * Sync data even when app is closed
 */
if ('periodicSync' in globalThis.registration) {
  globalThis.addEventListener('periodicsync', (event) => {
    console.log('[Service Worker] Periodic sync:', event.tag);
    
    if (event.tag === 'sync-medications') {
      event.waitUntil(syncOfflineQueue());
    }
  });
}

// ==================== BACKGROUND FETCH ====================

/**
 * Background Fetch API - Download large files in background
 * Works even when app is closed
 */
globalThis.addEventListener('backgroundfetchsuccess', (event) => {
  console.log('[Service Worker] Background fetch success:', event.registration.id);
  
  event.waitUntil(async function() {
    try {
      const registration = event.registration;
      const records = await registration.matchAll();
      const promises = records.map(async (record) => {
        const response = await record.responseReady;
        const cache = await caches.open(DATA_CACHE);
        await cache.put(record.request, response);
      });
      
      await Promise.all(promises);
      
      // Notificar app sobre sucesso
      event.updateUI({ title: 'Download concluído!' });
      
      // Notificar clientes
      const clients = await globalThis.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BACKGROUND_FETCH_SUCCESS',
          id: registration.id
        });
      });
    } catch (error) {
      console.error('[Service Worker] Background fetch error:', error);
    }
  }());
});

globalThis.addEventListener('backgroundfetchfail', (event) => {
  console.log('[Service Worker] Background fetch failed:', event.registration.id);
  
  event.waitUntil(async function() {
    event.updateUI({ title: 'Download falhou' });
    
    // Notificar clientes sobre falha
    const clients = await globalThis.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_FETCH_FAIL',
        id: event.registration.id
      });
    });
  }());
});

globalThis.addEventListener('backgroundfetchabort', (event) => {
  console.log('[Service Worker] Background fetch aborted:', event.registration.id);
});

globalThis.addEventListener('backgroundfetchclick', (event) => {
  console.log('[Service Worker] Background fetch clicked:', event.registration.id);
  
  event.waitUntil(async function() {
    const clients = await globalThis.clients.matchAll({ type: 'window' });
    
    if (clients.length > 0) {
      clients[0].focus();
    } else {
      globalThis.clients.openWindow('/');
    }
  }());
});

console.log('[Service Worker] v2 loaded successfully');
