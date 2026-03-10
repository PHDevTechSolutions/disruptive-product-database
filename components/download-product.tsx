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


  const convertDriveToThumbnail = (url?: string) => {
  if (!url) return "";

  if (!url.includes("drive.google.com")) return url;

  let fileId = "";

  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (match1 && match1[1]) fileId = match1[1];
  if (match2 && match2[1]) fileId = match2[1];

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return url;
};

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
  sheetProducts[0]?.categoryTypes?.[0]?.productUsageId || null;

const productFamilyId =
  sheetProducts[0]?.productFamilies?.[0]?.productFamilyId || null;

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

      /* ================= COMMERCIAL DETAILS ================= */

      /*
EXPECTED FORMAT

                Packaging Details (cm)

COMMERCIAL DETAILS                       DETAILS

Unit Cost | Length | Width | Height | pcs/carton | Factory Address | Port of Discharge
*/

      const commercialSpecs = [
        "Unit Cost",
        "Length",
        "Width",
        "Height",
        "pcs/carton",
        "Factory Address",
        "Port of Discharge",
      ];

      /* HEADER STRUCTURE */

      header1.push(
        "Unit Cost",
        "Length",
        "Width",
        "Height",
        "pcs/carton",
        "Factory Address",
        "Port of Discharge",
      );

      header2.push("COMMERCIAL DETAILS", "", "", "", "", "", "");

      header3.push("", "Packaging Details (cm)", "", "", "", "", "");

      ws.addRow(header1);
      ws.addRow(header2);
      ws.addRow(header3);

      /* MERGE STRUCTURE */

      const cdStart = header1.length - 6;
      const cdEnd = header1.length;

      /* COMMERCIAL DETAILS */
      ws.mergeCells(2, cdStart, 2, cdEnd);

      /* Packaging Details (cm) */
      ws.mergeCells(3, cdStart + 1, 3, cdStart + 3);

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

      /* ================= STYLE COMMERCIAL DETAILS ================= */

      for (let col = cdStart; col <= cdEnd; col++) {
        const headerCell = ws.getRow(1).getCell(col);
        const groupCell = ws.getRow(2).getCell(col);
        const subGroupCell = ws.getRow(3).getCell(col);

        const purple = "D9D2E9"; // Light Purple 3

        headerCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: purple },
        };

        groupCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: purple },
        };

        subGroupCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: purple },
        };

        headerCell.font = { bold: true };

        groupCell.font = { bold: true };

        subGroupCell.font = {
          bold: true,
          italic: true,
        };

        headerCell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };

        groupCell.alignment = {
          vertical: "middle",
          horizontal: "center",
        };

        subGroupCell.alignment = {
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
        row.push(product.supplier?.supplierBrand || "");

let imageURL = product.mainImage?.url || "";

/* CTRL + F: FIX GOOGLE DRIVE IMAGE */
imageURL = convertDriveToThumbnail(imageURL);

        row.push(imageURL);

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

        /* ================= COMMERCIAL DETAILS DATA ================= */

        const cd = product.commercialDetails || {};

        row.push(cd.unitCost || "");
        row.push(cd.packaging?.length || "");
        row.push(cd.packaging?.width || "");
        row.push(cd.packaging?.height || "");
        row.push(cd.pcsPerCarton || "");
        row.push(cd.factoryAddress || "");
        row.push(cd.portOfDischarge || "");
        ws.addRow(row);
      });

const specStartCol = staticColumns.length + 1;
const specEndCol = ws.columnCount - 7; // before commercial details

for (let row = 4; row <= ws.rowCount; row++) {
  for (let col = specStartCol; col <= specEndCol; col++) {
    const cell = ws.getRow(row).getCell(col);

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
  }
}

/* CTRL + F: DISABLE ROW MERGING */
const mergeColumns = ws.columnCount;

for (let row = 4; row <= ws.rowCount; row++) {
  for (let col = 1; col <= mergeColumns; col++) {
    const cell = ws.getRow(row).getCell(col);

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
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

      ws.views = [{ state: "frozen", ySplit: 3 }];
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
