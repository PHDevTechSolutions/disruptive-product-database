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
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if already installed
    const installed = isPWA();
    setIsInstalled(installed);
    if (installed) return;

    // Check if mobile device
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobile(isMobileDevice);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show immediately since no install prompt needed
    if (isIOSDevice) {
      setIsVisible(true);
      return;
    }

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log("✅ beforeinstallprompt event captured!");
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsReady(true);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show prompt anyway, but button will be disabled until ready
    setIsVisible(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert("Please wait a moment and try again, or tap the Chrome menu (⋮) → Add to Home Screen");
      return;
    }

    try {
      console.log("📲 Triggering install prompt...");
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        console.log("✅ PWA installed");
        setIsInstalled(true);
      } else {
        console.log("❌ User dismissed install");
      }
    } catch (err) {
      console.error("Install error:", err);
      alert("Install failed. Please use Chrome menu (⋮) → Add to Home Screen");
    }

    setDeferredPrompt(null);
  };

  // Don't show if already installed
  if (isInstalled || !isVisible) return null;

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
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={handleInstall}
          disabled={!isReady && !isIOS}
          className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-4 w-4 mr-1" />
          {isReady || isIOS ? "Install App" : "Preparing..."}
        </Button>
      </div>
    </div>
  );
}

export default PWAInstallPrompt;
