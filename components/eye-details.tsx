"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

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
  const ref = useRef<HTMLDivElement | null>(null);

  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ✅ 1 second hover
  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => {
      setOpen(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setOpen(false);
  };

  const activeBaseFilters = Object.entries(BASE_STEP_LABELS)
    .map(([key, label]) => ({
      label,
      values: filters[key] ?? [],
    }))
    .filter((f) => f.values.length > 0);

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
    <div
      ref={ref}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="text-pink-400 hover:text-pink-700 transition-colors"
        // ❌ removed title (tooltip)
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute z-50 right-0 top-6 w-72 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3 text-xs space-y-2">
          {/* Header */}
          <p className="font-semibold text-gray-700 uppercase tracking-wide text-[11px] border-b pb-1">
            Showing <span className="text-pink-600">{groupTitle}</span> because:
          </p>

          {!hasAnything && (
            <p className="text-gray-400 italic">No filters applied yet.</p>
          )}

          {activeBaseFilters.map(({ label, values }) => (
            <div key={label} className="space-y-1">
              <p className="font-medium text-gray-400 uppercase text-[10px] tracking-widest">
                {label}
              </p>
              <div className="flex flex-wrap gap-1">
                {values.map((v) => (
                  <span
                    key={v}
                    className="bg-pink-100 text-pink-700 border border-pink-200 rounded px-1.5 py-0.5 text-[11px] font-medium"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {activeTechFilters.length > 0 && (
            <div className="border-t pt-2 space-y-2">
              <p className="font-medium text-gray-400 uppercase text-[10px] tracking-widest">
                Previous Spec Filters
              </p>
              {activeTechFilters.map(({ group, spec, values }) => (
                <div key={`${group}||${spec}`} className="space-y-1">
                  <p className="text-gray-500 text-[10px]">
                    <span className="font-semibold">{group}</span> › {spec}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {values.map((v) => (
                      <span
                        key={v}
                        className="bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 text-[11px] font-medium"
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
      )}
    </div>
  );
}