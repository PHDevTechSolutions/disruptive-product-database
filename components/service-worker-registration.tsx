"use client";

import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";

interface ServiceWorkerRegistrationProps {
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
  };
}

export function ServiceWorkerRegistration({ firebaseConfig }: ServiceWorkerRegistrationProps) {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register main service worker
  const registerServiceWorker = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) {
      console.log("[SW] Service workers not supported");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "imports",
      });

      console.log("[SW] Registered successfully:", registration.scope);
      setSwRegistration(registration);

      // Handle updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // New version available
            toast.info("Update Available", {
              description: "A new version of the app is ready. Click to update.",
              action: {
                label: "Update",
                onClick: () => {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                },
              },
              duration: 10000,
            });
          }
        });
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "BADGE_UPDATED") {
          console.log("[SW] Badge updated:", event.data.count);
        }
      });

    } catch (error) {
      console.error("[SW] Registration failed:", error);
    }
  }, []);

  // Register Firebase Messaging service worker
  const registerFirebaseSW = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/",
      });

      console.log("[FCM SW] Registered successfully:", registration.scope);

      // Send Firebase config to the SW after it's activated
      if (firebaseConfig) {
        const sendConfig = async () => {
          if (registration.active) {
            registration.active.postMessage({
              type: "FIREBASE_CONFIG",
              config: firebaseConfig,
            });
          } else {
            // Wait for activation
            setTimeout(sendConfig, 1000);
          }
        };
        sendConfig();
      }

    } catch (error) {
      console.error("[FCM SW] Registration failed:", error);
    }
  }, [firebaseConfig]);

  useEffect(() => {
    // Wait for page to load
    if (document.readyState === "complete") {
      registerServiceWorker();
      registerFirebaseSW();
    } else {
      window.addEventListener("load", () => {
        registerServiceWorker();
        registerFirebaseSW();
      });
    }
  }, [registerServiceWorker, registerFirebaseSW]);

  return null;
}

// Helper to update badge from client side
export async function updateAppBadge(count: number): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Try native badge API first
  if ("setAppBadge" in navigator) {
    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
      return true;
    } catch (err) {
      console.log("[Badge] Native badge API failed:", err);
    }
  }

  // Fallback: send message to service worker
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: "UPDATE_BADGE",
        count: count,
      });
      return true;
    } catch (err) {
      console.log("[Badge] SW badge update failed:", err);
    }
  }

  return false;
}

// Helper to check if push notifications are supported
export function isPushNotificationSupported(): boolean {
  return typeof window !== "undefined" && 
    "serviceWorker" in navigator && 
    "PushManager" in window;
}

// Helper to check notification permission
export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "denied";
  return Notification.permission;
}

// Helper to request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}
