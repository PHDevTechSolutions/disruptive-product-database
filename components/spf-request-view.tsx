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
  company_name?: string;
  contact_name?: string;
  contact_number?: string;
  proj_lead_time?: string;
  final_selling_cost?: string;
};

type SPFRequestData = {
  item_description: string;
  item_photo: string;
};

/* ─────────────────────────────────────────────────────────────────
   DELIMITERS
     |ROW|   → boundary between item rows
     ,        → boundary between products within a row
     ||       → boundary between products' tech spec strings
     @@       → boundary between spec groups within one product
     ~~       → title ↔ spec rows within a group
     ;;       → individual spec rows within a group
───────────────────────────────────────────────────────────────── */
const ROW_SEP = "|ROW|";

type SpecGroup = { title: string; specs: string[] };

function parseTechSpec(raw: string): SpecGroup[] {
  if (!raw || raw === "-") return [];

  if (raw.includes("~~")) {
    return raw.split("@@").map((chunk) => {
      const [titlePart, rest = ""] = chunk.split("~~");
      const specs = rest.split(";;").map((s) => s.trim()).filter(Boolean);
      return { title: titlePart.trim(), specs };
    });
  }

  // Legacy flat format
  const specs = raw.split(" | ").map((s) => s.trim()).filter(Boolean);
  return specs.length ? [{ title: "", specs }] : [];
}

function splitByRow(value: string | undefined): string[][] {
  if (!value) return [];
  return value.split(ROW_SEP).map((rowStr) =>
    rowStr.split(",").map((v) => v.trim())
  );
}

