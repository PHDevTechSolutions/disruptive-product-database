// Push Notification Manager
// Coordinates notifications from various sources (Firebase, Supabase, Local)

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { supabase } from "@/utils/supabase";
import { updateProductBadge, updateSupplierBadge, updateRequestBadge } from "./badge-counter";

export interface PushNotificationPayload {
  title: string;
  body: string;
  type: "product" | "supplier" | "request" | "chat" | "system";
  data?: Record<string, any>;
  requireInteraction?: boolean;
}

class PushNotificationManager {
  private isInitialized = false;
  private listeners: Array<() => void> = [];
  private onNotification: ((payload: PushNotificationPayload) => void) | null = null;

  // Initialize all notification listeners
  initialize(
    onNotification: (payload: PushNotificationPayload) => void,
    userId?: string
  ) {
    if (this.isInitialized) {
      this.cleanup();
    }

    this.onNotification = onNotification;
    this.isInitialized = true;

    // Start listening to various data sources
    this.listenToProducts();
    this.listenToSuppliers();
    this.listenToRequests(userId);

    console.log("[PushNotifications] Initialized");
  }

  // Listen for new products
  private listenToProducts() {
    // Get initial count
    let lastProductCount = parseInt(localStorage.getItem("last-product-count") || "0");

    const q = query(collection(db, "products"), where("isActive", "==", true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentCount = snapshot.size;
      
      // If new products were added
      if (currentCount > lastProductCount && lastProductCount > 0) {
        const newCount = currentCount - lastProductCount;
        
        // Find the newest products (sorted by createdAt)
        const newProducts = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((p: any) => {
            const createdAt = p.createdAt?.toDate?.() || new Date(p.createdAt);
            // Consider products created in last 5 minutes as "new"
            return (Date.now() - createdAt.getTime()) < 5 * 60 * 1000;
          })
          .slice(0, newCount);

        newProducts.forEach((product: any) => {
          this.showNotification({
            title: "New Product Added",
            body: `"${product.productName}" has been added to the database`,
            type: "product",
            data: { 
              url: "/products",
              productId: product.id,
              productName: product.productName 
            },
          });
        });

        updateProductBadge(newCount);
      }

      localStorage.setItem("last-product-count", currentCount.toString());
    });

    this.listeners.push(unsubscribe);
  }

