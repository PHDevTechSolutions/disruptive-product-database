import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY_ESPIRON;
    if (!rawKey) {
      console.warn("FIREBASE_PRIVATE_KEY_ESPIRON not set");
    } else {
      // Handle various private key formats
      let formattedKey = rawKey;
      
      // Remove surrounding quotes if present
      if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
        formattedKey = formattedKey.slice(1, -1);
      }
      
      // Replace escaped newlines with actual newlines
      formattedKey = formattedKey.replace(/\\n/g, '\n');
      
      // Also try replacing literal \n if still present
      formattedKey = formattedKey.replace(/\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "disruptive-product-database-v2",
          clientEmail: "firebase-adminsdk-fbsvc@disruptive-product-database-v2.iam.gserviceaccount.com",
          privateKey: formattedKey,
        }),
      });
      console.log("Firebase Admin Initialized");
    }
  } catch (error: any) {
    console.error("Firebase Admin Init Error:", error.message);
    console.error("Key format issue - check your .env.local file");
  }
}

export async function POST(request: Request) {
  try {
    const { title, body, tokens, url } = await request.json();

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ success: false, error: "No tokens" }, { status: 400 });
    }

    const message = {
      notification: { title, body },
      data: { url: url || "/" },
      tokens: tokens,
      android: {
        priority: "high" as const,
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          body: body,
          requireInteraction: true,
          icon: "/logo.png" // Make sure this exists in /public or remove it
        },
        fcm_options: { link: url || "/" },
      },
    };

    // CRITICAL: We MUST await this so Vercel doesn't kill the function early
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`Vercel Push: ${response.successCount} sent, ${response.failureCount} failed`);

    return NextResponse.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (err: any) {
    console.error("Vercel API Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}