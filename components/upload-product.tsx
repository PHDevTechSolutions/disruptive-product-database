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
import { useUser } from "@/contexts/UserContext";

export default function UploadProductModal() {
  const { userId } = useUser();
  const [userReferenceID, setUserReferenceID] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    if (!userId) return;

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        setUserReferenceID(data.ReferenceID || "");
      });
  }, [userId]);
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

  /* ================= CHECK DUPLICATE PRODUCT ================= */

  const isDuplicateProduct = async (
    productName: string,
    supplierCompany: string,
  ) => {
    const snap = await getDocs(
      query(
        collection(db, "products"),
        where("productName", "==", productName),
        where("supplier.company", "==", supplierCompany),
      ),
    );

    return !snap.empty;
  };
  /* ================= MAIN UPLOAD ================= */

  const generateProductReferenceID = async () => {
    const snap = await getDocs(collection(db, "products"));

    if (snap.empty) {
      return "PROD-SPF-00001";
    }

    let max = 0;

    snap.forEach((doc) => {
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
      let totalSkipped = 0;

      let refCounter = 0;

      // get starting number ONCE
      const snap = await getDocs(collection(db, "products"));

      snap.forEach((doc) => {
        const ref = doc.data().productReferenceID;

        if (!ref) return;

        const num = parseInt(ref.replace("PROD-SPF-", ""));

        if (num > refCounter) refCounter = num;
      });

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

  totalSkipped++;

  continue;

}

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
          const mainImageUrl = row.getCell(3).value?.toString() || "";

          const supplierCompany = row.getCell(2).value?.toString() || "";

          const supplier = await findSupplier(supplierCompany);

          if (!supplier) {
            toast.error(`Supplier not found: ${supplierCompany}`);

            continue; // ⛔ stop uploading this product
          }

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

          /* ===== LOGISTICS (FULL SUPPORT LIGHTS SINGLE / MULTI / POLE) ===== */

          const calcType =
            row
              .getCell(headers.indexOf("Calculation Type") + 1)
              .value?.toString() || "LIGHTS";

          /* ================= COMMON ================= */

          const landedCost =
            Number(row.getCell(headers.indexOf("Landed Cost") + 1).value) || 0;

          const srp =
            Number(row.getCell(headers.indexOf("SRP") + 1).value) || 0;

          const moq =
            Number(row.getCell(headers.indexOf("MOQ") + 1).value) || 0;

          /* ================= WARRANTY ================= */

          const warrantyText =
            row.getCell(headers.indexOf("Warranty") + 1).value?.toString() ||
            "";

          const warrantyParts = warrantyText.split(" ");

          const warrantyValue = Number(warrantyParts[0]) || 0;

          const warrantyUnit = warrantyParts[1] || "Years";

          /* ================= LIGHTS SINGLE ================= */

          const packaging =
            calcType === "LIGHTS" && headers.includes("Length")
              ? {
                  length:
                    Number(row.getCell(headers.indexOf("Length") + 1).value) ||
                    0,

                  width:
                    Number(row.getCell(headers.indexOf("Width") + 1).value) ||
                    0,

                  height:
                    Number(row.getCell(headers.indexOf("Height") + 1).value) ||
                    0,

                  qtyPerCarton:
                    Number(
                      row.getCell(headers.indexOf("Qty/Carton") + 1).value,
                    ) || 0,
                }
              : null;

          /* ================= MULTI DIMENSION (FIX MULTI HEADER) ================= */

          let multiDimensions = null;

          if (calcType === "LIGHTS") {
            const multiArray = [];

            for (let col = 0; col < headers.length; col++) {
              const header = headers[col];

              if (!header.startsWith("Item Name")) continue;

              const index = header.replace("Item Name ", "");

              const itemName = row.getCell(col + 1).value?.toString() || "";

              const unitCost =
                Number(
                  row.getCell(headers.indexOf(`Unit Cost ${index}`) + 1).value,
                ) || 0;

              const length =
                Number(
                  row.getCell(headers.indexOf(`Length ${index}`) + 1).value,
                ) || 0;

              const width =
                Number(
                  row.getCell(headers.indexOf(`Width ${index}`) + 1).value,
                ) || 0;

              const height =
                Number(
                  row.getCell(headers.indexOf(`Height ${index}`) + 1).value,
                ) || 0;

              const qty =
                Number(
                  row.getCell(headers.indexOf(`Qty/Carton ${index}`) + 1).value,
                ) || 0;

              if (itemName || unitCost || length || width || height || qty) {
                multiArray.push({
                  itemName,

                  unitCost,

                  length,

                  width,

                  height,

                  qtyPerCarton: qty,
                });
              }
            }

            if (multiArray.length > 0) multiDimensions = multiArray;
          }

          /* ================= POLE ================= */

          const qtyPerContainer =
            calcType === "POLE"
              ? Number(
                  row.getCell(headers.indexOf("Qty/Container") + 1).value,
                ) || 0
              : null;

          /* ================= UNIT COST ================= */

          let unitCost = 0;

          if (calcType === "POLE") {
            unitCost =
              Number(
                row.getCell(headers.indexOf("Unit Cost (Pole)") + 1).value,
              ) || 0;
          } else if (multiDimensions) {
            unitCost = multiDimensions.reduce(
              (sum, r) => sum + (r.unitCost || 0),
              0,
            );
          } else {
            unitCost =
              Number(
                row.getCell(headers.indexOf("Unit Cost (Lights Single)") + 1)
                  .value,
              ) || 0;
          }

          /* ================= FINAL OBJECT ================= */

          const logistics = {
            calculationType: calcType,

            unitCost,

            landedCost,

            srp,

            moq,

            useArrayInput: !!multiDimensions,

            multiDimensions,

            packaging,

            qtyPerContainer,

            category: "To Be Evaluated",

            warranty: {
              value: warrantyValue,

              unit: warrantyUnit,
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

          /* ===== CHECK IF DUPLICATE FIRST ===== */

          const duplicate = await isDuplicateProduct(
            productName,
            supplierCompany,
          );

          if (duplicate) {
            totalSkipped++;

            toast.warning(
              `Skipped: "${productName}" already exists for "${supplierCompany}"`,
            );

            continue;
          }

          /* ===== GENERATE NEW REFERENCE ONLY IF NEW ===== */

          refCounter++;

          const productReferenceID = `PROD-SPF-${refCounter
            .toString()
            .padStart(5, "0")}`;

          /* ===== SAVE ===== */

          await addDoc(collection(db, "products"), {
            productReferenceID,

            productName,

            sisterCompanyId: sister?.sisterCompanyId || "",

            sisterCompanyName,

            classificationId: classification.classificationId,

            classificationName,

            supplier,

categoryTypes: category ? [category] : [],

            productTypes: [productType],

            mainImage: { url: mainImageUrl },

            gallery,

            technicalSpecifications,

            logistics,

            mediaStatus: "done",

            isActive: true,

            createdAt: serverTimestamp(),

            createdBy: userId,

            referenceID: userReferenceID,
          });

          totalUploaded++;
        }
      }

      toast.success(`Uploaded: ${totalUploaded} | Skipped: ${totalSkipped}`);

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
