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

  productUsageId: string; // ✅ CHANGED

  productFamilyId: string;

  technicalSpecificationId: string;

  title: string;

  referenceID: string;

};

export default function AddProductDeleteTechnicalSpecification({

  classificationId,

  productUsageId,

  productFamilyId,

  technicalSpecificationId,

  title,

  referenceID,

}: Props) {

  const [open, setOpen] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {

    try {

      setDeleting(true);

      await updateDoc(

        doc(

          db,

          "classificationTypes",

          classificationId,

          "categoryTypes",

          productUsageId, // ✅ CHANGED

          "productFamilies",

          productFamilyId,

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

      console.error(error);

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

      <DialogContent>

        <DialogHeader>

          <DialogTitle>Delete Technical Specification</DialogTitle>

        </DialogHeader>

        <p>

          Delete <b>{title}</b> ?

        </p>

        <DialogFooter>

          <Button onClick={() => setOpen(false)}>

            Cancel

          </Button>

          <Button variant="destructive" onClick={handleDelete}>

            Delete

          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  );

}