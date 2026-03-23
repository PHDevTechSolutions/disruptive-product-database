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

  const rowImages         = splitByRow(data?.product_offer_image);
  const rowQtys           = splitByRow(data?.product_offer_qty);
  const rowUnitCosts      = splitByRow(data?.product_offer_unit_cost);
  const rowPackaging      = splitByRow(data?.product_offer_packaging_details);
  const rowFactories      = splitByRow(data?.product_offer_factory_address);
  const rowPorts          = splitByRow(data?.product_offer_port_of_discharge);
  const rowSubtotals      = splitByRow(data?.product_offer_subtotal);
  const rowSupplierBrands = splitByRow(data?.supplier_brand);
  const rowSpecs          = splitSpecsByRow(data?.product_offer_technical_specification);
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
        <Button
          variant="outline"
          className="rounded-none px-3 py-2 md:p-6 text-sm h-9 md:h-auto"
          onClick={() => setOpen(true)}
        >
          View
        </Button>
        {data?.status && (
          <span className={`text-xs px-2 py-1 rounded uppercase ${
            isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}>
            {data.status}
          </span>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[100vw] max-w-[100vw] md:max-w-7xl max-h-[100dvh] md:max-h-[90vh] overflow-y-auto rounded-none p-3 md:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-base md:text-lg">SPF Request View</DialogTitle>
            {data?.status && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Status:</span>
                <span className={`px-2 py-1 text-xs rounded uppercase ${
                  isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {data.status}
                </span>
              </div>
            )}
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          )}

          {!loading && data && (
            <div className="space-y-4">
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
                const prodCompanyNames  = rowCompanyNames[rowIndex]   ?? [];
                const prodContactNames  = rowContactNames[rowIndex]   ?? [];
                const prodContactNumbers = rowContactNumbers[rowIndex] ?? [];
                const prodLeadTimes     = rowLeadTimes[rowIndex]      ?? [];
                const prodSellingCosts  = rowSellingCosts[rowIndex]   ?? [];

                const hasProducts = prodImages.length > 0 && !(prodImages.length === 1 && prodImages[0] === "");

                return (
                  <Card key={rowIndex} className="p-3 md:p-4">
                    {/* ── Row Header ── */}
                    <div className="flex items-start gap-3 mb-3 pb-3 border-b">
                      {/* Item image */}
                      <div className="shrink-0">
                        {itemImages[rowIndex] ? (
                          <img
                            src={itemImages[rowIndex]}
                            className="w-14 h-14 md:w-20 md:h-20 object-contain rounded border"
                          />
                        ) : (
                          <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">
                            No img
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          {spfNumber}-{String(rowIndex + 1).padStart(3, "0")}
                        </p>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {desc.replace(/\|/g, "\n")}
                        </p>
                      </div>
                    </div>

                    {/* ── Product Offers ── */}
                    {!hasProducts ? (
                      <p className="text-xs text-muted-foreground">No products added</p>
                    ) : (
                      <div className="space-y-3">
                        {prodImages.map((img, i) => {
                          const groups = prodSpecs[i] ?? [];
                          const hasMultiple = prodImages.length > 1;

                          return (
                            <div key={i}>
                              {hasMultiple && (
                                <div className="mb-2">
                                  <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    Option {i + 1} · {prodBrands[i] || "No brand"}
                                  </span>
                                </div>
                              )}

                              {/* ── Mobile: stacked card layout ── */}
                              <div className="md:hidden border rounded p-3 space-y-2 text-xs">
                                <div className="flex items-start gap-3">
                                  {img && img !== "-" ? (
                                    <img src={img} className="w-16 h-16 object-contain shrink-0 rounded" />
                                  ) : (
                                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 shrink-0">-</div>
                                  )}
                                  <div className="flex-1 space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Supplier</span>
                                      <span className="font-medium">{prodBrands[i] || "-"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Qty</span>
                                      <span>{prodQtys[i] || "-"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Unit Cost</span>
                                      <span>{prodUnitCosts[i] || "-"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Subtotal</span>
                                      <span className="font-semibold">₱{Number(prodSubtotals[i] || 0).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Technical specs (collapsible feel via details) */}
                                {groups.length > 0 && (
                                  <details className="border rounded">
                                    <summary className="px-2 py-1 cursor-pointer text-xs font-medium">
                                      Technical Specs
                                    </summary>
                                    <div className="px-2 pb-2 space-y-2 text-xs">
                                      {groups.map((group, gi) => (
                                        <div key={gi}>
                                          {group.title && <p className="font-bold uppercase tracking-wide text-gray-800 mt-1">{group.title}</p>}
                                          {group.specs.map((spec, si) => (
                                            <p key={si} className="text-gray-600 leading-snug">{spec}</p>
                                          ))}
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )}

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  <div>
                                    <span className="text-muted-foreground">Packaging</span>
                                    <p>{prodPackaging[i] || "-"}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Port</span>
                                    <p>{prodPorts[i] || "-"}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <span className="text-muted-foreground">Factory</span>
                                    <p>{prodFactories[i] || "-"}</p>
                                  </div>
                                </div>

                                {isApproved && (
                                  <div className="bg-green-50 rounded p-2 space-y-1">
                                    <p className="font-semibold text-green-700 text-xs">Procurement Details</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                      <div>
                                        <span className="text-muted-foreground">Company</span>
                                        <p>{prodCompanyNames[i] || "-"}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Contact</span>
                                        <p>{prodContactNames[i] || "-"}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Contact No.</span>
                                        <p>{prodContactNumbers[i] || "-"}</p>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Lead Time</span>
                                        <p>{prodLeadTimes[i] || "-"}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-muted-foreground">Selling Cost</span>
                                        <p className="font-semibold text-green-700">
                                          {prodSellingCosts[i] && prodSellingCosts[i] !== "-"
                                            ? `₱${Number(prodSellingCosts[i]).toLocaleString()}`
                                            : "-"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* ── Desktop: table layout ── */}
                              <div className="hidden md:block border rounded overflow-x-auto">
                                <table className="w-full border text-xs min-w-[600px]">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="border px-2 py-1 text-center whitespace-nowrap">Supplier Brand</th>
                                      <th className="border px-2 py-1 text-center whitespace-nowrap">Image</th>
                                      <th className="border px-2 py-1 text-center whitespace-nowrap">Qty</th>
                                      <th className="border px-2 py-1 text-center min-w-[180px]">Technical Specs</th>
                                      <th className="border px-2 py-1 text-center whitespace-nowrap">Unit Cost</th>
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
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="align-top">
                                      <td className="border px-2 py-2 text-center align-middle font-medium">{prodBrands[i] || "-"}</td>
                                      <td className="border px-2 py-2 text-center align-middle">
                                        {img && img !== "-" ? (
                                          <img src={img} className="w-16 h-16 object-contain mx-auto" />
                                        ) : <span className="text-muted-foreground">-</span>}
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
                                                  <p className="font-bold text-[11px] uppercase tracking-wide text-gray-800 mb-0.5">
                                                    {group.title}
                                                  </p>
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
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && !data && (
            <p className="text-sm text-muted-foreground text-center py-6">No SPF creation found.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
