"use client";

import { useState, useEffect } from "react";

type Props = {
  products: any[];
  onFilter: (filtered: any[]) => void;
};

export default function FilteringComponent({ products, onFilter }: Props) {
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  const formatPHP = (value?: number, decimals = 2) => {
    if (typeof value !== "number") return "-";

    return value.toLocaleString("en-PH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // ===== FILTER OPTION BUILDERS =====

  const sisterCompanies = Array.from(
    new Set(products.map((p) => p.sisterCompanyName).filter(Boolean)),
  );

  const classifications = Array.from(
    new Set(products.map((p) => p.classificationName).filter(Boolean)),
  );

  const categories = Array.from(
    new Set(
      products
        .map((p) => p.categoryTypes?.[0]?.categoryTypeName)
        .filter(Boolean),
    ),
  );

  const productTypes = Array.from(
    new Set(
      products.map((p) => p.productTypes?.[0]?.productTypeName).filter(Boolean),
    ),
  );

  const suppliers = Array.from(
    new Set(products.map((p) => p.supplier?.company).filter(Boolean)),
  );

  // ===== TECHNICAL SPECIFICATION FILTERS =====
  const technicalSpecs: Record<string, Set<string>> = {};

  products.forEach((p) => {
    p.technicalSpecifications?.forEach((group: any) => {
      const title = group.title;

      if (!technicalSpecs[title]) {
        technicalSpecs[title] = new Set();
      }

      group.specs?.forEach((spec: any) => {
        if (spec.value) {
          technicalSpecs[title].add(spec.value);
        }
      });
    });
  });

// ===== PRICING FILTERS =====
const pricingFilters: Record<string, string[]> = {
  "Unit Cost": Array.from(
    new Set(
      products
        .map((p) => formatPHP(p.logistics?.unitCost, 2))
        .filter((v) => v !== "-"),
    ),
  ),

  "Landed Cost": Array.from(
    new Set(
      products
        .map((p) => formatPHP(p.logistics?.landedCost, 2))
        .filter((v) => v !== "-"),
    ),
  ),

  "SRP Cost": Array.from(
    new Set(
      products
        .map((p) => formatPHP(p.logistics?.srp, 0))
        .filter((v) => v !== "-"),
    ),
  ),
};


  pricingFilters["Calculation Type"] = Array.from(
    new Set(products.map((p) => p.logistics?.calculationType).filter(Boolean))
  );

  pricingFilters["Category"] = Array.from(
    new Set(products.map((p) => p.logistics?.category).filter(Boolean))
  );

  pricingFilters["MOQ"] = Array.from(
    new Set(
      products
        .map((p) => p.logistics?.moq)
        .filter((v) => v !== undefined && v !== null)
    )
  ).map(String);

  pricingFilters["Multiple Dimensions"] = Array.from(
    new Set(products.map((p) => (p.logistics?.useArrayInput ? "Yes" : "No")))
  );

  pricingFilters["Qty Per Container"] = Array.from(
    new Set(
      products
        .map((p) => p.logistics?.qtyPerContainer)
        .filter((v) => v !== undefined && v !== null)
    )
  ).map(String);

  // ===== APPLY FILTER LOGIC =====
  useEffect(() => {
    const filtered = products.filter((p) => {
      if (
        filters["Sister Company"]?.length &&
        !filters["Sister Company"].includes(p.sisterCompanyName)
      )
        return false;

      if (
        filters["Classification Type"]?.length &&
        !filters["Classification Type"].includes(p.classificationName)
      )
        return false;

      if (
        filters["Category Type"]?.length &&
        !filters["Category Type"].includes(
          p.categoryTypes?.[0]?.categoryTypeName
        )
      )
        return false;

      if (
        filters["Product Type"]?.length &&
        !filters["Product Type"].includes(
          p.productTypes?.[0]?.productTypeName
        )
      )
        return false;

      if (filters["Landed Cost"]?.length) {
        const lc = formatPHP(p.logistics?.landedCost, 2);
        if (!filters["Landed Cost"].includes(lc)) return false;
      }

      if (filters["SRP Cost"]?.length) {
        const srp = formatPHP(p.logistics?.srp, 0);
        if (!filters["SRP Cost"].includes(srp)) return false;
      }

      for (const [title, values] of Object.entries(filters)) {
        if (!technicalSpecs[title]) continue;

        const productValues: string[] = [];

        p.technicalSpecifications?.forEach((group: any) => {
          if (group.title === title) {
            group.specs?.forEach((spec: any) => {
              if (spec.value) productValues.push(spec.value);
            });
          }
        });

        if (
          values.length &&
          !values.some((v) => productValues.includes(v))
        ) {
          return false;
        }
      }

      return true;
    });

    onFilter(filtered);
  }, [filters, products]);

  const toggleFilter = (title: string, value: string) => {
    setFilters((prev) => {
      const current = prev[title] || [];
      const exists = current.includes(value);

      return {
        ...prev,
        [title]: exists
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="border rounded-lg p-4 bg-card space-y-4">
      <h2 className="font-semibold">Filters</h2>

      <button
        className="border px-3 py-1 rounded text-sm"
        onClick={clearFilters}
      >
        Clear Filters
      </button>

      <div className="space-y-3 max-h-[800px] overflow-y-auto">
        <FilterSection
          title="Sister Company"
          items={sisterCompanies}
          filters={filters}
          toggleFilter={toggleFilter}
        />

        <FilterSection
          title="Classification Type"
          items={classifications}
          filters={filters}
          toggleFilter={toggleFilter}
        />

        <FilterSection
          title="Category Type"
          items={categories}
          filters={filters}
          toggleFilter={toggleFilter}
        />

        <FilterSection
          title="Product Type"
          items={productTypes}
          filters={filters}
          toggleFilter={toggleFilter}
        />

        <h3 className="font-semibold mt-4">Pricing</h3>

        {Object.entries(pricingFilters).map(([title, values]) => (
          <FilterSection
            key={title}
            title={title}
            items={values as string[]}
            filters={filters}
            toggleFilter={toggleFilter}
          />
        ))}
      </div>
    </div>
  );
}

// ===== REUSABLE FILTER COMPONENT =====
function FilterSection({
  title,
  items,
  filters,
  toggleFilter,
}: {
  title: string;
  items: string[];
  filters: Record<string, string[]>;
  toggleFilter: (title: string, value: string) => void;
}) {
  if (!items.length) return null;

  return (
    <div className="border rounded p-2 space-y-1">
      <p className="text-sm font-medium">{title}</p>

      {items.map((item) => (
        <label key={item} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={filters[title]?.includes(item) || false}
            onChange={() => toggleFilter(title, item)}
          />
          {item}
        </label>
      ))}
    </div>
  );
}
