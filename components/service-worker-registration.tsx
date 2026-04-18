"use client";

import { useEffect } from "react";
import { initializeBadgeCounter } from "@/lib/badge-counter";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        // Register main service worker
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        console.log("[SW] Registration successful:", registration);

        // Handle service worker updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // New version available
              console.log("[SW] New version available");
              
              // Optional: Show update prompt to user
              if (confirm("New version available! Refresh to update?")) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            }
          });
        });

        // Initialize badge counter
        initializeBadgeCounter();

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          if (event.data?.type === "BADGE_UPDATE") {
            console.log("[SW] Badge updated:", event.data.count);
          }
        });

      } catch (error) {
        console.error("[SW] Registration failed:", error);
      }
    };

    // Register when page loads
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    return () => {
      window.removeEventListener("load", registerSW);
    };
  }, []);

  return null;
}
