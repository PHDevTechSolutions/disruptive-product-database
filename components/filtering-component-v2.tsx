"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Check } from "lucide-react";
import EyeDetails from "@/components/eye-details";

type Props = {
  products: any[];
  onFilter: (filtered: any[]) => void;
};

const getEffectiveBrandOrigin = (p: any): string => p.brandOrigin || "CHINA";
const getEffectivePricePoint = (p: any): string => p.pricePoint || "ECONOMY";
const getEffectiveBrandOriginLocal = (p: any): string => p.brandOrigin || "CHINA";
const getEffectivePricePointLocal = (p: any): string => p.pricePoint || "ECONOMY";

const stepColors: Record<string, string> = {
  "Product Usage": "bg-blue-100",
  "Product Family": "bg-green-100",
  "Product Class": "bg-yellow-100",
  "Price Point": "bg-purple-100",
  "Brand Origin": "bg-orange-100",
  "Supplier Brand": "bg-pink-100",
};

const COLLAPSE_THRESHOLD = 6;

const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));

const splitValues = (value: string): string[] => {
  if (!value) return [];
  return value.split("|").map((v) => v.trim()).filter(Boolean);
};

const formatSpec = (s: any): string => {
  if (!s) return "";
  if (s.isRanging)
    return `${s.rangeFrom} - ${s.rangeTo}${s.unit ? ` ${s.unit}` : ""}`;
  if (s.isSlashing) return s.slashValues?.join("/") || "";
  if (s.isDimension)
    return `${s.slashValues?.join(" x ") || ""}${s.unit ? ` ${s.unit}` : ""}`;
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
      if (!check("Supplier Brand", p.supplier?.supplierBrand)) return false;

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

  /* ================================================= */
  /* TECH SPEC GROUP ORDER — only non-empty groups     */
  /* ================================================= */
  const techSpecGroupOrder = useMemo(() => {
    const ordered: string[] = [];
    technicalSpecs.forEach((specMap, groupTitle) => {
      const hasAnyValue = Array.from(specMap.values()).some((vals) => vals.size > 0);
      if (hasAnyValue) ordered.push(groupTitle);
    });
    return ordered;
  }, [technicalSpecs]);

  /* ================================================= */
  /* FULL STEP ORDER                                   */
  /* ================================================= */
  const fullStepOrder = useMemo(() => {
    return [...BASE_STEP_ORDER, ...techSpecGroupOrder];
  }, [techSpecGroupOrder]);

  /* ================================================= */
  /* SYNC visibleSteps when techSpecGroupOrder changes */
  /* ================================================= */
  useEffect(() => {
    setVisibleSteps((prev) => {
      const hasTechSpecVisible = prev.some((s) => !BASE_STEP_ORDER.includes(s));
      if (!hasTechSpecVisible) return prev;

      const lastVisibleTech = [...prev].reverse().find((s) => !BASE_STEP_ORDER.includes(s));
      if (!lastVisibleTech) return prev;

      const lastShownGroupIndex = techSpecGroupOrder.indexOf(lastVisibleTech);

      if (lastShownGroupIndex === -1) {
        return prev.filter(
          (s) => BASE_STEP_ORDER.includes(s) || techSpecGroupOrder.includes(s),
        );
      }

      const baseVisible = prev.filter((s) => BASE_STEP_ORDER.includes(s));
      const techVisible = techSpecGroupOrder.slice(0, lastShownGroupIndex + 1);

      const merged = [...baseVisible];
      techVisible.forEach((s) => {
        if (!merged.includes(s)) merged.push(s);
      });

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

  const suppliers = uniq(
    products
      .filter((p) => {
        if (filters["Product Usage"]?.length && !filters["Product Usage"].includes(p.categoryTypes?.[0]?.categoryTypeName)) return false;
        if (filters["Product Family"]?.length && !filters["Product Family"].includes(p.productFamilies?.[0]?.productFamilyName)) return false;
        if (filters["Product Class"]?.length && !filters["Product Class"].includes(p.productClass)) return false;
        if (filters["Price Point"]?.length && !filters["Price Point"].includes(getEffectivePricePoint(p))) return false;
        if (filters["Brand Origin"]?.length && !filters["Brand Origin"].includes(getEffectiveBrandOrigin(p))) return false;
        return true;
      })
      .map((p) => p.supplier?.supplierBrand),
  );

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
              const from = Number(match[1]);
              const to = Number(match[3]);
              if (num >= from && num <= to) return true;
            }
            return false;
          });
        }
        if (searchFilters[key])
          return value?.toLowerCase().includes(searchFilters[key].toLowerCase());
        return true;
      };

      if (!check("Product Usage", p.categoryTypes?.[0]?.categoryTypeName)) return false;
      if (!check("Product Family", p.productFamilies?.[0]?.productFamilyName)) return false;
      if (!check("Price Point", getEffectivePricePoint(p))) return false;
      if (!check("Brand Origin", getEffectiveBrandOrigin(p))) return false;
      if (!check("Product Class", p.productClass)) return false;
      if (!check("Supplier", p.supplier?.company)) return false;

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
      const hasValues = groupMap
        ? Array.from(groupMap.values()).some((s) => s.size > 0)
        : false;
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
      clearedSteps.forEach((step) => {
        delete updated[step];
      });
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

  /* ================= UI ================= */
  return (
    <div className="border rounded-lg bg-card flex flex-col h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-card p-4 border-b rounded-t-lg">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">Filters</h2>
          <div className="flex items-center gap-3">
            <button
              className="border px-2 py-1 rounded text-xs bg-neutral-100 hover:bg-neutral-200 transition-colors"
              onClick={() => {
                setFilters({});
                setSearchFilters({});
                setVisibleSteps(["Product Usage"]);
              }}
            >
              Clear Filters
            </button>
            {getPreviousStep() && (
              <button
                className="text-xs text-blue-600 underline whitespace-nowrap"
                onClick={() => handleBack(getPreviousStep()!)}
              >
                ← Back
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollContainerRef} className="overflow-y-auto flex-1 p-4 space-y-6">
        <div className="flex flex-col gap-4">

          {/* STEP 1 */}
          {visibleSteps.includes("Product Usage") && (
            <div ref={setStepRef("Product Usage")} className="w-full scroll-mt-4">
              <Section title="Product Usage" items={productUsages} filters={filters} toggle={toggle} setSearch={setSearch} sourceProducts={sourceProducts} products={products} />
            </div>
          )}

          {/* STEP 2 */}
          {visibleSteps.includes("Product Family") && (
            <div ref={setStepRef("Product Family")} className="w-full space-y-2 scroll-mt-4">
              <button className="text-xs text-blue-600 underline" onClick={() => handleBack("Product Family")}>← Back</button>
              <Section title="Product Family" items={productFamilies} filters={filters} toggle={toggle} setSearch={setSearch} sourceProducts={sourceProducts} products={products} />
            </div>
          )}

          {/* STEP 3 */}
          {visibleSteps.includes("Product Class") && (
            <div ref={setStepRef("Product Class")} className="w-full space-y-2 scroll-mt-4">
              <button className="text-xs text-blue-600 underline" onClick={() => handleBack("Product Class")}>← Back</button>
              <Section title="Product Class" items={productClasses} filters={filters} toggle={toggle} setSearch={setSearch} sourceProducts={sourceProducts} products={products} />
            </div>
          )}

          {/* STEP 4 */}
          {visibleSteps.includes("Price Point") && (
            <div ref={setStepRef("Price Point")} className="w-full space-y-2 scroll-mt-4">
              <button className="text-xs text-blue-600 underline" onClick={() => handleBack("Price Point")}>← Back</button>
              <Section title="Price Point" items={pricePoints} filters={filters} toggle={toggle} setSearch={setSearch} sourceProducts={sourceProducts} products={products} />
            </div>
          )}

          {/* STEP 5 */}
          {visibleSteps.includes("Brand Origin") && (
            <div ref={setStepRef("Brand Origin")} className="w-full space-y-2 scroll-mt-4">
              <button className="text-xs text-blue-600 underline" onClick={() => handleBack("Brand Origin")}>← Back</button>
              <Section title="Brand Origin" items={brandOrigins} filters={filters} toggle={toggle} setSearch={setSearch} sourceProducts={sourceProducts} products={products} />
            </div>
          )}

          {/* STEP 6 */}
          {visibleSteps.includes("Supplier Brand") && (
            <div ref={setStepRef("Supplier Brand")} className="w-full space-y-2 scroll-mt-4">
              <button className="text-xs text-blue-600 underline" onClick={() => handleBack("Supplier Brand")}>← Back</button>
              <Section title="Supplier Brand" items={suppliers} filters={filters} toggle={toggle} setSearch={setSearch} sourceProducts={sourceProducts} products={products} />
              {techSpecGroupOrder.length > 0 && !visibleSteps.includes(techSpecGroupOrder[0]) && (
                <button
                  className="mt-2 w-full text-xs border border-pink-300 text-pink-700 bg-pink-50 hover:bg-pink-100 rounded py-1.5 transition-colors"
                  onClick={() => advanceToNextStep("Supplier Brand")}
                >
                  Next: {techSpecGroupOrder[0]} →
                </button>
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

            // Find next non-empty group
            let nextGroupTitle: string | null = null;
            for (let i = groupIndex + 1; i < techSpecGroupOrder.length; i++) {
              const candidate = techSpecGroupOrder[i];
              const candidateMap = technicalSpecs.get(candidate);
              const candidateHasValues = candidateMap
                ? Array.from(candidateMap.values()).some((s) => s.size > 0)
                : false;
              if (candidateHasValues) {
                nextGroupTitle = candidate;
                break;
              }
            }

            return (
              <div key={groupTitle} ref={setStepRef(groupTitle)} className="w-full space-y-3 scroll-mt-4">
                <button className="text-xs text-blue-600 underline" onClick={() => handleBack(groupTitle)}>
                  ← Back
                </button>

                <div className="border rounded p-3 space-y-3 bg-pink-100">
                  {/* ✅ Group header with ℹ️ EyeDetails button */}
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm uppercase tracking-wide">
                      {groupTitle}
                    </p>
                    <EyeDetails groupTitle={groupTitle} filters={filters} />
                  </div>

                  {/* Spec sections */}
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
                      />
                    );
                  })}
                </div>

                {/* Next button */}
                {nextGroupTitle && !visibleSteps.includes(nextGroupTitle) && (
                  <button
                    className="w-full text-xs border border-pink-300 text-pink-700 bg-pink-50 hover:bg-pink-100 rounded py-1.5 transition-colors"
                    onClick={() => advanceToNextStep(groupTitle)}
                  >
                    Next: {nextGroupTitle} →
                  </button>
                )}
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}

/* ================= SECTION ================= */
function Section({ title, label, items, filters, toggle, setSearch, sourceProducts, products }: any) {
  const [input, setInput] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(true);

  const splitValuesLocal = (value: string): string[] => {
    if (!value) return [];
    return value.split("|").map((v: string) => v.trim()).filter(Boolean);
  };

  useEffect(() => {
    setSearch(title, input);
  }, [input]);

  const counts: Record<string, number> = {};
  items.forEach((val: string) => (counts[val] = 0));

  const currentStepIndex = BASE_STEP_ORDER.indexOf(title);
  const isTechSpecId = title.includes("||");

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
        else if (step === "Supplier Brand") value = p.supplier?.supplierBrand;
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
      if (filters["Supplier Brand"]?.length && !filters["Supplier Brand"].includes(p.supplier?.supplierBrand)) return false;
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
    } else {
      let value: any;
      if (title === "Product Usage") value = p.categoryTypes?.[0]?.categoryTypeName;
      else if (title === "Product Family") value = p.productFamilies?.[0]?.productFamilyName;
      else if (title === "Product Class") value = p.productClass;
      else if (title === "Price Point") value = getEffectivePricePointLocal(p);
      else if (title === "Brand Origin") value = getEffectiveBrandOriginLocal(p);
      else if (title === "Supplier Brand") value = p.supplier?.supplierBrand;
      if (counts[value] !== undefined) counts[value]++;
    }
  });

  const visible = items.filter((i: string) => {
    if (!input) return true;
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
    const extractNumbers = (str: string) => {
      const matches = str.match(/(\d+(\.\d+)?)/g);
      return matches ? matches.map(Number) : [];
    };
    const inputNums = extractNumbers(input);
    if (inputNums.length > 0) {
      let bestItem = null, bestDiff = Infinity, highestItem = null, highestValue = -Infinity;
      items.forEach((item: string) => {
        const nums = extractNumbers(item);
        if (nums.length === 0) return;
        const compareNum = nums[0];
        if (compareNum > highestValue) { highestValue = compareNum; highestItem = item; }
        if (compareNum > inputNums[0]) {
          const diff = compareNum - inputNums[0];
          if (diff < bestDiff) { bestDiff = diff; bestItem = item; }
        }
      });
      if (!bestItem && highestItem) return { value: highestItem, phrase: "Highest available" };
      if (bestItem) return { value: bestItem, phrase: pickPhrase() };
      return null;
    }
    let bestMatch = null, bestScore = Infinity;
    items.forEach((item: string) => {
      if (/\d/.test(item)) return;
      const score = levenshtein(input.toLowerCase(), item.toLowerCase());
      if (score < bestScore && score <= 3) { bestScore = score; bestMatch = item; }
    });
    if (bestMatch) return { value: bestMatch, phrase: pickPhrase() };
    return null;
  })();

  const stepColor = isTechSpecId ? "bg-white" : (stepColors[title] ?? "bg-gray-50");
  const isLongList = visible.length > COLLAPSE_THRESHOLD;
  const showScrollable = isLongList && !input;

  return (
    <div className={`border rounded p-2 space-y-2 ${stepColor}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label ?? title}</p>
        {isLongList && !input && (
          <button className="text-xs text-blue-600 underline shrink-0 ml-2" onClick={() => setIsCollapsed((prev) => !prev)}>
            {isCollapsed ? `Show all (${visible.length})` : "Collapse"}
          </button>
        )}
      </div>

      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Type to search..."
          value={input}
          onValueChange={(val) => { setInput(val); if (val) setIsCollapsed(false); }}
        />

        {visible.length === 0 && (
          <CommandEmpty>
            No results
            {suggestion && (
              <div className="text-blue-500 cursor-pointer mt-1" onClick={() => setInput(suggestion.value)}>
                {suggestion.phrase}: <b>{suggestion.value}</b>
              </div>
            )}
          </CommandEmpty>
        )}

        {visible.length > 0 && (
          <CommandGroup className={showScrollable ? isCollapsed ? "max-h-[200px] overflow-y-auto" : "max-h-[240px] overflow-y-auto" : ""}>
            {visible.map((i: string) => {
              const isDisabled = (counts[i] ?? 0) === 0 && !filters[title]?.includes(i);
              return (
                <CommandItem
                  key={i}
                  onSelect={() => { if (isDisabled) return; toggle(title, i); }}
                  className={isDisabled ? "opacity-40" : ""}
                >
                  <Check className={`mr-2 h-4 w-4 ${filters[title]?.includes(i) ? "opacity-100" : "opacity-0"}`} />
                  <div className="flex justify-between w-full">
                    <span>{i}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded">{counts[i] ?? 0}</span>
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
