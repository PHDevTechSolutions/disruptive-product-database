"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
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

type ProductFamilyItem = {
  id: string;
  name: string;
  productUsageId: string;
};

type Props = {
  item: ProductFamilyItem;
};

export default function AddProductEditSelectProduct({
  item,
}: Props) {

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {

    if (!value.trim()) {
      toast.error("Product family name cannot be empty");
      return;
    }

    if (value.trim() === item.name) {
      setOpen(false);
      return;
    }

    try {

      setSaving(true);

      /* ✅ FIXED PATH */
      await updateDoc(
        doc(
          db,
          "categoryTypes",
          item.productUsageId,
          "productFamilies",
          item.id
        ),
        {
          name: value.trim(),
        }
      );

      /* ==================================================
         UPDATE ALL PRODUCTS USING THIS productFamilyId
      ================================================== */

      const q = query(
        collection(db, "products"),
        where("productFamilies", "array-contains-any", [
          {
            productFamilyId: item.id,
            productFamilyName: item.name,
            productUsageId: item.productUsageId,
          },
        ])
      );

      const snap = await getDocs(q);

      await Promise.all(
        snap.docs.map((p) => {

          const data = p.data();

          const updatedProductFamilies =
            (data.productFamilies || []).map((pf: any) =>

              pf.productFamilyId === item.id
                ? {
                    ...pf,
                    productFamilyName: value.trim(),
                  }
                : pf

            );

          return updateDoc(p.ref, {
            productFamilies: updatedProductFamilies,
          });

        })
      );

      toast.success("Product family updated");

      setOpen(false);

    } catch (error) {

      console.error(error);

      toast.error("Failed to update product family");

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

      <DialogContent className="sm:max-w-[400px]">

        <DialogHeader>

          <DialogTitle>Edit Product Family</DialogTitle>

        </DialogHeader>

        <div className="space-y-2">

          <Label>Product Family Name</Label>

          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter product family name..."
            disabled={saving}
          />

        </div>

        <DialogFooter className="gap-2">

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