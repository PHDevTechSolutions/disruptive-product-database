"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/utils/supabase";
import { Funnel, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import FilteringComponent from "@/components/filtering-component-v2";
import AddProductComponent from "@/components/add-product-component";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CardDetails from "@/components/spf/dialog/card-details";
import SPFRequestView from "@/components/spf-request-view";

/* ─────────────────────────────────────────────────────────────── */
/* TYPES                                                           */
/* ─────────────────────────────────────────────────────────────── */
type SPFRequest = {
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
  status?: string;
  date_created?: string;
  process_by?: string;
  tin_no?: string;
};

interface SPFMobileProps {
  processBy: string;
}

/* ─────────────────────────────────────────────────────────────── */
/* INLINE SPECS — plain div collapsible, zero nested buttons      */
/* ─────────────────────────────────────────────────────────────── */
function InlineSpecs({ specs }: { specs: any[] }) {
  const [open, setOpen] = useState(false);
  const filtered = specs?.filter((g: any) => g.specs?.some((s: any) => s.value?.trim())) ?? [];
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
              {g.specs?.filter((s: any) => s.value?.trim()).map((s: any, si: number) => (
                <p key={si} className="text-muted-foreground">{s.specId}: {s.value}</p>
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
                <p key={s} className="text-muted-foreground">{spec.specId}: {spec.value || "-"}</p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* COMPONENT                                                       */
/* ─────────────────────────────────────────────────────────────── */
export default function SPFMobile({ processBy }: SPFMobileProps) {
  const [requests, setRequests]             = useState<SPFRequest[]>([]);
  const [error, setError]                   = useState<string | null>(null);
  const [openDialog, setOpenDialog]         = useState(false);
  const [formData, setFormData]             = useState<SPFRequest>({
    id: "", spf_number: "", customer_name: "",
    contact_person: "", contact_number: "",
    registered_address: "", delivery_address: "",
    billing_address: "", collection_address: "",
    payment_terms: "", warranty: "", delivery_date: "",
    prepared_by: processBy, approved_by: "",
    sales_person: "", start_date: "", end_date: "",
    special_instructions: "", status: "Pending",
    process_by: processBy, tin_no: "",
    item_description: [], item_photo: [],
  });

  const [productOffers, setProductOffers]       = useState<Record<number, any[]>>({});
  const [products, setProducts]                 = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts]   = useState(false);
  const [openAddProduct, setOpenAddProduct]     = useState(false);
  const [openFilter, setOpenFilter]             = useState(false);
  const [viewMode, setViewMode]                 = useState(false);
  const [searchTerm, setSearchTerm]             = useState("");

  /* createdSPF now stores status string (same as spf-request.tsx) */
  const [createdSPF, setCreatedSPF]             = useState<Record<string, string>>({});
  /* Gate: hide Create button until spf_creation statuses are confirmed loaded */
  const [createdSPFLoaded, setCreatedSPFLoaded] = useState(false);

  const [activeRowIndex, setActiveRowIndex]     = useState<number | null>(null);
  const [pickerStep, setPickerStep]             = useState<"list" | "confirm">("list");
  const [pendingProduct, setPendingProduct]     = useState<any | null>(null);
  const [activeTab, setActiveTab]               = useState<"details" | "items" | "products">("items");

  /* ─────────────────────────────── */
  /* FETCH createdSPF statuses       */
  /* ─────────────────────────────── */
  const fetchCreatedSPF = useCallback(async (spfNumbers: string[]) => {
    if (!spfNumbers.length) {
      setCreatedSPFLoaded(true);
      return;
    }
    const { data: created } = await supabase
      .from("spf_creation")
      .select("spf_number, status")
      .in("spf_number", spfNumbers);

    const map: Record<string, string> = {};
    created?.forEach((c: any) => {
      map[c.spf_number] = c.status || "unknown";
    });
    setCreatedSPF(map);
    setCreatedSPFLoaded(true);
  }, []);

  /* ─────────────────────────────── */
  /* FETCH REQUESTS                  */
  /* ─────────────────────────────── */
  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      setCreatedSPFLoaded(false); // reset gate while re-fetching
      const res = await fetch("/api/request/fetch");
      if (!res.ok) throw new Error("Failed to fetch SPF requests");
      const data = await res.json();
      const mapped = data.requests.map((r: any) => ({
        ...r,
        date_created: r.date_created ? new Date(r.date_created).toISOString() : null,
      }));
      setRequests(mapped);
      await fetchCreatedSPF(mapped.map((r: any) => r.spf_number));
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch SPF requests");
      setCreatedSPFLoaded(true); // unblock even on error
    }
  }, [fetchCreatedSPF]);

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel("spf-all-mobile")
      .on("postgres_changes", { event: "*", schema: "public", table: "spf_request" }, fetchRequests)
      /* Also listen to spf_creation so status updates reflect immediately */
      .on("postgres_changes", { event: "*", schema: "public", table: "spf_creation" }, fetchRequests)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  /* ─────────────────────────────── */
  /* HELPER: should Create be hidden */
  /* ─────────────────────────────── */
  const isProcurementStatus = (spfNumber: string): boolean => {
    if (!createdSPFLoaded) return true; // hide until confirmed
    const s = createdSPF[spfNumber];
    return s === "Approved By Procurement" || s === "Pending For Procurement";
  };

  /* ─────────────────────────────── */
  /* OPEN DIALOG FROM ROW            */
  /* ─────────────────────────────── */
  const handleCreateFromRow = (rowData: SPFRequest) => {
    const normalizeArray = (value: string | string[] | undefined) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") return value.split(",").map((v) => v.trim());
      return [];
    };
    setFormData({
      ...rowData,
      prepared_by: processBy,
      process_by: processBy,
      item_description: normalizeArray(rowData.item_description),
      item_photo: normalizeArray(rowData.item_photo),
    });
    setProductOffers({});
    setActiveRowIndex(null);
    setPickerStep("list");
    setPendingProduct(null);
    setViewMode(false);
    setActiveTab("items");
    setOpenDialog(true);
    fetchProducts(rowData.customer_name || "");
  };

  /* ─────────────────────────────────────────────────────────
   * SUBMIT
   * ─────────────────────────────────────────────────────────*/
  const handleSubmit = async () => {
    try {
      const allProducts = Object.values(productOffers).flat();

      const res = await fetch("/api/request/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          selectedProducts: allProducts,
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
      setOpenDialog(false);
      fetchRequests();
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error("Something went wrong while creating SPF");
    }
  };

  /* ─────────────────────────────── */
  /* FETCH PRODUCTS                  */
  /* ─────────────────────────────── */
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

  useEffect(() => {
    if (!searchTerm) { setFilteredProducts(products); return; }
    const term = searchTerm.toLowerCase();
    setFilteredProducts(
      products.filter((p: any) =>
        (p.productName?.toLowerCase() || "").includes(term) ||
        (p.supplier?.supplierBrand?.toLowerCase() || "").includes(term) ||
        (p.supplier?.company?.toLowerCase() || "").includes(term) ||
        JSON.stringify(p.commercialDetails || "").toLowerCase().includes(term)
      )
    );
  }, [searchTerm, products]);

  /* ─────────────────────────────────────────────────────────
   * FREEZE SPECS
   * ─────────────────────────────────────────────────────────*/
  const freezeSpecs = (product: any) => {
    const activeFilters = (window as any).__ACTIVE_FILTERS__ || [];

    if (!product.technicalSpecifications) return product;

    const frozenSpecs = product.technicalSpecifications.map((group: any) => ({
      ...group,
      specs: group.specs?.map((spec: any) => {
        const raw = spec.value || "";
        const values = raw.split("|").map((v: string) => v.trim()).filter(Boolean);
        const uniqueValues = Array.from(new Set(values));

        if (!activeFilters.length) {
          return { ...spec, value: uniqueValues.join(" | ") };
        }

        const filtered = uniqueValues.filter((v) => activeFilters.includes(v));
        return {
          ...spec,
          value: filtered.length ? filtered.join(" | ") : uniqueValues.join(" | "),
        };
      }),
    }));

    return { ...product, technicalSpecifications: frozenSpecs };
  };

  /* ─────────────────────────────── */
  /* TAP TO ADD                      */
  /* ─────────────────────────────── */
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
      copy[activeRowIndex] = [
        ...(copy[activeRowIndex] || []),
        freezeSpecs(pendingProduct),
      ];
      return copy;
    });

    setPendingProduct(null);
    setPickerStep("list");
    toast.success("Product added!");
  };

  const cancelConfirm = () => { setPendingProduct(null); setPickerStep("list"); };

  const removeProduct = (rowIndex: number, productIndex: number) => {
    setProductOffers((prev) => {
      const copy = { ...prev };
      const arr = [...(copy[rowIndex] || [])];
      arr.splice(productIndex, 1);
      copy[rowIndex] = arr;
      return copy;
    });
  };

  /* ─────────────────────────────── */
  /* RENDER                          */
  /* ─────────────────────────────── */
  if (error) return <p className="text-red-500 p-4">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requests List (Real-time)</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Request List ── */}
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">No SPF requests yet.</p>
        ) : (
          <div className="divide-y">
            {requests.map((req) => {
              const formattedDate = req.date_created
                ? new Intl.DateTimeFormat("en-US", {
                    year: "numeric", month: "short", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  }).format(new Date(req.date_created))
                : "-";

              return (
                <div key={req.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-sm truncate">{req.spf_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{req.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{formattedDate}</p>
                      {req.special_instructions && (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-gray-100 uppercase">
                          {req.special_instructions}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* HIDE CREATE IF ALREADY SENT TO PROCUREMENT */}
                      {!isProcurementStatus(req.spf_number) && (
                        <Button
                          type="button"
                          className="rounded-none h-9 text-xs"
                          variant="outline"
                          onClick={() => handleCreateFromRow(req)}
                        >
                          Create
                        </Button>
                      )}
                      {/* SHOW VIEW ONLY IF SPF ALREADY CREATED */}
                      {createdSPF[req.spf_number] && (
                        <SPFRequestView spfNumber={req.spf_number} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* MAIN DIALOG                                           */}
        {/* ══════════════════════════════════════════════════════ */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden sm:max-w-full">

            {/* ── Header ── */}
            <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-sm font-semibold truncate">
                  {formData.spf_number || "Create SPF"}
                </DialogTitle>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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

              {/* ── Tabs ── */}
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

              {/* ── Active row indicator ── */}
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

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain">

              {/* ─────── TAB: DETAILS ─────── */}
              {activeTab === "details" && (
                <div className="p-4 space-y-4">
                  <CardDetails
                    title="Company Details"
                    fields={[
                      { label: "Customer Name",     value: formData.customer_name },
                      { label: "Contact Person",     value: formData.contact_person },
                      { label: "Contact Number",     value: formData.contact_number },
                      { label: "Registered Address", value: formData.registered_address, pre: true },
                      { label: "Delivery Address",   value: formData.delivery_address },
                      { label: "Billing Address",    value: formData.billing_address },
                      { label: "Collection Address", value: formData.collection_address },
                      { label: "TIN",                value: formData.tin_no },
                    ]}
                  />
                  <CardDetails
                    title="SPF Details"
                    fields={[
                      { label: "Payment Terms", value: formData.payment_terms },
                      { label: "Warranty",      value: formData.warranty },
                      { label: "Delivery Date", value: formData.delivery_date },
                      { label: "Prepared By",   value: formData.prepared_by },
                      { label: "Approved By",   value: formData.approved_by },
                      { label: "Process By",    value: formData.process_by },
                    ]}
                  />
                </div>
              )}

              {/* ─────── TAB: ITEMS ─────── */}
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
                          {/* Row header */}
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
                              <img
                                src={formData.item_photo[index]}
                                className="w-10 h-10 object-contain shrink-0 rounded"
                                alt=""
                              />
                            ) : (
                              <div className="w-10 h-10 bg-muted rounded shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">
                                No img
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium line-clamp-2">
                                {desc.replace(/\|/g, " · ")}
                              </p>
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

                          {/* ── Offer cards ── */}
                          {offers.length > 0 && (
                            <div className="border-t divide-y">
                              {offers.map((prod: any, i: number) => {
                                const unitCost        = prod?.commercialDetails?.unitCost || "-";
                                const qty             = prod.qty || 0;
                                const cost            = Number(prod?.commercialDetails?.unitCost || 0);
                                const subtotal        = qty * cost;
                                const length          = prod?.commercialDetails?.packaging?.length || "-";
                                const width           = prod?.commercialDetails?.packaging?.width  || "-";
                                const height          = prod?.commercialDetails?.packaging?.height || "-";
                                const factory         = prod?.commercialDetails?.factoryAddress    || "-";
                                const port            = prod?.commercialDetails?.portOfDischarge   || "-";
                                const supplierBrand   = prod?.supplier?.supplierBrand || prod?.supplier?.supplierBrandName || "";
                                const supplierCompany = prod?.supplier?.company || "";

                                return (
                                  <div key={i} className="p-3 flex gap-3 items-start">
                                    {prod.mainImage?.url ? (
                                      <img src={prod.mainImage.url} className="w-14 h-14 object-contain rounded shrink-0" alt="" />
                                    ) : (
                                      <div className="w-14 h-14 bg-muted rounded shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">
                                        No img
                                      </div>
                                    )}

                                    <div className="flex-1 min-w-0 space-y-1">
                                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                        Option {i + 1}
                                        {supplierBrand && ` · ${supplierBrand}`}
                                      </span>

                                      <p className="text-xs font-medium line-clamp-1">{prod.productName}</p>

                                      {(supplierCompany || supplierBrand) && (
                                        <p className="text-[10px] text-muted-foreground truncate">
                                          {[supplierCompany, supplierBrand].filter(Boolean).join(" · ")}
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
                                              const row = [...(copy[index] || [])];
                                              row[i] = { ...row[i], qty };
                                              copy[index] = row;
                                              return copy;
                                            });
                                          }}
                                        />
                                        <span className="text-[10px] text-muted-foreground ml-auto">
                                          Unit: {unitCost}
                                        </span>
                                      </div>

                                      <p className="text-[10px] text-muted-foreground">
                                        Pack: {length} × {width} × {height}
                                      </p>

                                      {factory !== "-" && (
                                        <p className="text-[10px] text-muted-foreground truncate">Factory: {factory}</p>
                                      )}

                                      {port !== "-" && (
                                        <p className="text-[10px] text-muted-foreground truncate">Port: {port}</p>
                                      )}

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

              {/* ─────── TAB: PRODUCTS ─────── */}
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
                              <p className="text-[11px] text-muted-foreground truncate">
                                {pendingProduct.supplier.company}
                              </p>
                            )}
                            {activeRowIndex !== null && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                → {formData.spf_number}-{String(activeRowIndex + 1).padStart(3, "0")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" className="flex-1 rounded" onClick={cancelConfirm}>
                            Cancel
                          </Button>
                          <Button type="button" className="flex-1 rounded" onClick={confirmAddProduct}>
                            Confirm Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filter panel */}
                  {openFilter && (
                    <div className="mb-3 border rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                      <FilteringComponent
                        products={products}
                        onFilter={(filtered) => setFilteredProducts(filtered)}
                      />
                    </div>
                  )}

                  {loadingProducts ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Loading products...</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No products found.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredProducts.map((p) => {
                        const supplierBrand   = p?.supplier?.supplierBrand || p?.supplier?.supplierBrandName || "";
                        const supplierCompany = p?.supplier?.company || "";

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
                              <div className="w-14 h-14 bg-muted rounded shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">
                                No img
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold line-clamp-2">{p.productName}</p>
                              {supplierBrand && (
                                <p className="text-xs font-semibold text-blue-600 mt-0.5 truncate">{supplierBrand}</p>
                              )}
                              {supplierCompany && (
                                <p className="text-[10px] text-muted-foreground truncate">{supplierCompany}</p>
                              )}
                              {p.commercialDetails?.unitCost && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Unit cost: {p.commercialDetails.unitCost}
                                </p>
                              )}
                              <InlineProductSpecs specs={p.technicalSpecifications ?? []} />
                            </div>

                            <div className="shrink-0 flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                activeRowIndex !== null
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
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

            {/* ── Footer ── */}
            <DialogFooter className="px-4 py-3 border-t shrink-0 flex-row gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded" onClick={() => setOpenDialog(false)}>
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
          </DialogContent>
        </Dialog>

        {/* ── Add Product Dialog ── */}
        <Dialog open={openAddProduct} onOpenChange={setOpenAddProduct}>
          <DialogContent className="w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
              <DialogTitle>Add Product</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <AddProductComponent onClose={() => setOpenAddProduct(false)} />
            </div>
            <DialogFooter className="px-4 py-3 border-t shrink-0">
              <Button type="button" variant="outline" className="w-full rounded" onClick={() => setOpenAddProduct(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
