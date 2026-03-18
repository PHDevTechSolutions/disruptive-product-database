"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Package } from "lucide-react";

/* ---------------- Types ---------------- */
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  company: string;
  supplierBrand: string;
};

type Product = {
  id: string;
  productReferenceID?: string;
  productClass?: string;
  pricePoint?: string;
  brandOrigin?: string;
  mainImage?: { url: string } | null;
  categoryTypes?: { productUsageId: string; categoryTypeName: string }[];
  productFamilies?: {
    productFamilyId: string;
    productFamilyName: string;
    productUsageId: string;
  }[];
  technicalSpecifications?: {
    title: string;
    specs: { specId: string; value: string }[];
  }[];
  commercialDetails?: {
    unitCost?: number | null;
    pcsPerCarton?: number | null;
    packaging?: {
      length?: string | null;
      width?: string | null;
      height?: string | null;
    };
    factoryAddress?: string;
    portOfDischarge?: string;
  };
  supplier?: {
    supplierId: string;
    company: string;
    supplierBrand?: string;
  };
};

export default function SupplierProducts({
  open,
  onOpenChange,
  supplierId,
  company,
  supplierBrand,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---------------- Fetch Products by Supplier Brand ---------------- */
  useEffect(() => {
    if (!open) return;

    const fetchProducts = async () => {
      setLoading(true);
      setProducts([]);
      setSearch("");
      setExpandedId(null);

      try {
        /*
          Products are linked to a supplier via the `supplier` field:
          { supplierId, company, supplierBrand }

          We match by supplierId first (most reliable), then fall back
          to supplierBrand string match for products uploaded via Excel
          where supplierId may not have been stored.
        */
        const q = query(
          collection(db, "products"),
          where("isActive", "==", true),
          where("supplier.supplierId", "==", supplierId),
        );

        const snap = await getDocs(q);

        // Also fetch by supplierBrand string for Excel-uploaded products
        let fallbackSnap: typeof snap | null = null;
        if (supplierBrand) {
          const qBrand = query(
            collection(db, "products"),
            where("isActive", "==", true),
            where("supplier.supplierBrand", "==", supplierBrand),
          );
          fallbackSnap = await getDocs(qBrand);
        }

        // Merge results, deduplicate by doc id
        const merged = new Map<string, Product>();

        snap.docs.forEach((doc) => {
          merged.set(doc.id, { id: doc.id, ...doc.data() } as Product);
        });

        fallbackSnap?.docs.forEach((doc) => {
          if (!merged.has(doc.id)) {
            merged.set(doc.id, { id: doc.id, ...doc.data() } as Product);
          }
        });

        setProducts(Array.from(merged.values()));
      } catch (err) {
        console.error("Error fetching supplier products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [open, supplierId, supplierBrand]);

  /* ---------------- Filtered Products ---------------- */
  const filtered = React.useMemo(() => {
    const kw = search.toLowerCase();
    if (!kw) return products;
    return products.filter((p) => {
      return (
        p.productReferenceID?.toLowerCase().includes(kw) ||
        p.productClass?.toLowerCase().includes(kw) ||
        p.pricePoint?.toLowerCase().includes(kw) ||
        p.brandOrigin?.toLowerCase().includes(kw) ||
        p.categoryTypes?.some((c) =>
          c.categoryTypeName.toLowerCase().includes(kw),
        ) ||
        p.productFamilies?.some((f) =>
          f.productFamilyName.toLowerCase().includes(kw),
        ) ||
        p.technicalSpecifications?.some(
          (s) =>
            s.title.toLowerCase().includes(kw) ||
            s.specs.some(
              (r) =>
                r.specId.toLowerCase().includes(kw) ||
                r.value.toLowerCase().includes(kw),
            ),
        )
      );
    });
  }, [products, search]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col gap-0 p-0">
        {/* HEADER */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-blue-600" />
            <span>
              Products by{" "}
              <span className="text-blue-700 font-bold">{company}</span>
              {supplierBrand && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  ({supplierBrand})
                </span>
              )}
            </span>
          </DialogTitle>

          {/* SEARCH + COUNT */}
          <div className="flex items-center gap-3 mt-3">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {loading ? "Loading..." : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                Loading products...
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
              <Package className="w-10 h-10 opacity-30" />
              {search ? "No products match your search." : "No products found for this supplier."}
            </div>
          ) : (
            filtered.map((product) => (
              <div
                key={product.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* PRODUCT CARD HEADER — always visible */}
                <button
                  className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-muted/40 transition cursor-pointer"
                  onClick={() => toggleExpand(product.id)}
                >
                  {/* THUMBNAIL */}
                  <div className="w-14 h-14 rounded-md border overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                    {product.mainImage?.url ? (
                      <img
                        src={product.mainImage.url}
                        alt={product.productReferenceID}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  {/* BASIC INFO */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">
                        {product.productReferenceID || "—"}
                      </span>
                      {product.productClass && (
                        <Badge variant="outline" className="text-xs">
                          {product.productClass}
                        </Badge>
                      )}
                      {product.pricePoint && (
                        <Badge variant="secondary" className="text-xs">
                          {product.pricePoint}
                        </Badge>
                      )}
                      {product.brandOrigin && (
                        <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                          {product.brandOrigin}
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {product.categoryTypes?.map((c) => c.categoryTypeName).join(", ") || "—"}
                      {product.productFamilies?.length ? (
                        <span className="ml-1">
                          › {product.productFamilies.map((f) => f.productFamilyName).join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* EXPAND INDICATOR */}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {expandedId === product.id ? "▲ Hide" : "▼ Details"}
                  </span>
                </button>

                {/* EXPANDED DETAILS */}
                {expandedId === product.id && (
                  <div className="border-t px-4 py-4 bg-muted/20 space-y-4 text-sm">

                    {/* IMAGES ROW */}
                    {(product.mainImage?.url) && (
                      <div className="flex gap-3 flex-wrap">
                        {product.mainImage?.url && (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Main Image</p>
                            <img
                              src={product.mainImage.url}
                              alt="main"
                              className="w-28 h-28 object-contain border rounded-md bg-white"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* COMMERCIAL DETAILS */}
                    {product.commercialDetails && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-orange-600 mb-2">
                          Commercial Details
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                          {product.commercialDetails.unitCost != null && (
                            <div>
                              <span className="font-medium">Unit Cost: </span>
                              <span>USD {product.commercialDetails.unitCost}</span>
                            </div>
                          )}
                          {product.commercialDetails.pcsPerCarton != null && (
                            <div>
                              <span className="font-medium">pcs/carton: </span>
                              <span>{product.commercialDetails.pcsPerCarton}</span>
                            </div>
                          )}
                          {product.commercialDetails.packaging && (
                            <div>
                              <span className="font-medium">Packaging: </span>
                              <span>
                                {[
                                  product.commercialDetails.packaging.length,
                                  product.commercialDetails.packaging.width,
                                  product.commercialDetails.packaging.height,
                                ]
                                  .filter(Boolean)
                                  .join(" × ")}
                              </span>
                            </div>
                          )}
                          {product.commercialDetails.factoryAddress && (
                            <div className="col-span-2">
                              <span className="font-medium">Factory: </span>
                              <span>{product.commercialDetails.factoryAddress}</span>
                            </div>
                          )}
                          {product.commercialDetails.portOfDischarge && (
                            <div>
                              <span className="font-medium">Port: </span>
                              <span>{product.commercialDetails.portOfDischarge}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TECHNICAL SPECIFICATIONS */}
                    {product.technicalSpecifications && product.technicalSpecifications.length > 0 && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700 mb-2">
                          Technical Specifications
                        </p>
                        <div className="space-y-3">
                          {product.technicalSpecifications.map((group, gi) => {
                            const filledSpecs = group.specs.filter((r) => r.value?.trim());
                            if (filledSpecs.length === 0) return null;
                            return (
                              <div key={gi}>
                                <p className="text-xs font-semibold text-muted-foreground mb-1">
                                  {group.title}
                                </p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                                  {filledSpecs.map((spec, si) => (
                                    <div key={si}>
                                      <span className="font-medium">{spec.specId}: </span>
                                      <span>{spec.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
