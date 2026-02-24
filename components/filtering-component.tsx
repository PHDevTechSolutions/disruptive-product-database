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
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({});

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
      .split(",")
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

  const productUsages = uniq(products.map((p) => p.categoryTypes?.[0]?.categoryTypeName));

  const productFamilies = uniq(products.map((p) => p.productFamilies?.[0]?.productFamilyName));

  const suppliers = uniq(products.map((p) => p.supplier?.company));

  /* ✅ PRICE POINT FILTER */
  const pricePoints = uniq(products.map((p) => p.pricePoint));

  /* ✅ BRAND ORIGIN FILTER */
  const brandOrigins = uniq(products.map((p) => p.brandOrigin));

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
        const specLabel: string = s.name || s.title || s.specId;
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

      if (!check("Product Usage", p.categoryTypes?.[0]?.categoryTypeName)) return false;
      if (!check("Product Family", p.productFamilies?.[0]?.productFamilyName)) return false;
      if (!check("Price Point", p.pricePoint)) return false;
      if (!check("Brand Origin", p.brandOrigin)) return false;
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

  const visible = items.filter((i: string) => {
    if (!input) return true;

    const normalize = (str: string) =>
      str.toLowerCase().replace(/[^0-9a-z.\-]/g, "");

    const extractNumbers = (str: string) => {
      const matches = str.match(/(\d+(\.\d+)?)/g);
      return matches ? matches.map(Number) : [];
    };

    const itemNorm = normalize(i);
    const inputNorm = normalize(input);

    /* -------------------------------- */
    /* CASE 1: INPUT IS RANGE */
    /* example: 150-200K */
    /* -------------------------------- */

    if (inputNorm.includes("-")) {
      const inputNums = extractNumbers(inputNorm);
      const itemNums = extractNumbers(itemNorm);

      if (inputNums.length >= 2 && itemNums.length >= 2) {
        const inputFrom = inputNums[0];
        const inputTo = inputNums[1];

        const itemFrom = itemNums[0];
        const itemTo = itemNums[1];

        /* overlap detection */
        if (
          inputFrom <= itemTo &&
          inputTo >= itemFrom
        ) {
          return true;
        }
      }
    }

    /* -------------------------------- */
    /* CASE 2: INPUT IS SINGLE NUMBER */
    /* example: 250 VAC */
    /* -------------------------------- */

    const inputNums = extractNumbers(inputNorm);
    const itemNums = extractNumbers(itemNorm);

    if (inputNums.length >= 1 && itemNums.length >= 2) {
      const num = inputNums[0];

      const from = itemNums[0];
      const to = itemNums[1];

      if (num >= from && num <= to) {
        return true;
      }
    }

    /* -------------------------------- */
    /* CASE 3: NORMAL FUZZY TEXT */
    /* -------------------------------- */

    if (itemNorm.includes(inputNorm)) return true;

    return false;
  });

  return (
    <div className="border rounded p-2 space-y-2">
      <p className="text-sm font-medium">{label ?? title}</p>

      {/* ✅ FIX IS HERE */}
      <Command shouldFilter={false}>

        <CommandInput
          placeholder="Type to search..."
          value={input}
          onValueChange={setInput}
        />

        {visible.length === 0 && (
          <CommandEmpty>No results</CommandEmpty>
        )}

        {visible.length > 0 && (
          <CommandGroup>
            {visible.map((i: string) => (
              <CommandItem key={i} onSelect={() => toggle(title, i)}>
                <Check
                  className={`mr-2 h-4 w-4 ${
                    filters[title]?.includes(i)
                      ? "opacity-100"
                      : "opacity-0"
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