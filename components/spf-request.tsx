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
import FilteringComponent from "@/components/filtering-component-v2";
import AddProductComponent from "@/components/add-product-component";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CardDetails from "@/components/spf/dialog/card-details";
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
  item_code?: string[];
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
    item_code: [],
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
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch SPF requests
  const fetchRequests = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/request/fetch");
      if (!res.ok) throw new Error("Failed to fetch SPF requests");
      const data = await res.json();
      setRequests(
        data.requests.map((r: any) => ({
          ...r,
          date_created: r.date_created
            ? new Date(r.date_created).toISOString()
            : null,
        })),
      );
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
    // Helper to normalize comma-separated strings into arrays
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
      item_code: normalizeArray(rowData.item_code),
    });

    setOpenDialog(true);
    fetchProducts(rowData.customer_name || "");
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch("/api/request/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to create SPF request");
      setOpenDialog(false);
      fetchRequests();
    } catch (err: any) {
      console.error("Submit error:", err);
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
      const commercial = JSON.stringify(
        p.commercialDetails || "",
      ).toLowerCase();

      return name.includes(term) || commercial.includes(term);
    });
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  const parseDescription = (desc: string) => {
    if (!desc) return [];
    // Split by line breaks OR " | " if present
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
                  <Button
                    className="rounded-none p-6"
                    variant="outline"
                    onClick={() => handleCreateFromRow(req)}
                  >
                    Create
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {/* ---------------- Dialog ---------------- */}
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="sm:max-w-8xl rounded-none p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex items-center w-full mb-4">
              <DialogTitle>Create SPF Request</DialogTitle>
              <div className="ml-auto flex gap-2 items-center">
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
            </DialogHeader>

            <div className="flex gap-4">
              {/* LEFT CARD: Company Details + Table */}
              <Card className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 gap-4">
                  <CardDetails
                    title="Company Details"
                    fields={[
                      { label: "Customer Name", value: formData.customer_name },
                      {
                        label: "Contact Person",
                        value: formData.contact_person,
                      },
                      {
                        label: "Contact Number",
                        value: formData.contact_number,
                      },
                      {
                        label: "Registered Address",
                        value: formData.registered_address,
                        pre: true,
                      },
                      {
                        label: "Delivery Address",
                        value: formData.delivery_address,
                      },
                      {
                        label: "Billing Address",
                        value: formData.billing_address,
                      },
                      {
                        label: "Collection Address",
                        value: formData.collection_address,
                      },
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

                {/* SELECTED PRODUCTS TABLE */}
                {/* RIGHT CARD: Products Section */}
                <div className="mb-3 border-b pb-2">
                  <h3 className="text-sm font-bold">
                    {formData.spf_number || "-"}
                  </h3>
                </div>

                <div className="mt-4 overflow-y-auto relative">
                  {/* CTRL + F: PRODUCT OFFER TRASH ZONE */}
                  {showTrash && (
                    <div className="absolute right-3 top-12 z-50">
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (!draggedProduct) return;

                          if (draggedProduct.__fromRow !== undefined) {
                            setProductOffers((prev) => {
                              const copy = { ...prev };
                              const arr = [
                                ...(copy[draggedProduct.__fromRow] || []),
                              ];

                              arr.splice(draggedProduct.__fromIndex, 1);
                              copy[draggedProduct.__fromRow] = arr;

                              return copy;
                            });
                          }

                          setDraggedProduct(null);
                          setShowTrash(false);
                        }}
                        className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500 text-white shadow-xl animate-pulse cursor-pointer"
                      >
                        🗑
                      </div>
                    </div>
                  )}

                  {formData.item_description?.length ? (
                    <table className="w-full table-auto border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-2 py-1 text-left">#</th>
                          <th className="border px-2 py-1 text-left">Image</th>
                          <th className="border px-2 py-1 text-left">
                            Item Code
                          </th>
                          <th className="border px-2 py-1 text-left">
                            Item Description
                          </th>
                          <th className="border px-2 py-1 text-left">
                            Product Offer
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {(formData.item_description || []).map(
                          (desc, index) => {
                            const lines = parseDescription(desc);

                            return (
                              <tr
                                key={index}
                                className="text-sm"
                                onDragOver={(e) => e.preventDefault()}
                                /* CTRL + F: HANDLE PRODUCT DROP INTO ROW */
                                onDrop={() => {
                                  if (!draggedProduct) return;

                                  setProductOffers((prev) => {
                                    const copy = { ...prev };

                                    if (
                                      draggedProduct.__fromRow !== undefined
                                    ) {
                                      const original = [
                                        ...(copy[draggedProduct.__fromRow] ||
                                          []),
                                      ];

                                      original.splice(
                                        draggedProduct.__fromIndex,
                                        1,
                                      );

                                      copy[draggedProduct.__fromRow] = original;
                                    }

                                    copy[index] = [
                                      ...(copy[index] || []),
                                      draggedProduct,
                                    ];

                                    return copy;
                                  });

                                  setDraggedProduct(null);
                                }}
                              >
                                {/* ITEM NUMBER */}
                                <td className="border px-2 py-1 font-medium">
                                  {formData.spf_number
                                    ? `${formData.spf_number}-${String(
                                        index + 1,
                                      ).padStart(3, "0")}`
                                    : "-"}
                                </td>

                                {/* IMAGE */}
                                <td className="border px-2 py-1">
                                  {formData.item_photo?.[index] ? (
                                    <img
                                      src={formData.item_photo[index]}
                                      alt={desc}
                                      className="w-50 h-50 object-contain"
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </td>

                                {/* ITEM CODE */}
                                <td className="border px-2 py-1">
                                  {formData.item_code?.[index] || "-"}
                                </td>

                                {/* DESCRIPTION */}
                                <td
                                  className="border px-2 py-1 whitespace-pre-wrap"
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

                                    updatedDescriptions[index] =
                                      newLines.join(" | ");

                                    setFormData({
                                      ...formData,
                                      item_description: updatedDescriptions,
                                    });
                                  }}
                                >
                                  {desc.replace(/\|/g, "\n")}
                                </td>

                                {/* PRODUCT OFFER */}
                                <td className="border px-2 py-1">
                                  {(productOffers[index] || []).map(
                                    (prod: any, i: number) => (
                                      <div
                                        key={i}
                                        draggable
                                        /* CTRL + F: PRODUCT OFFER DRAG START */
                                        onDragStart={() => {
                                          setDraggedProduct({
                                            ...prod,
                                            __fromRow: index,
                                            __fromIndex: i,
                                          });

                                          setShowTrash(true);
                                        }}
                                        /* CTRL + F: PRODUCT OFFER DRAG END */
                                        onDragEnd={() => {
                                          setDraggedProduct(null);
                                          setShowTrash(false);
                                        }}
                                        className="border rounded p-2 mb-2 text-xs cursor-grab"
                                      >
                                        {/* Supplier Brand */}
                                        {prod.supplier?.supplierBrand && (
                                          <p>
                                            <b>Supplier Brand:</b>{" "}
                                            {prod.supplier.supplierBrand}
                                          </p>
                                        )}

                                        {/* Commercial Details */}
                                        {prod.commercialDetails && (
                                          <div className="mt-1">
                                            <b>Commercial Details</b>

                                            <ul className="ml-3 list-disc">
                                              {prod.commercialDetails
                                                .unitCost && (
                                                <li>
                                                  Unit Cost:{" "}
                                                  {
                                                    prod.commercialDetails
                                                      .unitCost
                                                  }
                                                </li>
                                              )}

                                              {prod.commercialDetails
                                                .factoryAddress && (
                                                <li>
                                                  Factory:{" "}
                                                  {
                                                    prod.commercialDetails
                                                      .factoryAddress
                                                  }
                                                </li>
                                              )}

                                              {prod.commercialDetails
                                                .portOfDischarge && (
                                                <li>
                                                  Port:{" "}
                                                  {
                                                    prod.commercialDetails
                                                      .portOfDischarge
                                                  }
                                                </li>
                                              )}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Technical Specifications */}
                                        {prod.technicalSpecifications?.length >
                                          0 && (
                                          <div className="mt-1">
                                            <b>Technical Specifications</b>

                                            {prod.technicalSpecifications.map(
                                              (group: any, g: number) => (
                                                <div key={g}>
                                                  <p className="font-semibold">
                                                    {group.title}
                                                  </p>

                                                  <ul className="ml-3 list-disc">
                                                    {group.specs?.map(
                                                      (
                                                        spec: any,
                                                        s: number,
                                                      ) => (
                                                        <li key={s}>
                                                          {spec.specId}:{" "}
                                                          {spec.value || "-"}
                                                        </li>
                                                      ),
                                                    )}
                                                  </ul>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No items added yet.
                    </p>
                  )}
                </div>
              </Card>

              {/* RIGHT CARD: Products Section */}
              <div className="flex-1 max-h-[70vh] overflow-y-auto">
                <div className="columns-2 gap-3">
                  {filteredProducts.map((p) => (
                    <Card
                      key={p.id}
                      draggable
                      onDragStart={() => {
                        setDraggedProduct({
                          ...p,
                          __fromRow: undefined,
                        });
                        setShowTrash(true);
                      }}
                      className="flex flex-col p-2 border shadow hover:shadow-md break-inside-avoid mb-3 cursor-grab"
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
                        <p className="text-sm font-semibold line-clamp-2">
                          {p.productName}
                        </p>
                      </div>
                      {/* CTRL + F: PRODUCT ACCORDION DETAILS */}
                      <Accordion
                        type="single"
                        collapsible
                        className="mt-2 border rounded"
                      >
                        {/* COMMERCIAL DETAILS */}
                        <AccordionItem value="commercial">
                          <AccordionTrigger className="px-3 text-xs">
                            Commercial Details
                          </AccordionTrigger>

                          <AccordionContent className="px-3 pb-3 text-xs space-y-2">
                            {(() => {
                              const details = p.commercialDetails;

                              if (!details) return <p>-</p>;

                              const packaging = details.packaging || {};

                              return (
                                <>
                                  {details.factoryAddress && (
                                    <p>
                                      <span className="font-medium">
                                        Factory:
                                      </span>{" "}
                                      {details.factoryAddress}
                                    </p>
                                  )}

                                  {details.portOfDischarge && (
                                    <p>
                                      <span className="font-medium">Port:</span>{" "}
                                      {details.portOfDischarge}
                                    </p>
                                  )}

                                  {details.unitCost && (
                                    <p>
                                      <span className="font-medium">
                                        Unit Cost:
                                      </span>{" "}
                                      {details.unitCost}
                                    </p>
                                  )}

                                  {(packaging.height ||
                                    packaging.length ||
                                    packaging.width ||
                                    details.pcsPerCarton) && (
                                    <div>
                                      <p className="font-medium">Packaging</p>

                                      <ul className="ml-3 list-disc">
                                        {packaging.height && (
                                          <li>Height: {packaging.height}</li>
                                        )}

                                        {packaging.length && (
                                          <li>Length: {packaging.length}</li>
                                        )}

                                        {packaging.width && (
                                          <li>Width: {packaging.width}</li>
                                        )}

                                        {details.pcsPerCarton && (
                                          <li>
                                            PCS/Carton: {details.pcsPerCarton}
                                          </li>
                                        )}
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
                          <AccordionTrigger className="px-3 text-xs">
                            Technical Specifications
                          </AccordionTrigger>

                          <AccordionContent className="px-3 pb-3 text-xs space-y-2">
                            {p.technicalSpecifications?.length ? (
                              p.technicalSpecifications
                                .filter(
                                  (g: any) => g.title !== "COMMERCIAL DETAILS",
                                )
                                .map((group: any, i: number) => (
                                  <div key={i} className="mb-3">
                                    <p className="font-semibold">
                                      {group.title}
                                    </p>

                                    <ul className="ml-3 list-disc">
                                      {group.specs?.map(
                                        (spec: any, s: number) => (
                                          <li key={s}>
                                            <span className="font-medium">
                                              {spec.specId}
                                            </span>{" "}
                                            : {spec.value || "-"}
                                          </li>
                                        ),
                                      )}
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

              {openFilter && (
                <div className="w-[320px] shrink-0 self-start sticky top-0 max-h-[calc(80vh-200px)] overflow-y-auto border-l pl-2">
                  <FilteringComponent
                    products={products}
                    onFilter={(filtered) => setFilteredProducts(filtered)}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none p-6"
                onClick={() => setOpenDialog(false)}
              >
                Cancel
              </Button>
              <Button className="rounded-none p-6" onClick={handleSubmit}>
                Submit
              </Button>


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