function splitSpecsByRow(value: string | undefined): SpecGroup[][][] {
  if (!value) return [];
  return value.split(ROW_SEP).map((rowStr) =>
    rowStr.split(" || ").map(parseTechSpec)
  );
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

      if (error) { console.error(error); return; }
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

  useEffect(() => { if (open) fetchSPF(); }, [open]);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase
        .from("spf_creation")
        .select("status")
        .eq("spf_number", spfNumber)
        .maybeSingle();
      if (data) setData((prev: any) => ({ ...prev, status: data.status }));
    };
    fetchStatus();
  }, [spfNumber]);

  const isApproved = data?.status === "Approved By Procurement";

  /* ── Parse all columns into per-row, per-product arrays ── */
  const rowImages         = splitByRow(data?.product_offer_image);
  const rowQtys           = splitByRow(data?.product_offer_qty);
  const rowUnitCosts      = splitByRow(data?.product_offer_unit_cost);
  const rowPackaging      = splitByRow(data?.product_offer_packaging_details);
  const rowFactories      = splitByRow(data?.product_offer_factory_address);
  const rowPorts          = splitByRow(data?.product_offer_port_of_discharge);
  const rowSubtotals      = splitByRow(data?.product_offer_subtotal);
  const rowSupplierBrands = splitByRow(data?.supplier_brand);
  const rowSpecs          = splitSpecsByRow(data?.product_offer_technical_specification);

  /* ── Approved-only columns ── */
  const rowCompanyNames   = splitByRow(data?.company_name);
  const rowContactNames   = splitByRow(data?.contact_name);
  const rowContactNumbers = splitByRow(data?.contact_number);
  const rowLeadTimes      = splitByRow(data?.proj_lead_time);
  const rowSellingCosts   = splitByRow(data?.final_selling_cost);

  const itemDescriptions = (requestData?.item_description || "").split(",").map((s) => s.trim());
  const itemImages       = (requestData?.item_photo || "").split(",").map((s) => s.trim());

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="rounded-none p-6" onClick={() => setOpen(true)}>
          View
        </Button>

        {data?.status && (
          <span className={`text-xs px-2 py-1 rounded uppercase ${
            isApproved
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}>
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
                <span className={`px-2 py-1 text-xs rounded uppercase ${
                  isApproved
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
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
                  {itemDescriptions.map((desc, rowIndex) => {
                    const prodImages        = rowImages[rowIndex]         ?? [];
                    const prodQtys          = rowQtys[rowIndex]           ?? [];
                    const prodUnitCosts     = rowUnitCosts[rowIndex]      ?? [];
                    const prodPackaging     = rowPackaging[rowIndex]      ?? [];
                    const prodFactories     = rowFactories[rowIndex]      ?? [];
                    const prodPorts         = rowPorts[rowIndex]          ?? [];
                    const prodSubtotals     = rowSubtotals[rowIndex]      ?? [];
                    const prodBrands        = rowSupplierBrands[rowIndex] ?? [];
                    const prodSpecs         = rowSpecs[rowIndex]          ?? [];

                    /* Approved-only */
                    const prodCompanyNames   = rowCompanyNames[rowIndex]   ?? [];
                    const prodContactNames   = rowContactNames[rowIndex]   ?? [];
                    const prodContactNumbers = rowContactNumbers[rowIndex] ?? [];
                    const prodLeadTimes      = rowLeadTimes[rowIndex]      ?? [];
                    const prodSellingCosts   = rowSellingCosts[rowIndex]   ?? [];

                    const hasProducts = prodImages.length > 0 && !(prodImages.length === 1 && prodImages[0] === "");

                    return (
                      <tr key={rowIndex} className="align-top">

                        {/* SPF NUMBER */}
                        <td className="border px-3 py-2 text-center align-top pt-3 whitespace-nowrap font-medium">
                          {spfNumber}-{String(rowIndex + 1).padStart(3, "0")}
                        </td>

                        {/* ITEM IMAGE */}
                        <td className="border px-3 py-2 text-center align-top pt-3">
                          {itemImages[rowIndex] ? (
                            <img src={itemImages[rowIndex]} className="w-24 h-24 object-contain mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>

                        {/* DESCRIPTION */}
                        <td className="border px-3 py-2 whitespace-pre-wrap align-top pt-3 text-sm leading-relaxed">
                          {desc.replace(/\|/g, "\n")}
                        </td>

                        {/* PRODUCT OFFERS */}
                        <td className="border px-2 py-2 align-top">
                          {!hasProducts ? (
                            <span className="text-xs text-muted-foreground">No products added</span>
                          ) : (
                            <div className="space-y-3">
                              {prodImages.map((img, i) => {
                                const groups = prodSpecs[i] ?? [];
                                const hasMultiple = prodImages.length > 1;

                                return (
                                  <div key={i}>
                                    {/* OPTION LABEL — only shown when 2+ products */}
                                    {hasMultiple && (
                                      <div className="mb-1">
                                        <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                          Option {i + 1} · {prodBrands[i] || "No brand"}
                                        </span>
                                      </div>
                                    )}

                                    {/* PRODUCT ROW TABLE */}
                                    <div className="border rounded overflow-hidden">
                                      <table className="w-full border text-xs">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Supplier Brand</th>
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Image</th>
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Qty</th>
                                            <th className="border px-2 py-1 text-center min-w-[200px]">Technical Specs</th>
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Unit Cost</th>
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Packaging</th>
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Factory</th>
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Port</th>
                                            <th className="border px-2 py-1 text-center whitespace-nowrap">Subtotal</th>
                                            {/* ── APPROVED-ONLY COLUMNS ── */}
                                            {isApproved && (
                                              <>
                                                <th className="border px-2 py-1 text-center whitespace-nowrap">Company</th>
                                                <th className="border px-2 py-1 text-center whitespace-nowrap">Contact Name</th>
                                                <th className="border px-2 py-1 text-center whitespace-nowrap">Contact No.</th>
                                                <th className="border px-2 py-1 text-center whitespace-nowrap bg-green-50 text-green-700">Lead Time</th>
                                                <th className="border px-2 py-1 text-center whitespace-nowrap bg-green-50 text-green-700">Selling Cost</th>
                                              </>
                                            )}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr className="align-top">

                                            {/* SUPPLIER BRAND */}
                                            <td className="border px-2 py-2 text-center align-middle font-medium">
                                              {prodBrands[i] || "-"}
                                            </td>

                                            {/* PRODUCT IMAGE */}
                                            <td className="border px-2 py-2 text-center align-middle">
                                              {img && img !== "-" ? (
                                                <img src={img} className="w-16 h-16 object-contain mx-auto" />
                                              ) : (
                                                <span className="text-muted-foreground">-</span>
                                              )}
                                            </td>

                                            {/* QTY */}
                                            <td className="border px-2 py-2 text-center align-middle">
                                              {prodQtys[i] || "-"}
                                            </td>

                                            {/* TECHNICAL SPECS */}
                                            <td className="border px-2 py-2 align-top">
                                              {groups.length === 0 ? (
                                                <span className="text-muted-foreground">-</span>
                                              ) : (
                                                <div className="space-y-2">
                                                  {groups.map((group, gi) => (
                                                    <div key={gi}>
                                                      {group.title && (
                                                        <p className="font-bold text-[11px] uppercase tracking-wide text-gray-800 mb-0.5">
                                                          {group.title}
                                                        </p>
                                                      )}
                                                      <div className="space-y-0.5">
                                                        {group.specs.map((spec, si) => (
                                                          <p key={si} className="text-[11px] text-gray-600 leading-snug">
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
                                              {prodUnitCosts[i] || "-"}
                                            </td>

                                            {/* PACKAGING */}
                                            <td className="border px-2 py-2 text-center align-middle">
                                              {prodPackaging[i] || "-"}
                                            </td>

                                            {/* FACTORY */}
                                            <td className="border px-2 py-2 text-center align-middle">
                                              {prodFactories[i] || "-"}
                                            </td>

                                            {/* PORT */}
                                            <td className="border px-2 py-2 text-center align-middle">
                                              {prodPorts[i] || "-"}
                                            </td>

                                            {/* SUBTOTAL */}
                                            <td className="border px-2 py-2 text-center align-middle font-semibold">
                                              ₱{Number(prodSubtotals[i] || 0).toLocaleString()}
                                            </td>

                                            {/* ── APPROVED-ONLY CELLS ── */}
                                            {isApproved && (
                                              <>
                                                <td className="border px-2 py-2 text-center align-middle">
                                                  {prodCompanyNames[i] || "-"}
                                                </td>
                                                <td className="border px-2 py-2 text-center align-middle">
                                                  {prodContactNames[i] || "-"}
                                                </td>
                                                <td className="border px-2 py-2 text-center align-middle">
                                                  {prodContactNumbers[i] || "-"}
                                                </td>
                                                <td className="border px-2 py-2 text-center align-middle bg-green-50">
                                                  {prodLeadTimes[i] && prodLeadTimes[i] !== "-"
                                                    ? prodLeadTimes[i]
                                                    : "-"}
                                                </td>
                                                <td className="border px-2 py-2 text-center align-middle bg-green-50 font-semibold">
                                                  {prodSellingCosts[i] && prodSellingCosts[i] !== "-"
                                                    ? `₱${Number(prodSellingCosts[i]).toLocaleString()}`
                                                    : "-"}
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
          )}

          {!loading && !data && (
            <p className="text-sm text-muted-foreground">No SPF creation found.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
