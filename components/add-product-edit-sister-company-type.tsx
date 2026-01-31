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
type SisterCompany = {
  id: string;
  name: string;
};

type Props = {
  item: SisterCompany;
};

export default function AddProductEditSisterCompanyType({ item }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Sister company name cannot be empty");
      return;
    }

    if (value.trim() === item.name) {
      setOpen(false);
      return;
    }

    setSaving(true);

    try {
      // 1️⃣ Update master sister company
      await updateDoc(doc(db, "sisterCompanies", item.id), {
        name: value.trim(),
      });

      // 2️⃣ Update ALL products using this sister company
      const q = query(
        collection(db, "products"),
        where("sisterCompanyId", "==", item.id),
      );

      const snap = await getDocs(q);

      await Promise.all(
        snap.docs.map((p) =>
          updateDoc(p.ref, {
            sisterCompanyName: value.trim(),
          }),
        ),
      );

      toast.success("Sister company updated");
      setOpen(false);
    } finally {
      // 🔕 WALANG error toast — intentionally removed
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
          <DialogTitle>Edit Sister Company</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Sister Company Name</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter sister company name..."
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
