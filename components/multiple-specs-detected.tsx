"use client";

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
  if (!product) return null;

  const handleSelect = (specId: string, selectedValue: string) => {
    const updated = {
      ...product,
      technicalSpecifications: product.technicalSpecifications.map((group: any) => ({
        ...group,
        specs: group.specs.map((spec: any) => {
          if (spec.specId !== specId) return spec;

          return {
            ...spec,
            value: selectedValue, // 🔥 override
          };
        }),
      })),
    };

    onConfirm(updated);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Multiple Specs Detected</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
                      {values.map((v: string, i: number) => (
                        <Button
                          key={i}
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelect(spec.specId, v)}
                        >
                          {v}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}