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
import { Funnel } from "lucide-react";
import { toast } from "sonner";
import FilteringComponent from "@/components/filtering-component-v2";
import AddProductComponent from "@/components/add-product-component";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CardDetails from "@/components/spf/dialog/card-details";
import SPFRequestView from "@/components/spf-request-view";
/* CTRL + F: SHADCN ACCORDION IMPORT */
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

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

interface SPFProps {
  processBy: string;
}

export default function SPF({ processBy }: SPFProps) {
  const [requests, setRequests] = useState<SPFRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
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
    prepared_by: processBy,
    approved_by: "",
    sales_person: "",
    start_date: "",
    end_date: "",
    special_instructions: "",
    status: "Pending",
    process_by: processBy,
    tin_no: "",
    item_description: [],
    item_photo: [],
  });

  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [productOffers, setProductOffers] = useState<Record<number, any[]>>({});
  const [draggedProduct, setDraggedProduct] = useState<any | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [openAddProduct, setOpenAddProduct] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [createdSPF, setCreatedSPF] = useState<Record<string, string>>({});

  // Fetch SPF requests
  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/request/fetch");
      if (!res.ok) throw new Error("Failed to fetch SPF requests");
      const data = await res.json();
      const mapped = data.requests.map((r: any) => ({
        ...r,
        date_created: r.date_created
          ? new Date(r.date_created).toISOString()
          : null,
      }));

      setRequests(mapped);

      /* CHECK WHICH SPF ALREADY CREATED */
      const spfNumbers = mapped.map((r: any) => r.spf_number);

      if (spfNumbers.length) {
        const { data: created } = await supabase
          .from("spf_creation")
          .select("spf_number, status")
          .in("spf_number", spfNumbers);

        const map: Record<string, string> = {};

        created?.forEach((c: any) => {
          map[c.spf_number] = c.status;
        });

        setCreatedSPF(map);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch SPF requests");
    }
  }, []);

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel("spf-all")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spf_request" },
        fetchRequests,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const handleCreateFromRow = (rowData: SPFRequest) => {
    const normalizeArray = (value: string | string[] | undefined) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string")
        return value.split(",").map((v) => v.trim());
      return [];
    };

    setFormData({
      ...rowData,
      prepared_by: processBy,
      process_by: processBy,
      item_description: normalizeArray(rowData.item_description),
      item_photo: normalizeArray(rowData.item_photo),
    });

    setOpenDialog(true);
    fetchProducts(rowData.customer_name || "");
  };

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

      if (data?.success) {
        toast.success("SPF created successfully");
      }

      setOpenDialog(false);
      fetchRequests();
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error("Something went wrong while creating SPF");
    }
  };

  // Fetch products from Firebase
  const fetchProducts = useCallback((customerName: string) => {
    setLoadingProducts(true);
    const q = query(collection(db, "products"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort(
          (a: any, b: any) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        );
      setProducts(list);
      setFilteredProducts(list);
      setLoadingProducts(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = products.filter((p: any) => {
      const name = p.productName?.toLowerCase() || "";
      const commercial = JSON.stringify(p.commercialDetails || "").toLowerCase();
      return name.includes(term) || commercial.includes(term);
    });
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const parseDescription = (desc: string) => {
    if (!desc) return [];
    return desc
      .split(/\r?\n|\|/)
      .map((line) => line.trim())
      .filter(Boolean);
  };

  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requests List (Real-time)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 border-b pb-2 font-semibold text-sm">
          <div>SPF Number</div>
          <div>Customer Name</div>
          <div>Special Instructions</div>
          <div>Date Created</div>
          <div>Action</div>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4">
            No SPF requests yet.
          </p>
        ) : (
          requests.map((req) => {
            const formattedDate = req.date_created
              ? new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(req.date_created))
              : "-";
            return (
              <div
                key={req.id}
                className="grid grid-cols-5 py-2 border-b text-sm items-center"
              >
                <div>{req.spf_number}</div>
                <div>{req.customer_name}</div>
                <div>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 uppercase">
                    {req.special_instructions || "-"}
                  </span>
                </div>
                <div>{formattedDate}</div>
                <div>
                  <div className="flex gap-2">

                      {/* SHOW CREATE IF NOT YET PENDING FOR PROCUREMENT */}
                      {createdSPF[req.spf_number] !== "Pending For Procurement" && (
                        <Button
                          className="rounded-none p-6"
                          variant="outline"
                          onClick={() => handleCreateFromRow(req)}
                        >
                          Create
                        </Button>
                      )}

                      {/* SHOW VIEW IF PENDING */}
                      {createdSPF[req.spf_number] === "Pending For Procurement" && (
                        <SPFRequestView spfNumber={req.spf_number} />
                      )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* ---------------- Dialog ---------------- */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-8xl rounded-none p-6 max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="w-full mb-4 relative shrink-0">
              {/* CENTER TITLE */}
              <DialogTitle className="text-center w-full">
                Create SPF Request
              </DialogTitle>

              {/* RIGHT SIDE CONTROLS */}
              <div className="absolute right-0 top-0 flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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

                <Button
                  className="rounded-none p-6"
                  onClick={() => setOpenAddProduct(true)}
                >
                  + Add Product
                </Button>
              </div>

              {/* CTRL + F: DRAG DELETE ZONE */}
              {showTrash && (
                <div className="flex justify-center mt-3">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (viewMode) return;
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
                    🗑
                    <span className="font-medium">Drag here to delete</span>
                  </div>
                </div>
              )}
            </DialogHeader>

            {/* ✅ Main body: flex row, each panel scrolls independently, nothing leaks out */}
            <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">

              {/* LEFT CARD: Company Details + Table — scrolls on its own */}
              <Card
                className={`${
                  viewMode ? "w-[100%]" : "w-[70%]"
                } transition-all duration-500 ease-in-out p-4 flex flex-col gap-4 overflow-y-auto overscroll-contain min-h-0`}
              >
                <div className="grid grid-cols-1 gap-4">
                  <CardDetails
                    title="Company Details"
                    fields={[
                      { label: "Customer Name", value: formData.customer_name },
                      { label: "Contact Person", value: formData.contact_person },
                      { label: "Contact Number", value: formData.contact_number },
                      { label: "Registered Address", value: formData.registered_address, pre: true },
                      { label: "Delivery Address", value: formData.delivery_address },
                      { label: "Billing Address", value: formData.billing_address },
                      { label: "Collection Address", value: formData.collection_address },
                      { label: "TIN", value: formData.tin_no },
                    ]}
                  />
                  <CardDetails
                    title="SPF Details"
                    fields={[
                      { label: "Payment Terms", value: formData.payment_terms },
                      { label: "Warranty", value: formData.warranty },
                      { label: "Delivery Date", value: formData.delivery_date },
                      { label: "Prepared By", value: formData.prepared_by },
                      { label: "Approved By", value: formData.approved_by },
                      { label: "Process By", value: formData.process_by },
                    ]}
                  />
                </div>

                <div className="mb-3 border-b pb-2">
                  <h3 className="text-sm font-bold">
                    {formData.spf_number || "-"}
                  </h3>
                </div>

                <div className="mt-4 overflow-y-auto relative">
                  {formData.item_description?.length ? (
                    <table className="w-full table-auto border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-2 py-1 text-center">#</th>
                          <th className="border px-2 py-1 text-center">Supplier Brand</th>
                          <th className="border px-2 py-1 text-center">Image</th>
                          <th className="border px-2 py-1 text-center">Item Description</th>
                          <th className="border px-2 py-1 text-center">Product Offer</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(formData.item_description || []).map((desc, index) => {
                          const lines = parseDescription(desc);

                          return (
                            <tr
                              key={index}
                              className="text-sm"
                              onDragOver={(e) => e.preventDefault()}
                              /* CTRL + F: HANDLE PRODUCT DROP INTO ROW */
                              onDrop={() => {
                                if (viewMode) return;
                                if (!draggedProduct) return;

                                setProductOffers((prev) => {
                                  const copy = { ...prev };

                                  if (draggedProduct.__fromRow !== undefined) {
                                    const original = [
                                      ...(copy[draggedProduct.__fromRow] || []),
                                    ];
                                    original.splice(draggedProduct.__fromIndex, 1);
                                    copy[draggedProduct.__fromRow] = original;
                                  }

                                  /* CTRL + F: SPF FREEZE SPECS LOGIC */
                                  const freezeSpecs = (product: any) => {
                                    const activeFilters =
                                      (window as any).__ACTIVE_FILTERS__ || [];

                                    if (!product.technicalSpecifications)
                                      return product;

                                    const frozenSpecs =
                                      product.technicalSpecifications.map(
                                        (group: any) => ({
                                          ...group,
                                          specs: group.specs?.map((spec: any) => {
                                            const raw = spec.value || "";
                                            const values = raw
                                              .split("|")
                                              .map((v: string) => v.trim())
                                              .filter(Boolean);
                                            const uniqueValues = Array.from(new Set(values));

                                            if (!activeFilters.length) {
                                              return {
                                                ...spec,
                                                value: uniqueValues.join(" | "),
                                              };
                                            }

                                            const filtered = uniqueValues.filter((v) =>
                                              activeFilters.includes(v),
                                            );

                                            return {
                                              ...spec,
                                              value: filtered.length
                                                ? filtered.join(" | ")
                                                : uniqueValues.join(" | "),
                                            };
                                          }),
                                        }),
                                      );

                                    return {
                                      ...product,
                                      technicalSpecifications: frozenSpecs,
                                    };
                                  };

                                  copy[index] = [
                                    ...(copy[index] || []),
                                    freezeSpecs(draggedProduct),
                                  ];

                                  return copy;
                                });

                                setDraggedProduct(null);
                              }}
                            >
{/* ITEM NUMBER */}
<td className="border px-2 py-1 font-medium text-center align-middle">
  {formData.spf_number
    ? `${formData.spf_number}-${String(index + 1).padStart(3, "0")}`
    : "-"}
</td>

{/* SUPPLIER BRAND (FIX ALIGNMENT) */}
<td className="border px-2 py-1 text-center align-middle">
  -
</td>

{/* IMAGE */}
<td className="border px-2 py-1 align-middle">
  <div className="flex justify-center items-center">
    {formData.item_photo?.[index] ? (
      <img
        src={formData.item_photo[index]}
        alt={desc}
        className="w-24 h-24 object-contain"
      />
    ) : (
      "-"
    )}
  </div>
</td>

{/* DESCRIPTION */}
<td
  className="border px-2 py-1 whitespace-pre-wrap text-center align-middle"
  contentEditable
  suppressContentEditableWarning
  onBlur={(e) => {
    const updatedDescriptions = [
      ...(formData.item_description || []),
    ];
    const newLines = e.currentTarget.innerText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    updatedDescriptions[index] = newLines.join(" | ");
    setFormData({
      ...formData,
      item_description: updatedDescriptions,
    });
  }}
>
  {desc.replace(/\|/g, "\n")}
</td>

{/* PRODUCT OFFER TABLE */}
<td className="border px-2 py-1 text-center align-middle">
  {(productOffers[index] || []).length > 0 && (
    <div className="border rounded mb-2 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted">
          <tr>
            {/* ✅ ADD SUPPLIER BRAND HERE */}
            <th className="border px-2 py-1 text-center w-[120px]">
              Supplier Brand
            </th>

            <th className="border px-2 py-1 text-center">Image</th>
            <th className="border px-2 py-1 w-[70px]">Qty</th>
            <th className="border px-2 py-1 text-center">
              Technical Specifications
            </th>
            <th className="border px-2 py-1 text-center">Unit Cost</th>
            <th className="border px-2 py-1 text-center">
              Packaging Details
              <div className="text-[10px] text-muted-foreground">
                L x W x H
              </div>
            </th>
            <th className="border px-2 py-1 text-center">
              Factory Address
            </th>
            <th className="border px-2 py-1 text-center">
              Port of Discharge
            </th>
            <th className="border px-2 py-1 w-[100px]">
              Sub Total
            </th>
          </tr>
        </thead>

        <tbody>
          {(productOffers[index] || []).map((prod: any, i: number) => {
            const unitCost =
              prod?.commercialDetails?.unitCost || "-";
            const length =
              prod?.commercialDetails?.packaging?.length || "-";
            const width =
              prod?.commercialDetails?.packaging?.width || "-";
            const height =
              prod?.commercialDetails?.packaging?.height || "-";
            const factory =
              prod?.commercialDetails?.factoryAddress || "-";
            const port =
              prod?.commercialDetails?.portOfDischarge || "-";

            return (
              <tr
                key={i}
                draggable={!viewMode}
                className={`${
                  viewMode
                    ? "cursor-default"
                    : "cursor-grab active:cursor-grabbing"
                }`}
                onDragStart={(e) => {
                  if (viewMode) return;
                  e.dataTransfer.setData("text/plain", "dragging");
                  setDraggedProduct({
                    ...prod,
                    __fromRow: index,
                    __fromIndex: i,
                  });
                  setShowTrash(true);
                }}
                onDragEnd={() => {
                  if (viewMode) return;
                  setDraggedProduct(null);
                  setShowTrash(false);
                }}
              >
                {/* ✅ SUPPLIER BRAND */}
                <td className="border px-2 py-1 text-center align-middle">
                  {prod?.supplier?.supplierBrand || "-"}
                </td>

                {/* IMAGE */}
                <td className="border px-2 py-1 text-center align-middle">
                  {prod.mainImage?.url ? (
                    <img
                      src={prod.mainImage.url}
                      className="w-16 h-16 object-contain mx-auto"
                    />
                  ) : (
                    "-"
                  )}
                </td>

                {/* QTY */}
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
                        const row = [...(copy[index] || [])];
                        row[i] = { ...row[i], qty };
                        copy[index] = row;
                        return copy;
                      });
                    }}
                  />
                </td>

                {/* TECH SPECS */}
                <td className="border px-2 py-1 text-center align-middle">
                  {prod.technicalSpecifications
                    ?.map((g: any) => ({
                      ...g,
                      specs: g.specs?.filter(
                        (s: any) =>
                          s.value && s.value.trim() !== "",
                      ),
                    }))
                    .filter(
                      (g: any) =>
                        g.specs && g.specs.length > 0,
                    )
                    .map((g: any, gi: number) => (
                      <div key={gi} className="mb-2">
                        <b>{g.title}</b>
                        <div className="text-xs">
                          {g.specs.map(
                            (s: any, si: number) => (
                              <div key={si}>
                                {s.specId}: {s.value}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                </td>

                {/* UNIT COST */}
                <td className="border px-2 py-1 text-center align-middle">
                  {unitCost}
                </td>

                {/* PACKAGING */}
                <td className="border px-2 py-1 text-center align-middle">
                  {length} x {width} x {height}
                </td>

                {/* FACTORY */}
                <td className="border px-2 py-1 text-center align-middle">
                  {factory}
                </td>

                {/* PORT */}
                <td className="border px-2 py-1 text-center align-middle">
                  {port}
                </td>

                {/* SUBTOTAL */}
                <td className="border px-2 py-1 text-center align-middle">
                  {(() => {
                    const qty = prod.qty || 0;
                    const unitCost = Number(
                      prod?.commercialDetails?.unitCost || 0,
                    );
                    const subtotal = qty * unitCost;
                    return (
                      <span className="text-xs font-semibold">
                        $
                        {subtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No items added yet.</p>
                  )}
                </div>
              </Card>

              {/* ✅ RIGHT PANEL: Products — sticky, scrolls independently, never affected by left card */}
              <div
                className={`transition-all duration-500 ease-in-out ${
                  viewMode
                    ? "opacity-0 w-0 overflow-hidden pointer-events-none"
                    : "opacity-100 w-[30%]"
                } flex-shrink-0 overflow-y-auto overscroll-contain min-h-0`}
              >
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
                      className={`flex flex-col p-2 border shadow hover:shadow-md break-inside-avoid mb-3 ${viewMode ? "cursor-default" : "cursor-grab"}`}
                    >
                      <div className="h-[100px] w-full bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                        {p.mainImage?.url ? (
                          <img
                            src={p.mainImage.url}
                            className="w-full h-full object-contain"
                            alt={p.productName}
                          />
                        ) : (
                          <div className="text-xs text-gray-400">No Image</div>
                        )}
                      </div>
<div className="mt-2 flex-1">
  <p className="text-sm font-semibold line-clamp-2">{p.productName}</p>
  <p className="text-sm font-bold text-blue-600 line-clamp-1">
    {p.supplier?.supplierBrand || "-"}
  </p>
</div>
                      {/* CTRL + F: PRODUCT ACCORDION DETAILS */}
                      <Accordion type="single" collapsible className="mt-2 border rounded">
                        {/* COMMERCIAL DETAILS */}
                        <AccordionItem value="commercial">
                          <AccordionTrigger className="px-3 text-xs">Commercial Details</AccordionTrigger>
                          <AccordionContent className="px-3 pb-3 text-xs space-y-2">
                            {(() => {
                              const details = p.commercialDetails;
                              if (!details) return <p>-</p>;
                              const packaging = details.packaging || {};
                              return (
                                <>
                                  {details.factoryAddress && (
                                    <p><span className="font-medium">Factory:</span> {details.factoryAddress}</p>
                                  )}
                                  {details.portOfDischarge && (
                                    <p><span className="font-medium">Port:</span> {details.portOfDischarge}</p>
                                  )}
                                  {details.unitCost && (
                                    <p><span className="font-medium">Unit Cost:</span> {details.unitCost}</p>
                                  )}
                                  {(packaging.height || packaging.length || packaging.width || details.pcsPerCarton) && (
                                    <div>
                                      <p className="font-medium">Packaging</p>
                                      <ul className="ml-3 list-disc">
                                        {packaging.height && <li>Height: {packaging.height}</li>}
                                        {packaging.length && <li>Length: {packaging.length}</li>}
                                        {packaging.width && <li>Width: {packaging.width}</li>}
                                        {details.pcsPerCarton && <li>PCS/Carton: {details.pcsPerCarton}</li>}
                                      </ul>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </AccordionContent>
                        </AccordionItem>

                        {/* TECHNICAL SPECIFICATIONS */}
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
                                        <li key={s}>
                                          <span className="font-medium">{spec.specId}</span> : {spec.value || "-"}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))
                            ) : (
                              <p>-</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </Card>
                  ))}
                </div>
              </div>

              {/* ✅ FILTER PANEL — sticky, scrolls independently, never pushes products down */}
              <div
                className={`transition-all duration-500 ease-in-out ${
                  viewMode || !openFilter
                    ? "opacity-0 w-0 overflow-hidden pointer-events-none"
                    : "opacity-100 w-[320px]"
                } flex-shrink-0 overflow-y-auto overscroll-contain min-h-0 border-l pl-2`}
              >
                <FilteringComponent
                  products={products}
                  onFilter={(filtered) => setFilteredProducts(filtered)}
                />
              </div>
            </div>

            <DialogFooter className="mt-4 flex justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                className="rounded-none p-6"
                onClick={() => setOpenDialog(false)}
              >
                Cancel
              </Button>

              {/* CTRL + F: VIEW MODE BUTTON */}
              <Button
                variant="outline"
                className="rounded-none p-6"
                onClick={() => setViewMode((prev) => !prev)}
              >
                {viewMode ? "Back" : "View"}
              </Button>

              {/* SHOW SUBMIT ONLY IN VIEW MODE */}
              {viewMode && (
                <Button className="rounded-none p-6" onClick={handleSubmit}>
                  Submit
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ---------------- Add Product Dialog ---------------- */}
        <Dialog open={openAddProduct} onOpenChange={setOpenAddProduct}>
          <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
            </DialogHeader>
            <AddProductComponent onClose={() => setOpenAddProduct(false)} />
            <DialogFooter>
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setOpenAddProduct(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
