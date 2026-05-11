"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationPermissions } from "@/hooks/use-notification-permissions";

interface NotificationBadgeProps {
  unreadCount?: number;
  onClick?: () => void;
  showPermissionStatus?: boolean;
}

export function NotificationBadge({
  unreadCount = 0,
  onClick,
  showPermissionStatus = false,
}: NotificationBadgeProps) {
  const { isGranted, isDenied } = useNotificationPermissions();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className="relative"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
        {showPermissionStatus && isDenied && (
          <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </Button>
    </div>
  );
}
