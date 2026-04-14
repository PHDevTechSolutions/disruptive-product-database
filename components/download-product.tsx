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

      /* ── Column layout ──────────────────────────────────────────────
       *  Cols 1-7  : static product fields (Usage → Image URL)
       *  Cols 8+   : technical spec columns (grouped)
       *  Next 7    : COMMERCIAL DETAILS (Unit Cost … Port of Discharge)
       *  Last 2    : Dimensional Drawing, Illuminance Level   ← moved here
       * ─────────────────────────────────────────────────────────────── */
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

      // Static cols (1-7)
      staticColumns.forEach((col) => {
        header1.push(col);
        header2.push("");
        header3.push("");
      });

      // Technical spec cols (col 8+)
      groupMap.forEach((specIds, groupTitle) => {
        specIds.forEach((specId, index) => {
          header1.push(specId);
          header2.push(index === 0 ? groupTitle : "");
          header3.push("");
        });
      });

      // Commercial Details block
      header1.push("Unit Cost", "Length", "Width", "Height", "pcs/carton", "Factory Address", "Port of Discharge");
      header2.push("COMMERCIAL DETAILS", "", "", "", "", "", "");
      header3.push("", "Packaging Details (cm)", "", "", "", "", "");

      // Drawing columns — AFTER commercial details
      header1.push("Dimensional Drawing", "Illuminance Level");
      header2.push("DRAWINGS", "");
      header3.push("", "");

      ws.addRow(header1);
      ws.addRow(header2);
      ws.addRow(header3);

      // ── Merge: COMMERCIAL DETAILS group header (row 2) ──
      const cdStart = staticColumns.length + 1 + (() => {
        let total = 0;
        groupMap.forEach((ids) => { total += ids.length; });
        return total;
      })();
      const cdEnd = cdStart + 6; // 7 commercial cols → cdStart … cdStart+6

      ws.mergeCells(2, cdStart, 2, cdEnd);
      ws.mergeCells(3, cdStart + 1, 3, cdStart + 3); // Packaging Details (L/W/H)

      // ── Merge: DRAWINGS group header (row 2) ──
      const drawStart = cdEnd + 1;
      const drawEnd   = drawStart + 1; // 2 drawing cols
      ws.mergeCells(2, drawStart, 2, drawEnd);

      // ── Style: static cols (blue) ──
      for (let col = 1; col <= staticColumns.length; col++) {
        const cell = ws.getRow(1).getCell(col);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "4472C4" } };
        cell.font = { bold: true, color: { argb: "FFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }

      // ── Style: commercial detail cols (purple) ──
      for (let col = cdStart; col <= cdEnd; col++) {
        const purple = "D9D2E9";
        const applyStyle = (row: ExcelJS.Row, italic = false) => {
          const c = row.getCell(col);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: purple } };
          c.font = { bold: true, color: { argb: "000000" }, italic };
          c.alignment = { vertical: "middle", horizontal: "center" };
        };
        applyStyle(ws.getRow(1));
        applyStyle(ws.getRow(2));
        applyStyle(ws.getRow(3), true);
      }

      // ── Style: drawing cols (light green) ──
      const drawColor = "E2EFDA";
      for (let col = drawStart; col <= drawEnd; col++) {
        [ws.getRow(1), ws.getRow(2), ws.getRow(3)].forEach((r, ri) => {
          const c = r.getCell(col);
          c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: drawColor } };
          c.font = { bold: true, italic: ri === 2 };
          c.alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      // ── Style: technical spec group cols (alternating colors) ──
      let colStart = staticColumns.length + 1;
      let groupIndex = 0;

      groupMap.forEach((specIds) => {
        const colEnd = colStart + specIds.length - 1;
        ws.mergeCells(2, colStart, 2, colEnd);
        const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length];
        for (let col = colStart; col <= colEnd; col++) {
          const headerCell = ws.getRow(1).getCell(col);
          const groupCell  = ws.getRow(2).getCell(col);
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

        // Static cols 1-7
        row.push(product.categoryTypes?.[0]?.categoryTypeName || "");
        row.push(product.productFamilies?.[0]?.productFamilyName || "");
        row.push(product.productClass || "");
        row.push(product.pricePoint || "");
        row.push(product.brandOrigin || "CHINA");
        row.push(product.supplier?.supplierBrand || "ECONOMY");

        let imageURL = convertDriveToThumbnail(product.mainImage?.url || "");
        row.push(imageURL);

        // Technical spec cols
        groupMap.forEach((specIds, groupTitle) => {
          const groupData = product.technicalSpecifications?.find(
            (g: any) => g.title === groupTitle,
          );
          specIds.forEach((specId) => {
            const spec = groupData?.specs?.find((s: any) => s.specId === specId);
            row.push(spec?.value || "");
          });
        });

        // Commercial details
        const cd = product.commercialDetails || {};
        row.push(cd.unitCost || "");
        row.push(cd.packaging?.length || "");
        row.push(cd.packaging?.width || "");
        row.push(cd.packaging?.height || "");
        row.push(cd.pcsPerCarton || "");
        row.push(cd.factoryAddress || "");
        row.push(cd.portOfDischarge || "");

        // Drawing URLs — AFTER commercial details
        let dimensionalURL = convertDriveToThumbnail(product.dimensionalDrawing?.url || "");
        row.push(dimensionalURL);

        let illuminanceURL = convertDriveToThumbnail(product.illuminanceDrawing?.url || "");
        row.push(illuminanceURL);

        ws.addRow(row);
      });

      // ── Cell alignment for spec cols ──
      const specStartCol = staticColumns.length + 1;
      const specEndCol   = cdStart - 1;

      for (let r = 4; r <= ws.rowCount; r++) {
        for (let col = specStartCol; col <= specEndCol; col++) {
          const cell = ws.getRow(r).getCell(col);
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        }
      }

      // ── Cell alignment for all cols ──
      const totalCols = ws.columnCount;
      for (let r = 4; r <= ws.rowCount; r++) {
        for (let col = 1; col <= totalCols; col++) {
          const cell = ws.getRow(r).getCell(col);
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        }
      }

      // ── Auto column width ──
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
          <Button className="bg-green-600 hover:bg-green-700 text-white">
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
