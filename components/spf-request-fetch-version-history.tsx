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
import { History, ChevronDown, ChevronUp, Clock, User } from "lucide-react";

/* ─────────────────────────────────────────────────────────────── */
/* TYPES                                                           */
/* ─────────────────────────────────────────────────────────────── */
type VersionRecord = {
  id?: number;
  spf_number: string;
  version_number: number;
  version_label: string;
  created_at: string;
  edited_by?: string;
  status?: string;
  spf_creation_start_time?: string;
  spf_creation_end_time?: string;

  supplier_brand?: string;
  product_offer_image?: string;
  product_offer_qty?: string;
  product_offer_technical_specification?: string;
  product_offer_unit_cost?: string;
  product_offer_pcs_per_carton?: string;
  product_offer_packaging_details?: string;
  product_offer_factory_address?: string;
  product_offer_port_of_discharge?: string;
  product_offer_subtotal?: string;
  company_name?: string;
  contact_name?: string;
  contact_number?: string;
  proj_lead_time?: string;
  final_selling_cost?: string;
  final_unit_cost?: string;
  final_subtotal?: string;
  item_code?: string;
};

type Props = {
  spfNumber: string;
  isMobile?: boolean;
};

const ROW_SEP = "|ROW|";

type SpecGroup = { title: string; specs: string[] };

/* ─────────────────────────────────────────────────────────────── */
/* HELPERS (same parsing as spf-request-fetch.tsx)                */
/* ─────────────────────────────────────────────────────────────── */
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

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-PH", {
      year:   "numeric",
      month:  "short",
      day:    "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ─────────────────────────────────────────────────────────────── */
