"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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

  if (!open) return null;

  return (
    <div
      className="
        flex flex-col bg-white
        md:h-full md:relative
        fixed inset-0 z-50
        md:inset-auto md:z-auto
      "
    >
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
/>
          )}

        </div>

      </div>

      <div className="border-t px-6 py-4 flex justify-end gap-2">

        <Button className="bg-green-600 hover:bg-green-700 text-white">
          Generate
        </Button>

        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>

      </div>

    </div>
  );
}