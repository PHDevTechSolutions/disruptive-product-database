import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import crypto from "crypto";

// Hash the API key for lookup
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Validate API key and return permissions
async function validateApiKey(apiKey: string): Promise<{ valid: boolean; permissions?: string[]; keyId?: string; error?: string }> {
  if (!apiKey || !apiKey.startsWith("esp_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  const hashedKey = hashApiKey(apiKey);

  // Query for active key with matching hash
  const keysQuery = query(
    collection(db, "apiKeys"),
    where("hashedKey", "==", hashedKey),
    where("isActive", "==", true)
  );

  const snapshot = await getDocs(keysQuery);

  if (snapshot.empty) {
    return { valid: false, error: "Invalid or revoked API key" };
  }

  const keyDoc = snapshot.docs[0];
  const keyData = keyDoc.data();

  // Update last used timestamp and usage count
  await updateDoc(doc(db, "apiKeys", keyDoc.id), {
    lastUsedAt: Timestamp.now(),
    usageCount: (keyData.usageCount || 0) + 1,
  });

  return {
    valid: true,
    permissions: keyData.permissions || [],
    keyId: keyData.keyId,
  };
}

// Check if permission is granted
function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required) || permissions.includes("admin");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get API key from header
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API key required. Include X-API-Key header." });
  }

  // Validate API key
  const validation = await validateApiKey(apiKey);
  if (!validation.valid) {
    return res.status(401).json({ error: validation.error });
  }

  const { permissions } = validation;
  const { endpoint } = req.query;

  try {
    switch (endpoint) {
      case "products": {
        if (!hasPermission(permissions!, "products:read")) {
          return res.status(403).json({ error: "Permission denied: products:read required" });
        }

        const {
          productClass,
          brandOrigin,
          pricePoint,
          productFamilyId,
          isActive = "true",
          pageSize = "50",
          pageToken,
        } = req.query;

        let productsQuery = query(
          collection(db, "products"),
          where("isActive", "==", isActive === "true"),
          orderBy("productReferenceID"),
          limit(Math.min(parseInt(pageSize as string, 10), 100))
        );

        // Apply filters
        if (productClass) {
          productsQuery = query(productsQuery, where("productClass", "==", productClass));
        }
        if (brandOrigin) {
          productsQuery = query(productsQuery, where("brandOrigin", "==", brandOrigin));
        }
        if (pricePoint) {
          productsQuery = query(productsQuery, where("pricePoint", "==", pricePoint));
        }

        const snapshot = await getDocs(productsQuery);

        const products = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            productReferenceID: data.productReferenceID,
            referenceID: data.referenceID,
            productClass: data.productClass,
            brandOrigin: data.brandOrigin,
            pricePoint: data.pricePoint,
            categoryTypes: data.categoryTypes,
            productFamilies: data.productFamilies,
            mainImage: data.mainImage,
            technicalSpecifications: data.technicalSpecifications,
            commercialDetails: data.commercialDetails,
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            date_updated: data.date_updated?.toDate?.()?.toISOString() || null,
          };
        });

        return res.status(200).json({
          data: products,
          count: products.length,
          pageInfo: {
            hasMore: products.length === parseInt(pageSize as string, 10),
            nextPageToken: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
          },
        });
      }

      case "suppliers": {
        if (!hasPermission(permissions!, "suppliers:read")) {
          return res.status(403).json({ error: "Permission denied: suppliers:read required" });
        }

        const {
          isActive = "true",
          pageSize = "50",
        } = req.query;

        let suppliersQuery = query(
          collection(db, "suppliers"),
          where("isActive", "==", isActive === "true"),
          orderBy("supplierId"),
          limit(Math.min(parseInt(pageSize as string, 10), 100))
        );

        const snapshot = await getDocs(suppliersQuery);

        const suppliers = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            supplierId: data.supplierId,
            referenceID: data.referenceID,
            company: data.company,
            supplierBrand: data.supplierBrand,
            addresses: data.addresses,
            emails: data.emails,
            contacts: data.contacts,
            certificates: data.certificates,
            products: data.products,
            forteProducts: data.forteProducts,
            website: data.website,
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
            date_updated: data.date_updated?.toDate?.()?.toISOString() || null,
          };
        });

        return res.status(200).json({
          data: suppliers,
          count: suppliers.length,
          pageInfo: {
            hasMore: suppliers.length === parseInt(pageSize as string, 10),
            nextPageToken: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
          },
        });
      }

      case "product-detail": {
        if (!hasPermission(permissions!, "products:read")) {
          return res.status(403).json({ error: "Permission denied: products:read required" });
        }

        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: "Product ID required" });
        }

        const productDoc = await getDoc(doc(db, "products", id as string));
        if (!productDoc.exists()) {
          return res.status(404).json({ error: "Product not found" });
        }

        const data = productDoc.data();
        return res.status(200).json({
          id: productDoc.id,
          productReferenceID: data.productReferenceID,
          referenceID: data.referenceID,
          productClass: data.productClass,
          brandOrigin: data.brandOrigin,
          pricePoint: data.pricePoint,
          categoryTypes: data.categoryTypes,
          productFamilies: data.productFamilies,
          mainImage: data.mainImage,
          dimensionalDrawing: data.dimensionalDrawing,
          illuminanceDrawing: data.illuminanceDrawing,
          technicalSpecifications: data.technicalSpecifications,
          commercialDetails: data.commercialDetails,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          date_updated: data.date_updated?.toDate?.()?.toISOString() || null,
        });
      }

      case "supplier-detail": {
        if (!hasPermission(permissions!, "suppliers:read")) {
          return res.status(403).json({ error: "Permission denied: suppliers:read required" });
        }

        const { id } = req.query;
        if (!id) {
          return res.status(400).json({ error: "Supplier ID required" });
        }

        const supplierDoc = await getDoc(doc(db, "suppliers", id as string));
        if (!supplierDoc.exists()) {
          return res.status(404).json({ error: "Supplier not found" });
        }

        const data = supplierDoc.data();
        return res.status(200).json({
          id: supplierDoc.id,
          supplierId: data.supplierId,
          referenceID: data.referenceID,
          company: data.company,
          supplierBrand: data.supplierBrand,
          addresses: data.addresses,
          emails: data.emails,
          contacts: data.contacts,
          certificates: data.certificates,
          products: data.products,
          forteProducts: data.forteProducts,
          website: data.website,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          date_updated: data.date_updated?.toDate?.()?.toISOString() || null,
        });
      }

      default:
        return res.status(400).json({
          error: "Invalid endpoint",
          availableEndpoints: ["products", "suppliers", "product-detail", "supplier-detail"],
        });
    }
  } catch (error: any) {
    console.error("Public API error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
