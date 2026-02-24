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
type ProductFamilyItem = {
  id: string; // productFamilyId
  productName: string;
  productUsageId: string; // Replaced categoryTypeId with productUsageId
  classificationId: string;
};

type Props = {
  item: ProductFamilyItem;
  referenceID: string; // 🔑 kung sino nag delete
};

/* 🔥 CTRL + F: AddProductDeleteProduct */
export default function AddProductDeleteProduct({
  item,
  referenceID,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      /* 🔁 CTRL + F: productFamilies path (CORRECT) */
      await updateDoc(
        doc(
          db,
          "classificationTypes",
          item.classificationId,
          "categoryTypes",
          item.productUsageId, // Updated to productUsageId
          "productFamilies",
          item.id
        ),
        {
          isActive: false,
          deletedBy: referenceID,
          deletedAt: serverTimestamp(),
        }
      );

      toast.success("Product family deleted");
      setOpen(false);
    } catch (error) {
      console.error("DELETE PRODUCT FAMILY ERROR:", error);
      toast.error("Failed to delete product family");
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

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Product Family</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{item.productName}</span>?  
          <br />
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