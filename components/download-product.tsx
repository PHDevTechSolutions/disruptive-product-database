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

  const classifications = Array.from(
    new Set(products.map((p) => p.classificationName)),
  );

  const GROUP_COLORS = ["BDD7EE", "FFE699"];

  const handleDownload = async () => {
    if (!classification) return;

    const wb = new ExcelJS.Workbook();

    const filteredProducts = products.filter(
      (p) => p.classificationName === classification,
    );

    const sheetMap = new Map<string, any[]>();

    filteredProducts.forEach((p) => {
      const productType = p.productTypes?.[0]?.productTypeName || "Others";

      if (!sheetMap.has(productType)) sheetMap.set(productType, []);

      sheetMap.get(productType)!.push(p);
    });

    for (const [sheetName, sheetProducts] of sheetMap) {
      const ws = wb.addWorksheet(sheetName);

      const groupMap = new Map<string, Set<string>>();

      sheetProducts.forEach((p) => {
        p.technicalSpecifications?.forEach((group: any) => {
          if (!groupMap.has(group.title)) groupMap.set(group.title, new Set());

          group.specs?.forEach((spec: any) => {
            groupMap.get(group.title)!.add(spec.specId);
          });
        });
      });

      /* PRODUCT CODE REMOVED HERE */

      const staticColumns = [
        "Classification",

        "Brand",

        "Category",

        "Category Type",

        "Product Type",

        "Cloudinary URL",

        "Product Name",

        "Supplier",
      ];

      const header1: any[] = [];
      const header2: any[] = [];

      // STATIC
      staticColumns.forEach((col) => {
        header1.push(col); // TOP = static

        header2.push(""); // BOTTOM empty
      });

      // TECH SPECS
      groupMap.forEach((specs, group) => {
        const specArray = Array.from(specs);

        specArray.forEach((specId, index) => {
          header1.push(specId); // TOP = SPEC NAME

          if (index === 0)
            header2.push(group); // BOTTOM = GROUP TITLE
          else header2.push("");
        });
      });

      ws.addRow(header1);
      ws.addRow(header2);

      for (let col = 1; col <= staticColumns.length; col++) {
        const cell = ws.getRow(1).getCell(col);

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "4472C4" }, // blue like your image
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

      let colStart = staticColumns.length + 1;

      let groupIndex = 0;

      groupMap.forEach((specs) => {
        const colEnd = colStart + specs.size - 1;

        ws.mergeCells(2, colStart, 2, colEnd);

        const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length];

        for (let col = colStart; col <= colEnd; col++) {
          // ROW 1 COLOR
          const headerCell = ws.getRow(1).getCell(col);

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

          headerCell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };

          // ✅ ROW 2 COLOR (THIS IS THE FIX)
          const groupCell = ws.getRow(2).getCell(col);

          groupCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: color },
          };

          groupCell.font = { bold: true, italic: true };

          groupCell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };

          groupCell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        }

        groupIndex++;

        colStart = colEnd + 1;
      });

      sheetProducts.forEach((product) => {
        const row: any[] = [];

        row.push(product.classificationName || "");

        row.push(product.brandName || "");

        row.push(product.category || "");

        row.push(product.categoryTypes?.[0]?.categoryTypeName || "");

        row.push(product.productTypes?.[0]?.productTypeName || "");

        /* PRODUCT CODE REMOVED HERE */

        row.push(product.mainImage?.url || "");

        row.push(product.productName || "");

        row.push(product.supplier?.company || "");

        groupMap.forEach((specs, group) => {
          const groupData = product.technicalSpecifications?.find(
            (g: any) => g.title === group,
          );

          Array.from(specs).forEach((specId) => {
            const spec = groupData?.specs?.find(
              (s: any) => s.specId === specId,
            );

            row.push(spec?.value || "");
          });
        });

        const newRow = ws.addRow(row);

        // ✅ MIDDLE ALIGN ENTIRE ROW
        newRow.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        });
      });

      const startRow = 3;
      const endRow = ws.rowCount;
      const totalCols = ws.columnCount;

      for (let col = 1; col <= totalCols; col++) {
        let mergeStart = startRow;
        let lastValue = ws.getRow(startRow).getCell(col).value;

        for (let row = startRow + 1; row <= endRow + 1; row++) {
          const currentValue =
            row <= endRow ? ws.getRow(row).getCell(col).value : null;

          const isDifferent =
            currentValue !== lastValue ||
            currentValue === null ||
            currentValue === "";

          if (isDifferent) {
            if (
              row - mergeStart > 1 &&
              lastValue !== null &&
              lastValue !== ""
            ) {
              ws.mergeCells(mergeStart, col, row - 1, col);

              ws.getCell(mergeStart, col).alignment = {
                vertical: "middle",
                horizontal: "center",
              };
            }

            mergeStart = row;
            lastValue = currentValue;
          }
        }
      }

      ws.columns.forEach((column) => {
        let max = 15;

        if (column.eachCell) {
          column.eachCell({ includeEmpty: true }, (cell) => {
            const len = cell.value ? cell.value.toString().length : 0;

            if (len > max) max = len;
          });
        }

        column.width = max + 4;
      });

      ws.views = [{ state: "frozen", ySplit: 2 }];
    }

    const buffer = await wb.xlsx.writeBuffer();

    saveAs(new Blob([buffer]), `${classification}.xlsx`);

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