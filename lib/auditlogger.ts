/**
 * lib/auditLogger.ts
 *
 * Centralised audit-trail writer.
 *
 * Collections (one per domain, kept separate for clean querying):
 *   auditLogs_suppliers  — every create / edit / delete on a supplier
 *   auditLogs_products   — every create / edit / delete on a product
 *
 * Usage:
 *   import { logSupplierEvent, logProductEvent } from "@/lib/auditLogger";
 *
 *   await logSupplierEvent({
 *     whatHappened : "Supplier Added",
 *     supplierId   : docRef.id,
 *     company      : company,
 *     supplierBrand: supplierBrand,
 *     referenceID  : user?.ReferenceID,
 *     userId       : userId,
 *   });
 */

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/* ─────────────────────────────────────────────
   Supplier event
───────────────────────────────────────────── */
export type SupplierEventPayload = {
  whatHappened:
    | "Supplier Added"
    | "Supplier Edited"
    | "Supplier Deleted"
    | "Supplier Reactivated"
    | "Supplier Bulk Upload";

  supplierId?    : string;
  supplierbrandId?: string;
  company?       : string;
  supplierBrand? : string;

  // Who did it
  referenceID?   : string;      // user's ReferenceID
  userId?        : string;      // Firebase Auth UID (optional)

  // Bulk upload extras
  inserted?      : number;
  reactivated?   : number;
  skipped?       : number;
  overwritten?   : number;

  // Anything extra you want to stash
  extra?         : Record<string, any>;
};

export async function logSupplierEvent(payload: SupplierEventPayload): Promise<void> {
  try {
    await addDoc(collection(db, "auditLogs_suppliers"), {
      ...payload.extra,
      whatHappened  : payload.whatHappened,
      supplierId    : payload.supplierId    ?? null,
      supplierbrandId: payload.supplierbrandId ?? payload.supplierId ?? null,
      company       : payload.company       ?? null,
      supplierBrand : payload.supplierBrand ?? null,
      referenceID   : payload.referenceID   ?? null,
      userId        : payload.userId        ?? null,
      inserted      : payload.inserted      ?? null,
      reactivated   : payload.reactivated   ?? null,
      skipped       : payload.skipped       ?? null,
      overwritten   : payload.overwritten   ?? null,
      date_updated  : serverTimestamp(),
      createdAt     : serverTimestamp(),
    });
  } catch (err) {
    // Never crash the main flow because of logging
    console.warn("[auditLogger] Failed to log supplier event:", err);
  }
}

/* ─────────────────────────────────────────────
   Product event
───────────────────────────────────────────── */
export type ProductEventPayload = {
  whatHappened:
    | "Product Added"
    | "Product Edited"
    | "Product Deleted"
    | "Product Bulk Upload";

  productId?           : string;
  productReferenceID?  : string;
  productClass?        : string;
  pricePoint?          : string;
  brandOrigin?         : string;
  supplier?            : { supplierId?: string; company?: string; supplierBrand?: string } | null;

  categoryTypes?       : { productUsageId: string; categoryTypeName: string }[];
  productFamilies?     : { productFamilyId: string; productFamilyName: string }[];

  // Who did it
  referenceID?         : string;
  userId?              : string;

  // Bulk upload extras
  inserted?            : number;
  skipped?             : number;

  // Anything extra
  extra?               : Record<string, any>;
};

export async function logProductEvent(payload: ProductEventPayload): Promise<void> {
  try {
    await addDoc(collection(db, "auditLogs_products"), {
      ...payload.extra,
      whatHappened      : payload.whatHappened,
      productId         : payload.productId          ?? null,
      productReferenceID: payload.productReferenceID ?? null,
      productClass      : payload.productClass       ?? null,
      pricePoint        : payload.pricePoint         ?? null,
      brandOrigin       : payload.brandOrigin        ?? null,
      supplier          : payload.supplier           ?? null,
      categoryTypes     : payload.categoryTypes      ?? null,
      productFamilies   : payload.productFamilies    ?? null,
      referenceID       : payload.referenceID        ?? null,
      userId            : payload.userId             ?? null,
      inserted          : payload.inserted           ?? null,
      skipped           : payload.skipped            ?? null,
      date_updated      : serverTimestamp(),
      createdAt         : serverTimestamp(),
    });
  } catch (err) {
    console.warn("[auditLogger] Failed to log product event:", err);
  }
}