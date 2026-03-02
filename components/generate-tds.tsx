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
