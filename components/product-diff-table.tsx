"use client";

import React from "react";

type CommercialDetails = {
  unitCost?: number | null;
  packaging?: { length?: string | null; width?: string | null; height?: string | null };
  pcsPerCarton?: number | null;
  factoryAddress?: string;
  portOfDischarge?: string;
};

type TechSpec = {
  title: string;
  specs: { specId: string; value: string }[];
};

type ProductSnapshot = {
  categoryTypes?: { categoryTypeName?: string; productUsageId?: string }[];
  productFamilies?: { productFamilyName?: string; productFamilyId?: string }[];
  productClass?: string;
  pricePoint?: string;
  brandOrigin?: string;
  supplier?: { supplierBrand?: string; company?: string } | null;
  mainImage?: { url: string } | string | null;
  dimensionalDrawing?: { url: string } | string | null;
  illuminanceDrawing?: { url: string } | string | null;
  commercialDetails?: CommercialDetails;
  technicalSpecifications?: TechSpec[];
  imageLink?: string;
  dimensionalLink?: string;
  illuminanceLink?: string;
};

function getImageUrl(val: { url: string } | string | null | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.url ?? "";
}

function packagingStr(d?: CommercialDetails) {
  const p = d?.packaging;
  if (!p?.length && !p?.width && !p?.height) return "";
  return `${p?.length ?? "?"} × ${p?.width ?? "?"} × ${p?.height ?? "?"}`;
}

type FieldRow = { section: string; label: string; old: string; new: string };

function buildRows(o: ProductSnapshot, n: ProductSnapshot): FieldRow[] {
  const rows: FieldRow[] = [];
  const add = (section: string, label: string, oldVal: string, newVal: string) =>
    rows.push({ section, label, old: oldVal || "—", new: newVal || "—" });

  add("Core", "Product usage",
    o.categoryTypes?.[0]?.categoryTypeName ?? "",
    n.categoryTypes?.[0]?.categoryTypeName ?? ""
  );
  add("Core", "Product family",
    o.productFamilies?.[0]?.productFamilyName ?? "",
    n.productFamilies?.[0]?.productFamilyName ?? ""
  );
  add("Core", "Product class", o.productClass ?? "", n.productClass ?? "");
  add("Core", "Price point", o.pricePoint ?? "", n.pricePoint ?? "");
  add("Core", "Brand origin", o.brandOrigin ?? "", n.brandOrigin ?? "");
  add("Core", "Supplier brand",
    o.supplier?.supplierBrand ?? o.supplier?.company ?? "",
    n.supplier?.supplierBrand ?? n.supplier?.company ?? ""
  );

  add("Images", "Main image",
    getImageUrl(o.mainImage) || o.imageLink || "",
    getImageUrl(n.mainImage) || n.imageLink || ""
  );
  add("Images", "Dimensional drawing",
    getImageUrl(o.dimensionalDrawing) || o.dimensionalLink || "",
    getImageUrl(n.dimensionalDrawing) || n.dimensionalLink || ""
  );
  add("Images", "Illuminance level",
    getImageUrl(o.illuminanceDrawing) || o.illuminanceLink || "",
    getImageUrl(n.illuminanceDrawing) || n.illuminanceLink || ""
  );

  add("Commercial", "Unit cost",
    o.commercialDetails?.unitCost != null ? `USD ${o.commercialDetails.unitCost}` : "",
    n.commercialDetails?.unitCost != null ? `USD ${n.commercialDetails.unitCost}` : ""
  );
  add("Commercial", "L × W × H",
    packagingStr(o.commercialDetails),
    packagingStr(n.commercialDetails)
  );
  add("Commercial", "pcs / carton",
    o.commercialDetails?.pcsPerCarton != null ? String(o.commercialDetails.pcsPerCarton) : "",
    n.commercialDetails?.pcsPerCarton != null ? String(n.commercialDetails.pcsPerCarton) : ""
  );
  add("Commercial", "Factory address",
    o.commercialDetails?.factoryAddress ?? "",
    n.commercialDetails?.factoryAddress ?? ""
  );
  add("Commercial", "Port of discharge",
    o.commercialDetails?.portOfDischarge ?? "",
    n.commercialDetails?.portOfDischarge ?? ""
  );

  const allGroups = new Set([
    ...(o.technicalSpecifications ?? []).map((s) => s.title),
    ...(n.technicalSpecifications ?? []).map((s) => s.title),
  ]);

  for (const group of allGroups) {
    const oGroup = o.technicalSpecifications?.find((s) => s.title === group);
    const nGroup = n.technicalSpecifications?.find((s) => s.title === group);
    const allSpecIds = new Set([
      ...(oGroup?.specs ?? []).map((r) => r.specId),
      ...(nGroup?.specs ?? []).map((r) => r.specId),
    ]);
    for (const specId of allSpecIds) {
      const oVal = oGroup?.specs.find((r) => r.specId === specId)?.value ?? "";
      const nVal = nGroup?.specs.find((r) => r.specId === specId)?.value ?? "";
      add(`Specs — ${group}`, specId, oVal, nVal);
    }
  }

  return rows;
}

