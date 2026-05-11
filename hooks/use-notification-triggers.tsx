"use client";

import { useCallback, useEffect, useRef } from "react";
import { triggerNotification, broadcastNotification, listenForBroadcastNotifications } from "@/lib/notification-helpers";
import { NotificationType, NotificationTriggerData, NotificationPayload } from "@/types/notifications";

export function useNotificationTriggers() {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Local notification triggers (for the user performing the action)
  const onProductAdded = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("product_added", data);
    },
    []
  );

  const onProductUpdated = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("product_updated", data);
    },
    []
  );

  const onSupplierAdded = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("supplier_added", data);
    },
    []
  );

  const onSupplierUpdated = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("supplier_updated", data);
    },
    []
  );

  const onSPFCreated = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("spf_created", data);
    },
    []
  );

  const onSPFUpdated = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("spf_updated", data);
    },
    []
  );

  const onSPFApproved = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("spf_approved", data);
    },
    []
  );

  const onSPFRejected = useCallback(
    async (data: NotificationTriggerData) => {
      await triggerNotification("spf_rejected", data);
    },
    []
  );

  const triggerCustomNotification = useCallback(
    async (type: NotificationType, data: NotificationTriggerData) => {
      await triggerNotification(type, data);
    },
    []
  );

  // Broadcast notification triggers (for all users)
  const broadcastProductAdded = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("product_added", data);
    },
    []
  );

  const broadcastProductUpdated = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("product_updated", data);
    },
    []
  );

  const broadcastSupplierAdded = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("supplier_added", data);
    },
    []
  );

  const broadcastSupplierUpdated = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("supplier_updated", data);
    },
    []
  );

  const broadcastSPFCreated = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("spf_created", data);
    },
    []
  );

  const broadcastSPFUpdated = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("spf_updated", data);
    },
    []
  );

  const broadcastSPFApproved = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("spf_approved", data);
    },
    []
  );

  const broadcastSPFRejected = useCallback(
    async (data: NotificationTriggerData) => {
      await broadcastNotification("spf_rejected", data);
    },
    []
  );

  const broadcastCustomNotification = useCallback(
    async (type: NotificationType, data: NotificationTriggerData) => {
      await broadcastNotification(type, data);
    },
    []
  );

  // Listen for broadcast notifications from other users
  const startListening = useCallback(
    (onNotification: (payload: NotificationPayload) => void, settings?: { soundEnabled: boolean; vibrationEnabled: boolean }) => {
      // Clean up previous listener if exists
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      unsubscribeRef.current = listenForBroadcastNotifications(onNotification, settings);
    },
    []
  );

  const stopListening = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    // Local triggers
    onProductAdded,
    onProductUpdated,
    onSupplierAdded,
    onSupplierUpdated,
    onSPFCreated,
    onSPFUpdated,
    onSPFApproved,
    onSPFRejected,
    triggerCustomNotification,
    
    // Broadcast triggers
    broadcastProductAdded,
    broadcastProductUpdated,
    broadcastSupplierAdded,
    broadcastSupplierUpdated,
    broadcastSPFCreated,
    broadcastSPFUpdated,
    broadcastSPFApproved,
    broadcastSPFRejected,
    broadcastCustomNotification,
    
    // Listener controls
    startListening,
    stopListening,
  };
}
