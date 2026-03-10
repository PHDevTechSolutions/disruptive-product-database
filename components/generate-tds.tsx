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

const convertDriveToThumbnail = (url: string) => {
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
  const [hideEmptySpecs, setHideEmptySpecs] = useState(true);

  const [dimensionalDrawing, setDimensionalDrawing] = useState<File | null>(
    null,
  );
  const [illuminanceLevel, setIlluminanceLevel] = useState<File | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleDimensionalDrawingChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files) {
      setDimensionalDrawing(event.target.files[0]);
    }
  };

  const handleIlluminanceLevelChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files) {
      setIlluminanceLevel(event.target.files[0]);
    }
  };

  const downloadPDF = async () => {
    const pdf = new jsPDF("p", "pt", "a4");
    let scaleFactor = 1;

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const headerHeight = 100;
    const footerHeight = 30;

    let y = headerHeight + 20;

    /* ================= HEADER ================= */
    if (selectedBrand === "Lit") {
      pdf.addImage("/lit-header.png", "PNG", 0, 0, pageWidth, headerHeight);
    }
    if (selectedBrand === "Lumera") {
      pdf.addImage("/lumera-header.png", "PNG", 0, 0, pageWidth, headerHeight);
    }

    if (selectedBrand === "Ecoshift") {
      pdf.addImage(
        "/ecoshift-header.png",
        "PNG",
        0,
        0,
        pageWidth,
        headerHeight,
      );
    }
    /* ================= PRODUCT IMAGE ================= */

    const boxWidth = 150 * scaleFactor;
    const boxHeight = 120 * scaleFactor;
    const imageX = pageWidth / 2 - boxWidth - 60;
    const imageY = y;

    /* ===== DRAW BORDER BOX (LIKE PREVIEW) ===== */
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1.5);
    pdf.rect(imageX, imageY, boxWidth, boxHeight);

    /* ===== INSERT IMAGE INSIDE BOX ===== */
    if (mainImage?.url) {
const convertedImage = convertDriveToThumbnail(mainImage.url);

const proxyUrl = `/api/gdrive-image?url=${encodeURIComponent(convertedImage)}`;

const imgData = await fetch(proxyUrl)
  .then((r) => r.blob())
  .then(
    (blob) =>
      new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }),
  );

      const img = new Image();
      img.src = imgData;

      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgWidth = img.width;
      const imgHeight = img.height;

      const padding = 10; // space inside box

      const ratio = Math.min(
        (boxWidth - padding * 2) / imgWidth,
        (boxHeight - padding * 2) / imgHeight,
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
        finalHeight,
      );
    }

    /* ================= TITLE ================= */
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);

    /* ================= BUILD TABLE ================= */

