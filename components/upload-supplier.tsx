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

import DuplicateCheckModal, { DuplicateRow } from "@/components/duplicate-check-modal";

import { logSupplierEvent } from "@/lib/auditlogger";
import {
  createApprovalRequest,
  getApprovalUserProfile,
  shouldRequireApproval,
} from "@/lib/for-approval";
import RequestApprovalDialog from "@/components/request-approval-dialog";

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
const COUNTRY_DIAL_CODES: Record<string, string> = {
  "86": "CN", "852": "HK", "853": "MO", "886": "TW", "81": "JP",
  "82": "KR", "84": "VN", "66": "TH", "60": "MY", "65": "SG",
  "63": "PH", "62": "ID", "91": "IN", "92": "PK", "880": "BD",
  "94": "LK", "95": "MM", "855": "KH", "856": "LA", "673": "BN",
  "977": "NP", "975": "BT", "971": "AE", "966": "SA", "974": "QA",
  "965": "KW", "968": "OM", "973": "BH", "962": "JO", "961": "LB",
  "972": "IL", "90": "TR", "44": "GB", "49": "DE", "33": "FR",
  "39": "IT", "34": "ES", "31": "NL", "32": "BE", "41": "CH",
  "43": "AT", "48": "PL", "7": "RU", "380": "UA", "30": "GR",
  "351": "PT", "46": "SE", "47": "NO", "45": "DK", "358": "FI",
  "420": "CZ", "36": "HU", "40": "RO", "359": "BG", "385": "HR",
  "381": "RS", "386": "SI", "421": "SK", "1": "US", "52": "MX",
  "55": "BR", "54": "AR", "56": "CL", "57": "CO", "51": "PE",
  "58": "VE", "593": "EC", "591": "BO", "595": "PY", "598": "UY",
  "27": "ZA", "234": "NG", "254": "KE", "233": "GH", "212": "MA",
  "213": "DZ", "216": "TN", "20": "EG", "251": "ET", "255": "TZ",
  "256": "UG", "61": "AU", "64": "NZ",
};

const parsePhone = (
  raw: string,
): { normalized: string; country: string | null; isPhone: boolean } => {
  const trimmed = raw.trim();
  if (!trimmed) return { normalized: trimmed, country: null, isPhone: false };

  let digits = "";
  if (trimmed.startsWith("+")) {
    digits = trimmed.slice(1).replace(/[\s\-().]/g, "");
  } else if (/^[\d\s\-().]+$/.test(trimmed)) {
    digits = trimmed.replace(/[\s\-().]/g, "");
  } else {
    return { normalized: trimmed, country: null, isPhone: false };
  }

  let country: string | null = null;
  for (const len of [3, 2, 1]) {
    const prefix = digits.slice(0, len);
    if (COUNTRY_DIAL_CODES[prefix]) { country = COUNTRY_DIAL_CODES[prefix]; break; }
  }

  return { normalized: `+${digits}`, country, isPhone: true };
};

/* ---------------- General Helpers ---------------- */
const safeSplit = (value: any): string[] => {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  if (typeof value === "string") return value.split("|").map((v) => v.trim()).filter(Boolean);
  if (value == null) return [];
  return String(value).split("|").map((v) => v.trim()).filter(Boolean);
};

const normalizeJoin = (arr?: string[]) => arr && arr.length ? arr.join(" | ") : "";
const normalizeContacts = (arr?: { name: string; phone: string }[]) =>
  arr && arr.length ? arr.map((c) => `${c.name}|${c.phone}`).join(" | ") : "";

const parseContacts = (rawNames: string, rawPhones: string): { name: string; phone: string; type: "phone" | "other" }[] => {
  const names = safeSplit(rawNames);
  const phones = safeSplit(rawPhones);
  return names.map((name, i) => {
    const rawPhone = phones[i] || "";
    const { normalized, isPhone } = parsePhone(rawPhone);
    return { name, phone: normalized, type: isPhone ? "phone" : "other" };
  });
};

const extractCountryFromAddress = (address: string): { address: string; country: string } => {
  const trimmed = address.trim();
  // Check if address already has country in parentheses like "Address (CN)"
  const match = trimmed.match(/\((\w{2})\)$/);
  if (match) {
    return {
      address: trimmed.replace(/\(\w{2}\)$/, "").trim(),
      country: match[1] as any,
    };
  }
  // Default to CN if no country specified
  return { address: trimmed, country: "CN" };
};