/* COLLAPSIBLE SPEC BLOCK                                          */
/* ─────────────────────────────────────────────────────────────── */
function SpecsBlock({ groups }: { groups: SpecGroup[] }) {
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
        {open ? "Hide" : "View specs"}
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
/* VERSION DETAIL VIEW                                             */
/* ─────────────────────────────────────────────────────────────── */
function VersionDetail({
  record,
  itemDescriptions,
  itemImages,
  isMobile,
}: {
  record: VersionRecord;
  itemDescriptions: string[];
  itemImages: string[];
  isMobile?: boolean;
}) {
  const rowImages          = splitByRow(record.product_offer_image);
  const rowQtys            = splitByRow(record.product_offer_qty);
  const rowUnitCosts       = splitByRow(record.product_offer_unit_cost);
  const rowPcsPerCartons   = splitByRow(record.product_offer_pcs_per_carton);
  const rowPackaging       = splitByRow(record.product_offer_packaging_details);
  const rowFactories       = splitByRow(record.product_offer_factory_address);
  const rowPorts           = splitByRow(record.product_offer_port_of_discharge);
  const rowSubtotals       = splitByRow(record.product_offer_subtotal);
  const rowSupplierBrands  = splitByRow(record.supplier_brand);
  const rowSpecs           = splitSpecsByRow(record.product_offer_technical_specification);
  const rowCompanyNames    = splitByRow(record.company_name);
  const rowContactNames    = splitByRow(record.contact_name);
  const rowContactNumbers  = splitByRow(record.contact_number);
  const rowLeadTimes       = splitByRow(record.proj_lead_time);
  const rowSellingCosts    = splitByRow(record.final_selling_cost);
  const rowFinalUnitCosts  = splitByRow(record.final_unit_cost);
  const rowFinalSubtotals  = splitByRow(record.final_subtotal);
  const rowItemCodes       = splitByRow(record.item_code);

  return (
    <div className="space-y-3 mt-2">
      {itemDescriptions.map((desc, rowIndex) => {
        const prodImages       = rowImages[rowIndex]         ?? [];
        const prodQtys         = rowQtys[rowIndex]           ?? [];
        const prodUnitCosts    = rowUnitCosts[rowIndex]      ?? [];
        const prodPcsPerCartons= rowPcsPerCartons[rowIndex] ?? [];
        const prodPackaging    = rowPackaging[rowIndex]      ?? [];
        const prodFactories    = rowFactories[rowIndex]      ?? [];
        const prodPorts        = rowPorts[rowIndex]          ?? [];
        const prodSubtotals    = rowSubtotals[rowIndex]      ?? [];
        const prodBrands       = rowSupplierBrands[rowIndex] ?? [];
        const prodSpecs        = rowSpecs[rowIndex]          ?? [];
        const prodCompanyNames = rowCompanyNames[rowIndex]   ?? [];
        const prodContactNames = rowContactNames[rowIndex]   ?? [];
        const prodContactNumbers = rowContactNumbers[rowIndex] ?? [];
        const prodLeadTimes     = rowLeadTimes[rowIndex]      ?? [];
        const prodSellingCosts  = rowSellingCosts[rowIndex]   ?? [];
        const prodFinalUnitCosts= rowFinalUnitCosts[rowIndex] ?? [];
        const prodFinalSubtotals= rowFinalSubtotals[rowIndex] ?? [];
        const prodItemCodes     = rowItemCodes[rowIndex]      ?? [];

        const hasProducts   = prodImages.length > 0 && !(prodImages.length === 1 && prodImages[0] === "");

        return (
          <div key={rowIndex} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-gray-50 border-b px-3 py-2 flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 shrink-0">
                {record.spf_number}-{String(rowIndex + 1).padStart(3, "0")}
              </span>
              {itemImages[rowIndex] ? (
                <img src={itemImages[rowIndex]} className="w-8 h-8 object-contain rounded shrink-0" alt="" />
              ) : null}
              <p className="text-xs font-medium text-gray-800 line-clamp-2 flex-1">
                {desc.replace(/\|/g, " · ")}
              </p>
            </div>

            {!hasProducts ? (
              <p className="text-xs text-muted-foreground px-3 py-2">No products</p>
            ) : (
              isMobile ? (
                <div className="space-y-2 px-3 py-2">
                  {prodImages.map((img, i) => {
                    const groups      = prodSpecs[i] ?? [];
                    const optItemCode = prodItemCodes[i] && prodItemCodes[i] !== "-" ? prodItemCodes[i] : null;

                    return (
                      <div key={i} className="border rounded-lg p-3 bg-white">
                        <div className="flex items-center gap-2 mb-2">
                          {img && img !== "-" ? (
                            <img src={img} className="w-12 h-12 object-contain rounded border" alt="" />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-[9px] text-gray-400">No img</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold truncate">Option {i + 1}{prodBrands[i] ? ` · ${prodBrands[i]}` : ""}</p>
                            {optItemCode && <p className="text-[10px] text-gray-500 leading-tight">{optItemCode}</p>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                          <div><span className="text-gray-400">Qty</span><p>{prodQtys[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Unit Cost</span><p>{prodUnitCosts[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Qty/Per Carton</span><p>{prodPcsPerCartons[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Packaging</span><p>{prodPackaging[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Factory</span><p>{prodFactories[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Port</span><p>{prodPorts[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Subtotal</span><p>₱{Number(prodSubtotals[i] || 0).toLocaleString()}</p></div>
                          <div><span className="text-gray-400">Lead Time</span><p>{prodLeadTimes[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Selling Cost</span><p>{prodSellingCosts[i] || "-"}</p></div>
                          <div><span className="text-gray-400">Final Unit Cost</span><p>{prodFinalUnitCosts[i] || "-"}</p></div>
                          <div className="col-span-2"><span className="text-gray-400">Final Subtotal</span><p>{prodFinalSubtotals[i] || "-"}</p></div>
                        </div>
                        <div className="text-[10px] mb-2">
                          <p className="font-semibold">Technical Specs</p>
                          {groups.length === 0 ? <p className="text-gray-500">-</p> : groups.map((group, gi) => (
                            <p key={gi} className="text-gray-500">{group.title ? `${group.title}: ` : ""}{group.specs.join(", ")}</p>
                          ))}
                        </div>
                        <div className="text-[10px] space-y-0.5">
                          <p><span className="text-gray-400">Company:</span> {prodCompanyNames[i] || "-"}</p>
                          <p><span className="text-gray-400">Contact Name:</span> {prodContactNames[i] || "-"}</p>
                          <p><span className="text-gray-400">Contact No.:</span> {prodContactNumbers[i] || "-"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto px-3 py-2">
                  <table className="w-full border text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border px-2 py-1 text-center">Supplier Brand</th>
                        <th className="border px-2 py-1 text-center">Image</th>
                        <th className="border px-2 py-1 text-center">Qty</th>
                        <th className="border px-2 py-1 text-center min-w-[180px]">Technical Specs</th>
                        <th className="border px-2 py-1 text-center">Unit Cost</th>
                        <th className="border px-2 py-1 text-center">Qty/Per Carton</th>
                        <th className="border px-2 py-1 text-center">Packaging</th>
                        <th className="border px-2 py-1 text-center">Factory</th>
                        <th className="border px-2 py-1 text-center">Port</th>
                        <th className="border px-2 py-1 text-center">Subtotal</th>
                        <th className="border px-2 py-1 text-center">Company</th>
                        <th className="border px-2 py-1 text-center">Contact Name</th>
                        <th className="border px-2 py-1 text-center">Contact No.</th>
                        <th className="border px-2 py-1 text-center">Lead Time</th>
                        <th className="border px-2 py-1 text-center">Selling Cost</th>
                        <th className="border px-2 py-1 text-center">Final Unit Cost</th>
                        <th className="border px-2 py-1 text-center">Final Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prodImages.map((img, i) => {
                        const groups      = prodSpecs[i] ?? [];
                        const optItemCode = prodItemCodes[i] && prodItemCodes[i] !== "-" ? prodItemCodes[i] : null;
                        const specsText = groups.length === 0 ? "-" : groups
                          .map((g) => (g.title ? `${g.title}: ${g.specs.join(", ")}` : g.specs.join(", ")))
                          .join("; ");

                        return (
                          <tr key={i} className="align-top">
                            <td className="border px-2 py-1 text-center">{prodBrands[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">
                              {img && img !== "-" ? (
                                <img src={img} className="w-12 h-12 object-contain mx-auto" alt="" />
                              ) : (
                                <span className="text-muted-foreground text-[10px]">-</span>
                              )}
                            </td>
                            <td className="border px-2 py-1 text-center">{prodQtys[i] || "-"}</td>
                            <td className="border px-2 py-1 align-top text-[11px]">{specsText}</td>
                            <td className="border px-2 py-1 text-center">{prodUnitCosts[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodPcsPerCartons[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodPackaging[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodFactories[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodPorts[i] || "-"}</td>
                            <td className="border px-2 py-1 text-right">₱{Number(prodSubtotals[i] || 0).toLocaleString()}</td>
                            <td className="border px-2 py-1 text-center">{prodCompanyNames[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodContactNames[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodContactNumbers[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodLeadTimes[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodSellingCosts[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodFinalUnitCosts[i] || "-"}</td>
                            <td className="border px-2 py-1 text-center">{prodFinalSubtotals[i] || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* MAIN COMPONENT                                                  */
/* ─────────────────────────────────────────────────────────────── */
export default function SPFRequestFetchVersionHistory({
  spfNumber,
  isMobile = false,
}: Props) {
  const [open, setOpen]                   = useState(false);
  const [versions, setVersions]           = useState<VersionRecord[]>([]);
  const [loading, setLoading]             = useState(false);
  const [expandedVersion, setExpanded]    = useState<number | null>(null);

  /* We also need the item descriptions from spf_request for context */
  const [itemDescriptions, setItemDescriptions] = useState<string[]>([]);
  const [itemImages, setItemImages]             = useState<string[]>([]);

  const fetchVersions = async () => {
    try {
      setLoading(true);

      /* Fetch version history */
      const { data: historyData, error } = await supabase
        .from("spf_creation_history")
        .select("*")
        .eq("spf_number", spfNumber)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Version history fetch error:", error);
      } else {
        setVersions(historyData || []);
      }

      /* Fetch item descriptions for display */
      const { data: requestData } = await supabase
        .from("spf_request")
        .select("item_description,item_photo")
        .eq("spf_number", spfNumber)
        .maybeSingle();

      if (requestData) {
        setItemDescriptions(
          (requestData.item_description || "")
            .split(",")
            .map((s: string) => s.trim())
        );
        setItemImages(
          (requestData.item_photo || "")
            .split(",")
            .map((s: string) => s.trim())
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchVersions();
  }, [open]);

  const toggleExpand = (vNum: number) => {
    setExpanded((prev) => (prev === vNum ? null : vNum));
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        title="View version history"
      >
        <History size={14} />
        History
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={
            isMobile
              ? "w-full max-w-full h-[100dvh] rounded-none p-0 flex flex-col overflow-hidden"
              : "sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-none"
          }
        >
          <DialogHeader className={isMobile ? "px-4 pt-4 pb-3 border-b shrink-0" : ""}>
            <DialogTitle className="flex items-center gap-2">
              <History size={16} />
              Version History — {spfNumber}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Each entry represents a saved revision. Click to expand and view the state at that version.
            </p>
          </DialogHeader>

          <div className={isMobile ? "flex-1 overflow-y-auto px-3 pt-3 pb-4" : "mt-4 px-1"}>
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-8">Loading history...</p>
            )}

            {!loading && versions.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <History size={32} className="mx-auto text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No version history yet.</p>
                <p className="text-xs text-muted-foreground/70">
                  Versions are created each time the SPF is revised and resubmitted.
                </p>
              </div>
            )}

            {!loading && versions.length > 0 && (
              <div className="space-y-3">
                {versions.map((v) => {
                  const isExpanded = expandedVersion === v.version_number;
                  return (
                    <Card
                      key={v.version_number}
                      className="overflow-hidden border border-gray-200 rounded-xl shadow-sm"
                    >
                      {/* Version header — always visible, clickable */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(v.version_number)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Version badge */}
                          <span className="inline-flex items-center shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-mono">
                            {v.version_label || `${spfNumber}_v${v.version_number}`}
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1 shrink-0">
                                <Clock size={10} />
                                {formatDateTime(v.created_at)}
                              </span>
                              {v.spf_creation_start_time && (
                                <span className="flex items-center gap-1 truncate">
                                  <span className="font-medium">Start:</span> {formatDateTime(v.spf_creation_start_time)}
                                </span>
                              )}
                              {v.spf_creation_end_time && (
                                <span className="flex items-center gap-1 truncate">
                                  <span className="font-medium">End:</span> {formatDateTime(v.spf_creation_end_time)}
                                </span>
                              )}
                              {v.spf_creation_start_time && v.spf_creation_end_time && (
                                <span className="flex items-center gap-1 truncate">
                                  <span className="font-medium">Dur:</span>
                                  {(() => {
                                    const start = new Date(v.spf_creation_start_time).getTime();
                                    const end = new Date(v.spf_creation_end_time).getTime();
                                    const diff = Math.max(0, Math.floor((end - start) / 1000));
                                    const hrs = Math.floor(diff / 3600);
                                    const mins = Math.floor((diff % 3600) / 60);
                                    const secs = diff % 60;
                                    const z = (n: number) => String(n).padStart(2, "0");
                                    return `${hrs > 0 ? `${z(hrs)}:` : ""}${z(mins)}:${z(secs)}`;
                                  })()}
                                </span>
                              )}
                              {v.edited_by && (
                                <span className="flex items-center gap-1 truncate">
                                  <User size={10} />
                                  {v.edited_by}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {v.status && (
                            <span className="hidden sm:inline-flex text-[9px] px-2 py-0.5 rounded uppercase font-semibold bg-yellow-100 text-yellow-700">
                              {v.status}
                            </span>
                          )}
                          {isExpanded
                            ? <ChevronUp size={14} className="text-gray-500" />
                            : <ChevronDown size={14} className="text-gray-500" />}
                        </div>
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t bg-white">
                          {itemDescriptions.length > 0 ? (
                            <VersionDetail
                              record={v}
                              itemDescriptions={itemDescriptions}
                              itemImages={itemImages}
                              isMobile={isMobile}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground py-4 text-center">
                              Item descriptions unavailable.
                            </p>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
