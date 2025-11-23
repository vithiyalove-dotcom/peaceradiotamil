// service-worker.js - place at project root to control site scope

const CACHE_NAME = 'peacefm-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache static assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching files');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch: avoid caching streaming URLs & API endpoints; use cache-first for static
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Bypass streaming and API status requests (always network)
  if (url.includes('/api/status') || url.includes('sapircast.caster.fm') || url.includes('workers.dev') || event.request.method !== 'GET') {
    event.respondWith(fetch(event.request).catch(() => {
      // If network fails for API/status or stream, show fallback
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' }});
    }));
    return;
  }

  // Navigation requests -> serve index.html (SPA) fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first strategy for other static GET requests
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(networkResponse => {
        // Only cache same-origin, successful GET requests
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If request fails and is for an image or CSS/JS return cached fallback if available
        return caches.match('/index.html');
      });
    })
  );
});
