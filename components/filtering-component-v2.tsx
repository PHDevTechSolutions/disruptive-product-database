"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Check, ChevronRight, SlidersHorizontal, X, ArrowLeft } from "lucide-react";
import EyeDetails from "@/components/eye-details";

type Props = {
  products: any[];
  onFilter: (filtered: any[]) => void;
};

/* ================================================= */
/* CONSTANTS                                         */
/* ================================================= */
const NO_SUPPLIER_BRAND = "NO SUPPLIER BRAND";

const getEffectiveBrandOrigin = (p: any): string => p.brandOrigin || "CHINA";
const getEffectivePricePoint = (p: any): string => p.pricePoint || "ECONOMY";
const getEffectiveBrandOriginLocal = (p: any): string => p.brandOrigin || "CHINA";
const getEffectivePricePointLocal = (p: any): string => p.pricePoint || "ECONOMY";

const getEffectiveSupplierBrand = (p: any): string =>
  p.supplier?.supplierBrand?.trim() || NO_SUPPLIER_BRAND;

/* Step accent colors — refined palette */
const stepAccents: Record<string, { dot: string; ring: string; badge: string }> = {
  "Product Usage":   { dot: "bg-sky-500",    ring: "ring-sky-200",    badge: "bg-sky-50 text-sky-700 border-sky-200" },
  "Product Family":  { dot: "bg-emerald-500", ring: "ring-emerald-200", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "Product Class":   { dot: "bg-amber-500",   ring: "ring-amber-200",   badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "Price Point":     { dot: "bg-violet-500",  ring: "ring-violet-200",  badge: "bg-violet-50 text-violet-700 border-violet-200" },
  "Brand Origin":    { dot: "bg-orange-500",  ring: "ring-orange-200",  badge: "bg-orange-50 text-orange-700 border-orange-200" },
  "Supplier Brand":  { dot: "bg-rose-500",    ring: "ring-rose-200",    badge: "bg-rose-50 text-rose-700 border-rose-200" },
};

const COLLAPSE_THRESHOLD = 6;

const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));

const splitValues = (value: string): string[] => {
  if (!value) return [];
  return value.split("|").map((v) => v.trim()).filter(Boolean);
};

const formatSpec = (s: any): string => {
  if (!s) return "";
  if (s.isRanging) return `${s.rangeFrom} - ${s.rangeTo}${s.unit ? ` ${s.unit}` : ""}`;
  if (s.isSlashing) return s.slashValues?.join("/") || "";
  if (s.isDimension) return `${s.slashValues?.join(" x ") || ""}${s.unit ? ` ${s.unit}` : ""}`;
  if (s.isIPRating) return `IP${s.ipFirst}${s.ipSecond}`;
  if (s.value) return s.unit ? `${s.value} ${s.unit}` : s.value;
  return "";
};

const BASE_STEP_ORDER = [
  "Product Usage",
  "Product Family",
  "Product Class",
  "Price Point",
  "Brand Origin",
  "Supplier Brand",
];

