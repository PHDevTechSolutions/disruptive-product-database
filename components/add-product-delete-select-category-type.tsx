"use client";

import { useState } from "react";
import { Minus } from "lucide-react";

import {
  doc,
  updateDoc,
  serverTimestamp
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

      /* ✅ FIXED PATH */

      await updateDoc(

        doc(
          db,
          "categoryTypes",
          item.id
        ),

        {
          isActive: false,
          deletedBy: referenceID,
          deletedAt: serverTimestamp(),
        }

      );


      toast.success("Category type deleted");

      setOpen(false);

    } catch {

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
          >

            {deleting ? "Deleting..." : "Delete"}

          </Button>

        </DialogFooter>


      </DialogContent>

    </Dialog>

  );

}