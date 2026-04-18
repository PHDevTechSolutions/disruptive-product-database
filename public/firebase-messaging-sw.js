// Firebase Cloud Messaging Service Worker for Espiron
// Handles background push notifications from Firebase

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Espiron Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHkaSnlv5RikDaw-37PAT-1j1XvSfLIo4",
  authDomain: "espiron-1e202.firebaseapp.com",
  projectId: "espiron-1e202",
  storageBucket: "espiron-1e202.appspot.com",
  messagingSenderId: "944237041937",
  appId: "1:944237041937:web:bc8a8a5e0e4c7d5d92f5d4",
  measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Espiron Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || payload.data?.icon || '/disruptive-logo.png',
    badge: '/disruptive-logo.png',
    tag: payload.data?.tag || 'espiron-fcm',
    requireInteraction: true,
    renotify: true,
    data: payload.data || {},
    actions: [
      {
        action: 'view',
        title: 'View'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification click:', event);
  event.notification.close();

  const data = event.notification.data;
  let url = '/';

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Route based on notification type
  if (data?.type === 'product' || data?.notificationType === 'product') {
    url = '/products';
  } else if (data?.type === 'supplier' || data?.notificationType === 'supplier') {
    url = '/suppliers';
  } else if (data?.type === 'request' || data?.notificationType === 'request') {
    url = '/requests';
  } else if (data?.url) {
    url = data.url;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Handle push event (backup for non-FCM push)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Espiron';
      const options = {
        body: data.body || 'New notification',
        icon: data.icon || '/disruptive-logo.png',
        badge: '/disruptive-logo.png',
        tag: data.tag || 'espiron-push',
        data: data.data || {}
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error('[FCM SW] Error showing notification:', e);
    }
  }
});
