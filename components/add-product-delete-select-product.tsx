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


type ProductFamilyItem = {

  id: string;
  productName: string;
  productUsageId: string;

};

type Props = {

  item: ProductFamilyItem;
  referenceID: string;

};


export default function AddProductDeleteProduct({

  item,
  referenceID,

}: Props) {


  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);


  const handleDelete = async () => {

    try {

      setDeleting(true);


      /* ✅ SOFT DELETE PRODUCT FAMILY */

      await updateDoc(

        doc(
          db,
          "categoryTypes",
          item.productUsageId,
          "productFamilies",
          item.id
        ),

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

        if (!data.productFamilies) return;

        const updated = data.productFamilies.filter(

          (pf: any) => pf.productFamilyId !== item.id

        );

        batch.update(

          doc(db, "products", productDoc.id),

          {
            productFamilies: updated
          }

        );

      });


      await batch.commit();


      toast.success("Product family deleted");

      setOpen(false);


    } catch (error) {

      console.error(error);

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

          Are you sure you want to delete

          <span className="font-semibold">

            {" "} {item.productName}

          </span> ?

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