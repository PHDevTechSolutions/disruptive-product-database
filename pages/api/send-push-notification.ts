/**
 * Push Notification API Route
 * 
 * This API route sends push notifications via Firebase Cloud Messaging (FCM)
 * to mobile devices even when the app is closed or the screen is off.
 * 
 * Usage:
 * POST /api/send-push-notification
 * 
 * Body:
 * {
 *   "userId": "user-uuid",
 *   "title": "Notification Title",
 *   "body": "Notification body text",
 *   "data": { "key": "value" }, // Optional payload data
 *   "image": "https://example.com/image.jpg", // Optional image URL
 *   "url": "/spf-requests/123", // Optional click URL
 *   "priority": "high" // Optional: 'normal' or 'high'
 * }
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

// Response type
interface PushNotificationResponse {
  success: boolean;
  message: string;
  sentCount?: number;
  failedCount?: number;
  errors?: string[];
}

// Firebase Admin SDK setup (using REST API for simplicity)
const FCM_API_URL = "https://fcm.googleapis.com/fcm/send";
const FIREBASE_SERVER_KEY = process.env.FIREBASE_PRIVATE_KEY_ESPIRON;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PushNotificationResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use POST.",
    });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Bearer token required.",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error: JWT_SECRET not set",
      });
    }

    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Check if user has permission to send notifications
    const userRole = payload.role as string;
    const allowedRoles = ["admin", "superadmin", "procurement", "tsm"];
    
    if (!allowedRoles.includes(userRole?.toLowerCase())) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Insufficient permissions.",
      });
    }

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  // Parse request body
  const {
    userId,
    title,
    body: messageBody,
    data = {},
    image,
    url,
    priority = "high",
  } = req.body;

  // Validate required fields
  if (!userId || !title || !messageBody) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: userId, title, body",
    });
  }

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      success: false,
      message: "Server configuration error: Supabase credentials not set",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Fetch user's FCM tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("fcm_tokens")
      .select("token, is_mobile, platform")
      .eq("user_id", userId)
      .eq("active", true);

    if (tokenError) {
      console.error("Error fetching FCM tokens:", tokenError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user tokens",
      });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active FCM tokens found for user",
      });
    }

    // Check if Firebase Server Key is available
    if (!FIREBASE_SERVER_KEY) {
      return res.status(500).json({
        success: false,
        message: "Firebase Server Key not configured",
      });
    }

    // Send notifications to all user devices
    const results = await Promise.allSettled(
      tokens.map(async (tokenData) => {
        const notificationPayload = {
          to: tokenData.token,
          notification: {
            title,
            body: messageBody,
            icon: "/disruptive-logo.png",
            badge: "/disruptive-logo.png",
            image: image || undefined,
            click_action: url || "/",
            tag: data.tag || "espiron",
            requireInteraction: priority === "high",
          },
          data: {
            ...data,
            url: url || "/",
            userId,
            timestamp: Date.now().toString(),
            click_action: url || "/",
          },
          priority: priority === "high" ? "high" : "normal",
          // Mobile-specific options for background delivery
          android: {
            priority: "high",
            notification: {
              channel_id: "espiron_notifications",
              default_sound: true,
              default_vibrate_timings: true,
              visibility: "public",
            },
          },
          apns: {
            headers: {
              "apns-priority": priority === "high" ? "10" : "5",
            },
            payload: {
              aps: {
                alert: {
                  title,
                  body: messageBody,
                },
                badge: 1,
                sound: "default",
                "mutable-content": 1,
              },
            },
          },
          webpush: {
            headers: {
              Urgency: priority === "high" ? "high" : "normal",
            },
            notification: {
              icon: "/disruptive-logo.png",
              badge: "/disruptive-logo.png",
              requireInteraction: true,
              tag: data.tag || "espiron",
              renotify: true,
              vibrate: [200, 100, 200],
            },
            fcm_options: {
              link: url || "/",
            },
          },
        };

        // Send FCM request
        const response = await fetch(FCM_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `key=${FIREBASE_SERVER_KEY}`,
          },
          body: JSON.stringify(notificationPayload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `FCM request failed: ${errorData.results?.[0]?.error || response.statusText}`
          );
        }

        const result = await response.json();
        
        // Check for token errors and mark as inactive if needed
        if (result.results?.[0]?.error === "NotRegistered" ||
            result.results?.[0]?.error === "InvalidRegistration") {
          // Token is invalid, mark as inactive
          await supabase
            .from("fcm_tokens")
            .update({ active: false })
            .eq("token", tokenData.token);
          throw new Error("Token is no longer valid");
        }

        return result;
      })
    );

    // Process results
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason?.message || "Unknown error");

    if (successful === 0 && failed > 0) {
      return res.status(500).json({
        success: false,
        message: `Failed to send notifications to all ${failed} device(s)`,
        errors,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      sentCount: successful,
      failedCount: failed,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("Error sending push notification:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Helper function to broadcast notifications to multiple users
 * Can be used from other API routes
 */
export async function broadcastNotification(
  userIds: string[],
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
    image?: string;
    url?: string;
    priority?: "normal" | "high";
  }
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const results = await Promise.allSettled(
    userIds.map((userId) =>
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/send-push-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN || ""}`,
          },
          body: JSON.stringify({
            ...notification,
            userId,
          }),
        }
      )
    )
  );

  const successful = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return {
    success: failed === 0,
    sentCount: successful,
    failedCount: failed,
  };
}
