"use client";

import Image from "next/image";

type Props = {
  open: boolean;
  company: "Lit" | "Lumera" | "Ecoshift" | "";
};

export default function GenerateTDSBrand({ open, company }: Props) {
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
        <div className="flex-1 p-4 md:p-[20mm]">

          {/* RESPONSIVE GRID FIX IS HERE */}
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