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

  const brands = uniq(products.map((p) => p.brandName));

  const classifications = uniq(products.map((p) => p.classificationName));

  const categories = uniq(
    products.map((p) => p.categoryTypes?.[0]?.categoryTypeName),
  );

  const productTypes = uniq(
    products.map((p) => p.productTypes?.[0]?.productTypeName),
  );

  const suppliers = uniq(products.map((p) => p.supplier?.company));

  /* ✅ NEW: PRODUCT CATEGORY FILTER (Economy / Mid-End / To Be Evaluated) */
  const productCategories = uniq(products.map((p) => p.category));

  /* ================= TECH SPECS ================= */

  const technicalSpecs: Record<string, Record<string, Set<string>>> = {};

  products.forEach((p) =>
    p.technicalSpecifications?.forEach((g: any) =>
      g.specs?.forEach((s: any) => {
        if (!s.specId) return;

        const val = formatSpec(s);

        if (!val) return;

        technicalSpecs[g.title] ??= {};

        technicalSpecs[g.title][s.specId] ??= new Set();

        splitValues(val).forEach((single) => {
          technicalSpecs[g.title][s.specId].add(single);

          /* ADD RANGE EXPANSION SUPPORT */
          expandRange(single).forEach((num) => {
            technicalSpecs[g.title][s.specId].add(num);
          });
        });
      }),
    ),
  );

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

            /* RANGE MATCH SUPPORT */

            const match = valueStr.match(/(\d+)\s*-\s*(\d+)/);

            if (match && /^\d+$/.test(filterVal)) {
              const num = Number(filterVal);

              const from = Number(match[1]);
              const to = Number(match[2]);

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

      if (!check("Brand", p.brandName)) return false;

      if (!check("Classification Type", p.classificationName)) return false;

      if (!check("Category Type", p.categoryTypes?.[0]?.categoryTypeName))
        return false;

      if (!check("Product Type", p.productTypes?.[0]?.productTypeName))
        return false;

      if (!check("Supplier", p.supplier?.company)) return false;

      /* ✅ FIXED: USE p.category NOT logistics.category */

      if (!check("Category", p.category)) return false;

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

                expandRange(v).forEach((num) => {
                  pv.push(num);
                });
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

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        <Section
          title="Brand"
          items={brands}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        <Section
          title="Classification Type"
          items={classifications}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        {/* ✅ NEW CATEGORY FILTER */}
        <Section
          title="Category"
          items={productCategories}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        <Section
          title="Category Type"
          items={categories}
          filters={filters}
          toggle={toggle}
          setSearch={setSearch}
        />

        <Section
          title="Product Type"
          items={productTypes}
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

  const visible = items.filter((i: string) =>
    i.toLowerCase().includes(input.toLowerCase()),
  );

  return (
    <div className="border rounded p-2 space-y-2">
      <p className="text-sm font-medium">{label ?? title}</p>

      <Command>
        <CommandInput
          placeholder="Type to search..."
          value={input}
          onValueChange={setInput}
        />

        <CommandEmpty>No results</CommandEmpty>

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
      </Command>
    </div>
  );
}
