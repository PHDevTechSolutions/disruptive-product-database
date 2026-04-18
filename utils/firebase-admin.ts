/**
 * Firebase Admin SDK for server-side operations
 * Used for sending push notifications via FCM
 */

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getMessaging, Messaging } from "firebase-admin/messaging";

let adminApp: App | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeAdmin(): boolean {
  if (adminApp) return true;

  try {
    // Check if private key is available
    const privateKey = process.env.FIREBASE_PRIVATE_KEY_ESPIRON;
    if (!privateKey) {
      console.warn("[FirebaseAdmin] FIREBASE_PRIVATE_KEY_ESPIRON not set");
      return false;
    }

    // Check for existing apps first
    const existingApp = getApps().find((app) => app.name === "espiron-admin");
    if (existingApp) {
      adminApp = existingApp;
      messaging = getMessaging(adminApp);
      return true;
    }

    // Format private key (handle escaped newlines)
    const formattedKey = privateKey.replace(/\\n/g, "\n");

    adminApp = initializeApp(
      {
        credential: cert({
          projectId: "espiron-1e202",
          privateKey: formattedKey,
          clientEmail:
            process.env.FIREBASE_CLIENT_EMAIL_ESPIRON ||
            "firebase-adminsdk@espiron-1e202.iam.gserviceaccount.com",
        }),
      },
      "espiron-admin"
    );

    messaging = getMessaging(adminApp);
    console.log("[FirebaseAdmin] Initialized successfully");
    return true;
  } catch (error) {
    console.error("[FirebaseAdmin] Initialization error:", error);
    return false;
  }
}

/**
 * Check if Firebase Admin is initialized
 */
export function isAdminInitialized(): boolean {
  return adminApp !== null && messaging !== null;
}

/**
 * Get Firebase Messaging instance
 */
export function adminMessaging(): Messaging {
  if (!messaging) {
    initializeAdmin();
    if (!messaging) {
      throw new Error("Firebase Admin not initialized");
    }
  }
  return messaging;
}

/**
 * Send FCM notification to a single token
 */
export async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<string> {
  if (!messaging) {
    throw new Error("Firebase Admin not initialized");
  }

  const message = {
    token,
    notification: {
      title,
      body,
    },
    data: data || {},
    webpush: {
      notification: {
        icon: "/disruptive-logo.png",
        badge: "/disruptive-logo.png",
        requireInteraction: true,
        tag: "espiron",
      },
      fcm_options: {
        link: data?.url || "/",
      },
    },
  };

  return await messaging.send(message);
}

/**
 * Send FCM notification to multiple tokens
 */
export async function sendMulticastNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: number; failure: number; errors: string[] }> {
  if (!messaging) {
    throw new Error("Firebase Admin not initialized");
  }

  const message = {
    tokens,
    notification: {
      title,
      body,
    },
    data: data || {},
    webpush: {
      notification: {
        icon: "/disruptive-logo.png",
        badge: "/disruptive-logo.png",
        requireInteraction: true,
      },
      fcm_options: {
        link: data?.url || "/",
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);

  return {
    success: response.successCount,
    failure: response.failureCount,
    errors: response.responses
      .map((resp, idx) =>
        resp.error ? `Token ${idx}: ${resp.error.message}` : null
      )
      .filter(Boolean) as string[],
  };
}

// Auto-initialize on module load
if (process.env.FIREBASE_PRIVATE_KEY_ESPIRON) {
  initializeAdmin();
}
