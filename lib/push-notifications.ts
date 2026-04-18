// lib/push-notifications.ts
// Utility functions for sending push notifications

interface PushNotificationPayload {
  title: string;
  body: string;
  tokens: string[];
  url?: string;
}

interface PushNotificationResponse {
  success: boolean;
  successCount?: number;
  failureCount?: number;
  error?: string;
}

/**
 * Send push notification to FCM tokens via the API route
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<PushNotificationResponse> {
  try {
    const response = await fetch("/api/send-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Push notification failed:", data.error);
      return {
        success: false,
        error: data.error || "Failed to send notification",
      };
    }

    console.log(
      `Push notification sent: ${data.successCount} success, ${data.failureCount} failed`
    );
    return {
      success: true,
      successCount: data.successCount,
      failureCount: data.failureCount,
    };
  } catch (error: any) {
    console.error("Push notification error:", error);
    return {
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

/**
 * Send notification when a new product is added
 */
export async function notifyNewProduct(productName: string, userName?: string) {
  // Fetch all FCM tokens from your database
  const tokens = await fetchFCMTokens();
  if (tokens.length === 0) return;

  return sendPushNotification({
    title: "New Product Added",
    body: userName
      ? `${userName} added a new product: ${productName}`
      : `A new product has been added: ${productName}`,
    tokens,
    url: "/products",
  });
}

/**
 * Send notification when a new supplier is added
 */
export async function notifyNewSupplier(supplierName: string, userName?: string) {
  const tokens = await fetchFCMTokens();
  if (tokens.length === 0) return;

  return sendPushNotification({
    title: "New Supplier Added",
    body: userName
      ? `${userName} added a new supplier: ${supplierName}`
      : `A new supplier has been added: ${supplierName}`,
    tokens,
    url: "/suppliers",
  });
}

/**
 * Send notification when SPF request is created
 */
export async function notifySPFRequestCreated(spfNumber: string, userName?: string) {
  const tokens = await fetchFCMTokens();
  if (tokens.length === 0) return;

  return sendPushNotification({
    title: "New SPF Request Created",
    body: userName
      ? `${userName} created SPF request: ${spfNumber}`
      : `New SPF request created: ${spfNumber}`,
    tokens,
    url: "/requests",
  });
}

/**
 * Send notification when SPF request is updated
 */
export async function notifySPFRequestUpdated(spfNumber: string, status: string, userName?: string) {
  const tokens = await fetchFCMTokens();
  if (tokens.length === 0) return;

  return sendPushNotification({
    title: "SPF Request Updated",
    body: userName
      ? `${userName} updated SPF ${spfNumber} - Status: ${status}`
      : `SPF ${spfNumber} has been updated - Status: ${status}`,
    tokens,
    url: "/requests",
  });
}

/**
 * Fetch all FCM tokens from Supabase
 * You'll need to create a table to store these tokens
 */
async function fetchFCMTokens(): Promise<string[]> {
  try {
    // For client-side, use the singleton supabase instance
    const { supabase } = await import("@/utils/supabase");

    const { data, error } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("active", true);

    if (error) {
      console.error("Error fetching FCM tokens:", error);
      return [];
    }

    return data?.map((row: { token: string }) => row.token) || [];
  } catch (error) {
    console.error("Failed to fetch FCM tokens:", error);
    return [];
  }
}

/**
 * For server-side API routes - fetch tokens using admin client
 */
export async function fetchFCMTokensServer(supabaseAdmin: any): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("fcm_tokens")
      .select("token")
      .eq("active", true);

    if (error) {
      console.error("Error fetching FCM tokens:", error);
      return [];
    }

    return data?.map((row: { token: string }) => row.token) || [];
  } catch (error) {
    console.error("Failed to fetch FCM tokens:", error);
    return [];
  }
}

/**
 * Send notification from server-side (for API routes)
 */
export async function sendPushNotificationServer(
  supabaseAdmin: any,
  payload: Omit<PushNotificationPayload, "tokens">
): Promise<PushNotificationResponse> {
  const tokens = await fetchFCMTokensServer(supabaseAdmin);
  if (tokens.length === 0) {
    console.log("No FCM tokens found, skipping notification");
    return { success: true, successCount: 0, failureCount: 0 };
  }

  try {
    // For server-side, we'll call our own API route
    // Or you could directly use firebase-admin here
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, tokens }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to send notification",
      };
    }

    return {
      success: true,
      successCount: data.successCount,
      failureCount: data.failureCount,
    };
  } catch (error: any) {
    console.error("Server push notification error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
