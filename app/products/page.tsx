"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/contexts/UserContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AddProductDeleteProductItem from "@/components/add-product-delete-product-item";
import FilteringComponentV2 from "@/components/filtering-component-v2";
import UploadProductModal from "@/components/upload-product";
import DownloadProduct from "@/components/download-product";
import ViewProduct from "@/components/view-product";
import HardDeleteProducts from "@/components/hard-delete-products";

// ===== GOOGLE DRIVE IMAGE FIX =====
const convertDriveToThumbnail = (url: string) => {
  if (!url) return url;

  if (!url.includes("drive.google.com")) return url;

  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return url;
};

export default function ProductsPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [cardScale, setCardScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("productCardScale");
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });

  // ✅ FIXED ITEMS PER PAGE (Stable)
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    const saved = localStorage.getItem("productCardScale");
    if (saved) setCardScale(parseFloat(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("productCardScale", cardScale.toString());
  }, [cardScale]);

  useEffect(() => {
    const saved = localStorage.getItem("productCardScale");
    if (saved) setCardScale(parseFloat(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("productCardScale", cardScale.toString());
  }, [cardScale]);

  // ⭐ ADD THIS HERE
  useEffect(() => {
    const updateGridPagination = () => {
      if (!gridRef.current) return;

      const containerWidth = gridRef.current.offsetWidth;

      const cardMinWidth = 220 * cardScale;

      const columns = Math.max(1, Math.floor(containerWidth / cardMinWidth));

      const rows = 4;

      const calculatedItems = columns * rows;

      setItemsPerPage(calculatedItems);
    };

    updateGridPagination();

    window.addEventListener("resize", updateGridPagination);

    return () => window.removeEventListener("resize", updateGridPagination);
  }, [cardScale]);

  const increaseCardSize = () => {
    setCardScale((prev) => Math.min(prev + 0.1, 1.6));
  };

  const decreaseCardSize = () => {
    setCardScale((prev) => Math.max(prev - 0.1, 0.6));
  };

  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }

    const q = query(collection(db, "products"), where("isActive", "==", true));

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setProducts(list);
      setFilteredProducts(list);
      setLoading(false);
    });

    return () => unsub();
  }, [userId, router]);

  const searchedProducts = useMemo(() => {
    if (!searchTerm.trim()) return filteredProducts;

    const lower = searchTerm.toLowerCase();

    return filteredProducts.filter((p) => {
      const cat = p.categoryTypes?.[0];
      const prod = p.productTypes?.[0];

      return (
        p.productName?.toLowerCase().includes(lower) ||
        p.supplier?.supplierBrand?.toLowerCase().includes(lower) ||
        cat?.categoryTypeName?.toLowerCase().includes(lower) ||
        prod?.productTypeName?.toLowerCase().includes(lower)
      );
    });
  }, [searchTerm, filteredProducts]);

  // ✅ STABLE TOTAL PAGES
  const totalPages = Math.max(
    1,
    Math.ceil(searchedProducts.length / itemsPerPage),
  );

  // ✅ STABLE PAGINATION SLICE
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return searchedProducts.slice(startIndex, endIndex);
  }, [searchedProducts, currentPage, itemsPerPage]);

  // ✅ Prevent invalid page
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Reset to page 1 when searching or filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filteredProducts]);

  return (
    <div className="h-dvh overflow-y-auto p-4 md:p-6 space-y-6 pb-[140px] md:pb-6">
      <SidebarTrigger className="hidden md:flex" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Products</h1>

<div className="flex flex-wrap gap-2">
  <UploadProductModal />
  <DownloadProduct products={products} />
  <HardDeleteProducts />

  <Button onClick={() => router.push("/add-product")}>
    + Add Product
  </Button>
</div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:max-w-md"
        />

        <div className="flex items-center gap-4">
          <span
            onClick={decreaseCardSize}
            className="cursor-pointer text-xl font-bold"
          >
            −
          </span>
          <span className="text-xs w-12 text-center">
            {(cardScale * 100).toFixed(0)}%
          </span>
          <span
            onClick={increaseCardSize}
            className="cursor-pointer text-xl font-bold"
          >
            +
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-center text-muted-foreground">
              Loading products...
            </p>
          ) : (
            <>
              <div
                ref={gridRef}
                className="grid gap-4 md:gap-6"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${220 * cardScale}px, 1fr))`,
                }}
              >
                {paginatedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="border rounded-xl bg-card shadow-sm hover:shadow-md flex flex-col overflow-hidden h-full"
                  >
                    <div className="h-[180px] bg-muted flex items-center justify-center overflow-hidden p-2">
                      {p.mainImage?.url ? (
                        <img
                          src={convertDriveToThumbnail(p.mainImage.url)}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex-1 flex flex-col">
                      <h2 className="text-sm font-semibold line-clamp-2">
                        {p.productName}
                      </h2>

                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {p.supplier?.supplierBrand || "-"}
                      </p>
                    </div>

                    <div className="p-2 border-t flex flex-wrap gap-2 mt-auto">
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

                      <ViewProduct
                        productId={p.id}
                        referenceID={userId ?? ""}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Prev
                  </Button>

                  <span className="text-sm px-4">
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
            </>
          )}
        </div>

        <div className="w-full md:w-[340px] shrink-0 sticky top-4 self-start max-h-[calc(100vh-160px)] overflow-y-auto">
          {!loading && products.length > 0 && (
            <FilteringComponentV2
              products={products}
              onFilter={setFilteredProducts}
            />
          )}
        </div>
      </div>
    </div>
  );
}
