"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* CTRL + F: IMPORT GENERATE TDS */
import GenerateTDS from "@/components/generate-tds";

type Props = {
  productId: string;
  referenceID: string;
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
    specs: {
      specId: string;
      value: string;
    }[];
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
    const fileId = match[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return url;
};

export default function ViewProduct({ productId, referenceID }: Props) {
  const [open, setOpen] = useState(false);

  const [product, setProduct] = useState<ProductData | null>(null);

  const [user, setUser] = useState<UserData | null>(null);

  const [loading, setLoading] = useState(false);

  /* CTRL + F: OPEN TDS STATE */
  const [openTDS, setOpenTDS] = useState(false);
  const [hideEmptySpecs, setHideEmptySpecs] = useState(true);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setOpenTDS(false); // also close TDS panel if open
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    async function fetchAll() {
      setLoading(true);

      const ref = doc(db, "products", productId);

      const snap = await getDoc(ref);

      if (snap.exists()) {
        setProduct(snap.data() as ProductData);
      }

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
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        View
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start md:items-center pt-4 md:pt-0">
          {/* CTRL + F: EXPAND CONTAINER */}
          <div
            className={`bg-white h-[calc(100svh-140px)] md:h-[90vh] rounded-xl flex flex-col md:flex-row overflow-hidden transition-all duration-300 ${
              openTDS ? "w-full md:w-[1400px]" : "w-full md:w-[1000px]"
            }`}
          >
            {/* CTRL + F: LEFT PANEL */}
            <div
              className={`
                flex flex-col min-h-0 border-b md:border-b-0 md:border-r
                ${openTDS ? "md:w-1/2" : "w-full"}
              `}
            >
              {/* HEADER */}
              <div className="border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold">
                  {product?.productName || "-"}
                </h2>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setOpenTDS(true)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Generate TDS
                  </Button>

                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>

              {/* BODY */}
              <div className="flex flex-col md:flex-row flex-1 overflow-auto px-4 md:px-6 py-4 gap-6">
                {/* IMAGE */}
                <div className="w-full md:w-[320px] shrink-0">
                  <div className="space-y-4">
                    <div className="w-full h-[320px] border rounded bg-white flex items-center justify-center">
                      {product?.mainImage?.url ? (
                        <img
                          src={convertDriveToThumbnail(product.mainImage.url)}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <span>-</span>
                      )}
                    </div>

                    <div className="text-sm">
                      <div className="font-semibold">Added By</div>

                      <div>
                        {user
                          ? `${user.Firstname || "-"} ${user.Lastname || "-"} (${user.Role || "-"})`
                          : "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* DETAILS */}
                <div className="flex-1 overflow-auto pr-2 pb-[140px] md:pb-0">
                  {/* REMOVE EMPTY SPECIFICATIONS */}
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={hideEmptySpecs}
                      onChange={(e) => setHideEmptySpecs(e.target.checked)}
                      className="w-4 h-4"
                    />

                    <span className="text-sm">
                      {hideEmptySpecs
                        ? "Remove Empty Specifications (ON)"
                        : "Remove Empty Specifications (OFF)"}
                    </span>
                  </div>
                  {loading ? (
                    <p>Loading...</p>
                  ) : (
                    <>
                      <div className="mb-6">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr className="odd:bg-[#f5f5f5]">
                              <td className="border p-2 font-semibold w-[40%]">
                                Supplier / Company
                              </td>

                              <td className="border p-2">{supplier}</td>
                            </tr>

                            <tr className="odd:bg-[#f5f5f5]">
                              <td className="border p-2 font-semibold">
                                Price Point
                              </td>

                              <td className="border p-2">
                                {product?.pricePoint || "-"}
                              </td>
                            </tr>

                            <tr className="odd:bg-[#f5f5f5]">
                              <td className="border p-2 font-semibold">
                                Brand Origin
                              </td>

                              <td className="border p-2">
                                {product?.brandOrigin || "-"}
                              </td>
                            </tr>

                            <tr className="odd:bg-[#f5f5f5]">
                              <td className="border p-2 font-semibold">
                                Product Class
                              </td>

                              <td className="border p-2">
                                {product?.productClass || "-"}
                              </td>
                            </tr>

                            <tr className="odd:bg-[#f5f5f5]">
                              <td className="border p-2 font-semibold">
                                Product Usage
                              </td>

                              <td className="border p-2">{usage}</td>
                            </tr>

                            <tr className="odd:bg-[#f5f5f5]">
                              <td className="border p-2 font-semibold">
                                Product Family
                              </td>

                              <td className="border p-2">{family}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {!product?.technicalSpecifications ? (
                        <div className="border p-4 text-center">-</div>
                      ) : (
                        product.technicalSpecifications
                          ?.filter(
                            (group) => group.title !== "COMMERCIAL DETAILS",
                          )
                          .map((group, i) => (
                            <div key={i} className="mb-4">
                              <div className="font-semibold mb-2">
                                {group.title}
                              </div>

                              <table className="w-full border">
                                <tbody>
                                  {group.specs
                                    .filter((spec) => {
                                      if (!hideEmptySpecs) return true;

                                      if (!spec.value) return false;

                                      const val = spec.value.trim();

                                      return val !== "" && val !== "-";
                                    })
                                    .map((spec, s) => {
                                      const activeFilters =
                                        (window as any).__ACTIVE_FILTERS__ ||
                                        [];

                                      let displayValue = spec.value || "-";

                                      if (activeFilters.length && spec.value) {
                                        const values = spec.value
                                          .split("|")
                                          .map((v) => v.trim())
                                          .filter(Boolean);

                                        const matched = values.filter((v) =>
                                          activeFilters.includes(v),
                                        );

                                        if (matched.length) {
                                          displayValue = matched.join(" | ");
                                        }
                                      }

                                      return (
                                        <tr key={s}>
                                          <td className="border p-2 font-semibold w-[40%]">
                                            {spec.specId || "-"}
                                          </td>

                                          <td className="border p-2">
                                            {displayValue}
                                          </td>
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

            {/* CTRL + F: RIGHT PANEL */}
            {openTDS && (
              <div className="flex flex-col min-h-0 md:w-1/2 border-t md:border-t-0 md:border-l">
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
