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
import { ChevronDown } from "lucide-react";
import AddProductComponent from "@/components/add-product-component";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  });

  const [openCompanyDetails, setOpenCompanyDetails] = useState(true);
  const [openSPFDetails, setOpenSPFDetails] = useState(true);

  // Products for the selected SPF request
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [openAddProduct, setOpenAddProduct] = useState(false);

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
    setFormData({ ...rowData, prepared_by: processBy, process_by: processBy });
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

  // Fetch products from Firebase for a given customer
  const fetchProducts = useCallback((customerName: string) => {
    setLoadingProducts(true);
    const q = query(collection(db, "products"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      setProducts(list);
      setLoadingProducts(false);
    });
    return unsubscribe;
  }, []);

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
                    size="sm"
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
          <DialogContent className="sm:max-w-7xl rounded-none p-6">
<DialogHeader className="flex items-center w-full">
  <DialogTitle>Create SPF Request</DialogTitle>

  <div className="ml-auto mr-2">
    <Button size="sm" onClick={() => setOpenAddProduct(true)}>
      + Add Product
    </Button>
  </div>
</DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* ---------------- LEFT CARD ---------------- */}
                  <Card className="p-2 border rounded">
                    <button
                      type="button"
                      className="flex items-center justify-between w-full font-semibold text-sm cursor-pointer"
                      onClick={() => setOpenCompanyDetails((prev) => !prev)}
                    >
                      Company Details
                      <ChevronDown
                        className={`transition-transform duration-200 ${openCompanyDetails ? "rotate-180" : ""}`}
                        size={16}
                      />
                    </button>
                    {openCompanyDetails && (
                      <div className="mt-2 space-y-2">
                        {[
                          {
                            label: "Customer Name",
                            value: formData.customer_name,
                          },
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
                        ].map((field) => (
                          <div
                            key={field.label}
                            className="flex flex-wrap gap-2"
                          >
                            <span className="font-semibold text-sm">
                              {field.label}:
                            </span>
                            <span
                              className={`text-gray-700 text-sm capitalize ${field.pre ? "whitespace-pre-line" : ""}`}
                            >
                              {field.value || "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* ---------------- RIGHT CARD ---------------- */}
                  <Card className="p-2 border rounded">
                    <button
                      type="button"
                      className="flex items-center justify-between w-full font-semibold text-sm cursor-pointer"
                      onClick={() => setOpenSPFDetails((prev) => !prev)}
                    >
                      SPF Details
                      <ChevronDown
                        className={`transition-transform duration-200 ${openSPFDetails ? "rotate-180" : ""}`}
                        size={16}
                      />
                    </button>
                    {openSPFDetails && (
                      <div className="mt-2 space-y-2">
                        {[
                          {
                            label: "Payment Terms",
                            value: formData.payment_terms,
                          },
                          { label: "Warranty", value: formData.warranty },
                          {
                            label: "Delivery Date",
                            value: formData.delivery_date,
                          },
                          { label: "Prepared By", value: formData.prepared_by },
                          { label: "Process By", value: formData.process_by },
                          { label: "Approved By", value: formData.approved_by },
                          {
                            label: "Special Instructions",
                            value: formData.special_instructions,
                            pre: true,
                          },
                        ].map((field) => (
                          <div
                            key={field.label}
                            className="flex flex-wrap gap-2"
                          >
                            <span className="font-semibold text-sm">
                              {field.label}:
                            </span>
                            <span
                              className={`text-gray-700 text-sm ${field.pre ? "whitespace-pre-line" : ""}`}
                            >
                              {field.value || "-"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </Card>

              <Card className="p-2 border rounded max-h-[700px] overflow-y-auto">
                {loadingProducts ? (
                  <p className="text-sm text-muted-foreground">
                    Loading products...
                  </p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No products found.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 auto-rows-auto grid-flow-row-dense">
                    {products.map((p) => (
                      <Card
                        key={p.id}
                        className="flex flex-col p-2 border shadow hover:shadow-md"
                      >
                        <div className="h-[100px] w-full bg-gray-100 flex items-center justify-center overflow-hidden rounded">
                          {p.mainImage?.url ? (
                            <img
                              src={p.mainImage.url}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-xs text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>

                        <div className="mt-2 flex-1">
                          <p className="text-sm font-semibold line-clamp-2">
                            {p.productName}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {p.supplier?.supplierBrand || "-"}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <DialogFooter className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Submit</Button>
            </DialogFooter>
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
                    onClick={() => setOpenAddProduct(false)}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
