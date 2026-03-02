"use client";

import Image from "next/image";
import React, { useRef, useEffect, useState } from "react";

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

  const contentRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);

  const PAPER_HEIGHT = 1056;
  const HEADER_HEIGHT = 120;
  const FOOTER_HEIGHT = 100;
  const CONTENT_AREA = PAPER_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

  useEffect(() => {
    if (!contentRef.current) return;

    const contentHeight = contentRef.current.scrollHeight;

    const newScale = CONTENT_AREA / contentHeight;

    setScale(newScale);
  }, [technicalSpecifications, productName, itemCode]);

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
        className="bg-white relative shadow-lg overflow-hidden"
        style={{
          width: "100%", // Set width to 100% to allow full-screen layout
          maxWidth: "816px", // Maintain a maximum width
          height: "1056px",
        }}
      >
        {/* HEADER */}
        <Image
          src={selected.header}
          alt="Header"
          width={816}
          height={HEADER_HEIGHT}
          priority
          className="w-full"
        />

        {/* CENTER AREA */}
        <div
          style={{
            height: CONTENT_AREA,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflow: "hidden",
          }}
        >
          {/* SCALE WRAPPER */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              width: `${820 / scale}px`,
              margin: "0 20px", // Margin between left and right panels
            }}
          >
            {/* CONTENT */}
            <div
              ref={contentRef}
              className="px-8 pt-6 pb-2 bg-white"
            >
              {/* IMAGE + NAME */}
              <div className="grid grid-cols-[220px_1fr] gap-6 items-center mb-4">
                <div className="border border-black h-[150px] flex items-center justify-center">
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

              {/* BRAND TABLE */}
              <table className="w-full border border-black border-collapse text-sm mb-3">
                <tbody>
                  <tr>
                    <td className="border border-black px-2 py-1 w-[300px]">
                      Brand :
                    </td>
                    <td className="border border-black px-2 py-1 font-bold uppercase">
                      {company}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-1">
                      Item Code :
                    </td>
                    <td className="border border-black px-2 py-1">
                      {itemCode}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* TECH SPECS */}
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
                        <tr key={s}>
                          <td className="border border-black px-2 py-1 w-[300px]">
                            {spec.specId}
                          </td>
                          <td className="border border-black px-2 py-1">
                            {spec.value}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {/* DRAWING */}
              <div className="grid grid-cols-2 mt-4 text-sm min-h-[120px]">
                <div>
                  <div className="font-semibold">Dimensional Drawing</div>
                </div>
                <div>
                  <div className="font-semibold">Illuminance Level</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <Image
          src={selected.footer}
          alt="Footer"
          width={816}
          height={FOOTER_HEIGHT}
          priority
          className="absolute bottom-0 left-0 w-full"
        />
      </div>
    </div>
  );
}