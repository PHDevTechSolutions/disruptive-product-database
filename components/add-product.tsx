"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useUser } from "@/contexts/UserContext";

/* ---------------- Types ---------------- */
type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  ReferenceID?: string;
};

type AddProductProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AddProduct({ open, onOpenChange }: AddProductProps) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  /* ---------------- Silent user detection ---------------- */
  useEffect(() => {
    if (!userId) return;

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => {
        setUser({
          Firstname: data.Firstname ?? "",
          Lastname: data.Lastname ?? "",
          Role: data.Role ?? "",
          Email: data.Email ?? "",
          ReferenceID: data.ReferenceID ?? "",
        });
      })
      .catch((err) => {
        console.error("AddProduct user fetch error:", err);
      });
  }, [userId]);

  /* ---------------- PLACEHOLDER HANDLER ---------------- */
  const handleSaveProduct = () => {
    // intentionally empty
    // firestore logic will be added in the future
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full sm:max-w-lg pb-[140px] z-50">
        <SheetHeader>
          <SheetTitle>Add Product</SheetTitle>
          <SheetDescription>
            Product creation (structure only — no fields yet)
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {/* ---------------- User Info ---------------- */}
        {user && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
            <div>
              <span className="font-medium">Welcome:</span>{" "}
              {user.Firstname} {user.Lastname}
            </div>
            <div>
              <span className="font-medium">Role:</span> {user.Role}
            </div>
            <div>
              <span className="font-medium">Email:</span> {user.Email}
            </div>
          </div>
        )}

        {/* ---------------- BODY (EMPTY ON PURPOSE) ---------------- */}
        <div className="flex items-center justify-center text-muted-foreground text-sm mt-10">
          Product form fields will be added here later
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSaveProduct}
            disabled
          >
            Save Product
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AddProduct;