const parseBranchLabel = (value: string): { branchIndex: number | null; content: string } => {
  const trimmed = value.trim();
  // Match patterns like "Branch 1: ..." or "Branch 2:..."
  const match = trimmed.match(/^Branch\s+(\d+)\s*:\s*(.*)$/i);
  if (match) {
    return {
      branchIndex: parseInt(match[1], 10) - 1, // Convert to 0-based index
      content: match[2].trim(),
    };
  }
  return { branchIndex: null, content: trimmed };
};

const groupByBranch = (items: string[]): Map<number, string[]> => {
  const grouped = new Map<number, string[]>();
  let currentBranch = 0;
  
  items.forEach((item) => {
    const { branchIndex, content } = parseBranchLabel(item);
    if (branchIndex !== null) {
      currentBranch = branchIndex;
    }
    if (!grouped.has(currentBranch)) {
      grouped.set(currentBranch, []);
    }
    grouped.get(currentBranch)!.push(content);
  });
  
  return grouped;
};

const groupContactsByBranch = (names: string[], phones: string[]): Map<number, { name: string; phone: string; type: "phone" | "other" }[]> => {
  const grouped = new Map<number, { name: string; phone: string; type: "phone" | "other" }[]>();
  let currentBranch = 0;
  
  names.forEach((name, i) => {
    const { branchIndex, content: parsedName } = parseBranchLabel(name);
    if (branchIndex !== null) {
      currentBranch = branchIndex;
    }
    const phone = phones[i] || "";
    const { normalized, isPhone } = parsePhone(phone);
    
    if (!grouped.has(currentBranch)) {
      grouped.set(currentBranch, []);
    }
    grouped.get(currentBranch)!.push({
      name: parsedName,
      phone: normalized,
      type: isPhone ? "phone" : "other",
    });
  });
  
  return grouped;
};

/* ─────────────────────────────────────────────────────────────────
 * ✅ Normalize company name for duplicate comparison
 * Strips extra whitespace and lowercases — prevents mismatches
 * caused by trailing spaces or casing differences in the Excel file
 * ───────────────────────────────────────────────────────────────── */
