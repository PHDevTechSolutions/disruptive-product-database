"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { pushNotificationManager, PushNotificationPayload } from "@/lib/push-notifications";
import { badgeCounter, getBadgeBreakdown } from "@/lib/badge-counter";
import { useUser } from "./UserContext";
import { NotificationBanner, NotificationData } from "@/components/notification-banner";
import { updateAppBadge } from "@/components/service-worker-registration";

interface PushNotificationContextValue {
  notifications: NotificationData[];
  unreadCount: number;
  totalBadgeCount: number;
  requestPermission: () => Promise<boolean>;
  dismissNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  totalBadgeCount: 0,
  requestPermission: async () => false,
  dismissNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useUser();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalBadgeCount, setTotalBadgeCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Load saved notifications
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("push-notifications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
        setUnreadCount(parsed.filter((n: NotificationData) => !n.read).length);
      } catch (e) {
        console.error("Failed to parse notifications:", e);
      }
    }
  }, []);

  // Save notifications when they change
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("push-notifications", JSON.stringify(notifications.slice(0, 50)));
    const unread = notifications.filter((n) => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  // Subscribe to badge counter
  useEffect(() => {
    const unsubscribe = badgeCounter.subscribe((count) => {
      setTotalBadgeCount(count);
    });
    return unsubscribe;
  }, []);

  // Initialize push notification manager
  useEffect(() => {
    if (!userId) {
      pushNotificationManager.cleanup();
      return;
    }

    pushNotificationManager.initialize((payload) => {
      addNotification(payload);
    }, userId);

    return () => {
      pushNotificationManager.cleanup();
    };
  }, [userId]);

  // Check notification permission
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (err) {
      console.error("Failed to request permission:", err);
      return false;
    }
  }, []);

  // Add a notification
  const addNotification = useCallback((payload: PushNotificationPayload) => {
    const newNotification: NotificationData = {
      id: Date.now().toString(),
      title: payload.title,
      body: payload.body,
      type: payload.type,
      timestamp: Date.now(),
      read: false,
      data: payload.data,
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));

    // Update app badge
    updateAppBadge(unreadCount + 1);
  }, [unreadCount]);

  // Dismiss a notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    badgeCounter.clear();
    updateAppBadge(0);
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([]);
    badgeCounter.clear();
    updateAppBadge(0);
  }, []);

  // Handle notification click
  const handleNotificationClick = useCallback((notification: NotificationData) => {
    // Navigate to relevant page
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
    markAsRead(notification.id);
  }, [markAsRead]);

  return (
    <PushNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        totalBadgeCount,
        requestPermission,
        dismissNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
      
      {/* Global Notification Banner */}
      <NotificationBanner
        notifications={notifications}
        onDismiss={dismissNotification}
        onClick={handleNotificationClick}
        maxVisible={3}
      />
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  return useContext(PushNotificationContext);
}
