"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
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
import { useUser } from "@/contexts/UserContext";
import { logProductFamilyEvent } from "@/lib/auditlogger"; // ✅ AUDIT

type ProductFamilyItem = {
  id: string;
  name: string;
  productUsageId: string;
};

type Props = {
  item: ProductFamilyItem;
};

export default function AddProductEditSelectProduct({ item }: Props) {
  const { userId } = useUser();
  const [referenceID, setReferenceID] = useState<string>("");

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.name);
  const [saving, setSaving] = useState(false);

  /* ── Fetch referenceID for audit log ── */
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setReferenceID(d.ReferenceID ?? ""))
      .catch(console.error);
  }, [userId]);

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

      /* ✅ UPDATE PRODUCT FAMILY */
      await updateDoc(doc(db, "productFamilies", item.id), {
        name        : value.trim(),
        whatHappened: "Product Family Edited",
        date_updated: serverTimestamp(),
      });

      /* ✅ UPDATE PRODUCTS */
      const q = query(
        collection(db, "products"),
        where("productFamilies", "array-contains-any", [
          {
            productFamilyId  : item.id,
            productFamilyName: item.name,
            productUsageId   : item.productUsageId,
          },
        ]),
      );
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((p) => {
          const data = p.data();
          const updatedProductFamilies = (data.productFamilies || []).map(
            (pf: any) =>
              pf.productFamilyId === item.id
                ? { ...pf, productFamilyName: value.trim() }
                : pf,
          );
          return updateDoc(p.ref, { productFamilies: updatedProductFamilies });
        }),
      );

      // ✅ AUDIT LOG — with referenceID so Performed By resolves to full name
      await logProductFamilyEvent({
        whatHappened     : "Product Family Edited",
        productFamilyId  : item.id,
        productFamilyName: value.trim(),
        productUsageId   : item.productUsageId,
        referenceID      : referenceID || undefined,
        userId           : userId ?? undefined,
        extra            : { previousName: item.name },
      });

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
          <Input value={value} onChange={(e) => setValue(e.target.value)} disabled={saving} />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
