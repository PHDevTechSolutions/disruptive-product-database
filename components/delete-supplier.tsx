"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";
import { db } from "@/lib/firebase";

import {
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  writeBatch,
} from "firebase/firestore";

import { logSupplierEvent } from "@/lib/auditlogger"; // ✅ AUDIT

/* ---------------- Types ---------------- */
type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  ReferenceID: string;
};

type DeleteSupplierProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: {
    id: string;
    company: string;
    supplierBrand?: string;
  };
};

/* ---------------- Component ---------------- */
function DeleteSupplier({ open, onOpenChange, supplier }: DeleteSupplierProps) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => {
        setUser({
          Firstname  : data.Firstname  ?? "",
          Lastname   : data.Lastname   ?? "",
          Role       : data.Role       ?? "",
          Email      : data.Email      ?? "",
          ReferenceID: data.ReferenceID ?? "",
        });
      })
      .catch((err) => console.error("DeleteSupplier user fetch error:", err));
  }, [userId]);

  const handleDeleteSupplier = async () => {
    try {
      if (!user?.ReferenceID) {
        toast.error("User reference not loaded");
        return;
      }

      setLoading(true);

      /* ✅ STEP 1: SOFT DELETE SUPPLIER */
      await updateDoc(doc(db, "suppliers", supplier.id), {
        isActive    : false,
        deletedBy   : user.ReferenceID,
        deletedAt   : serverTimestamp(),
        whatHappened: "Supplier Deleted",
        date_updated: serverTimestamp(),
      });

      /* ✅ STEP 2: REMOVE SUPPLIER FROM ALL PRODUCTS & APPLY DEFAULTS */
      const snapshot = await getDocs(collection(db, "products"));
      const batch = writeBatch(db);

      snapshot.forEach((productDoc) => {
        const data = productDoc.data();
        if (!data.supplier) return;
        if (data.supplier?.supplierId === supplier.id) {
          batch.update(doc(db, "products", productDoc.id), {
            supplier    : null,
            pricePoint  : "Economy",
            brandOrigin : "China",
            whatHappened: "Supplier Deleted - Defaults Applied",
            date_updated: serverTimestamp(),
          });
        }
      });

      await batch.commit();

      // ✅ AUDIT LOG
      await logSupplierEvent({
        whatHappened  : "Supplier Deleted",
        supplierId    : supplier.id,
        company       : supplier.company,
        supplierBrand : supplier.supplierBrand,
        referenceID   : user.ReferenceID,
        userId        : userId ?? undefined,
      });

      toast.success("Supplier deleted", { description: supplier.company });
      onOpenChange(false);
    } catch (error) {
      console.error("Soft delete supplier error:", error);
      toast.error("Failed to delete supplier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Supplier</DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="space-y-2 text-sm">
          <p>Are you sure you want to delete this supplier?</p>
          <p className="font-medium text-destructive">
            {supplier.company}
            {supplier.supplierBrand && (
              <span className="block text-xs text-muted-foreground">
                Brand: {supplier.supplierBrand}
              </span>
            )}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSupplier}
            disabled={loading}
            className="cursor-pointer"
          >
            {loading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteSupplier;
