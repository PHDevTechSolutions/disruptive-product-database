"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Funnel,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import FilteringComponent from "@/components/filtering-component-v2";
import AddProductComponent from "@/components/add-product-component";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CardDetails from "@/components/spf/dialog/card-details";

/* ─────────────────────────────────────────────────────────────── */
/* TYPES                                                           */
/* ─────────────────────────────────────────────────────────────── */
export type SPFRequest = {
  id: string;
  spf_number: string;
  customer_name: string;
  contact_person?: string;
  contact_number?: string;
  registered_address?: string;
  delivery_address?: string;
  billing_address?: string;
  collection_address?: string;
  payment_terms?: string;
  warranty?: string;
  delivery_date?: string;
  prepared_by?: string;
  approved_by?: string;
  sales_person?: string;
  start_date?: string;
  end_date?: string;
  special_instructions?: string;
  item_description?: string[];
  item_photo?: string[];
  item_code?: string;
  status?: string;
  date_created?: string;
  process_by?: string;
  tin_no?: string;
  manager?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rowData: SPFRequest;
  processBy: string;
  isMobile: boolean;
  onSuccess: () => void;
};

/* ─────────────────────────────────────────────────────────────── */
/* MOBILE-ONLY HELPERS                                             */
/* ─────────────────────────────────────────────────────────────── */
function InlineSpecs({ specs }: { specs: any[] }) {
  const [open, setOpen] = useState(false);
  const filtered =
    specs?.filter((g: any) => g.specs?.some((s: any) => s.value?.trim())) ?? [];
  if (!filtered.length) return null;
  return (
    <div className="mt-1">
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setOpen((p) => !p); }
        }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none"
      >
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        View specs
      </div>
      {open && (
        <div className="text-[10px] space-y-1 mt-1 pb-1">
          {filtered.map((g: any, gi: number) => (
            <div key={gi}>
              <p className="font-semibold">{g.title}</p>
              {g.specs
                ?.filter((s: any) => s.value?.trim())
                .map((s: any, si: number) => (
                  <p key={si} className="text-muted-foreground">
                    {s.specId}: {s.value}
                  </p>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineProductSpecs({ specs }: { specs: any[] }) {
  const [open, setOpen] = useState(false);
  const filtered = specs?.filter((g: any) => g.title !== "COMMERCIAL DETAILS") ?? [];
  if (!filtered.length) return null;
  return (
    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setOpen((p) => !p); }
        }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer select-none"
      >
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        Specs
      </div>
      {open && (
        <div className="text-[10px] space-y-1 mt-1 pb-1">
          {filtered.map((group: any, i: number) => (
            <div key={i}>
              <p className="font-semibold">{group.title}</p>
              {group.specs?.map((spec: any, s: number) => (
                <p key={s} className="text-muted-foreground">
                  {spec.specId}: {spec.value || "-"}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* MAIN COMPONENT                                                  */
/* ─────────────────────────────────────────────────────────────── */
export default function SPFRequestCreate({
  open,
  onOpenChange,
  rowData,
  processBy,
  isMobile,
  onSuccess,
}: Props) {
  /* ── Form ── */
  const [formData, setFormData] = useState<SPFRequest>({
    id: "",
    spf_number: "",
    customer_name: "",
    contact_person: "",
    contact_number: "",
    registered_address: "",
    delivery_address: "",
    billing_address: "",
    collection_address: "",
    payment_terms: "",
    warranty: "",
    delivery_date: "",
    prepared_by: "",
    approved_by: "",
    sales_person: "",
    start_date: "",
    end_date: "",
    special_instructions: "",
    status: "Pending",
    process_by: "",
    tin_no: "",
    manager: "",
    item_code: "",
    item_description: [],
    item_photo: [],
  });

  /* ── Products ── */
  const [productOffers, setProductOffers]       = useState<Record<number, any[]>>({});
  const [products, setProducts]                 = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts]   = useState(false);
  const [productSearch, setProductSearch]       = useState("");

  /* ── UI state ── */
  const [viewMode, setViewMode]             = useState(false);
  const [openAddProduct, setOpenAddProduct] = useState(false);
  const [openFilter, setOpenFilter]         = useState(false);

  /* ── Desktop drag ── */
  const [draggedProduct, setDraggedProduct] = useState<any | null>(null);
  const [showTrash, setShowTrash]           = useState(false);

  /* ── Mobile ── */
  const [activeRowIndex, setActiveRowIndex]   = useState<number | null>(null);
  const [pickerStep, setPickerStep]           = useState<"list" | "confirm">("list");
  const [pendingProduct, setPendingProduct]   = useState<any | null>(null);
  const [activeTab, setActiveTab]             = useState<"details" | "items" | "products">("items");

  /* ── Sync formData when rowData changes ── */
  useEffect(() => {
    if (!open) return;
    const normalizeArray = (value: string | string[] | undefined) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return value.split(",").map((v) => v.trim());
      return [];
    };
    setFormData({
      ...rowData,
      prepared_by:      processBy,
      process_by:       processBy,
      item_description: normalizeArray(rowData.item_description),
      item_photo:       normalizeArray(rowData.item_photo),
      item_code:        rowData.item_code ?? "",
    });
    setProductOffers({});
    setViewMode(false);
    setDraggedProduct(null);
    setShowTrash(false);
    setActiveRowIndex(null);
    setPickerStep("list");
    setPendingProduct(null);
    setActiveTab("items");
    setProductSearch("");
    fetchProducts(rowData.customer_name || "");
  }, [open, rowData, processBy]);

  /* ── Product search filter ── */
  useEffect(() => {
    if (!productSearch) {
      setFilteredProducts(products);
      return;
    }
    const term = productSearch.toLowerCase();
    setFilteredProducts(
      products.filter(
        (p: any) =>
          (p.productName?.toLowerCase() || "").includes(term) ||
          (p.supplier?.supplierBrand?.toLowerCase() || "").includes(term) ||
          (p.supplier?.company?.toLowerCase() || "").includes(term) ||
          JSON.stringify(p.commercialDetails || "").toLowerCase().includes(term)
      )
    );
  }, [productSearch, products]);

  /* ── Fetch products ── */
  const fetchProducts = useCallback((_customerName: string) => {
    setLoadingProducts(true);
    const q = query(collection(db, "products"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProducts(list);
      setFilteredProducts(list);
      setLoadingProducts(false);
    });
    return unsubscribe;
  }, []);

  /* ── Helpers ── */
  const freezeSpecs = (product: any) => {
    const activeFilters = (window as any).__ACTIVE_FILTERS__ || [];
    if (!product.technicalSpecifications) return product;
    const frozenSpecs = product.technicalSpecifications.map((group: any) => ({
      ...group,
      specs: group.specs?.map((spec: any) => {
        const raw    = spec.value || "";
        const values = raw.split("|").map((v: string) => v.trim()).filter(Boolean);
        const unique = Array.from(new Set(values)) as string[];
        if (!activeFilters.length) return { ...spec, value: unique.join(" | ") };
        const filtered = unique.filter((v) => activeFilters.includes(v));
        return { ...spec, value: filtered.length ? filtered.join(" | ") : unique.join(" | ") };
      }),
    }));
    return { ...product, technicalSpecifications: frozenSpecs };
  };

  const removeProduct = (rowIndex: number, productIndex: number) => {
    setProductOffers((prev) => {
      const copy = { ...prev };
      const arr  = [...(copy[rowIndex] || [])];
      arr.splice(productIndex, 1);
      copy[rowIndex] = arr;
      return copy;
    });
  };

  /* ── Mobile: tap-to-add ── */
  const handleProductTap = (product: any) => {
    if (activeRowIndex === null) {
      toast.error("Select a row first before adding a product.");
      setActiveTab("items");
      return;
    }
    setPendingProduct(product);
    setPickerStep("confirm");
  };

  const confirmAddProduct = () => {
    if (activeRowIndex === null || !pendingProduct) return;
    setProductOffers((prev) => {
      const copy = { ...prev };
      copy[activeRowIndex] = [...(copy[activeRowIndex] || []), freezeSpecs(pendingProduct)];
      return copy;
    });
    setPendingProduct(null);
    setPickerStep("list");
    toast.success("Product added!");
  };

  const cancelConfirm = () => {
    setPendingProduct(null);
    setPickerStep("list");
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    try {
      const allProducts = Object.entries(productOffers).flatMap(([rowIndex, prods]) =>
        prods.map((p) => ({ ...p, __rowIndex: Number(rowIndex) }))
      );

      const res = await fetch("/api/request/spf-request-create-api", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...formData,
          selectedProducts: allProducts,
          totalItemRows:    formData.item_description?.length ?? 1,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("API ERROR:", errText);
        toast.error("Failed to create SPF request");
        throw new Error("Failed to create SPF request");
      }

      const data = await res.json();
      if (data?.success) toast.success("SPF created successfully");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error("Something went wrong while creating SPF");
    }
  };

  /* ════════════════════════════════════════════════════════════ */
  /* MOBILE LAYOUT                                               */
  /* ════════════════════════════════════════════════════════════ */
  const renderMobile = () => (
    <>
      <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
        <div className="flex items-center justify-between gap-2">
          <DialogTitle className="text-sm font-semibold truncate">
            {formData.spf_number || "Create SPF"}
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              placeholder="Search..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="border px-2 py-1 text-xs w-[130px] rounded"
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded"
              onClick={() => setOpenFilter((p) => !p)}
            >
              <Funnel size={14} />
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs rounded"
              onClick={() => setOpenAddProduct(true)}
            >
              + Add
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-2 border rounded overflow-hidden text-xs font-medium">
          {(["details", "items", "products"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 capitalize transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "products" && (
          <div className={`mt-1 text-[11px] px-2 py-1 rounded ${
            activeRowIndex !== null ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
          }`}>
            {activeRowIndex !== null
              ? `Adding to: ${formData.spf_number}-${String(activeRowIndex + 1).padStart(3, "0")}`
              : "⚠ Tap a row in Items tab to select it first"}
          </div>
        )}
      </DialogHeader>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* TAB: DETAILS */}
        {activeTab === "details" && (
          <div className="p-4 space-y-4">
            <CardDetails
              title="Company Details"
              fields={[
                { label: "Customer Name",      value: formData.customer_name },
                { label: "Contact Person",      value: formData.contact_person },
                { label: "Contact Number",      value: formData.contact_number },
                { label: "Registered Address",  value: formData.registered_address, pre: true },
                { label: "Delivery Address",    value: formData.delivery_address },
                { label: "Billing Address",     value: formData.billing_address },
                { label: "Collection Address",  value: formData.collection_address },
                { label: "TIN",                 value: formData.tin_no },
              ]}
            />
            <CardDetails
              title="SPF Details"
              fields={[
                { label: "Item Code",     value: formData.item_code },
                { label: "Payment Terms", value: formData.payment_terms },
                { label: "Warranty",      value: formData.warranty },
                { label: "Delivery Date", value: formData.delivery_date },
                { label: "Prepared By",   value: formData.prepared_by },
                { label: "Approved By",   value: formData.approved_by },
                { label: "Process By",    value: formData.process_by },
                { label: "Manager",       value: formData.manager },
              ]}
            />
          </div>
        )}

        {/* TAB: ITEMS */}
        {activeTab === "items" && (
          <div className="p-3 space-y-3">
            {!formData.item_description?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No items added yet.</p>
            ) : (
              formData.item_description.map((desc, index) => {
                const isActive = activeRowIndex === index;
                const offers   = productOffers[index] || [];
                return (
                  <div
                    key={index}
                    className={`border rounded-lg overflow-hidden transition-all ${
                      isActive ? "border-red-500 shadow-md" : "border-border"
                    }`}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActiveRowIndex(isActive ? null : index);
                        if (!isActive) setActiveTab("products");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setActiveRowIndex(isActive ? null : index);
                          if (!isActive) setActiveTab("products");
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 cursor-pointer select-none ${
                        isActive ? "bg-red-50" : "bg-muted/30"
                      }`}
                    >
                      <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        isActive ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </span>
                      {formData.item_photo?.[index] ? (
                        <img src={formData.item_photo[index]} className="w-10 h-10 object-contain shrink-0 rounded" alt="" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">
                          No img
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium line-clamp-2">{desc.replace(/\|/g, " · ")}</p>
                        <p className={`text-[10px] mt-0.5 ${isActive ? "text-red-600" : "text-muted-foreground"}`}>
                          {isActive
                            ? "Selected — tap Products to add"
                            : `${offers.length} product${offers.length !== 1 ? "s" : ""} added`}
                        </p>
                      </div>
                      {isActive
                        ? <ChevronUp size={14} className="text-red-500 shrink-0" />
                        : <ChevronDown size={14} className="text-muted-foreground shrink-0" />}
                    </div>

                    {offers.length > 0 && (
                      <div className="border-t divide-y">
                        {offers.map((prod: any, i: number) => {
                          const unitCost      = prod?.commercialDetails?.unitCost || "-";
                          const qty           = prod.qty || 0;
                          const cost          = Number(prod?.commercialDetails?.unitCost || 0);
                          const subtotal      = qty * cost;
                          const length        = prod?.commercialDetails?.packaging?.length || "-";
                          const width         = prod?.commercialDetails?.packaging?.width || "-";
                          const height        = prod?.commercialDetails?.packaging?.height || "-";
                          const factory       = prod?.commercialDetails?.factoryAddress || "-";
                          const port          = prod?.commercialDetails?.portOfDischarge || "-";
                          const supplierBrand = prod?.supplier?.supplierBrand || prod?.supplier?.supplierBrandName || "";
                          const supplierCo    = prod?.supplier?.company || "";

                          return (
                            <div key={i} className="p-3 flex gap-3 items-start">
                              {prod.mainImage?.url ? (
                                <img src={prod.mainImage.url} className="w-14 h-14 object-contain rounded shrink-0" alt="" />
                              ) : (
                                <div className="w-14 h-14 bg-muted rounded shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                              )}
                              <div className="flex-1 min-w-0 space-y-1">
                                <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  Option {i + 1}{supplierBrand && ` · ${supplierBrand}`}
                                </span>
                                <p className="text-xs font-medium line-clamp-1">{prod.productName}</p>
                                {(supplierCo || supplierBrand) && (
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {[supplierCo, supplierBrand].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground">Qty</span>
                                  <input
                                    type="number"
                                    min={0}
                                    className="border rounded px-2 py-0.5 text-xs w-16"
                                    placeholder="0"
                                    value={prod.qty || ""}
                                    onChange={(e) => {
                                      let qty = Number(e.target.value);
                                      if (qty < 0) qty = 0;
                                      setProductOffers((prev) => {
                                        const copy = { ...prev };
                                        const row  = [...(copy[index] || [])];
                                        row[i]     = { ...row[i], qty };
                                        copy[index] = row;
                                        return copy;
                                      });
                                    }}
                                  />
                                  <span className="text-[10px] text-muted-foreground ml-auto">Unit: {unitCost}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground">Pack: {length} × {width} × {height}</p>
                                {factory !== "-" && <p className="text-[10px] text-muted-foreground truncate">Factory: {factory}</p>}
                                {port !== "-" && <p className="text-[10px] text-muted-foreground truncate">Port: {port}</p>}
                                {qty > 0 && (
                                  <p className="text-xs font-semibold text-right">
                                    ${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                )}
                                <InlineSpecs specs={prod.technicalSpecifications ?? []} />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeProduct(index, i)}
                                className="text-destructive/60 hover:text-destructive mt-0.5 shrink-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: PRODUCTS */}
        {activeTab === "products" && (
          <div className="p-3">
            {/* Confirm bottom sheet */}
            {pickerStep === "confirm" && pendingProduct && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
                <div className="bg-background w-full rounded-t-2xl p-5 space-y-4 shadow-xl">
                  <p className="text-sm font-semibold">Add this product?</p>
                  <div className="flex gap-3 items-center">
                    {pendingProduct.mainImage?.url ? (
                      <img src={pendingProduct.mainImage.url} className="w-16 h-16 object-contain rounded shrink-0" alt="" />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{pendingProduct.productName}</p>
                      {(pendingProduct?.supplier?.supplierBrand || pendingProduct?.supplier?.supplierBrandName) && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          {pendingProduct.supplier.supplierBrand || pendingProduct.supplier.supplierBrandName}
                        </p>
                      )}
                      {pendingProduct?.supplier?.company && (
                        <p className="text-[11px] text-muted-foreground truncate">{pendingProduct.supplier.company}</p>
                      )}
                      {activeRowIndex !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          → {formData.spf_number}-{String(activeRowIndex + 1).padStart(3, "0")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 rounded" onClick={cancelConfirm}>Cancel</Button>
                    <Button type="button" className="flex-1 rounded" onClick={confirmAddProduct}>Confirm Add</Button>
                  </div>
                </div>
              </div>
            )}

            {openFilter && (
              <div className="mb-3 border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                <FilteringComponent products={products} onFilter={(filtered) => setFilteredProducts(filtered)} />
              </div>
            )}

            {loadingProducts ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No products found.</p>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((p) => {
                  const supplierBrand = p?.supplier?.supplierBrand || p?.supplier?.supplierBrandName || "";
                  const supplierCo    = p?.supplier?.company || "";
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleProductTap(p)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleProductTap(p); }}
                      className="w-full text-left border rounded-lg overflow-hidden flex gap-3 p-3 hover:bg-muted/40 active:bg-muted transition-colors cursor-pointer select-none"
                    >
                      {p.mainImage?.url ? (
                        <img src={p.mainImage.url} className="w-14 h-14 object-contain rounded shrink-0" alt={p.productName} />
                      ) : (
                        <div className="w-14 h-14 bg-muted rounded shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-2">{p.productName}</p>
                        {supplierBrand && <p className="text-xs font-semibold text-blue-600 mt-0.5 truncate">{supplierBrand}</p>}
                        {supplierCo && <p className="text-[10px] text-muted-foreground truncate">{supplierCo}</p>}
                        {p.commercialDetails?.unitCost && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">Unit cost: {p.commercialDetails.unitCost}</p>
                        )}
                        <InlineProductSpecs specs={p.technicalSpecifications ?? []} />
                      </div>
                      <div className="shrink-0 flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          activeRowIndex !== null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}>
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter className="px-4 py-3 border-t shrink-0 flex-row gap-2">
        <Button type="button" variant="outline" className="flex-1 rounded" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded"
          onClick={() => { setViewMode((p) => !p); if (!viewMode) setActiveTab("items"); }}
        >
          {viewMode ? "Edit" : "Preview"}
        </Button>
        {viewMode && (
          <Button type="button" className="flex-1 rounded" onClick={handleSubmit}>
            Submit
          </Button>
        )}
      </DialogFooter>
    </>
  );

  /* ════════════════════════════════════════════════════════════ */
  /* DESKTOP LAYOUT                                              */
  /* ════════════════════════════════════════════════════════════ */
  const renderDesktop = () => (
    <>
      <DialogHeader className="w-full mb-4 relative">
        <DialogTitle className="text-center w-full">Create SPF Request</DialogTitle>
        <div className="absolute right-0 top-0 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search product..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="border px-3 py-2 text-sm w-[220px]"
          />
          <Button size="icon" variant="outline" className="rounded-none p-6" onClick={() => setOpenFilter((prev) => !prev)}>
            <Funnel size={16} />
          </Button>
          <Button className="rounded-none p-6" onClick={() => setOpenAddProduct(true)}>
            + Add Product
          </Button>
        </div>

        {showTrash && (
          <div className="flex justify-center mt-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (viewMode || !draggedProduct) return;
                if (draggedProduct.__fromRow !== undefined) {
                  setProductOffers((prev) => {
                    const copy = { ...prev };
                    const arr  = [...(copy[draggedProduct.__fromRow] || [])];
                    arr.splice(draggedProduct.__fromIndex, 1);
                    copy[draggedProduct.__fromRow] = arr;
                    return copy;
                  });
                }
                setDraggedProduct(null);
                setShowTrash(false);
              }}
              className="flex items-center gap-2 border border-dashed border-destructive/40 text-destructive text-xs px-4 py-2 rounded-md bg-muted/40 hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              🗑 <span className="font-medium">Drag here to delete</span>
            </div>
          </div>
        )}
      </DialogHeader>

      <div className="flex gap-4 overflow-hidden">
        {/* LEFT: Details + Items table */}
        <Card className={`${viewMode ? "w-[100%]" : "w-[70%]"} transition-all duration-500 ease-in-out p-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh] overscroll-contain`}>
          <div className="grid grid-cols-1 gap-4">
            <CardDetails
              title="Company Details"
              fields={[
                { label: "Customer Name",      value: formData.customer_name },
                { label: "Contact Person",      value: formData.contact_person },
                { label: "Contact Number",      value: formData.contact_number },
                { label: "Registered Address",  value: formData.registered_address, pre: true },
                { label: "Delivery Address",    value: formData.delivery_address },
                { label: "Billing Address",     value: formData.billing_address },
                { label: "Collection Address",  value: formData.collection_address },
                { label: "TIN",                 value: formData.tin_no },
              ]}
            />
            <CardDetails
              title="SPF Details"
              fields={[
                { label: "Item Code",     value: formData.item_code },
                { label: "Payment Terms", value: formData.payment_terms },
                { label: "Warranty",      value: formData.warranty },
                { label: "Delivery Date", value: formData.delivery_date },
                { label: "Prepared By",   value: formData.prepared_by },
                { label: "Approved By",   value: formData.approved_by },
                { label: "Process By",    value: formData.process_by },
                { label: "Manager",       value: formData.manager },
              ]}
            />
          </div>

          <div className="mb-3 border-b pb-2">
            <h3 className="text-sm font-bold">{formData.spf_number || "-"}</h3>
          </div>

          <div className="mt-4 overflow-y-auto relative">
            {formData.item_description?.length ? (
              <table className="w-full table-auto border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1 text-center">#</th>
                    <th className="border px-2 py-1 text-center">Image</th>
                    <th className="border px-2 py-1 text-center">Item Description</th>
                    <th className="border px-2 py-1 text-center">Product Offer</th>
                  </tr>
                </thead>
                <tbody>
                  {(formData.item_description || []).map((desc, index) => (
                    <tr
                      key={index}
                      className="text-sm"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (viewMode || !draggedProduct) return;
                        setProductOffers((prev) => {
                          const copy = { ...prev };
                          if (draggedProduct.__fromRow !== undefined) {
                            const original = [...(copy[draggedProduct.__fromRow] || [])];
                            original.splice(draggedProduct.__fromIndex, 1);
                            copy[draggedProduct.__fromRow] = original;
                          }
                          copy[index] = [...(copy[index] || []), freezeSpecs(draggedProduct)];
                          return copy;
                        });
                        setDraggedProduct(null);
                      }}
                    >
                      <td className="border px-2 py-1 font-medium text-center align-middle">
                        {formData.spf_number ? `${formData.spf_number}-${String(index + 1).padStart(3, "0")}` : "-"}
                      </td>
                      <td className="border px-2 py-1 align-middle">
                        <div className="flex justify-center items-center">
                          {formData.item_photo?.[index] ? (
                            <img src={formData.item_photo[index]} alt={desc} className="w-24 h-24 object-contain" />
                          ) : "-"}
                        </div>
                      </td>
                      <td
                        className="border px-2 py-1 whitespace-pre-wrap text-center align-middle"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const updated = [...(formData.item_description || [])];
                          const newLines = e.currentTarget.innerText.split("\n").map((l) => l.trim()).filter(Boolean);
                          updated[index] = newLines.join(" | ");
                          setFormData({ ...formData, item_description: updated });
                        }}
                      >
                        {desc.replace(/\|/g, "\n")}
                      </td>
                      <td className="border px-2 py-1 text-center align-middle">
                        {(productOffers[index] || []).length > 0 && (
                          <div className="border rounded mb-2 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="border px-2 py-1 text-center">Option</th>
                                  <th className="border px-2 py-1 text-center">Supplier Brand</th>
                                  <th className="border px-2 py-1 text-center">Image</th>
                                  <th className="border px-2 py-1 w-[70px]">Qty</th>
                                  <th className="border px-2 py-1 text-center">Technical Specifications</th>
                                  <th className="border px-2 py-1 text-center">Unit Cost</th>
                                  <th className="border px-2 py-1 text-center">
                                    Packaging Details
                                    <div className="text-[10px] text-muted-foreground">L x W x H</div>
                                  </th>
                                  <th className="border px-2 py-1 text-center">Factory Address</th>
                                  <th className="border px-2 py-1 text-center">Port of Discharge</th>
                                  <th className="border px-2 py-1 w-[100px]">Sub Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(productOffers[index] || []).map((prod: any, i: number) => {
                                  const unitCost = prod?.commercialDetails?.unitCost || "-";
                                  const length   = prod?.commercialDetails?.packaging?.length || "-";
                                  const width    = prod?.commercialDetails?.packaging?.width || "-";
                                  const height   = prod?.commercialDetails?.packaging?.height || "-";
                                  const factory  = prod?.commercialDetails?.factoryAddress || "-";
                                  const port     = prod?.commercialDetails?.portOfDischarge || "-";
                                  const brand    = prod?.supplier?.supplierBrand || prod?.supplier?.supplierBrandName || "-";

                                  return (
                                    <tr
                                      key={i}
                                      draggable={!viewMode}
                                      className={viewMode ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
                                      onDragStart={(e) => {
                                        if (viewMode) return;
                                        e.dataTransfer.setData("text/plain", "dragging");
                                        setDraggedProduct({ ...prod, __fromRow: index, __fromIndex: i });
                                        setShowTrash(true);
                                      }}
                                      onDragEnd={() => {
                                        if (viewMode) return;
                                        setDraggedProduct(null);
                                        setShowTrash(false);
                                      }}
                                    >
                                      <td className="border px-2 py-1 text-center align-middle">
                                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                                          Option {i + 1}
                                        </span>
                                      </td>
                                      <td className="border px-2 py-1 text-center align-middle font-medium">{brand}</td>
                                      <td className="border px-2 py-1 text-center align-middle">
                                        {prod.mainImage?.url ? (
                                          <img src={prod.mainImage.url} className="w-16 h-16 object-contain mx-auto" alt="" />
                                        ) : "-"}
                                      </td>
                                      <td className="border px-2 py-1 text-center align-middle">
                                        <input
                                          type="number"
                                          min={0}
                                          className="w-full border px-1 text-xs"
                                          placeholder="Qty"
                                          value={prod.qty || ""}
                                          onChange={(e) => {
                                            let qty = Number(e.target.value);
                                            if (qty < 0) qty = 0;
                                            setProductOffers((prev) => {
                                              const copy = { ...prev };
                                              const row  = [...(copy[index] || [])];
                                              row[i]     = { ...row[i], qty };
                                              copy[index] = row;
                                              return copy;
                                            });
                                          }}
                                        />
                                      </td>
                                      <td className="border px-2 py-1 text-center align-middle">
                                        {prod.technicalSpecifications
                                          ?.map((g: any) => ({ ...g, specs: g.specs?.filter((s: any) => s.value && s.value.trim() !== "") }))
                                          .filter((g: any) => g.specs && g.specs.length > 0)
                                          .map((g: any, gi: number) => (
                                            <div key={gi} className="mb-2">
                                              <b>{g.title}</b>
                                              <div className="text-xs">
                                                {g.specs.map((s: any, si: number) => (
                                                  <div key={si}>{s.specId}: {s.value}</div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                      </td>
                                      <td className="border px-2 py-1 text-center align-middle">{unitCost}</td>
                                      <td className="border px-2 py-1 text-center align-middle">{length} x {width} x {height}</td>
                                      <td className="border px-2 py-1 text-center align-middle">{factory}</td>
                                      <td className="border px-2 py-1 text-center align-middle">{port}</td>
                                      <td className="border px-2 py-1 text-center align-middle">
                                        {(() => {
                                          const qty  = prod.qty || 0;
                                          const cost = Number(prod?.commercialDetails?.unitCost || 0);
                                          return (
                                            <span className="text-xs font-semibold">
                                              ${(qty * cost).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          );
                                        })()}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No items added yet.</p>
            )}
          </div>
        </Card>

        {/* RIGHT: Draggable product cards */}
        <div className={`transition-all duration-500 ease-in-out ${
          viewMode ? "opacity-0 w-0 overflow-hidden pointer-events-none" : "opacity-100 w-[30%]"
        } max-h-[70vh] overflow-y-auto overscroll-contain`}>
          <div className="columns-2 gap-3">
            {filteredProducts.map((p) => (
              <Card
                key={p.id}
                draggable={!viewMode}
                onDragStart={() => {
                  if (viewMode) return;
                  setDraggedProduct({ ...p, __fromRow: undefined });
                  setShowTrash(true);
                }}
                onDragEnd={() => {
                  if (viewMode) return;
                  setDraggedProduct(null);
                  setShowTrash(false);
                }}
                className={`flex flex-col p-2 border shadow hover:shadow-md break-inside-avoid mb-3 ${
                  viewMode ? "cursor-default" : "cursor-grab"
                }`}
              >
                <div className="h-[100px] w-full bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                  {p.mainImage?.url ? (
                    <img src={p.mainImage.url} className="w-full h-full object-contain" alt={p.productName} />
                  ) : (
                    <div className="text-xs text-gray-400">No Image</div>
                  )}
                </div>
                <div className="mt-2 flex-1">
                  <p className="text-sm font-semibold line-clamp-2">{p.productName}</p>
                  {(p?.supplier?.supplierBrand || p?.supplier?.supplierBrandName) && (
                    <p className="text-xs font-semibold text-blue-600 mt-0.5 truncate">
                      {p.supplier.supplierBrand || p.supplier.supplierBrandName}
                    </p>
                  )}
                </div>
                <Accordion type="single" collapsible className="mt-2 border rounded">
                  <AccordionItem value="commercial">
                    <AccordionTrigger className="px-3 text-xs">Commercial Details</AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 text-xs space-y-2">
                      {(() => {
                        const details  = p.commercialDetails;
                        if (!details) return <p>-</p>;
                        const packaging = details.packaging || {};
                        return (
                          <>
                            {details.factoryAddress && <p><span className="font-medium">Factory:</span> {details.factoryAddress}</p>}
                            {details.portOfDischarge && <p><span className="font-medium">Port:</span> {details.portOfDischarge}</p>}
                            {details.unitCost && <p><span className="font-medium">Unit Cost:</span> {details.unitCost}</p>}
                            {(packaging.height || packaging.length || packaging.width || details.pcsPerCarton) && (
                              <div>
                                <p className="font-medium">Packaging</p>
                                <ul className="ml-3 list-disc">
                                  {packaging.height    && <li>Height: {packaging.height}</li>}
                                  {packaging.length    && <li>Length: {packaging.length}</li>}
                                  {packaging.width     && <li>Width: {packaging.width}</li>}
                                  {details.pcsPerCarton && <li>PCS/Carton: {details.pcsPerCarton}</li>}
                                </ul>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="technical">
                    <AccordionTrigger className="px-3 text-xs">Technical Specifications</AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 text-xs space-y-2">
                      {p.technicalSpecifications?.length ? (
                        p.technicalSpecifications
                          .filter((g: any) => g.title !== "COMMERCIAL DETAILS")
                          .map((group: any, i: number) => (
                            <div key={i} className="mb-3">
                              <p className="font-semibold">{group.title}</p>
                              <ul className="ml-3 list-disc">
                                {group.specs?.map((spec: any, s: number) => (
                                  <li key={s}><span className="font-medium">{spec.specId}</span> : {spec.value || "-"}</li>
                                ))}
                              </ul>
                            </div>
                          ))
                      ) : <p>-</p>}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            ))}
          </div>
        </div>

        {/* Filter panel */}
        <div className={`transition-all duration-500 ease-in-out ${
          viewMode || !openFilter
            ? "opacity-0 w-0 overflow-hidden pointer-events-none"
            : "opacity-100 w-[320px]"
        } shrink-0 self-start sticky top-0 max-h-[calc(80vh-200px)] overflow-y-auto border-l pl-2`}>
          <FilteringComponent products={products} onFilter={(filtered) => setFilteredProducts(filtered)} />
        </div>
      </div>

      <DialogFooter className="mt-4 flex justify-end gap-2">
        <Button variant="outline" className="rounded-none p-6" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="outline" className="rounded-none p-6" onClick={() => setViewMode((prev) => !prev)}>
          {viewMode ? "Back" : "View"}
        </Button>
        {viewMode && (
          <Button className="rounded-none p-6" onClick={handleSubmit}>Submit</Button>
        )}
      </DialogFooter>
    </>
  );

  /* ════════════════════════════════════════════════════════════ */
  /* DIALOG WRAPPER                                              */
  /* ════════════════════════════════════════════════════════════ */
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={
            isMobile
              ? "w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden"
              : "sm:max-w-8xl rounded-none p-6 max-h-[90vh] overflow-hidden flex flex-col"
          }
        >
          {isMobile ? renderMobile() : renderDesktop()}
        </DialogContent>
      </Dialog>

      {/* Add Product sub-dialog */}
      <Dialog open={openAddProduct} onOpenChange={setOpenAddProduct}>
        <DialogContent
          className={
            isMobile
              ? "w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden"
              : "sm:max-w-[1200px] max-h-[90vh] overflow-y-auto"
          }
        >
          <DialogHeader className={isMobile ? "px-4 pt-4 pb-2 border-b shrink-0" : ""}>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <div className={isMobile ? "flex-1 overflow-y-auto p-4" : ""}>
            <AddProductComponent onClose={() => setOpenAddProduct(false)} />
          </div>
          <DialogFooter className={isMobile ? "px-4 py-3 border-t shrink-0" : ""}>
            <Button
              variant="outline"
              className={isMobile ? "w-full rounded-none" : "rounded-none"}
              onClick={() => setOpenAddProduct(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
