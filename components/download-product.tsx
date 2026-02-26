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

import { collection, query, where, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";

type Props = {
  products: any[];
};

export default function DownloadProduct({ products }: Props) {
  const [open, setOpen] = React.useState(false);

  const GROUP_COLORS = ["BDD7EE", "FFE699"];

  const handleDownload = async () => {
    const wb = new ExcelJS.Workbook();

    /* GROUP PRODUCTS BY PRODUCT FAMILY */

    const sheetMap = new Map<string, any[]>();

    products.forEach((p) => {
      const familyName = p.productFamilies?.[0]?.productFamilyName || "Others";

      if (!sheetMap.has(familyName)) sheetMap.set(familyName, []);

      sheetMap.get(familyName)!.push(p);
    });

    /* PROCESS EACH PRODUCT FAMILY */

    for (const [sheetName, sheetProducts] of sheetMap) {
      const ws = wb.addWorksheet(sheetName);

      /* GET TEMPLATE FROM FIRESTORE */

      const categoryTypeId =
        sheetProducts[0]?.categoryTypes?.[0]?.productUsageId;

      const productFamilyId =
        sheetProducts[0]?.productFamilies?.[0]?.productFamilyId;

      const templateSnap = await getDocs(
        query(
          collection(db, "technicalSpecifications"),
          where("categoryTypeId", "==", categoryTypeId),
          where("productFamilyId", "==", productFamilyId),
          where("isActive", "==", true),
        ),
      );

      const groupMap = new Map<string, string[]>();

      templateSnap.forEach((doc) => {
        const data = doc.data();

        groupMap.set(
          data.title,
          data.specs.map((s: any) => s.specId),
        );
      });

      /* STATIC COLUMNS */

      const staticColumns = [
        "Product Usage",

        "Product Family",

        "Product Class",

        "Price Point",

        "Brand Origin",

        "Supplier",

        "Image URL",
      ];

      const header1: any[] = [];

      const header2: any[] = [];

      staticColumns.forEach((col) => {
        header1.push(col);

        header2.push("");
      });

      groupMap.forEach((specIds, groupTitle) => {
        specIds.forEach((specId, index) => {
          header1.push(specId);

          header2.push(index === 0 ? groupTitle : "");
        });
      });

      ws.addRow(header1);

      ws.addRow(header2);

      /* STYLE STATIC HEADER */

      for (let col = 1; col <= staticColumns.length; col++) {
        const cell = ws.getRow(1).getCell(col);

        cell.fill = {
          type: "pattern",

          pattern: "solid",

          fgColor: { argb: "4472C4" },
        };

        cell.font = {
          bold: true,

          color: { argb: "FFFFFF" },
        };

        cell.alignment = {
          vertical: "middle",

          horizontal: "center",
        };
      }

      /* STYLE TEMPLATE HEADER */

      let colStart = staticColumns.length + 1;

      let groupIndex = 0;

      groupMap.forEach((specIds) => {
        const colEnd = colStart + specIds.length - 1;

        ws.mergeCells(2, colStart, 2, colEnd);

        const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length];

        for (let col = colStart; col <= colEnd; col++) {
          const headerCell = ws.getRow(1).getCell(col);

          const groupCell = ws.getRow(2).getCell(col);

          headerCell.fill = {
            type: "pattern",

            pattern: "solid",

            fgColor: { argb: color },
          };

          headerCell.font = { bold: true };

          headerCell.alignment = {
            vertical: "middle",

            horizontal: "center",
          };

          groupCell.fill = {
            type: "pattern",

            pattern: "solid",

            fgColor: { argb: color },
          };

          groupCell.font = {
            bold: true,

            italic: true,
          };

          groupCell.alignment = {
            vertical: "middle",

            horizontal: "center",
          };
        }

        groupIndex++;

        colStart = colEnd + 1;
      });

      /* ADD PRODUCT ROWS */

      sheetProducts.forEach((product) => {
        const row: any[] = [];

        row.push(product.categoryTypes?.[0]?.categoryTypeName || "");

        row.push(product.productFamilies?.[0]?.productFamilyName || "");

        row.push(product.productClass || "");

        row.push(product.pricePoint || "");

        row.push(product.brandOrigin || "");

        row.push(product.supplier?.company || "");

        row.push(product.mainImage?.url || "");

        groupMap.forEach((specIds, groupTitle) => {
          const groupData = product.technicalSpecifications?.find(
            (g: any) => g.title === groupTitle,
          );

          specIds.forEach((specId) => {
            const spec = groupData?.specs?.find(
              (s: any) => s.specId === specId,
            );

            row.push(spec?.value || "");
          });
        });

        ws.addRow(row);
      });

      const mergeColumns = staticColumns.length;

for (let col = 1; col <= mergeColumns; col++) {

  let startRow = 3; // data starts at row 3
  let lastValue = ws.getRow(3).getCell(col).value;

  for (let row = 4; row <= ws.rowCount + 1; row++) {

    const currentValue =
      row <= ws.rowCount
        ? ws.getRow(row).getCell(col).value
        : "__END__";

    if (currentValue !== lastValue) {

      if (row - startRow > 1) {

        ws.mergeCells(startRow, col, row - 1, col);

        const cell = ws.getRow(startRow).getCell(col);

        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };

      }

      startRow = row;
      lastValue = currentValue;

    }

  }

}

      /* AUTO WIDTH */

      ws.columns.forEach((column) => {
        let max = 15;

        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const len = cell.value?.toString().length || 0;

          if (len > max) max = len;
        });

        column.width = max + 4;
      });

      ws.views = [{ state: "frozen", ySplit: 2 }];
    }

    const buffer = await wb.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), "ProductList.xlsx");

    setOpen(false);
  };

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
