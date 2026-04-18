"use client";

import { useEffect, useState } from "react";
import { useFCMToken } from "@/hooks/use-fcm-token";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing, X } from "lucide-react";

interface NotificationBannerProps {
  userId: string | null | undefined;
}

export function NotificationBanner({ userId }: NotificationBannerProps) {
  const { permission, requestPermission, error, isSupported } = useFCMToken(userId ?? null);
  const perm = permission as "default" | "granted" | "denied";
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = localStorage.getItem("notification-banner-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const dayInMs = 24 * 60 * 60 * 1000;
      // Reset after 3 days
      if (Date.now() - dismissedTime > 3 * dayInMs) {
        localStorage.removeItem("notification-banner-dismissed");
      } else {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("notification-banner-dismissed", Date.now().toString());
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 text-sm rounded-md flex items-center gap-2">
        <BellOff className="w-4 h-4" />
        <span>Your browser doesn&apos;t support push notifications.</span>
      </div>
    );
  }

  if (perm === "denied") {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 text-sm rounded-md flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellOff className="w-4 h-4" />
          <span>Notifications are blocked. Enable in browser settings to receive updates.</span>
        </div>
      </div>
    );
  }

  if (perm === "granted") {
    if (error) {
      return (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-2 text-sm rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4" />
            <span>⚠️ {error}</span>
          </div>
        </div>
      );
    }
    // Permission granted - no banner needed
    return null;
  }

  if (isDismissed) return null;

  // Default state - permission not requested yet
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium">Stay Updated</p>
          <p className="text-sm text-blue-700">
            Enable notifications to get instant alerts for new products, suppliers, and SPF requests.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-blue-700 hover:text-blue-800 hover:bg-blue-100"
        >
          <X className="w-4 h-4" />
        </Button>
        <Button
          onClick={requestPermission}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <BellRing className="w-4 h-4 mr-2" />
          Enable
        </Button>
      </div>
    </div>
  );
}
