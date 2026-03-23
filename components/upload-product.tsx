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
import { logProductEvent, logProductUsageEvent, logProductFamilyEvent } from "@/lib/auditlogger"; // ✅ AUDIT

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

export default function UploadProduct({ iconOnly = false }: Props) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [totalRows, setTotalRows] = React.useState(0);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const cancelRef = React.useRef(false);

  /* ── Fetch user details for audit log ── */
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setUser({
        Firstname  : d.Firstname   ?? "",
        Lastname   : d.Lastname    ?? "",
        ReferenceID: d.ReferenceID ?? "",
      }))
      .catch(console.error);
  }, [userId]);

  const generateProductReferenceID = async () => {
    const snap = await getDocs(collection(db, "products"));
    const count = snap.size + 1;
    return `PROD-SPF-${count.toString().padStart(5, "0")}`;
  };

  const findCategoryType = async (name: string): Promise<CategoryType | null> => {
    const q = query(collection(db, "categoryTypes"), where("name", "==", name), where("isActive", "==", true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as DocumentData;
      return { id: docSnap.id, name: data.name };
    }
    const newDoc = await addDoc(collection(db, "categoryTypes"), {
      name, isActive: true, createdAt: serverTimestamp(),
      whatHappened: "Product Usage Added (Excel Upload)", date_updated: serverTimestamp(),
    });
    // ✅ AUDIT — new product usage created during upload
    await logProductUsageEvent({
      whatHappened    : "Product Usage Added",
      productUsageId  : newDoc.id,
      productUsageName: name,
      referenceID     : user?.ReferenceID,
      userId          : userId ?? undefined,
      extra           : { source: "excel_upload" },
    });
    return { id: newDoc.id, name };
  };

  const findProductFamily = async (categoryTypeId: string, name: string): Promise<ProductFamily | null> => {
    const q = query(collection(db, "productFamilies"), where("categoryTypeId", "==", categoryTypeId), where("name", "==", name), where("isActive", "==", true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as DocumentData;
      return { id: docSnap.id, name: data.name, categoryTypeId: data.categoryTypeId };
    }
    const newDoc = await addDoc(collection(db, "productFamilies"), {
      name, categoryTypeId, isActive: true, createdAt: serverTimestamp(),
      whatHappened: "Product Family Added (Excel Upload)", date_updated: serverTimestamp(),
    });
    // ✅ AUDIT — new product family created during upload
    await logProductFamilyEvent({
      whatHappened     : "Product Family Added",
      productFamilyId  : newDoc.id,
      productFamilyName: name,
      productUsageId   : categoryTypeId,
      referenceID      : user?.ReferenceID,
      userId           : userId ?? undefined,
      extra            : { source: "excel_upload" },
    });
    return { id: newDoc.id, name, categoryTypeId };
  };

  const findSupplier = async (brand: string): Promise<Supplier | null> => {
    if (!brand) return null;
    const q = query(collection(db, "suppliers"), where("supplierBrand", "==", brand), where("isActive", "==", true));
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
    const templateSnap = await getDocs(query(collection(db, "technicalSpecifications"), where("categoryTypeId", "==", categoryTypeId), where("productFamilyId", "==", productFamilyId), where("isActive", "==", true)));
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
          categoryTypeId, productFamilyId, title, specs, sortOrder, isActive: true,
          createdAt: serverTimestamp(), whatHappened: "Product Added", date_updated: serverTimestamp(),
        });
      } else {
        const existingDoc = templateSnap.docs.find((doc) => doc.data().title === title);
        if (existingDoc) await updateDoc(existingDoc.ref, { sortOrder, date_updated: serverTimestamp() });
      }
    }
  };

  const findTemplateSpecs = async (categoryTypeId: string, productFamilyId: string): Promise<TemplateSpec[]> => {
    const q = query(collection(db, "technicalSpecifications"), where("categoryTypeId", "==", categoryTypeId), where("productFamilyId", "==", productFamilyId), where("isActive", "==", true));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const data = doc.data() as DocumentData;
      return { id: doc.id, title: data.title, specs: data.specs || [], sortOrder: data.sortOrder ?? 999 };
    }).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  };

  const syncExistingProductsToTemplate = async (categoryTypeId: string, productFamilyId: string) => {
    const templateSnap = await getDocs(query(collection(db, "technicalSpecifications"), where("categoryTypeId", "==", categoryTypeId), where("productFamilyId", "==", productFamilyId), where("isActive", "==", true)));
    const templates = templateSnap.docs.map((doc) => ({ id: doc.id, title: doc.data().title, specs: doc.data().specs || [], sortOrder: doc.data().sortOrder ?? 999 })).sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    const productSnap = await getDocs(collection(db, "products"));
    for (const productDoc of productSnap.docs) {
      const data = productDoc.data();
      const family = data.productFamilies?.[0];
      if (!family) continue;
      if (family.productFamilyId !== productFamilyId || family.productUsageId !== categoryTypeId) continue;
      const existingSpecs = data.technicalSpecifications || [];
      const mergedSpecs = templates.map((template) => {
        const existingGroup = existingSpecs.find((g: any) => g.title === template.title);
        return {
          technicalSpecificationId: template.id, title: template.title,
          specs: template.specs.map((spec: any) => {
            const existingRow = existingGroup?.specs?.find((r: any) => r.specId === spec.specId);
            return { specId: spec.specId, value: existingRow?.value || "" };
          }),
        };
      });
      await updateDoc(productDoc.ref, { technicalSpecifications: mergedSpecs, updatedAt: serverTimestamp() });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
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

      setUploading(true);
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      let validRows = 0;
      for (const ws of workbook.worksheets) {
        if (cancelRef.current) { toast.message("Upload cancelled"); break; }
        let lastUsage = ""; let lastFamily = "";
        for (let r = 4; r <= ws.actualRowCount; r++) {
          if (cancelRef.current) break;
          const row = ws.getRow(r);
          const usage = cleanExcelValue(row.getCell(1).value) || lastUsage;
          const family = cleanExcelValue(row.getCell(2).value) || lastFamily;
          lastUsage = usage; lastFamily = family;
          if (!usage || !family) continue;
          const category = await findCategoryType(usage);
          if (!category) continue;
          const productFamily = await findProductFamily(category.id, family);
          if (!productFamily) continue;
          validRows++;
        }
      }

      setTotalRows(validRows);
      setUploadProgress(0);

      let totalInserted = 0;

      for (const ws of workbook.worksheets) {
        if (cancelRef.current) { toast.message("Upload cancelled"); break; }

        const header1Row = ws.getRow(1);
        const header2Row = ws.getRow(2);
        const header3Row = ws.getRow(3);

        const excelColumns: { title: string; specId: string; col: number }[] = [];
        const commercialColMap: Record<string, number> = {
          unitCost: -1, length: -1, width: -1, height: -1,
          pcsPerCarton: -1, factoryAddress: -1, portOfDischarge: -1,
        };

        for (let col = 1; col <= ws.columnCount; col++) {
          const specHeader = cleanExcelValue(header1Row.getCell(col).value);
          const groupHeader = cleanExcelValue(header2Row.getCell(col).value);
          const commercialHeader = cleanExcelValue(header3Row.getCell(col).value);

          if (commercialHeader === "Unit Cost") { commercialColMap.unitCost = col; continue; }
          if (commercialHeader === "Length") { commercialColMap.length = col; continue; }
          if (commercialHeader === "Width") { commercialColMap.width = col; continue; }
          if (commercialHeader === "Height") { commercialColMap.height = col; continue; }
          if (commercialHeader === "pcs/carton") { commercialColMap.pcsPerCarton = col; continue; }
          if (commercialHeader === "Factory Address") { commercialColMap.factoryAddress = col; continue; }
          if (commercialHeader === "Port of Discharge") { commercialColMap.portOfDischarge = col; continue; }
          if (col < 10) continue;
          if (groupHeader === "COMMERCIAL DETAILS") continue;
          if (!groupHeader || !specHeader) continue;
          excelColumns.push({ title: groupHeader, specId: specHeader, col });
        }

        const syncedFamilies = new Set<string>();
        let lastUsage = ""; let lastFamily = ""; let lastClass = ""; let lastPricePoint = "";
        let lastBrandOrigin = ""; let lastSupplier = ""; let lastImage = "";

        for (let r = 4; r <= ws.actualRowCount; r++) {
          if (cancelRef.current) { toast.message("Upload cancelled"); break; }

          const row = ws.getRow(r);
          let usage = cleanExcelValue(row.getCell(1).value) || lastUsage;
          let family = cleanExcelValue(row.getCell(2).value) || lastFamily;
          let productClass = cleanExcelValue(row.getCell(3).value) || lastClass;
          let pricePoint = cleanExcelValue(row.getCell(4).value) || lastPricePoint;
          let brandOrigin = cleanExcelValue(row.getCell(5).value) || lastBrandOrigin;
          let supplierBrand = cleanExcelValue(row.getCell(6).value) || lastSupplier;

          let imageCell: any = row.getCell(7).value;
          let dimensionalCell: any = row.getCell(8).value;
          let dimensionalURL = "";
          if (typeof dimensionalCell === "object" && dimensionalCell !== null) {
            if (dimensionalCell.text) dimensionalURL = dimensionalCell.text;
            else if (dimensionalCell.hyperlink) dimensionalURL = dimensionalCell.hyperlink;
            else dimensionalURL = String(dimensionalCell);
          } else { dimensionalURL = cleanExcelValue(dimensionalCell); }
          dimensionalURL = convertDriveToThumbnail(dimensionalURL);

          let illuminanceCell: any = row.getCell(9).value;
          let illuminanceURL = "";
          if (typeof illuminanceCell === "object" && illuminanceCell !== null) {
            if (illuminanceCell.text) illuminanceURL = illuminanceCell.text;
            else if (illuminanceCell.hyperlink) illuminanceURL = illuminanceCell.hyperlink;
            else illuminanceURL = String(illuminanceCell);
          } else { illuminanceURL = cleanExcelValue(illuminanceCell); }
          illuminanceURL = convertDriveToThumbnail(illuminanceURL);

          let imageURL = "";
          if (typeof imageCell === "object" && imageCell !== null) {
            if (imageCell.text) imageURL = imageCell.text;
            else if (imageCell.hyperlink) imageURL = imageCell.hyperlink;
            else imageURL = String(imageCell);
          } else { imageURL = cleanExcelValue(imageCell); }
          imageURL = imageURL || lastImage;
          imageURL = convertDriveToThumbnail(imageURL);

          const getCellVal = (colIndex: number) => colIndex > 0 ? cleanExcelValue(row.getCell(colIndex).value) : "";
          const cleanCM = (val: string) => { if (!val) return ""; return val.replace(/[^0-9.]/g, ""); };

          const unitCost = getCellVal(commercialColMap.unitCost);
          const length = cleanCM(getCellVal(commercialColMap.length));
          const width = cleanCM(getCellVal(commercialColMap.width));
          const height = cleanCM(getCellVal(commercialColMap.height));
          const pcsPerCarton = getCellVal(commercialColMap.pcsPerCarton);
          const factoryAddress = getCellVal(commercialColMap.factoryAddress);
          const portOfDischarge = getCellVal(commercialColMap.portOfDischarge);

          lastUsage = usage; lastFamily = family; lastClass = productClass;
          lastPricePoint = pricePoint; lastBrandOrigin = brandOrigin;
          lastSupplier = supplierBrand; lastImage = imageURL;

          if (!usage || !family) continue;
          if (!productClass && !pricePoint && !brandOrigin && !supplierBrand) continue;

          const category = await findCategoryType(usage);
          if (!category) continue;
          const productFamily = await findProductFamily(category.id, family);
          if (!productFamily) continue;
          const supplier = await findSupplier(supplierBrand);

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
              const excelMatch = excelColumns.find((col) => col.title === template.title && col.specId === templateSpec.specId);
              const cellValue = excelMatch ? cleanExcelValue(row.getCell(excelMatch.col).value) : "";
              return { specId: templateSpec.specId, value: cellValue };
            }),
          }));

          const referenceID = await generateProductReferenceID();
          if (cancelRef.current) break;

          const newDocRef = await addDoc(collection(db, "products"), {
            productReferenceID: referenceID,
            productClass, pricePoint, brandOrigin, supplier,
            mainImage         : imageURL ? { url: imageURL } : null,
            dimensionalDrawing: dimensionalURL ? { url: dimensionalURL } : null,
            illuminanceDrawing: illuminanceURL ? { url: illuminanceURL } : null,
            categoryTypes     : [{ productUsageId: category.id, categoryTypeName: category.name }],
            productFamilies   : [{ productFamilyId: productFamily.id, productFamilyName: productFamily.name, productUsageId: category.id }],
            technicalSpecifications: productSpecs,
            commercialDetails : {
              unitCost      : unitCost ? parseFloat(unitCost) : null,
              packaging     : {
                length : length ? `${parseFloat(length)} cm` : null,
                width  : width ? `${parseFloat(width)} cm` : null,
                height : height ? `${parseFloat(height)} cm` : null,
              },
              pcsPerCarton  : pcsPerCarton ? parseInt(pcsPerCarton) : null,
              factoryAddress: factoryAddress || "",
              portOfDischarge: portOfDischarge || "",
            },
            isActive    : true,
            createdAt   : serverTimestamp(),
            whatHappened: "Product Added",
            date_updated: serverTimestamp(),
          });

          // ✅ AUDIT — per product, real-time with referenceID
          await logProductEvent({
            whatHappened      : "Product Added",
            productId         : newDocRef.id,
            productReferenceID: referenceID,
            productClass,
            pricePoint,
            brandOrigin,
            supplier          : supplier ?? null,
            categoryTypes     : [{ productUsageId: category.id, categoryTypeName: category.name }],
            productFamilies   : [{ productFamilyId: productFamily.id, productFamilyName: productFamily.name }],
            referenceID       : user?.ReferenceID,   // ✅ who did it
            userId            : userId ?? undefined,
            extra             : { source: "excel_upload", filename: file?.name ?? "" },
          });

          totalInserted++;
          setUploadProgress((prev) => prev + 1);
        }
      }

      audioRef.current?.pause();
      audioRef.current!.currentTime = 0;

      // ✅ AUDIT — bulk summary with referenceID
      await logProductEvent({
        whatHappened: "Product Bulk Upload",
        inserted    : totalInserted,
        referenceID : user?.ReferenceID,   // ✅ who did it
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

  return (
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
          onDrop={(e) => { e.preventDefault(); const droppedFile = e.dataTransfer.files?.[0]; if (droppedFile) setFile(droppedFile); }}
          onClick={() => document.getElementById("product-upload-input")?.click()}
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-gray-500" />
            <p className="text-sm text-gray-600">Drag & Drop your Excel file here</p>
            <p className="text-xs text-gray-400">or click to browse</p>
            {file && !uploading && <p className="text-sm font-medium text-green-600">{file.name}</p>}
            {uploading && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <p className="text-sm font-medium">Uploading products...</p>
                <p className="text-xs text-gray-500">{uploadProgress} out of {totalRows}</p>
              </div>
            )}
          </div>
          <input id="product-upload-input" type="file" accept=".xlsx" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => {
            cancelRef.current = true;
            if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
            setUploading(false);
            setOpen(false);
            toast.message("Upload cancelled");
          }}>
            Cancel
          </Button>
          <Button disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
