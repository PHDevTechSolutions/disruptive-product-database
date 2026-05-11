"use client";

import { useState, useEffect, useCallback } from "react";
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  isNotificationSupported,
} from "@/lib/browser-notifications";

export function useNotificationPermissions() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsSupported(isNotificationSupported());
    setPermission(getNotificationPermissionStatus());
    setIsLoading(false);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      setPermission("denied");
      return "denied";
    }
  }, []);

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";
  const isDefault = permission === "default";

  return {
    permission,
    isSupported,
    isLoading,
    requestPermission,
    isGranted,
    isDenied,
    isDefault,
  };
}
