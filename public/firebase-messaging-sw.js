/**
 * Firebase Cloud Messaging Service Worker
 * 
 * This service worker handles background push notifications.
 * It runs even when the app is closed or the phone screen is off.
 * 
 * IMPORTANT: This file must be in the public directory to work properly.
 */

// Firebase SDK imports - using global importScripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// ==========================================
// ESPIRON Firebase Configuration
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBQrL3x-C-1AyHMmOqsBVkT4D5L6P_I1Rg",
  authDomain: "espiron-1e202.firebaseapp.com",
  projectId: "espiron-1e202",
  storageBucket: "espiron-1e202.appspot.com",
  messagingSenderId: "944237041937",
  appId: "1:944237041937:web:a1b2c3d4e5f678901234567",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// ==========================================
// BACKGROUND PUSH NOTIFICATION HANDLER
// ==========================================
// This fires when a push message is received while the app is in background/closed

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extract notification data from payload
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationBody = payload.notification?.body || payload.data?.body || '';
  const notificationIcon = payload.notification?.icon || '/disruptive-logo.png';
  const notificationImage = payload.notification?.image || payload.data?.image || '';
  const notificationBadge = '/disruptive-logo.png';
  const notificationTag = payload.data?.tag || payload.notification?.tag || 'default';
  const notificationData = payload.data || {};
  const clickAction = payload.data?.click_action || payload.notification?.click_action || '/';
  const requestId = payload.data?.request_id || '';
  const spfNumber = payload.data?.spf_number || '';
  const notificationType = payload.data?.type || 'general';

  // Build notification actions based on type
  const actions = [];
  
  if (notificationType === 'spf_request' || spfNumber) {
    actions.push({
      action: 'view_spf',
      title: 'View SPF',
      icon: '/disruptive-logo.png'
    });
  }
  
  if (notificationType === 'chat' || requestId) {
    actions.push({
      action: 'view_chat',
      title: 'View Chat',
      icon: '/disruptive-logo.png'
    });
  }

  // Standard action for all notifications
  actions.push({
    action: 'open_app',
    title: 'Open App',
    icon: '/disruptive-logo.png'
  });

  // Build the notification options for maximum mobile compatibility
  const notificationOptions = {
    body: notificationBody,
    icon: notificationIcon,
    badge: notificationBadge,
    image: notificationImage,
    tag: notificationTag,
    data: {
      ...notificationData,
      click_action: clickAction,
      request_id: requestId,
      spf_number: spfNumber,
      type: notificationType,
      timestamp: Date.now()
    },
    actions: actions,
    requireInteraction: true, // Keep notification visible until user interacts
    renotify: true, // Replace previous notification with same tag
    silent: false,
    vibrate: [200, 100, 200, 100, 200], // Vibration pattern for mobile
    dir: 'auto',
    lang: 'en',
    timestamp: Date.now()
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ==========================================
// NOTIFICATION CLICK HANDLER
// ==========================================
// This handles when user clicks on a notification

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;
  let targetUrl = '/';

  // Determine target URL based on action and notification type
  if (action === 'view_spf' && notificationData.spf_number) {
    targetUrl = `/spf-requests?spf=${encodeURIComponent(notificationData.spf_number)}`;
  } else if (action === 'view_chat' && notificationData.request_id) {
    targetUrl = `/spf-requests/${notificationData.request_id}/chat`;
  } else if (notificationData.click_action && notificationData.click_action !== '/') {
    targetUrl = notificationData.click_action;
  } else if (notificationData.spf_number) {
    targetUrl = `/spf-requests?spf=${encodeURIComponent(notificationData.spf_number)}`;
  } else if (notificationData.request_id) {
    targetUrl = `/spf-requests/${notificationData.request_id}`;
  }

  // Handle the click - focus existing window or open new one
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          // Focus the existing window and navigate to target
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            data: notificationData
          });
          return client.focus();
        }
      }

      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ==========================================
// PUSH EVENT HANDLER (Backup for FCM)
// ==========================================
// This handles raw push events from the push service

self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received:', event);

  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    
    // If FCM didn't handle it, handle it ourselves
    if (!payload.notification && payload.data) {
      const notificationTitle = payload.data.title || 'New Notification';
      const notificationOptions = {
        body: payload.data.body || '',
        icon: '/disruptive-logo.png',
        badge: '/disruptive-logo.png',
        tag: payload.data.tag || 'default',
        data: payload.data,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        timestamp: Date.now()
      };

      event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
      );
    }
  } catch (error) {
    console.error('[firebase-messaging-sw.js] Error handling push:', error);
  }
});

// ==========================================
// SERVICE WORKER LIFECYCLE
// ==========================================

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing...');
  
  event.waitUntil(
    caches.open('espiron-pwa-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/disruptive-logo.png',
        '/musics/notif-sound.mp3'
      ]);
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('espiron-pwa-') && name !== 'espiron-pwa-v1')
            .map((name) => caches.delete(name))
        );
      }),
      // Take control of all clients
      clients.claim()
    ])
  );
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[firebase-messaging-sw.js] Message received:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - network first strategy for dynamic content
self.addEventListener('fetch', (event) => {
  // Let Firebase handle its own requests
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('gstatic.com') ||
      event.request.url.includes('firebase')) {
    return;
  }

  // Network first strategy for API calls
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open('espiron-api-cache').then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache first for static assets
  if (event.request.destination === 'image' || 
      event.request.destination === 'style' ||
      event.request.destination === 'script' ||
      event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchResponse) => {
          return caches.open('espiron-assets-v1').then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});

console.log('[firebase-messaging-sw.js] Service Worker loaded successfully');
