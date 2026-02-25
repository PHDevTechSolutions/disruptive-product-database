"use client";

import { useState } from "react";
import { Minus } from "lucide-react";

import {
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  collection,
  writeBatch
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


type ProductType = {
  id: string;
  name: string;
};

type Props = {
  item: ProductType;
  referenceID: string;
};


export default function AddProductDeleteProductType({
  item,
  referenceID,
}: Props) {

  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);


  const handleDelete = async () => {

    try {

      setDeleting(true);

      /* ✅ SOFT DELETE CATEGORY TYPE */

      await updateDoc(
        doc(db, "categoryTypes", item.id),
        {
          isActive: false,
          deletedBy: referenceID,
          deletedAt: serverTimestamp(),
        }
      );


      /* ✅ REMOVE FROM ALL PRODUCTS */

      const snapshot = await getDocs(collection(db, "products"));

      const batch = writeBatch(db);

      snapshot.forEach((productDoc) => {

        const data = productDoc.data();

        if (!data.categoryTypes) return;

        const updated = data.categoryTypes.filter(
          (ct: any) => ct.productUsageId !== item.id
        );

        batch.update(
          doc(db, "products", productDoc.id),
          {
            categoryTypes: updated
          }
        );

      });

      await batch.commit();


      toast.success("Category type deleted");

      setOpen(false);

    } catch (error) {

      console.error(error);

      toast.error("Failed to delete category type");

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

          <DialogTitle>Delete Category Type</DialogTitle>

        </DialogHeader>


        <p>
          Delete <b>{item.name}</b> ?
        </p>


        <DialogFooter>

          <Button onClick={() => setOpen(false)}>
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