"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Package, Building2, FileText, AlertCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  type: "product" | "supplier" | "request" | "chat" | "system";
  timestamp: number;
  read: boolean;
  data?: {
    url?: string;
    id?: string;
    [key: string]: any;
  };
}

interface NotificationBannerProps {
  notifications: NotificationData[];
  onDismiss: (id: string) => void;
  onClick: (notification: NotificationData) => void;
  maxVisible?: number;
}

const typeConfig = {
  product: {
    icon: Package,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  supplier: {
    icon: Building2,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  request: {
    icon: FileText,
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  chat: {
    icon: MessageCircle,
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  system: {
    icon: AlertCircle,
    color: "bg-red-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export function NotificationBanner({
  notifications,
  onDismiss,
  onClick,
  maxVisible = 3,
}: NotificationBannerProps) {
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    // Filter unread notifications and limit to maxVisible
    const unread = notifications
      .filter((n) => !n.read)
      .slice(0, maxVisible);
    setVisibleNotifications(unread);
  }, [notifications, maxVisible]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            index={index}
            onDismiss={onDismiss}
            onClick={onClick}
          />
        ))}
      </AnimatePresence>
      
      {notifications.filter((n) => !n.read).length > maxVisible && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="pointer-events-auto bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg self-end"
        >
          +{notifications.filter((n) => !n.read).length - maxVisible} more
        </motion.div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: NotificationData;
  index: number;
  onDismiss: (id: string) => void;
  onClick: (notification: NotificationData) => void;
}

function NotificationItem({ notification, index, onDismiss, onClick }: NotificationItemProps) {
  const config = typeConfig[notification.type];
  const Icon = config.icon;

  const handleClick = useCallback(() => {
    onClick(notification);
    onDismiss(notification.id);
  }, [notification, onClick, onDismiss]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(notification.id);
  }, [notification.id, onDismiss]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 8000);

    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: index * 0.1,
      }}
      className={`pointer-events-auto w-80 md:w-96 ${config.bgColor} ${config.borderColor} border rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 p-3">
        <div className={`shrink-0 w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold text-sm ${config.textColor} line-clamp-1`}>
              {notification.title}
            </h4>
            <button
              onClick={handleDismiss}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
            {notification.body}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {formatTime(notification.timestamp)}
          </p>
        </div>
      </div>
      <div className={`h-1 ${config.color}`} style={{ width: "100%" }}>
        <motion.div
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 8, ease: "linear" }}
          className="h-full bg-white/30"
        />
      </div>
    </motion.div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// Compact notification badge for sidebar/menu
interface NotificationBadgeProps {
  count: number;
  showZero?: boolean;
  size?: "sm" | "md" | "lg";
}

export function NotificationBadge({ count, showZero = false, size = "sm" }: NotificationBadgeProps) {
  if (count === 0 && !showZero) return null;

  const sizeClasses = {
    sm: "h-4 min-w-4 text-[10px]",
    md: "h-5 min-w-5 text-xs",
    lg: "h-6 min-w-6 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-1.5 ${sizeClasses[size]} rounded-full bg-red-500 text-white font-bold shadow-sm animate-in zoom-in duration-200`}
      style={{
        boxShadow: count > 0 ? "0 0 8px rgba(239, 68, 68, 0.5)" : undefined,
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Bell icon with notification indicator
interface NotificationBellProps {
  count: number;
  onClick?: () => void;
}

export function NotificationBell({ count, onClick }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <Bell className="w-5 h-5 text-gray-600" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] rounded-full bg-red-500 text-white font-bold shadow-sm animate-pulse">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
