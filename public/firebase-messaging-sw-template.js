importScripts("https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "%NEXT_PUBLIC_FIREBASE_API_KEY%",
  authDomain: "%NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN%",
  projectId: "%NEXT_PUBLIC_FIREBASE_PROJECT_ID%",
  storageBucket: "%NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET%",
  messagingSenderId: "%NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID%",
  appId: "%NEXT_PUBLIC_FIREBASE_APP_ID%",
  measurementId: "%NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID%",
});

const messaging = firebase.messaging();

self.addEventListener("push", (event) => {
  console.log("📨 Push event received:", event);
  
  const payload = event.data?.json();
  console.log("📦 Push payload:", payload);
  
  if (!payload) {
    console.log("❌ No payload in push event");
    return;
  }

  const options = {
    body: payload.notification?.body || "",
    icon: payload.notification?.icon || "/favicon.ico",
    badge: payload.notification?.badge || "/favicon.ico",
    tag: payload.data?.tag || "default",
    requireInteraction: payload.data?.requireInteraction || false,
    data: payload.data || {},
    actions: payload.data?.actions || [],
    silent: false,
  };

  console.log("🔔 Showing notification:", payload.notification?.title || "Notification");
  
  event.waitUntil(
    self.registration.showNotification(payload.notification?.title || "Notification", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === "view" || !action) {
    if (data.url) {
      event.waitUntil(
        clients.openWindow(data.url)
      );
    }
  } else if (action === "edit") {
    if (data.url) {
      event.waitUntil(
        clients.openWindow(data.url)
      );
    }
  }
});

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "Background Message";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: payload.notification?.icon || "/favicon.ico",
    badge: payload.notification?.badge || "/favicon.ico",
    tag: payload.data?.tag || "default",
    requireInteraction: payload.data?.requireInteraction || false,
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
