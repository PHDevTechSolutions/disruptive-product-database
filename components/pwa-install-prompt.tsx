"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, X, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS (which doesn't support beforeinstallprompt)
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user previously dismissed
      const dismissed = localStorage.getItem("pwa-prompt-dismissed");
      const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (!dismissed || Date.now() - dismissedTime > weekInMs) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem("pwa-installed", "true");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
  };

  // Don't show if already installed
  if (isInstalled) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Install Espiron App</DialogTitle>
              <DialogDescription>
                Get faster access and native notifications
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Quick Access</p>
                <p className="text-sm text-muted-foreground">
                  Launch directly from your home screen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get instant alerts for products, suppliers & requests
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Offline Support</p>
                <p className="text-sm text-muted-foreground">
                  Access cached data even without internet
                </p>
              </div>
            </div>
          </div>

          {isIOS && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Smartphone className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">iOS Installation</p>
                  <p className="text-amber-700">
                    Tap the share button in Safari, then "Add to Home Screen"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleDismiss}>
            <X className="w-4 h-4 mr-2" />
            Later
          </Button>
          {!isIOS && deferredPrompt && (
            <Button className="flex-1" onClick={handleInstall}>
              <Download className="w-4 h-4 mr-2" />
              Install
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      const iOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(standalone || iOSStandalone);
    };

    checkStatus();

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return { isInstalled, canInstall };
}
