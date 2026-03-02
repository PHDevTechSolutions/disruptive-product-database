"use client";

import Image from "next/image";

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

  brand: string;

  itemCode: string;

  mainImage?: { url: string };

  technicalSpecifications?: TechnicalSpecification[];
};

export default function GenerateTDSBrand({
  open,
  company,
  brand,
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
    <div className="w-full flex justify-center px-2 md:px-0">
      <div
        className="bg-white shadow-xl flex flex-col relative w-full max-w-[216mm]"
        style={{
          minHeight: "279mm",
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

        <div className="flex-1 p-4 md:p-[20mm] space-y-6">

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

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">

            <div className="space-y-4">

              <div className="border p-4 flex justify-center items-center min-h-[200px]">
                {mainImage?.url ? (
                  <img
                    src={mainImage.url}
                    className="max-h-[180px] object-contain"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No Image
                  </span>
                )}
              </div>

              <div className="border p-4 text-sm">
                Fixture Details Table
              </div>

            </div>

            <div className="border p-4">

              {!technicalSpecifications?.length && (
                <div className="text-sm text-muted-foreground text-center">
                  No Technical Specifications
                </div>
              )}

              {technicalSpecifications?.map((group, i) => (
                <div key={i} className="mb-4">

                  <div className="font-semibold mb-2">
                    {group.title}
                  </div>

                  <table className="w-full border text-sm">

                    <tbody>

                      {group.specs.map((spec, s) => (
                        <tr key={s}>

                          <td className="border p-2 font-semibold w-[50%]">
                            {spec.specId || "-"}
                          </td>

                          <td className="border p-2">
                            {spec.value || "-"}
                          </td>

                        </tr>
                      ))}

                    </tbody>

                  </table>

                </div>
              ))}

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