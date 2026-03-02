"use client";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GenerateTDS({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="h-full flex flex-col bg-white">

      {/* HEADER */}
      <div className="border-b px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Generate TDS
        </h2>

        <Button
          variant="outline"
          onClick={onClose}
        >
          Close
        </Button>
      </div>


      {/* BODY */}
      <div className="p-6 flex-1 overflow-auto">

        <p className="text-sm text-muted-foreground">
          This is a dummy Generate TDS panel.
        </p>

      </div>


      {/* FOOTER */}
      <div className="border-t px-6 py-4 flex justify-end gap-2">

        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => {}}
        >
          Generate
        </Button>

        <Button
          variant="secondary"
          onClick={onClose}
        >
          Cancel
        </Button>

      </div>

    </div>
  );
}