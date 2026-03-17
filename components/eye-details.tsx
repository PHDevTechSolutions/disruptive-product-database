"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

type ActiveFilters = Record<string, string[]>;

type Props = {
  groupTitle: string;
  filters: ActiveFilters;
};

const BASE_STEP_LABELS: Record<string, string> = {
  "Product Usage": "Product Usage",
  "Product Family": "Product Family",
  "Product Class": "Product Class",
  "Price Point": "Price Point",
  "Brand Origin": "Brand Origin",
  "Supplier Brand": "Supplier Brand",
};

export default function EyeDetails({ groupTitle, filters }: Props) {
  const [open, setOpen] = useState(false);

  // Base filters
  const activeBaseFilters = Object.entries(BASE_STEP_LABELS)
    .map(([key, label]) => ({
      label,
      values: filters[key] ?? [],
    }))
    .filter((f) => f.values.length > 0);

  // Tech filters (previous groups only)
  const activeTechFilters: { group: string; spec: string; values: string[] }[] = [];
  Object.entries(filters).forEach(([key, vals]) => {
    if (!key.includes("||")) return;
    if (!vals.length) return;
    const [gt, sn] = key.split("||");
    if (gt === groupTitle) return;
    activeTechFilters.push({ group: gt, spec: sn, values: vals });
  });

  const hasAnything =
    activeBaseFilters.length > 0 || activeTechFilters.length > 0;

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-pink-400 hover:text-pink-700 transition-colors"
        title={`See active filters for ${groupTitle}`}
      >
        <Info className="w-4 h-4" />
      </button>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative z-50 w-[90%] max-w-md bg-white rounded-xl shadow-2xl p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2">
              <p className="font-semibold text-gray-700 text-sm">
                Showing{" "}
                <span className="text-pink-600">{groupTitle}</span> because:
              </p>
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-gray-500 hover:text-black" />
              </button>
            </div>

            {!hasAnything && (
              <p className="text-gray-400 italic text-sm">
                No filters applied yet.
              </p>
            )}

            {/* Base Filters */}
            {activeBaseFilters.map(({ label, values }) => (
              <div key={label} className="space-y-1">
                <p className="font-medium text-gray-400 uppercase text-[10px] tracking-widest">
                  {label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {values.map((v) => (
                    <span
                      key={v}
                      className="bg-pink-100 text-pink-700 border border-pink-200 rounded px-2 py-0.5 text-xs font-medium"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Previous Tech Filters */}
            {activeTechFilters.length > 0 && (
              <div className="border-t pt-2 space-y-2">
                <p className="font-medium text-gray-400 uppercase text-[10px] tracking-widest">
                  Previous Spec Filters
                </p>

                {activeTechFilters.map(({ group, spec, values }) => (
                  <div key={`${group}||${spec}`} className="space-y-1">
                    <p className="text-gray-500 text-xs">
                      <span className="font-semibold">{group}</span> › {spec}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {values.map((v) => (
                        <span
                          key={v}
                          className="bg-purple-100 text-purple-700 border border-purple-200 rounded px-2 py-0.5 text-xs font-medium"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}