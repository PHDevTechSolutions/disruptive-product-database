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




const safeSplit = (value: any) => {
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

  /* ✅ file input ref (ADDED) */
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

      // ✅ RESET INPUT (IMPORTANT FIX)
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

  /* ✅ CLICK FILE PICKER (ADDED) */
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

      // 🔑 company(lowercase) → { id, isActive }
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

        // 🔴 EXISTING & ACTIVE → SKIP
        if (existing?.isActive) {
          const existingData = existing.data;

          const incomingData = {
            supplierBrand: String(row["Supplier Brand"] ?? "").trim(), // ✅ ADD

            addresses: safeSplit(row.Addresses),
            emails: safeSplit(row.Emails),
            website: row.Website || "",
            contacts: safeSplit(row["Contact Name(s)"]).map((n, i) => ({
              name: n,
              phone: safeSplit(row["Phone Number(s)"])[i] || "",
            })),
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

        /* ---------------- HELPERS ---------------- */
        const splitPipe = (v?: string) =>
          String(v || "")
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);

        // 🔁 EXISTING BUT INACTIVE → REACTIVATE
        // ♻ EXISTING (ACTIVE OR INACTIVE) → UPDATE ALL FIELDS
        // ♻ EXISTING SUPPLIER → ALWAYS UPDATE (ACTIVE OR INACTIVE)
        if (existing) {
          const names = splitPipe(row["Contact Name(s)"]);
          const phones = splitPipe(row["Phone Number(s)"]);

const supplierBrand = String(row["Supplier Brand"] ?? "").trim();

await updateDoc(doc(db, "suppliers", existing.id), {
  whatHappened: "Supplier Added",
  date_updated: serverTimestamp(),
  supplierId: existing.id,

  supplierBrand,
supplierbrandId: existing.id,



  addresses: splitPipe(row.Addresses),
  emails: splitPipe(row.Emails),
  website: row.Website || "",
  contacts: names.map((n, i) => ({
    name: n,
    phone: phones[i] || "",
  })),
  forteProducts: splitPipe(row["Forte Product(s)"]),
  products: splitPipe(row["Product(s)"]),
  certificates: splitPipe(row["Certificate(s)"]),
  isActive: true,
  updatedAt: serverTimestamp(),
});

          supplierMap.set(key, { ...existing, isActive: true });
          reactivated++;
          continue;
        }

        // 🟢 NEW SUPPLIER → INSERT
        const contactNames = safeSplit(row["Contact Name(s)"]);
        const contactPhones = safeSplit(row["Phone Number(s)"]);

        const contacts = contactNames.map((name, i) => ({
          name,
          phone: contactPhones[i] || "",
        }));

const supplierBrand = String(row["Supplier Brand"] ?? "").trim();

const docRef = await addDoc(collection(db, "suppliers"), {
  company,
  supplierBrand,




  addresses: safeSplit(row.Addresses),
  emails: safeSplit(row.Emails),
  website: row.Website || "",
  contacts,
  forteProducts: safeSplit(row["Forte Product(s)"]),
  products: safeSplit(row["Product(s)"]),
  certificates: safeSplit(row["Certificate(s)"]),
  createdBy: userId,
  referenceID: user.ReferenceID,
  isActive: true,
  createdAt: serverTimestamp(),
});

        // 2️⃣ Save Firestore ID as companyId
        // 2️⃣ Save Firestore ID as supplierId
await updateDoc(doc(db, "suppliers", docRef.id), {
  supplierId: docRef.id,
  supplierbrandId: docRef.id,
  whatHappened: "Supplier Added",
  date_updated: serverTimestamp(),
});

        supplierMap.set(key, {
          id: "new",
          isActive: true,
          data: {},
        });
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

          {/* ✅ CLICK + DRAG ZONE */}
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
              <table className="min-w-[1200px]text-sm">
                <thead className="sticky top-0 bg-background border-b">
                  <tr>
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
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="p-2">{row["Company Name"] || "-"}</td>
                      <td className="p-2">{row["Supplier Brand"] || "-"}</td>
                      <td className="p-2">{row.Addresses || "-"}</td>
                      <td className="p-2">{row.Emails || "-"}</td>
                      <td className="p-2">{row.Website || "-"}</td>
                      <td className="p-2">{row["Contact Name(s)"] || "-"}</td>
                      <td className="p-2">{row["Phone Number(s)"] || "-"}</td>
                      <td className="p-2">{row["Forte Product(s)"] || "-"}</td>
                      <td className="p-2">{row["Product(s)"] || "-"}</td>
                      <td className="p-2">{row["Certificate(s)"] || "-"}</td>
                    </tr>
                  ))}
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
  contacts: c.incoming.contacts,
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
