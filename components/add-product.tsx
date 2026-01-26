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
import { cn } from "@/lib/utils";

/* ---------------- Types ---------------- */
type UserDetails = {
  ReferenceID?: string;
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
};

type AddProductProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const STEPS = [
  "Type",
  "Category",
  "Product Type",
  "Details",
  "System Power",
  "Beam Angle",
  "Cut Out",
];

function AddProduct({ open, onOpenChange }: AddProductProps) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  /* ---------------- Stepper State ---------------- */
  const [step, setStep] = useState(1);

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
          ReferenceID: data.ReferenceID ?? "",
          Firstname: data.Firstname ?? "",
          Lastname: data.Lastname ?? "",
          Role: data.Role ?? "",
          Email: data.Email ?? "",
        });
      })
      .catch((err) => {
        console.error("AddProduct user fetch error:", err);
      });
  }, [userId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full sm:max-w-lg pb-[140px] z-50">
        <SheetHeader>
          <SheetTitle>Add Product</SheetTitle>
          <SheetDescription>
            Step {step} of {STEPS.length}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {/* ---------------- Stepper (Clickable Dots) ---------------- */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((label, index) => {
            const current = index + 1;
            const isActive = step === current;
            const isCompleted = step > current;

            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(current)}
                className="flex flex-col items-center gap-1 focus:outline-none"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border text-xs font-medium transition",
                    isActive &&
                      "bg-primary text-primary-foreground border-primary",
                    isCompleted &&
                      "bg-primary/20 text-primary border-primary",
                    !isActive &&
                      !isCompleted &&
                      "bg-background text-muted-foreground border-muted",
                  )}
                >
                  {current}
                </div>

                <span
                  className={cn(
                    "text-[10px] text-center w-16",
                    isActive
                      ? "text-primary font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------------- User Info (NOT REMOVED) ---------------- */}
        {user && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
            {user.ReferenceID && (
              <div>
                <span className="font-medium">Reference ID:</span>{" "}
                {user.ReferenceID}
              </div>
            )}

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

        {/* ---------------- Step Body (Placeholder for now) ---------------- */}
        <div className="flex items-center justify-center text-muted-foreground text-sm mt-10">
          {STEPS[step - 1]} fields will go here
        </div>

        {/* ---------------- Footer ---------------- */}
        <SheetFooter className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Back
          </Button>

          {step < STEPS.length ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AddProduct;
