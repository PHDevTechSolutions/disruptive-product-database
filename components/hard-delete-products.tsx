"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export default function HardDeleteProducts() {
  const [loading, setLoading] = useState(false);

  const handleDeleteAll = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, "products"));

      if (snapshot.empty) {
        toast.error("No products found");
        return;
      }

      const CHUNK_SIZE = 400;
      const docs = snapshot.docs;

      for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
        const batch = writeBatch(db);

        docs.slice(i, i + CHUNK_SIZE).forEach((d) => {
          batch.delete(doc(db, "products", d.id));
        });

        await batch.commit();
      }

      toast.success("All products deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          **DO NOT CLICK** Delete All Products 
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Permanently Delete ALL Products?
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This action will permanently delete the entire
          <b> products </b> collection in Firestore.
          This cannot be undone.
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}