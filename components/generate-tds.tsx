"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import GenerateTDSBrand from "@/components/generate-tds-brand";

type TechnicalSpecification = {
  title: string;
  specs: {
    specId: string;
    value: string;
  }[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  mainImage?: { url: string };
  technicalSpecifications?: TechnicalSpecification[];
};

export default function GenerateTDS({
  open,
  onClose,
  mainImage,
  technicalSpecifications,
}: Props) {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [productName, setProductName] = useState("");

  const [dimensionalDrawing, setDimensionalDrawing] =
    useState<File | null>(null);
  const [illuminanceLevel, setIlluminanceLevel] =
    useState<File | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleDimensionalDrawingChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      setDimensionalDrawing(event.target.files[0]);
    }
  };

  const handleIlluminanceLevelChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files) {
      setIlluminanceLevel(event.target.files[0]);
    }
  };



const downloadPDF = async () => {
  const pdf = new jsPDF("p", "pt", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const headerHeight = 100;
  const footerHeight = 30;

  let y = headerHeight + 20;

  /* ================= HEADER ================= */
  if (selectedBrand === "Lit") {
    pdf.addImage("/lit-header.png", "PNG", 0, 0, pageWidth, headerHeight);
  }

/* ================= PRODUCT IMAGE ================= */

const boxWidth = 150;
const boxHeight = 120;
const imageX = pageWidth / 2 - boxWidth - 60;
const imageY = y;

/* ===== DRAW BORDER BOX (LIKE PREVIEW) ===== */
pdf.setDrawColor(0, 0, 0);
pdf.setLineWidth(1.5);
pdf.rect(imageX, imageY, boxWidth, boxHeight);

/* ===== INSERT IMAGE INSIDE BOX ===== */
if (mainImage?.url) {
  const imgData = await fetch(mainImage.url)
    .then(r => r.blob())
    .then(
      blob =>
        new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () =>
            resolve(reader.result as string);
          reader.readAsDataURL(blob);
        })
    );

  const img = new Image();
  img.src = imgData;

  await new Promise(resolve => {
    img.onload = resolve;
  });

  const imgWidth = img.width;
  const imgHeight = img.height;

  const padding = 10; // space inside box

  const ratio = Math.min(
    (boxWidth - padding * 2) / imgWidth,
    (boxHeight - padding * 2) / imgHeight
  );

  const finalWidth = imgWidth * ratio;
  const finalHeight = imgHeight * ratio;

  const centeredX = imageX + (boxWidth - finalWidth) / 2;
  const centeredY = imageY + (boxHeight - finalHeight) / 2;

  pdf.addImage(
    imgData,
    "PNG",
    centeredX,
    centeredY,
    finalWidth,
    finalHeight
  );
}

  /* ================= TITLE ================= */
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
pdf.setFont("helvetica", "bold");
pdf.setFontSize(14);

/* ================= TITLE ================= */
pdf.setFont("helvetica", "bold");
pdf.setFontSize(14);

const gap = 60;
const textColumnX = imageX + boxWidth + gap;
const textColumnWidth = boxWidth + 40; // adjust width of right side

