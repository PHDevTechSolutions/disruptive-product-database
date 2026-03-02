"use client";

import Image from "next/image";

type Props = {
  open: boolean;
};

export default function GenerateTDSLit({ open }: Props) {
  if (!open) return null;

  return (
    <div className="flex justify-center">
      <div className="w-[180mm] min-h-[297mm] bg-white shadow-xl flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <div className="w-full shrink-0">
          <Image
            src="/lit-header.png"
            alt="Lit Header"
            width={794}
            height={120}
            className="w-full h-auto object-cover"
            priority
          />
        </div>

        {/* BODY */}
        <div className="flex-1 p-10">
          <div className="text-center text-gray-400 text-sm">
            Lit TDS Body Content (Dummy)
          </div>
        </div>

        {/* FOOTER */}
        <div className="w-full shrink-0">
          <Image
            src="/lit-footer.png"
            alt="Lit Footer"
            width={794}
            height={120}
            className="w-full h-auto object-cover"
            priority
          />
        </div>

      </div>
    </div>
  );
}