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

import JSZip from "jszip";
import ExcelJS from "exceljs";

import { db } from "@/lib/firebase";

import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";

import { toast } from "sonner";

export default function UploadProductModal() {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  /* ================= FIND HELPERS ================= */

  const findSupplier = async (company: string) => {
    const snap = await getDocs(
      query(collection(db, "suppliers"), where("company", "==", company)),
    );

    if (snap.empty) return null;

    return {
      supplierId: snap.docs[0].id,
      company,
    };
  };

  const findSisterCompany = async (name: string) => {
    const snap = await getDocs(
      query(collection(db, "sisterCompanies"), where("name", "==", name)),
    );

    if (snap.empty) return null;

    return {
      sisterCompanyId: snap.docs[0].id,
      sisterCompanyName: name,
    };
  };

  const findClassification = async (name: string) => {
    const snap = await getDocs(
      query(collection(db, "classificationTypes"), where("name", "==", name)),
    );

    if (snap.empty) return null;

    return {
      classificationId: snap.docs[0].id,
      classificationName: name,
    };
  };

  const findCategoryType = async (classificationId: string, name: string) => {
    const snap = await getDocs(
      query(
        collection(
          db,
          "classificationTypes",
          classificationId,
          "categoryTypes",
        ),
        where("name", "==", name),
      ),
    );

    if (snap.empty) return null;

    return {
      categoryTypeId: snap.docs[0].id,
      categoryTypeName: name,
    };
  };

  const findProductType = async (
    classificationId: string,
    categoryTypeId: string,
    name: string,
  ) => {
    const snap = await getDocs(
      query(
        collection(
          db,
          "classificationTypes",
          classificationId,
          "categoryTypes",
          categoryTypeId,
          "productTypes",
        ),
        where("name", "==", name),
      ),
    );

    if (snap.empty) return null;

    return {
      productTypeId: snap.docs[0].id,
      productTypeName: name,
      categoryTypeId,
    };
  };

  /* ================= MAIN UPLOAD ================= */

  const generateProductReferenceID = async () => {

  const snap = await getDocs(collection(db, "products"));

  if (snap.empty) {
    return "PROD-SPF-00001";
  }

  let max = 0;

  snap.forEach(doc => {

    const ref = doc.data().productReferenceID;

    if (!ref) return;

    const num = parseInt(ref.replace("PROD-SPF-", ""));

    if (num > max) max = num;

  });

  const next = max + 1;

  return `PROD-SPF-${next.toString().padStart(5, "0")}`;

};

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select ZIP file");

      return;
    }

    try {
      setUploading(true);

      const zip = await JSZip.loadAsync(file);

      let totalUploaded = 0;

      for (const path in zip.files) {
        if (!path.endsWith(".xlsx")) continue;

        const buffer = await zip.files[path].async("arraybuffer");

        const workbook = new ExcelJS.Workbook();

        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];

        if (!worksheet) continue;

        /* ===== FOLDER STRUCTURE ===== */

        const parts = path.split("/");

        const sisterCompanyName = parts[0];

        const classificationName = parts[1];

        const categoryTypeName = parts[2];

        const productTypeName = parts[3];

        /* ===== FIND IDS ===== */

        const supplierFinderCache: any = {};

        const sister = await findSisterCompany(sisterCompanyName);

        const classification = await findClassification(classificationName);

        if (!classification) {
          toast.error(`Classification not found: ${classificationName}`);

          continue;
        }

        const category = await findCategoryType(
          classification.classificationId,
          categoryTypeName,
        );

        if (!category) {
          toast.error(`Category not found: ${categoryTypeName}`);

          continue;
        }

        const productType = await findProductType(
          classification.classificationId,
          category.categoryTypeId,
          productTypeName,
        );

        /* ===== HEADERS ===== */

        const headerRow1 = worksheet.getRow(1);

        const headerRow2 = worksheet.getRow(2);

        const headers: string[] = [];

        headerRow2.eachCell((cell, col) => {
          const group = headerRow1.getCell(col).value?.toString() || "";

          const field = cell.value?.toString() || "";

          if (group === "Pricing / Logistics") headers.push(field);
          else if (group === "Gallery URLs") headers.push(`Gallery`);
          else if (
            group === "Model No." ||
            group === "Supplier Company" ||
            group === "Main Image URL"
          )
            headers.push(group);
          else headers.push(`${group}:${field}`);
        });

        /* ===== DATA ROWS ===== */

        for (let i = 3; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);

          if (!row.getCell(1).value) continue;

          const productName = row.getCell(1).value?.toString() || "";

          const supplierCompany = row.getCell(2).value?.toString() || "";

          const mainImageUrl = row.getCell(3).value?.toString() || "";

          const supplier = await findSupplier(supplierCompany);

          /* ===== GALLERY ===== */

          const gallery: any[] = [];

          headers.forEach((h, index) => {
            if (!h.startsWith("Gallery")) return;

            const url = row.getCell(index + 1).value?.toString();

            if (url) {
              gallery.push({
                url,

                type: "image",

                name: "uploaded",

                publicId: "",
              });
            }
          });

          /* ===== LOGISTICS ===== */

          const logistics: any = {
            calculationType: "LIGHTS",

            unitCost: Number(
              row.getCell(headers.indexOf("Unit Cost") + 1).value || 0,
            ),

            landedCost: Number(
              row.getCell(headers.indexOf("Landed Cost") + 1).value || 0,
            ),

            srp: Number(row.getCell(headers.indexOf("SRP") + 1).value || 0),

            moq: Number(row.getCell(headers.indexOf("MOQ") + 1).value || 0),

            useArrayInput: false,

            multiDimensions: null,

            packaging: null,

            qtyPerContainer: null,

            category: "To Be Evaluated",

            warranty: {
              value: 0,

              unit: "Years",
            },
          };

          /* ===== TECH SPECS ===== */

          const specMap: Record<string, any[]> = {};

          headers.forEach((h, index) => {
            if (!h.includes(":")) return;

            const [title, specId] = h.split(":");

            const value = row.getCell(index + 1).value?.toString();

            if (!value) return;

            if (!specMap[title]) specMap[title] = [];

            specMap[title].push({
              specId,

              value,
            });
          });

          const technicalSpecifications = Object.keys(specMap).map((title) => ({
            technicalSpecificationId: "",

            title,

            specs: specMap[title],
          }));

          /* ===== SAVE ===== */

          await addDoc(collection(db, "products"), {
            productReferenceID: await generateProductReferenceID(),
            
            productName,

            sisterCompanyId: sister?.sisterCompanyId || "",

            sisterCompanyName,

            classificationId: classification.classificationId,

            classificationName,

            supplier,

            categoryTypes: [category],

            productTypes: [productType],

            mainImage: {
              url: mainImageUrl,
            },

            gallery,

            technicalSpecifications,

            logistics,

            mediaStatus: "done",

            isActive: true,

            createdAt: serverTimestamp(),
          });

          totalUploaded++;
        }
      }

      toast.success(`Uploaded ${totalUploaded} products`);

      setOpen(false);

      setFile(null);
    } catch (err) {
      console.error(err);

      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Upload Products</DialogTitle>
        </DialogHeader>

        <input
          type="file"
          accept=".zip"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
