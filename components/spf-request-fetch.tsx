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
import { ChevronDown, ChevronUp } from "lucide-react";

type SPFViewProps = {
  spfNumber: string;
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
};

type SPFRequestData = {
  item_description: string;
  item_photo: string;
  item_code?: string;
};

const ROW_SEP = "|ROW|";

type SpecGroup = { title: string; specs: string[] };

/* ─────────────────────────────────────────────────────────────── */
/* STATUS LABEL MAPPING                                            */
/* ─────────────────────────────────────────────────────────────── */
function getStatusLabel(status: string | undefined): string {
  if (status === "Pending For Procurement") return "For Procurement Costing";
  if (status === "Approved By Procurement") return "Ready For Quotation";
  return status ?? "";
}

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

/* ── Collapsible spec block for mobile ── */
function MobileSpecsBlock({ groups }: { groups: SpecGroup[] }) {
  const [open, setOpen] = useState(false);
  if (!groups.length) return <span className="text-xs text-muted-foreground">-</span>;
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

export default function SPFRequestFetch({ spfNumber }: SPFViewProps) {
  const [open, setOpen]               = useState(false);
  const [data, setData]               = useState<SPFData | null>(null);
  const [requestData, setRequestData] = useState<SPFRequestData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [isMobile, setIsMobile]       = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  /* ── Parse all columns ── */
  const rowImages         = splitByRow(data?.product_offer_image);
  const rowQtys           = splitByRow(data?.product_offer_qty);
  const rowUnitCosts      = splitByRow(data?.product_offer_unit_cost);
  const rowPackaging      = splitByRow(data?.product_offer_packaging_details);
  const rowFactories      = splitByRow(data?.product_offer_factory_address);
  const rowPorts          = splitByRow(data?.product_offer_port_of_discharge);
  const rowSubtotals      = splitByRow(data?.product_offer_subtotal);
  const rowSupplierBrands = splitByRow(data?.supplier_brand);
  const rowSpecs          = splitSpecsByRow(data?.product_offer_technical_specification);

  const rowCompanyNames     = splitByRow(data?.company_name);
  const rowContactNames     = splitByRow(data?.contact_name);
  const rowContactNumbers   = splitByRow(data?.contact_number);
  const rowLeadTimes        = splitByRow(data?.proj_lead_time);
  const rowSellingCosts     = splitByRow(data?.final_selling_cost);
  const rowFinalUnitCosts   = splitByRow(data?.final_unit_cost);   // ✅ NEW
  const rowFinalSubtotals   = splitByRow(data?.final_subtotal);    // ✅ NEW

  const rowItemCodes = splitByRow(data?.item_code);

  const itemDescriptions: string[] = (requestData?.item_description || "")
    .split(",")
    .map((s) => s.trim());
    const itemImages       = (requestData?.item_photo || "").split(",").map((s) => s.trim());

  /* ────────────────────────────────────────────────────────────────
     MOBILE CARD RENDERER
  ──────────────────────────────────────────────────────────────── */
  const renderMobile = () => (
    <div className="space-y-4 pb-4">
      {itemDescriptions.map((desc: string, rowIndex: number) => {
        const prodImages         = rowImages[rowIndex]         ?? [];
        const prodQtys           = rowQtys[rowIndex]           ?? [];
        const prodUnitCosts      = rowUnitCosts[rowIndex]      ?? [];
        const prodPackaging      = rowPackaging[rowIndex]      ?? [];
        const prodFactories      = rowFactories[rowIndex]      ?? [];
        const prodPorts          = rowPorts[rowIndex]          ?? [];
        const prodSubtotals      = rowSubtotals[rowIndex]      ?? [];
        const prodBrands         = rowSupplierBrands[rowIndex] ?? [];
        const prodSpecs          = rowSpecs[rowIndex]          ?? [];
        const prodCompanyNames     = rowCompanyNames[rowIndex]   ?? [];
        const prodContactNames     = rowContactNames[rowIndex]   ?? [];
        const prodContactNumbers   = rowContactNumbers[rowIndex] ?? [];
        const prodLeadTimes        = rowLeadTimes[rowIndex]      ?? [];
        const prodSellingCosts     = rowSellingCosts[rowIndex]   ?? [];
        const prodFinalUnitCosts   = rowFinalUnitCosts[rowIndex] ?? []; 
        const prodFinalSubtotals   = rowFinalSubtotals[rowIndex] ?? [];  
        const prodItemCodes        = rowItemCodes[rowIndex]      ?? [];

        const hasProducts = prodImages.length > 0 && !(prodImages.length === 1 && prodImages[0] === "");

        return (
          <div key={rowIndex} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
            {/* ── Row header ── */}
            <div className="bg-gray-50 border-b px-3 py-2 flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 shrink-0">
                {spfNumber}-{String(rowIndex + 1).padStart(3, "0")}
              </span>
              {itemImages[rowIndex] ? (
                <img
                  src={itemImages[rowIndex]}
                  className="w-10 h-10 object-contain rounded shrink-0"
                  alt=""
                />
              ) : null}
              <p className="text-xs font-medium text-gray-800 line-clamp-2 flex-1">
                {desc.replace(/\|/g, " · ")}
              </p>
            </div>

            {/* ── Product options ── */}
            {!hasProducts ? (
              <p className="text-xs text-muted-foreground px-3 py-3">No products added</p>
            ) : (
              <div className="divide-y">
                {prodImages.map((img, i) => {
                  const groups      = prodSpecs[i] ?? [];
                  const optItemCode = prodItemCodes[i] && prodItemCodes[i] !== "-"
                    ? prodItemCodes[i]
                    : null;

                  return (
                    <div key={i} className="px-3 py-3 space-y-2">
                      {/* Option badge + item code */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Option {i + 1}
                          {prodBrands[i] && prodBrands[i] !== "-" ? ` · ${prodBrands[i]}` : ""}
                        </span>
                        {optItemCode && (
                          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            {optItemCode}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-3 items-start">
                        {/* Product image */}
                        {img && img !== "-" ? (
                          <img
                            src={img}
                            className="w-16 h-16 object-contain rounded border shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded border shrink-0 flex items-center justify-center text-[10px] text-gray-400">
                            No img
                          </div>
                        )}

                        {/* Details grid */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <div>
                              <span className="text-gray-400 block">Qty</span>
                              <span className="font-medium">{prodQtys[i] || "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Unit Cost</span>
                              <span className="font-medium">{prodUnitCosts[i] || "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Subtotal</span>
                              <span className="font-semibold text-gray-900">
                                ₱{Number(prodSubtotals[i] || 0).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Packaging</span>
                              <span className="font-medium">{prodPackaging[i] || "-"}</span>
                            </div>
                          </div>

                          {(prodFactories[i] && prodFactories[i] !== "-") && (
                            <p className="text-[10px] text-gray-500 truncate">
                              <span className="text-gray-400">Factory: </span>{prodFactories[i]}
                            </p>
                          )}
                          {(prodPorts[i] && prodPorts[i] !== "-") && (
                            <p className="text-[10px] text-gray-500 truncate">
                              <span className="text-gray-400">Port: </span>{prodPorts[i]}
                            </p>
                          )}

                          <MobileSpecsBlock groups={groups} />
                        </div>
                      </div>

                      {/* Approved-only section */}
                      {isApproved && (
                        <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 space-y-1">
                          <p className="text-[10px] font-bold uppercase text-green-700 mb-1">Procurement Details</p>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            <div>
                              <span className="text-gray-400 block">Company</span>
                              <span className="font-medium">{prodCompanyNames[i] || "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Contact</span>
                              <span className="font-medium">{prodContactNames[i] || "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Contact No.</span>
                              <span className="font-medium">{prodContactNumbers[i] || "-"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block">Lead Time</span>
                              <span className="font-medium">{prodLeadTimes[i] && prodLeadTimes[i] !== "-" ? prodLeadTimes[i] : "-"}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-400 block">Selling Cost</span>
                              <span className="font-semibold text-green-700">
                                {prodSellingCosts[i] && prodSellingCosts[i] !== "-"
                                  ? `₱${Number(prodSellingCosts[i]).toLocaleString()}`
                                  : "-"}
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-400 block">Final Unit Cost</span>
                              <span className="font-semibold text-green-700">
                                {prodFinalUnitCosts[i] && prodFinalUnitCosts[i] !== "-"
                                  ? `₱${Number(prodFinalUnitCosts[i]).toLocaleString()}`
                                  : "-"}
                              </span>
                            </div>

                            <div>
                              <span className="text-gray-400 block">Final Subtotal</span>
                              <span className="font-semibold text-green-700">
                                {prodFinalSubtotals[i] && prodFinalSubtotals[i] !== "-"
                                  ? `₱${Number(prodFinalSubtotals[i]).toLocaleString()}`
                                  : "-"}
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

  /* ────────────────────────────────────────────────────────────────
     DESKTOP TABLE RENDERER
  ──────────────────────────────────────────────────────────────── */
  const renderDesktop = () => (
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
            const prodImages         = rowImages[rowIndex]         ?? [];
            const prodQtys           = rowQtys[rowIndex]           ?? [];
            const prodUnitCosts      = rowUnitCosts[rowIndex]      ?? [];
            const prodPackaging      = rowPackaging[rowIndex]      ?? [];
            const prodFactories      = rowFactories[rowIndex]      ?? [];
            const prodPorts          = rowPorts[rowIndex]          ?? [];
            const prodSubtotals      = rowSubtotals[rowIndex]      ?? [];
            const prodBrands         = rowSupplierBrands[rowIndex] ?? [];
            const prodSpecs          = rowSpecs[rowIndex]          ?? [];
            const prodCompanyNames   = rowCompanyNames[rowIndex]   ?? [];
            const prodContactNames   = rowContactNames[rowIndex]   ?? [];
            const prodContactNumbers = rowContactNumbers[rowIndex] ?? [];
            const prodLeadTimes      = rowLeadTimes[rowIndex]      ?? [];
            const prodSellingCosts   = rowSellingCosts[rowIndex]   ?? [];
            const prodFinalUnitCosts = rowFinalUnitCosts[rowIndex] ?? [];
            const prodFinalSubtotals = rowFinalSubtotals[rowIndex] ?? [];
            const prodItemCodes      = rowItemCodes[rowIndex]      ?? [];

            const hasProducts = prodImages.length > 0 && !(prodImages.length === 1 && prodImages[0] === "");

            return (
              <tr key={rowIndex} className="align-top">
                <td className="border px-3 py-2 text-center align-top pt-3 whitespace-nowrap font-medium">
                  {spfNumber}-{String(rowIndex + 1).padStart(3, "0")}
                </td>
                <td className="border px-3 py-2 text-center align-top pt-3">
                  {itemImages[rowIndex] ? (
                    <img src={itemImages[rowIndex]} className="w-24 h-24 object-contain mx-auto" />
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
                        const groups      = prodSpecs[i] ?? [];
                        const optItemCode = prodItemCodes[i] && prodItemCodes[i] !== "-"
                          ? prodItemCodes[i]
                          : null;

                        return (
                          <div key={i}>
                            {/* Option badge + item code pill */}
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Option {i + 1}
                                {prodBrands[i] && ` · ${prodBrands[i]}`}
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
                                        <img src={img} className="w-16 h-16 object-contain mx-auto" />
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
                                            {prodSellingCosts[i] && prodSellingCosts[i] !== "-"
                                              ? `₱${Number(prodSellingCosts[i]).toLocaleString()}`
                                              : "-"}
                                          </td>

                                          <td className="border px-2 py-2 text-center align-middle bg-green-50 text-green-700 font-semibold">
                                            {prodFinalUnitCosts[i] && prodFinalUnitCosts[i] !== "-"
                                              ? `₱${Number(prodFinalUnitCosts[i]).toLocaleString()}`
                                              : "-"}
                                          </td>

                                          <td className="border px-2 py-2 text-center align-middle bg-green-50 text-green-700 font-semibold">
                                            {prodFinalSubtotals[i] && prodFinalSubtotals[i] !== "-"
                                              ? `₱${Number(prodFinalSubtotals[i]).toLocaleString()}`
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
  );

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
            {getStatusLabel(data.status)}
          </span>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={
            isMobile
              ? "w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden"
              : "sm:max-w-7xl max-h-[90vh] overflow-y-auto rounded-none"
          }
        >
          {/* ── Header ── */}
          <DialogHeader className={isMobile ? "px-4 pt-4 pb-3 border-b shrink-0" : "space-y-2"}>
            <DialogTitle>SPF Request View</DialogTitle>

            <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
              {data?.status && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs">Status:</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-semibold ${
                    isApproved
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {getStatusLabel(data.status)}
                  </span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* ── Body ── */}
          <div className={isMobile ? "flex-1 overflow-y-auto px-3 pt-3 pb-4" : "mt-2"}>
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            )}

            {!loading && data && (
              isMobile ? renderMobile() : renderDesktop()
            )}

            {!loading && !data && (
              <p className="text-sm text-muted-foreground text-center py-8">No SPF creation found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
