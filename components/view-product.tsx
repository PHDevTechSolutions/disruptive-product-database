"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChevronLeft, X } from "lucide-react";

import GenerateTDS from "@/components/generate-tds";

type Props = {
  productId: string;
  referenceID: string;
  defaultOpen?: boolean;
  onClose?: () => void;
};

type ProductData = {
  productName?: string;
  mainImage?: { url: string };
  dimensionalDrawing?: { url: string };
  illuminanceDrawing?: { url: string };
  supplier?: { company: string } | null;
  pricePoint?: string;
  brandOrigin?: string;
  productClass?: string;
  categoryTypes?: { categoryTypeName: string }[];
  productFamilies?: { productFamilyName: string }[];
  technicalSpecifications?: {
    title: string;
    specs: { specId: string; value: string }[];
  }[];
};

type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

const convertDriveToThumbnail = (url?: string) => {
  if (!url) return "";
  if (!url.includes("drive.google.com")) return url;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
};

export default function ViewProduct({
  productId,
  referenceID,
  defaultOpen = false,
  onClose,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);

  /* on mobile we navigate between "details" and "tds" as two full-screen views */
  const [openTDS, setOpenTDS] = useState(false);
  const [hideEmptySpecs, setHideEmptySpecs] = useState(true);

  const handleClose = () => {
    setOpen(false);
    setOpenTDS(false);
    onClose?.();
  };

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    async function fetchAll() {
      setLoading(true);
      const ref = doc(db, "products", productId);
      const snap = await getDoc(ref);
      if (snap.exists()) setProduct(snap.data() as ProductData);
      const res = await fetch(`/api/users?id=${referenceID}`);
      const userData = await res.json();
      setUser(userData);
      setLoading(false);
    }
    fetchAll();
  }, [open, productId, referenceID]);

  const supplier = product?.supplier?.company || "-";
  const usage = product?.categoryTypes?.[0]?.categoryTypeName || "-";
  const family = product?.productFamilies?.[0]?.productFamilyName || "-";

  return (
    <>
      {!defaultOpen && (
        <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
          View
        </Button>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start md:items-center pt-0 md:pt-0">

          {/* ── MODAL CONTAINER ── */}
          <div
            className={`
              bg-white w-full h-dvh md:h-[90vh] md:rounded-xl flex flex-col md:flex-row overflow-hidden
              transition-all duration-300
              ${openTDS ? "md:w-350" : "md:w-250"}
            `}
          >

            {/* ══════════════════════════════
                LEFT PANEL — Details
                On mobile: hidden when TDS is open
            ══════════════════════════════ */}
            <div
              className={`
                flex flex-col min-h-0 border-b md:border-b-0 md:border-r
                ${openTDS
                  ? "hidden md:flex md:w-1/2"   /* desktop: show half; mobile: hidden when TDS open */
                  : "flex w-full md:w-full"
                }
              `}
            >
              {/* HEADER */}
              <div className="border-b px-4 py-3 flex items-center justify-between gap-2 shrink-0">
                <h2 className="text-sm font-semibold truncate flex-1">
                  {product?.productName || "-"}
                </h2>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setOpenTDS(true)}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs px-3 rounded-lg"
                  >
                    Generate TDS
                  </Button>
                  <button
                    onClick={handleClose}
                    className="h-8 w-8 rounded-lg border flex items-center justify-center text-gray-500 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* BODY */}
              <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto px-4 py-4 gap-4 pb-6">

                {/* IMAGE + added-by */}
                <div className="w-full md:w-70 shrink-0 space-y-3">
                  <div className="w-full aspect-square border rounded-xl bg-white flex items-center justify-center overflow-hidden">
                    {product?.mainImage?.url ? (
                      <img
                        src={convertDriveToThumbnail(product.mainImage.url)}
                        className="max-w-full max-h-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Added by: </span>
                    {user
                      ? `${user.Firstname || "-"} ${user.Lastname || "-"} (${user.Role || "-"})`
                      : "-"}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="flex-1 min-w-0 space-y-4">

                  {/* Hide empty specs toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideEmptySpecs}
                      onChange={(e) => setHideEmptySpecs(e.target.checked)}
                      className="w-4 h-4 accent-gray-800"
                    />
                    <span className="text-xs text-gray-600">
                      {hideEmptySpecs ? "Remove Empty Specifications (ON)" : "Remove Empty Specifications (OFF)"}
                    </span>
                  </label>

                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-6 w-6 rounded-full border-2 border-gray-200 border-t-gray-800 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Info table */}
                      <div className="rounded-xl border overflow-hidden text-sm">
                        <table className="w-full border-collapse">
                          <tbody>
                            {[
                              ["Supplier / Company", supplier],
                              ["Price Point", product?.pricePoint || "-"],
                              ["Brand Origin", product?.brandOrigin || "-"],
                              ["Product Class", product?.productClass || "-"],
                              ["Product Usage", usage],
                              ["Product Family", family],
                            ].map(([label, value], idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                                <td className="border-b px-3 py-2 font-semibold text-gray-600 w-[45%] text-xs">{label}</td>
                                <td className="border-b px-3 py-2 text-xs">{value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Technical Specifications */}
                      {!product?.technicalSpecifications ? (
                        <div className="border rounded-xl p-4 text-center text-sm text-gray-400">
                          No technical specifications
                        </div>
                      ) : (
                        product.technicalSpecifications
                          ?.filter((group) => group.title !== "COMMERCIAL DETAILS")
                          .filter((group) => {
                            if (!hideEmptySpecs) return true;
                            return group.specs.some((spec) => {
                              const val = spec.value?.trim();
                              return val && val !== "-";
                            });
                          })
                          .map((group, i) => (
                            <div key={i} className="rounded-xl border overflow-hidden">
                              <div className="bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
                                {group.title}
                              </div>
                              <table className="w-full border-collapse">
                                <tbody>
                                  {group.specs
                                    .filter((spec) => {
                                      if (!hideEmptySpecs) return true;
                                      if (!spec.value) return false;
                                      const val = spec.value.trim();
                                      return val !== "" && val !== "-";
                                    })
                                    .map((spec, s) => {
                                      const activeFilters = (window as any).__ACTIVE_FILTERS__ || [];
                                      let displayValue = spec.value || "-";

                                      if (activeFilters.length && spec.value) {
                                        const values = spec.value
                                          .split("|")
                                          .map((v) => v.trim())
                                          .filter(Boolean);
                                        const matched = values.filter((v) => activeFilters.includes(v));
                                        if (matched.length) displayValue = matched.join(" | ");
                                      }

                                      return (
                                        <tr key={s} className={s % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                          <td className="border-b px-3 py-1.5 font-semibold text-xs text-gray-600 w-[45%]">
                                            {spec.specId || "-"}
                                          </td>
                                          <td className="border-b px-3 py-1.5 text-xs">{displayValue}</td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            </div>
                          ))
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════
                RIGHT PANEL — Generate TDS
                On mobile: full-screen takeover
            ══════════════════════════════ */}
            {openTDS && (
              <div
                className={`
                  flex flex-col min-h-0 
                  fixed inset-0 z-10 md:relative md:inset-auto md:z-auto
                  md:w-1/2 border-t md:border-t-0 md:border-l
                `}
              >
                {/* Mobile-only back button row */}
                <div className="md:hidden flex items-center gap-2 px-4 py-2 bg-white border-b shrink-0">
                  <button
                    onClick={() => setOpenTDS(false)}
                    className="flex items-center gap-1 text-sm text-gray-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back to details
                  </button>
                </div>

                <GenerateTDS
                  open={openTDS}
                  onClose={() => setOpenTDS(false)}
                  mainImage={product?.mainImage}
                  dimensionalDrawing={product?.dimensionalDrawing}
                  illuminanceDrawing={product?.illuminanceDrawing}
                  technicalSpecifications={product?.technicalSpecifications}
                />
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
