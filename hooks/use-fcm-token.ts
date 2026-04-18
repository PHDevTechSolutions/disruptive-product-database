// hooks/use-fcm-token.ts
// Hook to manage FCM tokens and request notification permissions

"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/utils/supabase";

interface UseFCMTokenReturn {
  token: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<boolean>;
}

export function useFCMToken(userId: string | null): UseFCMTokenReturn {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if notifications are supported
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkSupport = () => {
      if (!("Notification" in window)) {
        setIsSupported(false);
        setError("This browser does not support notifications");
        return false;
      }
      if (!("serviceWorker" in navigator)) {
        setIsSupported(false);
        setError("This browser does not support service workers");
        return false;
      }
      return true;
    };

    setIsSupported(checkSupport());
    setPermission(Notification.permission);
  }, []);

  // Initialize Firebase and get token
  const initializeFCM = useCallback(async () => {
    if (!userId || !isSupported) return;
    if (Notification.permission !== "granted") return;

    setIsLoading(true);
    setError(null);

    try {
      // Dynamically import Firebase
      const { initializeApp, getApps } = await import("firebase/app");
      const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

      // Firebase config using existing env variables
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Initialize only if not already initialized
      const app = getApps().length === 0 
        ? initializeApp(firebaseConfig) 
        : getApps()[0];

      const messaging = getMessaging(app);

      // Register service worker first
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get FCM token with VAPID key
      const vapidKey = process.env.FIREBASE_PUBLIC_KEY_ESPIRON;
      
      if (!vapidKey) {
        console.warn("No VAPID key found, trying without...");
      }

      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (currentToken) {
        console.log("✅ FCM Token obtained:", currentToken.substring(0, 20) + "...");
        setToken(currentToken);

        // Save to database
        const { error: upsertError } = await supabase.from("fcm_tokens").upsert(
          {
            user_id: userId,
            token: currentToken,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "token" }
        );

        if (upsertError) {
          console.error("Failed to save FCM token:", upsertError);
        } else {
          console.log("✅ FCM token saved to database");
        }

        // Handle foreground messages
        onMessage(messaging, (payload) => {
          console.log("📨 Foreground message received:", payload);
          
          // Show notification even in foreground
          if (payload.notification && Notification.permission === "granted") {
            const { title, body } = payload.notification;
            const url = payload.data?.url || "/";

            // Use the service worker to show notification
            registration.showNotification(title || "New Notification", {
              body: body || "",
              icon: "/disruptive-logo.png",
              badge: "/disruptive-logo.png",
              tag: payload.data?.tag || "default",
              requireInteraction: true,
              data: { url, ...payload.data },
            });
          }
        });
      } else {
        console.warn("No FCM token available");
        setError("Failed to get FCM token");
      }
    } catch (err: any) {
      console.error("FCM initialization error:", err);
      setError(err.message || "Failed to initialize notifications");
    } finally {
      setIsLoading(false);
    }
  }, [userId, isSupported]);

  // Request permission from user
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Notifications not supported");
      return false;
    }

    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        console.log("✅ Notification permission granted");
        // Initialize FCM after permission granted
        await initializeFCM();
        return true;
      } else {
        console.log("❌ Notification permission denied:", result);
        setError("Permission denied. Please enable notifications in browser settings.");
        return false;
      }
    } catch (err: any) {
      console.error("Permission request error:", err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, initializeFCM]);

  // Auto-initialize if permission already granted
  useEffect(() => {
    if (userId && isSupported && Notification.permission === "granted") {
      initializeFCM();
    }
  }, [userId, isSupported, initializeFCM]);

  return {
    token,
    permission,
    isSupported,
    isLoading,
    error,
    requestPermission,
  };
}

export default useFCMToken;
