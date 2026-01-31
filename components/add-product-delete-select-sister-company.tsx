"use client";

import { useState } from "react";
import { Minus } from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
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

/* ---------------- Types ---------------- */
type SisterCompany = {
  id: string;
  name: string;
};

type Props = {
  item: SisterCompany;
  referenceID: string; // 🔑 kung sino nag delete
};

export default function AddProductDeleteSisterCompany({
  item,
  referenceID,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      await updateDoc(doc(db, "sisterCompanies", item.id), {
        isActive: false,
        deletedBy: referenceID,
        deletedAt: serverTimestamp(),
      });

      toast.success("Sister company deleted");
      setOpen(false);
    } catch {
      toast.error("Failed to delete sister company");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline">
          <Minus className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Sister Company</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{item.name}</span>?  
          This action can be restored later.
        </p>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
