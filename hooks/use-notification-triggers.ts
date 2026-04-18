/**
 * Notification Trigger Hooks
 * Triggers push notifications when products, suppliers, or requests change
 */

import { useCallback } from "react";
import { useUser } from "@/contexts/UserContext";
import {
  notifyProductAdded,
  notifySupplierAdded,
  notifyRequestStatusChange,
  notifyChatMessage,
} from "@/lib/push-notifications";
import {
  incrementCategoryBadge,
  BadgeCategory,
} from "@/lib/badge-counter";

export interface NotificationTriggerOptions {
  skipSelf?: boolean; // Don't notify the user who triggered the action
  targetUsers?: { userId?: string; role?: string; all?: boolean };
}

/**
 * Hook for triggering product notifications
 */
export function useProductNotifications() {
  const { userId } = useUser();

  const notifyProductCreated = useCallback(
    async (productName: string, addedByName: string = "Someone", options?: NotificationTriggerOptions) => {
      try {
        // Increment badge counter
        await incrementCategoryBadge("product");

        // Send push notification
        await notifyProductAdded(
          productName,
          addedByName,
          options?.targetUsers || { all: true }
        );
      } catch (err) {
        console.error("[Notify] Product notification failed:", err);
      }
    },
    [userId]
  );

  return { notifyProductCreated };
}

/**
 * Hook for triggering supplier notifications
 */
export function useSupplierNotifications() {
  const { userId } = useUser();

  const notifySupplierCreated = useCallback(
    async (supplierName: string, addedByName: string = "Someone", options?: NotificationTriggerOptions) => {
      try {
        // Increment badge counter
        await incrementCategoryBadge("supplier");

        // Send push notification
        await notifySupplierAdded(
          supplierName,
          addedByName,
          options?.targetUsers || { all: true }
        );
      } catch (err) {
        console.error("[Notify] Supplier notification failed:", err);
      }
    },
    [userId]
  );

  return { notifySupplierCreated };
}

/**
 * Hook for triggering request notifications
 */
export function useRequestNotifications() {
  const { userId } = useUser();

  const notifyRequestUpdated = useCallback(
    async (
      spfNumber: string,
      status: string,
      updatedByName: string = "Someone",
      options?: NotificationTriggerOptions
    ) => {
      try {
        // Increment badge counter
        await incrementCategoryBadge("request");

        // Send push notification
        await notifyRequestStatusChange(
          spfNumber,
          status,
          updatedByName,
          options?.targetUsers || { all: true }
        );
      } catch (err) {
        console.error("[Notify] Request notification failed:", err);
      }
    },
    [userId]
  );

  const notifyNewChat = useCallback(
    async (
      requestId: string,
      senderName: string,
      message: string,
      options?: NotificationTriggerOptions
    ) => {
      try {
        // Increment badge counter
        await incrementCategoryBadge("chat");

        // Send push notification
        await notifyChatMessage(
          requestId,
          senderName,
          message,
          options?.targetUsers || { all: true }
        );
      } catch (err) {
        console.error("[Notify] Chat notification failed:", err);
      }
    },
    [userId]
  );

  return { notifyRequestUpdated, notifyNewChat };
}

/**
 * Combined hook for all notifications
 */
export function useNotifications() {
  const productNotifications = useProductNotifications();
  const supplierNotifications = useSupplierNotifications();
  const requestNotifications = useRequestNotifications();

  const clearCategoryBadge = useCallback(async (category: BadgeCategory) => {
    try {
      const { clearCategoryBadge } = await import("@/lib/badge-counter");
      await clearCategoryBadge(category);
    } catch (err) {
      console.error("[Notify] Clear badge failed:", err);
    }
  }, []);

  return {
    // Product notifications
    notifyProductCreated: productNotifications.notifyProductCreated,
    
    // Supplier notifications
    notifySupplierCreated: supplierNotifications.notifySupplierCreated,
    
    // Request notifications
    notifyRequestUpdated: requestNotifications.notifyRequestUpdated,
    notifyNewChat: requestNotifications.notifyNewChat,
    
    // Badge management
    clearCategoryBadge,
  };
}

/**
 * Direct notification trigger functions (for use outside React)
 */
export async function triggerProductNotification(
  productName: string,
  addedBy: string
): Promise<void> {
  try {
    await incrementCategoryBadge("product");
    await notifyProductAdded(productName, addedBy, { all: true });
  } catch (err) {
    console.error("[Notify] Product trigger failed:", err);
  }
}

export async function triggerSupplierNotification(
  supplierName: string,
  addedBy: string
): Promise<void> {
  try {
    await incrementCategoryBadge("supplier");
    await notifySupplierAdded(supplierName, addedBy, { all: true });
  } catch (err) {
    console.error("[Notify] Supplier trigger failed:", err);
  }
}

export async function triggerRequestNotification(
  spfNumber: string,
  status: string,
  updatedBy: string
): Promise<void> {
  try {
    await incrementCategoryBadge("request");
    await notifyRequestStatusChange(spfNumber, status, updatedBy, { all: true });
  } catch (err) {
    console.error("[Notify] Request trigger failed:", err);
  }
}

export async function triggerChatNotification(
  requestId: string,
  senderName: string,
  message: string
): Promise<void> {
  try {
    await incrementCategoryBadge("chat");
    await notifyChatMessage(requestId, senderName, message, { all: true });
  } catch (err) {
    console.error("[Notify] Chat trigger failed:", err);
  }
}
