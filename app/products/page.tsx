"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/contexts/UserContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddProductDeleteProductItem from "@/components/add-product-delete-product-item";
import FilteringComponent from "@/components/filtering-component";

export default function ProductsPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= NEW STATES ================= */
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }

    const q = query(collection(db, "products"), where("isActive", "==", true));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setProducts(list);
      setFilteredProducts(list);
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

  /* ================= SEARCH LOGIC (SAFE ADDITION) ================= */
  const searchedProducts = useMemo(() => {
    if (!searchTerm.trim()) return filteredProducts;

    const lower = searchTerm.toLowerCase();

    return filteredProducts.filter((p) => {
      const cat = p.categoryTypes?.[0];
      const prod = p.productTypes?.[0];

      return (
        p.productName?.toLowerCase().includes(lower) ||
        p.supplier?.company?.toLowerCase().includes(lower) ||
        cat?.categoryTypeName?.toLowerCase().includes(lower) ||
        prod?.productTypeName?.toLowerCase().includes(lower)
      );
    });
  }, [searchTerm, filteredProducts]);

  /* ================= PAGINATION LOGIC ================= */
  const totalPages = Math.ceil(searchedProducts.length / ITEMS_PER_PAGE);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return searchedProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [searchedProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filteredProducts]);

  return (
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6 pb-[140px]">
      <SidebarTrigger className="hidden md:flex" />

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>

        <Button onClick={() => router.push("/add-product")}>
          + Add Product
        </Button>
      </div>

      {/* SEARCH BAR */}
      {!loading && products.length > 0 && (
        <div className="max-w-md">
          <Input
            placeholder="Search product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground">
          Loading products...
        </p>
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No products available
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-6">
          {/* ================= PRODUCT GRID ================= */}
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {paginatedProducts.map((p) => {
                const cat = p.categoryTypes?.[0];
                const prod = p.productTypes?.[0];

                return (
                  <div
                    key={p.id}
                    className="border rounded-xl bg-card shadow-sm hover:shadow-md transition overflow-hidden flex flex-col h-full"
                  >
                    {/* IMAGE */}
                    <div className="aspect-square bg-muted overflow-hidden">
                      {p.mainImage?.url ? (
                        <img
                          src={p.mainImage.url}
                          className="w-full h-full object-cover"
                          alt={p.productName}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* CONTENT */}
                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                      <h2 className="text-base font-semibold line-clamp-2">
                        {p.productName}
                      </h2>

                      {/* SRP */}
                      <p className="text-red-600 text-sm font-bold">
                        ₱ {format2(p.logistics?.srp)}
                      </p>

                      {/* UNIT COST (USD) */}
                      <p className="text-xs text-muted-foreground">
                        Unit Cost (USD): {format2(p.logistics?.unitCost)}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Landed Cost: ₱ {format2(p.logistics?.landedCost)}
                      </p>

                      <div className="text-[11px] text-gray-500 space-y-1 pt-1">
                        <p>{cat?.categoryTypeName || "-"}</p>
                        <p>{prod?.productTypeName || "-"}</p>
                        <p>{p.supplier?.company || "-"}</p>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="p-3 border-t bg-muted/40 flex gap-2 mt-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          router.push(`/edit-product?id=${p.id}`)
                        }
                      >
                        Edit
                      </Button>

                      <AddProductDeleteProductItem
                        productId={p.id}
                        productName={p.productName}
                        referenceID={userId ?? ""}
                        onDeleted={(id) =>
                          setProducts((prev) =>
                            prev.filter((prod) => prod.id !== id)
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ================= PAGINATION ================= */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Prev
                </Button>

                <span className="text-sm px-3 py-2">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* ================= FILTER PANEL ================= */}
          <FilteringComponent
            products={products}
            onFilter={setFilteredProducts}
          />
        </div>
      )}
    </div>
  );
}
