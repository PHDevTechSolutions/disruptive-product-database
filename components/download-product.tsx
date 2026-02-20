"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import ExcelJS from "exceljs";
import JSZip from "jszip";
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

    const zip = new JSZip();

    const grouped: Record<string, any[]> = {};

    products.forEach(p => {

      const sister = p.sisterCompanyName || "No Sister";
      const classification = p.classificationName || "No Classification";
      const category = p.categoryTypes?.[0]?.categoryTypeName || "No Category";
      const productType = p.productTypes?.[0]?.productTypeName || "No Product";

      const key = `${sister}|${classification}|${category}|${productType}`;

      if (!grouped[key]) grouped[key] = [];

      grouped[key].push(p);

    });

    for (const key in grouped) {

      const [sister, classification, category, productType] = key.split("|");

      const groupProducts = grouped[key];

      const specGroups = new Map<string, Set<string>>();

      groupProducts.forEach(p => {

        p.technicalSpecifications?.forEach((g: any) => {

          if (!specGroups.has(g.title))
            specGroups.set(g.title, new Set());

          g.specs?.forEach((s: any) =>
            specGroups.get(g.title)!.add(s.specId)
          );

        });

      });

      let maxGallery = 0;

      groupProducts.forEach(p => {
        if (p.gallery?.length > maxGallery)
          maxGallery = p.gallery.length;
      });

      const wb = new ExcelJS.Workbook();

      const ws = wb.addWorksheet("Products");

      const header1: any[] = [];
      const header2: any[] = [];

      header1.push("Model No."); header2.push("");
      header1.push("Supplier Company"); header2.push("");
      header1.push("Main Image URL"); header2.push("");

      const galleryStart = header1.length + 1;

      if (maxGallery > 0) {

        header1.push("Gallery URLs"); header2.push("Image 1");

        for (let i = 1; i < maxGallery; i++) {
          header1.push(""); header2.push(`Image ${i + 1}`);
        }

      }

      specGroups.forEach((specs, group) => {

        const arr = Array.from(specs);

        header1.push(group); header2.push(arr[0] || "");

        for (let i = 1; i < arr.length; i++) {
          header1.push(""); header2.push(arr[i]);
        }

      });

      const logisticsStart = header1.length + 1;

      header1.push("Pricing / Logistics");


/* ================= BUILD DYNAMIC MULTI DIMENSION HEADERS ================= */

let maxMulti = 0;

groupProducts.forEach(p => {

  if (
    p.logistics?.calculationType === "LIGHTS"
    && p.logistics?.useArrayInput
  ) {

    const count =
      p.logistics?.multiDimensions?.length || 0;

    if (count > maxMulti)
      maxMulti = count;

  }

});


const logisticsCols = [

  "Calculation Type",

  // SINGLE
  "Unit Cost (Lights Single)",
  "Length",
  "Width",
  "Height",
  "Qty/Carton",

];


for (let i = 1; i <= maxMulti; i++) {

  logisticsCols.push(

    `Item Name ${i}`,
    `Unit Cost ${i}`,
    `Length ${i}`,
    `Width ${i}`,
    `Height ${i}`,
    `Qty/Carton ${i}`

  );

}


logisticsCols.push(

  "Unit Cost (Pole)",
  "Qty/Container",

  "Landed Cost",
  "SRP",
  "MOQ",
  "Category",
  "Warranty"

);



      header2.push(logisticsCols[0]);

      for (let i = 1; i < logisticsCols.length; i++) {
        header1.push(""); header2.push(logisticsCols[i]);
      }

/* ===== REPLACE HEADER ADD ===== */

ws.addRow(header1);
ws.addRow(header2);

/* ===== ADD EXCEL HEADER FORMATTING ===== */

// HEADER COLORS
const HEADER_COLOR_MAIN = "FF1F4E78"; // dark blue
const HEADER_COLOR_SUB = "FF2E75B6"; // lighter blue

// FORMAT ROW 1 (GROUP HEADERS)
ws.getRow(1).eachCell((cell) => {

  cell.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 12,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_COLOR_MAIN },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

});

