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

import { Download } from "lucide-react";

import ExcelJS from "exceljs";

import saveAs from "file-saver";

type Props = {
  products: any[];
};

export default function DownloadProduct({ products }: Props) {
  const [open, setOpen] = React.useState(false);

  const [classification, setClassification] = React.useState("");

  /* ================= GET CLASSIFICATIONS ================= */

  const classifications = Array.from(
    new Set(products.map((p) => p.classificationName)),
  );

  /* ================= MAIN DOWNLOAD ================= */

  const handleDownload = async () => {
    if (!classification) return;

    const wb = new ExcelJS.Workbook();

    /* FILTER CLASSIFICATION */

    const filteredProducts = products.filter(
      (p) => p.classificationName === classification,
    );

    /* GROUP BY PRODUCT TYPE → SHEETS */

    const sheetMap = new Map<string, any[]>();

    filteredProducts.forEach((p) => {
      const productType = p.productTypes?.[0]?.productTypeName || "Others";

      if (!sheetMap.has(productType)) sheetMap.set(productType, []);

      sheetMap.get(productType)!.push(p);
    });

    /* ================= CREATE SHEETS ================= */

    for (const [sheetName, sheetProducts] of sheetMap) {
      const ws = wb.addWorksheet(sheetName);

      /* ================= GET TECH GROUP STRUCTURE ================= */

      const groupMap = new Map<string, Set<string>>();

      sheetProducts.forEach((p) => {
        p.technicalSpecifications?.forEach((group: any) => {
          if (!groupMap.has(group.title))
            groupMap.set(
              group.title,

              new Set(),
            );

          group.specs?.forEach((spec: any) => {
            groupMap.get(group.title)!.add(spec.specId);
          });
        });
      });

      /* ================= STATIC PRODUCT COLUMNS ================= */

      const staticColumns = [
        "Category",

        "Product Code",

        "Cloudinary URL",

        "Product Name",

        "Supplier",
      ];

      /* ================= HEADER ROW 1 ================= */

      const header1: any[] = [];

      staticColumns.forEach((col) => header1.push(col));

      groupMap.forEach((specs, group) => {
        header1.push(group);

        for (let i = 1; i < specs.size; i++) header1.push("");
      });

      ws.addRow(header1);

      /* ================= HEADER ROW 2 ================= */

      const header2: any[] = [];

      staticColumns.forEach(() => header2.push(""));

      groupMap.forEach((specs) => {
        Array.from(specs)

          .forEach((specId) => header2.push(specId));
      });

      ws.addRow(header2);

      /* ================= MERGE GROUP HEADERS ================= */

      let colStart = staticColumns.length + 1;

      groupMap.forEach((specs) => {
        const colEnd = colStart + specs.size - 1;

        ws.mergeCells(
          1,

          colStart,

          1,

          colEnd,
        );

        colStart = colEnd + 1;
      });

      /* ================= DATA ================= */

      sheetProducts.forEach((product) => {
        const row: any[] = [];

        row.push(product.category || "");

        row.push(product.productReferenceID || "");

        row.push(product.mainImage?.url || "");

        row.push(product.productName || "");

        row.push(product.supplier?.company || "");

        groupMap.forEach((specs, group) => {
          const groupData = product.technicalSpecifications?.find(
            (g: any) => g.title === group,
          );

          Array.from(specs)

            .forEach((specId) => {
              const spec = groupData?.specs?.find(
                (s: any) => s.specId === specId,
              );

              row.push(spec?.value || "");
            });
        });

        ws.addRow(row);
      });

      /* ================= AUTO WIDTH ================= */

      ws.columns.forEach((column) => {
        let max = 15;

        column.eachCell?.(
          { includeEmpty: true },

          (cell) => {
            const len = cell.value?.toString().length || 0;

            if (len > max) max = len;
          },
        );

        column.width = max + 2;
      });

      /* FREEZE HEADER */

      ws.views = [
        {
          state: "frozen",

          ySplit: 2,
        },
      ];
    }

    /* ================= SAVE FILE ================= */

    const buffer = await wb.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer]),

      `${classification}.xlsx`,
    );

    setOpen(false);
  };

  /* ================= UI ================= */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Product</DialogTitle>
        </DialogHeader>

        <Select onValueChange={setClassification}>
          <SelectTrigger>
            <SelectValue placeholder="Select Classification" />
          </SelectTrigger>

          <SelectContent>
            {classifications.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
