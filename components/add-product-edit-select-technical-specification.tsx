"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SpecRow = {
  specId: string;
  unit: string;

  isRanging: boolean;
  isSlashing: boolean;
  isDimension: boolean;
  isIPRating: boolean;

  value: string;

  rangeFrom: string;
  rangeTo: string;

  slashValues: string[];

  length: string;
  width: string;
  height: string;

  ipFirst: string;
  ipSecond: string;
};

type Props = {
  classificationId: string;
  categoryTypeId: string;
  productTypeId: string;

  technicalSpecificationId: string;

  title: string;
  specs: SpecRow[];
  units: string[];
};

export default function AddProductEditSelectTechnicalSpecification({
  classificationId,
  categoryTypeId,
  productTypeId,
  technicalSpecificationId,
  title,
  specs,
  units,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [localTitle, setLocalTitle] = useState(title);
  const [localSpecs, setLocalSpecs] = useState<SpecRow[]>(specs);

  const updateSpecField = (
    index: number,
    field: keyof SpecRow,
    value: any
  ) => {
    setLocalSpecs((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const toggleMode = (index: number, mode: keyof SpecRow) => {
    setLocalSpecs((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        if (row[mode]) {
          return {
            ...row,
            isRanging: false,
            isSlashing: false,
            isDimension: false,
            isIPRating: false,
          };
        }

        return {
          ...row,
          isRanging: mode === "isRanging",
          isSlashing: mode === "isSlashing",
          isDimension: mode === "isDimension",
          isIPRating: mode === "isIPRating",

          unit:
            mode === "isSlashing" || mode === "isIPRating"
              ? ""
              : row.unit,
        };
      })
    );
  };

  const handleSave = async () => {
    if (!localTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      setSaving(true);

      const ref = doc(
        db,
        "classificationTypes",
        classificationId,
        "categoryTypes",
        categoryTypeId,
        "productTypes",
        productTypeId,
        "technicalSpecifications",
        technicalSpecificationId
      );

      await updateDoc(ref, {
        title: localTitle,
        specs: localSpecs,
        units: units || [],
      });

      toast.success("Technical Specification updated");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update technical specification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Edit Technical Specification</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          {localSpecs.map((row, index) => (
            <div key={index} className="border p-3 rounded space-y-2">
              <Input
                placeholder="Specification"
                value={row.specId}
                onChange={(e) =>
                  updateSpecField(index, "specId", e.target.value)
                }
              />

              {!row.isRanging &&
                !row.isSlashing &&
                !row.isDimension &&
                !row.isIPRating && (
                  <Input
                    placeholder="Value"
                    value={row.value}
                    onChange={(e) =>
                      updateSpecField(index, "value", e.target.value)
                    }
                  />
                )}

              {row.isRanging && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="From"
                    value={row.rangeFrom}
                    onChange={(e) =>
                      updateSpecField(
                        index,
                        "rangeFrom",
                        e.target.value
                      )
                    }
                  />
                  <span>-</span>
                  <Input
                    placeholder="To"
                    value={row.rangeTo}
                    onChange={(e) =>
                      updateSpecField(index, "rangeTo", e.target.value)
                    }
                  />
                </div>
              )}

              {!row.isSlashing && !row.isIPRating && (
                <Input
                  placeholder="Unit"
                  value={row.unit}
                  onChange={(e) =>
                    updateSpecField(index, "unit", e.target.value)
                  }
                />
              )}

              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={row.isRanging}
                    onChange={() => toggleMode(index, "isRanging")}
                  />
                  isRanging
                </label>

                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={row.isSlashing}
                    onChange={() => toggleMode(index, "isSlashing")}
                  />
                  isSlashing
                </label>

                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={row.isDimension}
                    onChange={() => toggleMode(index, "isDimension")}
                  />
                  isDimension
                </label>

                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={row.isIPRating}
                    onChange={() => toggleMode(index, "isIPRating")}
                  />
                  isIPRating
                </label>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
