// components/pwa-install-prompt.tsx
// Prompt to install app as PWA for better notifications and badge support

"use client";

import { useState, useEffect } from "react";
import { Download, X, Smartphone, Bell, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isPWA, canInstallPWA } from "@/lib/badge-counter";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const installed = isPWA();
    setIsInstalled(installed);
    if (installed) return;

    // Check if dismissed before
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS, show prompt after a delay since there's no native install prompt
    if (isIOSDevice && !installed) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("✅ PWA installed");
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "true");
    setIsVisible(false);
  };

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed || !isVisible) return null;

  // iOS Safari instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-linear-to-r from-orange-500 to-red-500 text-white px-4 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-full shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">Install Espiron on iPhone</p>
            <p className="text-xs text-white/90 mt-1">
              For lock screen notifications & badge numbers:
            </p>
            <ol className="text-xs text-white/90 mt-2 space-y-1 list-decimal pl-4">
              <li>Tap <strong>Share</strong> button in Safari</li>
              <li>Scroll down, tap <strong>Add to Home Screen</strong></li>
              <li>Open app from home screen, allow notifications</li>
            </ol>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/20 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Android/Chrome install prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-linear-to-r from-blue-600 to-indigo-600 text-white px-4 py-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-full shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Install Espiron App</p>
          <p className="text-xs text-blue-100 mt-1">
            Get the best experience with:
          </p>
          <ul className="text-xs text-blue-100 mt-2 space-y-1">
            <li className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              Lock screen notifications
            </li>
            <li className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Badge count on app icon
            </li>
            <li className="flex items-center gap-1">
              <Smartphone className="h-3 w-3" />
              Works offline
            </li>
          </ul>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-6 w-6 text-blue-200 hover:text-white hover:bg-blue-700 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={handleInstall}
          className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-semibold"
        >
          <Download className="h-4 w-4 mr-1" />
          Install App
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-blue-200 hover:text-white hover:bg-blue-700"
        >
          Later
        </Button>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
