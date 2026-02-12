"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/contexts/UserContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import AddProductDeleteProductItem from "@/components/add-product-delete-product-item";

export default function ProductsPage() {
  const router = useRouter();
  const { userId } = useUser();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ===== DYNAMIC FILTER STATE =====
  const [filters, setFilters] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }

    const q = query(collection(db, "products"), where("isActive", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [userId, router]);

  const format2 = (value?: number) =>
    typeof value === "number"
      ? value.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";

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

  Warranty: Array.from(
    new Set(
      products
        .map((p) =>
          p.logistics?.warranty
            ? `${p.logistics.warranty.value} ${p.logistics.warranty.unit}`
            : null,
        )
        .filter(Boolean),
    ),
  ) as string[],
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
  const filteredProducts = products.filter((p) => {
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
      !filters["Category Type"].includes(p.categoryTypes?.[0]?.categoryTypeName)
    )
      return false;

    if (
      filters["Product Type"]?.length &&
      !filters["Product Type"].includes(p.productTypes?.[0]?.productTypeName)
    )
      return false;

    if (
      filters["Supplier / Company"]?.length &&
      !filters["Supplier / Company"].includes(p.supplier?.company)
    )
      return false;

// ===== PRICING / LOGISTICS FILTERS =====

if (
  filters["Calculation Type"]?.length &&
  !filters["Calculation Type"].includes(p.logistics?.calculationType)
)
  return false;

if (
  filters["Category"]?.length &&
  !filters["Category"].includes(p.logistics?.category)
)
  return false;

if (filters["MOQ"]?.length) {
  const moqValue = String(p.logistics?.moq ?? "");
  if (!filters["MOQ"].includes(moqValue)) return false;
}

if (filters["Multiple Dimensions"]?.length) {
  const mode = p.logistics?.useArrayInput ? "Yes" : "No";
  if (!filters["Multiple Dimensions"].includes(mode)) return false;
}

if (filters["Qty Per Container"]?.length) {
  const qty = String(p.logistics?.qtyPerContainer ?? "");
  if (!filters["Qty Per Container"].includes(qty)) return false;
}

if (filters["Unit Cost"]?.length) {
  const uc = formatPHP(p.logistics?.unitCost, 2);
  if (!filters["Unit Cost"].includes(uc)) return false;
}

if (filters["Landed Cost"]?.length) {
  const lc = formatPHP(p.logistics?.landedCost, 2);
  if (!filters["Landed Cost"].includes(lc)) return false;
}

if (filters["SRP Cost"]?.length) {
  const srp = formatPHP(p.logistics?.srp, 0);
  if (!filters["SRP Cost"].includes(srp)) return false;
}


if (filters["Warranty"]?.length) {
  const w = p.logistics?.warranty;
  const warrantyString = w ? `${w.value} ${w.unit}` : "";
  if (!filters["Warranty"].includes(warrantyString)) return false;
}


    // Technical Specs
    for (const [title, values] of Object.entries(filters)) {
      if (!technicalSpecs[title]) continue;

      const productValues: string[] = [];

      p.technicalSpecifications?.forEach((group: any) => {
        if (group.title === title) {
          group.specs?.forEach((spec: any) => {
            if (spec.value) productValues.push(spec.value);

            if (spec.isIPRating) {
              productValues.push(
                `IP${spec.ipFirst || ""}${spec.ipSecond || ""}`,
              );
            }

            if (spec.isSlashing) {
              productValues.push(...spec.slashValues);
            }
          });
        }
      });

      if (values.length && !values.some((v) => productValues.includes(v))) {
        return false;
      }
    }

    return true;
  });

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
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6 pb-[140px] md:pb-6">
      <SidebarTrigger className="hidden md:flex" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>

        <Button onClick={() => router.push("/add-product")}>
          + Add Product
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No products available
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6">
          {/* PRODUCT GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const cat = p.categoryTypes?.[0];
              const prod = p.productTypes?.[0];

              return (
                <div
                  key={p.id}
                  className="border rounded-lg shadow-sm bg-card flex flex-col overflow-hidden"
                >
                  <div className="h-[200px] bg-muted flex items-center justify-center">
                    {p.mainImage?.url ? (
                      <img
                        src={p.mainImage.url}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground">No Image</span>
                    )}
                  </div>

                  <div className="p-4 space-y-3 flex-1">
                    <h2 className="text-lg font-bold line-clamp-2">
                      {p.productName}
                    </h2>

                    <div className="space-y-1">
                      <p className="text-red-600 text-sm font-semibold">
                        SRP: {format2(p.logistics?.srp)}
                      </p>

                      <p className="text-red-600 text-xs">
                        Unit Cost: {format2(p.logistics?.unitCost)}
                      </p>

                      <p className="text-red-600 text-xs">
                        Landed Cost: {format2(p.logistics?.landedCost)}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Classification Type: {p.classificationName || "-"}</p>
                      <p>Category Type: {cat?.categoryTypeName || "-"}</p>
                      <p>Product Type: {prod?.productTypeName || "-"}</p>
                      <p>SKU: {p.sku || "-"}</p>
                      <p>Supplier: {p.supplier?.company || "-"}</p>
                    </div>
                  </div>

                  <div className="p-3 border-t bg-muted/30 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/edit-product?id=${p.id}`)}
                    >
                      Edit
                    </Button>

                    <AddProductDeleteProductItem
                      productId={p.id}
                      productName={p.productName}
                      referenceID={userId ?? ""}
                      onDeleted={(id) =>
                        setProducts((prev) =>
                          prev.filter((prod) => prod.id !== id),
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* FILTER PANEL */}
          <div className="border rounded-lg p-4 bg-card space-y-4">
            <h2 className="font-semibold">Filters</h2>

            <Button variant="outline" className="w-full" onClick={clearFilters}>
              Clear Filters
            </Button>

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

              <FilterSection
                title="Supplier / Company"
                items={suppliers}
                filters={filters}
                toggleFilter={toggleFilter}
              />

              <h3 className="font-semibold mt-4">Technical Specifications</h3>

              {Object.entries(technicalSpecs).map(([title, values]) => (
                <FilterSection
                  key={title}
                  title={title}
                  items={[...values]}
                  filters={filters}
                  toggleFilter={toggleFilter}
                />
              ))}

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
        </div>
      )}
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
