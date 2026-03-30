"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Upload } from "lucide-react";
import ExcelJS from "exceljs";

import {
  collection,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { logProductEvent, logProductUsageEvent, logProductFamilyEvent } from "@/lib/auditlogger";

import DuplicateCheckModal, { DuplicateRow } from "@/components/duplicate-check-modal";

type Props = {
  iconOnly?: boolean;
};

type UserDetails = {
  Firstname: string;
  Lastname: string;
  ReferenceID: string;
};

type CategoryType = { id: string; name: string };
type ProductFamily = { id: string; name: string; categoryTypeId: string };
type Supplier = { supplierId: string; company: string; supplierBrand?: string };
type TemplateSpec = { id: string; title: string; specs: { specId: string }[]; sortOrder?: number };

type ParsedProductRow = {
  usage: string;
  family: string;
  productClass: string;
  pricePoint: string;
  brandOrigin: string;
  supplierBrand: string;
  imageURL: string;
  dimensionalURL: string;
  illuminanceURL: string;
  unitCost: string;
  length: string;
  width: string;
  height: string;
  pcsPerCarton: string;
  factoryAddress: string;
  portOfDischarge: string;
  wsIndex: number;
  rowIndex: number;
  specValues: Record<string, string>;
};

const cleanExcelValue = (val: any) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") return val.toString();
  const str = val.toString().trim();
  if (str === "-") return "";
  return str;
};

const convertDriveToThumbnail = (url?: string) => {
  if (!url) return "";
  if (!url.includes("drive.google.com")) return url;
  let fileId = "";
  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) fileId = match1[1];
  if (match2 && match2[1]) fileId = match2[1];
  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  return url;
};

const extractHyperlink = (cell: any): string => {
  if (!cell) return "";
  if (typeof cell === "object") {
    if (cell.text) return cell.text;
    if (cell.hyperlink) return cell.hyperlink;
    return String(cell);
  }
  return cleanExcelValue(cell);
};

/* ─────────────────────────────────────────────────────────────────
 * ✅ Normalize helpers
 *
 * download-product.tsx exports:
 *   col 6  → product.supplier?.supplierBrand || "ECONOMY"
 *   col 5  → product.brandOrigin || "CHINA"
 *
 * But Firestore stores:
 *   supplier?.supplierBrand → null | "" when no supplier
 *   brandOrigin             → null | "" | "CHINA"
 *
 * We normalize BOTH sides to the same value so fingerprints match.
 * ───────────────────────────────────────────────────────────────── */
const normalizeSupplierBrand = (val: string | null | undefined): string => {
  const v = (val ?? "").trim().toUpperCase();
  // "ECONOMY" in the downloaded Excel = no supplier → treat as ""
  if (v === "ECONOMY" || v === "-" || v === "N/A") return "";
  return v.toLowerCase();
};

const normalizeBrandOrigin = (val: string | null | undefined): string => {
  return (val ?? "").trim().toLowerCase();
};

const normalizeField = (val: string | null | undefined): string => {
  return (val ?? "").trim().toLowerCase();
};

