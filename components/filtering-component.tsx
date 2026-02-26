"use client";

import { useState, useEffect } from "react";
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

  const productFamilies = uniq(
    products.map((p) => p.productFamilies?.[0]?.productFamilyName),
  );

  const suppliers = uniq(products.map((p) => p.supplier?.company));

  /* ✅ PRICE POINT FILTER */
  const pricePoints = uniq(products.map((p) => p.pricePoint));

  /* ✅ BRAND ORIGIN FILTER */
  const brandOrigins = uniq(products.map((p) => p.brandOrigin));

  const productClasses = uniq(products.map((p) => p.productClass));

  /* ================= TECH SPECS ================= */

  const technicalSpecs: Record<string, Record<string, Set<string>>> = {};

  products.forEach((p) => {
    if (!p?.technicalSpecifications) return;
    p.technicalSpecifications.forEach((g: any) => {
      if (!g?.title) return;
      /* ensure group exists */
      technicalSpecs[g.title] ??= {};
      if (!Array.isArray(g.specs)) return;
      g.specs.forEach((s: any) => {
        if (!s?.specId) return;
        const val = formatSpec(s);
        if (!val) return;
        /* ✅ PRIORITY: name → title → specId */
        const specLabel: string = s.specId;
        /* ensure spec exists */
        technicalSpecs[g.title][specLabel] ??= new Set<string>();
        /* add split values */
        splitValues(val).forEach((single) => {
          technicalSpecs[g.title][specLabel].add(single);
        });
      });
    });
  });

  /* ================= FILTER ENGINE ================= */

  useEffect(() => {
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

      for (const [k, vals] of Object.entries(filters)) {
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

  const toggle = (title: string, value: string) =>
    setFilters((prev) => ({
      ...prev,
      [title]: prev[title]?.includes(value)
        ? prev[title].filter((v) => v !== value)
        : [...(prev[title] || []), value],
    }));

  const setSearch = (title: string, value: string) =>
    setSearchFilters((prev) => ({
      ...prev,
      [title]: value,
    }));

  /* ================= UI ================= */

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <h2 className="font-semibold">Filters</h2>

      <button
        className="border px-3 py-1 rounded text-sm"
        onClick={() => {
          setFilters({});
          setSearchFilters({});
        }}
      >
        Clear Filters
      </button>

      <div className="space-y-3">
        <Section
          title="Product Usage"
          items={productUsages}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        <Section
          title="Product Family"
          items={productFamilies}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        {/* ✅ PRICE POINT FILTER */}
        <Section
          title="Price Point"
          items={pricePoints}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        {/* ✅ BRAND ORIGIN FILTER */}
        <Section
          title="Brand Origin"
          items={brandOrigins}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        <Section
          title="Product Class"
          items={productClasses}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        <Section
          title="Supplier"
          items={suppliers}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        {/* TECH SPECS */}

        <h3 className="font-semibold mt-4">Technical Specifications</h3>

        {Object.entries(technicalSpecs).map(([gt, s]) => (
          <div key={gt} className="border rounded p-2 space-y-2">
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
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= SECTION ================= */

function Section({ title, label, items, filters, toggle, setSearch }: any) {
  const [input, setInput] = useState("");

  useEffect(() => {
    setSearch(title, input);
  }, [input]);

  /* ============================= */
  /* FILTER VISIBLE ITEMS */
  /* ============================= */

  const visible = items.filter((i: string) => {
    if (!input) return true;

    const extractNumbers = (str: string) => {
      const matches = str.match(/(\d+(\.\d+)?)/g);
      return matches ? matches.map(Number) : [];
    };

    const itemNums = extractNumbers(i);
    const inputNums = extractNumbers(input);

    if (inputNums.length >= 2 && itemNums.length >= 2) {
      return inputNums[0] >= itemNums[0] && inputNums[1] <= itemNums[1];
    }

    if (inputNums.length === 1 && itemNums.length >= 2) {
      return inputNums[0] >= itemNums[0] && inputNums[0] <= itemNums[1];
    }

    return i.toLowerCase().includes(input.toLowerCase());
  });

  /* ============================= */
  /* DID YOU MEAN */
  /* ============================= */

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

  const suggestion = (() => {
    if (!input || visible.length > 0) return null;

    const extractNumbers = (str: string) => {
      const matches = str.match(/(\d+(\.\d+)?)/g);
      return matches ? matches.map(Number) : [];
    };

    const inputNums = extractNumbers(input);

    /* ============================= */
    /* CASE 1: NUMBER / RANGE INPUT */
    /* suggest NEXT HIGHER RANGE */
    /* ============================= */

    if (inputNums.length > 0) {
      let bestItem = null;
      let bestDiff = Infinity;

      items.forEach((item: string) => {
        const nums = extractNumbers(item);

        if (nums.length === 0) return;

        /* get the comparison number */
        const compareNum = nums[0];

        if (compareNum > inputNums[0]) {
          const diff = compareNum - inputNums[0];

          if (diff < bestDiff) {
            bestDiff = diff;
            bestItem = item;
          }
        }
      });

      return bestItem;
    }

    /* ============================= */
    /* CASE 2: TEXT INPUT */
    /* original typo logic */
    /* ============================= */

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

    return bestMatch;
  })();
  /* ============================= */

  return (
    <div className="border rounded p-2 space-y-2">
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
                onClick={() => setInput(suggestion)}
              >
                {/\d/.test(input) ? (
                  <>
                    Suggested: <b>{suggestion}</b>
                  </>
                ) : (
                  <>
                    Did you mean: <b>{suggestion}</b>
                  </>
                )}
              </div>
            )}
          </CommandEmpty>
        )}

        {visible.length > 0 && (
          <CommandGroup>
            {visible.map((i: string) => (
              <CommandItem key={i} onSelect={() => toggle(title, i)}>
                <Check
                  className={`mr-2 h-4 w-4 ${
                    filters[title]?.includes(i) ? "opacity-100" : "opacity-0"
                  }`}
                />
                {i}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </Command>
    </div>
  );
}
