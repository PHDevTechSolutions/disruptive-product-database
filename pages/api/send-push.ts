import type { NextApiRequest, NextApiResponse } from "next";
import { adminMessaging, isAdminInitialized } from "../../utils/firebase-admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token, notification, data, webpush } = req.body;

    if (!token) {
      return res.status(400).json({ error: "FCM token is required" });
    }

    if (!isAdminInitialized()) {
      return res.status(500).json({ error: "Firebase Admin not initialized" });
    }

    const message = {
      token,
      notification: {
        title: notification?.title || "Espiron",
        body: notification?.body || "",
        icon: notification?.icon || "/disruptive-logo.png",
      },
      data: data || {},
      webpush: {
        notification: {
          ...webpush?.notification,
          icon: notification?.icon || "/disruptive-logo.png",
          badge: notification?.badge || "/disruptive-logo.png",
          requireInteraction: webpush?.notification?.requireInteraction ?? true,
          tag: webpush?.notification?.tag || "espiron",
          renotify: true,
        },
        fcm_options: {
          link: data?.url || "/",
        },
      },
    };

    const response = await adminMessaging().send(message);

    return res.status(200).json({
      success: true,
      messageId: response,
    });
  } catch (error: any) {
    console.error("[SendPush] Error:", error);
    
    // Handle specific Firebase errors
    if (error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered") {
      return res.status(400).json({
        error: "Invalid token",
        code: error.code,
        shouldRemove: true,
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to send notification",
      code: error.code,
    });
  }
}
