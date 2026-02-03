"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
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

type Props = {
  productId: string;
  productName: string;
  referenceID: string;

  // 👇 NEW – callback para matanggal agad sa UI
  onDeleted?: (id: string) => void;
};

export default function AddProductDeleteProductItem({
  productId,
  productName,
  referenceID,
  onDeleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSoftDelete = async () => {
    try {
      setDeleting(true);

      const productRef = doc(db, "products", productId);

      await updateDoc(productRef, {
        isActive: false,
        deletedAt: serverTimestamp(),
        deletedBy: referenceID,
      });

      toast.success("Product deleted successfully");
      setOpen(false);

      // 👇 INSTANT UI UPDATE
      onDeleted?.(productId);

    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="destructive" className="flex-1">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{productName}</span>?
          <br />
          This action is a soft delete and can be restored later.
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
            onClick={handleSoftDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
