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
type Props = {
  classificationId: string;
  categoryTypeId: string;
  productTypeId: string;

  technicalSpecificationId: string;
  title: string;

  referenceID: string; // 🔑 who performed the delete
};

/* 🔥 CTRL + F: AddProductDeleteTechnicalSpecification */
export default function AddProductDeleteTechnicalSpecification({
  classificationId,
  categoryTypeId,
  productTypeId,
  technicalSpecificationId,
  title,
  referenceID,
}: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      /* 🔁 CTRL + F: technicalSpecifications path */
      await updateDoc(
        doc(
          db,
          "classificationTypes",
          classificationId,
          "categoryTypes",
          categoryTypeId,
          "productTypes",
          productTypeId,
          "technicalSpecifications",
          technicalSpecificationId
        ),
        {
          isActive: false,
          deletedBy: referenceID,
          deletedAt: serverTimestamp(),
        }
      );

      toast.success("Technical specification deleted");
      setOpen(false);
    } catch (error) {
      console.error("DELETE TECHNICAL SPEC ERROR:", error);
      toast.error("Failed to delete technical specification");
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
          <DialogTitle>Delete Technical Specification</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{title}</span>?
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