const normalizeCompany = (val: string | null | undefined): string =>
  (val ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
function UploadSupplier({ open, onOpenChange }: UploadSupplierProps) {
  const { userId } = useUser();

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [conflicts, setConflicts] = useState<SupplierConflict[]>([]);
  const [warningOpen, setWarningOpen] = useState(false);

  const [duplicateRows, setDuplicateRows] = useState<DuplicateRow[]>([]);
  const [duplicateCheckOpen, setDuplicateCheckOpen] = useState(false);
  const [nonDuplicateRows, setNonDuplicateRows] = useState<ExcelRow[]>([]);

  const [requestApprovalOpen, setRequestApprovalOpen] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);
  const [approvalRowsPending, setApprovalRowsPending] = useState<ExcelRow[] | null>(null);
  const [approvalFilename, setApprovalFilename] = useState("");
  const [approvalDupSummary, setApprovalDupSummary] = useState("");
  const [approvalAfterDuplicate, setApprovalAfterDuplicate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingFileNameRef = useRef<string>("");

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => setUser({ ReferenceID: data.ReferenceID }))
      .catch(() => toast.error("Failed to load user"));
  }, [userId]);

  const readExcel = async (file: File) => {
    try {
      if (!file) return;
      if (file.size === 0) { toast.error("File is empty"); return; }
      pendingFileNameRef.current = file.name;

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true, raw: false });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) { toast.error("Excel has no sheets"); return; }

      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as ExcelRow[];
      if (!json.length) { toast.error("Excel file is empty"); return; }

      setRows(json);
      toast.success("Excel loaded", { description: `${json.length} rows detected` });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      toast.error("Invalid or corrupted Excel file");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) { toast.error("Invalid file type. Only Excel or CSV allowed."); return; }
    readExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/)) { toast.error("Invalid file type. Only Excel or CSV allowed."); return; }
    readExcel(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ----------------------------------------------------------------
   * ✅ Pre-upload duplicate check
   * Uses normalizeCompany() on both sides so "  Apple Inc  " and
   * "apple inc" both resolve to "apple inc" before comparing.
   * ---------------------------------------------------------------- */
  const runDuplicateCheck = async (): Promise<{
    dupeRows: DuplicateRow[];
    nonDupes: ExcelRow[];
    dupeExcelRows: ExcelRow[];
  }> => {
    const snap = await getDocs(collection(db, "suppliers"));

    // ✅ Build normalized key set from ALL active suppliers in Firestore
    const existingKeys = new Set(
      snap.docs
        .filter((d) => d.data().isActive !== false)
        .map((d) => normalizeCompany(d.data().company))
    );

    const dupeExcelRows: ExcelRow[] = [];
    const nonDupes: ExcelRow[] = [];

    for (const row of rows) {
      const company = String(
        row["Company Name"] ??
        (row as any)["Company"] ??
        (row as any)["company name"] ??
        (row as any)["company"] ??
        "",
      ).trim();

      // ✅ Rows with no company name are NOT duplicates — let upload handle them
      if (!company) { nonDupes.push(row); continue; }

      if (existingKeys.has(normalizeCompany(company))) {
        dupeExcelRows.push(row);
      } else {
        nonDupes.push(row);
      }
    }

    const COLS = [
      "Company Name", "Supplier Brand", "Addresses", "Emails",
      "Website", "Contact Name(s)", "Phone Number(s)",
      "Forte Product(s)", "Product(s)", "Certificate(s)",
    ];

    const dupeRows: DuplicateRow[] = dupeExcelRows.map((row) => ({
      key: String(row["Company Name"] ?? ""),
      columns: COLS,
      values: [
        String(row["Company Name"] ?? ""),
        String(row["Supplier Brand"] ?? ""),
        String(row.Addresses ?? ""),
        String(row.Emails ?? ""),
        String(row.Website ?? ""),
        String(row["Contact Name(s)"] ?? ""),
        safeSplit(String(row["Phone Number(s)"] ?? ""))
          .map((p) => parsePhone(p).normalized)
          .join(" | "),
        String(row["Forte Product(s)"] ?? ""),
        String(row["Product(s)"] ?? ""),
        String(row["Certificate(s)"] ?? ""),
      ],
    }));

    return { dupeRows, nonDupes, dupeExcelRows };
  };

  /* ----------------------------------------------------------------
   * Called when user clicks "Go / Confirm Upload"
   * ---------------------------------------------------------------- */
  const handleConfirmUpload = async () => {
    if (!rows.length) { toast.error("No data to upload"); return; }
    if (!user?.ReferenceID) { toast.error("User reference not loaded"); return; }

    setLoading(true);
    setApprovalAfterDuplicate(false);
    setApprovalFilename(pendingFileNameRef.current || "suppliers.xlsx");
    try {
      const { dupeRows, nonDupes } = await runDuplicateCheck();
      const profile = userId ? await getApprovalUserProfile(userId) : null;
      const needsApproval = shouldRequireApproval(profile);

      // ✅ 100% DUPLICATE — block agad
      if (dupeRows.length === rows.length) {
        toast.error("Upload blocked", {
          description: `All ${rows.length} rows already exist in the system. Nothing to upload.`,
        });
        setLoading(false);
        return;
      }

      if (needsApproval) {
        if (!profile) {
          toast.error("User profile not loaded");
          setLoading(false);
          return;
        }
        setLoading(false);
        if (dupeRows.length > 0) {
          setDuplicateRows(dupeRows);
          setNonDuplicateRows(nonDupes);
          setApprovalAfterDuplicate(true);
          setApprovalDupSummary(
            `${dupeRows.length} duplicate company row(s) vs database · ${nonDupes.length} new row(s) if skipping duplicates`,
          );
          setDuplicateCheckOpen(true);
          return;
        }
        setApprovalRowsPending(rows);
        setApprovalDupSummary("No duplicate companies vs active suppliers.");
        setRequestApprovalOpen(true);
        return;
      }

      // ✅ PARTIAL DUPLICATE — show modal
      if (dupeRows.length > 0) {
        setDuplicateRows(dupeRows);
        setNonDuplicateRows(nonDupes);
        setDuplicateCheckOpen(true);
        setLoading(false);
        return;
      }

      // ✅ ZERO DUPLICATE — upload lahat
      await performUpload(rows);
    } catch (err) {
      console.error(err);
      toast.error("Duplicate check failed");
      setLoading(false);
    }
  };

  const submitSupplierUploadForApproval = async (message: string) => {
    if (!userId || !approvalRowsPending?.length) return;
    setRequestingApproval(true);
    try {
      const profile = await getApprovalUserProfile(userId);
      if (!profile) {
        toast.error("User profile not loaded");
        return;
      }
      const uploadRows = approvalRowsPending;
      await createApprovalRequest({
        actionType: "supplier_upload",
        entityLabel: approvalFilename,
        requester: profile,
        message,
        summary: `Upload suppliers: ${approvalFilename}`,
        payload: {
          filename: approvalFilename,
          rows: uploadRows as Record<string, unknown>[],
          rowCount: uploadRows.length,
          duplicateSummary: approvalDupSummary || null,
          overwriteConflicts: true,
        },
      });
      await logSupplierEvent({
        whatHappened: "Supplier For Approval Requested",
        referenceID: profile.referenceID,
        userId,
        extra: { source: "excel_upload", filename: approvalFilename, rows: uploadRows.length },
      });
      toast.success("Upload request sent for approval");
      setRequestApprovalOpen(false);
      setRows([]);
      setApprovalRowsPending(null);
      setApprovalDupSummary("");
      setApprovalAfterDuplicate(false);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to send approval request");
    } finally {
      setRequestingApproval(false);
    }
  };

  /* ----------------------------------------------------------------
   * Duplicate modal handlers
   * ---------------------------------------------------------------- */
  const handleSkipDuplicates = async () => {
    setDuplicateCheckOpen(false);
    if (!nonDuplicateRows.length) {
      toast.warning("Nothing to upload", { description: "All rows were duplicates." });
      return;
    }

    if (approvalAfterDuplicate) {
      setApprovalAfterDuplicate(false);
      setApprovalRowsPending(nonDuplicateRows);
      setRequestApprovalOpen(true);
      return;
    }

    setLoading(true);
    await performUpload(nonDuplicateRows);
  };

  const handleUploadAll = async () => {
    setDuplicateCheckOpen(false);

    if (approvalAfterDuplicate) {
      setApprovalAfterDuplicate(false);
      setApprovalDupSummary(
        `${duplicateRows.length} row(s) match existing companies (upload all was selected).`,
      );
      setApprovalRowsPending(rows);
      setRequestApprovalOpen(true);
      return;
    }

    setLoading(true);
    await performUpload(rows);
  };

  /* ----------------------------------------------------------------
   * Core upload logic
   * ---------------------------------------------------------------- */
  const performUpload = async (uploadRows: ExcelRow[]) => {
    try {
      const snap = await getDocs(collection(db, "suppliers"));
      const supplierMap = new Map<string, { id: string; isActive: boolean; data: any }>();
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!data.company) return;
        // ✅ Use normalizeCompany for map keys too
        supplierMap.set(normalizeCompany(data.company), {
          id: d.id,
          isActive: data.isActive !== false,
          data,
        });
      });

      let inserted = 0;
      let skipped = 0;
      let reactivated = 0;
      const detectedConflicts: SupplierConflict[] = [];

      for (const row of uploadRows) {
        const company = String(
          row["Company Name"] ??
          (row as any)["Company"] ??
          (row as any)["company name"] ??
          (row as any)["company"] ??
          "",
        ).trim();

        if (!company) { skipped++; continue; }

        // ✅ Use normalizeCompany for lookup
        const key = normalizeCompany(company);
        const existing = supplierMap.get(key);
        const incomingContacts = parseContacts(
          String(row["Contact Name(s)"] ?? ""),
          String(row["Phone Number(s)"] ?? ""),
        );

        // 🔴 EXISTING & ACTIVE → check for differences
        if (existing?.isActive) {
          const existingData = existing.data;
          const incomingData = {
            supplierBrand : String(row["Supplier Brand"] ?? "").trim(),
            addresses     : safeSplit(row.Addresses),
            emails        : safeSplit(row.Emails),
            website       : row.Website || "",
            contacts      : incomingContacts,
            forteProducts : safeSplit(row["Forte Product(s)"]),
            products      : safeSplit(row["Product(s)"]),
            certificates  : safeSplit(row["Certificate(s)"]),
          };

          const isDifferent =
            (existingData.supplierBrand || "") !== incomingData.supplierBrand ||
            normalizeJoin(existingData.addresses) !== normalizeJoin(incomingData.addresses) ||
            normalizeJoin(existingData.emails) !== normalizeJoin(incomingData.emails) ||
            (existingData.website || "") !== incomingData.website ||
            normalizeContacts(existingData.contacts) !== normalizeContacts(incomingData.contacts) ||
            normalizeJoin(existingData.forteProducts) !== normalizeJoin(incomingData.forteProducts) ||
            normalizeJoin(existingData.products) !== normalizeJoin(incomingData.products) ||
            normalizeJoin(existingData.certificates) !== normalizeJoin(incomingData.certificates);

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

        // 🔁 EXISTING BUT INACTIVE → REACTIVATE
        if (existing) {
          const supplierBrand = String(row["Supplier Brand"] ?? "").trim();
          const addresses = safeSplit(row.Addresses);
          const firstAddress = addresses[0] || "";
          
          // Check if addresses have branch labels
          const hasBranchLabels = addresses.some(a => parseBranchLabel(a).branchIndex !== null);
          
          if (hasBranchLabels) {
            // Multi-branch mode - parse branch labels
            const addressesByBranch = groupByBranch(addresses);
            const emailsByBranch = groupByBranch(safeSplit(row.Emails));
            const contactsByBranch = groupContactsByBranch(
              safeSplit(String(row["Contact Name(s)"] ?? "")),
              safeSplit(String(row["Phone Number(s)"] ?? "")),
            );
            
            const branches: any[] = [];
            const branchIndices = Array.from(new Set([...addressesByBranch.keys(), ...emailsByBranch.keys(), ...contactsByBranch.keys()])).sort((a, b) => a - b);
            
            branchIndices.forEach(branchIdx => {
              const branchAddresses = addressesByBranch.get(branchIdx) || [];
              const firstBranchAddr = branchAddresses[0] || "";
              const { address, country } = extractCountryFromAddress(firstBranchAddr);
              branches.push({
                address,
                country,
                emails: emailsByBranch.get(branchIdx) || [],
                contacts: contactsByBranch.get(branchIdx) || [],
              });
            });
            
            const countries = branches.map(b => b.country);
            const displayAddresses = branches.map(b => `${b.address} (${b.country})`);
            
            await updateDoc(doc(db, "suppliers", existing.id), {
              whatHappened   : "Supplier Added",
              date_updated   : serverTimestamp(),
              supplierId     : existing.id,
              supplierBrand,
              supplierbrandId: existing.id,
              hasMultipleBranches: true,
              branches,
              addresses: displayAddresses,
              countries,
              website        : row.Website || "",
              forteProducts  : safeSplit(row["Forte Product(s)"]),
              products       : safeSplit(row["Product(s)"]),
              certificates   : safeSplit(row["Certificate(s)"]),
              isActive       : true,
              updatedAt      : serverTimestamp(),
            });
          } else {
            // Single branch mode
            const { address, country } = extractCountryFromAddress(firstAddress);
            await updateDoc(doc(db, "suppliers", existing.id), {
              whatHappened   : "Supplier Added",
              date_updated   : serverTimestamp(),
              supplierId     : existing.id,
              supplierBrand,
              supplierbrandId: existing.id,
              hasMultipleBranches: false,
              address,
              country,
              addresses: addresses.length > 0 ? addresses.map(a => {
                const { address: addr, country: c } = extractCountryFromAddress(a);
                return `${addr} (${c})`;
              }) : [],
              countries: addresses.length > 0 ? addresses.map(a => extractCountryFromAddress(a).country) : [country],
              emails         : safeSplit(row.Emails),
              website        : row.Website || "",
              contacts       : incomingContacts,
              forteProducts  : safeSplit(row["Forte Product(s)"]),
              products       : safeSplit(row["Product(s)"]),
              certificates   : safeSplit(row["Certificate(s)"]),
              isActive       : true,
              updatedAt      : serverTimestamp(),
            });
          }

          await logSupplierEvent({
            whatHappened : "Supplier Reactivated",
            supplierId   : existing.id,
            company,
            supplierBrand,
            referenceID  : user!.ReferenceID,
            userId       : userId ?? undefined,
            extra        : { source: "excel_upload" },
          });

          supplierMap.set(key, { ...existing, isActive: true });
          reactivated++;
          continue;
        }

        // 🟢 NEW SUPPLIER → INSERT
        const supplierBrand = String(row["Supplier Brand"] ?? "").trim();
        const addresses = safeSplit(row.Addresses);
        const firstAddress = addresses[0] || "";
        
        // Check if addresses have branch labels
        const hasBranchLabels = addresses.some(a => parseBranchLabel(a).branchIndex !== null);
        
        let supplierData: any = {
          company,
          supplierBrand,
          website: row.Website || "",
          forteProducts: safeSplit(row["Forte Product(s)"]),
          products: safeSplit(row["Product(s)"]),
          certificates: safeSplit(row["Certificate(s)"]),
          createdBy: userId,
          referenceID: user!.ReferenceID,
          isActive: true,
          createdAt: serverTimestamp(),
        };
        
        if (hasBranchLabels) {
          // Multi-branch mode - parse branch labels
          const addressesByBranch = groupByBranch(addresses);
          const emailsByBranch = groupByBranch(safeSplit(row.Emails));
          const contactsByBranch = groupContactsByBranch(
            safeSplit(String(row["Contact Name(s)"] ?? "")),
            safeSplit(String(row["Phone Number(s)"] ?? "")),
          );
          
          const branches: any[] = [];
          const branchIndices = Array.from(new Set([...addressesByBranch.keys(), ...emailsByBranch.keys(), ...contactsByBranch.keys()])).sort((a, b) => a - b);
          
          branchIndices.forEach(branchIdx => {
            const branchAddresses = addressesByBranch.get(branchIdx) || [];
            const firstBranchAddr = branchAddresses[0] || "";
            const { address, country } = extractCountryFromAddress(firstBranchAddr);
            branches.push({
              address,
              country,
              emails: emailsByBranch.get(branchIdx) || [],
              contacts: contactsByBranch.get(branchIdx) || [],
            });
          });
          
          const countries = branches.map(b => b.country);
          const displayAddresses = branches.map(b => `${b.address} (${b.country})`);
          
          supplierData.hasMultipleBranches = true;
          supplierData.branches = branches;
          supplierData.addresses = displayAddresses;
          supplierData.countries = countries;
        } else {
          // Single branch mode
          const { address, country } = extractCountryFromAddress(firstAddress);
          supplierData.hasMultipleBranches = false;
          supplierData.address = address;
          supplierData.country = country;
          supplierData.addresses = addresses.length > 0 ? addresses.map(a => {
            const { address: addr, country: c } = extractCountryFromAddress(a);
            return `${addr} (${c})`;
          }) : [];
          supplierData.countries = addresses.length > 0 ? addresses.map(a => extractCountryFromAddress(a).country) : [country];
          supplierData.emails = safeSplit(row.Emails);
          supplierData.contacts = incomingContacts;
        }
        
        const docRef = await addDoc(collection(db, "suppliers"), supplierData);

        await updateDoc(doc(db, "suppliers", docRef.id), {
          supplierId     : docRef.id,
          supplierbrandId: docRef.id,
          whatHappened   : "Supplier Added",
          date_updated   : serverTimestamp(),
        });

        await logSupplierEvent({
          whatHappened : "Supplier Added",
          supplierId   : docRef.id,
          company,
          supplierBrand,
          referenceID  : user!.ReferenceID,
          userId       : userId ?? undefined,
          extra        : { source: "excel_upload" },
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

        await logSupplierEvent({
          whatHappened : "Supplier Bulk Upload",
          referenceID  : user!.ReferenceID,
          userId       : userId ?? undefined,
          inserted,
          reactivated,
          skipped,
          extra        : { source: "excel_upload" },
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

  /* ----------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------- */
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
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-md p-6 text-center text-sm cursor-pointer
            ${dragActive ? "border-primary bg-muted/40" : "border-muted"}`}
          >
            Click or drag & drop Excel file here
            <div className="text-xs text-muted-foreground mt-1">(.xlsx, .xls, .csv)</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {rows.length > 0 && (
            <div className="mt-4 border rounded-md overflow-x-auto max-h-75">
              <table className="min-w-300 text-sm">
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
                    const previewPhones = safeSplit(String(row["Phone Number(s)"] ?? ""))
                      .map((p) => parsePhone(p).normalized)
                      .join(" | ");
                    return (
                      <tr key={i}>
                        <td className="p-2">{row["Company Name"] || "-"}</td>
                        <td className="p-2">{row["Supplier Brand"] || "-"}</td>
                        <td className="p-2">{row.Addresses || "-"}</td>
                        <td className="p-2">{row.Emails || "-"}</td>
                        <td className="p-2">{row.Website || "-"}</td>
                        <td className="p-2">{row["Contact Name(s)"] || "-"}</td>
                        <td className="p-2">{previewPhones || "-"}</td>
                        <td className="p-2">{row["Forte Product(s)"] || "-"}</td>
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
              onClick={() => { setRows([]); onOpenChange(false); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={loading || rows.length === 0}>
              {loading ? "Checking duplicates..." : "Go / Confirm Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>

        <UploadSupplierWarning
          open={warningOpen}
          conflicts={conflicts}
          performedByReferenceID={user?.ReferenceID}
          onCancel={() => { setConflicts([]); setWarningOpen(false); }}
          onProceed={async () => {
            setWarningOpen(false);
            setLoading(true);

            for (const c of conflicts) {
              const addresses = c.incoming.addresses || [];
              const firstAddress = addresses[0] || "";
              const { address, country } = extractCountryFromAddress(firstAddress);
              
              await updateDoc(doc(db, "suppliers", c.supplierId), {
                supplierBrand        : c.incoming.supplierBrand,
                supplierbrandId      : c.supplierId,
                hasMultipleBranches: false,
                address,
                country,
                addresses: addresses.length > 0 ? addresses.map(a => {
                  const { address: addr, country: c } = extractCountryFromAddress(a);
                  return `${addr} (${c})`;
                }) : [],
                countries: addresses.length > 0 ? addresses.map(a => extractCountryFromAddress(a).country) : [country],
                emails               : c.incoming.emails,
                website              : c.incoming.website,
                contacts             : c.incoming.contacts,
                forteProducts        : c.incoming.forteProducts,
                products             : c.incoming.products,
                certificates         : c.incoming.certificates,
                updatedAt            : serverTimestamp(),
                updatedBy            : userId,
                updatedByReferenceID : user?.ReferenceID,
              });

              await logSupplierEvent({
                whatHappened : "Supplier Edited",
                supplierId   : c.supplierId,
                company      : c.company,
                supplierBrand: c.incoming.supplierBrand,
                referenceID  : user?.ReferenceID,
                userId       : userId ?? undefined,
                extra        : { source: "excel_upload_conflict_overwrite" },
              });
            }

            await logSupplierEvent({
              whatHappened : "Supplier Bulk Upload",
              referenceID  : user?.ReferenceID,
              userId       : userId ?? undefined,
              overwritten  : conflicts.length,
              extra        : { source: "excel_upload_conflict_resolved" },
            });

            toast.success("Suppliers updated", {
              description: `${conflicts.length} supplier(s) overwritten`,
            });

            setConflicts([]);
            onOpenChange(false);
            setLoading(false);
          }}
        />
      </Dialog>

      {/* Duplicate Check Modal */}
      <DuplicateCheckModal
        open={duplicateCheckOpen}
        onOpenChange={setDuplicateCheckOpen}
        title={`${duplicateRows.length} Duplicate Supplier${duplicateRows.length > 1 ? "s" : ""} Found`}
        duplicates={duplicateRows}
        uploading={loading}
        onSkipDuplicates={handleSkipDuplicates}
        onUploadAll={handleUploadAll}
      />

      <RequestApprovalDialog
        open={requestApprovalOpen}
        onOpenChange={(o) => {
          setRequestApprovalOpen(o);
          if (!o) {
            setApprovalRowsPending(null);
            setApprovalDupSummary("");
            setApprovalAfterDuplicate(false);
          }
        }}
        actionLabel="Upload suppliers (Excel)"
        entityLabel={approvalFilename || "Excel file"}
        detailLines={[
          approvalDupSummary,
          approvalRowsPending?.length
            ? `${approvalRowsPending.length} supplier row(s) will be processed after approval (existing data conflicts will be overwritten when needed).`
            : "",
        ].filter(Boolean)}
        onConfirm={submitSupplierUploadForApproval}
        loading={requestingApproval}
      />
    </>
  );
}

export default UploadSupplier;
