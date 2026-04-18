"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, Download, Smartphone, X } from "lucide-react";

// Type for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * PWA Install Prompt Component
 * 
 * Shows prompts for:
 * 1. Installing the PWA (Add to Home Screen)
 * 2. Enabling push notifications
 * 3. iOS specific instructions (since iOS doesn't support beforeinstallprompt)
 */
export function PWAPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Check if running as installed PWA and detect platform
  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iOS);

    // Listen for display mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      setIsInstalled(e.matches);
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after a delay if not already installed
      if (!isInstalled && !isStandalone) {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      console.log("PWA was installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For iOS, show instructions after delay
    if (isIOS && !isStandalone) {
      const hasSeenIOSPrompt = localStorage.getItem("espiron-ios-prompt-seen");
      if (!hasSeenIOSPrompt) {
        setTimeout(() => {
          setShowIOSPrompt(true);
        }, 5000);
      }
    }

    // Check notification permission status
    if ("Notification" in window) {
      const permission = Notification.permission;
      if (permission === "default" && !isStandalone) {
        setTimeout(() => {
          setShowNotificationPrompt(true);
        }, 8000);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isInstalled, isStandalone, isIOS]);

  // Handle PWA install
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      // If no deferred prompt (e.g., already dismissed), show instructions
      if (isIOS) {
        setShowIOSPrompt(true);
      }
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  }, [deferredPrompt, isIOS]);

  // Handle notification permission request
  const handleEnableNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === "granted") {
      console.log("Notification permission granted");
      // Register service worker and FCM
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
          console.log("Service Worker registered:", registration);
        } catch (error) {
          console.error("Service Worker registration failed:", error);
        }
      }
    }
    
    setShowNotificationPrompt(false);
  }, []);

  // Dismiss prompts
  const dismissInstall = useCallback(() => {
    setShowInstallPrompt(false);
    // Store dismissal time to not show again for a week
    localStorage.setItem("espiron-install-dismissed", Date.now().toString());
  }, []);

  const dismissIOS = useCallback(() => {
    setShowIOSPrompt(false);
    localStorage.setItem("espiron-ios-prompt-seen", "true");
  }, []);

  const dismissNotification = useCallback(() => {
    setShowNotificationPrompt(false);
  }, []);

  // Don't show prompts if already installed
  if (isStandalone) return null;

  return (
    <>
      {/* Android/Chrome Install Prompt */}
      <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Install Espiron App
            </DialogTitle>
            <DialogDescription>
              Install Espiron on your device for the best experience.
              Get instant notifications even when the app is closed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Smartphone className="w-10 h-10 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Native App Experience</p>
                <p className="text-sm text-muted-foreground">
                  Full-screen mode, offline access, and push notifications
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={dismissInstall}
              >
                <X className="w-4 h-4 mr-2" />
                Not Now
              </Button>
              <Button 
                className="flex-1"
                onClick={handleInstall}
              >
                <Download className="w-4 h-4 mr-2" />
                Install
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS Install Instructions */}
      <Dialog open={showIOSPrompt} onOpenChange={setShowIOSPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Add to Home Screen
            </DialogTitle>
            <DialogDescription>
              Install Espiron on your iOS device:
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  1
                </span>
                <span>Tap the <strong>Share</strong> button in Safari&apos;s toolbar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  2
                </span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  3
                </span>
                <span>Tap <strong>Add</strong> in the top right corner</span>
              </li>
            </ol>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong>Note:</strong> On iOS, background notifications require the app to be added to your home screen first.
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={dismissIOS}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Permission Prompt */}
      <Dialog open={showNotificationPrompt} onOpenChange={setShowNotificationPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Enable Notifications
            </DialogTitle>
            <DialogDescription>
              Get instant alerts for new SPF requests, product updates, and messages — even when the app is closed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Bell className="w-10 h-10 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Stay Updated</p>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications for important updates
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Works even when app is closed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Instant delivery to your device</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Customizable notification settings</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={dismissNotification}
              >
                Maybe Later
              </Button>
              <Button 
                className="flex-1"
                onClick={handleEnableNotifications}
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Hook to check PWA install status
 */
export function usePWAStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
                      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    const handleBeforeInstallPrompt = () => {
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return { isInstalled, canInstall, isStandalone };
}

export default PWAPrompt;
