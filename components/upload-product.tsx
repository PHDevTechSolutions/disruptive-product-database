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
  query,
  where,
  getDocs,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { toast } from "sonner";

type Props = {};

/* ---------------- TYPES ---------------- */

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

  const findSupplier = async (company: string): Promise<Supplier | null> => {
    if (!company) return null;

    const q = query(
      collection(db, "suppliers"),
      where("company", "==", company),
      where("isActive", "==", true),
    );

    const snap = await getDocs(q);

    if (snap.empty) return null;

    return {
      supplierId: snap.docs[0].id,
      company,
    };
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

  /* ---------------- UPLOAD ---------------- */

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);

      const wb = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();

      await wb.xlsx.load(buffer);

      for (const ws of wb.worksheets) {
        const header1 = ws.getRow(1);
        const header2 = ws.getRow(2);

        /* START AT COLUMN 8 NOW */
        const specColumns: {
          title: string;
          specId: string;
          col: number;
        }[] = [];

        for (let col = 8; col <= ws.columnCount; col++) {
          specColumns.push({
            title: header2.getCell(col).value?.toString() || "",
            specId: header1.getCell(col).value?.toString() || "",
            col,
          });
        }

        for (let r = 3; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);

          const usage = row.getCell(1).value?.toString() || "";
          const family = row.getCell(2).value?.toString() || "";
          const productClass = row.getCell(3).value?.toString() || "";
          const pricePoint = row.getCell(4).value?.toString() || "";
          const brandOrigin = row.getCell(5).value?.toString() || "";
          const supplierName = row.getCell(6).value?.toString() || "";
          const imageURL = row.getCell(7).value?.toString() || "";

          const category = await findCategoryType(usage);
          if (!category) continue;

          const productFamily = await findProductFamily(category.id, family);
          if (!productFamily) continue;

          const supplier = await findSupplier(supplierName);

          const templateSpecs = await findTemplateSpecs(
            category.id,
            productFamily.id,
          );

          const productSpecs = templateSpecs.map((template) => ({
            technicalSpecificationId: template.id,
            title: template.title,
            specs: template.specs.map((spec) => {
              const match = specColumns.find(
                (s) => s.title === template.title && s.specId === spec.specId,
              );

              return {
                specId: spec.specId,
                value: match
                  ? row.getCell(match.col).value?.toString() || ""
                  : "",
              };
            }),
          }));

          const ref = await generateProductReferenceID();

          await addDoc(collection(db, "products"), {
            productReferenceID: ref,

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

            isActive: true,

            createdAt: serverTimestamp(),

            whatHappened: "Product Uploaded",

            date_updated: serverTimestamp(),
          });
        }
      }

      toast.success("Upload complete");

      setOpen(false);
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- UI ---------------- */

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
