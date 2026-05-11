"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, ShieldCheck, X } from "lucide-react";
import { useNotificationPermissions } from "@/hooks/use-notification-permissions";

interface NotificationPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPermissionDialog({
  open,
  onOpenChange,
}: NotificationPermissionDialogProps) {
  const { permission, isSupported, requestPermission } = useNotificationPermissions();
  const [hasShown, setHasShown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const hasShownBefore = localStorage.getItem("notificationPermissionShown");
    if (hasShownBefore) {
      setHasShown(true);
    }
  }, []);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      await requestPermission();
      localStorage.setItem("notificationPermissionShown", "true");
      setHasShown(true);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to request permission:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("notificationPermissionShown", "true");
    setHasShown(true);
    onOpenChange(false);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Dialog open={open && !hasShown} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enable Notifications
          </DialogTitle>
          <DialogDescription>
            Stay informed about product updates, supplier changes, and SPF requests with real-time notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Product Updates</p>
              <p className="text-sm text-muted-foreground">
                Get notified when products are added or updated
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Supplier Changes</p>
              <p className="text-sm text-muted-foreground">
                Receive alerts for new suppliers and updates
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">SPF Requests</p>
              <p className="text-sm text-muted-foreground">
                Track approval status of your SPF requests
              </p>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Maybe Later
          </Button>
          <Button
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <Bell className="h-4 w-4 mr-2" />
            {isLoading ? "Requesting..." : "Enable Notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