export default function FilteringComponent({ products, onFilter }: Props) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});
  const [visibleSteps, setVisibleSteps] = useState<string[]>(["Product Usage"]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setStepRef = (step: string) => (el: HTMLDivElement | null) => {
    stepRefs.current[step] = el;
  };

  const scrollToStep = (step: string) => {
    setTimeout(() => {
      const el = stepRefs.current[step];
      const container = scrollContainerRef.current;
      if (!el || !container) return;
      const elTop = el.getBoundingClientRect().top;
      const containerTop = container.getBoundingClientRect().top;
      const offset = elTop - containerTop + container.scrollTop - 16;
      container.scrollTo({ top: offset, behavior: "smooth" });
    }, 100);
  };

  /* ================================================= */
  /* SOURCE PRODUCTS                                   */
  /* ================================================= */
  const sourceProducts = useMemo(() => {
    return products.filter((p) => {
      const check = (key: string, value: any) => {
        if (!filters[key]?.length) return true;
        return filters[key].includes(value);
      };
      if (!check("Product Usage", p.categoryTypes?.[0]?.categoryTypeName)) return false;
      if (!check("Product Family", p.productFamilies?.[0]?.productFamilyName)) return false;
      if (!check("Product Class", p.productClass)) return false;
      if (!check("Price Point", getEffectivePricePoint(p))) return false;
      if (!check("Brand Origin", getEffectiveBrandOrigin(p))) return false;
      if (filters["Supplier Brand"]?.length) {
        if (!filters["Supplier Brand"].includes(getEffectiveSupplierBrand(p))) return false;
      }
      for (const [k, vals] of Object.entries(filters) as [string, string[]][]) {
        if (!k.includes("||")) continue;
        if (!vals.length) continue;
        const [gt, sn] = k.split("||");
        const pv: string[] = [];
        p.technicalSpecifications?.forEach((g: any) => {
          if (g.title !== gt) return;
          g.specs?.forEach((s: any) => {
            if (s.specId === sn) {
              const d = formatSpec(s);
              splitValues(d).forEach((v) => pv.push(v));
            }
          });
        });
        if (!vals.some((v) => pv.includes(v))) return false;
      }
      return true;
    });
  }, [filters, products]);

  /* ================================================= */
  /* BUILD TECH SPECS MAP                              */
  /* ================================================= */
  const technicalSpecs = useMemo(() => {
    const result: Map<string, Map<string, Set<string>>> = new Map();
    sourceProducts.forEach((p) => {
      if (!p?.technicalSpecifications) return;
      p.technicalSpecifications.forEach((g: any) => {
        if (!g?.title) return;
        if (!result.has(g.title)) result.set(g.title, new Map());
        if (!Array.isArray(g.specs)) return;
        g.specs.forEach((s: any) => {
          if (!s?.specId) return;
          const val = formatSpec(s);
          if (!val) return;
          const groupMap = result.get(g.title)!;
          if (!groupMap.has(s.specId)) groupMap.set(s.specId, new Set());
          splitValues(val).forEach((single) => groupMap.get(s.specId)!.add(single));
        });
      });
    });
    return result;
  }, [sourceProducts]);

  const techSpecGroupOrder = useMemo(() => {
    const ordered: string[] = [];
    technicalSpecs.forEach((specMap, groupTitle) => {
      const hasAnyValue = Array.from(specMap.values()).some((vals) => vals.size > 0);
      if (hasAnyValue) ordered.push(groupTitle);
    });
    return ordered;
  }, [technicalSpecs]);

  const fullStepOrder = useMemo(() => {
    return [...BASE_STEP_ORDER, ...techSpecGroupOrder];
  }, [techSpecGroupOrder]);

  useEffect(() => {
    setVisibleSteps((prev) => {
      const hasTechSpecVisible = prev.some((s) => !BASE_STEP_ORDER.includes(s));
      if (!hasTechSpecVisible) return prev;
      const lastVisibleTech = [...prev].reverse().find((s) => !BASE_STEP_ORDER.includes(s));
      if (!lastVisibleTech) return prev;
      const lastShownGroupIndex = techSpecGroupOrder.indexOf(lastVisibleTech);
      if (lastShownGroupIndex === -1) {
        return prev.filter((s) => BASE_STEP_ORDER.includes(s) || techSpecGroupOrder.includes(s));
      }
      const baseVisible = prev.filter((s) => BASE_STEP_ORDER.includes(s));
      const techVisible = techSpecGroupOrder.slice(0, lastShownGroupIndex + 1);
      const merged = [...baseVisible];
      techVisible.forEach((s) => { if (!merged.includes(s)) merged.push(s); });
      return merged;
    });
  }, [techSpecGroupOrder]);

  /* ================= FILTER SOURCES ================= */
  const productUsages = uniq(products.map((p) => p.categoryTypes?.[0]?.categoryTypeName));
  const productFamilies = uniq(
    products
      .filter((p) => {
        if (filters["Product Usage"]?.length)
          return filters["Product Usage"].includes(p.categoryTypes?.[0]?.categoryTypeName);
        return true;
      })
      .map((p) => p.productFamilies?.[0]?.productFamilyName),
  );
  const pricePoints = uniq(products.map((p) => getEffectivePricePoint(p)));
  const brandOrigins = uniq(products.map((p) => getEffectiveBrandOrigin(p)));
  const productClasses = uniq(products.map((p) => p.productClass));

  const suppliers = useMemo(() => {
    const filtered = products.filter((p) => {
      if (filters["Product Usage"]?.length && !filters["Product Usage"].includes(p.categoryTypes?.[0]?.categoryTypeName)) return false;
      if (filters["Product Family"]?.length && !filters["Product Family"].includes(p.productFamilies?.[0]?.productFamilyName)) return false;
      if (filters["Product Class"]?.length && !filters["Product Class"].includes(p.productClass)) return false;
      if (filters["Price Point"]?.length && !filters["Price Point"].includes(getEffectivePricePoint(p))) return false;
      if (filters["Brand Origin"]?.length && !filters["Brand Origin"].includes(getEffectiveBrandOrigin(p))) return false;
      return true;
    });
    const brands = new Set<string>();
    filtered.forEach((p) => { brands.add(getEffectiveSupplierBrand(p)); });
    return Array.from(brands).sort((a, b) => {
      if (a === NO_SUPPLIER_BRAND) return 1;
      if (b === NO_SUPPLIER_BRAND) return -1;
      return a.localeCompare(b);
    });
  }, [products, filters]);

  /* ================= FILTER ENGINE ================= */
  useEffect(() => {
    (window as any).__ACTIVE_FILTERS__ = Object.values(filters).flat();
    const filtered = products.filter((p) => {
      const check = (key: string, value: any) => {
        if (filters[key]?.length) {
          return filters[key].some((filterVal) => {
            if (!value) return false;
            const valueStr = value.toString();
            if (valueStr === filterVal) return true;
            const match = valueStr.match(/(\d+(\.\d+)?)\s*-\s*(\d+(\.\d+)?)/);
            if (match && !isNaN(Number(filterVal))) {
              const num = Number(filterVal);
              if (num >= Number(match[1]) && num <= Number(match[3])) return true;
            }
            return false;
          });
        }
        if (searchFilters[key]) return value?.toLowerCase().includes(searchFilters[key].toLowerCase());
        return true;
      };
      if (!check("Product Usage", p.categoryTypes?.[0]?.categoryTypeName)) return false;
      if (!check("Product Family", p.productFamilies?.[0]?.productFamilyName)) return false;
      if (!check("Price Point", getEffectivePricePoint(p))) return false;
      if (!check("Brand Origin", getEffectiveBrandOrigin(p))) return false;
      if (!check("Product Class", p.productClass)) return false;
      if (!check("Supplier", p.supplier?.company)) return false;
      if (filters["Supplier Brand"]?.length) {
        if (!filters["Supplier Brand"].includes(getEffectiveSupplierBrand(p))) return false;
      }
      for (const [k, vals] of Object.entries(filters) as [string, string[]][]) {
        if (!k.includes("||")) continue;
        const [gt, sn] = k.split("||");
        const pv: string[] = [];
        p.technicalSpecifications?.forEach((g: any) => {
          if (g.title !== gt) return;
          g.specs?.forEach((s: any) => {
            if (s.specId === sn) {
              const d = formatSpec(s);
              splitValues(d).forEach((v) => pv.push(v));
            }
          });
        });
        if (vals.length && !vals.some((v) => pv.includes(v))) return false;
      }
      return true;
    });
    onFilter(filtered);
  }, [filters, searchFilters, products]);

  /* ================= ADVANCE TO NEXT TECH SPEC GROUP ================= */
  const advanceToNextStep = (currentTitle: string) => {
    const currentIndex = fullStepOrder.indexOf(currentTitle);
    if (currentIndex === -1 || currentIndex >= fullStepOrder.length - 1) return;
    let nextIndex = currentIndex + 1;
    while (nextIndex < fullStepOrder.length) {
      const candidate = fullStepOrder[nextIndex];
      if (BASE_STEP_ORDER.includes(candidate)) break;
      const groupMap = technicalSpecs.get(candidate);
      const hasValues = groupMap ? Array.from(groupMap.values()).some((s) => s.size > 0) : false;
      if (hasValues) break;
      nextIndex++;
    }
    if (nextIndex < fullStepOrder.length) {
      const nextStep = fullStepOrder[nextIndex];
      setVisibleSteps((prev) => {
        if (!prev.includes(nextStep)) return [...prev, nextStep];
        return prev;
      });
      scrollToStep(nextStep);
    }
  };

  /* ================= TOGGLE ================= */
  const toggle = (title: string, value: string) => {
    setFilters((prev) => {
      const alreadySelected = prev[title]?.includes(value);
      const updated = {
        ...prev,
        [title]: alreadySelected
          ? prev[title].filter((v) => v !== value)
          : [...(prev[title] || []), value],
      };
      if (!alreadySelected && BASE_STEP_ORDER.includes(title)) {
        const currentIndex = BASE_STEP_ORDER.indexOf(title);
        if (currentIndex < BASE_STEP_ORDER.length - 1) {
          const nextStep = BASE_STEP_ORDER[currentIndex + 1];
          setVisibleSteps((prevSteps) => {
            if (!prevSteps.includes(nextStep)) return [...prevSteps, nextStep];
            return prevSteps;
          });
          scrollToStep(nextStep);
        }
      }
      return updated;
    });
  };

  /* ================= BACK ================= */
  const handleBack = (title: string) => {
    const currentIndex = fullStepOrder.indexOf(title);
    if (currentIndex <= 0) return;
    const stepsToKeep = fullStepOrder.slice(0, currentIndex);
    setVisibleSteps(stepsToKeep);
    setFilters((prev) => {
      const updated = { ...prev };
      const clearedSteps = fullStepOrder.slice(currentIndex);
      clearedSteps.forEach((step) => { delete updated[step]; });
      Object.keys(updated).forEach((key) => {
        if (!key.includes("||")) return;
        const [gt] = key.split("||");
        if (clearedSteps.includes(gt)) delete updated[key];
      });
      return updated;
    });
  };

  const getPreviousStep = () => {
    if (visibleSteps.length <= 1) return null;
    const lastVisible = visibleSteps[visibleSteps.length - 1];
    const lastIndex = fullStepOrder.indexOf(lastVisible);
    if (lastIndex <= 0) return null;
    return lastVisible;
  };

  const setSearch = (title: string, value: string) =>
    setSearchFilters((prev) => ({ ...prev, [title]: value }));

  /* Count active filters */
  const activeFilterCount = Object.values(filters).flat().length;

  /* ================= UI ================= */
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        boxShadow: "0 4px 24px -4px rgba(0,0,0,0.08), 0 1px 4px -1px rgba(0,0,0,0.04)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex-shrink-0 px-5 py-4"
        style={{
          borderBottom: "1px solid #e2e8f0",
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(12px)",
          borderRadius: "16px 16px 0 0",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center"
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
              }}
            >
              <SlidersHorizontal size={15} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", letterSpacing: "-0.01em" }}>
                Filters
              </span>
              {activeFilterCount > 0 && (
                <span
                  className="ml-2 inline-flex items-center justify-center"
                  style={{
                    minWidth: 20, height: 20, borderRadius: 10,
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    color: "white", fontSize: 11, fontWeight: 700, padding: "0 6px",
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getPreviousStep() && (
              <button
                onClick={() => handleBack(getPreviousStep()!)}
                className="flex items-center gap-1"
                style={{
                  fontSize: 12, color: "#6366f1", fontWeight: 600,
                  padding: "4px 10px", borderRadius: 8,
                  background: "#eef2ff", border: "1px solid #c7d2fe",
                  cursor: "pointer", transition: "all 0.15s ease",
                }}
              >
                <ArrowLeft size={12} strokeWidth={2.5} />
                Back
              </button>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilters({}); setSearchFilters({}); setVisibleSteps(["Product Usage"]); }}
                className="flex items-center gap-1"
                style={{
                  fontSize: 12, color: "#64748b", fontWeight: 600,
                  padding: "4px 10px", borderRadius: 8,
                  background: "#f1f5f9", border: "1px solid #e2e8f0",
                  cursor: "pointer", transition: "all 0.15s ease",
                }}
              >
                <X size={12} strokeWidth={2.5} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Step progress breadcrumb */}
        {visibleSteps.length > 1 && (
          <div className="flex items-center gap-1 mt-3 flex-wrap" style={{ gap: "4px 6px" }}>
            {visibleSteps.map((step, idx) => {
              const isBase = BASE_STEP_ORDER.includes(step);
              const accent = stepAccents[step];
              const shortLabel = step.replace("Product ", "").replace("Supplier ", "");
              return (
                <div key={step} className="flex items-center gap-1">
                  <span
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px",
                      borderRadius: 20,
                      background: isBase ? (accent?.badge?.split(" ")[0] ?? "#f1f5f9") : "#fdf4ff",
                      color: isBase ? (accent ? "#374151" : "#374151") : "#7e22ce",
                      border: `1px solid ${isBase ? "#e2e8f0" : "#e9d5ff"}`,
                    }}
                  >
                    {shortLabel}
                  </span>
                  {idx < visibleSteps.length - 1 && (
                    <ChevronRight size={10} color="#94a3b8" strokeWidth={2} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}
      >
        {/* STEP 1 — Product Usage */}
        {visibleSteps.includes("Product Usage") && (
          <div ref={setStepRef("Product Usage")} className="scroll-mt-4">
            <Section
              title="Product Usage"
              items={productUsages}
              filters={filters}
              toggle={toggle}
              setSearch={setSearch}
              sourceProducts={sourceProducts}
              products={products}
              stepNumber={1}
            />
          </div>
        )}

        {/* STEP 2 — Product Family */}
        {visibleSteps.includes("Product Family") && (
          <div ref={setStepRef("Product Family")} className="scroll-mt-4">
            <BackButton onClick={() => handleBack("Product Family")} />
            <Section
              title="Product Family"
              items={productFamilies}
              filters={filters}
              toggle={toggle}
              setSearch={setSearch}
              sourceProducts={sourceProducts}
              products={products}
              stepNumber={2}
            />
          </div>
        )}

        {/* STEP 3 — Product Class */}
        {visibleSteps.includes("Product Class") && (
          <div ref={setStepRef("Product Class")} className="scroll-mt-4">
            <BackButton onClick={() => handleBack("Product Class")} />
            <Section
              title="Product Class"
              items={productClasses}
              filters={filters}
              toggle={toggle}
              setSearch={setSearch}
              sourceProducts={sourceProducts}
              products={products}
              stepNumber={3}
            />
          </div>
        )}

        {/* STEP 4 — Price Point */}
        {visibleSteps.includes("Price Point") && (
          <div ref={setStepRef("Price Point")} className="scroll-mt-4">
            <BackButton onClick={() => handleBack("Price Point")} />
            <Section
              title="Price Point"
              items={pricePoints}
              filters={filters}
              toggle={toggle}
              setSearch={setSearch}
              sourceProducts={sourceProducts}
              products={products}
              stepNumber={4}
            />
          </div>
        )}

        {/* STEP 5 — Brand Origin */}
        {visibleSteps.includes("Brand Origin") && (
          <div ref={setStepRef("Brand Origin")} className="scroll-mt-4">
            <BackButton onClick={() => handleBack("Brand Origin")} />
            <Section
              title="Brand Origin"
              items={brandOrigins}
              filters={filters}
              toggle={toggle}
              setSearch={setSearch}
              sourceProducts={sourceProducts}
              products={products}
              stepNumber={5}
            />
          </div>
        )}

        {/* STEP 6 — Supplier Brand */}
        {visibleSteps.includes("Supplier Brand") && (
          <div ref={setStepRef("Supplier Brand")} className="scroll-mt-4">
            <BackButton onClick={() => handleBack("Supplier Brand")} />
            <Section
              title="Supplier Brand"
              items={suppliers}
              filters={filters}
              toggle={toggle}
              setSearch={setSearch}
              sourceProducts={sourceProducts}
              products={products}
              noSupplierBrandLabel={NO_SUPPLIER_BRAND}
              stepNumber={6}
            />
            {techSpecGroupOrder.length > 0 && !visibleSteps.includes(techSpecGroupOrder[0]) && (
              <NextButton
                label={techSpecGroupOrder[0]}
                onClick={() => advanceToNextStep("Supplier Brand")}
              />
            )}
          </div>
        )}

        {/* ===== TECH SPEC GROUP STEPS ===== */}
        {techSpecGroupOrder.map((groupTitle, groupIndex) => {
          if (!visibleSteps.includes(groupTitle)) return null;
          const groupMap = technicalSpecs.get(groupTitle);
          if (!groupMap) return null;
          const hasValues = Array.from(groupMap.values()).some((vals) => vals.size > 0);
          if (!hasValues) return null;

          let nextGroupTitle: string | null = null;
          for (let i = groupIndex + 1; i < techSpecGroupOrder.length; i++) {
            const candidate = techSpecGroupOrder[i];
            const candidateMap = technicalSpecs.get(candidate);
            const candidateHasValues = candidateMap
              ? Array.from(candidateMap.values()).some((s) => s.size > 0)
              : false;
            if (candidateHasValues) { nextGroupTitle = candidate; break; }
          }

          return (
            <div key={groupTitle} ref={setStepRef(groupTitle)} className="scroll-mt-4 space-y-2">
              <BackButton onClick={() => handleBack(groupTitle)} />

              <div
                style={{
                  border: "1px solid #e9d5ff",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #fdf4ff 0%, #faf5ff 100%)",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                      }}
                    />
                    <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7e22ce" }}>
                      {groupTitle}
                    </span>
                  </div>
                  <EyeDetails groupTitle={groupTitle} filters={filters} />
                </div>

                {Array.from(groupMap.entries()).map(([specName, vals]) => {
                  if (vals.size === 0) return null;
                  return (
                    <Section
                      key={specName}
                      title={`${groupTitle}||${specName}`}
                      label={specName}
                      items={[...vals]}
                      filters={filters}
                      toggle={toggle}
                      setSearch={setSearch}
                      sourceProducts={sourceProducts}
                      products={products}
                      isTechSpec
                    />
                  );
                })}
              </div>

              {nextGroupTitle && !visibleSteps.includes(nextGroupTitle) && (
                <NextButton label={nextGroupTitle} onClick={() => advanceToNextStep(groupTitle)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── Small helper components ─────────── */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 mb-2"
      style={{
        fontSize: 11, color: "#6366f1", fontWeight: 600,
        padding: "3px 8px", borderRadius: 6,
        background: "#eef2ff", border: "1px solid #c7d2fe",
        cursor: "pointer",
      }}
    >
      <ArrowLeft size={11} strokeWidth={2.5} /> Back
    </button>
  );
}

function NextButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full mt-2"
      style={{
        fontSize: 12, fontWeight: 600,
        padding: "8px 14px", borderRadius: 10,
        background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
        border: "1px solid #c4b5fd",
        color: "#6d28d9", cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <span>Next: {label}</span>
      <ChevronRight size={14} strokeWidth={2.5} />
    </button>
  );
}

/* ─────────── SECTION ─────────── */
function Section({
  title,
  label,
  items,
  filters,
  toggle,
  setSearch,
  sourceProducts,
  products,
  noSupplierBrandLabel,
  stepNumber,
  isTechSpec = false,
}: any) {
  const [input, setInput] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(true);

  const splitValuesLocal = (value: string): string[] => {
    if (!value) return [];
    return value.split("|").map((v: string) => v.trim()).filter(Boolean);
  };

  useEffect(() => { setSearch(title, input); }, [input]);

  const counts: Record<string, number> = {};
  items.forEach((val: string) => (counts[val] = 0));

  const currentStepIndex = BASE_STEP_ORDER.indexOf(title);
  const isTechSpecId = title.includes("||");
  const isSupplierBrand = title === "Supplier Brand";

  const accent = stepAccents[title] ?? null;

  const baseList = products.filter((p: any) => {
    if (!isTechSpecId) {
      const stepMatch = BASE_STEP_ORDER.every((step, index) => {
        if (index >= currentStepIndex) return true;
        if (!filters[step]?.length) return true;
        let value;
        if (step === "Product Usage") value = p.categoryTypes?.[0]?.categoryTypeName;
        else if (step === "Product Family") value = p.productFamilies?.[0]?.productFamilyName;
        else if (step === "Product Class") value = p.productClass;
        else if (step === "Price Point") value = getEffectivePricePointLocal(p);
        else if (step === "Brand Origin") value = getEffectiveBrandOriginLocal(p);
        else if (step === "Supplier Brand") value = getEffectiveSupplierBrand(p);
        return filters[step].includes(value);
      });
      if (!stepMatch) return false;
    }
    if (isTechSpecId) {
      if (filters["Product Usage"]?.length && !filters["Product Usage"].includes(p.categoryTypes?.[0]?.categoryTypeName)) return false;
      if (filters["Product Family"]?.length && !filters["Product Family"].includes(p.productFamilies?.[0]?.productFamilyName)) return false;
      if (filters["Product Class"]?.length && !filters["Product Class"].includes(p.productClass)) return false;
      if (filters["Price Point"]?.length && !filters["Price Point"].includes(getEffectivePricePointLocal(p))) return false;
      if (filters["Brand Origin"]?.length && !filters["Brand Origin"].includes(getEffectiveBrandOriginLocal(p))) return false;
      if (filters["Supplier Brand"]?.length && !filters["Supplier Brand"].includes(getEffectiveSupplierBrand(p))) return false;
    }

    const selfGt = isTechSpecId ? title.split("||")[0] : null;
    const selfSn = isTechSpecId ? title.split("||")[1] : null;

    for (const [k, vals] of Object.entries(filters) as [string, string[]][]) {
      if (!k.includes("||")) continue;
      if (!vals.length) continue;
      const [gt, sn] = k.split("||");
      if (gt === selfGt && sn === selfSn) continue;
      const productVals: string[] = [];
      p.technicalSpecifications?.forEach((g: any) => {
        if (g.title !== gt) return;
        g.specs?.forEach((s: any) => {
          if (s.specId !== sn) return;
          const val = formatSpec(s) || s.value || "";
          splitValuesLocal(val).forEach((v: string) => productVals.push(v));
        });
      });
      if (!vals.some((v) => productVals.includes(v))) return false;
    }
    return true;
  });

  baseList.forEach((p: any) => {
    if (isTechSpecId) {
      const [groupTitle, specName] = title.split("||");
      const values: string[] = [];
      p.technicalSpecifications?.forEach((g: any) => {
        if (g.title !== groupTitle) return;
        g.specs?.forEach((s: any) => {
          if (s.specId !== specName) return;
          const val = formatSpec(s) || s.value || "";
          splitValuesLocal(val).forEach((single: string) => values.push(single));
        });
      });
      values.forEach((v) => { if (counts[v] !== undefined) counts[v]++; });
    } else if (isSupplierBrand) {
      const value = getEffectiveSupplierBrand(p);
      if (counts[value] !== undefined) counts[value]++;
    } else {
      let value: any;
      if (title === "Product Usage") value = p.categoryTypes?.[0]?.categoryTypeName;
      else if (title === "Product Family") value = p.productFamilies?.[0]?.productFamilyName;
      else if (title === "Product Class") value = p.productClass;
      else if (title === "Price Point") value = getEffectivePricePointLocal(p);
      else if (title === "Brand Origin") value = getEffectiveBrandOriginLocal(p);
      if (counts[value] !== undefined) counts[value]++;
    }
  });

  const visible = items.filter((i: string) => {
    if (!input) return true;
    if (i === NO_SUPPLIER_BRAND) return NO_SUPPLIER_BRAND.toLowerCase().includes(input.toLowerCase());
    const extractNumbers = (str: string) => {
      const matches = str.match(/(\d+(\.\d+)?)/g);
      return matches ? matches.map(Number) : [];
    };
    const itemNums = extractNumbers(i);
    const inputNums = extractNumbers(input);
    if (itemNums.length === 0) return i.toLowerCase().includes(input.toLowerCase());
    if (inputNums.length >= 2) {
      if (itemNums.length >= 2) return inputNums[0] >= itemNums[0] && inputNums[1] <= itemNums[1];
      return false;
    }
    if (inputNums.length === 1) {
      const inputVal = inputNums[0];
      if (itemNums.length >= 2) return inputVal >= itemNums[0] && inputVal <= itemNums[1];
      if (itemNums.length === 1) return itemNums[0] >= inputVal;
    }
    return i.toLowerCase().includes(input.toLowerCase());
  });

  const levenshtein = (a: string, b: string) => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : 1 + Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]);
      }
    }
    return matrix[b.length][a.length];
  };

  const suggestionPhrases = ["Did you mean", "Closest match", "Maybe you meant", "Try this instead", "Nearest value", "Best match", "Closest available", "You might be looking for"];
  const pickPhrase = () => suggestionPhrases[Math.floor(Math.random() * suggestionPhrases.length)];

  const suggestion = (() => {
    if (!input || visible.length > 0) return null;
    const extractNumbers = (str: string) => { const m = str.match(/(\d+(\.\d+)?)/g); return m ? m.map(Number) : []; };
    const inputNums = extractNumbers(input);
    if (inputNums.length > 0) {
      let bestItem = null, bestDiff = Infinity, highestItem = null, highestValue = -Infinity;
      items.forEach((item: string) => {
        if (item === NO_SUPPLIER_BRAND) return;
        const nums = extractNumbers(item);
        if (nums.length === 0) return;
        const compareNum = nums[0];
        if (compareNum > highestValue) { highestValue = compareNum; highestItem = item; }
        if (compareNum > inputNums[0]) { const diff = compareNum - inputNums[0]; if (diff < bestDiff) { bestDiff = diff; bestItem = item; } }
      });
      if (!bestItem && highestItem) return { value: highestItem, phrase: "Highest available" };
      if (bestItem) return { value: bestItem, phrase: pickPhrase() };
      return null;
    }
    let bestMatch = null, bestScore = Infinity;
    items.forEach((item: string) => {
      if (item === NO_SUPPLIER_BRAND) return;
      if (/\d/.test(item)) return;
      const score = levenshtein(input.toLowerCase(), item.toLowerCase());
      if (score < bestScore && score <= 3) { bestScore = score; bestMatch = item; }
    });
    if (bestMatch) return { value: bestMatch, phrase: pickPhrase() };
    return null;
  })();

  const isLongList = visible.length > COLLAPSE_THRESHOLD;
  const showScrollable = isLongList && !input;
  const selectedCount = filters[title]?.length ?? 0;

  /* Determine container style */
  const containerStyle: React.CSSProperties = isTechSpecId
    ? {
        border: "1px solid #ede9fe",
        borderRadius: 10,
        background: "white",
        padding: "10px",
      }
    : {
        border: `1px solid ${accent ? "#e2e8f0" : "#e2e8f0"}`,
        borderRadius: 12,
        background: "white",
        padding: "12px",
        boxShadow: "0 1px 4px -1px rgba(0,0,0,0.06)",
      };

  return (
    <div style={containerStyle}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {accent && !isTechSpecId && (
            <div
              style={{
                width: 7, height: 7, borderRadius: "50%",
                background: `var(--dot-color, #94a3b8)`,
                // Tailwind won't set CSS vars, so inline:
                ...(accent.dot.includes("sky") ? { background: "#0ea5e9" } :
                    accent.dot.includes("emerald") ? { background: "#10b981" } :
                    accent.dot.includes("amber") ? { background: "#f59e0b" } :
                    accent.dot.includes("violet") ? { background: "#8b5cf6" } :
                    accent.dot.includes("orange") ? { background: "#f97316" } :
                    accent.dot.includes("rose") ? { background: "#f43f5e" } : {}),
              }}
            />
          )}
          <span style={{ fontWeight: 600, fontSize: 12, color: "#334155", letterSpacing: "-0.01em" }}>
            {label ?? title}
          </span>
          {selectedCount > 0 && (
            <span
              style={{
                fontSize: 10, fontWeight: 700,
                padding: "1px 6px", borderRadius: 10,
                background: "#6366f1", color: "white",
              }}
            >
              {selectedCount}
            </span>
          )}
        </div>
        {isLongList && !input && (
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, cursor: "pointer" }}
          >
            {isCollapsed ? `+${visible.length - COLLAPSE_THRESHOLD} more` : "Collapse"}
          </button>
        )}
      </div>

      <Command shouldFilter={false}>
        <div style={{ position: "relative" }}>
          <CommandInput
            placeholder="Search…"
            value={input}
            onValueChange={(val) => { setInput(val); if (val) setIsCollapsed(false); }}
            style={{ fontSize: 12 }}
          />
        </div>

        {visible.length === 0 && (
          <CommandEmpty style={{ fontSize: 12, color: "#94a3b8", padding: "10px 8px" }}>
            No results found
            {suggestion && (
              <div
                onClick={() => setInput(suggestion.value)}
                style={{ color: "#6366f1", cursor: "pointer", marginTop: 4, fontWeight: 600 }}
              >
                {suggestion.phrase}: <span style={{ textDecoration: "underline" }}>{suggestion.value}</span>
              </div>
            )}
          </CommandEmpty>
        )}

        {visible.length > 0 && (
          <CommandGroup
            style={showScrollable ? {
              maxHeight: isCollapsed ? 200 : 240,
              overflowY: "auto",
            } : {}}
          >
            {visible.map((i: string) => {
              const isDisabled = (counts[i] ?? 0) === 0 && !filters[title]?.includes(i);
              const isNoSupplier = i === NO_SUPPLIER_BRAND;
              const isSelected = filters[title]?.includes(i);
              const count = counts[i] ?? 0;

              return (
                <CommandItem
                  key={i}
                  onSelect={() => { if (isDisabled) return; toggle(title, i); }}
                  style={{
                    opacity: isDisabled ? 0.35 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    borderRadius: 7,
                    padding: "5px 8px",
                    marginBottom: 1,
                    background: isSelected ? "#eef2ff" : "transparent",
                    border: isSelected ? "1px solid #c7d2fe" : "1px solid transparent",
                    transition: "all 0.12s ease",
                  }}
                >
                  {/* Custom checkbox */}
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 15, height: 15, borderRadius: 4, marginRight: 8, flexShrink: 0,
                      border: isSelected ? "none" : "1.5px solid #cbd5e1",
                      background: isSelected
                        ? "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
                        : "white",
                      boxShadow: isSelected ? "0 1px 4px rgba(99,102,241,0.4)" : "none",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {isSelected && <Check size={9} color="white" strokeWidth={3} />}
                  </span>

                  <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 12, fontWeight: isSelected ? 600 : 400,
                        color: isNoSupplier ? "#94a3b8" : isSelected ? "#4338ca" : "#374151",
                        fontStyle: isNoSupplier ? "italic" : "normal",
                      }}
                    >
                      {i}
                    </span>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 600, minWidth: 20, textAlign: "center",
                        padding: "1px 5px", borderRadius: 6,
                        background: isSelected ? "#c7d2fe" : "#f1f5f9",
                        color: isSelected ? "#4338ca" : "#64748b",
                      }}
                    >
                      {count}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </Command>
    </div>
  );
}
