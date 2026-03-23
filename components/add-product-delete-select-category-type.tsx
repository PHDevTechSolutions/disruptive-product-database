"use client";

import { useState } from "react";
import { Minus } from "lucide-react";

import {
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  writeBatch,
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
import { logProductUsageEvent } from "@/lib/auditlogger"; // ✅ AUDIT

type ProductType = {
  id: string;
  name: string;
};

type Props = {
  item: ProductType;
  referenceID: string;
};

export default function AddProductDeleteProductType({ item, referenceID }: Props) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);

      const batch = writeBatch(db);

      /* ✅ STEP 1: SOFT DELETE CATEGORY TYPE */
      batch.update(doc(db, "categoryTypes", item.id), {
        isActive  : false,
        deletedBy : referenceID,
        deletedAt : serverTimestamp(),
      });

      /* ✅ STEP 2: SOFT DELETE ALL PRODUCT FAMILIES UNDER THIS CATEGORY TYPE */
      const familiesSnapshot = await getDocs(
        collection(db, "categoryTypes", item.id, "productFamilies"),
      );
      familiesSnapshot.forEach((familyDoc) => {
        batch.update(
          doc(db, "categoryTypes", item.id, "productFamilies", familyDoc.id),
          { isActive: false, deletedBy: referenceID, deletedAt: serverTimestamp() },
        );
      });

      /* ✅ STEP 3: REMOVE CATEGORY TYPE AND PRODUCT FAMILIES FROM ALL PRODUCTS */
      const productsSnapshot = await getDocs(collection(db, "products"));
      productsSnapshot.forEach((productDoc) => {
        const data = productDoc.data();
        const updatedCategoryTypes = (data.categoryTypes || []).filter(
          (ct: any) => ct.productUsageId !== item.id,
        );
        const updatedProductFamilies = (data.productFamilies || []).filter(
          (pf: any) => pf.productUsageId !== item.id,
        );
        batch.update(doc(db, "products", productDoc.id), {
          categoryTypes  : updatedCategoryTypes,
          productFamilies: updatedProductFamilies,
        });
      });

      await batch.commit();

      // ✅ AUDIT LOG
      await logProductUsageEvent({
        whatHappened    : "Product Usage Deleted",
        productUsageId  : item.id,
        productUsageName: item.name,
        referenceID,
      });

      toast.success("Product usage and all dependent product families deleted");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product usage");
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

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Product Usage</DialogTitle>
        </DialogHeader>

        <p>
          Delete <b>{item.name}</b> and all its Product Families?
        </p>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
