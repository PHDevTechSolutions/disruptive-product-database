"use client";

import Image from "next/image";

type Props = {
  open: boolean;

  /* CTRL + F: COMPANY PROP */
  company: "Lit" | "Lumera" | "Ecoshift" | "";

  /* CTRL + F: BRAND PROP */
  brand: string;

  /* CTRL + F: ITEM CODE PROP */
  itemCode: string;
};

export default function GenerateTDSBrand({
  open,
  company,
  brand,
  itemCode,
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
    <div className="w-full flex justify-center px-2 md:px-0">
      {/* PAPER */}
      <div
        className="bg-white shadow-xl flex flex-col relative w-full max-w-[216mm]"
        style={{
          minHeight: "279mm",
        }}
      >
        {/* HEADER */}
        <Image
          src={selected.header}
          alt="Header"
          width={816}
          height={120}
          priority
          className="w-full h-auto"
        />

        {/* BODY */}
        <div className="flex-1 p-4 md:p-[20mm] space-y-6">

          {/* CTRL + F: BRAND DISPLAY */}
          <div className="grid grid-cols-2 gap-4 text-sm">

            <div>
              <span className="font-semibold">Brand:</span>
              <div>{brand || "-"}</div>
            </div>

            <div>
              <span className="font-semibold">Item Code:</span>
              <div>{itemCode || "-"}</div>
            </div>

          </div>


          {/* EXISTING GRID */}
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">

            {/* LEFT SIDE */}
            <div className="space-y-4">

              <div className="border p-4">
                Product Image
              </div>

              <div className="border p-4">
                Fixture Details Table
              </div>

            </div>


            {/* RIGHT SIDE */}
            <div className="border p-4">
              Technical Specifications Table
            </div>


          </div>
        </div>

        {/* FOOTER */}
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