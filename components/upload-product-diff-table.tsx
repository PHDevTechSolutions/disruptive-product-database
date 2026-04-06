"use client";

import React, { useState } from "react";
import { type ParsedProductRow } from "@/lib/product-bulk-insert-runner";

type Props = {
  rows: ParsedProductRow[];
};

const COLS: { key: keyof ParsedProductRow; label: string }[] = [
  { key: "usage",          label: "Usage" },
  { key: "family",         label: "Family" },
  { key: "productClass",   label: "Class" },
  { key: "pricePoint",     label: "Price Point" },
  { key: "brandOrigin",    label: "Origin" },
  { key: "supplierBrand",  label: "Supplier Brand" },
  { key: "imageURL",       label: "Image" },
  { key: "dimensionalURL", label: "Dimensional" },
  { key: "illuminanceURL", label: "Illuminance" },
  { key: "unitCost",       label: "Unit Cost" },
  { key: "length",         label: "L (cm)" },
  { key: "width",          label: "W (cm)" },
  { key: "height",         label: "H (cm)" },
  { key: "pcsPerCarton",   label: "pcs/ctn" },
  { key: "factoryAddress", label: "Factory" },
  { key: "portOfDischarge",label: "Port" },
];

// Extracts all spec keys from the row's specValues e.g. "ELECTRICAL||Wattage" → "Wattage"
function getSpecColumns(rows: ParsedProductRow[]): string[] {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row.specValues ?? {})) {
      keys.add(k);
    }
  }
  return Array.from(keys);
}

const PAGE_SIZE = 10;

export default function UploadProductDiffTable({ rows }: Props) {
  const [page, setPage] = useState(1);
  const specCols = React.useMemo(() => getSpecColumns(rows), [rows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{rows.length} product row(s) pending upload</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
        <table className="text-xs border-collapse min-w-max">
<thead className="sticky top-0 bg-gray-50 z-10">
  <tr>
    <th className="px-2 py-1.5 border-b text-gray-500 font-medium text-left">#</th>
    {COLS.map((c) => (
      <th key={c.key} className="px-2 py-1.5 border-b text-gray-500 font-medium text-left whitespace-nowrap">
        {c.label}
      </th>
    ))}
    {specCols.map((key) => {
      const [group, specId] = key.split("||");
      return (
        <th key={key} className="px-2 py-1.5 border-b text-blue-500 font-medium text-left whitespace-nowrap">
          {group} · {specId}
        </th>
      );
    })}
  </tr>
</thead>
          <tbody>
{paged.map((row, i) => (
  <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
    <td className="px-2 py-1.5 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
    {COLS.map((c) => {
      const val = String(row[c.key] ?? "");
      const isUrl = val.startsWith("http");
      return (
        <td key={c.key} className="px-2 py-1.5 text-gray-700 max-w-[160px]">
          {isUrl ? (
            <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline truncate block max-w-[140px]">
              ✓ Link
            </a>
          ) : (
            <span className="whitespace-nowrap">{val || "—"}</span>
          )}
        </td>
      );
    })}
    {specCols.map((key) => {
      const val = row.specValues?.[key] ?? "";
      return (
        <td key={key} className="px-2 py-1.5 text-gray-700 max-w-[160px]">
          <span className="whitespace-nowrap">{val || "—"}</span>
        </td>
      );
    })}
  </tr>
))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 border rounded disabled:opacity-40">‹</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 border rounded disabled:opacity-40">›</button>
        </div>
      )}
    </div>
  );
}