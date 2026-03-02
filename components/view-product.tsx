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

export default function ViewProduct({ productId, referenceID }: Props) {
  const [open, setOpen] = useState(false);

  const [product, setProduct] = useState<ProductData | null>(null);

  const [user, setUser] = useState<UserData | null>(null);

  const [loading, setLoading] = useState(false);

  /* CTRL + F: OPEN TDS STATE */
  const [openTDS, setOpenTDS] = useState(false);

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
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">

          {/* CTRL + F: EXPAND CONTAINER */}
          <div
            className={`bg-white h-[90vh] rounded-xl flex overflow-hidden transition-all duration-300 ${
              openTDS ? "w-[1400px]" : "w-[1000px]"
            }`}
          >

            {/* CTRL + F: LEFT PANEL (VIEW PRODUCT) */}
            <div className="flex flex-col flex-1 border-r">

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
              <div className="flex flex-col md:flex-row flex-1 overflow-hidden px-4 md:px-6 py-4 gap-6">

                {/* LEFT IMAGE */}
                <div className="w-full md:w-[320px] shrink-0">
                  <div className="space-y-4">

                    <div className="w-full h-[320px] border rounded bg-white flex items-center justify-center">
                      {product?.mainImage?.url ? (
                        <img
                          src={product.mainImage.url}
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


                {/* RIGHT DETAILS */}
                <div className="flex-1 overflow-auto pr-2 pb-[140px] md:pb-0">

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
                        product.technicalSpecifications.map((group, i) => (

                          <div key={i} className="mb-4">

                            <div className="font-semibold mb-2">
                              {group.title}
                            </div>

                            <table className="w-full border">

                              <tbody>

                                {group.specs.map((spec, s) => (
                                  <tr key={s}>
                                    <td className="border p-2 font-semibold w-[40%]">
                                      {spec.specId}
                                    </td>
                                    <td className="border p-2">
                                      {spec.value}
                                    </td>
                                  </tr>
                                ))}

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


            {/* CTRL + F: RIGHT PANEL (TDS SIDE) */}
            {openTDS && (

              <div className="w-[400px] flex-shrink-0">

                <GenerateTDS
                  open={openTDS}
                  onClose={() => setOpenTDS(false)}
                />

              </div>

            )}


          </div>

        </div>
      )}

    </>
  );
}