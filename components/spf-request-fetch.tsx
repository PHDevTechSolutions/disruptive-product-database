"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { Card } from "@/components/ui/card";
import { supabase } from "@/utils/supabase";
import {
  ChevronDown,
  ChevronUp,
  Funnel,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import FilteringComponent from "@/components/filtering-component-v2";
import AddProductComponent from "@/components/add-product-component";
import CardDetails from "@/components/spf/dialog/card-details";
import SPFRequestFetchVersionHistory from "./spf-request-fetch-version-history";
import SPFTimer from "@/components/spf-timer";
import { useUser } from "@/contexts/UserContext";
import MultipleSpecsDetected from "@/components/multiple-specs-detected";

/* ─────────────────────────────────────────────────────────────── */
/* TYPES                                                           */
/* ─────────────────────────────────────────────────────────────── */
type SPFViewProps = {
  spfNumber: string;
  processBy?: string;
};

type SPFData = {
  spf_number: string;
  status?: string;
  item_code?: string;
  supplier_brand: string;
  product_offer_image: string;
  product_offer_qty: string;
  product_offer_technical_specification: string;
  product_offer_unit_cost: string;
  product_offer_pcs_per_carton?: string;
  product_offer_packaging_details: string;
  product_offer_factory_address: string;
  product_offer_port_of_discharge: string;
  product_offer_subtotal: string;
  company_name?: string;
  contact_name?: string;
  contact_number?: string;
  proj_lead_time?: string;
  final_selling_cost?: string;
  final_unit_cost?: string;
  final_subtotal?: string;
  referenceid?: string;
  tsm?: string;
  manager?: string;
  item_added_author?: string;
};

type SPFRequestData = {
  item_description: string;
  item_photo: string;
  item_code?: string;
};

const ROW_SEP = "|ROW|";

type SpecGroup = { title: string; specs: string[] };

/* ─────────────────────────────────────────────────────────────── */
/* PIPE DETECTION HELPER                                           */
/* ─────────────────────────────────────────────────────────────── */
function hasMultipleSpecValues(product: any): boolean {
  if (!product?.technicalSpecifications) return false;
  return product.technicalSpecifications.some((group: any) =>
    group.specs?.some((spec: any) => {
      const values = (spec.value || "")
        .split("|")
        .map((v: string) => v.trim())
        .filter(Boolean);
      return values.length > 1;
    })
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* NAME CACHE FOR AUDIT TRAIL RESOLUTION                           */
/* ─────────────────────────────────────────────────────────────── */
const nameCache = new Map<string, string>();

async function resolveNames(referenceIDs: string[]): Promise<void> {
  const unresolved = referenceIDs.filter((id) => id && !nameCache.has(id));
  if (!unresolved.length) return;
  await Promise.allSettled(
    unresolved.map(async (refId) => {
      try {
        const response = await fetch(
          `/api/users?referenceID=${encodeURIComponent(refId)}`,
        );
        if (response.ok) {
          const user = await response.json();
          nameCache.set(
            refId,
            user?.Firstname
              ? `${user.Firstname} ${user.Lastname ?? ""}`.trim()
              : refId,
          );
        } else {
          nameCache.set(refId, refId);
        }
      } catch {
        nameCache.set(refId, refId);
      }
    }),
  );
}

function getResolvedName(referenceID: string | undefined): string {
  if (!referenceID) return "";
  return nameCache.get(referenceID) ?? referenceID;
}

/* ─────────────────────────────────────────────────────────────── */
/* STATUS LABEL MAPPING                                            */
/* ─────────────────────────────────────────────────────────────── */
function getStatusLabel(status: string | undefined): string {
  if (status === "Pending For Procurement") return "For Procurement Costing";
  if (status === "Approved By Procurement") return "Ready For Quotation";
  if (status === "For Revision") return "Revised By Sales";
  return status ?? "";
}

/* ─────────────────────────────────────────────────────────────── */
/* SPEC PARSERS (view mode)                                        */
/* ─────────────────────────────────────────────────────────────── */
function parseTechSpec(raw: string): SpecGroup[] {
  if (!raw || raw === "-") return [];
  if (raw.includes("~~")) {
    return raw.split("@@").map((chunk) => {
      const [titlePart, rest = ""] = chunk.split("~~");
      const specs = rest
        .split(";;")
        .map((s) => s.trim())
        .filter(Boolean);
      return { title: titlePart.trim(), specs };
    });
  }
  const specs = raw
    .split(" | ")
    .map((s) => s.trim())
    .filter(Boolean);
  return specs.length ? [{ title: "", specs }] : [];
}

function splitByRow(value: string | undefined): string[][] {
  if (!value) return [];
  return value
    .split(ROW_SEP)
    .map((rowStr) => rowStr.split(",").map((v) => v.trim()));
}

function splitSpecsByRow(value: string | undefined): SpecGroup[][][] {
  if (!value) return [];
  return value
    .split(ROW_SEP)
    .map((rowStr) => rowStr.split(" || ").map(parseTechSpec));
}

/* ─────────────────────────────────────────────────────────────── */
/* MOBILE HELPERS (edit mode)                                      */
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
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            setOpen((p) => !p);
          }
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
  const filtered =
    specs?.filter((g: any) => g.title !== "COMMERCIAL DETAILS") ?? [];
  if (!filtered.length) return null;
  return (
    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            setOpen((p) => !p);
          }
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

/* ── Collapsible spec block for view mode mobile ── */
function MobileSpecsBlock({ groups }: { groups: SpecGroup[] }) {
  const [open, setOpen] = useState(false);
  if (!groups.length)
    return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-xs text-blue-600 font-medium"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? "Hide specs" : "View specs"}
      </button>
      {open && (
        <div className="mt-1 space-y-1.5">
          {groups.map((group, gi) => (
            <div key={gi}>
              {group.title && (
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-700">
                  {group.title}
                </p>
              )}
              {group.specs.map((spec, si) => (
                <p key={si} className="text-[10px] text-gray-500 leading-snug">
                  {spec}
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
export default function SPFRequestFetch({
  spfNumber,
  processBy,
}: SPFViewProps) {
  const { userId } = useUser();
  /* ── Dialog / data state ── */
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SPFData | null>(null);
  const [latestVersionLabel, setLatestVersionLabel] = useState<string | null>(null);
  const [spfCreationStartTime, setSpfCreationStartTime] = useState<string | null>(null);
  const [spfCreationEndTime, setSpfCreationEndTime] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [requestData, setRequestData] = useState<SPFRequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ── Edit mode state ── */
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [productOffers, setProductOffers] = useState<Record<number, any[]>>({});
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  /* ── Edit UI state ── */
  const [openAddProduct, setOpenAddProduct] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState<any | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "items" | "products">("items");
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [pickerStep, setPickerStep] = useState<"list" | "confirm">("list");
  const [pendingProduct, setPendingProduct] = useState<any | null>(null);

  /* ── MultipleSpecsDetected modal ── */
  const [showPipeModal, setShowPipeModal] = useState(false);
  const [pendingPipeProduct, setPendingPipeProduct] = useState<any | null>(null);
  const [pendingPipeRowIndex, setPendingPipeRowIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const start = new Date().toISOString();
    setSpfCreationStartTime(start);
    setSpfCreationEndTime(null);
    setTimerActive(true);
  }, [open]);

  /* ── Responsive ── */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
          JSON.stringify(p.commercialDetails || "").toLowerCase().includes(term),
      ),
    );
  }, [productSearch, products]);

  /* ── Fetch products (for edit mode) ── */
  const fetchProducts = useCallback(() => {
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

  /* ── Main data fetch ── */
  const fetchSPF = async () => {
    const { data: versionData } = await supabase
      .from("spf_creation_history")
      .select("version_label, version_number")
      .eq("spf_number", spfNumber)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionData) {
      setLatestVersionLabel(
        versionData.version_label || `${spfNumber}_v${versionData.version_number}`
      );
    }

    try {
      setLoading(true);
      const { data: creation, error } = await supabase
        .from("spf_creation")
        .select("*")
        .eq("spf_number", spfNumber)
        .maybeSingle();

      if (error) { console.error(error); return; }
      setData(creation);

      if (creation?.item_added_author) {
        await resolveNames([creation.item_added_author]);
      }

      const { data: request } = await supabase
        .from("spf_request")
        .select("item_description,item_photo,item_code")
        .eq("spf_number", spfNumber)
        .maybeSingle();

      setRequestData(request);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchSPF();
  }, [open]);

  /* ── Status poll ── */
  useEffect(() => {
    const fetchStatus = async () => {
      const { data: d } = await supabase
        .from("spf_creation")
        .select("status")
        .eq("spf_number", spfNumber)
        .maybeSingle();
      if (d) setData((prev: any) => ({ ...prev, status: d.status }));
    };
    fetchStatus();
  }, [spfNumber]);

  /* ── Enter edit mode ── */
  const enterEditMode = () => {
    if (!data || !requestData) return;

    const rowImages = splitByRow(data.product_offer_image);
    const rowQtys = splitByRow(data.product_offer_qty);
    const rowUnitCosts = splitByRow(data.product_offer_unit_cost);
    const rowPcsPerCartons = splitByRow(data.product_offer_pcs_per_carton);
    const rowPackaging = splitByRow(data.product_offer_packaging_details);
    const rowFactories = splitByRow(data.product_offer_factory_address);
    const rowPorts = splitByRow(data.product_offer_port_of_discharge);
    const rowSubtotals = splitByRow(data.product_offer_subtotal);
    const rowBrands = splitByRow(data.supplier_brand);
    const rowSellingCosts = splitByRow(data.final_selling_cost);
    const rowLeadTimes = splitByRow(data.proj_lead_time);
    const rowItemCodes = splitByRow(data.item_code);
    const rowSpecs = splitSpecsByRow(data.product_offer_technical_specification);

    const descs = (requestData.item_description || "").split(",").map((s) => s.trim());

    const initialOffers: Record<number, any[]> = {};

    descs.forEach((_, rowIndex) => {
      const imgs = rowImages[rowIndex] ?? [];
      const qtys = rowQtys[rowIndex] ?? [];
      const costs = rowUnitCosts[rowIndex] ?? [];
      const pcsPerCartons = rowPcsPerCartons[rowIndex] ?? [];
      const packs = rowPackaging[rowIndex] ?? [];
      const facts = rowFactories[rowIndex] ?? [];
      const ports = rowPorts[rowIndex] ?? [];
      const brands = rowBrands[rowIndex] ?? [];
      const selling = rowSellingCosts[rowIndex] ?? [];
      const leads = rowLeadTimes[rowIndex] ?? [];
      const codes = rowItemCodes[rowIndex] ?? [];

      const hasData = imgs.length > 0 && !(imgs.length === 1 && imgs[0] === "");
      if (!hasData) { initialOffers[rowIndex] = []; return; }

      initialOffers[rowIndex] = imgs.map((img, i) => {
        const [length, width, height] = (packs[i] || "- x - x -")
          .split(" x ")
          .map((v) => v.trim());
        return {
          __isExisting: true,
          __sellingCost: selling[i] ?? "-",
          __leadTime: leads[i] ?? "-",
          mainImage: { url: img !== "-" ? img : "" },
          productName: codes[i] ?? `Option ${i + 1}`,
          supplier: {
            supplierBrand: brands[i] !== "-" ? brands[i] : "",
            supplierBrandName: brands[i] !== "-" ? brands[i] : "",
          },
          commercialDetails: {
            unitCost: costs[i] || "0",
            pcsPerCarton: pcsPerCartons[i] || "-",
            factoryAddress: facts[i] || "-",
            portOfDischarge: ports[i] || "-",
            packaging: { length, width, height },
          },
          technicalSpecifications: (rowSpecs[rowIndex]?.[i] ?? []).map((group) => ({
            title: group.title,
            specs: group.specs.map((spec) => {
              const colonIdx = spec.indexOf(":");
              if (colonIdx === -1) return { specId: spec, value: "" };
              return { specId: spec.slice(0, colonIdx).trim(), value: spec.slice(colonIdx + 1).trim() };
            }),
          })),
          qty: Number(qtys[i] || 1),
        };
      });
    });

    setProductOffers(initialOffers);
    fetchProducts();
    setEditMode(true);
    setViewMode(false);
    setActiveTab("items");
    setActiveRowIndex(null);
    setPickerStep("list");
    setPendingProduct(null);
    setProductSearch("");
    setShowPipeModal(false);
    setPendingPipeProduct(null);
    setPendingPipeRowIndex(null);
  };

  /* ── Helpers (edit mode) ── */
  const freezeSpecs = (product: any) => {
    const activeFilters = (window as any).__ACTIVE_FILTERS__ || [];
    if (!product.technicalSpecifications) return product;
    const frozenSpecs = product.technicalSpecifications.map((group: any) => ({
      ...group,
      specs: group.specs?.map((spec: any) => {
        const raw = spec.value || "";
        const values = raw.split("|").map((v: string) => v.trim()).filter(Boolean);
        const unique = Array.from(new Set(values)) as string[];
        if (!activeFilters.length) return { ...spec, value: unique.join(" | ") };
        const filtered = unique.filter((v) => activeFilters.includes(v));
        return { ...spec, value: filtered.length ? filtered.join(" | ") : unique.join(" | ") };
      }),
    }));
    return { ...product, technicalSpecifications: frozenSpecs };
  };

  /* ── Add product to a row (shared logic after pipe check) ── */
  const addProductToRow = (rowIndex: number, product: any) => {
    setProductOffers((prev) => {
      const copy = { ...prev };
      copy[rowIndex] = [
        ...(copy[rowIndex] || []),
        { ...product, qty: product.qty ?? 1 },
      ];
      return copy;
    });
  };

  /* ── Intercept product before adding — check for pipes ── */
  const tryAddProduct = (rowIndex: number, product: any) => {
    const frozen = freezeSpecs(product);
    if (hasMultipleSpecValues(frozen)) {
      setPendingPipeProduct(frozen);
      setPendingPipeRowIndex(rowIndex);
      setShowPipeModal(true);
    } else {
      addProductToRow(rowIndex, frozen);
    }
  };

  const removeProduct = (rowIndex: number, productIndex: number) => {
    setProductOffers((prev) => {
      const copy = { ...prev };
      const arr = [...(copy[rowIndex] || [])];
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
    const frozen = freezeSpecs(product);
    if (hasMultipleSpecValues(frozen)) {
      setPendingPipeProduct(frozen);
      setPendingPipeRowIndex(activeRowIndex);
      setShowPipeModal(true);
    } else {
      setPendingProduct(frozen);
      setPickerStep("confirm");
    }
  };

  const confirmAddProduct = () => {
    if (activeRowIndex === null || !pendingProduct) return;
    addProductToRow(activeRowIndex, pendingProduct);
    setPendingProduct(null);
    setPickerStep("list");
    toast.success("Product added!");
  };

  const cancelConfirm = () => {
    setPendingProduct(null);
    setPickerStep("list");
  };

  /* ── MultipleSpecsDetected confirm ── */
  const handlePipeConfirm = (filteredProduct: any) => {
    if (pendingPipeRowIndex === null) return;
    addProductToRow(pendingPipeRowIndex, { ...filteredProduct, qty: 1 });
    toast.success("Product added!");
    setPendingPipeProduct(null);
    setPendingPipeRowIndex(null);
    setShowPipeModal(false);
    setPendingProduct(null);
    setPickerStep("list");
  };

  const handlePipeClose = () => {
    setPendingPipeProduct(null);
    setPendingPipeRowIndex(null);
    setShowPipeModal(false);
    setDraggedProduct(null);
    setShowTrash(false);
  };

  /* ── Submit edit ── */
  const handleSubmitEdit = async () => {
    const end = new Date().toISOString();
    setSpfCreationEndTime(end);
    setTimerActive(false);
    const descs = (requestData?.item_description || "").split(",").map((s) => s.trim());
    const totalRows = descs.length;

    for (let i = 0; i < totalRows; i++) {
      if (!productOffers[i] || productOffers[i].length === 0) {
        toast.error(`Item row ${i + 1} has no product selected`);
        return;
      }
    }

    try {
      const allProducts = Object.entries(productOffers).flatMap(
        ([rowIndex, prods]) => prods.map((p) => ({ ...p, __rowIndex: Number(rowIndex) })),
      );

      const res = await fetch("/api/request/spf-request-edit-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spf_number: spfNumber,
          referenceid: userId ?? null,
          edited_by: userId ?? null,
          author: userId ?? null,
          tsm: data?.tsm ?? null,
          manager: data?.manager ?? null,
          item_code: data?.item_code ?? null,
          totalItemRows: totalRows,
          selectedProducts: allProducts,
          spf_creation_start_time: spfCreationStartTime ?? null,
          spf_creation_end_time: end ?? null,
          userId: userId ?? null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Edit API error:", errText);
        toast.error("Failed to update SPF");
        return;
      }

      const result = await res.json();
      if (result?.success) {
        toast.success(`SPF updated — ${result.version_label ?? ""}`);
        setEditMode(false);
        setViewMode(false);
        fetchSPF();
      }
    } catch (err: any) {
      console.error("Submit edit error:", err);
      toast.error("Something went wrong while updating SPF");
    }
  };

  /* ────────────────────────────────────────────────────────────── */
  /* COMPUTED VALUES (view mode)                                    */
  /* ────────────────────────────────────────────────────────────── */
  const isApproved = data?.status === "Approved By Procurement";
  const isForRevision = data?.status === "For Revision";

  const rowImages = splitByRow(data?.product_offer_image);
  const rowQtys = splitByRow(data?.product_offer_qty);
  const rowUnitCosts = splitByRow(data?.product_offer_unit_cost);
  const rowPcsPerCartons = splitByRow(data?.product_offer_pcs_per_carton);
  const rowPackaging = splitByRow(data?.product_offer_packaging_details);
  const rowFactories = splitByRow(data?.product_offer_factory_address);
  const rowPorts = splitByRow(data?.product_offer_port_of_discharge);
  const rowSubtotals = splitByRow(data?.product_offer_subtotal);
  const rowSupplierBrands = splitByRow(data?.supplier_brand);
  const rowSpecs = splitSpecsByRow(data?.product_offer_technical_specification);
  const rowCompanyNames = splitByRow(data?.company_name);
  const rowContactNames = splitByRow(data?.contact_name);
  const rowContactNumbers = splitByRow(data?.contact_number);
  const rowLeadTimes = splitByRow(data?.proj_lead_time);
  const rowSellingCosts = splitByRow(data?.final_selling_cost);
  const rowFinalUnitCosts = splitByRow(data?.final_unit_cost);
  const rowFinalSubtotals = splitByRow(data?.final_subtotal);
  const rowItemCodes = splitByRow(data?.item_code);

  const itemDescriptions: string[] = (requestData?.item_description || "")
    .split(",")
    .map((s) => s.trim());
  const itemImages = (requestData?.item_photo || "").split(",").map((s) => s.trim());

  /* ════════════════════════════════════════════════════════════ */
  /* EDIT MODE — MOBILE                                          */
  /* ════════════════════════════════════════════════════════════ */
  const renderEditMobile = () => (
    <>
      <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
        <div className="flex items-center justify-between gap-2">
          <DialogTitle className="text-sm font-semibold truncate flex items-center gap-2">
            <Pencil size={14} className="text-orange-500" />
            Edit {spfNumber}
          </DialogTitle>
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="text"
              placeholder="Search..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="border px-2 py-1 text-xs w-[110px] rounded"
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
          <div
            className={`mt-1 text-[11px] px-2 py-1 rounded ${
              activeRowIndex !== null
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {activeRowIndex !== null
              ? `Adding to: ${spfNumber}-${String(activeRowIndex + 1).padStart(3, "0")}`
              : "⚠ Tap a row in Items tab to select it first"}
          </div>
        )}
      </DialogHeader>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* DETAILS TAB */}
        {activeTab === "details" && (
          <div className="p-4 space-y-4">
            <CardDetails
              title="SPF Details"
              fields={[
                { label: "SPF Number", value: spfNumber },
                { label: "Status", value: getStatusLabel(data?.status) },
                { label: "Manager", value: data?.manager },
                { label: "Process By", value: processBy },
              ]}
            />
          </div>
        )}

        {/* ITEMS TAB */}
        {activeTab === "items" && (
          <div className="p-3 space-y-3">
            {itemDescriptions.map((desc, index) => {
              const isActive = activeRowIndex === index;
              const offers = productOffers[index] || [];
              return (
                <div
                  key={index}
                  className={`border rounded-lg overflow-hidden transition-all ${
                    isActive ? "border-orange-500 shadow-md" : "border-border"
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
                      isActive ? "bg-orange-50" : "bg-muted/30"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        isActive
                          ? "bg-orange-600 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </span>
                    {itemImages[index] ? (
                      <img
                        src={itemImages[index]}
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
                      <p
                        className={`text-[10px] mt-0.5 ${isActive ? "text-orange-600" : "text-muted-foreground"}`}
                      >
                        {isActive
                          ? "Selected — tap Products to add"
                          : `${offers.length} product${offers.length !== 1 ? "s" : ""} added`}
                      </p>
                    </div>
                    {isActive ? (
                      <ChevronUp size={14} className="text-orange-500 shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {offers.length > 0 && (
                    <div className="border-t divide-y">
                      {offers.map((prod: any, i: number) => {
                        const unitCost = prod?.commercialDetails?.unitCost || "-";
                        const qty = prod.qty ?? 1;
                        const cost = Number(prod?.commercialDetails?.unitCost || 0);
                        const subtotal = qty * cost;
                        const length = prod?.commercialDetails?.packaging?.length || "-";
                        const width = prod?.commercialDetails?.packaging?.width || "-";
                        const height = prod?.commercialDetails?.packaging?.height || "-";
                        const factory = prod?.commercialDetails?.factoryAddress || "-";
                        const port = prod?.commercialDetails?.portOfDischarge || "-";
                        const supplierBrand =
                          prod?.supplier?.supplierBrand || prod?.supplier?.supplierBrandName || "";

                        return (
                          <div key={i} className="p-3 flex gap-3 items-start">
                            {prod.mainImage?.url ? (
                              <img
                                src={prod.mainImage.url}
                                className="w-14 h-14 object-contain rounded shrink-0"
                                alt=""
                              />
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
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">Qty</span>
                                <input
                                  type="number"
                                  min={1}
                                  className="border rounded px-2 py-0.5 text-xs w-16"
                                  value={prod.qty || 1}
                                  onChange={(e) => {
                                    let qty = Number(e.target.value);
                                    if (qty < 1) qty = 1;
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
                                <p className="text-[10px] text-muted-foreground truncate">
                                  Factory: {factory}
                                </p>
                              )}
                              {port !== "-" && (
                                <p className="text-[10px] text-muted-foreground truncate">
                                  Port: {port}
                                </p>
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
            })}
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === "products" && (
          <div className="p-3">
            {/* Confirm bottom sheet */}
            {pickerStep === "confirm" && pendingProduct && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
                <div className="bg-background w-full rounded-t-2xl p-5 space-y-4 shadow-xl">
                  <p className="text-sm font-semibold">Add this product?</p>
                  <div className="flex gap-3 items-center">
                    {pendingProduct.mainImage?.url ? (
                      <img
                        src={pendingProduct.mainImage.url}
                        className="w-16 h-16 object-contain rounded shrink-0"
                        alt=""
                      />
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
                      {activeRowIndex !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          → {spfNumber}-{String(activeRowIndex + 1).padStart(3, "0")}
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
                  const supplierBrand = p?.supplier?.supplierBrand || p?.supplier?.supplierBrandName || "";
                  const supplierCo = p?.supplier?.company || "";
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
                        {supplierCo && (
                          <p className="text-[10px] text-muted-foreground truncate">{supplierCo}</p>
                        )}
                        {p.commercialDetails?.unitCost && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Unit cost: {p.commercialDetails.unitCost}
                          </p>
                        )}
                        {p.commercialDetails?.pcsPerCarton && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Qty/Per Carton: {p.commercialDetails.pcsPerCarton}
                          </p>
                        )}
                        <InlineProductSpecs specs={p.technicalSpecifications ?? []} />
                      </div>
                      <div className="shrink-0 flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            activeRowIndex !== null
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
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

      <div className="flex justify-start mb-2">
        <SPFTimer
          isActive={timerActive}
          startTime={spfCreationStartTime}
          label="Edit SPF Timer"
          onStart={(v) => setSpfCreationStartTime(v)}
          onStop={(v) => setSpfCreationEndTime(v)}
          onTick={() => {}}
        />
      </div>

      <DialogFooter className="px-4 py-3 border-t shrink-0 flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded"
          onClick={() => { setEditMode(false); setViewMode(false); }}
        >
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
          <Button
            type="button"
            className="flex-1 rounded bg-orange-600 hover:bg-orange-700"
            onClick={handleSubmitEdit}
            disabled={
              itemDescriptions.length === 0 ||
              itemDescriptions.some((_, i) => !productOffers[i] || productOffers[i].length === 0)
            }
          >
            Save
          </Button>
        )}
      </DialogFooter>
    </>
  );

  /* ════════════════════════════════════════════════════════════ */
  /* EDIT MODE — DESKTOP                                         */
  /* ════════════════════════════════════════════════════════════ */
  const renderEditDesktop = () => (
    <>
      <DialogHeader className="w-full mb-4 relative">
        <DialogTitle className="text-center w-full flex items-center justify-center gap-2">
          <Pencil size={16} className="text-orange-500" />
          Edit SPF — {spfNumber}
        </DialogTitle>
        <div className="absolute right-0 top-0 flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search product..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="border px-3 py-2 text-sm w-[220px]"
          />
          <Button
            size="icon"
            variant="outline"
            className="rounded-none p-6"
            onClick={() => setOpenFilter((prev) => !prev)}
          >
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
                if (!draggedProduct) return;
                if (draggedProduct.__fromRow !== undefined) {
                  setProductOffers((prev) => {
                    const copy = { ...prev };
                    const arr = [...(copy[draggedProduct.__fromRow] || [])];
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
        {/* LEFT: Items table */}
        <Card
          className={`${viewMode ? "w-[100%]" : "w-[70%]"} transition-all duration-500 ease-in-out p-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh] overscroll-contain`}
        >
          <div className="mb-3 border-b pb-2">
            <h3 className="text-sm font-bold">{spfNumber}</h3>
          </div>

          <div className="overflow-y-auto relative">
            {itemDescriptions.length ? (
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
                  {itemDescriptions.map((desc, index) => (
                    <tr
                      key={index}
                      className="text-sm"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!draggedProduct) return;
                        const frozen = draggedProduct.__fromRow !== undefined
                          ? draggedProduct
                          : freezeSpecs(draggedProduct);
                        if (hasMultipleSpecValues(frozen)) {
                          // Remove from source row if dragged from another row
                          if (draggedProduct.__fromRow !== undefined) {
                            setProductOffers((prev) => {
                              const copy = { ...prev };
                              const original = [...(copy[draggedProduct.__fromRow] || [])];
                              original.splice(draggedProduct.__fromIndex, 1);
                              copy[draggedProduct.__fromRow] = original;
                              return copy;
                            });
                          }
                          setPendingPipeProduct(frozen);
                          setPendingPipeRowIndex(index);
                          setShowPipeModal(true);
                          setDraggedProduct(null);
                          setShowTrash(false);
                        } else {
                          setProductOffers((prev) => {
                            const copy = { ...prev };
                            if (draggedProduct.__fromRow !== undefined) {
                              const original = [...(copy[draggedProduct.__fromRow] || [])];
                              original.splice(draggedProduct.__fromIndex, 1);
                              copy[draggedProduct.__fromRow] = original;
                            }
                            copy[index] = [
                              ...(copy[index] || []),
                              { ...frozen, qty: frozen.qty ?? 1 },
                            ];
                            return copy;
                          });
                          setDraggedProduct(null);
                        }
                      }}
                    >
                      <td className="border px-2 py-1 font-medium text-center align-middle">
                        {`${spfNumber}-${String(index + 1).padStart(3, "0")}`}
                      </td>
                      <td className="border px-2 py-1 align-middle">
                        <div className="flex justify-center items-center">
                          {itemImages[index] ? (
                            <img src={itemImages[index]} alt={desc} className="w-24 h-24 object-contain" />
                          ) : "-"}
                        </div>
                      </td>
                      <td className="border px-2 py-1 whitespace-pre-wrap text-center align-middle text-sm leading-relaxed">
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
                                  <th className="border px-2 py-1 text-center">Qty/Per Carton</th>
                                  <th className="border px-2 py-1 text-center">Packaging</th>
                                  <th className="border px-2 py-1 text-center">Factory</th>
                                  <th className="border px-2 py-1 text-center">Port</th>
                                  <th className="border px-2 py-1 w-[100px]">Sub Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(productOffers[index] || []).map((prod: any, i: number) => {
                                  const unitCost = prod?.commercialDetails?.unitCost || "-";
                                  const length = prod?.commercialDetails?.packaging?.length || "-";
                                  const width = prod?.commercialDetails?.packaging?.width || "-";
                                  const height = prod?.commercialDetails?.packaging?.height || "-";
                                  const factory = prod?.commercialDetails?.factoryAddress || "-";
                                  const port = prod?.commercialDetails?.portOfDischarge || "-";
                                  const brand =
                                    prod?.supplier?.supplierBrand || prod?.supplier?.supplierBrandName || "-";
                                  return (
                                    <tr
                                      key={i}
                                      draggable
                                      className="cursor-grab active:cursor-grabbing"
                                      onDragStart={(e) => {
                                        e.dataTransfer.setData("text/plain", "dragging");
                                        setDraggedProduct({ ...prod, __fromRow: index, __fromIndex: i });
                                        setShowTrash(true);
                                      }}
                                      onDragEnd={() => { setDraggedProduct(null); setShowTrash(false); }}
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
                                          min={1}
                                          className="w-full border px-1 text-xs"
                                          value={prod.qty ?? 1}
                                          onChange={(e) => {
                                            let qty = Number(e.target.value);
                                            if (qty < 1) qty = 1;
                                            setProductOffers((prev) => {
                                              const copy = { ...prev };
                                              const row = [...(copy[index] || [])];
                                              row[i] = { ...row[i], qty };
                                              copy[index] = row;
                                              return copy;
                                            });
                                          }}
                                        />
                                      </td>
                                      <td className="border px-2 py-1 text-center align-middle">
                                        {prod.technicalSpecifications
                                          ?.map((g: any) => ({
                                            ...g,
                                            specs: g.specs?.filter((s: any) => s.value && s.value.trim() !== ""),
                                          }))
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
                                      <td className="border px-2 py-1 text-center align-middle">
                                        {prod?.commercialDetails?.pcsPerCarton || "-"}
                                      </td>
                                      <td className="border px-2 py-1 text-center align-middle">
                                        {length} x {width} x {height}
                                      </td>
                                      <td className="border px-2 py-1 text-center align-middle">{factory}</td>
                                      <td className="border px-2 py-1 text-center align-middle">{port}</td>
                                      <td className="border px-2 py-1 text-center align-middle">
                                        {(() => {
                                          const qty = prod.qty ?? 1;
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
              <p className="text-sm text-muted-foreground">No items.</p>
            )}
          </div>
        </Card>

        {/* RIGHT: Draggable product cards */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            viewMode
              ? "opacity-0 w-0 overflow-hidden pointer-events-none"
              : "opacity-100 w-[30%]"
          } max-h-[70vh] overflow-y-auto overscroll-contain`}
        >
          <div className="columns-2 gap-3">
            {filteredProducts.map((p) => (
              <Card
                key={p.id}
                draggable
                onDragStart={() => {
                  setDraggedProduct({ ...p, __fromRow: undefined });
                  setShowTrash(true);
                }}
                onDragEnd={() => { setDraggedProduct(null); setShowTrash(false); }}
                className="flex flex-col p-2 border shadow hover:shadow-md break-inside-avoid mb-3 cursor-grab"
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
                        const details = p.commercialDetails;
                        if (!details) return <p>-</p>;
                        const packaging = details.packaging || {};
                        return (
                          <>
                            {details.factoryAddress && <p><span className="font-medium">Factory:</span> {details.factoryAddress}</p>}
                            {details.portOfDischarge && <p><span className="font-medium">Port:</span> {details.portOfDischarge}</p>}
                            {details.unitCost && <p><span className="font-medium">Unit Cost:</span> {details.unitCost}</p>}
                            {details.pcsPerCarton && <p><span className="font-medium">Qty/Per Carton:</span> {details.pcsPerCarton}</p>}
                            {(packaging.height || packaging.length || packaging.width) && (
                              <div>
                                <p className="font-medium">Packaging</p>
                                <ul className="ml-3 list-disc">
                                  {packaging.height && <li>Height: {packaging.height}</li>}
                                  {packaging.length && <li>Length: {packaging.length}</li>}
                                  {packaging.width && <li>Width: {packaging.width}</li>}
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
        <div
          className={`transition-all duration-500 ease-in-out ${
            viewMode || !openFilter
              ? "opacity-0 w-0 overflow-hidden pointer-events-none"
              : "opacity-100 w-[320px]"
          } shrink-0 self-start sticky top-0 max-h-[calc(80vh-200px)] overflow-y-auto border-l pl-2`}
        >
          <FilteringComponent
            products={products}
            onFilter={(filtered) => setFilteredProducts(filtered)}
          />
        </div>
      </div>

      <DialogFooter className="mt-4 flex flex-col gap-3">
        <div className="w-full">
          <SPFTimer
            isActive={timerActive}
            startTime={spfCreationStartTime}
            label="Edit SPF Timer"
            onStart={(v) => setSpfCreationStartTime(v)}
            onStop={(v) => setSpfCreationEndTime(v)}
            onTick={() => {}}
          />
        </div>
        <div className="w-full flex justify-end gap-2">
          <Button
            variant="outline"
            className="rounded-none p-6"
            onClick={() => { setEditMode(false); setViewMode(false); }}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="rounded-none p-6"
            onClick={() => setViewMode((prev) => !prev)}
          >
            {viewMode ? "Back" : "Preview"}
          </Button>
          {viewMode && (
            <Button
              className="rounded-none p-6 bg-orange-600 hover:bg-orange-700"
              onClick={handleSubmitEdit}
            >
              Save Changes
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  );

  /* ════════════════════════════════════════════════════════════ */
  /* VIEW MODE — MOBILE                                          */
  /* ════════════════════════════════════════════════════════════ */
  const renderViewMobile = () => (
    <div className="space-y-4 pb-4">
      {itemDescriptions.map((desc: string, rowIndex: number) => {
        const prodImages = rowImages[rowIndex] ?? [];
        const prodQtys = rowQtys[rowIndex] ?? [];
        const prodUnitCosts = rowUnitCosts[rowIndex] ?? [];
        const prodPcsPerCartons = rowPcsPerCartons[rowIndex] ?? [];
        const prodPackaging = rowPackaging[rowIndex] ?? [];
        const prodFactories = rowFactories[rowIndex] ?? [];
        const prodPorts = rowPorts[rowIndex] ?? [];
        const prodSubtotals = rowSubtotals[rowIndex] ?? [];
        const prodBrands = rowSupplierBrands[rowIndex] ?? [];
        const prodSpecs = rowSpecs[rowIndex] ?? [];
        const prodCompanyNames = rowCompanyNames[rowIndex] ?? [];
        const prodContactNames = rowContactNames[rowIndex] ?? [];
        const prodContactNumbers = rowContactNumbers[rowIndex] ?? [];
        const prodLeadTimes = rowLeadTimes[rowIndex] ?? [];
        const prodSellingCosts = rowSellingCosts[rowIndex] ?? [];
        const prodFinalUnitCosts = rowFinalUnitCosts[rowIndex] ?? [];
        const prodFinalSubtotals = rowFinalSubtotals[rowIndex] ?? [];
        const prodItemCodes = rowItemCodes[rowIndex] ?? [];

        const hasProducts =
          prodImages.length > 0 && !(prodImages.length === 1 && prodImages[0] === "");

        return (
          <div key={rowIndex} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="bg-gray-50 border-b px-3 py-2 flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 shrink-0">
                {spfNumber}-{String(rowIndex + 1).padStart(3, "0")}
              </span>
              {itemImages[rowIndex] ? (
                <img src={itemImages[rowIndex]} className="w-10 h-10 object-contain rounded shrink-0" alt="" />
              ) : null}
              <p className="text-xs font-medium text-gray-800 line-clamp-2 flex-1">
                {desc.replace(/\|/g, " · ")}
              </p>
            </div>

            {!hasProducts ? (
              <p className="text-xs text-muted-foreground px-3 py-3">No products added</p>
            ) : (
              <div className="divide-y">
                {prodImages.map((img, i) => {
                  const groups = prodSpecs[i] ?? [];
                  const optItemCode = prodItemCodes[i] && prodItemCodes[i] !== "-" ? prodItemCodes[i] : null;
                  return (
                    <div key={i} className="px-3 py-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Option {i + 1}{prodBrands[i] && prodBrands[i] !== "-" ? ` · ${prodBrands[i]}` : ""}
                        </span>
                        {optItemCode && (
                          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            {optItemCode}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 items-start">
                        {img && img !== "-" ? (
                          <img src={img} className="w-16 h-16 object-contain rounded border shrink-0" alt="" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border shrink-0 flex items-center justify-center text-[10px] text-gray-400">
                            No img
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <div><span className="text-gray-400 block">Qty</span><span className="font-medium">{prodQtys[i] || "-"}</span></div>
                            <div><span className="text-gray-400 block">Unit Cost</span><span className="font-medium">{prodUnitCosts[i] || "-"}</span></div>
                            <div><span className="text-gray-400 block">Qty/Per Carton</span><span className="font-medium">{prodPcsPerCartons[i] || "-"}</span></div>
                            <div>
                              <span className="text-gray-400 block">Subtotal</span>
                              <span className="font-semibold text-gray-900">₱{Number(prodSubtotals[i] || 0).toLocaleString()}</span>
                            </div>
                            <div><span className="text-gray-400 block">Packaging</span><span className="font-medium">{prodPackaging[i] || "-"}</span></div>
                          </div>
                          {prodFactories[i] && prodFactories[i] !== "-" && (
                            <p className="text-[10px] text-gray-500 truncate">
                              <span className="text-gray-400">Factory: </span>{prodFactories[i]}
                            </p>
                          )}
                          {prodPorts[i] && prodPorts[i] !== "-" && (
                            <p className="text-[10px] text-gray-500 truncate">
                              <span className="text-gray-400">Port: </span>{prodPorts[i]}
                            </p>
                          )}
                          <MobileSpecsBlock groups={groups} />
                        </div>
                      </div>

                      {isApproved && (
                        <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 space-y-1">
                          <p className="text-[10px] font-bold uppercase text-green-700 mb-1">Procurement Details</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <div><span className="text-gray-400 block">Company</span><span className="font-medium">{prodCompanyNames[i] || "-"}</span></div>
                            <div><span className="text-gray-400 block">Contact</span><span className="font-medium">{prodContactNames[i] || "-"}</span></div>
                            <div><span className="text-gray-400 block">Contact No.</span><span className="font-medium">{prodContactNumbers[i] || "-"}</span></div>
                            <div><span className="text-gray-400 block">Lead Time</span><span className="font-medium">{prodLeadTimes[i] && prodLeadTimes[i] !== "-" ? prodLeadTimes[i] : "-"}</span></div>
                            <div className="col-span-2">
                              <span className="text-gray-400 block">Selling Cost</span>
                              <span className="font-semibold text-green-700">
                                {prodSellingCosts[i] && prodSellingCosts[i] !== "-" ? `₱${Number(prodSellingCosts[i]).toLocaleString()}` : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Final Unit Cost</span>
                              <span className="font-semibold text-green-700">
                                {prodFinalUnitCosts[i] && prodFinalUnitCosts[i] !== "-" ? `₱${Number(prodFinalUnitCosts[i]).toLocaleString()}` : "-"}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Final Subtotal</span>
                              <span className="font-semibold text-green-700">
                                {prodFinalSubtotals[i] && prodFinalSubtotals[i] !== "-" ? `₱${Number(prodFinalSubtotals[i]).toLocaleString()}` : "-"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  /* ════════════════════════════════════════════════════════════ */
  /* VIEW MODE — DESKTOP TABLE                                   */
  /* ════════════════════════════════════════════════════════════ */
  const renderViewDesktop = () => (
    <Card className="p-4 overflow-x-auto">
      <table className="w-full table-auto border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-center whitespace-nowrap">#</th>
            <th className="border px-3 py-2 text-center whitespace-nowrap">Image</th>
            <th className="border px-3 py-2 text-center whitespace-nowrap">Item Description</th>
            <th className="border px-3 py-2 text-center">Product Offer</th>
          </tr>
        </thead>
        <tbody>
          {itemDescriptions.map((desc, rowIndex) => {
            const prodImages = rowImages[rowIndex] ?? [];
            const prodQtys = rowQtys[rowIndex] ?? [];
            const prodUnitCosts = rowUnitCosts[rowIndex] ?? [];
            const prodPcsPerCartons = rowPcsPerCartons[rowIndex] ?? [];
            const prodPackaging = rowPackaging[rowIndex] ?? [];
            const prodFactories = rowFactories[rowIndex] ?? [];
            const prodPorts = rowPorts[rowIndex] ?? [];
            const prodSubtotals = rowSubtotals[rowIndex] ?? [];
            const prodBrands = rowSupplierBrands[rowIndex] ?? [];
            const prodSpecs = rowSpecs[rowIndex] ?? [];
            const prodCompanyNames = rowCompanyNames[rowIndex] ?? [];
            const prodContactNames = rowContactNames[rowIndex] ?? [];
            const prodContactNumbers = rowContactNumbers[rowIndex] ?? [];
            const prodLeadTimes = rowLeadTimes[rowIndex] ?? [];
            const prodSellingCosts = rowSellingCosts[rowIndex] ?? [];
            const prodFinalUnitCosts = rowFinalUnitCosts[rowIndex] ?? [];
            const prodFinalSubtotals = rowFinalSubtotals[rowIndex] ?? [];
            const prodItemCodes = rowItemCodes[rowIndex] ?? [];

            const hasProducts =
              prodImages.length > 0 && !(prodImages.length === 1 && prodImages[0] === "");

            return (
              <tr key={rowIndex} className="align-top">
                <td className="border px-3 py-2 text-center align-top pt-3 whitespace-nowrap font-medium">
                  {spfNumber}-{String(rowIndex + 1).padStart(3, "0")}
                </td>
                <td className="border px-3 py-2 text-center align-top pt-3">
                  {itemImages[rowIndex] ? (
                    <img src={itemImages[rowIndex]} className="w-24 h-24 object-contain mx-auto" alt="" />
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </td>
                <td className="border px-3 py-2 whitespace-pre-wrap align-top pt-3 text-sm leading-relaxed">
                  {desc.replace(/\|/g, "\n")}
                </td>
                <td className="border px-2 py-2 align-top">
                  {!hasProducts ? (
                    <span className="text-xs text-muted-foreground">No products added</span>
                  ) : (
                    <div className="space-y-3">
                      {prodImages.map((img, i) => {
                        const groups = prodSpecs[i] ?? [];
                        const optItemCode = prodItemCodes[i] && prodItemCodes[i] !== "-" ? prodItemCodes[i] : null;
                        return (
                          <div key={i}>
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Option {i + 1}{prodBrands[i] && ` · ${prodBrands[i]}`}
                              </span>
                              {optItemCode && (
                                <span className="inline-flex items-center text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                  {optItemCode}
                                </span>
                              )}
                            </div>
                            <div className="border rounded overflow-hidden">
                              <table className="w-full border text-xs">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Supplier Brand</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Image</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Qty</th>
                                    <th className="border px-2 py-1 text-center min-w-[200px]">Technical Specs</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Unit Cost</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Qty/Per Carton</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Packaging</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Factory</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Port</th>
                                    <th className="border px-2 py-1 text-center whitespace-nowrap">Subtotal</th>
                                    {isApproved && (
                                      <>
                                        <th className="border px-2 py-1 text-center whitespace-nowrap">Company</th>
                                        <th className="border px-2 py-1 text-center whitespace-nowrap">Contact Name</th>
                                        <th className="border px-2 py-1 text-center whitespace-nowrap">Contact No.</th>
                                        <th className="border px-2 py-1 text-center whitespace-nowrap bg-green-50 text-green-700">Lead Time</th>
                                        <th className="border px-2 py-1 text-center whitespace-nowrap bg-green-50 text-green-700">Selling Cost</th>
                                        <th className="border px-2 py-1 text-center whitespace-nowrap bg-green-50 text-green-700">Final Unit Cost</th>
                                        <th className="border px-2 py-1 text-center whitespace-nowrap bg-green-50 text-green-700">Final Subtotal</th>
                                      </>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="align-top">
                                    <td className="border px-2 py-2 text-center align-middle font-medium">{prodBrands[i] || "-"}</td>
                                    <td className="border px-2 py-2 text-center align-middle">
                                      {img && img !== "-" ? (
                                        <img src={img} className="w-16 h-16 object-contain mx-auto" alt="" />
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </td>
                                    <td className="border px-2 py-2 text-center align-middle">{prodQtys[i] || "-"}</td>
                                    <td className="border px-2 py-2 align-top">
                                      {groups.length === 0 ? (
                                        <span className="text-muted-foreground">-</span>
                                      ) : (
                                        <div className="space-y-2">
                                          {groups.map((group, gi) => (
                                            <div key={gi}>
                                              {group.title && (
                                                <p className="font-bold text-[11px] uppercase tracking-wide text-gray-800 mb-0.5">{group.title}</p>
                                              )}
                                              <div className="space-y-0.5">
                                                {group.specs.map((spec, si) => (
                                                  <p key={si} className="text-[11px] text-gray-600 leading-snug">{spec}</p>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                    <td className="border px-2 py-2 text-center align-middle">{prodUnitCosts[i] || "-"}</td>
                                    <td className="border px-2 py-2 text-center align-middle">{prodPcsPerCartons[i] || "-"}</td>
                                    <td className="border px-2 py-2 text-center align-middle">{prodPackaging[i] || "-"}</td>
                                    <td className="border px-2 py-2 text-center align-middle">{prodFactories[i] || "-"}</td>
                                    <td className="border px-2 py-2 text-center align-middle">{prodPorts[i] || "-"}</td>
                                    <td className="border px-2 py-2 text-center align-middle font-semibold">
                                      ₱{Number(prodSubtotals[i] || 0).toLocaleString()}
                                    </td>
                                    {isApproved && (
                                      <>
                                        <td className="border px-2 py-2 text-center align-middle">{prodCompanyNames[i] || "-"}</td>
                                        <td className="border px-2 py-2 text-center align-middle">{prodContactNames[i] || "-"}</td>
                                        <td className="border px-2 py-2 text-center align-middle">{prodContactNumbers[i] || "-"}</td>
                                        <td className="border px-2 py-2 text-center align-middle bg-green-50">
                                          {prodLeadTimes[i] && prodLeadTimes[i] !== "-" ? prodLeadTimes[i] : "-"}
                                        </td>
                                        <td className="border px-2 py-2 text-center align-middle bg-green-50 text-green-700 font-semibold">
                                          {prodSellingCosts[i] && prodSellingCosts[i] !== "-" ? `₱${Number(prodSellingCosts[i]).toLocaleString()}` : "-"}
                                        </td>
                                        <td className="border px-2 py-2 text-center align-middle bg-green-50 text-green-700 font-semibold">
                                          {prodFinalUnitCosts[i] && prodFinalUnitCosts[i] !== "-" ? `₱${Number(prodFinalUnitCosts[i]).toLocaleString()}` : "-"}
                                        </td>
                                        <td className="border px-2 py-2 text-center align-middle bg-green-50 text-green-700 font-semibold">
                                          {prodFinalSubtotals[i] && prodFinalSubtotals[i] !== "-" ? `₱${Number(prodFinalSubtotals[i]).toLocaleString()}` : "-"}
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );

  /* ════════════════════════════════════════════════════════════ */
  /* DIALOG WRAPPER                                              */
  /* ════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Trigger button + status badge ── */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="rounded-none p-6"
          onClick={() => setOpen(true)}
        >
          View
        </Button>

        {data?.status && (
          <span
            className={`text-xs px-2 py-1 rounded uppercase ${
              isApproved
                ? "bg-green-100 text-green-700"
                : isForRevision
                  ? "bg-orange-100 text-orange-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {getStatusLabel(data.status)}
          </span>
        )}
      </div>

      {/* ── Main view dialog ── */}
      <Dialog
        open={open && !editMode}
        onOpenChange={(o) => {
          if (!o) { setOpen(false); setEditMode(false); } else setOpen(true);
        }}
      >
        <DialogContent
          className={
            isMobile
              ? "w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden"
              : "sm:max-w-7xl max-h-[90vh] overflow-y-auto rounded-none"
          }
        >
          <DialogHeader className={isMobile ? "px-4 pt-4 pb-3 border-b shrink-0" : "space-y-2"}>
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                SPF Request View
                {latestVersionLabel && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200 font-mono">
                    {latestVersionLabel}
                  </span>
                )}
              </DialogTitle>
              <SPFRequestFetchVersionHistory spfNumber={spfNumber} isMobile={isMobile} />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
              {data?.status && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs">Status:</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded uppercase font-semibold ${
                      isApproved
                        ? "bg-green-100 text-green-700"
                        : isForRevision
                          ? "bg-orange-100 text-orange-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {getStatusLabel(data.status)}
                  </span>
                </div>
              )}

              {data?.item_added_author && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs">Author:</span>
                  <span className="text-xs text-muted-foreground">
                    {getResolvedName(data.item_added_author)}
                  </span>
                </div>
              )}

              {isForRevision && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => {
                    setOpen(false);
                    enterEditMode();
                    setEditMode(true);
                    setTimeout(() => setOpen(true), 50);
                  }}
                >
                  <Pencil size={12} />
                  Edit (Revise)
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className={isMobile ? "flex-1 overflow-y-auto px-3 pt-3 pb-4" : "mt-2"}>
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            )}
            {!loading && data && (isMobile ? renderViewMobile() : renderViewDesktop())}
            {!loading && !data && (
              <p className="text-sm text-muted-foreground text-center py-8">No SPF creation found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog (For Revision) ── */}
      <Dialog
        open={open && editMode}
        onOpenChange={(o) => {
          if (!o) { setOpen(false); setEditMode(false); } else setOpen(true);
        }}
      >
        <DialogContent
          className={
            isMobile
              ? "w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden"
              : "sm:max-w-8xl rounded-none p-6 max-h-[90vh] overflow-hidden flex flex-col"
          }
        >
          {isMobile ? renderEditMobile() : renderEditDesktop()}
        </DialogContent>
      </Dialog>

      {/* ── Add Product sub-dialog (edit mode) ── */}
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

      {/* ── MultipleSpecsDetected modal ── */}
      <MultipleSpecsDetected
        open={showPipeModal}
        onClose={handlePipeClose}
        product={pendingPipeProduct}
        onConfirm={handlePipeConfirm}
      />
    </>
  );
}
