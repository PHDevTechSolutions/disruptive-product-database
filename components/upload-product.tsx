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

/** A fully-parsed product row ready to be inserted into Firestore */
type ParsedProductRow = {
  sheetName: string;
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
  /** Raw ExcelJS row reference — kept so we can re-read spec cell values during insert */
  rawRow: ExcelJS.Row;
};

/* ── Helpers ── */

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

const extractCellURL = (cellValue: any): string => {
  if (typeof cellValue === "object" && cellValue !== null) {
    if (cellValue.text) return cellValue.text;
    if (cellValue.hyperlink) return cellValue.hyperlink;
    return String(cellValue);
  }
  return cleanExcelValue(cellValue);
};

/* ── Component ── */

export default function UploadProduct({ iconOnly = false }: Props) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [totalRows, setTotalRows] = React.useState(0);

  /* ── Duplicate-check state ── */
  const [dupModalOpen, setDupModalOpen] = React.useState(false);
  const [duplicateRows, setDuplicateRows] = React.useState<DuplicateRow[]>([]);
  const [pendingRows, setPendingRows] = React.useState<ParsedProductRow[]>([]);
  const [duplicateRowKeys, setDuplicateRowKeys] = React.useState<Set<string>>(new Set());
  /**
   * excelColumnsBySheet stores the parsed spec columns per sheet name so they
   * can be reused during the actual Firestore insert phase.
   */
  const [excelColumnsBySheet, setExcelColumnsBySheet] = React.useState<
    Map<string, { title: string; specId: string; col: number }[]>
  >(new Map());

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const cancelRef = React.useRef(false);

  /* ── Fetch user details for audit log ── */
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

  /* ── Audio helpers ── */

  const playAudio = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("/musics/elevator-music.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;
      }
      audioRef.current.play();
    } catch {
      console.warn("Audio blocked by browser");
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  /* ── Firestore helpers ── */

  const generateProductReferenceID = async () => {
    const snap = await getDocs(collection(db, "products"));
    const count = snap.size + 1;
    return `PROD-SPF-${count.toString().padStart(5, "0")}`;
  };

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
      if (
        family.productFamilyId !== productFamilyId ||
        family.productUsageId !== categoryTypeId
      )
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

  /* ── Duplicate detection ── */

  /**
   * Stable key for a parsed row used to detect duplicates.
   * Matches on: productClass + pricePoint + brandOrigin + supplierBrand + family name.
   */
  const rowDupKey = (p: ParsedProductRow) =>
    [p.productClass, p.pricePoint, p.brandOrigin, p.supplierBrand, p.family]
      .join("||")
      .toLowerCase();

  const checkDuplicatesInFirestore = async (
    rows: ParsedProductRow[],
  ): Promise<Set<string>> => {
    const dupKeys = new Set<string>();

    // Fetch all existing active products once
    const snap = await getDocs(
      query(collection(db, "products"), where("isActive", "==", true)),
    );

    const existingKeys = snap.docs.map((doc) => {
      const d = doc.data();
      return [
        d.productClass ?? "",
        d.pricePoint ?? "",
        d.brandOrigin ?? "",
        d.supplier?.supplierBrand ?? "",
        d.productFamilies?.[0]?.productFamilyName ?? "",
      ]
        .join("||")
        .toLowerCase();
    });

    for (const row of rows) {
      const key = rowDupKey(row);
      if (existingKeys.includes(key)) dupKeys.add(key);
    }

    return dupKeys;
  };

  /* ── Core insert — reused by both "Skip" and "Upload All" paths ── */

  const insertRows = async (rows: ParsedProductRow[]) => {
    setTotalRows(rows.length);
    setUploadProgress(0);

    let totalInserted = 0;
    const syncedFamilies = new Set<string>();

    for (const parsed of rows) {
      if (cancelRef.current) {
        toast.message("Upload cancelled");
        break;
      }

      const excelColumns = excelColumnsBySheet.get(parsed.sheetName) ?? [];

      const category = await findCategoryType(parsed.usage);
      if (!category) continue;
      const productFamily = await findProductFamily(category.id, parsed.family);
      if (!productFamily) continue;
      const supplier = await findSupplier(parsed.supplierBrand);

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
        specs: template.specs.map((templateSpec) => {
          const excelMatch = excelColumns.find(
            (col) => col.title === template.title && col.specId === templateSpec.specId,
          );
          const cellValue = excelMatch
            ? cleanExcelValue(parsed.rawRow.getCell(excelMatch.col).value)
            : "";
          return { specId: templateSpec.specId, value: cellValue };
        }),
      }));

      const referenceID = await generateProductReferenceID();
      if (cancelRef.current) break;

      const cleanCM = (val: string) => (val ? val.replace(/[^0-9.]/g, "") : "");
      const l = cleanCM(parsed.length);
      const w = cleanCM(parsed.width);
      const h = cleanCM(parsed.height);

      const newDocRef = await addDoc(collection(db, "products"), {
        productReferenceID: referenceID,
        productClass: parsed.productClass,
        pricePoint: parsed.pricePoint,
        brandOrigin: parsed.brandOrigin,
        supplier,
        mainImage: parsed.imageURL ? { url: parsed.imageURL } : null,
        dimensionalDrawing: parsed.dimensionalURL ? { url: parsed.dimensionalURL } : null,
        illuminanceDrawing: parsed.illuminanceURL ? { url: parsed.illuminanceURL } : null,
        categoryTypes: [{ productUsageId: category.id, categoryTypeName: category.name }],
        productFamilies: [
          {
            productFamilyId: productFamily.id,
            productFamilyName: productFamily.name,
            productUsageId: category.id,
          },
        ],
        technicalSpecifications: productSpecs,
        commercialDetails: {
          unitCost: parsed.unitCost ? parseFloat(parsed.unitCost) : null,
          packaging: {
            length: l ? `${parseFloat(l)} cm` : null,
            width: w ? `${parseFloat(w)} cm` : null,
            height: h ? `${parseFloat(h)} cm` : null,
          },
          pcsPerCarton: parsed.pcsPerCarton ? parseInt(parsed.pcsPerCarton) : null,
          factoryAddress: parsed.factoryAddress || "",
          portOfDischarge: parsed.portOfDischarge || "",
        },
        isActive: true,
        createdAt: serverTimestamp(),
        whatHappened: "Product Added",
        date_updated: serverTimestamp(),
      });

      await logProductEvent({
        whatHappened: "Product Added",
        productId: newDocRef.id,
        productReferenceID: referenceID,
        productClass: parsed.productClass,
        pricePoint: parsed.pricePoint,
        brandOrigin: parsed.brandOrigin,
        supplier: supplier ?? null,
        categoryTypes: [{ productUsageId: category.id, categoryTypeName: category.name }],
        productFamilies: [
          { productFamilyId: productFamily.id, productFamilyName: productFamily.name },
        ],
        mainImage: parsed.imageURL ? { url: parsed.imageURL } : null,
        dimensionalDrawing: parsed.dimensionalURL ? { url: parsed.dimensionalURL } : null,
        illuminanceDrawing: parsed.illuminanceURL ? { url: parsed.illuminanceURL } : null,
        technicalSpecifications: productSpecs.map((s) => ({
          technicalSpecificationId: s.technicalSpecificationId,
          title: s.title,
          specs: s.specs,
        })),
        referenceID: user?.ReferenceID,
        userId: userId ?? undefined,
        extra: { source: "excel_upload", filename: file?.name ?? "" },
      });

      totalInserted++;
      setUploadProgress((prev) => prev + 1);
    }

    return totalInserted;
  };

  /* ── Shared post-insert cleanup ── */

  const runInsert = async (rows: ParsedProductRow[]) => {
    setUploading(true);
    playAudio();
    try {
      const totalInserted = await insertRows(rows);
      stopAudio();

      await logProductEvent({
        whatHappened: "Product Bulk Upload",
        inserted: totalInserted,
        referenceID: user?.ReferenceID,
        userId: userId ?? undefined,
        extra: { source: "excel_upload", filename: file?.name ?? "" },
      });

      toast.success("Upload complete");
      setOpen(false);
      setFile(null);
      setUploadProgress(0);
      setTotalRows(0);
      setPendingRows([]);
    } catch (error) {
      console.error(error);
      stopAudio();
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ── Duplicate modal actions ── */

  const handleSkipDuplicates = async () => {
    setDupModalOpen(false);
    const nonDups = pendingRows.filter((r) => !duplicateRowKeys.has(rowDupKey(r)));
    await runInsert(nonDups);
  };

  const handleUploadAll = async () => {
    setDupModalOpen(false);
    await runInsert(pendingRows);
  };

  /* ── Cancel ── */

  const handleCancel = () => {
    cancelRef.current = true;
    stopAudio();
    setUploading(false);
    setDupModalOpen(false);
    setOpen(false);
    toast.message("Upload cancelled");
  };

  /* ── Main upload handler — Phase 1: parse Excel → Phase 2: dup check → modal or insert ── */

  const handleUpload = async () => {
    if (!file) return;
    cancelRef.current = false;

    try {
      setUploading(true);

      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const allParsedRows: ParsedProductRow[] = [];
      const newExcelColumnsBySheet = new Map<
        string,
        { title: string; specId: string; col: number }[]
      >();

      /* ── Phase 1: Parse all worksheets into ParsedProductRow[] ── */
      for (const ws of workbook.worksheets) {
        if (cancelRef.current) break;

        const header1Row = ws.getRow(1);
        const header2Row = ws.getRow(2);

        const excelColumns: { title: string; specId: string; col: number }[] = [];
        const commercialColMap: Record<string, number> = {
          unitCost: -1,
          length: -1,
          width: -1,
          height: -1,
          pcsPerCarton: -1,
          factoryAddress: -1,
          portOfDischarge: -1,
        };
        let dimensionalCol = -1;
        let illuminanceCol = -1;

        for (let col = 1; col <= ws.columnCount; col++) {
          const specHeader = cleanExcelValue(header1Row.getCell(col).value);
          const groupHeader = cleanExcelValue(header2Row.getCell(col).value);

          if (specHeader === "Unit Cost")          { commercialColMap.unitCost        = col; continue; }
          if (specHeader === "Length")             { commercialColMap.length          = col; continue; }
          if (specHeader === "Width")              { commercialColMap.width           = col; continue; }
          if (specHeader === "Height")             { commercialColMap.height          = col; continue; }
          if (specHeader === "pcs/carton")         { commercialColMap.pcsPerCarton    = col; continue; }
          if (specHeader === "Factory Address")    { commercialColMap.factoryAddress  = col; continue; }
          if (specHeader === "Port of Discharge")  { commercialColMap.portOfDischarge = col; continue; }
          if (specHeader === "Dimensional Drawing") { dimensionalCol               = col; continue; }
          if (specHeader === "Illuminance Level") { illuminanceCol               = col; continue; }
          if (col < 8) continue;
          if (groupHeader === "COMMERCIAL DETAILS") continue;
          if (!groupHeader || !specHeader) continue;
          excelColumns.push({ title: groupHeader, specId: specHeader, col });
        }

        newExcelColumnsBySheet.set(ws.name, excelColumns);

        const getCellVal = (row: ExcelJS.Row, colIndex: number) =>
          colIndex > 0 ? cleanExcelValue(row.getCell(colIndex).value) : "";

        let lastUsage = "";
        let lastFamily = "";
        let lastClass = "";
        let lastPricePoint = "";
        let lastBrandOrigin = "";
        let lastSupplier = "";
        let lastImage = "";

        for (let r = 4; r <= ws.actualRowCount; r++) {
          if (cancelRef.current) break;

          const row = ws.getRow(r);
          const usage        = cleanExcelValue(row.getCell(1).value) || lastUsage;
          const family       = cleanExcelValue(row.getCell(2).value) || lastFamily;
          const productClass = cleanExcelValue(row.getCell(3).value) || lastClass;
          const pricePoint   = cleanExcelValue(row.getCell(4).value) || lastPricePoint;
          const brandOrigin  = cleanExcelValue(row.getCell(5).value) || lastBrandOrigin;
          const supplierBrand = cleanExcelValue(row.getCell(6).value) || lastSupplier;

          let imageURL = extractCellURL(row.getCell(7).value) || lastImage;
          imageURL = convertDriveToThumbnail(imageURL);

          const dimensionalURL =
            dimensionalCol > 0
              ? convertDriveToThumbnail(extractCellURL(row.getCell(dimensionalCol).value))
              : "";
          const illuminanceURL =
            illuminanceCol > 0
              ? convertDriveToThumbnail(extractCellURL(row.getCell(illuminanceCol).value))
              : "";

          lastUsage = usage;
          lastFamily = family;
          lastClass = productClass;
          lastPricePoint = pricePoint;
          lastBrandOrigin = brandOrigin;
          lastSupplier = supplierBrand;
          lastImage = imageURL;

          if (!usage || !family) continue;
          if (!productClass && !pricePoint && !brandOrigin && !supplierBrand) continue;

          allParsedRows.push({
            sheetName: ws.name,
            usage,
            family,
            productClass,
            pricePoint,
            brandOrigin,
            supplierBrand,
            imageURL,
            dimensionalURL,
            illuminanceURL,
            unitCost:        getCellVal(row, commercialColMap.unitCost),
            length:          getCellVal(row, commercialColMap.length),
            width:           getCellVal(row, commercialColMap.width),
            height:          getCellVal(row, commercialColMap.height),
            pcsPerCarton:    getCellVal(row, commercialColMap.pcsPerCarton),
            factoryAddress:  getCellVal(row, commercialColMap.factoryAddress),
            portOfDischarge: getCellVal(row, commercialColMap.portOfDischarge),
            rawRow: row,
          });
        }
      }

      // Stop spinner while the user responds to the dup modal (if any)
      setUploading(false);

      /* ── Phase 2: Firestore duplicate check ── */
      const dupKeys = await checkDuplicatesInFirestore(allParsedRows);

      setPendingRows(allParsedRows);
      setExcelColumnsBySheet(newExcelColumnsBySheet);
      setDuplicateRowKeys(dupKeys);

      if (dupKeys.size > 0) {
        const dupRowsForModal: DuplicateRow[] = allParsedRows
          .filter((r) => dupKeys.has(rowDupKey(r)))
          .map((r) => ({
            key: rowDupKey(r),
            columns: [
              "Product Usage",
              "Product Family",
              "Product Class",
              "Price Point",
              "Brand Origin",
              "Supplier Brand",
            ],
            values: [
              r.usage,
              r.family,
              r.productClass,
              r.pricePoint,
              r.brandOrigin,
              r.supplierBrand,
            ],
          }));

        setDuplicateRows(dupRowsForModal);
        setDupModalOpen(true);
        // Execution continues via handleSkipDuplicates or handleUploadAll
        return;
      }

      /* No duplicates — proceed directly */
      await runInsert(allParsedRows);
    } catch (error) {
      console.error(error);
      stopAudio();
      setUploading(false);
      toast.error("Upload failed");
    }
  };

  /* ── Render ── */

  return (
    <>
      {/* ── Duplicate Check Modal (rendered outside the upload Dialog so they don't nest) ── */}
      <DuplicateCheckModal
        open={dupModalOpen}
        onOpenChange={(v) => {
          if (!v) handleCancel();
          else setDupModalOpen(v);
        }}
        title="Duplicate Products Detected"
        duplicates={duplicateRows}
        onSkipDuplicates={handleSkipDuplicates}
        onUploadAll={handleUploadAll}
        uploading={uploading}
      />

      {/* ── Upload Dialog ── */}
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
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
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
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button disabled={!file || uploading} onClick={handleUpload}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}