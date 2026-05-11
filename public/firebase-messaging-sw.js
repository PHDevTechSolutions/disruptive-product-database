importScripts("https://www.gstatic.com/firebasejs/12.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBcNuHZ_w6c0Qib-NnGyxMtomxIxNOD4p0",
  authDomain: "disruptive-product-datab-d518f.firebaseapp.com",
  projectId: "disruptive-product-datab-d518f",
  storageBucket: "disruptive-product-datab-d518f.firebasestorage.app",
  messagingSenderId: "130447840889",
  appId: "1:130447840889:web:e10a1ebd58e61742cea6a8",
  measurementId: "G-WCNF6TNC3R",
});

const messaging = firebase.messaging();

self.addEventListener("push", (event) => {
  const payload = event.data?.json();
  
  if (!payload) return;

  const options = {
    body: payload.notification?.body || "",
    icon: payload.notification?.icon || "/favicon.ico",
    badge: payload.notification?.badge || "/favicon.ico",
    tag: payload.data?.tag || "default",
    requireInteraction: payload.data?.requireInteraction || false,
    data: payload.data || {},
    actions: payload.data?.actions || [],
  };

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
