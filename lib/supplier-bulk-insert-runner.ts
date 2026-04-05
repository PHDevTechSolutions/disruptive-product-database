/**
 * Bulk supplier import for approved upload requests (audited as requester).
 */

import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logSupplierEvent } from "@/lib/auditlogger";

export type SupplierExcelRow = Record<string, unknown>;

const COUNTRY_DIAL_CODES: Record<string, string> = {
  "86": "CN",
  "852": "HK",
  "1": "US",
  "63": "PH",
};

const parsePhone = (raw: string): { normalized: string; country: string | null; isPhone: boolean } => {
  const trimmed = raw.trim();
  if (!trimmed) return { normalized: trimmed, country: null, isPhone: false };
  let digits = "";
  if (trimmed.startsWith("+")) digits = trimmed.slice(1).replace(/[\s\-().]/g, "");
  else if (/^[\d\s\-().]+$/.test(trimmed)) digits = trimmed.replace(/[\s\-().]/g, "");
  else return { normalized: trimmed, country: null, isPhone: false };
  let country: string | null = null;
  for (const len of [3, 2, 1]) {
    const prefix = digits.slice(0, len);
    if (COUNTRY_DIAL_CODES[prefix]) {
      country = COUNTRY_DIAL_CODES[prefix];
      break;
    }
  }
  return { normalized: `+${digits}`, country, isPhone: true };
};

const safeSplit = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") return value.split("|").map((v) => v.trim()).filter(Boolean);
  if (value == null) return [];
  return String(value).split("|").map((v) => v.trim()).filter(Boolean);
};

const normalizeJoin = (arr?: string[]) => (arr && arr.length ? arr.join(" | ") : "");
const normalizeContacts = (arr?: { name: string; phone: string }[]) =>
  arr && arr.length ? arr.map((c) => `${c.name}|${c.phone}`).join(" | ") : "";

const parseContacts = (rawNames: string, rawPhones: string): { name: string; phone: string }[] => {
  const names = safeSplit(rawNames);
  const phones = safeSplit(rawPhones);
  return names.map((name, i) => {
    const rawPhone = phones[i] || "";
    const { normalized } = parsePhone(rawPhone);
    return { name, phone: normalized };
  });
};

