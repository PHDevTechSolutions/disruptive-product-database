"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  if (!previewRef.current) return;

  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const canvas = await html2canvas(previewRef.current, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    onclone: (clonedDoc) => {
      const all = clonedDoc.querySelectorAll("*");

      all.forEach((el: any) => {
        const style = window.getComputedStyle(el);

        if (style.color.includes("lab")) el.style.color = "#000000";
        if (style.backgroundColor.includes("lab"))
          el.style.backgroundColor = "#ffffff";
        if (style.borderColor.includes("lab"))
          el.style.borderColor = "#000000";
      });
    },
  });

  const imgData = canvas.toDataURL("image/png");

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

// 🔥 FORCE FULL PAGE (REMOVE WHITE BORDER)
const finalWidth = pageWidth;
const finalHeight = pageHeight;

const x = 0;
const y = 0;

  pdf.addImage(imgData, "PNG", x, y, finalWidth, finalHeight);

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