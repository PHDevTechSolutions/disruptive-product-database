"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  product: any;
  onConfirm: (filteredProduct: any) => void;
};

export default function MultipleSpecsDetected({
  open,
  onClose,
  product,
  onConfirm,
}: Props) {
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string>>(
    {}
  );

  if (!product) return null;

  /* ================= PIPE SPECS ================= */
  const pipeSpecs =
    product.technicalSpecifications?.flatMap((group: any) =>
      group.specs
        ?.map((spec: any) => {
          const values = (spec.value || "")
            .split("|")
            .map((v: string) => v.trim())
            .filter(Boolean);

          if (values.length > 1) {
            return { specId: spec.specId, values };
          }
          return null;
        })
        .filter(Boolean)
    ) || [];

  /* ================= SELECT ================= */
  const handleSelect = (specId: string, value: string) => {
    setSelectedSpecs((prev) => ({
      ...prev,
      [specId]: value,
    }));
  };

  /* ================= VALIDATION ================= */
  const isComplete = pipeSpecs.every(
    (spec: any) => selectedSpecs[spec.specId]
  );

  /* ================= SUBMIT ================= */
  const handleSubmit = () => {
    const updated = {
      ...product,
      technicalSpecifications: product.technicalSpecifications.map(
        (group: any) => ({
          ...group,
          specs: group.specs.map((spec: any) => {
            if (selectedSpecs[spec.specId]) {
              return {
                ...spec,
                value: selectedSpecs[spec.specId],
              };
            }
            return spec;
          }),
        })
      ),
    };

    onConfirm(updated);
    onClose();
    setSelectedSpecs({});
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Multiple Specs Detected</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-auto">
          {product.technicalSpecifications?.map((group: any, gi: number) => (
            <div key={gi}>
              <p className="font-semibold">{group.title}</p>

              {group.specs?.map((spec: any, si: number) => {
                const values = (spec.value || "")
                  .split("|")
                  .map((v: string) => v.trim())
                  .filter(Boolean);

                if (values.length <= 1) return null;

                return (
                  <div key={si} className="mt-2">
                    <p className="text-sm">{spec.specId}</p>

                    <div className="flex flex-wrap gap-2 mt-1">
                      {values.map((v: string, i: number) => {
                        const isSelected =
                          selectedSpecs[spec.specId] === v;

                        return (
                          <Button
                            key={i}
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() =>
                              handleSelect(spec.specId, v)
                            }
                          >
                            {v}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Progress */}
        <p className="text-xs text-muted-foreground">
          {Object.keys(selectedSpecs).length} / {pipeSpecs.length} selected
        </p>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button disabled={!isComplete} onClick={handleSubmit}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}