"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
import { logProductEvent } from "@/lib/auditlogger"; // ✅ AUDIT

type Props = {
  productId: string;
  productName: string;
  referenceID: string;
  onDeleted?: (id: string) => void;
  defaultOpen?: boolean;
  onClose?: () => void;
};

export default function AddProductDeleteProductItem({
  productId,
  productName,
  referenceID,
  onDeleted,
  defaultOpen = false,
  onClose,
}: Props) {
  const { userId } = useUser();
  const [resolvedReferenceID, setResolvedReferenceID] = useState<string>(referenceID);

  const [open, setOpen] = useState(defaultOpen);
  const [deleting, setDeleting] = useState(false);

  /* ── Fetch ReferenceID of current user for audit log ── */
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => { if (d.ReferenceID) setResolvedReferenceID(d.ReferenceID); })
      .catch(console.error);
  }, [userId]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) onClose?.();
  };

  const handleSoftDelete = async () => {
    try {
      setDeleting(true);

      /* ── Fetch product data BEFORE deleting so we can log supplier + class ── */
      const productSnap = await getDoc(doc(db, "products", productId));
      const productData = productSnap.exists() ? productSnap.data() : null;

      await updateDoc(doc(db, "products", productId), {
        isActive    : false,
        deletedAt   : serverTimestamp(),
        deletedBy   : resolvedReferenceID,
        whatHappened: "Product Deleted",
        date_updated: serverTimestamp(),
      });

      // ✅ AUDIT LOG — includes supplier, class, pricePoint, brandOrigin
      await logProductEvent({
        whatHappened      : "Product Deleted",
        productId,
        productReferenceID: productData?.productReferenceID ?? undefined,
        productClass      : productData?.productClass       ?? undefined,
        pricePoint        : productData?.pricePoint         ?? undefined,
        brandOrigin       : productData?.brandOrigin        ?? undefined,
        supplier          : productData?.supplier           ?? null,
        categoryTypes     : productData?.categoryTypes      ?? undefined,
        productFamilies   : productData?.productFamilies    ?? undefined,
        referenceID       : resolvedReferenceID,
        userId            : userId ?? undefined,
      });

      toast.success("Product deleted successfully");
      setOpen(false);
      onClose?.();
      onDeleted?.(productId);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!defaultOpen && (
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" className="flex-1">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </DialogTrigger>
      )}

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
          <Button variant="secondary" onClick={() => handleOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSoftDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
