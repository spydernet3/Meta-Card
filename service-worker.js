const CACHE_NAME = 'meta-card-cache-v1';

const CRITICAL_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

const OPTIONAL_URLS = [
  '/service-worker.js',
  '/assets/logo.jpg',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
  '/assets/icon-maskable.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// --- Install Event ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Cache critical files — if these fail, install fails
        return cache.addAll(CRITICAL_URLS)
          .then(() => {
            // Cache optional files individually — failures are ignored
            return Promise.allSettled(
              OPTIONAL_URLS.map(url =>
                cache.add(url).catch(err => {
                  console.warn('Optional cache failed for:', url, err);
                })
              )
            );
          });
      })
      .then(() => {
        console.log('Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch(err => {
        console.error('Service worker install failed:', err);
      })
  );
});

// --- Activate Event ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME) // Delete old caches
            .map(name => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('Service worker activated');
        return self.clients.claim(); // Take control of all clients immediately
      })
  );
});

// --- Fetch Event ---
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and non-http requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Don't cache bad responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
              return networkResponse;
            }

            // Clone and cache the new response dynamically
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            // Offline fallback — serve index.html for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});
