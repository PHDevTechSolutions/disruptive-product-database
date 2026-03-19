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
import { Pencil, Trash2, Eye } from "lucide-react";

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

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewTarget, setViewTarget] = useState<string | null>(null);

  const [cardScale, setCardScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("productCardScale");
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });

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

  const increaseCardSize = () => setCardScale((prev) => Math.min(prev + 0.1, 1.6));
  const decreaseCardSize = () => setCardScale((prev) => Math.max(prev - 0.1, 0.6));

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

  const totalPages = Math.max(1, Math.ceil(searchedProducts.length / itemsPerPage));

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return searchedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [searchedProducts, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filteredProducts]);

  return (
    <div className="h-dvh flex flex-col p-4 md:p-6 gap-4 overflow-hidden">
      <SidebarTrigger className="hidden md:flex" />

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
        <h1 className="text-xl md:text-2xl font-semibold">Products</h1>
        <div className="flex flex-wrap gap-2">
          <UploadProductModal />
          <DownloadProduct products={products} />
          <HardDeleteProducts />
          <Button onClick={() => router.push("/add-product")}>+ Add Product</Button>
        </div>
      </div>

      {/* Search + Scale */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between shrink-0">
        <Input
          placeholder="Search product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:max-w-md"
        />
        <div className="flex items-center gap-4">
          <span onClick={decreaseCardSize} className="cursor-pointer text-xl font-bold">−</span>
          <span className="text-xs w-12 text-center">{(cardScale * 100).toFixed(0)}%</span>
          <span onClick={increaseCardSize} className="cursor-pointer text-xl font-bold">+</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 overflow-hidden">

        {/* Products section */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading products...</p>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pb-4">
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
                      className="group border rounded-xl bg-card shadow-sm hover:shadow-md flex flex-col overflow-hidden h-full"
                    >
                      {/* Image with hover overlay */}
                      <div className="relative h-[180px] bg-muted flex items-center justify-center overflow-hidden rounded-t-xl">
                        {p.mainImage?.url ? (
                          <img
                            src={convertDriveToThumbnail(p.mainImage.url)}
                            className="w-full h-full object-contain p-2 transition-all duration-300 group-hover:brightness-75"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}

                        {/* 3 icon buttons — top right corner, shown on hover */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">

                          {/* View */}
                          <div className="relative group/view flex items-center justify-end">
                            <span className="mr-2 whitespace-nowrap text-[10px] font-medium text-white bg-black/70 rounded px-1.5 py-0.5 opacity-0 group-hover/view:opacity-100 transition-opacity duration-150 pointer-events-none">
                              View
                            </span>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white shadow-md transition-all duration-150"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewTarget(p.id);
                              }}
                            >
                              <Eye className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>

                          {/* Edit */}
                          <div className="relative group/edit flex items-center justify-end">
                            <span className="mr-2 whitespace-nowrap text-[10px] font-medium text-white bg-black/70 rounded px-1.5 py-0.5 opacity-0 group-hover/edit:opacity-100 transition-opacity duration-150 pointer-events-none">
                              Edit
                            </span>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white shadow-md transition-all duration-150"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/edit-product?id=${p.id}`);
                              }}
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </button>
                          </div>

                          {/* Delete */}
                          <div className="relative group/delete flex items-center justify-end">
                            <span className="mr-2 whitespace-nowrap text-[10px] font-medium text-white bg-black/70 rounded px-1.5 py-0.5 opacity-0 group-hover/delete:opacity-100 transition-opacity duration-150 pointer-events-none">
                              Delete
                            </span>
                            <button
                              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/90 hover:bg-white shadow-md transition-all duration-150"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget({ id: p.id, name: p.productName });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>

                        </div>
                      </div>

                      {/* Product info */}
                      <div className="p-3 flex-1 flex flex-col">
                        <h2 className="text-sm font-semibold line-clamp-2">{p.productName}</h2>
                        <p className="text-xs font-bold text-blue-600 line-clamp-1">
                          {p.supplier?.supplierBrand || "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 py-3 shrink-0 border-t">
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

        {/* Sidebar */}
        <div className="w-full md:w-[340px] shrink-0 overflow-y-auto">
          {!loading && products.length > 0 && (
            <FilteringComponentV2
              products={products}
              onFilter={setFilteredProducts}
            />
          )}
        </div>
      </div>

      {/* DELETE MODAL — rendered outside grid, opens via deleteTarget state */}
      {deleteTarget && (
        <AddProductDeleteProductItem
          key={`delete-${deleteTarget.id}`}
          productId={deleteTarget.id}
          productName={deleteTarget.name}
          referenceID={userId ?? ""}
          defaultOpen={true}
          onDeleted={(id) => {
            setProducts((prev) => prev.filter((prod) => prod.id !== id));
            setDeleteTarget(null);
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* VIEW MODAL — rendered outside grid, opens via viewTarget state */}
      {viewTarget && (
        <ViewProduct
          key={`view-${viewTarget}`}
          productId={viewTarget}
          referenceID={userId ?? ""}
          defaultOpen={true}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}
