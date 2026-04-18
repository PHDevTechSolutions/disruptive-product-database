// components/service-worker-registration.tsx
// Registers the PWA service worker

"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register PWA service worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ PWA Service Worker registered:", registration.scope);
      })
      .catch((err) => {
        console.error("❌ Service Worker registration failed:", err);
      });
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
