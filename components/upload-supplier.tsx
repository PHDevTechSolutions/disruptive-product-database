"use client";

import * as React from "react";
import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";

import UploadSupplierWarning, {
  SupplierConflict,
} from "@/components/upload-supplier-warning";

/* ---------------- Types ---------------- */
type UserDetails = {
  ReferenceID: string;
};

type UploadSupplierProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ExcelRow = {
  "Company Name"?: string;
  "Supplier Brand"?: string;
  Addresses?: string;
  Emails?: string;
  Website?: string;
  "Contact Name(s)"?: string;
  "Phone Number(s)"?: string;
  "Forte Product(s)"?: string;
  "Product(s)"?: string;
  "Certificate(s)"?: string;
};

/* ---------------- Phone Helpers ---------------- */

/**
 * Country-code prefix map (longest-match first so +852 beats +85).
 * Extend as needed.
 */
const COUNTRY_DIAL_CODES: Record<string, string> = {
  // Asia
  "86":  "CN", // China
  "852": "HK", // Hong Kong
  "853": "MO", // Macau
  "886": "TW", // Taiwan
  "81":  "JP", // Japan
  "82":  "KR", // South Korea
  "84":  "VN", // Vietnam
  "66":  "TH", // Thailand
  "60":  "MY", // Malaysia
  "65":  "SG", // Singapore
  "63":  "PH", // Philippines
  "62":  "ID", // Indonesia
  "91":  "IN", // India
  "92":  "PK", // Pakistan
  "880": "BD", // Bangladesh
  "94":  "LK", // Sri Lanka
  "95":  "MM", // Myanmar
  "855": "KH", // Cambodia
  "856": "LA", // Laos
  "673": "BN", // Brunei
  "977": "NP", // Nepal
  "975": "BT", // Bhutan
  // Middle East
  "971": "AE", // UAE
  "966": "SA", // Saudi Arabia
  "974": "QA", // Qatar
  "965": "KW", // Kuwait
  "968": "OM", // Oman
  "973": "BH", // Bahrain
  "962": "JO", // Jordan
  "961": "LB", // Lebanon
  "972": "IL", // Israel
  "90":  "TR", // Turkey
  // Europe
  "44":  "GB", // UK
  "49":  "DE", // Germany
  "33":  "FR", // France
  "39":  "IT", // Italy
  "34":  "ES", // Spain
  "31":  "NL", // Netherlands
  "32":  "BE", // Belgium
  "41":  "CH", // Switzerland
  "43":  "AT", // Austria
  "48":  "PL", // Poland
  "7":   "RU", // Russia
  "380": "UA", // Ukraine
  "30":  "GR", // Greece
  "351": "PT", // Portugal
  "46":  "SE", // Sweden
  "47":  "NO", // Norway
  "45":  "DK", // Denmark
  "358": "FI", // Finland
  "420": "CZ", // Czech Republic
  "36":  "HU", // Hungary
  "40":  "RO", // Romania
  "359": "BG", // Bulgaria
  "385": "HR", // Croatia
  "381": "RS", // Serbia
  "386": "SI", // Slovenia
  "421": "SK", // Slovakia
  // Americas
  "1":   "US", // USA / Canada
  "52":  "MX", // Mexico
  "55":  "BR", // Brazil
  "54":  "AR", // Argentina
  "56":  "CL", // Chile
  "57":  "CO", // Colombia
  "51":  "PE", // Peru
  "58":  "VE", // Venezuela
  "593": "EC", // Ecuador
  "591": "BO", // Bolivia
  "595": "PY", // Paraguay
  "598": "UY", // Uruguay
  // Africa
  "27":  "ZA", // South Africa
  "234": "NG", // Nigeria
  "254": "KE", // Kenya
  "233": "GH", // Ghana
  "212": "MA", // Morocco
  "213": "DZ", // Algeria
  "216": "TN", // Tunisia
  "20":  "EG", // Egypt
  "251": "ET", // Ethiopia
  "255": "TZ", // Tanzania
  "256": "UG", // Uganda
  // Oceania
  "61":  "AU", // Australia
  "64":  "NZ", // New Zealand
};

