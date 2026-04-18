// Service Worker for Espiron PWA
// Handles caching, push notifications, and offline support

const CACHE_NAME = 'espiron-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/products',
  '/suppliers',
  '/requests',
  '/disruptive-logo.png',
  '/espiron-logo.svg',
  '/musics/notif-sound.mp3',
  '/musics/notif-messege-sound.mp3'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls and Supabase
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      
      return fetch(event.request).then((response) => {
        // Cache successful GET requests
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const title = data.title || 'Espiron Notification';
    const options = {
      body: data.body || '',
      icon: data.icon || '/disruptive-logo.png',
      badge: '/disruptive-logo.png',
      tag: data.tag || 'espiron-notification',
      requireInteraction: true,
      renotify: true,
      data: data.data || {},
      actions: data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );

    // Update badge counter if supported
    if (data.badgeCount !== undefined && 'setAppBadge' in navigator) {
      event.waitUntil(
        navigator.setAppBadge(data.badgeCount).catch(() => {})
      );
    }

  } catch (err) {
    console.error('[SW] Error handling push:', err);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const notificationData = event.notification.data;
  let url = '/';

  // Route based on notification type
  if (notificationData?.type === 'product') {
    url = '/products';
  } else if (notificationData?.type === 'supplier') {
    url = '/suppliers';
  } else if (notificationData?.type === 'request') {
    url = '/requests';
  } else if (notificationData?.url) {
    url = notificationData.url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Background sync for offline form submissions (if needed in future)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

// Message from main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
