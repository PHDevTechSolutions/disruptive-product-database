// lib/badge-counter.ts
// Utility to update PWA app icon badge count

/**
 * Update the PWA app icon badge count
 * Shows number of unread notifications on the app icon
 */
export function updateBadgeCount(count: number): void {
  if (typeof navigator === "undefined") return;

  // Check if Badging API is supported (Android/Chrome)
  if ("setAppBadge" in navigator) {
    try {
      if (count > 0) {
        (navigator as any).setAppBadge(count);
        console.log(`📛 Badge set: ${count}`);
      } else {
        (navigator as any).clearAppBadge();
        console.log("📛 Badge cleared");
      }
    } catch (err) {
      console.error("Failed to update badge:", err);
    }
  } else {
    console.log("Badge API not supported on this device");
  }
}

/**
 * Increment badge count by 1
 */
export function incrementBadge(): void {
  if (typeof navigator === "undefined") return;

  // For iOS, we need to track count ourselves since iOS doesn't support Badging API yet
  const currentCount = getBadgeCount();
  updateBadgeCount(currentCount + 1);
}

/**
 * Get current badge count (stored in localStorage for persistence)
 */
function getBadgeCount(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem("pwa-badge-count");
  return stored ? parseInt(stored, 10) || 0 : 0;
}

/**
 * Clear badge count
 */
export function clearBadge(): void {
  updateBadgeCount(0);
  if (typeof window !== "undefined") {
    localStorage.setItem("pwa-badge-count", "0");
  }
}

/**
 * Request notification permission and show a test notification
 * This helps users understand how notifications will look
 */
export async function showTestNotification(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.error("Notifications not supported");
    return false;
  }

  const permission = await Notification.requestPermission();
  
  if (permission === "granted") {
    // Show a test notification
    new Notification("Espiron", {
      body: "🔔 Notifications enabled! You'll see alerts like this.",
      icon: "/disruptive-logo.png",
      badge: "/disruptive-logo.png",
      tag: "test",
      requireInteraction: false,
    });
    
    // Try to update badge
    updateBadgeCount(1);
    
    return true;
  }
  
  return false;
}

/**
 * Check if app is installed as PWA
 */
export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check if running in standalone mode (installed PWA)
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Check if beforeinstallprompt event is available (Android/Chrome)
 */
export function canInstallPWA(): boolean {
  return typeof window !== "undefined" && "BeforeInstallPromptEvent" in window;
}
