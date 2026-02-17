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

import * as XLSX from "xlsx";

type Props = {
  products: any[];
};

export default function DownloadProduct({ products }: Props) {

  const [open, setOpen] = React.useState(false);


  /* ========================================================= */
  /* CTRL+F: GET SPEC VALUE WITH FORMAT SUPPORT */
  /* ========================================================= */

  const getSpecValue = (row: any) => {

    if (!row) return "";

    if (row.isRating)
      return `IP${row.ipFirst}${row.ipSecond}`;

    if (row.isRanging)
      return `${row.rangeFrom}-${row.rangeTo}`;

    if (row.isDimension)
      return row.slashValues?.join(" x ");

    if (row.isSlashing)
      return row.slashValues?.join(" / ");

    return row.value || "";

  };


  /* ========================================================= */
  /* CTRL+F: GET ALL SPEC LABELS WITH UNIT SUPPORT */
  /* ========================================================= */

  const getAllSpecLabels = (groupProducts: any[]) => {

    const labels = new Map<string, string>();

    groupProducts.forEach((product) => {

      product.technicalSpecifications?.forEach((group: any) => {

        group.specs?.forEach((spec: any) => {

          const unitText =
            spec.unit && spec.unit !== ""
              ? ` (${spec.unit})`
              : "";

          const key =
            `${group.title}|||${spec.specId}`;

          const columnName =
            `${group.title} - ${spec.specId}${unitText}`;

          labels.set(key, columnName);

        });

      });

    });

    return labels;

  };


  /* ========================================================= */
  /* CTRL+F: MAIN DOWNLOAD FUNCTION */
  /* ========================================================= */

  const handleDownload = () => {

    if (!products.length) return;

    const workbook =
      XLSX.utils.book_new();


    /* ========================================================= */
    /* CTRL+F: GROUP PRODUCTS BY FULL HIERARCHY */
    /* ========================================================= */

    const grouped: Record<string, any[]> = {};

    products.forEach((product) => {

      const key =
        `${product.sisterCompanyName || "No Sister"} | ` +
        `${product.classificationName || "No Class"} | ` +
        `${product.categoryTypes?.[0]?.categoryTypeName || "No Category"} | ` +
        `${product.productTypes?.[0]?.productTypeName || "No Product"}`;

      if (!grouped[key])
        grouped[key] = [];

      grouped[key].push(product);

    });


    /* ========================================================= */
    /* CTRL+F: CREATE EXCEL SHEETS */
    /* ========================================================= */

    Object.keys(grouped).forEach((sheetName) => {

      const groupProducts =
        grouped[sheetName];

      const specLabels =
        getAllSpecLabels(groupProducts);


      const data =
        groupProducts.map((product) => {

          const row: any = {

            /* ========================================================= */
            /* CTRL+F: BASIC INFO */
            /* ========================================================= */

            "Sister Company":
              product.sisterCompanyName || "",

            "Classification Type":
              product.classificationName || "",

            "Category Type":
              product.categoryTypes?.[0]?.categoryTypeName || "",

            "Product Type":
              product.productTypes?.[0]?.productTypeName || "",

            "Reference ID":
              product.referenceID || "",

            "Model":
              product.productName || "",

            "Supplier":
              product.supplier?.company || "",

            "Main Image":
              product.mainImage?.url || "",


            /* ========================================================= */
            /* CTRL+F: LOGISTICS */
            /* ========================================================= */

            "Unit Cost USD":
              product.logistics?.unitCost || "",

            "Landed Cost PHP":
              product.logistics?.landedCost || "",

            "SRP PHP":
              product.logistics?.srp || "",

            "MOQ":
              product.logistics?.moq || "",

            "Warranty":
              `${product.logistics?.warranty?.value || ""} ${product.logistics?.warranty?.unit || ""}`,

          };


          /* ========================================================= */
          /* CTRL+F: ADD TECHNICAL SPECIFICATIONS WITH UNIT */
          /* ========================================================= */

          specLabels.forEach((columnName, key) => {

            const [title, specId] =
              key.split("|||");

            const group =
              product.technicalSpecifications?.find(
                (g: any) =>
                  g.title === title
              );

            const spec =
              group?.specs?.find(
                (s: any) =>
                  s.specId === specId
              );

            row[columnName] =
              getSpecValue(spec);

          });


          return row;

        });


      const worksheet =
        XLSX.utils.json_to_sheet(data);


      XLSX.utils.book_append_sheet(

        workbook,

        worksheet,

        sheetName.substring(0, 31)

      );

    });


    /* ========================================================= */
    /* CTRL+F: SAVE FILE */
    /* ========================================================= */

    XLSX.writeFile(

      workbook,

      "Products-Full-Export.xlsx"

    );


    setOpen(false);

  };


  /* ========================================================= */
  /* CTRL+F: UI */
  /* ========================================================= */

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

            Download Products Excel

          </DialogTitle>

        </DialogHeader>


        <DialogFooter>

          <Button

            variant="outline"

            onClick={() => setOpen(false)}

          >

            Cancel

          </Button>


          <Button

            onClick={handleDownload}

          >

            Download Excel

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  );

}
