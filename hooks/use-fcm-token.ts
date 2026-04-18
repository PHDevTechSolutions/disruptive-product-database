"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app } from "@/lib/firebase";

interface FCMTokenHook {
  token: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  deleteToken: () => Promise<void>;
}

export function useFCMToken(vapidKey?: string): FCMTokenHook {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupportedBrowser, setIsSupportedBrowser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Check browser support
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const supported = await isSupported();
        setIsSupportedBrowser(supported);
        if (!supported) {
          setError("Push notifications are not supported in this browser");
        }
      } catch (err) {
        setIsSupportedBrowser(false);
        setError("Failed to check notification support");
      }
    };
    checkSupport();
  }, []);

  // Get current permission status
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    setPermission(Notification.permission);
  }, []);

  // Initialize FCM and get token
  const initializeFCM = useCallback(async () => {
    if (!isSupportedBrowser) return;
    if (permission !== "granted") return;
    if (typeof window === "undefined") return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if service worker is registered
      if (!("serviceWorker" in navigator)) {
        throw new Error("Service workers not supported");
      }

      // Wait for service worker
      const registration = await navigator.serviceWorker.ready;
      if (!registration) {
        throw new Error("Service worker not registered");
      }

      // Initialize messaging
      const messaging = getMessaging(app);

      // Get FCM token
      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        console.log("[FCM] Token obtained successfully");
        setToken(currentToken);
        
        // Store token locally
        localStorage.setItem("fcm-token", currentToken);
        
        // Subscribe to foreground messages
        unsubscribeRef.current = onMessage(messaging, (payload) => {
          console.log("[FCM] Foreground message received:", payload);
          
          // Show notification if permission granted
          if (Notification.permission === "granted") {
            const notificationTitle = payload.notification?.title || "Espiron Notification";
            const notificationOptions = {
              body: payload.notification?.body || "You have a new notification",
              icon: payload.notification?.icon || "/espiron-logo.svg",
              badge: "/espiron-logo.svg",
              tag: payload.data?.tag || "default",
              data: payload.data || {},
              requireInteraction: true,
            };

            // Use the service worker to show notification
            if (registration.active) {
              registration.active.postMessage({
                type: "SHOW_NOTIFICATION",
                title: notificationTitle,
                options: notificationOptions,
              });
            }

            // Also dispatch custom event for in-app notifications
            const event = new CustomEvent("fcm-message", { 
              detail: payload 
            });
            window.dispatchEvent(event);
          }
        });
      } else {
        console.log("[FCM] No token available");
        setError("No registration token available");
      }
    } catch (err: any) {
      console.error("[FCM] Error:", err);
      setError(err.message || "Failed to initialize notifications");
    } finally {
      setIsLoading(false);
    }
  }, [isSupportedBrowser, permission, vapidKey]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) {
      setError("Notifications not supported");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        // Initialize FCM after permission granted
        await initializeFCM();
        return true;
      } else {
        setError("Notification permission denied");
        return false;
      }
    } catch (err: any) {
      console.error("[FCM] Permission request failed:", err);
      setError(err.message || "Failed to request permission");
      return false;
    }
  }, [initializeFCM]);

  // Delete token
  const deleteToken = useCallback(async () => {
    if (!token) return;

    try {
      const messaging = getMessaging(app);
      // Note: Firebase SDK doesn't have a direct deleteToken method
      // We just remove it from our state and localStorage
      localStorage.removeItem("fcm-token");
      setToken(null);
      
      // Unsubscribe from foreground messages
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    } catch (err) {
      console.error("[FCM] Failed to delete token:", err);
    }
  }, [token]);

  // Initialize on mount if permission already granted
  useEffect(() => {
    if (permission === "granted") {
      initializeFCM();
    } else {
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [permission, initializeFCM]);

  return {
    token,
    permission,
    isSupported: isSupportedBrowser,
    isLoading,
    error,
    requestPermission,
    deleteToken,
  };
}

// Hook to send push notification to server
export function usePushNotification() {
  const [isSending, setIsSending] = useState(false);

  const sendNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<boolean> => {
    setIsSending(true);
    try {
      // Store notification in localStorage for now (server implementation needed)
      const notifications = JSON.parse(localStorage.getItem("notifications") || "[]");
      notifications.push({
        id: Date.now().toString(),
        title,
        body,
        data,
        timestamp: Date.now(),
        read: false,
      });
      localStorage.setItem("notifications", JSON.stringify(notifications.slice(-50))); // Keep last 50

      // Trigger local notification if supported
      if (Notification.permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        if (registration.active) {
          registration.active.postMessage({
            type: "SHOW_NOTIFICATION",
            title,
            options: {
              body,
              icon: "/espiron-logo.svg",
              badge: "/espiron-logo.svg",
              data: data || {},
              tag: "local",
            },
          });
        }
      }

      return true;
    } catch (err) {
      console.error("[Push] Failed to send notification:", err);
      return false;
    } finally {
      setIsSending(false);
    }
  }, []);

  return { sendNotification, isSending };
}

// Hook to manage local notifications
export function useLocalNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    timestamp: number;
    read: boolean;
  }>>([]);

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse notifications:", e);
      }
    }
  }, []);

  // Save to localStorage when notifications change
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<typeof notifications[0], "id" | "timestamp" | "read">) => {
    const newNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
    return newNotification;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
  };
}
