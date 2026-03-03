import { useState } from "react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
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

  // State for Dimensional Drawing and Illuminance Level images
  const [dimensionalDrawing, setDimensionalDrawing] = useState<File | null>(null);
  const [illuminanceLevel, setIlluminanceLevel] = useState<File | null>(null);

  const handleDimensionalDrawingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setDimensionalDrawing(event.target.files[0]);
    }
  };

  const handleIlluminanceLevelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setIlluminanceLevel(event.target.files[0]);
    }
  };

  // Function to download the PDF
  const downloadPDF = () => {
    const doc = new jsPDF();

    const headerImage = selectedBrand === "Lit" ? "/lit-header.png" : "/lumera-header.png";
    const footerImage = selectedBrand === "Lit" ? "/lit-footer.png" : "/lumera-footer.png";

    // Set margins
    const margin = 10;

    // Header Section
    doc.addImage(headerImage, "PNG", margin, margin, 180, 40);

    // Product Info Section
    doc.setFontSize(14);
    doc.text(`Product Name: ${productName}`, margin, 60);
    doc.text(`Item Code: ${itemCode}`, margin, 70);

    // Technical Specifications
    let yPosition = 80;
    if (technicalSpecifications) {
      technicalSpecifications.forEach((specGroup) => {
        doc.setFontSize(12);
        doc.text(specGroup.title, margin, yPosition); // Title of technical specifications
        yPosition += 10;

        specGroup.specs.forEach((spec) => {
          doc.text(`${spec.specId}: ${spec.value}`, margin + 10, yPosition); // Technical specification details
          yPosition += 10;
        });
      });
    }

    // Dimensional Drawing Image
    if (dimensionalDrawing) {
      const imgURL = URL.createObjectURL(dimensionalDrawing);
      doc.addImage(imgURL, "JPEG", margin, yPosition, 60, 40); // Dimensional Drawing image placement
      yPosition += 50;
    }

    // Illuminance Level Image
    if (illuminanceLevel) {
      const imgURL = URL.createObjectURL(illuminanceLevel);
      doc.addImage(imgURL, "JPEG", margin + 70, yPosition, 60, 40); // Illuminance Level image placement
      yPosition += 50;
    }

    // Footer Section
    doc.addImage(footerImage, "PNG", margin, 250, 180, 40);

    // Save the PDF
    doc.save(`${productName}-${itemCode}-TDS.pdf`);
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

        <div className="space-y-3">
          <p className="text-sm font-semibold">Select Brand</p>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="Lit"
              checked={selectedBrand === "Lit"}
              onChange={(e) => setSelectedBrand(e.target.value)}
            />
            Lit
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="Lumera"
              checked={selectedBrand === "Lumera"}
              onChange={(e) => setSelectedBrand(e.target.value)}
            />
            Lumera
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="Ecoshift"
              checked={selectedBrand === "Ecoshift"}
              onChange={(e) => setSelectedBrand(e.target.value)}
            />
            Ecoshift
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Dimensional Drawing</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleDimensionalDrawingChange}
            className="w-full border rounded-md h-10 px-3 text-sm bg-white"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Illuminance Level</p>
          <input
            type="file"
            accept="image/*"
            onChange={handleIlluminanceLevelChange}
            className="w-full border rounded-md h-10 px-3 text-sm bg-white"
          />
        </div>

        <div className="flex justify-center">
          {!selectedBrand && (
            <div className="text-muted-foreground text-sm">
              Select brand to preview TDS
            </div>
          )}

          {selectedBrand && (
            <GenerateTDSBrand
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

      <div className="border-t px-6 py-4 flex justify-end gap-2">
        <Button onClick={downloadPDF} className="bg-green-600 hover:bg-green-700 text-white">
          Download PDF
        </Button>

        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}