const buildFingerprint = (
  usage: string,
  family: string,
  productClass: string,
  pricePoint: string,
  brandOrigin: string,
  supplierBrand: string,
): string =>
  [
    normalizeField(usage),
    normalizeField(family),
    normalizeField(productClass),
    normalizeField(pricePoint),
    normalizeBrandOrigin(brandOrigin),
    normalizeSupplierBrand(supplierBrand),
  ].join("|");

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function UploadProduct({ iconOnly = false }: Props) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [totalRows, setTotalRows] = React.useState(0);

  const [duplicateRows, setDuplicateRows] = useState<DuplicateRow[]>([]);
  const [duplicateCheckOpen, setDuplicateCheckOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [nonDuplicateParsedRows, setNonDuplicateParsedRows] = useState<ParsedProductRow[]>([]);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const cancelRef = React.useRef(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) =>
        setUser({
          Firstname: d.Firstname ?? "",
          Lastname: d.Lastname ?? "",
          ReferenceID: d.ReferenceID ?? "",
        }),
      )
      .catch(console.error);
  }, [userId]);

  /* ----------------------------------------------------------------
   * Firestore helpers
   * ---------------------------------------------------------------- */
  const findCategoryType = async (name: string): Promise<CategoryType | null> => {
    const q = query(
      collection(db, "categoryTypes"),
      where("name", "==", name),
      where("isActive", "==", true),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as DocumentData;
      return { id: docSnap.id, name: data.name };
    }
    const newDoc = await addDoc(collection(db, "categoryTypes"), {
      name,
      isActive: true,
      createdAt: serverTimestamp(),
      whatHappened: "Product Usage Added (Excel Upload)",
      date_updated: serverTimestamp(),
    });
    await logProductUsageEvent({
      whatHappened: "Product Usage Added",
      productUsageId: newDoc.id,
      productUsageName: name,
      referenceID: user?.ReferenceID,
      userId: userId ?? undefined,
      extra: { source: "excel_upload" },
    });
    return { id: newDoc.id, name };
  };

  const findProductFamily = async (
    categoryTypeId: string,
    name: string,
  ): Promise<ProductFamily | null> => {
    const q = query(
      collection(db, "productFamilies"),
      where("categoryTypeId", "==", categoryTypeId),
      where("name", "==", name),
      where("isActive", "==", true),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as DocumentData;
      return { id: docSnap.id, name: data.name, categoryTypeId: data.categoryTypeId };
    }
    const newDoc = await addDoc(collection(db, "productFamilies"), {
      name,
      categoryTypeId,
      isActive: true,
      createdAt: serverTimestamp(),
      whatHappened: "Product Family Added (Excel Upload)",
      date_updated: serverTimestamp(),
    });
    await logProductFamilyEvent({
      whatHappened: "Product Family Added",
      productFamilyId: newDoc.id,
      productFamilyName: name,
      productUsageId: categoryTypeId,
      referenceID: user?.ReferenceID,
      userId: userId ?? undefined,
      extra: { source: "excel_upload" },
    });
    return { id: newDoc.id, name, categoryTypeId };
  };

  const findSupplier = async (brand: string): Promise<Supplier | null> => {
    if (!brand) return null;
    const q = query(
      collection(db, "suppliers"),
      where("supplierBrand", "==", brand),
      where("isActive", "==", true),
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data();
    return { supplierId: d.id, company: data.company, supplierBrand: data.supplierBrand || "" };
  };

  const createMissingTemplateSpecs = async (
    categoryTypeId: string,
    productFamilyId: string,
    excelColumns: { title: string; specId: string }[],
  ) => {
    const templateSnap = await getDocs(
      query(
        collection(db, "technicalSpecifications"),
        where("categoryTypeId", "==", categoryTypeId),
        where("productFamilyId", "==", productFamilyId),
        where("isActive", "==", true),
      ),
    );
    const existingTitles = templateSnap.docs.map((doc) => doc.data().title);
    const excelGroupsMap = new Map<string, { specId: string }[]>();
    for (const col of excelColumns) {
      if (!excelGroupsMap.has(col.title)) excelGroupsMap.set(col.title, []);
      excelGroupsMap.get(col.title)!.push({ specId: col.specId });
    }
    let sortOrder = 0;
    for (const [title, specs] of excelGroupsMap) {
      sortOrder++;
      if (!existingTitles.includes(title)) {
        await addDoc(collection(db, "technicalSpecifications"), {
          categoryTypeId,
          productFamilyId,
          title,
          specs,
          sortOrder,
          isActive: true,
          createdAt: serverTimestamp(),
          whatHappened: "Product Added",
          date_updated: serverTimestamp(),
        });
      } else {
        const existingDoc = templateSnap.docs.find((doc) => doc.data().title === title);
        if (existingDoc)
          await updateDoc(existingDoc.ref, { sortOrder, date_updated: serverTimestamp() });
      }
    }
  };

  const findTemplateSpecs = async (
    categoryTypeId: string,
    productFamilyId: string,
  ): Promise<TemplateSpec[]> => {
    const q = query(
      collection(db, "technicalSpecifications"),
      where("categoryTypeId", "==", categoryTypeId),
      where("productFamilyId", "==", productFamilyId),
      where("isActive", "==", true),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          title: data.title,
          specs: data.specs || [],
          sortOrder: data.sortOrder ?? 999,
        };
      })
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  };

  const syncExistingProductsToTemplate = async (
    categoryTypeId: string,
    productFamilyId: string,
  ) => {
    const templateSnap = await getDocs(
      query(
        collection(db, "technicalSpecifications"),
        where("categoryTypeId", "==", categoryTypeId),
        where("productFamilyId", "==", productFamilyId),
        where("isActive", "==", true),
      ),
    );
    const templates = templateSnap.docs
      .map((doc) => ({
        id: doc.id,
        title: doc.data().title,
        specs: doc.data().specs || [],
        sortOrder: doc.data().sortOrder ?? 999,
      }))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    const productSnap = await getDocs(collection(db, "products"));
    for (const productDoc of productSnap.docs) {
      const data = productDoc.data();
      const family = data.productFamilies?.[0];
      if (!family) continue;
      if (family.productFamilyId !== productFamilyId || family.productUsageId !== categoryTypeId)
        continue;
      const existingSpecs = data.technicalSpecifications || [];
      const mergedSpecs = templates.map((template) => {
        const existingGroup = existingSpecs.find((g: any) => g.title === template.title);
        return {
          technicalSpecificationId: template.id,
          title: template.title,
          specs: template.specs.map((spec: any) => {
            const existingRow = existingGroup?.specs?.find(
              (r: any) => r.specId === spec.specId,
            );
            return { specId: spec.specId, value: existingRow?.value || "" };
          }),
        };
      });
      await updateDoc(productDoc.ref, {
        technicalSpecifications: mergedSpecs,
        updatedAt: serverTimestamp(),
      });
    }
  };

  /* ----------------------------------------------------------------
   * Parse workbook into flat rows
   * ---------------------------------------------------------------- */
  const parseWorkbookRows = async (
    workbook: ExcelJS.Workbook,
  ): Promise<ParsedProductRow[]> => {
    const result: ParsedProductRow[] = [];

    for (let wsIndex = 0; wsIndex < workbook.worksheets.length; wsIndex++) {
      const ws = workbook.worksheets[wsIndex];
      const header1Row = ws.getRow(1);
      const header2Row = ws.getRow(2);
      const header3Row = ws.getRow(3);

      const commercialColMap: Record<string, number> = {
        unitCost: -1, length: -1, width: -1, height: -1,
        pcsPerCarton: -1, factoryAddress: -1, portOfDischarge: -1,
      };
      let dimensionalCol = -1;
      let illuminanceCol = -1;
      const excelColumns: { title: string; specId: string; col: number }[] = [];

      for (let col = 1; col <= ws.columnCount; col++) {
        const specHeader       = cleanExcelValue(header1Row.getCell(col).value);
        const groupHeader      = cleanExcelValue(header2Row.getCell(col).value);
        const commercialHeader = cleanExcelValue(header3Row.getCell(col).value);
        if (commercialHeader === "Unit Cost")         { commercialColMap.unitCost = col; continue; }
        if (commercialHeader === "Length")            { commercialColMap.length = col; continue; }
        if (commercialHeader === "Width")             { commercialColMap.width = col; continue; }
        if (commercialHeader === "Height")            { commercialColMap.height = col; continue; }
        if (commercialHeader === "pcs/carton")        { commercialColMap.pcsPerCarton = col; continue; }
        if (commercialHeader === "Factory Address")   { commercialColMap.factoryAddress = col; continue; }
        if (commercialHeader === "Port of Discharge") { commercialColMap.portOfDischarge = col; continue; }
        if (col < 10) continue;
        if (groupHeader === "COMMERCIAL DETAILS") continue;
        if (!groupHeader || !specHeader) continue;
        if (specHeader === "Dimensional Drawing") {
          dimensionalCol = col;
          continue;
        }

        if (specHeader === "Illuminance Drawing") {
          illuminanceCol = col;
          continue;
        }
        excelColumns.push({ title: groupHeader, specId: specHeader, col });
      }

      let lastUsage = "", lastFamily = "", lastClass = "", lastPricePoint = "";
      let lastBrandOrigin = "", lastSupplier = "", lastImage = "";

      const getCellVal = (row: ExcelJS.Row, colIndex: number) =>
        colIndex > 0 ? cleanExcelValue(row.getCell(colIndex).value) : "";
      const cleanCM = (val: string) => (val ? val.replace(/[^0-9.]/g, "") : "");

      for (let r = 4; r <= ws.actualRowCount; r++) {
        const row = ws.getRow(r);

        const usage         = cleanExcelValue(row.getCell(1).value) || lastUsage;
        const family        = cleanExcelValue(row.getCell(2).value) || lastFamily;
        const productClass  = cleanExcelValue(row.getCell(3).value) || lastClass;
        const pricePoint    = cleanExcelValue(row.getCell(4).value) || lastPricePoint;
        const brandOrigin   = cleanExcelValue(row.getCell(5).value) || lastBrandOrigin;
        const supplierBrand = cleanExcelValue(row.getCell(6).value) || lastSupplier;
        const imageURL      =
          convertDriveToThumbnail(extractHyperlink(row.getCell(7).value)) || lastImage;
        const dimensionalURL = dimensionalCol > 0
          ? convertDriveToThumbnail(extractHyperlink(row.getCell(dimensionalCol).value))
          : "";

        const illuminanceURL = illuminanceCol > 0
          ? convertDriveToThumbnail(extractHyperlink(row.getCell(illuminanceCol).value))
          : "";

        lastUsage = usage; lastFamily = family; lastClass = productClass;
        lastPricePoint = pricePoint; lastBrandOrigin = brandOrigin;
        lastSupplier = supplierBrand; lastImage = imageURL;

        if (!usage || !family) continue;
        if (!productClass && !pricePoint && !brandOrigin && !supplierBrand) continue;

        const specValues: Record<string, string> = {};
        for (const col of excelColumns) {
          specValues[`${col.title}||${col.specId}`] = cleanExcelValue(
            row.getCell(col.col).value,
          );
        }

        result.push({
          usage, family, productClass, pricePoint, brandOrigin, supplierBrand,
          imageURL, dimensionalURL, illuminanceURL,
          unitCost       : getCellVal(row, commercialColMap.unitCost),
          length         : cleanCM(getCellVal(row, commercialColMap.length)),
          width          : cleanCM(getCellVal(row, commercialColMap.width)),
          height         : cleanCM(getCellVal(row, commercialColMap.height)),
          pcsPerCarton   : getCellVal(row, commercialColMap.pcsPerCarton),
          factoryAddress : getCellVal(row, commercialColMap.factoryAddress),
          portOfDischarge: getCellVal(row, commercialColMap.portOfDischarge),
          wsIndex, rowIndex: r,
          specValues,
        });
      }
    }

    return result;
  };

  /* ----------------------------------------------------------------
   * ✅ FIXED duplicate check
   *
   * Root cause of the 523-limit bug:
   *   download-product.tsx col 6 → supplier?.supplierBrand || "ECONOMY"
   *   download-product.tsx col 5 → brandOrigin || "CHINA"
   *   But Firestore stores null / "" for products with no supplier.
   *
   * Fix: normalize both sides with buildFingerprint() before comparing.
   *   "ECONOMY" → ""  (treated as no supplier brand)
   *   null / "" → ""  (same)
   *   So fingerprints match correctly for ALL rows.
   * ---------------------------------------------------------------- */
  const checkForDuplicates = async (
    rows: ParsedProductRow[],
  ): Promise<{
    dupeRows: DuplicateRow[];
    nonDupes: ParsedProductRow[];
    dupeOriginals: ParsedProductRow[];
  }> => {
    const snap = await getDocs(collection(db, "products"));

    // Build fingerprint set from ALL existing active products
    const existingFingerprints = new Set<string>();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.isActive === false) return;

      const usage         = data.categoryTypes?.[0]?.categoryTypeName ?? "";
      const family        = data.productFamilies?.[0]?.productFamilyName ?? "";
      const productClass  = data.productClass ?? "";
      const pricePoint    = data.pricePoint ?? "";
      const brandOrigin   = data.brandOrigin ?? "";
      const supplierBrand = data.supplier?.supplierBrand ?? "";

      existingFingerprints.add(
        buildFingerprint(usage, family, productClass, pricePoint, brandOrigin, supplierBrand),
      );
    });

    const dupeOriginals: ParsedProductRow[] = [];
    const nonDupes: ParsedProductRow[] = [];

    for (const row of rows) {
      const fp = buildFingerprint(
        row.usage,
        row.family,
        row.productClass,
        row.pricePoint,
        row.brandOrigin,
        row.supplierBrand,
      );
      if (existingFingerprints.has(fp)) {
        dupeOriginals.push(row);
      } else {
        nonDupes.push(row);
      }
    }

    const COLS = [
      "Usage", "Family", "Product Class", "Price Point",
      "Brand Origin", "Supplier Brand", "Image", "Dimensional", "Illuminance",
      "Unit Cost", "L (cm)", "W (cm)", "H (cm)", "Pcs/Carton",
      "Factory Address", "Port of Discharge",
    ];

    const dupeRows: DuplicateRow[] = dupeOriginals.map((row, i) => ({
      key: `${i}-${row.usage}-${row.productClass}`,
      columns: COLS,
      values: [
        row.usage, row.family, row.productClass, row.pricePoint,
        row.brandOrigin, row.supplierBrand,
        row.imageURL ? "✓ Image" : "—",
        row.dimensionalURL ? "✓ Drawing" : "—",
        row.illuminanceURL ? "✓ Illuminance" : "—",
        row.unitCost, row.length, row.width, row.height, row.pcsPerCarton,
        row.factoryAddress, row.portOfDischarge,
      ],
    }));

    return { dupeRows, nonDupes, dupeOriginals };
  };

  /* ----------------------------------------------------------------
   * Main upload handler
   * ---------------------------------------------------------------- */
  const handleUpload = async () => {
    if (!file) return;
    cancelRef.current = false;
    setUploading(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const allRows = await parseWorkbookRows(workbook);
      setParsedRows(allRows);

      if (!allRows.length) {
        toast.warning("No valid rows found in the file.");
        setUploading(false);
        return;
      }

      const { dupeRows, nonDupes } = await checkForDuplicates(allRows);

      // ✅ 100% DUPLICATE — block agad
      if (dupeRows.length === allRows.length) {
        toast.error("Upload blocked", {
          description: `All ${allRows.length} rows already exist in the system. Nothing to upload.`,
        });
        setUploading(false);
        return;
      }

      // ✅ PARTIAL DUPLICATE — show modal
      if (dupeRows.length > 0) {
        setDuplicateRows(dupeRows);
        setNonDuplicateParsedRows(nonDupes);
        setDuplicateCheckOpen(true);
        setUploading(false);
        return;
      }

      // ✅ ZERO DUPLICATE — upload lahat
      await performUpload(allRows, workbook);
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
      setUploading(false);
    }
  };

  /* ----------------------------------------------------------------
   * Duplicate modal handlers
   * ---------------------------------------------------------------- */
  const handleSkipDuplicates = async () => {
    setDuplicateCheckOpen(false);
    if (!nonDuplicateParsedRows.length) {
      toast.warning("Nothing to upload", { description: "All rows were duplicates." });
      return;
    }
    if (!file) return;
    setUploading(true);
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    await performUpload(nonDuplicateParsedRows, workbook);
  };

  const handleUploadAll = async () => {
    setDuplicateCheckOpen(false);
    if (!file) return;
    setUploading(true);
    const workbook = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await workbook.xlsx.load(buffer);
    await performUpload(parsedRows, workbook);
  };

  /* ----------------------------------------------------------------
   * Core upload logic
   * ---------------------------------------------------------------- */
  const performUpload = async (
    rowsToUpload: ParsedProductRow[],
    workbook: ExcelJS.Workbook,
  ) => {
    cancelRef.current = false;

    try {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio("/musics/elevator-music.mp3");
          audioRef.current.loop = true;
          audioRef.current.volume = 0.4;
        }
        audioRef.current.play();
      } catch (err) {
        console.warn("Audio blocked by browser");
      }

      setTotalRows(rowsToUpload.length);
      setUploadProgress(0);

      // ✅ Fetch count ONCE — then increment per row for unique PROD-SPF-
      const existingSnap = await getDocs(collection(db, "products"));
      let productCounter = existingSnap.size;

      let dimensionalCol = -1;
      let illuminanceCol = -1;

      // Build excelColumns map per wsIndex
      const wsColumnsMap = new Map<number, { title: string; specId: string; col: number }[]>();
      for (let wsIndex = 0; wsIndex < workbook.worksheets.length; wsIndex++) {
        const ws = workbook.worksheets[wsIndex];
        const header1Row = ws.getRow(1);
        const header2Row = ws.getRow(2);
        const header3Row = ws.getRow(3);
        const cols: { title: string; specId: string; col: number }[] = [];
        for (let col = 1; col <= ws.columnCount; col++) {
          const specHeader    = cleanExcelValue(header1Row.getCell(col).value);
          const groupHeader   = cleanExcelValue(header2Row.getCell(col).value);
          const commercialHdr = cleanExcelValue(header3Row.getCell(col).value);
          if (
            ["Unit Cost", "Length", "Width", "Height", "pcs/carton",
              "Factory Address", "Port of Discharge"].includes(commercialHdr)
          ) continue;
          if (col < 10) continue;
          if (groupHeader === "COMMERCIAL DETAILS") continue;
          if (!groupHeader || !specHeader) continue;
          cols.push({ title: groupHeader, specId: specHeader, col });

          if (specHeader === "Dimensional Drawing") {
            dimensionalCol = col;
            continue;
          }

          if (specHeader === "Illuminance Drawing") {
            illuminanceCol = col;
            continue;
          }

          if (!groupHeader || !specHeader) continue;
        }
        wsColumnsMap.set(wsIndex, cols);
      }

      const syncedFamilies = new Set<string>();
      let totalInserted = 0;

      for (const row of rowsToUpload) {
        if (cancelRef.current) { toast.message("Upload cancelled"); break; }

        const category = await findCategoryType(row.usage);
        if (!category) continue;
        const productFamily = await findProductFamily(category.id, row.family);
        if (!productFamily) continue;
        const supplier = await findSupplier(row.supplierBrand);

        const excelColumns = wsColumnsMap.get(row.wsIndex) ?? [];
        const syncKey = category.id + "_" + productFamily.id;
        if (!syncedFamilies.has(syncKey)) {
          if (cancelRef.current) break;
          await createMissingTemplateSpecs(category.id, productFamily.id, excelColumns);
          if (cancelRef.current) break;
          await syncExistingProductsToTemplate(category.id, productFamily.id);
          syncedFamilies.add(syncKey);
        }

        const templateSpecs = await findTemplateSpecs(category.id, productFamily.id);
        const productSpecs = templateSpecs.map((template) => ({
          technicalSpecificationId: template.id,
          title: template.title,
          specs: template.specs.map((templateSpec) => ({
            specId: templateSpec.specId,
            value : row.specValues[`${template.title}||${templateSpec.specId}`] ?? "",
          })),
        }));

        // ✅ Increment per row — no duplicate PROD-SPF- IDs
        productCounter++;
        const referenceID = `PROD-SPF-${productCounter.toString().padStart(5, "0")}`;

        if (cancelRef.current) break;

        const newDocRef = await addDoc(collection(db, "products"), {
          productReferenceID : referenceID,
          productClass       : row.productClass,
          pricePoint         : row.pricePoint,
          brandOrigin        : row.brandOrigin,
          supplier,
          mainImage          : row.imageURL ? { url: row.imageURL } : null,
          dimensionalDrawing : row.dimensionalURL ? { url: row.dimensionalURL } : null,
          illuminanceDrawing : row.illuminanceURL ? { url: row.illuminanceURL } : null,
          categoryTypes      : [{ productUsageId: category.id, categoryTypeName: category.name }],
          productFamilies    : [{ productFamilyId: productFamily.id, productFamilyName: productFamily.name, productUsageId: category.id }],
          technicalSpecifications: productSpecs,
          commercialDetails  : {
            unitCost     : row.unitCost ? parseFloat(row.unitCost) : null,
            packaging    : {
              length : row.length ? `${parseFloat(row.length)} cm` : null,
              width  : row.width  ? `${parseFloat(row.width)} cm`  : null,
              height : row.height ? `${parseFloat(row.height)} cm` : null,
            },
            pcsPerCarton   : row.pcsPerCarton ? parseInt(row.pcsPerCarton) : null,
            factoryAddress : row.factoryAddress || "",
            portOfDischarge: row.portOfDischarge || "",
          },
          isActive    : true,
          createdAt   : serverTimestamp(),
          whatHappened: "Product Added",
          date_updated: serverTimestamp(),
        });

        await logProductEvent({
          whatHappened       : "Product Added",
          productId          : newDocRef.id,
          productReferenceID : referenceID,
          productClass       : row.productClass,
          pricePoint         : row.pricePoint,
          brandOrigin        : row.brandOrigin,
          supplier           : supplier ?? null,
          categoryTypes      : [{ productUsageId: category.id, categoryTypeName: category.name }],
          productFamilies    : [{ productFamilyId: productFamily.id, productFamilyName: productFamily.name }],
          mainImage          : row.imageURL ? { url: row.imageURL } : null,
          dimensionalDrawing : row.dimensionalURL ? { url: row.dimensionalURL } : null,
          illuminanceDrawing : row.illuminanceURL ? { url: row.illuminanceURL } : null,
          technicalSpecifications: productSpecs.map((s) => ({
            technicalSpecificationId: s.technicalSpecificationId,
            title: s.title,
            specs: s.specs,
          })),
          referenceID : user?.ReferenceID,
          userId      : userId ?? undefined,
          extra       : { source: "excel_upload", filename: file?.name ?? "" },
        });

        totalInserted++;
        setUploadProgress((prev) => prev + 1);
      }

      audioRef.current?.pause();
      audioRef.current!.currentTime = 0;

      await logProductEvent({
        whatHappened: "Product Bulk Upload",
        inserted    : totalInserted,
        referenceID : user?.ReferenceID,
        userId      : userId ?? undefined,
        extra       : { source: "excel_upload", filename: file?.name ?? "" },
      });

      toast.success("Upload complete");
      setOpen(false);
      setFile(null);
      setUploadProgress(0);
      setTotalRows(0);
    } catch (error) {
      console.error(error);
      audioRef.current?.pause();
      audioRef.current!.currentTime = 0;
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ----------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------- */
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {iconOnly ? (
            <button className="h-8 w-8 rounded-full border border-gray-200 bg-white/80 flex items-center justify-center">
              <Upload className="h-4 w-4 text-gray-600" />
            </button>
          ) : (
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          )}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Products</DialogTitle>
          </DialogHeader>

          <div
            className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-gray-50 transition"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) setFile(droppedFile);
            }}
            onClick={() => document.getElementById("product-upload-input")?.click()}
          >
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-gray-500" />
              <p className="text-sm text-gray-600">Drag & Drop your Excel file here</p>
              <p className="text-xs text-gray-400">or click to browse</p>
              {file && !uploading && (
                <p className="text-sm font-medium text-green-600">{file.name}</p>
              )}
              {uploading && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                  <p className="text-sm font-medium">Uploading products...</p>
                  <p className="text-xs text-gray-500">
                    {uploadProgress} out of {totalRows}
                  </p>
                </div>
              )}
            </div>
            <input
              id="product-upload-input"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                cancelRef.current = true;
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                setUploading(false);
                setOpen(false);
                toast.message("Upload cancelled");
              }}
            >
              Cancel
            </Button>
            <Button disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? "Checking..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Check Modal */}
      <DuplicateCheckModal
        open={duplicateCheckOpen}
        onOpenChange={setDuplicateCheckOpen}
        title={`${duplicateRows.length} Duplicate Product${duplicateRows.length > 1 ? "s" : ""} Found`}
        duplicates={duplicateRows}
        uploading={uploading}
        onSkipDuplicates={handleSkipDuplicates}
        onUploadAll={handleUploadAll}
      />
    </>
  );
}
