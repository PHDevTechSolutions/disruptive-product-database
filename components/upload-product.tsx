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
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { toast } from "sonner";

export default function UploadProductModal() {
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select ZIP file");
      return;
    }

    try {
      setUploading(true);

      const zip = await JSZip.loadAsync(file);
      const files = Object.keys(zip.files);

      let totalUploaded = 0;

      for (const path of files) {
        if (!path.endsWith(".xlsx")) continue;

        const zipFile = zip.files[path];
        if (!zipFile) continue;

        const buffer = await zipFile.async("arraybuffer");

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) continue;

        const parts = path.split("/");

        const sisterCompanyName = parts[0] || "";
        const classificationName = parts[1] || "";
        const categoryTypeName = parts[2] || "";
        const productTypeName = parts[3] || "";

        const headerRow1 = worksheet.getRow(1);
        const headerRow2 = worksheet.getRow(2);

        const headers: string[] = [];

        headerRow2.eachCell((cell, col) => {
          const group = headerRow1.getCell(col).value?.toString() || "";
          const field = cell.value?.toString() || "";

          if (group === "Pricing / Logistics") headers.push(field);
          else if (group === "Gallery URLs") headers.push(`Gallery ${field}`);
          else if (
            group === "Model No." ||
            group === "Supplier Company" ||
            group === "Main Image URL"
          )
            headers.push(group);
          else headers.push(`${group}:${field}`);
        });

        for (let i = 3; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          if (!row.getCell(1).value) continue;

          const productName = row.getCell(1).value?.toString() || "";
          const supplierCompany = row.getCell(2).value?.toString() || "";
          const mainImageUrl = row.getCell(3).value?.toString() || "";

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

          const logistics: any = {};

          headers.forEach((h, index) => {
            const value = row.getCell(index + 1).value;
            if (!value) return;

            if (h === "Unit Cost") logistics.unitCost = Number(value);
            if (h === "Landed Cost") logistics.landedCost = Number(value);
            if (h === "SRP") logistics.srp = Number(value);
            if (h === "MOQ") logistics.moq = Number(value);

            if (h === "Warranty") {
              logistics.warranty = {
                value: value.toString(),
                unit: "",
              };
            }
          });

          const specMap: Record<string, any[]> = {};

          headers.forEach((h, index) => {
            if (!h.includes(":")) return;

            const [group, specId] = h.split(":");
            const value = row.getCell(index + 1).value?.toString();

            if (!value) return;

            if (!specMap[group]) specMap[group] = [];

            specMap[group].push({
              specId,
              value,
            });
          });

          const technicalSpecifications = Object.keys(specMap).map(
            (title) => ({
              title,
              specs: specMap[title],
            })
          );

          await addDoc(collection(db, "products"), {
            productName,
            sisterCompanyName,
            classificationName,

            supplier: {
              company: supplierCompany,
            },

            categoryTypes: [
              {
                categoryTypeName,
              },
            ],

            productTypes: [
              {
                productTypeName,
              },
            ],

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

      setFile(null);
      setOpen(false);
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
