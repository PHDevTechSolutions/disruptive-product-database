// Badge Counter Utility for PWA
// Handles app icon badge updates on both mobile and desktop

import { updateAppBadge } from "@/components/service-worker-registration";

class BadgeCounter {
  private count: number = 0;
  private listeners: Set<(count: number) => void> = new Set();

  constructor() {
    // Load saved count
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("badge-count");
      if (saved) {
        this.count = parseInt(saved, 10) || 0;
        this.updateBadge();
      }
    }
  }

  // Get current count
  getCount(): number {
    return this.count;
  }

  // Set count directly
  setCount(count: number): void {
    this.count = Math.max(0, count);
    this.saveAndUpdate();
  }

  // Increment count
  increment(amount: number = 1): void {
    this.count += amount;
    this.saveAndUpdate();
  }

  // Decrement count
  decrement(amount: number = 1): void {
    this.count = Math.max(0, this.count - amount);
    this.saveAndUpdate();
  }

  // Clear count
  clear(): void {
    this.count = 0;
    this.saveAndUpdate();
  }

  // Subscribe to count changes
  subscribe(callback: (count: number) => void): () => void {
    this.listeners.add(callback);
    callback(this.count);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners
  private notify(): void {
    this.listeners.forEach(callback => callback(this.count));
  }

  // Save to storage and update badge
  private saveAndUpdate(): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("badge-count", this.count.toString());
    }
    this.updateBadge();
    this.notify();
  }

  // Update the actual badge
  private async updateBadge(): Promise<void> {
    try {
      await updateAppBadge(this.count);
    } catch (err) {
      console.error("[BadgeCounter] Failed to update badge:", err);
    }
  }
}

// Export singleton instance
export const badgeCounter = new BadgeCounter();

// React hook for badge count
export function useBadgeCount() {
  if (typeof window === "undefined") {
    return { count: 0 };
  }
  return { count: badgeCounter.getCount() };
}

// Utility to update badge from various sources
export function updateBadgeFromNotifications(
  productCount: number,
  supplierCount: number,
  requestCount: number,
  chatCount: number = 0
): void {
  const total = productCount + supplierCount + requestCount + chatCount;
  badgeCounter.setCount(total);
}

// Utility for specific page badges
export function updateProductBadge(count: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("product-badge", count.toString());
  }
  updateBadgeFromNotifications(
    count,
    parseInt(localStorage.getItem("supplier-badge") || "0"),
    parseInt(localStorage.getItem("request-badge") || "0"),
    parseInt(localStorage.getItem("chat-badge") || "0")
  );
}

export function updateSupplierBadge(count: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("supplier-badge", count.toString());
  }
  updateBadgeFromNotifications(
    parseInt(localStorage.getItem("product-badge") || "0"),
    count,
    parseInt(localStorage.getItem("request-badge") || "0"),
    parseInt(localStorage.getItem("chat-badge") || "0")
  );
}

export function updateRequestBadge(count: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("request-badge", count.toString());
  }
  updateBadgeFromNotifications(
    parseInt(localStorage.getItem("product-badge") || "0"),
    parseInt(localStorage.getItem("supplier-badge") || "0"),
    count,
    parseInt(localStorage.getItem("chat-badge") || "0")
  );
}

// Get individual badge counts
export function getBadgeBreakdown() {
  if (typeof window === "undefined") {
    return { product: 0, supplier: 0, request: 0, chat: 0, total: 0 };
  }
  
  const product = parseInt(localStorage.getItem("product-badge") || "0");
  const supplier = parseInt(localStorage.getItem("supplier-badge") || "0");
  const request = parseInt(localStorage.getItem("request-badge") || "0");
  const chat = parseInt(localStorage.getItem("chat-badge") || "0");
  
  return {
    product,
    supplier,
    request,
    chat,
    total: product + supplier + request + chat,
  };
}