function ImageCell({ url, changed }: { url: string; changed: boolean }) {
  if (!url || url === "—") return <span className="text-gray-400">—</span>;

  const isImage =
    /\.(jpg|jpeg|png|gif|webp|svg)/i.test(url) ||
    url.includes("drive.google.com/thumbnail") ||
    url.includes("cloudinary.com") ||
    url.includes("wikimedia.org");

  return (
    <div className="space-y-1">
      {isImage && (
        <img
          src={url}
          alt=""
          className="w-24 h-16 object-contain rounded border border-gray-200 bg-white"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-xs break-all underline ${
          changed ? "text-inherit" : "text-blue-500"
        }`}
      >
        {url.length > 60 ? url.slice(0, 60) + "…" : url}
      </a>
    </div>
  );
}

type Props = { oldData: ProductSnapshot; newData: ProductSnapshot };

export default function ProductDiffTable({ oldData, newData }: Props) {
  const rows = buildRows(oldData, newData);
  const changedCount = rows.filter((r) => r.old !== r.new).length;
  const imageFields = new Set(["Main image", "Dimensional drawing", "Illuminance level"]);

  let lastSection = "";

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
              <th className="text-left px-3 py-2 border-b w-44">Field</th>
              <th className="text-left px-3 py-2 border-b">Current</th>
              <th className="text-left px-3 py-2 border-b">Incoming</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const changed = r.old !== r.new;
              const showSection = r.section !== lastSection;
              lastSection = r.section;
              const isImg = imageFields.has(r.label);

              return (
                <React.Fragment key={i}>
                  {showSection && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-1.5 text-[11px] font-medium text-gray-400 tracking-wide bg-gray-50 border-b"
                      >
                        {r.section}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b last:border-b-0">
                    <td className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap align-top">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${
                          changed ? "bg-red-500" : "bg-gray-300"
                        }`}
                      />
                      {r.label}
                    </td>
                    <td
                      className={`px-3 py-2 align-top ${
                        changed ? "bg-red-50 text-red-800" : "text-gray-500"
                      }`}
                    >
                      {isImg ? (
                        <ImageCell url={r.old} changed={changed} />
                      ) : (
                        <span className="whitespace-pre-wrap break-all">{r.old}</span>
                      )}
                    </td>
                    <td
                      className={`px-3 py-2 align-top ${
                        changed ? "bg-green-50 text-green-800" : "text-gray-500"
                      }`}
                    >
                      {isImg ? (
                        <ImageCell url={r.new} changed={changed} />
                      ) : (
                        <span className="whitespace-pre-wrap break-all">{r.new}</span>
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        {changedCount} field{changedCount !== 1 ? "s" : ""} changed ·{" "}
        {rows.length - changedCount} unchanged
      </p>
    </div>
  );
}
