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
type ProductTypeItem = {
  id: string;
  name: string;
  categoryTypeId: string;
};

type Props = {
  classificationId: string;
  item: ProductTypeItem;
};

export default function AddProductEditSelectProduct({
  classificationId,
  item,
}: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Product type name cannot be empty");
      return;
    }

    if (value.trim() === item.name) {
      setOpen(false);
      return;
    }

    try {
      setSaving(true);

      /* ==================================================
         1️⃣ UPDATE MASTER PRODUCT TYPE (productTypes)
      ================================================== */
      await updateDoc(
        doc(
          db,
          "classificationTypes",
          classificationId,
          "categoryTypes",
          item.categoryTypeId,
          "productTypes",
          item.id
        ),
        {
          name: value.trim(),
        }
      );

      /* ==================================================
         2️⃣ UPDATE ALL PRODUCTS USING THIS productTypeId
      ================================================== */
      const q = query(
        collection(db, "products"),
        where("productTypes", "array-contains-any", [
          {
            productTypeId: item.id,
            productTypeName: item.name,
            categoryTypeId: item.categoryTypeId,
          },
        ])
      );

      const snap = await getDocs(q);

      await Promise.all(
        snap.docs.map((p) => {
          const data = p.data();

          const updatedProductTypes = (data.productTypes || []).map(
            (pt: any) =>
              pt.productTypeId === item.id
                ? {
                    ...pt,
                    productTypeName: value.trim(),
                  }
                : pt
          );

          return updateDoc(p.ref, {
            productTypes: updatedProductTypes,
          });
        })
      );

      toast.success("Product type updated");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update product type");
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
          <DialogTitle>Edit Product Type</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Product Type Name</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter product type name..."
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
