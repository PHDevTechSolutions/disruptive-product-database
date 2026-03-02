"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GenerateTDS({ open, onClose }: Props) {
  const [selectedCompany, setSelectedCompany] = useState("");

  if (!open) return null;

  return (
    <div className="h-full flex flex-col bg-white">
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

          {selectedCompany === "Lit" && (
            <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-10">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-orange-600">
                  Lit Technical Data Sheet
                </h1>
              </div>

              <table className="w-full border">
                <tbody>
                  <tr>
                    <td className="border p-2 font-semibold">Product Name</td>
                    <td className="border p-2">Sample Lit Product</td>
                  </tr>

                  <tr>
                    <td className="border p-2 font-semibold">Power</td>
                    <td className="border p-2">12W</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {selectedCompany === "Lumera" && (
            <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-10">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-blue-600">
                  Lumera Technical Data Sheet
                </h1>
              </div>

              <table className="w-full border">
                <tbody>
                  <tr>
                    <td className="border p-2 font-semibold">Product Name</td>
                    <td className="border p-2">Sample Lumera Product</td>
                  </tr>

                  <tr>
                    <td className="border p-2 font-semibold">Voltage</td>
                    <td className="border p-2">220V</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {selectedCompany === "Ecoshift" && (
            <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl p-10">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-green-600">
                  Ecoshift Technical Data Sheet
                </h1>
              </div>

              <table className="w-full border">
                <tbody>
                  <tr>
                    <td className="border p-2 font-semibold">Product Name</td>
                    <td className="border p-2">Sample Ecoshift Product</td>
                  </tr>

                  <tr>
                    <td className="border p-2 font-semibold">Efficiency</td>
                    <td className="border p-2">95%</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
