const CACHE = 'peacefm-v1';
const FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', ev => {
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', ev => {
  ev.respondWith(
    caches.match(ev.request).then(res => res || fetch(ev.request))
  );
});

const CACHE_NAME = "peacefm-cache-v1";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // 🔥 CLOUDLFARE STREAM URL வந்து விட்டா - CACHE செய்யக்கூடாது!
  if (url.includes('vithiyalove.workers.dev')) {
    event.respondWith(fetch(event.request));  // direct fetch
    return;
  }

  // Static files = normal caching
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});


