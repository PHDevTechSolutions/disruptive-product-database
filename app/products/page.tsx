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

  return (
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6 pb-[140px] md:pb-6">
      <SidebarTrigger className="hidden md:flex" />

      {/* ===== HEADER ===== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>

        <Button onClick={() => router.push("/add-product")}>
          + Add Product
        </Button>
      </div>

      {/* ===== CONTENT AREA ===== */}
      {loading ? (
        <p className="text-center text-muted-foreground">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No products available
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => {
            const cat = p.categoryTypes?.[0];
            const prod = p.productTypes?.[0];

            return (
              <div
                key={p.id}
                className="border rounded-lg shadow-sm bg-card flex flex-col overflow-hidden"
              >
                {/* IMAGE */}
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

                {/* DETAILS */}
                <div className="p-4 space-y-2 flex-1">
                  <h2 className="font-semibold text-base line-clamp-2">
                    {p.productName}
                  </h2>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium">SKU:</span> {p.sku || "-"}
                    </p>

                    <p>
                      <span className="font-medium">Supplier:</span>{" "}
                      {p.supplier?.company || "-"}
                    </p>

                    <p>
                      <span className="font-medium">Category:</span>{" "}
                      {cat?.categoryTypeName || "-"}
                    </p>

                    <p>
                      <span className="font-medium">Product Type:</span>{" "}
                      {prod?.productTypeName || "-"}
                    </p>

                    <p>
                      <span className="font-medium">SRP:</span>{" "}
                      {format2(p.logistics?.srp)}
                    </p>

                    <p>
                      <span className="font-medium">MOQ:</span>{" "}
                      {p.logistics?.moq ?? "-"}
                    </p>
                  </div>
                </div>

                {/* ACTIONS */}
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
      )}
    </div>
  );
}
