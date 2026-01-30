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
type Product = {
  id: string;        // productId
  name: string;      // productName
};

type Props = {
  item: Product;
};

export default function AddProductSelectProduct({ item }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Product name cannot be empty");
      return;
    }

    if (value.trim() === item.name) {
      setOpen(false);
      return;
    }

    try {
      setSaving(true);

      /* 1️⃣ Update MASTER product */
      await updateDoc(doc(db, "products", item.id), {
        productName: value.trim(),
      });

      /* 2️⃣ Update ALL references that store productId + productName */
      // ⚠️ Example: other collections that reference productId
      // If wala pa ngayon, future-proof na ito

      const q = query(
        collection(db, "products"),
        where("productId", "==", item.id),
      );

      const snap = await getDocs(q);

      await Promise.all(
        snap.docs.map((p) =>
          updateDoc(p.ref, {
            productName: value.trim(),
          }),
        ),
      );

      toast.success("Product updated successfully");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to update product");
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
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Product Name</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter product name..."
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