  // Listen for new suppliers
  private listenToSuppliers() {
    let lastSupplierCount = parseInt(localStorage.getItem("last-supplier-count") || "0");

    const q = query(collection(db, "suppliers"), where("isActive", "==", true));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentCount = snapshot.size;
      
      if (currentCount > lastSupplierCount && lastSupplierCount > 0) {
        const newCount = currentCount - lastSupplierCount;
        
        const newSuppliers = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((s: any) => {
            const createdAt = s.createdAt?.toDate?.() || new Date(s.createdAt);
            return (Date.now() - createdAt.getTime()) < 5 * 60 * 1000;
          })
          .slice(0, newCount);

        newSuppliers.forEach((supplier: any) => {
          this.showNotification({
            title: "New Supplier Added",
            body: `"${supplier.company}" has been added as a supplier`,
            type: "supplier",
            data: { 
              url: "/suppliers",
              supplierId: supplier.id,
              company: supplier.company 
            },
          });
        });

        updateSupplierBadge(newCount);
      }

      localStorage.setItem("last-supplier-count", currentCount.toString());
    });

    this.listeners.push(unsubscribe);
  }

  // Listen for SPF request status changes
  private listenToRequests(userId?: string) {
    // Track last seen statuses
    const lastStatusesKey = "last-request-statuses";
    let lastStatuses: Record<string, string> = {};
    try {
      lastStatuses = JSON.parse(localStorage.getItem(lastStatusesKey) || "{}");
    } catch (e) {
      lastStatuses = {};
    }

    // Subscribe to Supabase real-time changes
    const channel = supabase
      .channel("pwa-spf-notifications")
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "spf_request",
        },
        (payload: { new: Record<string, any>; old: Record<string, any> }) => {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          // Check if status changed
          if (newRecord.status !== oldRecord.status) {
            const spfNumber = newRecord.spf_number;
            const newStatus = newRecord.status;
            const oldStatus = oldRecord.status;

            // Only notify for certain status transitions
            const notifyStatuses = [
              "approved by tsm",
              "approved by sales head",
              "pending for procurement",
              "approved by procurement",
              "for revision",
            ];

            if (notifyStatuses.includes(newStatus.toLowerCase())) {
              this.showNotification({
                title: "SPF Request Updated",
                body: `Request ${spfNumber} status changed from "${oldStatus}" to "${newStatus}"`,
                type: "request",
                data: { 
                  url: "/requests",
                  spfNumber: spfNumber,
                  status: newStatus 
                },
                requireInteraction: true,
              });

              // Increment request badge
              const currentRequestBadge = parseInt(localStorage.getItem("request-badge") || "0");
              updateRequestBadge(currentRequestBadge + 1);
            }

            // Update tracked status
            lastStatuses[spfNumber] = newStatus;
            localStorage.setItem(lastStatusesKey, JSON.stringify(lastStatuses));
          }
        }
      )
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "spf_request",
        },
        (payload: { new: Record<string, any> }) => {
          const newRecord = payload.new;
          
          // Notify for new requests
          if (newRecord.status?.toLowerCase().includes("approved")) {
            this.showNotification({
              title: "New SPF Request",
              body: `Request ${newRecord.spf_number} has been created and ${newRecord.status}`,
              type: "request",
              data: { 
                url: "/requests",
                spfNumber: newRecord.spf_number,
                status: newRecord.status 
              },
            });

            const currentRequestBadge = parseInt(localStorage.getItem("request-badge") || "0");
            updateRequestBadge(currentRequestBadge + 1);
          }
        }
      )
      .subscribe();

    this.listeners.push(() => {
      supabase.removeChannel(channel);
    });

    // Also listen to spf_creation for status changes
    const creationChannel = supabase
      .channel("pwa-spf-creation-notifications")
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "spf_creation",
        },
        (payload: { new: Record<string, any>; old: Record<string, any> }) => {
          const newRecord = payload.new;
          const oldRecord = payload.old;
          
          if (newRecord.status !== oldRecord.status) {
            const spfNumber = newRecord.spf_number;
            const newStatus = newRecord.status;

            // Notify for creation status changes
            const creationNotifyStatuses = [
              "pending for procurement",
              "approved by procurement",
              "for revision",
              "pending on sales",
            ];

            if (creationNotifyStatuses.includes(newStatus.toLowerCase())) {
              this.showNotification({
                title: "SPF Creation Updated",
                body: `Request ${spfNumber} creation status changed to "${newStatus}"`,
                type: "request",
                data: { 
                  url: "/requests",
                  spfNumber: spfNumber,
                  creationStatus: newStatus 
                },
                requireInteraction: true,
              });

              const currentRequestBadge = parseInt(localStorage.getItem("request-badge") || "0");
              updateRequestBadge(currentRequestBadge + 1);
            }
          }
        }
      )
      .subscribe();

    this.listeners.push(() => {
      supabase.removeChannel(creationChannel);
    });
  }

  // Show a notification
  private showNotification(payload: PushNotificationPayload) {
    // Call the callback
    if (this.onNotification) {
      this.onNotification(payload);
    }

    // Also try to show system notification
    this.showSystemNotification(payload);

    // Play notification sound
    this.playSound();
  }

  // Show system notification via service worker
  private async showSystemNotification(payload: PushNotificationPayload) {
    if (!("serviceWorker" in navigator)) return;
    if (Notification.permission !== "granted") return;

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: "SHOW_NOTIFICATION",
          title: payload.title,
          options: {
            body: payload.body,
            icon: "/espiron-logo.svg",
            badge: "/espiron-logo.svg",
            tag: payload.type,
            data: payload.data || {},
            requireInteraction: payload.requireInteraction || false,
          },
        });
      }
    } catch (err) {
      console.error("[PushNotifications] Failed to show system notification:", err);
    }
  }

  // Play notification sound
  private playSound() {
    try {
      const audio = new Audio("/musics/notif-sound.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore autoplay restrictions
    } catch (e) {
      // Ignore audio errors
    }
  }

  // Cleanup all listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    this.isInitialized = false;
    console.log("[PushNotifications] Cleaned up");
  }
}

// Export singleton
export const pushNotificationManager = new PushNotificationManager();

// Helper to manually trigger a notification
export function showManualNotification(payload: PushNotificationPayload) {
  pushNotificationManager["showNotification"](payload);
}
