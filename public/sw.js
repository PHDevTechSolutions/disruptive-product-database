// sw.js - Service Worker for PWA
// This enables offline support and PWA installability

const CACHE_NAME = 'espiron-v1';
const urlsToCache = [
  '/',
  '/disruptive-logo.png',
  '/espiron-logo.svg'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching assets');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // If both fail, return offline page (optional)
        console.log('[SW] Fetch failed, no cache');
      })
  );
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
