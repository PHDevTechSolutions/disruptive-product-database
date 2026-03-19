"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/utils/supabase";

type SPFViewProps = {
  spfNumber: string;
};

type SPFData = {
  spf_number: string;
  status?: string;
  supplier_brand: string;
  product_offer_image: string;
  product_offer_qty: string;
  product_offer_technical_specification: string;
  product_offer_unit_cost: string;
  product_offer_packaging_details: string;
  product_offer_factory_address: string;
  product_offer_port_of_discharge: string;
  product_offer_subtotal: string;
};

type SPFRequestData = {
  item_description: string;
  item_photo: string;
};

/* ─────────────────────────────────────────────
   TECH-SPEC PARSER
   Saved format (per product, separated by " || "):
     "LAMP DETAILS~~CCT: 3000K, Wattage: 7W@@ELECTRICAL SPECIFICATION~~Voltage: 220V"
   Legacy flat format (no "~~"):
     "CCT: 3000K, Wattage: 7W | Voltage: 220V"
───────────────────────────────────────────── */
type SpecGroup = { title: string; specs: string[] };

function parseTechSpec(raw: string): SpecGroup[] {
  if (!raw || raw === "-") return [];

  // New format: groups separated by "@@", title~~specs
  if (raw.includes("~~")) {
    return raw.split("@@").map((chunk) => {
      const [title, rest] = chunk.split("~~");
      const specs = (rest || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      return { title: title.trim(), specs };
    });
  }

  // Legacy flat format: just pipe-separated key:value pairs, no titles
  const specs = raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  return specs.length ? [{ title: "", specs }] : [];
}

export default function SPFRequestView({ spfNumber }: SPFViewProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<SPFData | null>(null);
  const [requestData, setRequestData] = useState<SPFRequestData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSPF = async () => {
    try {
      setLoading(true);

      const { data: creation, error } = await supabase
        .from("spf_creation")
        .select("*")
        .eq("spf_number", spfNumber)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      setData(creation);

      const { data: request } = await supabase
        .from("spf_request")
        .select("item_description,item_photo")
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

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("spf_creation")
        .select("status")
        .eq("spf_number", spfNumber)
        .maybeSingle();

      if (data) {
        setData((prev: any) => ({ ...prev, status: data.status }));
      }
    };
    fetchStatus();
  }, [spfNumber]);

  /* ── helpers ── */
  const split = (value?: string) => {
    if (!value) return [];
    return value.split(",");
  };

  // Tech specs are separated by " || " (one entry per product)
  const splitSpecs = (value?: string): SpecGroup[][] => {
    if (!value) return [];
    return value.split(" || ").map(parseTechSpec);
  };

  const supplierBrands = split(data?.supplier_brand);
  const images = split(data?.product_offer_image);
  const qtys = split(data?.product_offer_qty);
  const unitCosts = split(data?.product_offer_unit_cost);
  const packaging = split(data?.product_offer_packaging_details);
  const factories = split(data?.product_offer_factory_address);
  const ports = split(data?.product_offer_port_of_discharge);
  const subtotals = split(data?.product_offer_subtotal);
  const specsPerProduct = splitSpecs(
    data?.product_offer_technical_specification
  );

  const itemDescriptions = split(requestData?.item_description);
  const itemImages = split(requestData?.item_photo);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="rounded-none p-6"
          onClick={() => setOpen(true)}
        >
          View
        </Button>

        {data?.status && (
          <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 uppercase">
            {data.status}
          </span>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] overflow-y-auto rounded-none">
          <DialogHeader className="space-y-2">
            <DialogTitle>SPF Request View</DialogTitle>

            {data?.status && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Status:</span>
                <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 uppercase">
                  {data.status}
                </span>
              </div>
            )}
          </DialogHeader>

          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!loading && data && (
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
                  {itemDescriptions.map((desc, index) => (
                    <tr key={index} className="align-top">
                      {/* SPF NUMBER */}
                      <td className="border px-3 py-2 text-center align-middle whitespace-nowrap font-medium">
                        {spfNumber}-{String(index + 1).padStart(3, "0")}
                      </td>

                      {/* ITEM IMAGE */}
                      <td className="border px-3 py-2 text-center align-middle">
                        {itemImages[index] ? (
                          <img
                            src={itemImages[index]}
                            className="w-24 h-24 object-contain mx-auto"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="border px-3 py-2 whitespace-pre-wrap align-middle text-sm leading-relaxed">
                        {desc.replace(/\|/g, "\n")}
                      </td>

                      {/* PRODUCT OFFERS */}
                      <td className="border px-2 py-2">
                        <table className="w-full border text-xs">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Supplier Brand
                              </th>
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Image
                              </th>
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Qty
                              </th>
                              <th className="border px-2 py-1 text-center min-w-[200px]">
                                Technical Specs
                              </th>
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Unit Cost
                              </th>
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Packaging
                              </th>
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Factory
                              </th>
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Port
                              </th>
                              <th className="border px-2 py-1 text-center whitespace-nowrap">
                                Subtotal
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {images.map((img, i) => {
                              const groups = specsPerProduct[i] ?? [];

                              return (
                                <tr key={i} className="align-top">
                                  {/* SUPPLIER BRAND */}
                                  <td className="border px-2 py-2 text-center align-middle font-medium">
                                    {supplierBrands[i] || "-"}
                                  </td>

                                  {/* PRODUCT IMAGE */}
                                  <td className="border px-2 py-2 text-center align-middle">
                                    {img && img !== "-" ? (
                                      <img
                                        src={img}
                                        className="w-16 h-16 object-contain mx-auto"
                                      />
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>

                                  {/* QTY */}
                                  <td className="border px-2 py-2 text-center align-middle">
                                    {qtys[i] || "-"}
                                  </td>

                                  {/* TECHNICAL SPECS — grouped with bold titles */}
                                  <td className="border px-2 py-2 align-top">
                                    {groups.length === 0 ? (
                                      <span className="text-muted-foreground">-</span>
                                    ) : (
                                      <div className="space-y-2">
                                        {groups.map((group, gi) => (
                                          <div key={gi}>
                                            {group.title && (
                                              <p className="font-bold text-[11px] uppercase tracking-wide text-gray-700 mb-0.5">
                                                {group.title}
                                              </p>
                                            )}
                                            <div className="space-y-0.5">
                                              {group.specs.map((spec, si) => (
                                                <p key={si} className="text-[11px] text-gray-600 leading-tight">
                                                  {spec}
                                                </p>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>

                                  {/* UNIT COST */}
                                  <td className="border px-2 py-2 text-center align-middle">
                                    {unitCosts[i] || "-"}
                                  </td>

                                  {/* PACKAGING */}
                                  <td className="border px-2 py-2 text-center align-middle">
                                    {packaging[i] || "-"}
                                  </td>

                                  {/* FACTORY */}
                                  <td className="border px-2 py-2 text-center align-middle">
                                    {factories[i] || "-"}
                                  </td>

                                  {/* PORT */}
                                  <td className="border px-2 py-2 text-center align-middle">
                                    {ports[i] || "-"}
                                  </td>

                                  {/* SUBTOTAL */}
                                  <td className="border px-2 py-2 text-center align-middle font-semibold">
                                    ₱{Number(subtotals[i] || 0).toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {!loading && !data && (
            <p className="text-sm text-muted-foreground">No SPF creation found.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
