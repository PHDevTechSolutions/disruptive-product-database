// Firebase Messaging Service Worker
// This handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config - will be injected by the main app
let firebaseConfig = null;

// Try to get config from cache or use default
self.addEventListener('install', (event) => {
  console.log('[FCM SW] Install event');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Activate event');
  event.waitUntil(self.clients.claim());
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

function initializeFirebase() {
  if (!firebaseConfig) {
    console.log('[FCM SW] No Firebase config available');
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Background message received:', payload);

      const notificationTitle = payload.notification?.title || payload.data?.title || 'Espiron Notification';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'New update available',
        icon: payload.notification?.icon || '/espiron-logo.svg',
        badge: '/espiron-logo.svg',
        tag: payload.data?.tag || 'default',
        requireInteraction: payload.data?.requireInteraction === 'true',
        data: payload.data || {},
        actions: [
          {
            action: 'open',
            title: 'Open App'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      };

      // Update badge count
      const badgeCount = parseInt(payload.data?.badgeCount || '1');
      updateBadge(badgeCount);

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[FCM SW] Firebase initialized successfully');
  } catch (error) {
    console.error('[FCM SW] Firebase initialization error:', error);
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification click:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  if (action === 'dismiss') {
    return;
  }

  // Determine which page to open based on notification type
  let url = '/dashboard';
  if (data.type === 'product') {
    url = '/products';
  } else if (data.type === 'supplier') {
    url = '/suppliers';
  } else if (data.type === 'request') {
    url = '/requests';
  } else if (data.url) {
    url = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );

  // Clear badge
  updateBadge(0);
});

// Update app badge
async function updateBadge(count) {
  if ('setAppBadge' in navigator) {
    try {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    } catch (err) {
      console.log('[FCM SW] Badge update failed:', err);
    }
  }

  // Broadcast to all clients
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  allClients.forEach(client => {
    client.postMessage({
      type: 'BADGE_UPDATED',
      count: count
    });
  });
}

// Handle push event (fallback for non-FCM pushes)
self.addEventListener('push', (event) => {
  console.log('[FCM SW] Push event received:', event);
  
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Espiron',
      body: event.data.text()
    };
  }

  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/espiron-logo.svg',
    badge: '/espiron-logo.svg',
    tag: data.tag || 'default',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Espiron', options)
  );

  updateBadge(data.badgeCount || 1);
});
