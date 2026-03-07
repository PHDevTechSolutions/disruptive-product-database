"use client";

import Image from "next/image";
import React, { useRef, useEffect, useState, forwardRef } from "react";

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
  dimensionalDrawing?: File | null;
  illuminanceLevel?: File | null;
  hideEmptySpecs?: boolean;
};

function convertGoogleDriveUrl(url: string) {
  if (!url) return url;

  if (url.includes("drive.google.com")) {
    const match = url.match(/\/d\/(.*?)\//);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }

  return url;
}

const GenerateTDSBrand = forwardRef<HTMLDivElement, Props>(
  (
    {
      open,
      company,
      productName,
      itemCode,
      mainImage,
      technicalSpecifications,
      dimensionalDrawing,
      illuminanceLevel,
      hideEmptySpecs,
    },
    ref,
  ) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    const PAPER_HEIGHT = 1056;
    const HEADER_HEIGHT = 120;
    const FOOTER_HEIGHT = 100;
const SAFE_BOTTOM_MARGIN = 20;
const CONTENT_AREA =
  PAPER_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - SAFE_BOTTOM_MARGIN;

useEffect(() => {
  if (!contentRef.current) return;

  const contentHeight = contentRef.current.scrollHeight;

  if (!contentHeight) return;

  const availableHeight = CONTENT_AREA;

  if (contentHeight > availableHeight) {
    const newScale = availableHeight / contentHeight;
    setScale(newScale);
  } else {
    setScale(1);
  }
}, [
  technicalSpecifications,
  productName,
  itemCode,
  dimensionalDrawing,
  illuminanceLevel,
  hideEmptySpecs,
]);

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
      <div ref={ref} className="w-full flex justify-center bg-white">
        <div
          className="bg-white relative shadow-lg overflow-hidden"
          style={{
            width: "100%",
            maxWidth: "816px",
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
                width: "780px",
                margin: "0",
              }}
            >
              <div ref={contentRef} className="px-4 pt-6 pb-2 bg-white">
                {/* IMAGE + PRODUCT NAME */}
                <div className="grid grid-cols-[220px_1fr] gap-6 items-center mb-4">
                  <div className="w-[220px] h-[150px] border-2 border-black flex items-center justify-center bg-white">
                    {mainImage?.url ? (
<img
  src={convertGoogleDriveUrl(mainImage.url)}
  className="max-h-[130px] max-w-[200px] object-contain"
/>
                    ) : (
                      <span className="text-xs text-gray-400">
                        PRODUCT IMAGE
                      </span>
                    )}
                  </div>

                  <div className="w-full">
<div className="text-xl font-semibold break-words overflow-hidden">
  <div
    className="w-full text-left font-semibold break-words"
    style={{
      fontSize: productName.length > 20 ? "20px" : "28px",
      lineHeight: "1.4",
    }}
  >
    {productName || "Product Name"}
  </div>
</div>
                  </div>
                </div>

                {/* BRAND TABLE */}
                <table className="w-full border border-black border-collapse text-[16px] mb-3">
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
                <table className="w-full border border-black border-collapse text-[16px]">
<tbody>
  {technicalSpecifications?.map((group, i) => {
    const specsToRender = hideEmptySpecs
      ? group.specs.filter(
          (spec) => spec.value && spec.value.trim() !== ""
        )
      : group.specs;

    if (hideEmptySpecs && specsToRender.length === 0) return null;

    return (
      <React.Fragment key={i}>
        <tr>
          <td
            colSpan={2}
            className="border border-black px-2 py-1 font-semibold bg-gray-300"
          >
            {group.title}
          </td>
        </tr>

        {specsToRender.map((spec, s) => (
          <tr key={s}>
            <td className="border border-black px-2 py-1 w-[300px]">
              {spec.specId} :
            </td>
            <td className="border border-black px-2 py-1">
              {spec.value}
            </td>
          </tr>
        ))}
      </React.Fragment>
    );
  })}
</tbody>
                </table>

                {/* DRAWINGS */}
                <div className="grid grid-cols-2 gap-4 mt-4 text-[15px] min-h-[120px]">
                  <div className="flex flex-col items-center">
                    <div className="font-semibold mb-2">
                      Dimensional Drawing
                    </div>
                    {dimensionalDrawing && (
                      <img
                        src={URL.createObjectURL(dimensionalDrawing)}
                        className="w-[220px] h-[120px] object-contain"
                      />
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="font-semibold mb-2">Illuminance Level</div>
                    {illuminanceLevel && (
                      <img
                        src={URL.createObjectURL(illuminanceLevel)}
                        className="w-[220px] h-[120px] object-contain"
                      />
                    )}
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
  },
);

GenerateTDSBrand.displayName = "GenerateTDSBrand";

export default GenerateTDSBrand;
