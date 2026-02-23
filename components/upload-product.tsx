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

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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

  const [classification, setClassification] = React.useState("");

  const [classifications, setClassifications] = React.useState<any[]>([]);

  /* LOAD USER */

  React.useEffect(() => {
    if (!userId) return;

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) => {
        setUserReferenceID(data.ReferenceID || "");
      });
  }, [userId]);

  /* LOAD CLASSIFICATIONS */

  React.useEffect(() => {
    const load = async () => {
      const snap = await getDocs(
        query(
          collection(db, "classificationTypes"),
          where("isActive", "==", true),
        ),
      );

      setClassifications(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
        })),
      );
    };

    load();
  }, []);

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

  const findBrand = async (name: string) => {
    const snap = await getDocs(
      query(collection(db, "brands"), where("name", "==", name)),
    );

    if (snap.empty) return null;

    return {
      brandId: snap.docs[0].id,
      brandName: name,
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

  /* GENERATE PRODUCT CODE */

  const generateReference = async () => {
    const snap = await getDocs(collection(db, "products"));

    let max = 0;

    snap.forEach((doc) => {
      const ref = doc.data().productReferenceID;

      if (!ref) return;

      const num = parseInt(ref.replace("PROD-SPF-", ""));

      if (num > max) max = num;
    });

    return `PROD-SPF-${(max + 1).toString().padStart(5, "0")}`;
  };

  /* MAIN UPLOAD */

  const handleUpload = async () => {
    if (!file || !classification) {
      toast.error("Select classification and file");

      return;
    }

    try {
      setUploading(true);

      const buffer = await file.arrayBuffer();

      const workbook = new ExcelJS.Workbook();

      await workbook.xlsx.load(buffer);

      let refCounter = 0;

      const snap = await getDocs(collection(db, "products"));

      snap.forEach((doc) => {
        const ref = doc.data().productReferenceID;

        if (!ref) return;

        const num = parseInt(ref.replace("PROD-SPF-", ""));

        if (num > refCounter) refCounter = num;
      });

      for (const sheet of workbook.worksheets) {
        const sheetName = sheet.name;

        const header1 = sheet.getRow(1);

        const header2 = sheet.getRow(2);

        const techHeaders: {
          col: number;
          title: string;
          specId: string;
        }[] = [];

        header1.eachCell((cell, col) => {
          if (col <= 8) return;

          const specId = cell.value?.toString();

          const title = header2.getCell(col).value?.toString();

          if (!title || !specId) return;

          techHeaders.push({
            col,
            title,
            specId,
          });
        });
        /* LOOP ROWS */
        let lastClassification = "";

        let lastBrand = "";

        let lastPricePoint = "";

        let lastBrandOrigin = "";

        let lastCategoryType = "";

        let lastImage = "";

        let lastProductName = "";

        let lastSupplier = "";

        for (let r = 3; r <= sheet.rowCount; r++) {
          const row = sheet.getRow(r);

          /* READ WITH MERGE SUPPORT */

          let excelClassification =
            row.getCell(1).value?.toString() || lastClassification;

          if (excelClassification) lastClassification = excelClassification;

          let brandName = row.getCell(2).value?.toString() || lastBrand;

          if (brandName) lastBrand = brandName;

          let pricePoint = row.getCell(3).value?.toString() || lastPricePoint;

          if (pricePoint) lastPricePoint = pricePoint;

          let brandOrigin = row.getCell(4).value?.toString() || lastBrandOrigin;

          if (brandOrigin) lastBrandOrigin = brandOrigin;

          let categoryTypeName =
            row.getCell(5).value?.toString() || lastCategoryType;

          if (categoryTypeName) lastCategoryType = categoryTypeName;

          let image = row.getCell(7).value?.toString() || lastImage;

          if (image) lastImage = image;

          let productName = row.getCell(8).value?.toString() || lastProductName;

          if (productName) lastProductName = productName;

          let supplierCompany =
            row.getCell(9).value?.toString() || lastSupplier;

          if (supplierCompany) lastSupplier = supplierCompany;

          /* SKIP EMPTY PRODUCT */

          if (!productName) continue;

          /* VALIDATE CLASSIFICATION */

          const selectedClassificationName =
            classifications.find((c) => c.id === classification)?.name || "";

          if (excelClassification !== selectedClassificationName) {
            toast.error(
              `Upload failed: Excel Classification "${excelClassification}" does not match selected "${selectedClassificationName}".`,
            );

            setUploading(false);

            return;
          }

          /* FIND RELATED DATA */

          const brand = await findBrand(brandName);

          const supplier = await findSupplier(supplierCompany);

          const categoryType = await findCategoryType(
            classification,
            categoryTypeName,
          );

          if (!categoryType) {
            toast.error(
              `Upload failed: Category Type "${categoryTypeName}" not found.`,
            );

            continue;
          }

          const productType = await findProductType(
            classification,
            categoryType.categoryTypeId,
            sheetName,
          );

          if (!productType) {
            toast.error(
              `Upload failed: Product Type "${sheetName}" not found.`,
            );

            continue;
          }

          /* BUILD TECH SPECS */

          const specMap: Record<string, any[]> = {};

          techHeaders.forEach(({ col, title, specId }) => {
            const value = row.getCell(col).value?.toString();

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

          /* DUPLICATE CHECK */

          const duplicateQuery = await getDocs(
            query(
              collection(db, "products"),
              where("brandName", "==", brandName),
              where("classificationId", "==", classification),
              where("pricePoint", "==", pricePoint),
              where("brandOrigin", "==", brandOrigin),
              where("productName", "==", productName),
              where("supplier.company", "==", supplierCompany),
            ),
          );

          let duplicateFound = false;

          duplicateQuery.forEach((doc) => {
            const data = doc.data();

            const existingProductTypeId =
              data.productTypes?.[0]?.productTypeId || "";

            if (existingProductTypeId === productType?.productTypeId)
              duplicateFound = true;
          });

          if (duplicateFound) {
            toast.error(`Upload failed: Duplicate product "${productName}".`);

            continue;
          }

          /* GENERATE REF */

          refCounter++;

          const productReferenceID = `PROD-SPF-${refCounter.toString().padStart(5, "0")}`;

          /* SAVE */

          await addDoc(collection(db, "products"), {
            productReferenceID,

            productName,

            brandId: brand?.brandId || "",

            brandName,

            pricePoint,

            brandOrigin,

            classificationId: classification,

            classificationName: selectedClassificationName,

            supplier,

            categoryTypes: categoryType ? [categoryType] : [],

            productTypes: productType ? [productType] : [],

            mainImage: {
              url: image,
            },

            technicalSpecifications,

            createdBy: userId,

            referenceID: userReferenceID,

            isActive: true,

            mediaStatus: "done",

            createdAt: serverTimestamp(),
          });
        }
      }

      toast.success("Upload Complete");

      setOpen(false);

      setFile(null);
    } catch (err) {
      console.error(err);

      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* UI */

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

        <Select onValueChange={setClassification}>
          <SelectTrigger>
            <SelectValue placeholder="Select Classification" />
          </SelectTrigger>

          <SelectContent>
            {classifications.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
