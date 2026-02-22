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

    /* ================= CREATE WORKBOOK ================= */

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Products");

    /* ================= COLLECT SPEC GROUPS ================= */

    const specGroups = new Map<string, Set<string>>();

    products.forEach((p) => {
      p.technicalSpecifications?.forEach((g: any) => {
        if (!specGroups.has(g.title))
          specGroups.set(g.title, new Set());

        g.specs?.forEach((s: any) =>
          specGroups.get(g.title)!.add(s.specId)
        );
      });
    });

    /* ================= FIND MAX GALLERY ================= */

    let maxGallery = 0;

    products.forEach((p) => {
      if (p.gallery?.length > maxGallery)
        maxGallery = p.gallery.length;
    });

    /* ================= FIND MAX MULTI DIMENSIONS ================= */

    let maxMulti = 0;

    products.forEach((p) => {
      if (
        p.logistics?.calculationType === "LIGHTS" &&
        p.logistics?.useArrayInput
      ) {
        const count =
          p.logistics?.multiDimensions?.length || 0;

        if (count > maxMulti)
          maxMulti = count;
      }
    });

    /* ================= BUILD HEADERS ================= */

    const header1: any[] = [];
    const header2: any[] = [];

    header1.push("Sister Company"); header2.push("");
    header1.push("Classification"); header2.push("");
    header1.push("Category Type"); header2.push("");
    header1.push("Product Type"); header2.push("");

    header1.push("Model No."); header2.push("");
    header1.push("Supplier Company"); header2.push("");
    header1.push("Main Image URL"); header2.push("");

    /* GALLERY */

    if (maxGallery > 0) {

      header1.push("Gallery URLs");
      header2.push("Image 1");

      for (let i = 1; i < maxGallery; i++) {
        header1.push("");
        header2.push(`Image ${i + 1}`);
      }

    }

    /* TECH SPECS */

    specGroups.forEach((specs, group) => {

      const arr = Array.from(specs);

      header1.push(group);
      header2.push(arr[0]);

      for (let i = 1; i < arr.length; i++) {

        header1.push("");
        header2.push(arr[i]);

      }

    });

/* LOGISTICS */

const logisticsStart = header1.length + 1;

header1.push("Pricing / Logistics");

const logisticsCols = [

  "Calculation Type",
  "Category",

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
  "Warranty"

);

/* EXACT SAME AS OLD VERSION */

header2.push(logisticsCols[0]);

for (let i = 1; i < logisticsCols.length; i++) {

  header1.push("");
  header2.push(logisticsCols[i]);

}



    ws.addRow(header1);
    ws.addRow(header2);

    /* ================= INSERT DATA ================= */

    products.forEach((p) => {

      const row: any[] = [];

      row.push(p.sisterCompanyName || "");
      row.push(p.classificationName || "");
      row.push(p.categoryTypes?.[0]?.categoryTypeName || "");
      row.push(p.productTypes?.[0]?.productTypeName || "");

      row.push(p.productName || "");
      row.push(p.supplier?.company || "");
      row.push(p.mainImage?.url || "");

      /* GALLERY */

      for (let i = 0; i < maxGallery; i++)
        row.push(p.gallery?.[i]?.url || "");

      /* TECH SPECS */

      specGroups.forEach((specs, group) => {

        Array.from(specs).forEach(specId => {

          const g =
            p.technicalSpecifications?.find(
              (x: any) => x.title === group
            );

          const s =
            g?.specs?.find(
              (x: any) => x.specId === specId
            );

          row.push(getSpecValue(s));

        });

      });

      /* LOGISTICS */

      const calcType =
        p.logistics?.calculationType || "";

      row.push(calcType);
      row.push(p.logistics?.category || "");

      if (calcType === "LIGHTS" && !p.logistics?.useArrayInput) {

        row.push(
          p.logistics?.unitCost || "",
          p.logistics?.packaging?.length || "",
          p.logistics?.packaging?.width || "",
          p.logistics?.packaging?.height || "",
          p.logistics?.packaging?.qtyPerCarton || ""
        );

      }

      else {

        row.push("", "", "", "", "");

      }

      if (calcType === "LIGHTS" && p.logistics?.useArrayInput) {

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

        for (let i = 0; i < maxMulti; i++)
          row.push("", "", "", "", "", "");

      }

      if (calcType === "POLE") {

        row.push(
          p.logistics?.unitCost || "",
          p.logistics?.qtyPerContainer || ""
        );

      }

      else {

        row.push("", "");

      }

      row.push(
        p.logistics?.landedCost || "",
        p.logistics?.srp || "",
        p.logistics?.moq || "",
        `${p.logistics?.warranty?.value || ""} ${p.logistics?.warranty?.unit || ""}`
      );

      ws.addRow(row);

    });

    /* ================= SAVE FILE ================= */

    const buffer = await wb.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer]),
      "Products.xlsx"
    );

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

          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >

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