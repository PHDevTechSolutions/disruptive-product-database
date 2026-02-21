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

  const brands = uniq(products.map((p) => p.brandName));

  const classifications = uniq(products.map((p) => p.classificationName));

  const categories = uniq(
    products.map((p) => p.categoryTypes?.[0]?.categoryTypeName),
  );

  const productTypes = uniq(
    products.map((p) => p.productTypes?.[0]?.productTypeName),
  );

  const suppliers = uniq(products.map((p) => p.supplier?.company));

  const technicalSpecs: Record<string, Record<string, Set<string>>> = {};

  products.forEach((p) =>
    p.technicalSpecifications?.forEach((g: any) =>
      g.specs?.forEach((s: any) => {
        if (!s.specId) return;

        const val = formatSpec(s);

        if (!val) return;

        technicalSpecs[g.title] ??= {};

        technicalSpecs[g.title][s.specId] ??= new Set();

        technicalSpecs[g.title][s.specId].add(val);
      }),
    ),
  );

  const pricingFilters: Record<string, string[]> = {
    "Landed Cost": uniq(
      products.map((p) => formatPHP(p.logistics?.landedCost, 2)),
    ).filter((v) => v !== "-"),

    "SRP Cost": uniq(
      products.map((p) => formatPHP(p.logistics?.srp, 0)),
    ).filter((v) => v !== "-"),
  };

  useEffect(() => {
    const filtered = products.filter((p) => {
      const check = (key: string, value: any) => {
        if (filters[key]?.length) return filters[key].includes(value);

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

      if (!check("Landed Cost", formatPHP(p.logistics?.landedCost, 2)))
        return false;

      if (!check("SRP Cost", formatPHP(p.logistics?.srp, 0))) return false;

      if (!check("Category", p.logistics?.category || "")) return false;

      if (
        !check("Multiple Dimensions", p.logistics?.useArrayInput ? "Yes" : "No")
      )
        return false;

      if (filters["Warranty"]?.length) {
        const w = p.logistics?.warranty;

        const val = w?.value ? `${w.value} ${w.unit}` : null;

        if (!val || !filters["Warranty"].includes(val)) return false;
      }

      if (filters["Specification Mode"]?.length) {
        const ok = p.technicalSpecifications?.some((g: any) =>
          g.specs?.some(
            (s: any) =>
              (filters["Specification Mode"].includes("Dimension") &&
                s.isDimension) ||
              (filters["Specification Mode"].includes("Ranging") &&
                s.isRanging) ||
              (filters["Specification Mode"].includes("Slashing") &&
                s.isSlashing) ||
              (filters["Specification Mode"].includes("IP Rating") &&
                s.isIPRating),
          ),
        );

        if (!ok) return false;
      }

      for (const [k, vals] of Object.entries(filters)) {
        if (!k.includes("||")) continue;

        const [gt, sn] = k.split("||");

        const pv: string[] = [];

        p.technicalSpecifications?.forEach((g: any) => {
          if (g.title !== gt) return;

          g.specs?.forEach((s: any) => {
            if (s.specId === sn) {
              const d = formatSpec(s);

              if (d) pv.push(d);
            }
          });
        });

        if (vals.length && !vals.some((v) => pv.includes(v))) return false;
      }

      return true;
    });

    onFilter(filtered);
  }, [filters, searchFilters, products]);

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

        <h3 className="font-semibold mt-4">Pricing</h3>

        {Object.entries(pricingFilters).map(([k, v]) => (
          <Section
            key={k}
            title={k}
            items={v}
            filters={filters}
            toggle={toggle}
            setSearch={setSearch}
          />
        ))}
      </div>
    </div>
  );
}

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
      {/* ✅ SHOW LABEL IF EXISTS, OTHERWISE TITLE */}
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
