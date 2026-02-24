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

/* ---------------- Types ---------------- */

type SpecRow = {
  specId: string;
  unit: string;

  isRanging: boolean;
  isSlashing: boolean;
  isDimension: boolean;
  isRating: boolean;

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
  productFamilyId: string; // ✅ FIXED

  technicalSpecificationId: string;

  title: string;
  specs: SpecRow[];
  units: string[];
};

export default function AddProductEditSelectTechnicalSpecification({
  classificationId,
  categoryTypeId,
  productFamilyId,
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
            isRating: false,
          };
        }

        return {
          ...row,
          isRanging: mode === "isRanging",
          isSlashing: mode === "isSlashing",
          isDimension: mode === "isDimension",
          isRating: mode === "isRating",

          unit:
            mode === "isSlashing" || mode === "isRating"
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
        "productFamilies", // ✅ FIXED
        productFamilyId,
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

              <Input
                placeholder="Value"
                value={row.value}
                onChange={(e) =>
                  updateSpecField(index, "value", e.target.value)
                }
              />

              <Input
                placeholder="Unit"
                value={row.unit}
                onChange={(e) =>
                  updateSpecField(index, "unit", e.target.value)
                }
              />

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