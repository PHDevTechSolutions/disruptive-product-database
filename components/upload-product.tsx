"use client";

import * as React from "react";
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

type Props = {};

type CategoryType = {
  id: string;
  name: string;
};

type ProductFamily = {
  id: string;
  name: string;
  categoryTypeId: string;
};

type Supplier = {
  supplierId: string;
  company: string;
  supplierBrand?: string;
};

type TemplateSpec = {
  id: string;
  title: string;
  specs: {
    specId: string;
  }[];
};

const cleanExcelValue = (val: any) => {
  if (val === null || val === undefined) return "";

  if (typeof val === "number") return val.toString();

  const str = val.toString().trim();

  if (str === "-") return "";

  return str;
};

/* CTRL + F: CONVERT GOOGLE DRIVE LINK */
const convertDriveToThumbnail = (url?: string) => {
  if (!url) return "";

  if (!url.includes("drive.google.com")) return url;

  let fileId = "";

  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (match1 && match1[1]) fileId = match1[1];
  if (match2 && match2[1]) fileId = match2[1];

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return url;
};

export default function UploadProduct({}: Props) {
  const [open, setOpen] = React.useState(false);

  const [file, setFile] = React.useState<File | null>(null);

  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [totalRows, setTotalRows] = React.useState(0);

  /* ---------------- ELEVATOR MUSIC ---------------- */

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const cancelRef = React.useRef(false);

  /* ---------------- GENERATE REF ---------------- */

  const generateProductReferenceID = async () => {
    const snap = await getDocs(collection(db, "products"));

    const count = snap.size + 1;

    return `PROD-SPF-${count.toString().padStart(5, "0")}`;
  };

  /* ---------------- FIND CATEGORY ---------------- */

  const findCategoryType = async (
    name: string,
  ): Promise<CategoryType | null> => {
    const q = query(
      collection(db, "categoryTypes"),
      where("name", "==", name),
      where("isActive", "==", true),
    );

    const snap = await getDocs(q);

    /* IF EXISTS */
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as DocumentData;

      return {
        id: docSnap.id,
        name: data.name,
      };
    }

    /* AUTO CREATE CATEGORY TYPE */

    const newDoc = await addDoc(collection(db, "categoryTypes"), {
      name,
      isActive: true,
      createdAt: serverTimestamp(),
      whatHappened: "Product Usage Added (Excel Upload)",
      date_updated: serverTimestamp(),
    });

    return {
      id: newDoc.id,
      name,
    };
  };

  /* ---------------- FIND FAMILY ---------------- */

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

    /* IF EXISTS */
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as DocumentData;

      return {
        id: docSnap.id,
        name: data.name,
        categoryTypeId: data.categoryTypeId,
      };
    }

    /* AUTO CREATE PRODUCT FAMILY */

    const newDoc = await addDoc(collection(db, "productFamilies"), {
      name,
      categoryTypeId,
      isActive: true,
      createdAt: serverTimestamp(),
      whatHappened: "Product Family Added (Excel Upload)",
      date_updated: serverTimestamp(),
    });

    return {
      id: newDoc.id,
      name,
      categoryTypeId,
    };
  };

  /* ---------------- FIND SUPPLIER ---------------- */

  const findSupplier = async (brand: string): Promise<Supplier | null> => {
    if (!brand) return null;

    const q = query(
      collection(db, "suppliers"),
      where("supplierBrand", "==", brand),
      where("isActive", "==", true),
    );

    const snap = await getDocs(q);

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data();

    return {
      supplierId: doc.id,
      company: data.company,
      supplierBrand: data.supplierBrand || "",
    };
  };
  /* ---------------- AUTO CREATE TEMPLATE ---------------- */

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

    const excelGroups = [...new Set(excelColumns.map((col) => col.title))];

    for (const title of excelGroups) {
      if (!existingTitles.includes(title)) {
        const specs = excelColumns

          .filter((col) => col.title === title)

          .map((col) => ({
            specId: col.specId,
          }));

        await addDoc(collection(db, "technicalSpecifications"), {
          categoryTypeId,
          productFamilyId,
          title,
          specs,
          isActive: true,
          createdAt: serverTimestamp(),
          whatHappened: "Product Added",
          date_updated: serverTimestamp(),
        });
      }
    }
  };

  /* ---------------- FIND TEMPLATE ---------------- */

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

    return snap.docs.map((doc) => {
      const data = doc.data() as DocumentData;

      return {
        id: doc.id,
        title: data.title,
        specs: data.specs || [],
      };
    });
  };

  /* ---------------- SYNC EXISTING PRODUCTS ---------------- */

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

    const templates = templateSnap.docs.map((doc) => ({
      id: doc.id,
      title: doc.data().title,
      specs: doc.data().specs || [],
    }));

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
        const existingGroup = existingSpecs.find(
          (g: any) => g.title === template.title,
        );

        return {
          technicalSpecificationId: template.id,

          title: template.title,

          specs: template.specs.map((spec: any) => {
            const existingRow = existingGroup?.specs?.find(
              (r: any) => r.specId === spec.specId,
            );

            return {
              specId: spec.specId,

              value: existingRow?.value || "",
            };
          }),
        };
      });

      await updateDoc(productDoc.ref, {
        technicalSpecifications: mergedSpecs,

        updatedAt: serverTimestamp(),
      });
    }
  };

  /* ---------------- UPLOAD ---------------- */

  /* ---------------- UPLOAD ---------------- */

  const handleUpload = async () => {
    if (!file) return;
    cancelRef.current = false;

    try {
      // START MUSIC IMMEDIATELY
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

      let total = 0;

      /* ---------------- COUNT VALID ROWS FIRST ---------------- */

      let validRows = 0;

      for (const ws of workbook.worksheets) {
        if (cancelRef.current) {
          toast.message("Upload cancelled");
          break;
        }
        let lastUsage = "";
        let lastFamily = "";

        for (let r = 4; r <= ws.actualRowCount; r++) {
          if (cancelRef.current) break;
          const row = ws.getRow(r);

          const usage = cleanExcelValue(row.getCell(1).value) || lastUsage;
          const family = cleanExcelValue(row.getCell(2).value) || lastFamily;

          lastUsage = usage;
          lastFamily = family;

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

      for (const ws of workbook.worksheets) {
        if (cancelRef.current) {
          toast.message("Upload cancelled");
          break;
        }
        const header1 = ws.getRow(1); // SPECID (actual header)
        const header2 = ws.getRow(2); // GROUP TITLE
        const header3 = ws.getRow(3); // SUBGROUP (Packaging Details etc)

        const excelColumns: {
          title: string;
          specId: string;
          col: number;
        }[] = [];

        /* ---------------- COMMERCIAL DETAILS COLUMNS ---------------- */

        for (let col = 8; col <= ws.columnCount; col++) {
          const specId = cleanExcelValue(header1.getCell(col).value);
          const groupTitle = cleanExcelValue(header2.getCell(col).value);
          const subGroup = cleanExcelValue(header3.getCell(col).value);

          const isCommercialColumn =
            groupTitle === "COMMERCIAL DETAILS" ||
            subGroup === "Packaging Details (cm)" ||
            specId === "Unit Cost" ||
            specId === "Length" ||
            specId === "Width" ||
            specId === "Height" ||
            specId === "pcs/carton" ||
            specId === "Factory Address" ||
            specId === "Port of Discharge";

          // Skip commercial columns so they don't go to technicalSpecifications
          if (isCommercialColumn) continue;

          if (!groupTitle || !specId) continue;

          excelColumns.push({
            title: groupTitle,
            specId,
            col,
          });
        }
        /* IMPORTANT: TRACK SYNCED FAMILIES */

        const syncedFamilies = new Set<string>();

        let lastUsage = "";
        let lastFamily = "";
        let lastClass = "";
        let lastPricePoint = "";
        let lastBrandOrigin = "";
        let lastSupplier = "";
        let lastImage = "";

        for (let r = 4; r <= ws.actualRowCount; r++) {
          if (cancelRef.current) {
            toast.message("Upload cancelled");
            break;
          }
          const row = ws.getRow(r);

          let usage = cleanExcelValue(row.getCell(1).value) || lastUsage;
          let family = cleanExcelValue(row.getCell(2).value) || lastFamily;

          let productClass = cleanExcelValue(row.getCell(3).value) || lastClass;
          let pricePoint =
            cleanExcelValue(row.getCell(4).value) || lastPricePoint;
          let brandOrigin =
            cleanExcelValue(row.getCell(5).value) || lastBrandOrigin;

          let supplierBrand =
            cleanExcelValue(row.getCell(6).value) || lastSupplier;
          /* CTRL + F: FIX IMAGE OBJECT FROM EXCEL */

          let imageCell: any = row.getCell(7).value;

          let imageURL = "";

          /* Excel sometimes stores links as objects */
          if (typeof imageCell === "object" && imageCell !== null) {
            if (imageCell.text) {
              imageURL = imageCell.text;
            } else if (imageCell.hyperlink) {
              imageURL = imageCell.hyperlink;
            } else {
              imageURL = String(imageCell);
            }
          } else {
            imageURL = cleanExcelValue(imageCell);
          }

          imageURL = imageURL || lastImage;

          /* CTRL + F: FIX GOOGLE DRIVE IMAGE */
          imageURL = convertDriveToThumbnail(imageURL);
          let unitCost = "";
          let length = "";
          let width = "";
          let height = "";
          let pcsPerCarton = "";
          let factoryAddress = "";
          let portOfDischarge = "";

          for (let col = 1; col <= ws.columnCount; col++) {
            const header1 = cleanExcelValue(ws.getRow(1).getCell(col).value);
            const header2 = cleanExcelValue(ws.getRow(2).getCell(col).value);
            const header3 = cleanExcelValue(ws.getRow(3).getCell(col).value);

const header =
  header1?.toString().trim() ||
  header2?.toString().trim() ||
  header3?.toString().trim() ||
  "";

/* CTRL + F: COMMERCIAL DETAILS PARSER */

if (header1 === "Unit Cost")
  unitCost = cleanExcelValue(row.getCell(col).value);

if (header1 === "Length")
  length = cleanExcelValue(row.getCell(col).value);

if (header1 === "Width")
  width = cleanExcelValue(row.getCell(col).value);

if (header1 === "Height")
  height = cleanExcelValue(row.getCell(col).value);

if (header1 === "pcs/carton")
  pcsPerCarton = cleanExcelValue(row.getCell(col).value);

if (header1 === "Factory Address")
  factoryAddress = cleanExcelValue(row.getCell(col).value);

if (header1 === "Port of Discharge")
  portOfDischarge = cleanExcelValue(row.getCell(col).value);
          }

          /* SAVE LAST VALUES */

          lastUsage = usage;
          lastFamily = family;
          lastClass = productClass;
          lastPricePoint = pricePoint;
          lastBrandOrigin = brandOrigin;
          lastSupplier = supplierBrand;
          lastImage = imageURL;

          if (!usage || !family) continue;

          if (!productClass && !pricePoint && !brandOrigin && !supplierBrand)
            continue;

          const category = await findCategoryType(usage);
          if (!category) continue;

          const productFamily = await findProductFamily(category.id, family);
          if (!productFamily) continue;

          const supplier = await findSupplier(supplierBrand);

          /* UNIQUE SYNC KEY */

          const syncKey = category.id + "_" + productFamily.id;

          /* CREATE TEMPLATE + SYNC ONLY ONCE */

          if (!syncedFamilies.has(syncKey)) {
            if (cancelRef.current) break;
            await createMissingTemplateSpecs(
              category.id,
              productFamily.id,
              excelColumns,
            );
            if (cancelRef.current) break;

            await syncExistingProductsToTemplate(category.id, productFamily.id);

            syncedFamilies.add(syncKey);
          }

          /* GET UPDATED TEMPLATE */

          const templateSpecs = await findTemplateSpecs(
            category.id,
            productFamily.id,
          );

          /* BUILD PRODUCT SPECS */
          const productSpecs = templateSpecs.map((template) => {
            return {
              technicalSpecificationId: template.id,

              title: template.title,

              specs: template.specs.map((templateSpec) => {
                const excelMatch = excelColumns.find(
                  (col) =>
                    col.title === template.title &&
                    col.specId === templateSpec.specId,
                );

                const cellValue = excelMatch
                  ? cleanExcelValue(row.getCell(excelMatch.col).value)
                  : "";

                return {
                  specId: templateSpec.specId,
                  value: cellValue,
                };
              }),
            };
          });

          const referenceID = await generateProductReferenceID();

          if (cancelRef.current) break;
          await addDoc(collection(db, "products"), {
            productReferenceID: referenceID,

            productClass,
            pricePoint,
            brandOrigin,

            supplier,

            mainImage: imageURL ? { url: imageURL } : null,

            categoryTypes: [
              {
                productUsageId: category.id,
                categoryTypeName: category.name,
              },
            ],

            productFamilies: [
              {
                productFamilyId: productFamily.id,
                productFamilyName: productFamily.name,
                productUsageId: category.id,
              },
            ],

            technicalSpecifications: productSpecs,

            commercialDetails: {
              unitCost: unitCost ? parseFloat(unitCost) : null,

              packaging: {
                length: length ? parseFloat(length) : null,
                width: width ? parseFloat(width) : null,
                height: height ? parseFloat(height) : null,
              },

              pcsPerCarton: pcsPerCarton ? parseInt(pcsPerCarton) : null,

              factoryAddress: factoryAddress || "",

              portOfDischarge: portOfDischarge || "",
            },

            isActive: true,

            createdAt: serverTimestamp(),

            whatHappened: "Product Added",

            date_updated: serverTimestamp(),
          });

          /* COUNT ONLY SUCCESSFUL UPLOAD */
          setUploadProgress((prev) => prev + 1);
        }
      }

      audioRef.current?.pause();
      audioRef.current!.currentTime = 0;
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
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
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
            if (droppedFile) {
              setFile(droppedFile);
            }
          }}
          onClick={() =>
            document.getElementById("product-upload-input")?.click()
          }
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-gray-500" />

            <p className="text-sm text-gray-600">
              Drag & Drop your Excel file here
            </p>

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
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
