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
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";

export default function UploadProductModal() {
  const { userId } = useUser();

  const [userReferenceID, setUserReferenceID] = React.useState("");

  const [open, setOpen] = React.useState(false);

  const [file, setFile] = React.useState<File | null>(null);

  const [uploading, setUploading] = React.useState(false);

  /* LOAD USER */

  React.useEffect(() => {
    if (!userId) return;

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        setUserReferenceID(data.ReferenceID || "");
      });
  }, [userId]);

  /* HELPERS */

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

  const findCategoryType = async (name: string) => {
    const snap = await getDocs(
      query(collection(db, "categoryTypes"), where("name", "==", name)),
    );

    if (snap.empty) return null;

    return {
      productUsageId: snap.docs[0].id,
      categoryTypeName: name,
    };
  };

  const findProductFamily = async (productUsageId: string, name: string) => {
    const snap = await getDocs(
      query(
        collection(db, "categoryTypes", productUsageId, "productFamilies"),
        where("name", "==", name),
      ),
    );

    if (snap.empty) return null;

    return {
      productFamilyId: snap.docs[0].id,
      productFamilyName: name,
      productUsageId,
    };
  };

  /* DUPLICATE CHECK */

  const isDuplicateProduct = async ({
    productName,
    productUsageId,
    productFamilyId,
    supplierId,
    pricePoint,
    brandOrigin,
  }: any) => {
    const snap = await getDocs(
      query(
        collection(db, "products"),
        where("productName", "==", productName),
        where("pricePoint", "==", pricePoint),
        where("brandOrigin", "==", brandOrigin),
        where("supplier.supplierId", "==", supplierId),
      ),
    );

    if (snap.empty) return false;

    let duplicate = false;

    snap.forEach((doc) => {
      const data = doc.data();

      if (
        data.categoryTypes?.[0]?.productUsageId === productUsageId &&
        data.productFamilies?.[0]?.productFamilyId === productFamilyId
      )
        duplicate = true;
    });

    return duplicate;
  };

  /* MAIN UPLOAD */

  const handleUpload = async () => {
    if (!file) {
      toast.error("Select Excel file");
      return;
    }

    try {
      setUploading(true);

      const buffer = await file.arrayBuffer();

      const workbook = new ExcelJS.Workbook();

      await workbook.xlsx.load(buffer);

      /* GENERATE REF */

      let refCounter = 0;

      const snap = await getDocs(collection(db, "products"));

      snap.forEach((doc) => {
        const ref = doc.data().productReferenceID;

        if (!ref) return;

        const num = parseInt(ref.replace("PROD-SPF-", ""));

        if (num > refCounter) refCounter = num;
      });

      /* LOOP SHEETS */

      for (const sheet of workbook.worksheets) {
        const header1 = sheet.getRow(1);

        const header2 = sheet.getRow(2);

        const techHeaders: any[] = [];

        header1.eachCell((cell, col) => {
          if (col <= 8) return;

          const specId = cell.value?.toString();

          const title = header2.getCell(col).value?.toString();

          if (!title || !specId) return;

          techHeaders.push({ col, title, specId });
        });

        let lastUsage = "";
        let lastFamily = "";
        let lastClass = "";
        let lastPrice = "";
        let lastOrigin = "";
        let lastName = "";
        let lastSupplier = "";
        let lastImage = "";

        for (let r = 3; r <= sheet.rowCount; r++) {
          const row = sheet.getRow(r);

          const productUsage = row.getCell(1).value?.toString() || lastUsage;

          if (productUsage) lastUsage = productUsage;

          const productFamily = row.getCell(2).value?.toString() || lastFamily;

          if (productFamily) lastFamily = productFamily;

          const productClass = row.getCell(3).value?.toString() || lastClass;

          if (productClass) lastClass = productClass;

          const pricePoint = row.getCell(4).value?.toString() || lastPrice;

          if (pricePoint) lastPrice = pricePoint;

          const brandOrigin = row.getCell(5).value?.toString() || lastOrigin;

          if (brandOrigin) lastOrigin = brandOrigin;

          const productName = row.getCell(6).value?.toString() || lastName;

          if (productName) lastName = productName;

          const supplierCompany =
            row.getCell(7).value?.toString() || lastSupplier;

          if (supplierCompany) lastSupplier = supplierCompany;

          const image = row.getCell(8).value?.toString() || lastImage;

          if (image) lastImage = image;

          if (!productName) continue;

          const supplier = await findSupplier(supplierCompany);


          const categoryType = await findCategoryType(productUsage);


const productFamilyData = categoryType
  ? await findProductFamily(
      categoryType.productUsageId,
      productFamily,
    )
  : null;

          const specMap: any = {};

          techHeaders.forEach(({ col, title, specId }) => {
            const value = row.getCell(col).value?.toString();

            if (!value) return;

            if (!specMap[title]) specMap[title] = [];

            specMap[title].push({ specId, value });
          });

          const technicalSpecifications = Object.keys(specMap).map((title) => ({
            technicalSpecificationId: "",
            title,
            specs: specMap[title],
          }));

          refCounter++;

          const productReferenceID = `PROD-SPF-${refCounter.toString().padStart(5, "0")}`;

const duplicate =
  supplier &&
  categoryType &&
  productFamilyData
    ? await isDuplicateProduct({
        productName,
        productUsageId: categoryType.productUsageId,
        productFamilyId: productFamilyData.productFamilyId,
        supplierId: supplier.supplierId,
        pricePoint,
        brandOrigin,
      })
    : false;

          if (duplicate) {
            toast.error(`Duplicate skipped: ${productName}`);

            continue;
          }

          await addDoc(collection(db, "products"), {
            productReferenceID,

            productName,

            productClass: productClass || "Standard",

            pricePoint,

            brandOrigin,

            supplier,

            categoryTypes: [categoryType],

            productFamilies: [productFamilyData],

            mainImage: {
              url: image,
            },

            technicalSpecifications,

            createdBy: userId,

            referenceID: userReferenceID,

            isActive: true,

            mediaStatus: "done",

            createdAt: serverTimestamp(),

            whatHappened: "Product Added",

            date_updated: serverTimestamp(),
          });
        }
      }

      toast.success("Upload Complete");

      setOpen(false);

      setFile(null);
    } catch {
      toast.error("Upload Failed");
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

          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
