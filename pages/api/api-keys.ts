import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  getDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import crypto from "crypto";

// Generate a secure API key
function generateApiKey(): string {
  return "esp_" + crypto.randomBytes(32).toString("hex");
}

// Hash the API key for storage (store only hash for security)
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Verify IT department access
async function verifyITAccess(sessionCookie: string | undefined): Promise<{ valid: boolean; userId?: string; error?: string }> {
  if (!sessionCookie) {
    return { valid: false, error: "No session found" };
  }

  try {
    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ _id: new ObjectId(sessionCookie) });

    if (!user) {
      return { valid: false, error: "User not found" };
    }

    if (user.Department !== "IT") {
      return { valid: false, error: "Access denied. IT department only." };
    }

    return { valid: true, userId: user._id.toString() };
  } catch (error) {
    return { valid: false, error: "Authentication error" };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = req.cookies.session;
  const { action } = req.query;

  // Verify IT access for all actions
  const auth = await verifyITAccess(session);
  if (!auth.valid) {
    return res.status(403).json({ error: auth.error });
  }

  try {
    switch (action) {
      case "generate": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const { name, description, permissions = ["products:read", "suppliers:read"] } = req.body;

        if (!name) {
          return res.status(400).json({ error: "Name is required" });
        }

        // Generate new API key (only returned once)
        const apiKey = generateApiKey();
        const hashedKey = hashApiKey(apiKey);

        // Store in Firebase
        const keyData = {
          keyId: crypto.randomUUID(),
          hashedKey,
          name,
          description: description || "",
          permissions,
          isActive: true,
          createdAt: Timestamp.now(),
          createdBy: auth.userId,
          lastUsedAt: null,
          usageCount: 0,
        };

        await setDoc(doc(db, "apiKeys", keyData.keyId), keyData);

        // Return the full key (only time it's visible)
        return res.status(201).json({
          success: true,
          apiKey, // Full key - only returned on creation
          keyData: {
            keyId: keyData.keyId,
            name: keyData.name,
            description: keyData.description,
            permissions: keyData.permissions,
            isActive: keyData.isActive,
            createdAt: keyData.createdAt.toDate().toISOString(),
            createdBy: keyData.createdBy,
          },
          message: "API Key generated successfully. Store this key securely - it will not be shown again.",
        });
      }

      case "list": {
        if (req.method !== "GET") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const keysQuery = query(collection(db, "apiKeys"), where("isActive", "==", true));
        const snapshot = await getDocs(keysQuery);

        const keys = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            keyId: data.keyId,
            name: data.name,
            description: data.description,
            permissions: data.permissions,
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            createdBy: data.createdBy,
            lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() || null,
            usageCount: data.usageCount || 0,
          };
        });

        return res.status(200).json({ keys });
      }

      case "revoke": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const { keyId } = req.body;

        if (!keyId) {
          return res.status(400).json({ error: "Key ID is required" });
        }

        const keyRef = doc(db, "apiKeys", keyId);
        const keyDoc = await getDoc(keyRef);

        if (!keyDoc.exists()) {
          return res.status(404).json({ error: "API key not found" });
        }

        await updateDoc(keyRef, {
          isActive: false,
          revokedAt: Timestamp.now(),
          revokedBy: auth.userId,
        });

        return res.status(200).json({
          success: true,
          message: "API key revoked successfully",
        });
      }

      case "delete": {
        if (req.method !== "POST") {
          return res.status(405).json({ error: "Method not allowed" });
        }

        const { keyId } = req.body;

        if (!keyId) {
          return res.status(400).json({ error: "Key ID is required" });
        }

        const keyRef = doc(db, "apiKeys", keyId);
        const keyDoc = await getDoc(keyRef);

        if (!keyDoc.exists()) {
          return res.status(404).json({ error: "API key not found" });
        }

        await deleteDoc(keyRef);

        return res.status(200).json({
          success: true,
          message: "API key deleted permanently",
        });
      }

      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("API Keys error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
