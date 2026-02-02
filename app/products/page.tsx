"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/contexts/UserContext";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  const router = useRouter();
  const { userId } = useUser();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }

    const q = query(collection(db, "products"));
    const unsub = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [userId, router]);

  // ✅ 2-decimal formatter (1235.77)
  const format2 = (value?: number) =>
    typeof value === "number"
      ? value.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "-";

  return (
    <div className="p-6 space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="hidden md:flex" />
          <h1 className="text-2xl font-semibold">Products</h1>
        </div>

        <Button onClick={() => router.push("/add-product")}>
          + Add Product
        </Button>
      </div>

      {/* ===== TABLE ===== */}
      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-max border-collapse text-xs whitespace-nowrap">
          {/* ================= HEADER ================= */}
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              {[
                "Actions",
                "Product Name",
                "Main Image",
                "Gallery Images",
                "Video",
                "Supplier",
                "SKU",
                "Unit Cost",
                "Landed Cost",
                "SRP",
                "Technical Specifications",
                "Warranty",
                "Category Type",
                "Product Type",
                "Classification",
                "Supplier Data Sheet",
                "Sister Company",
                "MOQ",
                "Package (L×W×H)",
                "Qty / Carton",
                "Qty / Container",
                "Logistics Category",
                "Calculation Type",
              ].map((h) => (
                <th key={h} className="border px-2 py-1 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* ================= BODY ================= */}
          <tbody>
            {products.map((p) => {
              const cat = p.categoryTypes?.[0];
              const prod = p.productTypes?.[0];
              const tech = p.technicalSpecifications || [];

              const gallery = p.gallery || [];
              const videos = gallery.filter((g: any) => g.type === "video");
              const images = gallery.filter((g: any) => g.type === "image");

              return (
                <tr key={p.id}>
                  {/* ===== ACTIONS COLUMN ===== */}
                  <td className="border px-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/edit-product?id=${p.id}`)}
                      >
                        Edit
                      </Button>

                      <Button size="sm" variant="destructive">
                        Delete
                      </Button>
                    </div>
                  </td>

                  <td className="border px-2 font-semibold">{p.productName}</td>

                  <td className="border px-2">
                    {p.mainImage?.url ? (
                      <img
                        src={p.mainImage.url}
                        className="h-16 w-16 object-cover rounded"
                      />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="border px-2">
                    <div className="flex gap-1">
                      {images.length
                        ? images.map((img: any, i: number) => (
                            <img
                              key={i}
                              src={img.url}
                              className="h-12 w-12 object-cover rounded"
                            />
                          ))
                        : "-"}
                    </div>
                  </td>

                  <td className="border px-2">
                    {videos.length ? (
                      <video
                        src={videos[0].url}
                        controls
                        className="h-24 w-40 rounded"
                      />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="border px-2">{p.supplier?.company || "-"}</td>

                  <td className="border px-2">{p.sku}</td>

                  <td className="border px-2 text-right">
                    {format2(p.logistics?.unitCost)}
                  </td>

                  <td className="border px-2 text-right">
                    {format2(p.logistics?.landedCost)}
                  </td>

                  <td className="border px-2 font-semibold text-right">
                    {format2(p.logistics?.srp)}
                  </td>

                  <td className="border px-2 max-w-[300px]">
                    {tech.length
                      ? tech.map((t: any) => `${t.key}: ${t.value}`).join(" | ")
                      : "-"}
                  </td>

                  <td className="border px-2">
                    {p.logistics?.warranty
                      ? `${p.logistics.warranty.value} ${p.logistics.warranty.unit}`
                      : "-"}
                  </td>

                  <td className="border px-2">
                    {cat?.categoryTypeName || "-"}
                  </td>

                  <td className="border px-2">
                    {prod?.productTypeName || "-"}
                  </td>

                  <td className="border px-2">{p.classificationName || "-"}</td>

                  <td className="border px-2">
                    {p.supplierDataSheets?.length ? (
                      <div className="flex flex-col gap-1">
                        {p.supplierDataSheets.map((file: any, i: number) => (
                          <a
                            key={i}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={file.name}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {file.name}
                          </a>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className="border px-2">{p.sisterCompanyName || "-"}</td>

                  <td className="border px-2">{p.logistics?.moq ?? "-"}</td>

                  <td className="border px-2">
                    {p.logistics?.packaging
                      ? `${p.logistics.packaging.length}×${p.logistics.packaging.width}×${p.logistics.packaging.height}`
                      : "-"}
                  </td>

                  <td className="border px-2">
                    {p.logistics?.packaging?.qtyPerCarton ?? "-"}
                  </td>

                  <td className="border px-2">
                    {p.logistics?.qtyPerContainer ?? "-"}
                  </td>

                  <td className="border px-2">
                    {p.logistics?.category ?? "-"}
                  </td>

                  <td className="border px-2">
                    {p.logistics?.calculationType ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