const normalizeCompany = (val: string | null | undefined): string =>
  (val ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function companyFromRow(row: SupplierExcelRow): string {
  return String(
    row["Company Name"] ??
      (row as { Company?: string }).Company ??
      (row as { ["company name"]?: string })["company name"] ??
      (row as { company?: string }).company ??
      "",
  ).trim();
}

export async function executeSupplierBulkFromRows(params: {
  uploadRows: SupplierExcelRow[];
  referenceID: string;
  userId: string;
  filename: string;
  /** When an active supplier exists with different data, overwrite (manager-approved). */
  overwriteConflicts: boolean;
}): Promise<{ inserted: number; reactivated: number; skipped: number; overwritten: number }> {
  const { uploadRows, referenceID, userId, filename, overwriteConflicts } = params;

  const snap = await getDocs(collection(db, "suppliers"));
  const supplierMap = new Map<string, { id: string; isActive: boolean; data: Record<string, unknown> }>();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!data.company) return;
    supplierMap.set(normalizeCompany(data.company as string), {
      id: d.id,
      isActive: data.isActive !== false,
      data,
    });
  });

  let inserted = 0;
  let skipped = 0;
  let reactivated = 0;
  let overwritten = 0;

  for (const row of uploadRows) {
    const company = companyFromRow(row);
    if (!company) {
      skipped++;
      continue;
    }

    const key = normalizeCompany(company);
    const existing = supplierMap.get(key);
    const incomingContacts = parseContacts(
      String(row["Contact Name(s)"] ?? ""),
      String(row["Phone Number(s)"] ?? ""),
    );

    if (existing?.isActive) {
      const existingData = existing.data;
      const incomingData = {
        supplierBrand: String(row["Supplier Brand"] ?? "").trim(),
        addresses: safeSplit(row.Addresses),
        emails: safeSplit(row.Emails),
        website: String(row.Website ?? ""),
        contacts: incomingContacts,
        forteProducts: safeSplit(row["Forte Product(s)"]),
        products: safeSplit(row["Product(s)"]),
        certificates: safeSplit(row["Certificate(s)"]),
      };

      const isDifferent =
        String(existingData.supplierBrand || "") !== incomingData.supplierBrand ||
        normalizeJoin(existingData.addresses as string[] | undefined) !== normalizeJoin(incomingData.addresses) ||
        normalizeJoin(existingData.emails as string[] | undefined) !== normalizeJoin(incomingData.emails) ||
        String(existingData.website || "") !== incomingData.website ||
        normalizeContacts(existingData.contacts as { name: string; phone: string }[] | undefined) !==
          normalizeContacts(incomingData.contacts) ||
        normalizeJoin(existingData.forteProducts as string[] | undefined) !== normalizeJoin(incomingData.forteProducts) ||
        normalizeJoin(existingData.products as string[] | undefined) !== normalizeJoin(incomingData.products) ||
        normalizeJoin(existingData.certificates as string[] | undefined) !== normalizeJoin(incomingData.certificates);

      if (isDifferent) {
        if (overwriteConflicts) {
          await updateDoc(doc(db, "suppliers", existing.id), {
            supplierBrand: incomingData.supplierBrand,
            supplierbrandId: existing.id,
            addresses: incomingData.addresses,
            emails: incomingData.emails,
            website: incomingData.website,
            contacts: incomingData.contacts,
            forteProducts: incomingData.forteProducts,
            products: incomingData.products,
            certificates: incomingData.certificates,
            updatedAt: serverTimestamp(),
            updatedBy: userId,
            updatedByReferenceID: referenceID,
          });
          await logSupplierEvent({
            whatHappened: "Supplier Edited",
            supplierId: existing.id,
            company,
            supplierBrand: incomingData.supplierBrand,
            referenceID,
            userId,
            extra: { source: "excel_upload_for_approval", filename },
          });
          overwritten++;
        } else {
          skipped++;
        }
        continue;
      }
      skipped++;
      continue;
    }

    if (existing) {
      const supplierBrand = String(row["Supplier Brand"] ?? "").trim();
      await updateDoc(doc(db, "suppliers", existing.id), {
        whatHappened: "Supplier Added",
        date_updated: serverTimestamp(),
        supplierId: existing.id,
        supplierBrand,
        supplierbrandId: existing.id,
        addresses: safeSplit(row.Addresses),
        emails: safeSplit(row.Emails),
        website: row.Website || "",
        contacts: incomingContacts,
        forteProducts: safeSplit(row["Forte Product(s)"]),
        products: safeSplit(row["Product(s)"]),
        certificates: safeSplit(row["Certificate(s)"]),
        isActive: true,
        updatedAt: serverTimestamp(),
      });

      await logSupplierEvent({
        whatHappened: "Supplier Reactivated",
        supplierId: existing.id,
        company,
        supplierBrand,
        referenceID,
        userId,
        extra: { source: "excel_upload_for_approval", filename },
      });

      supplierMap.set(key, { ...existing, isActive: true });
      reactivated++;
      continue;
    }

    const supplierBrand = String(row["Supplier Brand"] ?? "").trim();
    const docRef = await addDoc(collection(db, "suppliers"), {
      company,
      supplierBrand,
      addresses: safeSplit(row.Addresses),
      emails: safeSplit(row.Emails),
      website: row.Website || "",
      contacts: incomingContacts,
      forteProducts: safeSplit(row["Forte Product(s)"]),
      products: safeSplit(row["Product(s)"]),
      certificates: safeSplit(row["Certificate(s)"]),
      createdBy: userId,
      referenceID,
      isActive: true,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "suppliers", docRef.id), {
      supplierId: docRef.id,
      supplierbrandId: docRef.id,
      whatHappened: "Supplier Added",
      date_updated: serverTimestamp(),
    });

    await logSupplierEvent({
      whatHappened: "Supplier Added",
      supplierId: docRef.id,
      company,
      supplierBrand,
      referenceID,
      userId,
      extra: { source: "excel_upload_for_approval", filename },
    });

    supplierMap.set(key, { id: docRef.id, isActive: true, data: {} });
    inserted++;
  }

  await logSupplierEvent({
    whatHappened: "Supplier Bulk Upload",
    referenceID,
    userId,
    inserted,
    reactivated,
    skipped,
    overwritten,
    extra: { source: "excel_upload_for_approval", filename },
  });

  return { inserted, reactivated, skipped, overwritten };
}
