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
import { Download } from "lucide-react";
import ExcelJS from "exceljs";
import saveAs from "file-saver";

type Props = { products: any[] };

export default function DownloadProduct({ products }: Props) {
  const [open, setOpen] = React.useState(false);

  const getSpecValue = (spec: any) => {
    if (!spec) return "";
    return spec.value || "";
  };

  const handleDownload = async () => {
    if (!products.length) return;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");

    /* ================= COLLECT TECH SPECS ================= */

    const specGroups = new Map<string, Set<string>>();

    products.forEach((p) => {
      p.technicalSpecifications?.forEach((g: any) => {
        if (!specGroups.has(g.title)) specGroups.set(g.title, new Set());

        g.specs?.forEach((s: any) => {
          specGroups.get(g.title)!.add(s.specId);
        });
      });
    });

    /* ================= HEADERS ================= */

    const header1: any[] = [];
    const header2: any[] = [];

    header1.push("Product Reference ID");
    header2.push("");

    header1.push("Brand");
    header2.push("");

    header1.push("Classification");
    header2.push("");

    /* ✅ NEW CATEGORY COLUMN */
    header1.push("Category");
    header2.push("");

    header1.push("Category Type");
    header2.push("");

    header1.push("Product Type");
    header2.push("");

    header1.push("Model No.");
    header2.push("");

    header1.push("Supplier");
    header2.push("");

    header1.push("Main Image URL");
    header2.push("");

    /* ================= TECH SPECS ================= */

    specGroups.forEach((specs, group) => {
      const arr = Array.from(specs);

      header1.push(group);
      header2.push(arr[0]);

      for (let i = 1; i < arr.length; i++) {
        header1.push("");
        header2.push(arr[i]);
      }
    });

    ws.addRow(header1);
    ws.addRow(header2);

    /* ================= DATA ================= */

    products.forEach((p) => {
      const row: any[] = [];

      row.push(p.productReferenceID || "");

      row.push(p.brandName || "");

      row.push(p.classificationName || "");

      /* ✅ NEW CATEGORY VALUE */
      row.push(p.category || "");

      row.push(p.categoryTypes?.[0]?.categoryTypeName || "");

      row.push(p.productTypes?.[0]?.productTypeName || "");

      row.push(p.productName || "");

      row.push(p.supplier?.company || "");

      row.push(p.mainImage?.url || "");

      specGroups.forEach((specs, group) => {
        Array.from(specs).forEach((specId) => {
          const g = p.technicalSpecifications?.find(
            (x: any) => x.title === group,
          );

          const s = g?.specs?.find((x: any) => x.specId === specId);

          row.push(getSpecValue(s));
        });
      });

      ws.addRow(row);
    });

    /* ================= AUTO WIDTH ================= */

    ws.columns.forEach((col) => {
      let maxLength = 15;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value?.toString() || "";
        maxLength = Math.max(maxLength, val.length + 2);
      });
      col.width = maxLength;
    });

    /* ================= SAVE ================= */

    const buffer = await wb.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "Products.xlsx");

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Products</DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button onClick={handleDownload}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