/**
 * Given a raw phone string from Excel, returns:
 *   { normalized: "+86XXXXXXXXXX", country: "CN", isPhone: true }
 * or
 *   { normalized: "WeChat: john", country: null, isPhone: false }
 *
 * Rules:
 *  1. If starts with "+" → it's a phone, find country from dial code map.
 *  2. If all digits (possibly with spaces/dashes) → treat as phone, prepend "+".
 *  3. Otherwise → non-phone (WeChat, TikTok, etc.).
 */
const parsePhone = (
  raw: string,
): { normalized: string; country: string | null; isPhone: boolean } => {
  const trimmed = raw.trim();
  if (!trimmed) return { normalized: trimmed, country: null, isPhone: false };

  let digits = "";

  if (trimmed.startsWith("+")) {
    // Strip the + and any formatting chars
    digits = trimmed.slice(1).replace(/[\s\-().]/g, "");
  } else if (/^[\d\s\-().]+$/.test(trimmed)) {
    // Pure numeric string — treat as phone, no + yet
    digits = trimmed.replace(/[\s\-().]/g, "");
  } else {
    // Non-numeric → others (WeChat, TikTok, etc.)
    return { normalized: trimmed, country: null, isPhone: false };
  }

  // Find country by longest matching prefix (3 digits first, then 2, then 1)
  let country: string | null = null;
  for (const len of [3, 2, 1]) {
    const prefix = digits.slice(0, len);
    if (COUNTRY_DIAL_CODES[prefix]) {
      country = COUNTRY_DIAL_CODES[prefix];
      break;
    }
  }

  return {
    normalized: `+${digits}`,
    country,
    isPhone: true,
  };
};

/* ---------------- General Helpers ---------------- */
const safeSplit = (value: any): string[] => {
  if (Array.isArray(value))
    return value
      .map(String)
      .map((v) => v.trim())
      .filter(Boolean);

  if (typeof value === "string")
    return value
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

  if (value == null) return [];

  return String(value)
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
};

const normalizeJoin = (arr?: string[]) =>
  arr && arr.length ? arr.join(" | ") : "";

const normalizeContacts = (arr?: { name: string; phone: string }[]) =>
  arr && arr.length ? arr.map((c) => `${c.name}|${c.phone}`).join(" | ") : "";

/**
 * Parse pipe-separated phone strings from Excel into normalized contacts.
 * Each phone is auto-detected as phone/other and normalized accordingly.
 */
const parseContacts = (
  rawNames: string,
  rawPhones: string,
): { name: string; phone: string }[] => {
  const names = safeSplit(rawNames);
  const phones = safeSplit(rawPhones);

  return names.map((name, i) => {
    const rawPhone = phones[i] || "";
    const { normalized } = parsePhone(rawPhone);
    return { name, phone: normalized };
  });
};

