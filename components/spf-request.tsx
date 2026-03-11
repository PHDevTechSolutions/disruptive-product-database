"use client"; //test

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
import { ChevronDown, Funnel } from "lucide-react";
import FilteringComponent from "@/components/filtering-component-v2";
import AddProductComponent from "@/components/add-product-component";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

import CardDetails from "@/components/spf/dialog/card-details";

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
  item_description?: string;
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

  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // Products for the selected SPF request
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [openAddProduct, setOpenAddProduct] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products);
      return;
    }

    const term = searchTerm.toLowerCase();

    const filtered = products.filter(
      (p: any) =>
        p.productName?.toLowerCase().includes(term) ||
        p.supplier?.supplierBrand?.toLowerCase().includes(term),
    );

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

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
          <DialogContent className="sm:max-w-8xl rounded-none p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex items-center w-full mb-4">
              <DialogTitle>Create SPF Request</DialogTitle>
              <div className="ml-auto flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Search product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border px-3 py-2 text-sm w-[220px] rounded-none"
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

            {/* OUTER FLEX CONTAINER */}
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
                <div className="mt-4 overflow-y-auto">
                  {selectedProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No products added yet.
                    </p>
                  ) : (
                    <table className="w-full table-auto border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-2 py-1">Image</th>
                          <th className="border px-2 py-1">Product Name</th>
                          <th className="border px-2 py-1">Supplier Brand</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProducts.map((p) => (
                          <tr key={p.id}>
                            <td className="border px-2 py-1">
                              {p.mainImage?.url ? (
                                <img
                                  src={p.mainImage.url}
                                  className="w-16 h-16 object-contain"
                                />
                              ) : (
                                <span className="text-xs text-gray-400">
                                  No Image
                                </span>
                              )}
                            </td>
                            <td className="border px-2 py-1">
                              {p.productName}
                            </td>
                            <td className="border px-2 py-1">
                              {p.supplier?.supplierBrand || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>

              {/* RIGHT CARD: Products Section */}
              <div className="flex-1 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 auto-rows-auto">
                  {filteredProducts.map((p) => (
                    <Card
                      key={p.id}
                      className="flex flex-col p-2 border shadow hover:shadow-md"
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
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {p.supplier?.supplierBrand || "-"}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => {
                          if (!selectedProducts.find((sp) => sp.id === p.id)) {
                            setSelectedProducts((prev) => [...prev, p]);
                          }
                        }}
                      >
                        + Add
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>

              {/* FILTER SECTION */}
              {openFilter && (
                <div className="w-[320px] shrink-0 h-full overflow-y-auto">
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
      </CardContent>
    </Card>
  );
}
