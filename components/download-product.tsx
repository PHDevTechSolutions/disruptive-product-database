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
  iconOnly?: boolean;
};

export default function DownloadProduct({ products, iconOnly = false }: Props) {
  const [open, setOpen] = React.useState(false);

  const convertDriveToThumbnail = (url?: string) => {
    if (!url) return "";
    if (!url.includes("drive.google.com")) return url;
    let fileId = "";
    const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) fileId = match1[1];
    if (match2 && match2[1]) fileId = match2[1];
    if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    return url;
  };

  const GROUP_COLORS = ["BDD7EE", "FFE699"];

  const handleDownload = async () => {
    const wb = new ExcelJS.Workbook();

    const sheetMap = new Map<string, any[]>();
    products.forEach((p) => {
      const familyName = p.productFamilies?.[0]?.productFamilyName || "Others";
      if (!sheetMap.has(familyName)) sheetMap.set(familyName, []);
      sheetMap.get(familyName)!.push(p);
    });

    for (const [sheetName, sheetProducts] of sheetMap) {
      const ws = wb.addWorksheet(sheetName);

      const categoryTypeId = sheetProducts[0]?.categoryTypes?.[0]?.productUsageId || null;
      const productFamilyId = sheetProducts[0]?.productFamilies?.[0]?.productFamilyId || null;

      let templateSnap: any = { forEach: () => {} };
      if (categoryTypeId && productFamilyId) {
        templateSnap = await getDocs(
          query(
            collection(db, "technicalSpecifications"),
            where("categoryTypeId", "==", categoryTypeId),
            where("productFamilyId", "==", productFamilyId),
            where("isActive", "==", true),
          ),
        );
      }

      const groupMap = new Map<string, string[]>();
      templateSnap.forEach((doc: any) => {
        const data = doc.data();
        groupMap.set(data.title, data.specs.map((s: any) => s.specId));
      });

      // ── Static columns (Image URL only, Dimensional & Illuminance moved to end) ──
      const staticColumns = [
        "Product Usage",
        "Product Family",
        "Product Class",
        "Price Point",
        "Brand Origin",
        "Supplier Brand",
        "Image URL",
      ];

      const header1: any[] = [];
      const header2: any[] = [];
      const header3: any[] = [];

      staticColumns.forEach((col) => {
        header1.push(col);
        header2.push("");
        header3.push("");
      });

      groupMap.forEach((specIds, groupTitle) => {
        specIds.forEach((specId, index) => {
          header1.push(specId);
          header2.push(index === 0 ? groupTitle : "");
          header3.push("");
        });
      });

      // ── Commercial Details columns ──
      header1.push("Unit Cost", "Length", "Width", "Height", "pcs/carton", "Factory Address", "Port of Discharge");
      header2.push("COMMERCIAL DETAILS", "", "", "", "", "", "");
      header3.push("", "Packaging Details (cm)", "", "", "", "", "");

      // ── Dimensional Drawing & Illuminance Level appended after Commercial Details ──
      header1.push("Dimensional Drawing", "Illuminance Drawing");
      header2.push("", "");
      header3.push("", "");

      const cdStart = staticColumns.length + 1;
      let specColCount = 0;
      groupMap.forEach((specIds) => { specColCount += specIds.length; });
      const commercialStart = staticColumns.length + specColCount + 1;
      const commercialEnd = commercialStart + 6;

      ws.addRow(header1);
      ws.addRow(header2);
      ws.addRow(header3);

      ws.mergeCells(2, commercialStart, 2, commercialEnd);
      ws.mergeCells(3, commercialStart + 1, 3, commercialStart + 3);

      // ── Style static columns ──
      for (let col = 1; col <= staticColumns.length; col++) {
        const cell = ws.getRow(1).getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // ── Style Commercial Details columns ──
      for (let col = commercialStart; col <= commercialEnd; col++) {
        const headerCell = ws.getRow(1).getCell(col);
        const groupCell = ws.getRow(2).getCell(col);
        const subGroupCell = ws.getRow(3).getCell(col);
        const purple = "D9D2E9";
        headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: purple } };
        groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: purple } };
        subGroupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: purple } };
        headerCell.font = { bold: true };
        groupCell.font = { bold: true };
        subGroupCell.font = { bold: true, italic: true };
        headerCell.alignment = { vertical: "middle", horizontal: "center" };
        groupCell.alignment = { vertical: "middle", horizontal: "center" };
        subGroupCell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // ── Style Dimensional Drawing & Illuminance Drawing columns ──
      const drawingStart = commercialEnd + 1;
      const drawingEnd = commercialEnd + 2;
      for (let col = drawingStart; col <= drawingEnd; col++) {
        const cell = ws.getRow(1).getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // ── Style technical spec group columns ──
      let colStart = staticColumns.length + 1;
      let groupIndex = 0;

      groupMap.forEach((specIds) => {
        const colEnd = colStart + specIds.length - 1;
        ws.mergeCells(2, colStart, 2, colEnd);
        const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length];
        for (let col = colStart; col <= colEnd; col++) {
          const headerCell = ws.getRow(1).getCell(col);
          const groupCell = ws.getRow(2).getCell(col);
          headerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          headerCell.font = { bold: true };
          headerCell.alignment = { vertical: "middle", horizontal: "center" };
          groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          groupCell.font = { bold: true, italic: true };
          groupCell.alignment = { vertical: "middle", horizontal: "center" };
        }
        groupIndex++;
        colStart = colEnd + 1;
      });

      // ── Data rows ──
      sheetProducts.forEach((product) => {
        const row: any[] = [];
        row.push(product.categoryTypes?.[0]?.categoryTypeName || "");
        row.push(product.productFamilies?.[0]?.productFamilyName || "");
        row.push(product.productClass || "");
        row.push(product.pricePoint || "");
        row.push(product.brandOrigin || "CHINA");
        row.push(product.supplier?.supplierBrand || "ECONOMY");

        // Image URL (col 7)
        let imageURL = product.mainImage?.url || "";
        imageURL = convertDriveToThumbnail(imageURL);
        row.push(imageURL);

        // Technical Specs
        groupMap.forEach((specIds, groupTitle) => {
          const groupData = product.technicalSpecifications?.find((g: any) => g.title === groupTitle);
          specIds.forEach((specId) => {
            const spec = groupData?.specs?.find((s: any) => s.specId === specId);
            row.push(spec?.value || "");
          });
        });

        // Commercial Details
        const cd = product.commercialDetails || {};
        row.push(cd.unitCost || "");
        row.push(cd.packaging?.length || "");
        row.push(cd.packaging?.width || "");
        row.push(cd.packaging?.height || "");
        row.push(cd.pcsPerCarton || "");
        row.push(cd.factoryAddress || "");
        row.push(cd.portOfDischarge || "");

        // Dimensional Drawing & Illuminance Drawing (now at the end)
        let dimensionalURL = product.dimensionalDrawing?.url || "";
        dimensionalURL = convertDriveToThumbnail(dimensionalURL);
        row.push(dimensionalURL);

        let illuminanceURL = product.illuminanceDrawing?.url || "";
        illuminanceURL = convertDriveToThumbnail(illuminanceURL);
        row.push(illuminanceURL);

        ws.addRow(row);
      });

      const specStartCol = staticColumns.length + 1;
      const specEndCol = commercialStart - 1;

      for (let row = 4; row <= ws.rowCount; row++) {
        for (let col = specStartCol; col <= specEndCol; col++) {
          const cell = ws.getRow(row).getCell(col);
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        }
      }

      const mergeColumns = ws.columnCount;
      for (let row = 4; row <= ws.rowCount; row++) {
        for (let col = 1; col <= mergeColumns; col++) {
          const cell = ws.getRow(row).getCell(col);
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        }
      }

      ws.columns.forEach((column) => {
        let max = 15;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const len = cell.value?.toString().length || 0;
          if (len > max) max = len;
        });
        column.width = max + 4;
      });

      ws.views = [{ state: "frozen", ySplit: 3 }];
    }

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "ProductList.xlsx");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <button className="h-8 w-8 rounded-full border border-gray-200 bg-white/80 flex items-center justify-center">
            <Download className="h-4 w-4 text-gray-600" />
          </button>
        ) : (
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download Product</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleDownload}>Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