// FORMAT ROW 2 (SUB HEADERS)
ws.getRow(2).eachCell((cell) => {

  cell.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_COLOR_SUB },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

});

// FREEZE HEADER
ws.views = [
  {
    state: "frozen",
    ySplit: 2,
  },
];

/* ===== END HEADER FORMAT ===== */

      ws.columns?.forEach(col => {
        col.width = 35;
      });

      if (maxGallery > 0)
        ws.mergeCells(1, galleryStart, 1, galleryStart + maxGallery - 1);

      ws.mergeCells(1, logisticsStart, 1, logisticsStart + logisticsCols.length - 1);

      for (let r = 0; r < groupProducts.length; r++) {

        const p = groupProducts[r];

        const row: any[] = [];

        row.push(p.productName || "");
        row.push(p.supplier?.company || "");
        row.push(p.mainImage?.url || "");

        for (let i = 0; i < maxGallery; i++)
          row.push(p.gallery?.[i]?.url || "");

        specGroups.forEach((specs, group) => {

          Array.from(specs).forEach(specId => {

            const g = p.technicalSpecifications?.find((x: any) => x.title === group);

            const s = g?.specs?.find((x: any) => x.specId === specId);

            row.push(getSpecValue(s));

          });

        });

/* ================= LOGISTICS VALUES ================= */

const calcType = p.logistics?.calculationType || "";

row.push(calcType);

/* LIGHTS SINGLE */

if (calcType === "LIGHTS" && !p.logistics?.useArrayInput) {

  row.push(
    p.logistics?.unitCost || "",
    p.logistics?.packaging?.length || "",
    p.logistics?.packaging?.width || "",
    p.logistics?.packaging?.height || "",
    p.logistics?.packaging?.qtyPerCarton || ""
  );

} else {

  row.push("", "", "", "", "");

}


/* LIGHTS MULTI DIMENSION */

if (
  calcType === "LIGHTS"
  && p.logistics?.useArrayInput
) {

  const multiArray =
    p.logistics?.multiDimensions || [];

  for (let i = 0; i < maxMulti; i++) {

    const multi = multiArray[i];

    row.push(

      multi?.itemName || "",
      multi?.unitCost || "",
      multi?.length || "",
      multi?.width || "",
      multi?.height || "",
      multi?.qtyPerCarton || ""

    );

  }

}

else {

  for (let i = 0; i < maxMulti; i++) {

    row.push("", "", "", "", "", "");

  }

}


/* POLE */

if (calcType === "POLE") {

  row.push(
    p.logistics?.unitCost || "",
    p.logistics?.qtyPerContainer || ""
  );

} else {

  row.push("", "");

}


/* COMMON */

row.push(
  p.logistics?.landedCost || "",
  p.logistics?.srp || "",
p.logistics?.moq || "",

/* ===== ADD CATEGORY EXPORT ===== */
p.logistics?.category || "",

`${p.logistics?.warranty?.value || ""} ${p.logistics?.warranty?.unit || ""}`
  
);

/* ===== REPLACE DATA ROW ADD ===== */

const newRow = ws.addRow(row);

/* ===== ADD DATA FORMAT ===== */

newRow.eachCell((cell) => {

  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
  };

});

/* ===== END DATA FORMAT ===== */

      }

      const buffer = await wb.xlsx.writeBuffer();

      zip
        .folder(sister)!
        .folder(classification)!
        .folder(category)!
        .folder(productType)!
        .file("Products.xlsx", buffer);

    }

    const blob = await zip.generateAsync({ type: "blob" });

    saveAs(blob, "Products.zip");

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
          <DialogTitle>
            Download Products
          </DialogTitle>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button onClick={handleDownload}>
            Download
          </Button>
        </DialogFooter>

      </DialogContent>

    </Dialog>
  );

}
