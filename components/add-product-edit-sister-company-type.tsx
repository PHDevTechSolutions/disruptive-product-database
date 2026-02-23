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
type Brand = {
  id: string;
  name: string;
};

type Props = {
  item: Brand;
};

export default function AddProductEditBrandType({ item }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Brand name cannot be empty");
      return;
    }

    if (value.trim() === item.name) {
      setOpen(false);
      return;
    }

    setSaving(true);

    try {
      /* 1️⃣ UPDATE MASTER BRAND */
      await updateDoc(doc(db, "brands", item.id), {
        name: value.trim(),
      });

      /* 2️⃣ UPDATE ALL PRODUCTS USING THIS BRAND */
      const q = query(
        collection(db, "products"),
        where("brandId", "==", item.id),
      );

      const snap = await getDocs(q);

      await Promise.all(
        snap.docs.map((p) =>
          updateDoc(p.ref, {
            brandName: value.trim(),
          }),
        ),
      );

      toast.success("Brand updated");
      setOpen(false);
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
          <DialogTitle>Edit Brand</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Brand Name</Label>

          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter brand name..."
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
