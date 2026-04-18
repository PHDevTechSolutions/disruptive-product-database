// components/notification-banner.tsx
// Banner to prompt users to enable push notifications

"use client";

import { useState, useEffect } from "react";
import { Bell, X, BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useFCMToken } from "@/hooks/use-fcm-token";

export function NotificationBanner() {
  const { userId } = useUser();
  const { permission, isSupported, isLoading, error, requestPermission, token } = useFCMToken(userId);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Check localStorage for dismissed state
  useEffect(() => {
    const dismissed = localStorage.getItem("notification-banner-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  // Show banner if permission not granted and not dismissed
  useEffect(() => {
    if (!userId || isDismissed) {
      setShowBanner(false);
      return;
    }

    if (permission === "default" && !token) {
      setShowBanner(true);
    } else if (permission === "granted" && token) {
      // Hide after successful setup
      setTimeout(() => setShowBanner(false), 3000);
    } else if (permission === "denied") {
      setShowBanner(false);
    }
  }, [userId, permission, token, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("notification-banner-dismissed", "true");
    setShowBanner(false);
  };

  const handleEnable = async () => {
    const success = await requestPermission();
    if (success) {
      console.log("Notifications enabled successfully!");
    }
  };

  // Don't render if not supported
  if (!isSupported) return null;

  // Don't render if dismissed or no user
  if (!userId || isDismissed) return null;

  // Show success state briefly
  if (permission === "granted" && token && showBanner) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300">
        <BellRing className="h-5 w-5 text-green-600" />
        <span className="text-sm font-medium">Notifications enabled! You&apos;ll receive updates even when offline.</span>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setShowBanner(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Show denied state in settings
  if (permission === "denied" && !isDismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
        <BellOff className="h-5 w-5 text-yellow-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Notifications blocked</p>
          <p className="text-xs mt-1">Enable in browser settings to receive updates.</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Main banner
  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white px-4 py-4 rounded-lg shadow-xl flex items-center gap-4 max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-blue-500 p-2 rounded-full">
        <Bell className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">Enable push notifications?</p>
        <p className="text-xs text-blue-100 mt-1">
          Get instant alerts for new products, suppliers, and SPF updates - even when the app is closed.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleEnable}
          disabled={isLoading}
          className="bg-white text-blue-600 hover:bg-blue-50"
        >
          {isLoading ? "Loading..." : "Enable"}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-blue-200 hover:text-white hover:bg-blue-700">
          Later
        </Button>
      </div>
    </div>
  );
}

export default NotificationBanner;