pdf.text(
  productName || "Product Name",
  textColumnX + textColumnWidth / 2,
  imageY + boxHeight / 2,
  { align: "center", baseline: "middle" }
);


  y += 130;

  /* ================= BUILD TABLE ================= */

  const tableRows: any[] = [];

  tableRows.push(["Brand :", selectedBrand]);
  tableRows.push(["Item Code :", itemCode]);

  technicalSpecifications?.forEach(group => {
    tableRows.push([
      {
        content: group.title + " :",
        colSpan: 2,
        styles: {
          fillColor: [210, 215, 220],
          fontStyle: "bold",
        },
      },
    ]);

    group.specs.forEach(spec => {
      tableRows.push([spec.specId + " :", spec.value || ""]);
    });
  });

  /* ================= AUTO SCALE ================= */

  const maxTableHeight =
    pageHeight - footerHeight - y - 130;

  let fontSize = 9;

  while (fontSize > 6) {
    const testPdf = new jsPDF("p", "pt", "a4");

    autoTable(testPdf, {
      startY: y,
      theme: "grid",
      styles: { fontSize },
      body: tableRows,
      margin: { left: 0 },
      tableWidth: 450,
    });

    const finalY = (testPdf as any).lastAutoTable.finalY;

    if (finalY - y <= maxTableHeight) break;

    fontSize -= 0.5;
  }

  /* ================= CENTER TABLE ================= */

  const tableWidth = 450;
  const tableX = (pageWidth - tableWidth) / 2;

  autoTable(pdf, {
    startY: y,
    theme: "grid",
    pageBreak: "avoid",
    tableWidth: tableWidth,
    margin: { left: tableX },
    styles: {
      fontSize,
      cellPadding: 3,
    },
    body: tableRows,
    columnStyles: {
      0: { cellWidth: 230 },
      1: { cellWidth: 220 },
    },
  });

  /* ================= DRAWINGS (INANGAT) ================= */

  const drawingY = pageHeight - footerHeight - 140; // 🔥 inangat

  pdf.setFontSize(8);
  pdf.text("Dimensional Drawing", tableX, drawingY - 12);
  pdf.text("Illuminance Level", tableX + 240, drawingY - 12);

  if (dimensionalDrawing) {
    const img = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(reader.result as string);
      reader.readAsDataURL(dimensionalDrawing);
    });

    pdf.addImage(img, "PNG", tableX, drawingY, 120, 80);
  }

  if (illuminanceLevel) {
    const img2 = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(reader.result as string);
      reader.readAsDataURL(illuminanceLevel);
    });

    pdf.addImage(img2, "PNG", tableX + 240, drawingY, 120, 80);
  }

  /* ================= FOOTER ================= */

  if (selectedBrand === "Lit") {
    pdf.addImage(
      "/lit-footer.png",
      "PNG",
      0,
      pageHeight - footerHeight,
      pageWidth,
      footerHeight
    );
  }

  pdf.save(`${productName || "Product"}-${itemCode || "Item"}-TDS.pdf`);
};

  if (!open) return null;

  return (
    <div className="flex flex-col bg-white md:h-full md:relative fixed inset-0 z-50 md:inset-auto md:z-auto">
      <div className="border-b px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Generate TDS</h2>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="p-6 flex-1 overflow-auto space-y-6 bg-gray-100">
        {/* PRODUCT NAME */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Product Name</p>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Enter product name..."
            className="w-full border rounded-md h-10 px-3 text-sm bg-white"
          />
        </div>

        {/* ITEM CODE */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Item Code</p>
          <input
            type="text"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="Enter item code..."
            className="w-full border rounded-md h-10 px-3 text-sm bg-white"
          />
        </div>

        {/* BRAND SELECT */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Select Brand</p>

          {["Lit", "Lumera", "Ecoshift"].map((brand) => (
            <label key={brand} className="flex items-center gap-2">
              <input
                type="radio"
                value={brand}
                checked={selectedBrand === brand}
                onChange={(e) => setSelectedBrand(e.target.value)}
              />
              {brand}
            </label>
          ))}
        </div>

        {/* DIMENSIONAL DRAWING */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Dimensional Drawing</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleDimensionalDrawingChange}
            className="w-full border rounded-md h-10 px-3 text-sm bg-white"
          />
        </div>

        {/* ILLUMINANCE LEVEL */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Illuminance Level</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleIlluminanceLevelChange}
            className="w-full border rounded-md h-10 px-3 text-sm bg-white"
          />
        </div>

        {/* PREVIEW */}
        <div className="flex justify-center">
          {!selectedBrand && (
            <div className="text-muted-foreground text-sm">
              Select brand to preview TDS
            </div>
          )}

          {selectedBrand && (
            <GenerateTDSBrand
              ref={previewRef}
              open={true}
              company={selectedBrand as "Lit" | "Lumera" | "Ecoshift"}
              productName={productName}
              itemCode={itemCode}
              mainImage={mainImage}
              technicalSpecifications={technicalSpecifications}
              dimensionalDrawing={dimensionalDrawing}
              illuminanceLevel={illuminanceLevel}
            />
          )}
        </div>
      </div>

      {/* FOOTER BUTTONS */}
      <div className="border-t px-6 py-4 flex justify-end gap-2">
        <Button
          onClick={downloadPDF}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Download PDF
        </Button>

        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}