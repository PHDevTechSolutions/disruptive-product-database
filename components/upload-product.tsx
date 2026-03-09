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

export default function UploadProduct({}: Props) {
  const [open, setOpen] = React.useState(false);

  const [file, setFile] = React.useState<File | null>(null);

  const [uploading, setUploading] = React.useState(false);

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

    if (snap.empty) return null;

    const doc = snap.docs[0];

    const data = doc.data() as DocumentData;

    return {
      id: doc.id,
      name: data.name,
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

    if (snap.empty) return null;

    const doc = snap.docs[0];

    const data = doc.data() as DocumentData;

    return {
      id: doc.id,
      name: data.name,
      categoryTypeId: data.categoryTypeId,
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

    try {
      setUploading(true);

      const workbook = new ExcelJS.Workbook();

      const buffer = await file.arrayBuffer();

      await workbook.xlsx.load(buffer);

      for (const ws of workbook.worksheets) {
        const header1 = ws.getRow(1);
        const header2 = ws.getRow(2);

        const excelColumns: {
          title: string;
          specId: string;
          col: number;
        }[] = [];

        /* ---------------- COMMERCIAL DETAILS COLUMNS ---------------- */

        const commercialColumns = [
          "Unit Cost",
          "Length",
          "Width",
          "Height",
          "pcs/carton",
          "Factory Address",
          "Port of Discharge",
        ];

for (let col = 8; col <= ws.columnCount; col++) {

  const groupTitle = header2.getCell(col).value?.toString() || "";
  const specId = header1.getCell(col).value?.toString() || "";

  /* NEVER include COMMERCIAL DETAILS in technical specs */
  if (groupTitle === "COMMERCIAL DETAILS") continue;

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

        for (let r = 3; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);

          let usage = row.getCell(1).value?.toString() || lastUsage;
          let family = row.getCell(2).value?.toString() || lastFamily;

          let productClass = row.getCell(3).value?.toString() || lastClass;
          let pricePoint = row.getCell(4).value?.toString() || lastPricePoint;
          let brandOrigin = row.getCell(5).value?.toString() || lastBrandOrigin;

          let supplierBrand = row.getCell(6).value?.toString() || lastSupplier;
          let imageURL = row.getCell(7).value?.toString() || lastImage;

          const unitCost =
            row.getCell(ws.columnCount - 6).value?.toString() || "";
          const length =
            row.getCell(ws.columnCount - 5).value?.toString() || "";
          const width = row.getCell(ws.columnCount - 4).value?.toString() || "";
          const height =
            row.getCell(ws.columnCount - 3).value?.toString() || "";
          const pcsPerCarton =
            row.getCell(ws.columnCount - 2).value?.toString() || "";
          const factoryAddress =
            row.getCell(ws.columnCount - 1).value?.toString() || "";
          const portOfDischarge =
            row.getCell(ws.columnCount).value?.toString() || "";

          /* SAVE LAST VALUES */

          lastUsage = usage;
          lastFamily = family;
          lastClass = productClass;
          lastPricePoint = pricePoint;
          lastBrandOrigin = brandOrigin;
          lastSupplier = supplierBrand;
          lastImage = imageURL;

          if (!usage || !family) continue;

          const category = await findCategoryType(usage);
          if (!category) continue;

          const productFamily = await findProductFamily(category.id, family);
          if (!productFamily) continue;

          const supplier = await findSupplier(supplierBrand);

          /* UNIQUE SYNC KEY */

          const syncKey = category.id + "_" + productFamily.id;

          /* CREATE TEMPLATE + SYNC ONLY ONCE */

          if (!syncedFamilies.has(syncKey)) {
            await createMissingTemplateSpecs(
              category.id,
              productFamily.id,
              excelColumns,
            );

            await syncExistingProductsToTemplate(category.id, productFamily.id);

            syncedFamilies.add(syncKey);
          }

          /* GET UPDATED TEMPLATE */

          const templateSpecs = await findTemplateSpecs(
            category.id,
            productFamily.id,
          );

          /* BUILD PRODUCT SPECS */

          const productSpecs = templateSpecs.map((template) => ({
            technicalSpecificationId: template.id,

            title: template.title,

            specs: template.specs.map((templateSpec) => {
              const excelMatch = excelColumns.find(
                (col) =>
                  col.title === template.title &&
                  col.specId === templateSpec.specId,
              );

              return {
                specId: templateSpec.specId,

                value: excelMatch
                  ? row.getCell(excelMatch.col).value?.toString() || ""
                  : "",
              };
            }),
          }));

          const referenceID = await generateProductReferenceID();

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
              unitCost,

              packaging: {
                length,
                width,
                height,
              },

              pcsPerCarton,

              factoryAddress,

              portOfDischarge,
            },

            isActive: true,

            createdAt: serverTimestamp(),

            whatHappened: "Product Added",

            date_updated: serverTimestamp(),
          });
        }
      }

      toast.success("Upload complete");

      setOpen(false);

      setFile(null);
    } catch (error) {
      console.error(error);

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

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
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
