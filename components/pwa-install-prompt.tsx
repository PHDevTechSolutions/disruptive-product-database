"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone, Bell } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  variant?: "default" | "comic";
}

export function PWAInstallPrompt({ variant = "default" }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const isComic = variant === "comic";

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem("pwa-installed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS - show manual install prompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    if (isIOS && isSafari && !isInstalled && !dismissed) {
      // Show iOS install hint after a delay
      const timer = setTimeout(() => {
        if (!deferredPrompt) {
          setIsVisible(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [deferredPrompt, isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      // iOS manual instructions
      alert('To install on iOS:\n1. Tap the Share button\n2. Scroll down and tap "Add to Home Screen"');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("PWA installed successfully");
    } else {
      console.log("PWA install dismissed");
    }
    
    setDeferredPrompt(null);
    setIsVisible(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  }, []);

  if (!isVisible || isInstalled) return null;

  // iOS Safari manual install UI
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !deferredPrompt;

  if (isComic) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="comic-card bg-yellow-50 border-4 border-yellow-400 shadow-[8px_8px_0px_0px_rgba(251,191,36,1)] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-12 h-12 rounded-full bg-yellow-400 border-4 border-black flex items-center justify-center comic-animate-bounce">
              {isIOS ? <Smartphone className="w-6 h-6 text-black" /> : <Download className="w-6 h-6 text-black" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-comic-title text-lg text-black leading-tight">
                {isIOS ? "Add to Home Screen! 📱" : "Install Espiron App! 🚀"}
              </h3>
              <p className="font-comic text-sm text-gray-700 mt-1">
                {isIOS 
                  ? "Tap Share → 'Add to Home Screen' for quick access!"
                  : "Get notifications & offline access like a native app!"}
              </p>
              <div className="flex gap-2 mt-3">
                {!isIOS && (
                  <Button 
                    onClick={handleInstall}
                    className="comic-btn-primary flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install Now
                  </Button>
                )}
                <Button 
                  onClick={handleDismiss}
                  variant="outline"
                  className="comic-btn-outline"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white border border-gray-200 shadow-lg rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            {isIOS ? <Smartphone className="w-5 h-5 text-red-600" /> : <Download className="w-5 h-5 text-red-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">
                {isIOS ? "Add to Home Screen" : "Install Espiron App"}
              </h3>
              <button 
                onClick={handleDismiss}
                className="shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {isIOS 
                ? "Tap the Share button and select 'Add to Home Screen' for quick access."
                : "Install for push notifications, offline access, and a better experience."}
            </p>
            {!isIOS && (
              <Button 
                onClick={handleInstall}
                size="sm"
                className="mt-3 w-full bg-red-600 hover:bg-red-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Install App
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to check if PWA is installed
export function usePWAInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();
    window.addEventListener("appinstalled", () => setIsInstalled(true));
  }, []);

  return isInstalled;
}