const filterSpecValue = (value?: string) => {
  if (!value) return "";

  const activeFilters = (window as any).__ACTIVE_FILTERS__ || [];

  const values = value
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);

  // 🔥 remove duplicates
  const uniqueValues = Array.from(new Set(values));

  if (uniqueValues.length === 0) return "";

  if (activeFilters.length === 0) {
    return uniqueValues.join(" | ");
  }

  const filtered = uniqueValues.filter((v) => activeFilters.includes(v));

  return filtered.length ? filtered.join(" | ") : uniqueValues.join(" | ");
};
    const tableRows: any[] = [];

    tableRows.push([
      "Brand :",
      {
        content: selectedBrand.toUpperCase(),
        styles: { fontStyle: "bold" },
      },
    ]);
    tableRows.push(["Item Code :", itemCode]);

    technicalSpecifications
      ?.filter((group) => group.title !== "COMMERCIAL DETAILS")
      .forEach((group) => {
        // Decide which specs to render based on toggle
        const specsToRender = hideEmptySpecs
          ? group.specs.filter((spec) => {
              const hasValue =
                spec.value &&
                typeof spec.value === "string" &&
                spec.value.trim() !== "";
              return hasValue;
            })
          : group.specs;

        // If ON and no valid specs → remove entire group
        if (hideEmptySpecs && specsToRender.length === 0) return;

        // Add group title
        tableRows.push([
          {
            content: group.title,
            colSpan: 2,
            styles: {
              fillColor: [210, 215, 220],
              fontStyle: "bold",
            },
          },
        ]);

        // Add specs
specsToRender.forEach((spec) => {
  const filteredValue = filterSpecValue(spec.value);

  tableRows.push([
    spec.specId ? spec.specId + " :" : "",
    filteredValue || "",
  ]);
});
      });

    /* ================= AUTO SCALE TO 1 PAGE ================= */

    const DRAWING_BLOCK_HEIGHT = 230;
    const FOOTER_REAL_HEIGHT = 90;
    const SAFE_MARGIN = 20;

    const maxTableHeight =
      pageHeight - FOOTER_REAL_HEIGHT - DRAWING_BLOCK_HEIGHT - SAFE_MARGIN - y;

    let fontSize = 9;
    scaleFactor = 1;
    let tableHeight = 0;

    while (fontSize > 4) {
      const testPdf = new jsPDF("p", "pt", "a4");

      autoTable(testPdf, {
        startY: y,
        theme: "grid",
        styles: { fontSize, cellPadding: 2 },
        body: tableRows,
        tableWidth: 450,
        pageBreak: "avoid",
      });

      const finalY = (testPdf as any).lastAutoTable.finalY;
      tableHeight = finalY - y;

      if (tableHeight <= maxTableHeight) break;

      fontSize -= 0.4; // shrink table gradually
      scaleFactor = fontSize / 9;
    }

    /* ================= CENTER TABLE ================= */

    /* ================= TITLE ================= */
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);

    const gap = 60 * scaleFactor;
    const textColumnX = imageX + boxWidth + gap;
    const textColumnWidth = boxWidth + 40; // adjust width of right side

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18 * scaleFactor);

    /* ================= PRODUCT NAME AUTO SHRINK + RISE UP ================= */

    const title = productName || "Product Name";

    let titleFontSize = 20 * scaleFactor;
    let titleLines: string[] = [];

    /* AUTO SHRINK UNTIL MAX 2 LINES */
    while (true) {
      pdf.setFontSize(titleFontSize);
      titleLines = pdf.splitTextToSize(title, textColumnWidth);

      if (titleLines.length <= 2) break;

      titleFontSize -= 1;
      if (titleFontSize <= 12) break;
    }

    pdf.setFontSize(titleFontSize);

    /* DOUBLE LINE POSITION (FIXED) */
    const lineY = imageY + boxHeight - 10;

    /* TEXT STARTS ABOVE THE LINE */
    const lineHeight = 18;
    const productTitleY = lineY - titleLines.length * 14 - 2;

    /* DRAW TITLE */
    pdf.text(titleLines, textColumnX, productTitleY, {
      maxWidth: textColumnWidth,
    });

    /* DRAW DOUBLE LINE */
    const underlineWidth = textColumnWidth + 50;

    const lineStartX = textColumnX;
    const lineEndX = textColumnX + underlineWidth;

    pdf.setLineWidth(0.6);
    pdf.line(lineStartX, lineY, lineEndX, lineY);

    pdf.setLineWidth(0.3);
    pdf.line(lineStartX, lineY + 3, lineEndX, lineY + 3);

    y += 135;
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
        cellPadding: 2,
        overflow: "linebreak",
      },
      body: tableRows,
      columnStyles: {
        0: { cellWidth: 230 },
        1: { cellWidth: 220 },
      },
    });

    /* ================= DRAWINGS (INANGAT) ================= */

    /* ================= DRAWINGS (AFTER TABLE - CENTERED) ================= */

    // Get end of table
    const tableEndY = (pdf as any).lastAutoTable.finalY;

    // Space after table (konting gap lang)
    const drawingY = tableEndY + 35 * scaleFactor;

    // Total drawing container width
    const drawingWidth = 220 * scaleFactor;
    const drawingHeight = 120 * scaleFactor;
    const gapBetween = 60 * scaleFactor;
    const totalWidth = drawingWidth * 2 + gapBetween;

    // Center whole drawing group
    const startX = (pageWidth - totalWidth) / 2;

    pdf.setFontSize(9 * scaleFactor);
    pdf.setFont("helvetica", "bold");

    // Centered labels
    pdf.text("Dimensional Drawing", startX + drawingWidth / 2, drawingY - 10, {
      align: "center",
    });

    pdf.text(
      "Illuminance Level",
      startX + drawingWidth + gapBetween + drawingWidth / 2,
      drawingY - 10,
      { align: "center" },
    );

    // Draw images centered under labels
    if (dimensionalDrawing) {
      const img = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(dimensionalDrawing);
      });

      pdf.addImage(img, "PNG", startX, drawingY, drawingWidth, drawingHeight);
    }

    if (illuminanceLevel) {
      const img2 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(illuminanceLevel);
      });

      pdf.addImage(
        img2,
        "PNG",
        startX + drawingWidth + gapBetween,
        drawingY,
        drawingWidth,
        drawingHeight,
      );
    }

    /* ================= FOOTER ================= */

    if (selectedBrand === "Lit") {
      const footerImg = new Image();
      footerImg.src = "/lit-footer.png";

      await new Promise((resolve) => {
        footerImg.onload = resolve;
      });

      const imgWidth = footerImg.width;
      const imgHeight = footerImg.height;

      const ratio = pageWidth / imgWidth;
      const finalHeight = imgHeight * ratio;

      pdf.addImage(
        "/lit-footer.png",
        "PNG",
        0,
        pageHeight - finalHeight,
        pageWidth,
        finalHeight,
      );
    }

    if (selectedBrand === "Lumera") {
      const footerImg = new Image();
      footerImg.src = "/lumera-footer.png";

      await new Promise((resolve) => {
        footerImg.onload = resolve;
      });

      const imgWidth = footerImg.width;
      const imgHeight = footerImg.height;

      const ratio = pageWidth / imgWidth;
      const finalHeight = imgHeight * ratio;

      pdf.addImage(
        "/lumera-footer.png",
        "PNG",
        0,
        pageHeight - finalHeight,
        pageWidth,
        finalHeight,
      );
    }

    if (selectedBrand === "Ecoshift") {
      const footerImg = new Image();
      footerImg.src = "/ecoshift-footer.png";

      await new Promise((resolve) => {
        footerImg.onload = resolve;
      });

      const imgWidth = footerImg.width;
      const imgHeight = footerImg.height;

      const ratio = pageWidth / imgWidth;
      const finalHeight = imgHeight * ratio;

      pdf.addImage(
        "/ecoshift-footer.png",
        "PNG",
        0,
        pageHeight - finalHeight,
        pageWidth,
        finalHeight,
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
        {/* ================= BRAND SELECT (ALWAYS VISIBLE) ================= */}
        <div className="space-y-3 bg-white p-4 rounded-md shadow-sm">
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

        {/* ================= HIDE EVERYTHING UNTIL BRAND SELECTED ================= */}
        {!selectedBrand && (
          <div className="text-center text-sm text-muted-foreground py-10">
            Please select a brand first to continue.
          </div>
        )}

        {selectedBrand && (
          <>
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
            <div className="flex justify-center font-bold text-base mb-3">
              TDS PREVIEW
            </div>
            {/* REMOVE EMPTY SPECIFICATIONS TOGGLE */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Remove Empty Specifications
              </p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideEmptySpecs}
                  onChange={(e) => setHideEmptySpecs(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  {hideEmptySpecs
                    ? "ON - Empty specs hidden"
                    : "OFF - Show all specs"}
                </span>
              </label>
            </div>

            <div className="flex justify-center">
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
                hideEmptySpecs={hideEmptySpecs}
              />
            </div>
          </>
        )}
      </div>

      {/* FOOTER BUTTONS */}
      <div className="border-t px-6 py-4 flex justify-end gap-2">
        <Button
          onClick={downloadPDF}
          disabled={!selectedBrand}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
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
