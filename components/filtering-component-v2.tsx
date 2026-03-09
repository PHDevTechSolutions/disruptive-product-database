"use client";

import { useState, useEffect, useRef } from "react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Check } from "lucide-react";

type Props = {
  products: any[];
  onFilter: (filtered: any[]) => void;
};

export default function FilteringComponent({ products, onFilter }: Props) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  /* ================= STEP VISIBILITY CONTROL ================= */
  /* CTRL+F: STEP VISIBILITY CONTROL */

const stepOrder = [
  "Product Usage",
  "Product Family",
  "Product Class",
  "Price Point",
  "Brand Origin",
  "Supplier Brand",
];

  const [visibleSteps, setVisibleSteps] = useState<string[]>(["Product Usage"]);

  const getPreviousStep = () => {
    if (visibleSteps.length <= 1) return null;

    const lastVisible = visibleSteps[visibleSteps.length - 1];
    const lastIndex = stepOrder.indexOf(lastVisible);

    if (lastIndex <= 0) return null;

    return lastVisible;
  };

  /* ================= STEP ANCHOR REFS ================= */
  /* CTRL+F: STEP ANCHOR REFS */

  /* ================= STEP ANCHOR REFS CLEAN ================= */
  /* CTRL+F: STEP ANCHOR REFS CLEAN */

  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setStepRef = (step: string) => (el: HTMLDivElement | null) => {
    stepRefs.current[step] = el;
  };

  const scrollToStep = (step: string) => {
    setTimeout(() => {
      stepRefs.current[step]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const [searchFilters, setSearchFilters] = useState<Record<string, string>>(
    {},
  );

  const uniq = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));

  const formatPHP = (v?: number, d = 2) =>
    typeof v === "number"
      ? v.toLocaleString("en-PH", {
          minimumFractionDigits: d,
          maximumFractionDigits: d,
        })
      : "-";

  const splitValues = (value: string): string[] => {
    if (!value) return [];

    return value
      .split("|") // ✅ USE PIPE
      .map((v) => v.trim())
      .filter(Boolean);
  };

  const expandRange = (value: string): string[] => {
    const match = value.match(/(\d+)\s*-\s*(\d+)/);
    if (!match) return [];
    const from = Number(match[1]);
    const to = Number(match[2]);
    const result: string[] = [];
    for (let i = from; i <= to; i++) {
      result.push(i.toString());
    }
    return result;
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

  /* ================= BASIC FILTER SOURCES ================= */

  const productUsages = uniq(
    products.map((p) => p.categoryTypes?.[0]?.categoryTypeName),
  );

  /* ================= DEPENDENT PRODUCT FAMILY SOURCE ================= */
  /* CTRL+F: DEPENDENT PRODUCT FAMILY SOURCE */

  const productFamilies = uniq(
    products
      .filter((p) => {
        /* depend ONLY on Product Usage selection */

        if (filters["Product Usage"]?.length) {
          return filters["Product Usage"].includes(
            p.categoryTypes?.[0]?.categoryTypeName,
          );
        }

        return true;
      })
      .map((p) => p.productFamilies?.[0]?.productFamilyName),
  );

  const pricePoints = uniq(products.map((p) => p.pricePoint));

  const brandOrigins = uniq(products.map((p) => p.brandOrigin));

  const productClasses = uniq(products.map((p) => p.productClass));

  /* ================= TECH SPECS ================= */
  /* CTRL+F: TECH SPECS FILTERED SOURCE */

  const technicalSpecs: Record<string, Record<string, Set<string>>> = {};

  /* ================================================= */
  /* STEP 1: FILTER PRODUCTS BASED ON CURRENT FILTERS */
  /* ================================================= */

  const sourceProducts = products.filter((p) => {
const check = (key: string, value: any) => {
  if (!filters[key]?.length) return true;

  // multi-select support
  return filters[key].includes(value);
};

    if (!check("Product Usage", p.categoryTypes?.[0]?.categoryTypeName))
      return false;

    if (!check("Product Family", p.productFamilies?.[0]?.productFamilyName))
      return false;

    if (!check("Product Class", p.productClass)) return false;

    if (!check("Price Point", p.pricePoint)) return false;

    if (!check("Brand Origin", p.brandOrigin)) return false;

    if (!check("Supplier Brand", p.supplier?.supplierBrand)) return false;

    return true;
  });

  const suppliers = uniq(
    products

      .filter((p) => {
        /* apply all filters EXCEPT Supplier */

        if (
          filters["Product Usage"]?.length &&
          !filters["Product Usage"].includes(
            p.categoryTypes?.[0]?.categoryTypeName,
          )
        )
          return false;

        if (
          filters["Product Family"]?.length &&
          !filters["Product Family"].includes(
            p.productFamilies?.[0]?.productFamilyName,
          )
        )
          return false;

        if (
          filters["Product Class"]?.length &&
          !filters["Product Class"].includes(p.productClass)
        )
          return false;

        if (
          filters["Price Point"]?.length &&
          !filters["Price Point"].includes(p.pricePoint)
        )
          return false;

        if (
          filters["Brand Origin"]?.length &&
          !filters["Brand Origin"].includes(p.brandOrigin)
        )
          return false;

        /* DO NOT FILTER SUPPLIER HERE */

        return true;
      })

      .map((p) => p.supplier?.supplierBrand),
  );

  const buildCounts = (
    list: string[],
    extractor: (p: any) => string | string[] | undefined,
  ) => {
    const counts: Record<string, number> = {};

    list.forEach((val) => (counts[val] = 0));

    sourceProducts.forEach((p) => {
      const extracted = extractor(p);

      if (Array.isArray(extracted)) {
        extracted.forEach((v) => {
          if (counts[v] !== undefined) counts[v]++;
        });
      } else {
        if (counts[extracted as string] !== undefined)
          counts[extracted as string]++;
      }
    });

    return counts;
  };

  /* ================================================= */
  /* STEP 2: BUILD TECH SPECS ONLY FROM FILTERED DATA */
  /* ================================================= */

  sourceProducts.forEach((p) => {
    if (!p?.technicalSpecifications) return;

    p.technicalSpecifications.forEach((g: any) => {
      if (!g?.title) return;

      technicalSpecs[g.title] ??= {};

      if (!Array.isArray(g.specs)) return;

      g.specs.forEach((s: any) => {
        if (!s?.specId) return;

        const val = formatSpec(s);

        if (!val) return;

        const specLabel: string = s.specId;

        technicalSpecs[g.title][specLabel] ??= new Set<string>();

        splitValues(val).forEach((single) => {
          technicalSpecs[g.title][specLabel].add(single);
        });
      });
    });
  });

  /* ================= FILTER ENGINE ================= */

useEffect(() => {

  // expose active filters globally for TDS
  (window as any).__ACTIVE_FILTERS__ = Object.values(filters).flat();

  const filtered = products.filter((p) => {
      const check = (key: string, value: any) => {
        if (filters[key]?.length) {
          return filters[key].some((filterVal) => {
            if (!value) return false;
            const valueStr = value.toString();
            /* EXACT MATCH */
            if (valueStr === filterVal) return true;
            /* RANGE MATCH SUPPORT — FIXED FOR DECIMAL AND PLAIN TEXT */
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
          return value
            ?.toLowerCase()
            .includes(searchFilters[key].toLowerCase());

        return true;
      };

      if (!check("Product Usage", p.categoryTypes?.[0]?.categoryTypeName))
        return false;
      if (!check("Product Family", p.productFamilies?.[0]?.productFamilyName))
        return false;
      if (!check("Price Point", p.pricePoint)) return false;
      if (!check("Brand Origin", p.brandOrigin)) return false;
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
              splitValues(d).forEach((v) => {
                pv.push(v);
              });
            }
          });
        });
        if (vals.length && !vals.some((v) => pv.includes(v))) return false;
      }
      return true;
    });

    onFilter(filtered);
  }, [filters, searchFilters, products]);

  /* ================= UI ACTIONS ================= */

  /* ================= STEP TOGGLE FILTER ================= */
  /* CTRL+F: STEP TOGGLE FILTER */

  const toggle = (title: string, value: string) => {
    const isSupplier = title === "Supplier";

    const supplierAnchor = stepRefs.current["Supplier"];
    const anchorTop = supplierAnchor?.getBoundingClientRect().top;

    setFilters((prev) => {
      const alreadySelected = prev[title]?.includes(value);

      const updated = {
        ...prev,
        [title]: alreadySelected
          ? prev[title].filter((v) => v !== value)
          : [...(prev[title] || []), value],
      };

      const currentIndex = stepOrder.indexOf(title);

      if (!alreadySelected && title !== "Supplier") {
        if (currentIndex !== -1 && currentIndex < stepOrder.length - 1) {
          const nextStep = stepOrder[currentIndex + 1];

          setVisibleSteps((prevSteps) => {
            if (!prevSteps.includes(nextStep)) {
              return [...prevSteps, nextStep];
            }
            return prevSteps;
          });

          scrollToStep(nextStep);
        }
      }

      return updated;
    });

    // 🔥 restore Supplier anchor position
    if (isSupplier && supplierAnchor) {
      requestAnimationFrame(() => {
        const newTop = supplierAnchor.getBoundingClientRect().top;
        const diff = newTop - (anchorTop ?? 0);

        window.scrollBy({
          top: diff,
          behavior: "auto",
        });
      });
    }
  };
  const handleBack = (title: string) => {
    const currentIndex = stepOrder.indexOf(title);
    if (currentIndex <= 0) return;

    setVisibleSteps(stepOrder.slice(0, currentIndex));

    setFilters((prev) => {
      const updated = { ...prev };

      // Remove current step + next steps
      stepOrder.slice(currentIndex).forEach((step) => {
        delete updated[step];
      });

      // 🔥 ALSO remove all technical spec filters
      Object.keys(updated).forEach((key) => {
        if (key.includes("||")) {
          delete updated[key];
        }
      });

      return updated;
    });
  };
  const setSearch = (title: string, value: string) =>
    setSearchFilters((prev) => ({
      ...prev,
      [title]: value,
    }));

  /* ================= UI ================= */

  return (
    <div className="border rounded-lg bg-card">
      <div className="sticky top-0 z-10 bg-card p-4 border-b">
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
      {/* ================= HORIZONTAL STEP CONTAINER ================= */}

      <div className="p-4 space-y-6">
        {/* ================= HORIZONTAL STEP CONTAINER ================= */}
        {/* CTRL+F: HORIZONTAL STEP CONTAINER */}

        <div className="overflow-x-auto">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              {/* STEP 1 */}

              {visibleSteps.includes("Product Usage") && (
                <div
                  ref={setStepRef("Product Usage")}
                  className="w-[260px] shrink-0 scroll-mt-24"
                >
                  <Section
                    title="Product Usage"
                    items={productUsages}
                    filters={filters}
                    toggle={toggle}
                    setSearch={setSearch}
                    sourceProducts={sourceProducts}
                    products={products}
                  />
                </div>
              )}

              {/* STEP 2 */}

              {visibleSteps.includes("Product Family") && (
                <div
                  ref={setStepRef("Product Family")}
                  className="w-[260px] shrink-0 space-y-2 scroll-mt-24"
                >
                  <button
                    className="text-xs text-blue-600 underline"
                    onClick={() => handleBack("Product Family")}
                  >
                    ← Back
                  </button>
                  <Section
                    title="Product Family"
                    items={productFamilies}
                    filters={filters}
                    toggle={toggle}
                    setSearch={setSearch}
                    sourceProducts={sourceProducts}
                    products={products}
                  />
                </div>
              )}

              {/* STEP 3 */}

              {visibleSteps.includes("Product Class") && (
                <div
                  ref={setStepRef("Product Class")}
                  className="w-[260px] shrink-0 space-y-2 scroll-mt-24"
                >
                  <button
                    className="text-xs text-blue-600 underline"
                    onClick={() => handleBack("Product Class")}
                  >
                    ← Back
                  </button>
                  <Section
                    title="Product Class"
                    items={productClasses}
                    filters={filters}
                    toggle={toggle}
                    setSearch={setSearch}
                    sourceProducts={sourceProducts}
                    products={products}
                  />
                </div>
              )}

              {/* STEP 4 */}

              {visibleSteps.includes("Price Point") && (
                <div
                  ref={setStepRef("Price Point")}
                  className="w-[260px] shrink-0 space-y-2 scroll-mt-24"
                >
                  <button
                    className="text-xs text-blue-600 underline"
                    onClick={() => handleBack("Price Point")}
                  >
                    ← Back
                  </button>
                  <Section
                    title="Price Point"
                    items={pricePoints}
                    filters={filters}
                    toggle={toggle}
                    setSearch={setSearch}
                    sourceProducts={sourceProducts}
                    products={products}
                  />
                </div>
              )}

              {/* STEP 5 */}

              {visibleSteps.includes("Brand Origin") && (
                <div
                  ref={setStepRef("Brand Origin")}
                  className="w-[260px] shrink-0 space-y-2 scroll-mt-24"
                >
                  <button
                    className="text-xs text-blue-600 underline"
                    onClick={() => handleBack("Brand Origin")}
                  >
                    ← Back
                  </button>
                  <Section
                    title="Brand Origin"
                    items={brandOrigins}
                    filters={filters}
                    toggle={toggle}
                    setSearch={setSearch}
                    sourceProducts={sourceProducts}
                    products={products}
                  />
                </div>
              )}

              {/* STEP 6 */}
            </div>
          </div>
        </div>

        {/* ================= TECH SPECS NEW ROW ================= */}
        {/* CTRL+F: TECH SPECS NEW ROW */}

        {visibleSteps.includes("Supplier Brand") && (
          <div
           ref={setStepRef("Supplier Brand")}
            className="space-y-4 scroll-mt-24 bg-pink-100 p-3 rounded"
          >
            <button
              className="text-xs text-blue-600 underline"
              onClick={() => handleBack("Supplier Brand")}
            >
              ← Back
            </button>
            <h3 className="font-semibold text-base">
              Technical Specifications
            </h3>{" "}
            <div className="w-[260px] shrink-0">
              <Section
                title="Supplier Brand"
                items={suppliers}
                filters={filters}
                toggle={toggle}
                setSearch={setSearch}
                sourceProducts={sourceProducts}
                products={products}
              />
            </div>
            <div className="flex flex-col gap-4">
              {Object.entries(technicalSpecs).map(([gt, s]) => (
                <div key={gt} className="border rounded p-3 space-y-3 bg-card">
                  <p className="font-semibold text-sm">{gt}</p>

                  {Object.entries(s).map(([sn, vals]) => (
                    <Section
                      key={sn}
                      title={`${gt}||${sn}`}
                      label={sn}
                      items={[...vals]}
                      filters={filters}
                      toggle={toggle}
                      setSearch={setSearch}
                      sourceProducts={sourceProducts}
                      products={products}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= STEP LABEL CONFIG ================= */
/* CTRL+F: STEP LABEL CONFIG */

const stepLabels: Record<string, string> = {
  "Product Usage": "STEP 1",
  "Product Family": "STEP 2",
  "Product Class": "STEP 3",
  "Price Point": "STEP 4",
  "Brand Origin": "STEP 5",
  "Supplier Brand": "STEP 6",
};

/* ================= SECTION ================= */
/* CTRL+F: SECTION WITH QUANTITY BADGE COMPLETE FUNCTION */

const stepColors: Record<string, string> = {
  "Product Usage": "bg-blue-100",
  "Product Family": "bg-green-100",
  "Product Class": "bg-yellow-100",
  "Price Point": "bg-purple-100",
  "Brand Origin": "bg-orange-100",
  "Supplier Brand": "bg-pink-100",
};

function Section({
  title,
  label,
  items,
  filters,
  toggle,
  setSearch,
  sourceProducts,
  products,
}: any) {
  const [input, setInput] = useState("");

  const splitValues = (value: string): string[] => {
    if (!value) return [];

    return value
      .split("|")
      .map((v: string) => v.trim())
      .filter(Boolean);
  };

  useEffect(() => {
    setSearch(title, input);
  }, [input]);

  const counts: Record<string, number> = {};

  items.forEach((val: string) => (counts[val] = 0));

  /* ============================================ */
  /* CTRL+F: ADDED FOR DISABLED AND FILTERED COUNTS */
  /* Use sourceProducts for ALL steps so counts reflect filters */
  /* ============================================ */

  /* ============================================ */
  /* CTRL+F: FACET COUNTS FIX */
  /* Correct counts per step */
  /* ============================================ */

  const stepOrder = [
    "Product Usage",
    "Product Family",
    "Product Class",
    "Price Point",
    "Brand Origin",
    "Supplier",
  ];

  const currentStepIndex = stepOrder.indexOf(title);

  const baseList = products.filter((p: any) => {
    /* APPLY NORMAL STEP FILTERS */
    const stepMatch = stepOrder.every((step, index) => {
      if (index > currentStepIndex) return true;
      if (index === currentStepIndex) return true;

      if (!filters[step]?.length) return true;

      let value;

      if (step === "Product Usage")
        value = p.categoryTypes?.[0]?.categoryTypeName;
      else if (step === "Product Family")
        value = p.productFamilies?.[0]?.productFamilyName;
      else if (step === "Product Class") value = p.productClass;
      else if (step === "Price Point") value = p.pricePoint;
      else if (step === "Brand Origin") value = p.brandOrigin;
      else if (step === "Supplier Brand") value = p.supplier?.supplierBrand;

      return filters[step].includes(value);
    });

    if (!stepMatch) return false;

    /* APPLY TECHNICAL SPEC FILTERS */
    for (const [k, vals] of Object.entries(filters) as [string, string[]][]) {
      if (!k.includes("||")) continue;

      const [gt, sn] = k.split("||");

      const productVals: string[] = [];

      p.technicalSpecifications?.forEach((g: any) => {
        if (g.title !== gt) return;

        g.specs?.forEach((s: any) => {
          if (s.specId !== sn) return;

          const val = s.value || "";

          splitValues(val).forEach((v: string) => {
            productVals.push(v);
          });
        });
      });

      if (vals.length && !vals.some((v) => productVals.includes(v)))
        return false;
    }

    return true;
  });
baseList?.forEach((p: any) => {
  let value;

  if (title === "Product Usage") {
    value = p.categoryTypes?.[0]?.categoryTypeName;
  } 
  else if (title === "Product Family") {
    value = p.productFamilies?.[0]?.productFamilyName;
  } 
  else if (title === "Product Class") {
    value = p.productClass;
  } 
  else if (title === "Price Point") {
    value = p.pricePoint;
  } 
  else if (title === "Brand Origin") {
    value = p.brandOrigin;
  } 
else if (title === "Supplier Brand") {
  value = p.supplier?.supplierBrand;
}

  /* ================= TECHNICAL SPEC COUNTS FIX ================= */
  else if (title.includes("||")) {

    const [groupTitle, specName] = title.split("||");

    const values: string[] = [];

    p.technicalSpecifications?.forEach((g: any) => {
      if (g.title !== groupTitle) return;

      g.specs?.forEach((s: any) => {
        if (s.specId !== specName) return;

        const val = s.value || "";

        splitValues(val).forEach((single: string) => {
          values.push(single);
        });
      });
    });

    values.forEach((v) => {
      if (counts[v] !== undefined) {
        counts[v]++;
      }
    });

    return;
  }

  if (counts[value] !== undefined) {
    counts[value]++;
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

  if (itemNums.length === 0) {
    return i.toLowerCase().includes(input.toLowerCase());
  }

  /* ================= RANGE INPUT ================= */
  if (inputNums.length >= 2) {
    const inputMin = inputNums[0];
    const inputMax = inputNums[1];

    if (itemNums.length === 1) {
      const val = itemNums[0];
      return val >= inputMin && val <= inputMax;
    }

    if (itemNums.length >= 2) {
      const itemMin = itemNums[0];
      const itemMax = itemNums[1];

      return !(itemMax < inputMin || itemMin > inputMax);
    }
  }

  /* ================= SINGLE NUMBER INPUT ================= */
  if (inputNums.length === 1) {
    const inputVal = inputNums[0];

    if (itemNums.length === 1) {
      return itemNums[0] >= inputVal;
    }

    if (itemNums.length >= 2) {
      const itemMin = itemNums[0];
      const itemMax = itemNums[1];

      return itemMax >= inputVal;
    }
  }

  return i.toLowerCase().includes(input.toLowerCase());
});
  const levenshtein = (a: string, b: string) => {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);

    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] =
          b[i - 1] === a[j - 1]
            ? matrix[i - 1][j - 1]
            : 1 +
              Math.min(
                matrix[i - 1][j],
                matrix[i][j - 1],
                matrix[i - 1][j - 1],
              );
      }
    }

    return matrix[b.length][a.length];
  };

  const suggestionPhrases = [
    "Did you mean",
    "Closest match",
    "Maybe you meant",
    "Try this instead",
    "Nearest value",
    "Best match",
    "Closest available",
    "You might be looking for",
  ];

  const pickPhrase = () =>
    suggestionPhrases[Math.floor(Math.random() * suggestionPhrases.length)];

  const suggestion = (() => {
    if (!input || visible.length > 0) return null;

    const extractNumbers = (str: string) => {
      const matches = str.match(/(\d+(\.\d+)?)/g);
      return matches ? matches.map(Number) : [];
    };

    const inputNums = extractNumbers(input);

    if (inputNums.length > 0) {
      let bestItem = null;
      let bestDiff = Infinity;

      /* CTRL+F: HIGHEST VALUE FALLBACK */
      let highestItem = null;
      let highestValue = -Infinity;

      items.forEach((item: string) => {
        const nums = extractNumbers(item);
        if (nums.length === 0) return;

        const compareNum = nums[0];

        /* track highest value */
        if (compareNum > highestValue) {
          highestValue = compareNum;
          highestItem = item;
        }

        if (compareNum > inputNums[0]) {
          const diff = compareNum - inputNums[0];

          if (diff < bestDiff) {
            bestDiff = diff;
            bestItem = item;
          }
        }
      });

      /* if no higher found → return highest */
      if (!bestItem && highestItem)
        return { value: highestItem, phrase: "Highest available" };

      if (bestItem) return { value: bestItem, phrase: pickPhrase() };

      return null;
    }

    let bestMatch = null;
    let bestScore = Infinity;

    items.forEach((item: string) => {
      if (/\d/.test(item)) return;

      const score = levenshtein(input.toLowerCase(), item.toLowerCase());

      if (score < bestScore && score <= 3) {
        bestScore = score;
        bestMatch = item;
      }
    });

    if (bestMatch) return { value: bestMatch, phrase: pickPhrase() };

    return null;
  })();

  const stepColor = stepColors[title] ?? "bg-gray-50";

  return (
    <div className={`border rounded p-2 space-y-2 ${stepColor}`}>
      <p className="text-sm font-medium">{label ?? title}</p>

      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Type to search..."
          value={input}
          onValueChange={setInput}
        />

        {visible.length === 0 && (
          <CommandEmpty>
            No results
            {suggestion && (
              <div
                className="text-blue-500 cursor-pointer mt-1"
                onClick={() => setInput(suggestion.value)}
              >
                {suggestion.phrase}: <b>{suggestion.value}</b>
              </div>
            )}
          </CommandEmpty>
        )}

        {visible.length > 0 && (
          <CommandGroup>
            {visible.map((i: string) => {
const isDisabled =
  (counts[i] ?? 0) === 0 && !filters[title]?.includes(i);

              return (
                <CommandItem
                  key={i}
                  /* CTRL+F: DISABLED CLICK FIX */
onSelect={() => {
  if (isDisabled) return; // block selecting zero-count options
  toggle(title, i);
}}
                  /* CTRL+F: DISABLED STYLE */
                  className={isDisabled ? "opacity-40" : ""}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      filters[title]?.includes(i) ? "opacity-100" : "opacity-0"
                    }`}
                  />

                  <div className="flex justify-between w-full">
                    <span>{i}</span>

                    <span className="text-xs bg-muted px-2 py-0.5 rounded">
                      {counts[i] ?? 0}
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
