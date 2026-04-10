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

function convertGoogleDriveUrl(url?: string) {
  if (!url) return "";
  if (!url.includes("drive.google.com")) return url;

  let fileId = "";
  const match1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) fileId = match1[1];
  if (match2 && match2[1]) fileId = match2[1];

  if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  return url;
}

type Props = {
  open: boolean;
  company: "Lit" | "Lumera" | "Ecoshift" | "";
  productName: string;
  itemCode: string;
  mainImage?: { url: string };
  dimensionalDrawing?: File | { url: string } | null;
  illuminanceLevel?: File | { url: string } | null;
  technicalSpecifications?: TechnicalSpecification[];
  hideEmptySpecs?: boolean;
};

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
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [wrapperScale, setWrapperScale] = useState(1);

    const PAPER_WIDTH = 816;
    const PAPER_HEIGHT = 1056;
    const HEADER_HEIGHT = 120;
    const FOOTER_HEIGHT = 100;
    const SAFE_BOTTOM_MARGIN = 20;
    const CONTENT_AREA = PAPER_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - SAFE_BOTTOM_MARGIN;

    /* ── Scale content height to fit single page ── */
    useEffect(() => {
      const calculateScale = () => {
        if (!contentRef.current) return;
        const contentHeight = contentRef.current.scrollHeight;
        if (!contentHeight) return;
        if (contentHeight > CONTENT_AREA) {
          setScale(CONTENT_AREA / contentHeight);
        } else {
          setScale(1);
        }
      };

      calculateScale();

      const images = contentRef.current?.querySelectorAll("img");
      if (images && images.length > 0) {
        let loaded = 0;
        images.forEach((img) => {
          if (img.complete) {
            loaded++;
          } else {
            img.onload = () => {
              loaded++;
              if (loaded === images.length) calculateScale();
            };
          }
        });
        if (loaded === images.length) calculateScale();
      }

      const timeout = setTimeout(calculateScale, 150);
      return () => clearTimeout(timeout);
    }, [technicalSpecifications, productName, itemCode, dimensionalDrawing, illuminanceLevel, hideEmptySpecs]);

    /* ── Scale the whole A4 paper to fit the container width on mobile ── */
    useEffect(() => {
      const updateWrapperScale = () => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.offsetWidth ?? window.innerWidth;
        if (containerWidth < PAPER_WIDTH) {
          setWrapperScale(containerWidth / PAPER_WIDTH);
        } else {
          setWrapperScale(1);
        }
      };

      updateWrapperScale();
      window.addEventListener("resize", updateWrapperScale);
      return () => window.removeEventListener("resize", updateWrapperScale);
    }, []);

    if (!open || !company) return null;

    const BRAND = {
      Lit: { header: "/lit-header.png", footer: "/lit-footer.png" },
      Lumera: { header: "/lumera-header.png", footer: "/lumera-footer.png" },
      Ecoshift: { header: "/ecoshift-header.png", footer: "/ecoshift-footer.png" },
    };

    const selected = BRAND[company];
    if (!selected) return null;

    const scaledHeight = PAPER_HEIGHT * wrapperScale;

    return (
      /* Outer: measures available width, collapses to scaled height */
      <div
        ref={containerRef}
        className="w-full flex justify-center bg-white"
        style={{
          height: scaledHeight,
          // Extra breathing room so the bottom sidebar doesn't overlap
          paddingBottom: wrapperScale < 1 ? 70 : 0,
          boxSizing: "content-box",
        }}
      >
        {/* Inner A4 paper — scaled from top-center so it stays centered */}
        <div
          ref={ref}
          className="bg-white relative shadow-lg overflow-hidden flex-shrink-0"
          style={{
            width: PAPER_WIDTH,
            height: PAPER_HEIGHT,
            transform: wrapperScale < 1 ? `scale(${wrapperScale})` : undefined,
            transformOrigin: "top center",
          }}
        >
          {/* HEADER */}
          <Image
            src={selected.header}
            alt="Header"
            width={816}
            height={HEADER_HEIGHT}
            priority
            className="absolute top-0 left-0 w-full"
          />

          {/* CONTENT AREA */}
          <div
            style={{
              height: CONTENT_AREA,
              marginTop: HEADER_HEIGHT,
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
                <div className="grid grid-cols-[220px_1fr] gap-6 items-center mb-2">
                  <div className="w-[220px] h-[150px] border-2 border-black flex items-center justify-center bg-white">
                    {mainImage?.url ? (
                      <img
                        src={convertGoogleDriveUrl(mainImage.url)}
                        className="max-h-[130px] max-w-[200px] object-contain"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">PRODUCT IMAGE</span>
                    )}
                  </div>

                  <div className="w-full">
                    <div className="text-xl font-semibold break-words overflow-hidden">
                      <div
                        className="w-full font-bold text-center leading-[1.3]"
                        style={{
                          fontSize:
                            productName.length > 70
                              ? "18px"
                              : productName.length > 50
                                ? "20px"
                                : productName.length > 30
                                  ? "22px"
                                  : "26px",
                          lineHeight: "1.3",
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                        }}
                      >
                        {productName || "Product Name"}
                      </div>
                      <div className="mt-2 flex justify-center">
                        <div className="w-[75%] border-t-2 border-black" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BRAND TABLE */}
                <table className="w-full border border-black border-collapse text-[16px] mb-3">
                  <tbody>
                    <tr>
                      <td className="border border-black px-2 py-1 w-[300px]">Brand :</td>
                      <td className="border border-black px-2 py-1 font-bold uppercase">{company}</td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1">Item Code :</td>
                      <td className="border border-black px-2 py-1">{itemCode}</td>
                    </tr>
                  </tbody>
                </table>

                {/* TECH SPECS */}
                <table className="w-full border border-black border-collapse text-[16px]">
                  <tbody>
                    {technicalSpecifications
                      ?.filter((group) => group.title !== "COMMERCIAL DETAILS")
                      .map((group, i) => {
                        const specsToRender = hideEmptySpecs
                          ? group.specs.filter(
                              (spec) => spec.value && spec.value.trim() !== "",
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
                                  {Array.from(
                                    new Set(
                                      spec.value
                                        ?.split("|")
                                        .map((v) => v.trim())
                                        .filter(Boolean),
                                    ),
                                  )
                                    .filter((v) => {
                                      if (!Array.isArray((window as any).__ACTIVE_FILTERS__))
                                        return true;
                                      return (window as any).__ACTIVE_FILTERS__.includes(v);
                                    })
                                    .join(" | ") || spec.value}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>

                {/* DRAWINGS */}
                {(dimensionalDrawing || illuminanceLevel) && (
                  <div
                    className={`grid gap-4 mt-4 text-[15px] min-h-[120px] ${
                      dimensionalDrawing && illuminanceLevel ? "grid-cols-2" : "grid-cols-1 place-items-center"
                    }`}
                  >
                    {dimensionalDrawing && (
                      <div className="flex flex-col items-center">
                        <div className="font-semibold mb-2">Dimensional Drawing</div>
                        <img
                          src={
                            dimensionalDrawing instanceof File
                              ? URL.createObjectURL(dimensionalDrawing)
                              : convertGoogleDriveUrl(dimensionalDrawing.url)
                          }
                          className="w-[220px] h-[120px] object-contain"
                        />
                      </div>
                    )}

                    {illuminanceLevel && (
                      <div className="flex flex-col items-center">
                        <div className="font-semibold mb-2">Illuminance Level</div>
                        <img
                          src={
                            illuminanceLevel instanceof File
                              ? URL.createObjectURL(illuminanceLevel)
                              : convertGoogleDriveUrl(illuminanceLevel.url)
                          }
                          className="w-[220px] h-[120px] object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
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
