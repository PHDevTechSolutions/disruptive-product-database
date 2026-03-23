"use client";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import {
  doc,
  updateDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";

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
import { logProductUsageEvent } from "@/lib/auditlogger"; // ✅ AUDIT

type CategoryType = {
  id: string;
  name: string;
};

type Props = {
  item: CategoryType;
};

export default function AddProductSelectCategoryType({ item }: Props) {
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
      toast.error("Category type name cannot be empty");
      return;
    }
    if (value.trim() === item.name) {
      setOpen(false);
      return;
    }

    try {
      setSaving(true);

      /* ✅ UPDATE MASTER CATEGORY TYPE */
      await updateDoc(doc(db, "categoryTypes", item.id), {
        name        : value.trim(),
        whatHappened: "Product Usage Edited",
        date_updated: serverTimestamp(),
      });

      /* ✅ UPDATE PRODUCTS USING THIS CATEGORY TYPE */
      const snap = await getDocs(query(collection(db, "products")));
      await Promise.all(
        snap.docs
          .filter((p) =>
            (p.data().categoryTypes || []).some(
              (c: any) => c.productUsageId === item.id,
            ),
          )
          .map((p) => {
            const data = p.data();
            const updatedCategoryTypes = (data.categoryTypes || []).map(
              (c: any) =>
                c.productUsageId === item.id
                  ? { ...c, categoryTypeName: value.trim() }
                  : c,
            );
            return updateDoc(p.ref, { categoryTypes: updatedCategoryTypes });
          }),
      );

      // ✅ AUDIT LOG — with referenceID so Performed By resolves to full name
      await logProductUsageEvent({
        whatHappened    : "Product Usage Edited",
        productUsageId  : item.id,
        productUsageName: value.trim(),
        referenceID     : referenceID || undefined,
        userId          : userId ?? undefined,
        extra           : { previousName: item.name },
      });

      toast.success("Category type updated");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update category type");
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
          <DialogTitle>Edit Category Type</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Category Type Name</Label>
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