/* ---------------- Component ---------------- */
function UploadSupplier({ open, onOpenChange }: UploadSupplierProps) {
  const { userId } = useUser();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [dragActive, setDragActive] = useState(false);

  /* ⚠️ Duplicate warning */
  const [conflicts, setConflicts] = useState<SupplierConflict[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------------- Fetch user ---------------- */
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        setUser({ ReferenceID: data.ReferenceID });
      })
      .catch(() => {
        toast.error("Failed to load user");
      });
  }, [userId]);

  /* ---------------- Read Excel ---------------- */
  const readExcel = async (file: File) => {
    try {
      if (!file) return;

      if (file.size === 0) {
        toast.error("File is empty");
        return;
      }

      const arrayBuffer = await file.arrayBuffer();

      const workbook = XLSX.read(arrayBuffer, {
        type: "array",
        cellDates: true,
        raw: false,
      });

      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        toast.error("Excel has no sheets");
        return;
      }

      const sheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      }) as ExcelRow[];

      if (!json.length) {
        toast.error("Excel file is empty");
        return;
      }

      setRows(json);

      toast.success("Excel loaded", {
        description: `${json.length} rows detected`,
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      toast.error("Invalid or corrupted Excel file");
    }
  };

  /* ---------------- Drag & Drop ---------------- */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error("Invalid file type. Only Excel or CSV allowed.");
      return;
    }

    readExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/)) {
      toast.error("Invalid file type. Only Excel or CSV allowed.");
      return;
    }

    readExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ---------------- Confirm Upload ---------------- */
  const handleConfirmUpload = async () => {
    if (!rows.length) {
      toast.error("No data to upload");
      return;
    }

    if (!user?.ReferenceID) {
      toast.error("User reference not loaded");
      return;
    }

    try {
      setLoading(true);

      const snap = await getDocs(collection(db, "suppliers"));

      const supplierMap = new Map<
        string,
        { id: string; isActive: boolean; data: any }
      >();

      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.company) return;

        supplierMap.set(data.company.toLowerCase(), {
          id: d.id,
          isActive: data.isActive !== false,
          data,
        });
      });

      let inserted = 0;
      let skipped = 0;
      let reactivated = 0;

      const detectedConflicts: SupplierConflict[] = [];

      for (const row of rows) {
        const company = String(
          row["Company Name"] ??
            (row as any)["Company"] ??
            (row as any)["company name"] ??
            (row as any)["company"] ??
            "",
        ).trim();

        if (!company) {
          skipped++;
          continue;
        }

        const key = company.toLowerCase();
        const existing = supplierMap.get(key);

        // ✅ Parse contacts with auto phone detection
        const incomingContacts = parseContacts(
          String(row["Contact Name(s)"] ?? ""),
          String(row["Phone Number(s)"] ?? ""),
        );

        // 🔴 EXISTING & ACTIVE → check for differences
        if (existing?.isActive) {
          const existingData = existing.data;

          const incomingData = {
            supplierBrand: String(row["Supplier Brand"] ?? "").trim(),
            addresses: safeSplit(row.Addresses),
            emails: safeSplit(row.Emails),
            website: row.Website || "",
            contacts: incomingContacts,
            forteProducts: safeSplit(row["Forte Product(s)"]),
            products: safeSplit(row["Product(s)"]),
            certificates: safeSplit(row["Certificate(s)"]),
          };

          const isDifferent =
            (existingData.supplierBrand || "") !== incomingData.supplierBrand ||
            normalizeJoin(existingData.addresses) !==
              normalizeJoin(incomingData.addresses) ||
            normalizeJoin(existingData.emails) !==
              normalizeJoin(incomingData.emails) ||
            (existingData.website || "") !== incomingData.website ||
            normalizeContacts(existingData.contacts) !==
              normalizeContacts(incomingData.contacts) ||
            normalizeJoin(existingData.forteProducts) !==
              normalizeJoin(incomingData.forteProducts) ||
            normalizeJoin(existingData.products) !==
              normalizeJoin(incomingData.products) ||
            normalizeJoin(existingData.certificates) !==
              normalizeJoin(incomingData.certificates);

          if (isDifferent) {
            detectedConflicts.push({
              supplierId: existing.id,
              company,
              existing: existingData,
              incoming: incomingData,
            });
          } else {
            skipped++;
          }

          continue;
        }

        // 🔁 EXISTING BUT INACTIVE → REACTIVATE & UPDATE
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
            contacts: incomingContacts, // ✅ normalized phones
            forteProducts: safeSplit(row["Forte Product(s)"]),
            products: safeSplit(row["Product(s)"]),
            certificates: safeSplit(row["Certificate(s)"]),
            isActive: true,
            updatedAt: serverTimestamp(),
          });

          supplierMap.set(key, { ...existing, isActive: true });
          reactivated++;
          continue;
        }

        // 🟢 NEW SUPPLIER → INSERT
        const supplierBrand = String(row["Supplier Brand"] ?? "").trim();

        const docRef = await addDoc(collection(db, "suppliers"), {
          company,
          supplierBrand,
          addresses: safeSplit(row.Addresses),
          emails: safeSplit(row.Emails),
          website: row.Website || "",
          contacts: incomingContacts, // ✅ normalized phones
          forteProducts: safeSplit(row["Forte Product(s)"]),
          products: safeSplit(row["Product(s)"]),
          certificates: safeSplit(row["Certificate(s)"]),
          createdBy: userId,
          referenceID: user.ReferenceID,
          isActive: true,
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "suppliers", docRef.id), {
          supplierId: docRef.id,
          supplierbrandId: docRef.id,
          whatHappened: "Supplier Added",
          date_updated: serverTimestamp(),
        });

        supplierMap.set(key, { id: "new", isActive: true, data: {} });
        inserted++;
      }

      if (detectedConflicts.length > 0) {
        setConflicts(detectedConflicts);
        setWarningOpen(true);
        setLoading(false);
        return;
      }

      if (inserted === 0 && reactivated === 0) {
        toast.warning("No suppliers uploaded", {
          description: "All rows were skipped (duplicates or invalid data)",
        });
      } else {
        toast.success("Upload completed", {
          description: `Inserted: ${inserted}, Reactivated: ${reactivated}, Skipped: ${skipped}`,
        });
      }

      setRows([]);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Upload Suppliers (Excel)</DialogTitle>
          </DialogHeader>

          <Separator />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-md p-6 text-center text-sm cursor-pointer
            ${dragActive ? "border-primary bg-muted/40" : "border-muted"}`}
          >
            Click or drag & drop Excel file here
            <div className="text-xs text-muted-foreground mt-1">
              (.xlsx, .xls, .csv)
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {rows.length > 0 && (
            <div className="mt-4 border rounded-md overflow-x-auto max-h-[300px]">
              <table className="min-w-[1200px] text-sm">
                <thead className="sticky top-0 bg-red-100 border-b">
                  <tr className="font-bold">
                    <th className="p-2">Company Name</th>
                    <th className="p-2">Supplier Brand</th>
                    <th className="p-2">Addresses</th>
                    <th className="p-2">Emails</th>
                    <th className="p-2">Website</th>
                    <th className="p-2">Contact Name(s)</th>
                    <th className="p-2">Phone Number(s)</th>
                    <th className="p-2">Forte Product(s)</th>
                    <th className="p-2">Product(s)</th>
                    <th className="p-2">Certificate(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    // ✅ Preview normalized phones in the table too
                    const previewPhones = safeSplit(
                      String(row["Phone Number(s)"] ?? ""),
                    )
                      .map((p) => parsePhone(p).normalized)
                      .join(" | ");

                    return (
                      <tr key={i}>
                        <td className="p-2">{row["Company Name"] || "-"}</td>
                        <td className="p-2">{row["Supplier Brand"] || "-"}</td>
                        <td className="p-2">{row.Addresses || "-"}</td>
                        <td className="p-2">{row.Emails || "-"}</td>
                        <td className="p-2">{row.Website || "-"}</td>
                        <td className="p-2">
                          {row["Contact Name(s)"] || "-"}
                        </td>
                        <td className="p-2">{previewPhones || "-"}</td>
                        <td className="p-2">
                          {row["Forte Product(s)"] || "-"}
                        </td>
                        <td className="p-2">{row["Product(s)"] || "-"}</td>
                        <td className="p-2">{row["Certificate(s)"] || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setRows([]);
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              onClick={handleConfirmUpload}
              disabled={loading || rows.length === 0}
            >
              {loading ? "Uploading..." : "Go / Confirm Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>

        <UploadSupplierWarning
          open={warningOpen}
          conflicts={conflicts}
          performedByReferenceID={user?.ReferenceID}
          onCancel={() => {
            setConflicts([]);
            setWarningOpen(false);
          }}
          onProceed={async () => {
            setWarningOpen(false);
            setLoading(true);

            for (const c of conflicts) {
              await updateDoc(doc(db, "suppliers", c.supplierId), {
                supplierBrand: c.incoming.supplierBrand,
                supplierbrandId: c.supplierId,
                addresses: c.incoming.addresses,
                emails: c.incoming.emails,
                website: c.incoming.website,
                contacts: c.incoming.contacts, // ✅ already normalized
                forteProducts: c.incoming.forteProducts,
                products: c.incoming.products,
                certificates: c.incoming.certificates,
                updatedAt: serverTimestamp(),
                updatedBy: userId,
                updatedByReferenceID: user?.ReferenceID,
              });
            }

            toast.success("Suppliers updated", {
              description: `${conflicts.length} supplier(s) overwritten`,
            });

            setConflicts([]);
            onOpenChange(false);
            setLoading(false);
          }}
        />
      </Dialog>
    </>
  );
}

export default UploadSupplier;
