"use client";

import Image from "next/image";
import React from "react";

type TechnicalSpecification = {
  title: string;
  specs: {
    specId: string;
    value: string;
  }[];
};

type Props = {
  open: boolean;
  company: "Lit" | "Lumera" | "Ecoshift" | "";
  productName: string;
  itemCode: string;
  mainImage?: { url: string };
  technicalSpecifications?: TechnicalSpecification[];
};

export default function GenerateTDSBrand({
  open,
  company,
  productName,
  itemCode,
  mainImage,
  technicalSpecifications,
}: Props) {
  if (!open || !company) return null;

  const BRAND = {
    Lit: {
      header: "/lit-header.png",
      footer: "/lit-footer.png",
    },
    Lumera: {
      header: "/lumera-header.png",
      footer: "/lumera-footer.png",
    },
    Ecoshift: {
      header: "/ecoshift-header.png",
      footer: "/ecoshift-footer.png",
    },
  };

  const selected = BRAND[company];

  if (!selected) return null;

  return (
    <div className="w-full flex justify-center bg-white pb-6">
      <div
        className="bg-white flex flex-col relative shadow-lg"
        style={{
          width: "816px",
          height: "1056px",
        }}
      >
        <Image
          src={selected.header}
          alt="Header"
          width={816}
          height={120}
          priority
          className="w-full h-auto"
        />

        <div className="px-8 pt-6 pb-4 flex flex-col flex-1 bg-white">
          <div className="grid grid-cols-[220px_1fr] gap-6 items-center mb-6">
            <div className="border border-black h-[150px] flex items-center justify-center bg-white">
              {mainImage?.url && (
                <img
                  src={mainImage.url}
                  className="max-h-[140px] object-contain"
                />
              )}
            </div>

            <div>
              <div className="text-xl font-semibold text-center">
                {productName || "Product Name"}
              </div>

              <div className="border-b border-black mt-4"></div>
            </div>
          </div>

          {/* ✅ BRAND + ITEM CODE TABLE */}
          <table className="w-full border border-black border-collapse text-sm mb-4 bg-white">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 w-[300px]">
                  Brand :
                </td>

                <td className="border border-black px-2 py-1 font-bold uppercase">
                  {company || "-"}
                </td>
              </tr>

              <tr>
                <td className="border border-black px-2 py-1">Item Code :</td>

                <td className="border border-black px-2 py-1">
                  {itemCode || "-"}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full border border-black border-collapse text-sm">
            <tbody>
              {technicalSpecifications?.map((group, i) => (
                <React.Fragment key={i}>
                  <tr>
                    <td
                      colSpan={2}
                      className="border border-black px-2 py-1 font-semibold bg-gray-300"
                    >
                      {group.title}
                    </td>
                  </tr>

                  {group.specs.map((spec, s) => (
                    <tr key={`${i}-${s}`}>
                      <td className="border border-black px-2 py-1 w-[300px]">
                        {spec.specId || "-"} :
                      </td>

                      <td className="border border-black px-2 py-1">
                        {spec.value || "-"}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col flex-1">
            <div className="grid grid-cols-2 mt-6 text-sm flex-1">
              <div className="flex flex-col min-h-[350px]">
                <div className="font-semibold">Dimensional Drawing</div>

                <div className="flex-1"></div>
              </div>

              <div className="flex flex-col min-h-[350px]">
                <div className="font-semibold">Illuminance Level</div>

                <div className="flex-1"></div>
              </div>
            </div>
          </div>
        </div>

        <Image
          src={selected.footer}
          alt="Footer"
          width={816}
          height={120}
          priority
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
