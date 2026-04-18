/**
 * Badge Counter Utility
 * Manages app badge counts for PWA notifications
 * - Shows badge on app icon (like Viber red notification dot)
 * - Persists count in localStorage
 * - Syncs with Service Worker
 */

const BADGE_STORAGE_KEY = 'espiron-badge-count';

/**
 * Check if the Badging API is supported
 */
export function isBadgingSupported(): boolean {
  return 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
}

/**
 * Get current badge count from storage
 */
export function getBadgeCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(BADGE_STORAGE_KEY);
    return stored ? parseInt(stored, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Set badge count in storage and on app icon
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const normalizedCount = Math.max(0, Math.floor(count));
  
  // Save to localStorage
  try {
    localStorage.setItem(BADGE_STORAGE_KEY, String(normalizedCount));
  } catch {
    // Ignore storage errors
  }
  
  // Set badge on app icon if supported
  if (isBadgingSupported()) {
    try {
      if (normalizedCount > 0) {
        await (navigator as any).setAppBadge(normalizedCount);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (err) {
      console.warn('[BadgeCounter] Failed to set badge:', err);
    }
  }
  
  // Notify service worker about badge update
  notifyServiceWorker({ type: 'BADGE_UPDATE', count: normalizedCount });
}

/**
 * Increment badge count by amount (default 1)
 */
export async function incrementBadgeCount(amount: number = 1): Promise<number> {
  const current = getBadgeCount();
  const newCount = current + amount;
  await setBadgeCount(newCount);
  return newCount;
}

/**
 * Decrement badge count by amount (default 1)
 */
export async function decrementBadgeCount(amount: number = 1): Promise<number> {
  const current = getBadgeCount();
  const newCount = Math.max(0, current - amount);
  await setBadgeCount(newCount);
  return newCount;
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
  await setBadgeCount(0);
}

/**
 * Notify service worker about badge updates
 */
function notifyServiceWorker(message: any): void {
  if (typeof window === 'undefined') return;
  
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

/**
 * Badge Counter for specific notification types
 * Tracks counts per category: products, suppliers, requests
 */
const CATEGORY_KEYS = {
  product: 'espiron-badge-products',
  supplier: 'espiron-badge-suppliers',
  request: 'espiron-badge-requests',
  chat: 'espiron-badge-chat'
};

export type BadgeCategory = keyof typeof CATEGORY_KEYS;

/**
 * Get badge count for a specific category
 */
export function getCategoryBadgeCount(category: BadgeCategory): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(CATEGORY_KEYS[category]);
    return stored ? parseInt(stored, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Set badge count for a specific category
 */
export async function setCategoryBadgeCount(
  category: BadgeCategory, 
  count: number
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const normalizedCount = Math.max(0, Math.floor(count));
  
  try {
    localStorage.setItem(CATEGORY_KEYS[category], String(normalizedCount));
  } catch {
    // Ignore storage errors
  }
  
  // Recalculate total badge count
  await recalculateTotalBadge();
}

/**
 * Increment badge count for a specific category
 */
export async function incrementCategoryBadge(
  category: BadgeCategory, 
  amount: number = 1
): Promise<number> {
  const current = getCategoryBadgeCount(category);
  const newCount = current + amount;
  await setCategoryBadgeCount(category, newCount);
  return newCount;
}

/**
 * Clear badge count for a specific category
 */
export async function clearCategoryBadge(category: BadgeCategory): Promise<void> {
  await setCategoryBadgeCount(category, 0);
}

/**
 * Recalculate total badge count from all categories
 */
async function recalculateTotalBadge(): Promise<void> {
  const total = Object.keys(CATEGORY_KEYS).reduce((sum, key) => {
    return sum + getCategoryBadgeCount(key as BadgeCategory);
  }, 0);
  
  await setBadgeCount(total);
}

/**
 * Get all category badge counts
 */
export function getAllBadgeCounts(): Record<BadgeCategory, number> & { total: number } {
  const categories = Object.keys(CATEGORY_KEYS) as BadgeCategory[];
  const counts = {} as Record<BadgeCategory, number>;
  
  let total = 0;
  for (const category of categories) {
    const count = getCategoryBadgeCount(category);
    counts[category] = count;
    total += count;
  }
  
  return { ...counts, total };
}

/**
 * Clear all badge counts
 */
export async function clearAllBadges(): Promise<void> {
  const categories = Object.keys(CATEGORY_KEYS) as BadgeCategory[];
  
  for (const category of categories) {
    try {
      localStorage.removeItem(CATEGORY_KEYS[category]);
    } catch {
      // Ignore errors
    }
  }
  
  await clearBadgeCount();
}

/**
 * Initialize badge counter from storage on app load
 */
export function initializeBadgeCounter(): void {
  if (typeof window === 'undefined') return;
  
  // Recalculate and set badge on load
  const { total } = getAllBadgeCounts();
  
  if (isBadgingSupported() && total > 0) {
    (navigator as any).setAppBadge(total).catch(() => {});
  }
}
