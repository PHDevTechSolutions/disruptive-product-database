"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import GenerateTDSBrand from "@/components/generate-tds-brand";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GenerateTDS({ open, onClose }: Props) {
  const [selectedCompany, setSelectedCompany] = useState("");

  /* CTRL + F: BRAND FIELD */
  const [brand, setBrand] = useState("");

  /* CTRL + F: ITEM CODE FIELD */
  const [itemCode, setItemCode] = useState("");

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
      {/* HEADER */}
      <div className="border-b px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Generate TDS</h2>

        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* BODY */}
      <div className="p-6 flex-1 overflow-auto space-y-6 bg-gray-100">

        {/* CTRL + F: BRAND INPUT */}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Brand</p>

          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Enter brand..."
            className="w-full border rounded-md h-10 px-3 text-sm bg-white"
          />
        </div>

        {/* CTRL + F: ITEM CODE INPUT */}
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

        {/* SELECT */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Select Company</p>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="Lit"
              checked={selectedCompany === "Lit"}
              onChange={(e) => setSelectedCompany(e.target.value)}
            />
            Lit
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="Lumera"
              checked={selectedCompany === "Lumera"}
              onChange={(e) => setSelectedCompany(e.target.value)}
            />
            Lumera
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="Ecoshift"
              checked={selectedCompany === "Ecoshift"}
              onChange={(e) => setSelectedCompany(e.target.value)}
            />
            Ecoshift
          </label>
        </div>

        {/* PDF PREVIEW */}
        <div className="flex justify-center">
          {!selectedCompany && (
            <div className="text-muted-foreground text-sm">
              Select company to preview TDS
            </div>
          )}

          {selectedCompany && (
            <GenerateTDSBrand
              open={true}
              company={selectedCompany as "Lit" | "Lumera" | "Ecoshift"}
              brand={brand}
              itemCode={itemCode}
            />
          )}
        </div>
      </div>

      {/* FOOTER */}
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