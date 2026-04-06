"use client";

import React, { useState } from "react";

type SupplierRow = Record<string, unknown>;

type Props = {
  rows: SupplierRow[];
};

const COLS = [
  "Company Name", "Supplier Brand", "Addresses", "Emails",
  "Website", "Contact Name(s)", "Phone Number(s)",
  "Forte Product(s)", "Product(s)", "Certificate(s)",
];

const PAGE_SIZE = 10;

export default function UploadSupplierDiffTable({ rows }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{rows.length} supplier row(s) pending upload</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
        <table className="text-xs border-collapse min-w-max">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              <th className="px-2 py-1.5 border-b text-gray-500 font-medium text-left">#</th>
              {COLS.map((c) => (
                <th key={c} className="px-2 py-1.5 border-b text-gray-500 font-medium text-left whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="px-2 py-1.5 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                {COLS.map((col) => (
                  <td key={col} className="px-2 py-1.5 text-gray-700 max-w-[180px]">
                    <span className="whitespace-nowrap block truncate">{String(row[col] ?? "") || "—"}</span>
                  </td>
                ))}
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