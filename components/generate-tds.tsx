"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import GenerateTDSBrand from "@/components/generate-tds-brand";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  dimensionalDrawing?: { url: string };
  illuminanceDrawing?: { url: string };
  technicalSpecifications?: TechnicalSpecification[];
  defaultBrand?: string;
  onBrandChange?: (brand: string) => void;
};

export default function GenerateTDS({
  open,
  onClose,
  mainImage,
  dimensionalDrawing,
  illuminanceDrawing,
  technicalSpecifications,
  defaultBrand = "",
  onBrandChange,
}: Props) {
  const [selectedBrand, setSelectedBrand] = useState(defaultBrand);

  useEffect(() => {
    setSelectedBrand(defaultBrand);
  }, [defaultBrand]);
  const [itemCode, setItemCode] = useState("");
  const [productName, setProductName] = useState("");
  const [hideEmptySpecs, setHideEmptySpecs] = useState(true);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  const [uploadedDimensionalDrawing, setUploadedDimensionalDrawing] =
    useState<File | null>(null);
  const [uploadedIlluminanceLevel, setUploadedIlluminanceLevel] =
    useState<File | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleDimensionalDrawingChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files) {
      setUploadedDimensionalDrawing(event.target.files[0]);
    }
  };

  const handleIlluminanceLevelChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files) {
      setUploadedIlluminanceLevel(event.target.files[0]);
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
      pdf.addImage("/ecoshift-header.png", "PNG", 0, 0, pageWidth, headerHeight);
    }

    /* ================= PRODUCT IMAGE ================= */
    const boxWidth = 150 * scaleFactor;
    const boxHeight = 120 * scaleFactor;
    const imageX = pageWidth / 2 - boxWidth - 60;
    const imageY = y;

    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1.5);
    pdf.rect(imageX, imageY, boxWidth, boxHeight);

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
      await new Promise((resolve) => { img.onload = resolve; });

      const imgWidth = img.width;
      const imgHeight = img.height;
      const padding = 10;
      const ratio = Math.min(
        (boxWidth - padding * 2) / imgWidth,
        (boxHeight - padding * 2) / imgHeight,
      );
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      const centeredX = imageX + (boxWidth - finalWidth) / 2;
      const centeredY = imageY + (boxHeight - finalHeight) / 2;

      pdf.addImage(imgData, "PNG", centeredX, centeredY, finalWidth, finalHeight);
    }

    /* ================= BUILD TABLE ================= */
    const filterSpecValue = (value?: string) => {
      if (!value) return "";
      const activeFilters = (window as any).__ACTIVE_FILTERS__ || [];
      const values = value.split("|").map((v) => v.trim()).filter(Boolean);
      const uniqueValues = Array.from(new Set(values));
      if (uniqueValues.length === 0) return "";
      if (activeFilters.length === 0) return uniqueValues.join(" | ");
      const filtered = uniqueValues.filter((v) => activeFilters.includes(v));
      return filtered.length ? filtered.join(" | ") : uniqueValues.join(" | ");
    };

    const tableRows: any[] = [];

    tableRows.push([
      "Brand :",
      { content: selectedBrand.toUpperCase(), styles: { fontStyle: "bold" } },
    ]);
    tableRows.push(["Item Code :", itemCode]);

    technicalSpecifications
      ?.filter((group) => group.title !== "COMMERCIAL DETAILS")
      .forEach((group) => {
        const specsToRender = hideEmptySpecs
          ? group.specs.filter((spec) => {
              const hasValue =
                spec.value && typeof spec.value === "string" && spec.value.trim() !== "";
              return hasValue;
            })
          : group.specs;

        if (hideEmptySpecs && specsToRender.length === 0) return;

        tableRows.push([
          {
            content: group.title,
            colSpan: 2,
            styles: { fillColor: [210, 215, 220], fontStyle: "bold" },
          },
        ]);

        specsToRender.forEach((spec) => {
          const filteredValue = filterSpecValue(spec.value);
          tableRows.push([spec.specId ? spec.specId + " :" : "", filteredValue || ""]);
        });
      });

    /* ================= AUTO SCALE TO 1 PAGE ================= */
    const DRAWING_BLOCK_HEIGHT = 230;
    const FOOTER_REAL_HEIGHT = 90;
    const SAFE_MARGIN = 20;

    const maxTableHeight =
      pageHeight - FOOTER_REAL_HEIGHT - DRAWING_BLOCK_HEIGHT - SAFE_MARGIN - y;

    let fontSize = 11;
    scaleFactor = 1;
    let tableHeight = 0;

    while (fontSize > 6) {
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
      fontSize -= 0.4;
      scaleFactor = fontSize / 9;
    }

    /* ================= TITLE ================= */
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);

    const gap = 60 * scaleFactor;
    const textColumnX = imageX + boxWidth + gap;
    const textColumnWidth = boxWidth + 40;

    const title = productName || "Product Name";
    let titleFontSize = 24 * scaleFactor;
    let titleLines: string[] = [];

    while (true) {
      pdf.setFontSize(titleFontSize);
      titleLines = pdf.splitTextToSize(title, textColumnWidth);
      if (titleLines.length <= 2) break;
      titleFontSize -= 1;
      if (titleFontSize <= 12) break;
    }

    pdf.setFontSize(titleFontSize);

    const lineY = imageY + boxHeight - 20;
    const productTitleY = lineY - titleLines.length * 14 - 4;

    const centerX = textColumnX + textColumnWidth / 2;
    pdf.text(titleLines, centerX, productTitleY, { maxWidth: textColumnWidth, align: "center" });

    const underlineWidth = textColumnWidth * 1.25;
    const lineStartX = centerX - underlineWidth / 2;
    const lineEndX = centerX + underlineWidth / 2;
    pdf.setLineWidth(0.8);
    pdf.line(lineStartX, lineY, lineEndX, lineY);

    y += 135;
    const tableWidth = 450;
    const tableX = (pageWidth - tableWidth) / 2;

    autoTable(pdf, {
      startY: y,
      theme: "grid",
      pageBreak: "avoid",
      tableWidth: tableWidth,
      margin: { left: tableX },
      styles: { fontSize, cellPadding: 2, overflow: "linebreak" },
      body: tableRows,
      columnStyles: { 0: { cellWidth: 230 }, 1: { cellWidth: 220 } },
    });

    /* ================= DRAWINGS ================= */
    const dimensionalSource = uploadedDimensionalDrawing || dimensionalDrawing;
    const illuminanceSource = uploadedIlluminanceLevel || illuminanceDrawing;

    // Only show drawings section if at least one exists
    if (dimensionalSource || illuminanceSource) {
      const tableEndY = (pdf as any).lastAutoTable.finalY;
      const drawingY = tableEndY + 35 * scaleFactor;
      const drawingWidth = 190 * scaleFactor;
      const drawingHeight = 95 * scaleFactor;
      const gapBetween = 60 * scaleFactor;

      pdf.setFontSize(11 * scaleFactor);
      pdf.setFont("helvetica", "bold");

      const hasBoth = dimensionalSource && illuminanceSource;

      if (hasBoth) {
        // Side by side
        const totalWidth = drawingWidth * 2 + gapBetween;
        const startX = (pageWidth - totalWidth) / 2;

        pdf.text("Dimensional Drawing", startX + drawingWidth / 2, drawingY - 10, { align: "center" });
        pdf.text(
          "Illuminance Level",
          startX + drawingWidth + gapBetween + drawingWidth / 2,
          drawingY - 10,
          { align: "center" },
        );

        let img: string;
        if (dimensionalSource instanceof File) {
          img = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(dimensionalSource);
          });
        } else {
          const converted = convertDriveToThumbnail(dimensionalSource.url);
          const proxyUrl = `/api/gdrive-image?url=${encodeURIComponent(converted)}`;
          img = await fetch(proxyUrl)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                }),
            );
        }
        pdf.addImage(img, "PNG", startX, drawingY, drawingWidth, drawingHeight);

        let img2: string;
        if (illuminanceSource instanceof File) {
          img2 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(illuminanceSource);
          });
        } else {
          const converted = convertDriveToThumbnail(illuminanceSource.url);
          const proxyUrl = `/api/gdrive-image?url=${encodeURIComponent(converted)}`;
          img2 = await fetch(proxyUrl)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                }),
            );
        }
        pdf.addImage(
          img2,
          "PNG",
          startX + drawingWidth + gapBetween,
          drawingY,
          drawingWidth,
          drawingHeight,
        );
      } else if (dimensionalSource) {
        // Only dimensional - center it
        const startX = (pageWidth - drawingWidth) / 2;
        pdf.text("Dimensional Drawing", startX + drawingWidth / 2, drawingY - 10, { align: "center" });

        let img: string;
        if (dimensionalSource instanceof File) {
          img = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(dimensionalSource);
          });
        } else {
          const converted = convertDriveToThumbnail(dimensionalSource.url);
          const proxyUrl = `/api/gdrive-image?url=${encodeURIComponent(converted)}`;
          img = await fetch(proxyUrl)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                }),
            );
        }
        pdf.addImage(img, "PNG", startX, drawingY, drawingWidth, drawingHeight);
      } else if (illuminanceSource) {
        // Only illuminance - center it
        const startX = (pageWidth - drawingWidth) / 2;
        pdf.text("Illuminance Level", startX + drawingWidth / 2, drawingY - 10, { align: "center" });

        let img: string;
        if (illuminanceSource instanceof File) {
          img = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(illuminanceSource);
          });
        } else {
          const converted = convertDriveToThumbnail(illuminanceSource.url);
          const proxyUrl = `/api/gdrive-image?url=${encodeURIComponent(converted)}`;
          img = await fetch(proxyUrl)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(blob);
                }),
            );
        }
        pdf.addImage(img, "PNG", startX, drawingY, drawingWidth, drawingHeight);
      }
    }

    /* ================= FOOTER ================= */
    for (const brand of ["Lit", "Lumera", "Ecoshift"]) {
      if (selectedBrand === brand) {
        const key = brand.toLowerCase();
        const footerImg = new Image();
        footerImg.src = `/${key}-footer.png`;
        await new Promise((resolve) => { footerImg.onload = resolve; });
        const ratio = pageWidth / footerImg.width;
        const finalHeight = footerImg.height * ratio;
        pdf.addImage(
          `/${key}-footer.png`,
          "PNG",
          0,
          pageHeight - finalHeight,
          pageWidth,
          finalHeight,
        );
      }
    }

    pdf.save(`${productName || "Product"}-${itemCode || "Item"}-TDS.pdf`);
  };

  if (!open) return null;

  return (
    <div className="flex flex-col bg-white fixed inset-0 z-50 md:relative md:inset-auto md:z-auto md:h-full">
      {/* ── HEADER ── */}
      <div className="border-b px-4 py-3 flex justify-between items-center shrink-0 bg-white">
        <h2 className="text-base font-semibold">Generate TDS</h2>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-y-auto bg-gray-100 pb-[80px] md:pb-4">

        {/* BRAND SELECT */}
        <div className="m-3 bg-white rounded-xl shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold">Select Brand</p>
          <div className="flex gap-4 flex-wrap">
            {["Lit", "Lumera", "Ecoshift"].map((brand) => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={brand}
                  checked={selectedBrand === brand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                onBrandChange?.(e.target.value);
              }}
                  className="accent-gray-800"
                />
                <span className="text-sm">{brand}</span>
              </label>
            ))}
          </div>
        </div>

        {!selectedBrand && (
          <div className="text-center text-sm text-muted-foreground py-10">
            Please select a brand first to continue.
          </div>
        )}

        {selectedBrand && (
          <div className="space-y-3 px-3">

            {/* PRODUCT NAME */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <p className="text-sm font-semibold">Product Name</p>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name..."
                className="w-full border rounded-lg h-10 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>

            {/* ITEM CODE */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <p className="text-sm font-semibold">Item Code</p>
              <input
                type="text"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Enter item code..."
                className="w-full border rounded-lg h-10 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>

            {/* DRAWINGS — side by side on mobile too */}
            <div className="grid grid-cols-2 gap-3">
              {/* Dimensional Drawing */}
              <div className="bg-white rounded-xl shadow-sm p-3 space-y-2">
                <p className="text-xs font-semibold">Dimensional Drawing</p>
                {(uploadedDimensionalDrawing || dimensionalDrawing) && (
                  <img
                    src={
                      uploadedDimensionalDrawing
                        ? URL.createObjectURL(uploadedDimensionalDrawing)
                        : convertDriveToThumbnail(dimensionalDrawing!.url)
                    }
                    className="w-full h-[80px] object-contain border rounded-lg"
                  />
                )}
                <label className="flex items-center justify-center h-9 border-2 border-dashed rounded-lg cursor-pointer text-xs text-gray-400 hover:border-blue-400 transition bg-gray-50">
                  Replace image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDimensionalDrawingChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Illuminance Level */}
              <div className="bg-white rounded-xl shadow-sm p-3 space-y-2">
                <p className="text-xs font-semibold">Illuminance Level</p>
                {(uploadedIlluminanceLevel || illuminanceDrawing) && (
                  <img
                    src={
                      uploadedIlluminanceLevel
                        ? URL.createObjectURL(uploadedIlluminanceLevel)
                        : convertDriveToThumbnail(illuminanceDrawing!.url)
                    }
                    className="w-full h-[80px] object-contain border rounded-lg"
                  />
                )}
                <label className="flex items-center justify-center h-9 border-2 border-dashed rounded-lg cursor-pointer text-xs text-gray-400 hover:border-blue-400 transition bg-gray-50">
                  Replace image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIlluminanceLevelChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* HIDE EMPTY SPECS TOGGLE */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideEmptySpecs}
                  onChange={(e) => setHideEmptySpecs(e.target.checked)}
                  className="w-4 h-4 accent-gray-800"
                />
                <span className="text-sm font-medium">
                  {hideEmptySpecs ? "Hide empty specs (ON)" : "Show all specs (OFF)"}
                </span>
              </label>
            </div>

            {/* PREVIEW — collapsible on mobile */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setPreviewCollapsed((p) => !p)}
                className="w-full flex items-center justify-between px-4 py-3 border-b"
              >
                <span className="text-sm font-semibold">TDS Preview</span>
                {previewCollapsed
                  ? <ChevronDown className="h-4 w-4 text-gray-500" />
                  : <ChevronUp className="h-4 w-4 text-gray-500" />}
              </button>

              {!previewCollapsed && (
                <div className="overflow-x-auto p-3">
                  <div className="min-w-[340px]">
                    <GenerateTDSBrand
                      ref={previewRef}
                      open={true}
                      company={selectedBrand as "Lit" | "Lumera" | "Ecoshift"}
                      productName={productName}
                      itemCode={itemCode}
                      mainImage={mainImage}
                      technicalSpecifications={technicalSpecifications}
                      dimensionalDrawing={uploadedDimensionalDrawing || dimensionalDrawing}
                      illuminanceLevel={uploadedIlluminanceLevel || illuminanceDrawing}
                      hideEmptySpecs={hideEmptySpecs}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── FOOTER BUTTONS — fixed on mobile, normal on desktop ── */}
      <div
        className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto border-t px-4 py-3 flex justify-end gap-2 bg-white shrink-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <Button
          onClick={downloadPDF}
          disabled={!selectedBrand}
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 flex-1 md:flex-none rounded-xl h-11 md:h-9"
        >
          Download PDF
        </Button>
        <Button
          variant="secondary"
          onClick={onClose}
          className="flex-1 md:flex-none rounded-xl h-11 md:h-9"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
