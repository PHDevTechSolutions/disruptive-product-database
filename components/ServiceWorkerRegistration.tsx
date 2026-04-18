"use client";

import { useEffect } from "react";

/**
 * Service Worker Registration Component
 * 
 * This component handles the registration of the Firebase Cloud Messaging service worker
 * which is essential for background push notifications on mobile devices.
 * 
 * Key features:
 * - Registers the firebase-messaging-sw.js service worker
 * - Handles service worker updates
 * - Communicates with the service worker
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;
    
    // Check if service workers are supported
    if (!("serviceWorker" in navigator)) {
      console.log("[ServiceWorker] Service workers are not supported in this browser");
      return;
    }

    // Check if running in development mode
    const isDevelopment = process.env.NODE_ENV === "development";

    const registerServiceWorker = async () => {
      try {
        // Check if service worker is already registered
        const existingRegistration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
        
        if (existingRegistration) {
          console.log("[ServiceWorker] Service worker already registered:", existingRegistration);
          
          // Check for updates
          existingRegistration.update().then(() => {
            console.log("[ServiceWorker] Checked for updates");
          });
          
          return;
        }

        // Register the service worker
        // Note: In production, the service worker file should be at the root of the public directory
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
          scope: "/",
          updateViaCache: "imports",
        });

        console.log("[ServiceWorker] Service Worker registered successfully:", registration);

        // Handle registration state
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New service worker installed, but waiting to activate
                console.log("[ServiceWorker] New service worker available, waiting to activate");
                
                // In development, skip waiting to immediately activate
                if (isDevelopment) {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              }
            });
          }
        });

        // Handle messages from the service worker
        navigator.serviceWorker.addEventListener("message", (event) => {
          console.log("[ServiceWorker] Message from service worker:", event.data);
          
          if (event.data?.type === "NOTIFICATION_CLICK") {
            // Handle notification click - navigate to the specified URL
            const url = event.data.url;
            if (url) {
              window.location.href = url;
            }
          }
        });

        // Listen for controller changes (when a new service worker takes over)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[ServiceWorker] Service Worker controller changed, reloading if needed");
          // Optionally reload the page to use the new service worker
          // window.location.reload();
        });

      } catch (error) {
        console.error("[ServiceWorker] Service Worker registration failed:", error);
      }
    };

    // Register service worker
    registerServiceWorker();

    // Cleanup function
    return () => {
      // Note: We don't unregister the service worker on unmount
      // as it should persist for the lifetime of the page/app
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}

/**
 * Utility function to unregister all service workers
 * Useful for development/debugging
 */
export async function unregisterServiceWorkers(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log("[ServiceWorker] Unregistered:", registration);
    }
    
    return true;
  } catch (error) {
    console.error("[ServiceWorker] Error unregistering:", error);
    return false;
  }
}

/**
 * Utility function to check service worker registration status
 */
export async function getServiceWorkerStatus(): Promise<{
  registered: boolean;
  registrations: ServiceWorkerRegistration[];
}> {
  if (!("serviceWorker" in navigator)) {
    return { registered: false, registrations: [] };
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  
  return {
    registered: registrations.length > 0,
    registrations: [...registrations],
  };
}

export default ServiceWorkerRegistration;
