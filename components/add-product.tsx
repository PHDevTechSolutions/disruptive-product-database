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

/* ---------------- Category Options ---------------- */
const CATEGORY_OPTIONS = {
  PER_INDUSTRY: [
    "Commercial",
    "Residential",
    "Hospitality",
    "Industrial",
    "Infrastructure",
    "Cold Storage",
    "Government",
    "Water Utility",
    "Power Generation",
  ],
  PER_PRODUCT_FAMILY: ["Indoor", "Outdoor/Commercial", "Solar"],
};

/* ---------------- Product Type Options ---------------- */
const PRODUCT_TYPE_OPTIONS: Record<string, Record<string, string[]>> = {
  PER_INDUSTRY: {
    Commercial: [
      "Spotlight",
      "Tracklight",
      "Recessed Downlight",
      "Surface Downlight & Ceiling Mounted",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
      "LED Pendant (Suspension & Wall Mount)",
      "LED Low Bay",
      "LED Flood Light",
      "Area Light",
      "LED Canopy Light",
      "Wall Mount",
      "Bollard / Border Light",
      "Ground Spike Light",
      "Inground Light",
      "Under Water Light",
      "Post Top Light / Lighting Pole",
      "Exit sign and Emergency Light",
      "Strip light",
    ],
    Residential: [
      "Spotlight",
      "Tracklight",
      "Recessed Downlight",
      "Surface Downlight & Ceiling Mounted",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
      "LED Pendant (Suspension & Wall Mount)",
      "LED Low Bay",
      "LED Flood Light",
      "Area Light",
      "LED Canopy Light",
      "Wall Mount",
      "Bollard / Border Light",
      "Ground Spike Light",
      "Inground Light",
      "Under Water Light",
      "Post Top Light / Lighting Pole",
      "Exit sign and Emergency Light",
      "Strip light",
    ],
    Hospitality: [
      "Spotlight",
      "Tracklight",
      "Recessed Downlight",
      "Surface Downlight & Ceiling Mounted",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
      "LED Pendant (Suspension & Wall Mount)",
      "LED Low Bay",
      "LED Flood Light",
      "Area Light",
      "LED Canopy Light",
      "Wall Mount",
      "Bollard / Border Light",
      "Ground Spike Light",
      "Inground Light",
      "Under Water Light",
      "Post Top Light / Lighting Pole",
      "Exit sign and Emergency Light",
      "Strip light",
    ],
    Industrial: [
      "LED High Bay",
      "Streetlight",
      "Weather Proof",
      "Exit sign and Emergency Light",
      "Strip light",
      "LED Flood Light",
      "LED Canopy Light",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
    ],
    Infrastructure: [
      "LED High Bay",
      "Streetlight",
      "Weather Proof",
      "Exit sign and Emergency Light",
      "Strip light",
      "LED Flood Light",
      "LED Canopy Light",
    ],
    "Cold Storage": [
      "LED High Bay",
      "Streetlight",
      "Weather Proof",
      "Exit sign and Emergency Light",
      "LED Flood Light",
      "LED Canopy Light",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
    ],
    Government: [
      "LED High Bay",
      "Streetlight",
      "Exit sign and Emergency Light",
      "Strip light",
      "LED Flood Light",
      "LED Canopy Light",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
    ],
    "Water Utility": [
      "LED High Bay",
      "Weather Proof",
      "Exit sign and Emergency Light",
      "LED Flood Light",
      "LED Canopy Light",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
    ],
    "Power Generation": [
      "Streetlight",
      "Weather Proof",
      "Exit sign and Emergency Light",
      "LED Flood Light",
      "LED Canopy Light",
      "Surface Fluorescent (Linear)",
      "Surface Fluorescent (Batten)",
    ],
  },

  PER_PRODUCT_FAMILY: {
    Indoor: [
      "Spotlight",
      "Tracklight",
      "Downlight",
      "Pendant Light",
      "Emergency Light",
      "Exit Light",
      "Strip Light",
      "Panel Light",
    ],
    "Outdoor/Commercial": [
      "Flood Light",
      "Canopy Light",
      "Bollard",
      "Inground Light",
      "UFO High Bay",
      "Linear High Bay",
      "AC Street Light",
      "Area Light",
      "Weatherproof Housing",
      "Wall Light",
      "Garden Light",
      "Wall Washer",
      "Perimeter Lighting",
      "Explosionproof",
    ],
    Solar: [
      "Solar Streetlight",
      "Solar Bollard Light",
      "Solar Garden Light",
      "Solar Wall Light",
      "Portable Site Light",
      "Solar Road Stud",
      "Solar Flood Light",
      "Solar Post Light",
    ],
  },
};

function AddProduct({ open, onOpenChange }: AddProductProps) {
  const { userId } = useUser();
  const [user, setUser] = useState<UserDetails | null>(null);

  /* ---------------- Stepper State ---------------- */
  const [step, setStep] = useState(1);

  /* ---------------- Step 1: Product Type ---------------- */
  const [productType, setProductType] = useState<
    "PER_INDUSTRY" | "PER_PRODUCT_FAMILY" | ""
  >("");

  /* ---------------- Step 2: Category ---------------- */
  const [category, setCategory] = useState("");

  /* ---------------- Step 3: Product Sub Type ---------------- */
  const [productSubType, setProductSubType] = useState("");

  /* ---------------- Reset category & product type when parent changes ---------------- */
  useEffect(() => {
    setCategory("");
    setProductSubType("");
  }, [productType]);

  useEffect(() => {
    setProductSubType("");
  }, [category]);

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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6 z-50 pb-[140px]">
        <SheetHeader>
          <SheetTitle className="text-red-700">Add Product</SheetTitle>
          <SheetDescription>
            Step {step} of {STEPS.length}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {/* ---------------- Stepper ---------------- */}
        <div className="mb-6">
          {/* Mobile */}
          <div className="flex gap-4 overflow-x-auto pb-2 sm:hidden">
            {STEPS.map((label, index) => {
              const current = index + 1;
              const isActive = step === current;
              const isCompleted = step > current;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(current)}
                  className="flex flex-col items-center gap-1 min-w-[64px]"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border text-xs font-medium transition-all",
                      isActive &&
                        "bg-gradient-to-r from-red-600 to-red-700 text-white border-red-600 shadow-md",
                      isCompleted && "bg-red-100 text-red-700 border-red-400",
                      !isActive &&
                        !isCompleted &&
                        "bg-background text-muted-foreground border-muted",
                    )}
                  >
                    {current}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] text-center",
                      isActive
                        ? "text-red-700 font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop */}
          <div className="hidden sm:flex items-center justify-between">
            {STEPS.map((label, index) => {
              const current = index + 1;
              const isActive = step === current;
              const isCompleted = step > current;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(current)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border text-xs font-medium transition-all",
                      isActive &&
                        "bg-gradient-to-r from-red-600 to-red-700 text-white border-red-600 shadow-md",
                      isCompleted && "bg-red-100 text-red-700 border-red-400",
                      !isActive &&
                        !isCompleted &&
                        "bg-background text-muted-foreground border-muted",
                    )}
                  >
                    {current}
                  </div>

                  <span
                    className={cn(
                      "text-[10px] w-16 text-center",
                      isActive
                        ? "text-red-700 font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------------- User Info ---------------- */}
        {user && (
          <div className="rounded-md border p-3 text-sm space-y-1 bg-red-50/60">
            {user.ReferenceID && (
              <div>
                <span className="font-medium text-red-700">Reference ID:</span>{" "}
                {user.ReferenceID}
              </div>
            )}
            <div>
              <span className="font-medium text-red-700">Welcome:</span>{" "}
              {user.Firstname} {user.Lastname}
            </div>
            <div>
              <span className="font-medium text-red-700">Role:</span>{" "}
              {user.Role}
            </div>
            <div>
              <span className="font-medium text-red-700">Email:</span>{" "}
              {user.Email}
            </div>
          </div>
        )}

        {/* ---------------- Placeholder for other steps ---------------- */}
        {step !== 1 && step !== 2 && step !== 3 && (
          <div className="flex items-center justify-center text-muted-foreground text-sm mt-10">
            {STEPS[step - 1]} fields will go here
          </div>
        )}
        {/* ---------------- Step 1 ---------------- */}
        {step === 1 && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-red-700">Select Type:</div>

            <div className="grid gap-3">
              {[
                {
                  key: "PER_INDUSTRY",
                  title: "Type 1 – Per Industry",
                  desc: "Products grouped by industry classification",
                },
                {
                  key: "PER_PRODUCT_FAMILY",
                  title: "Type 2 – Per Product Family",
                  desc: "Products grouped by product family",
                },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setProductType(t.key as typeof productType)}
                  className={cn(
                    "rounded-md border p-4 text-left transition-all",
                    productType === t.key
                      ? "border-red-600 bg-gradient-to-r from-red-50 to-red-100 shadow-sm"
                      : "hover:bg-red-50",
                  )}
                >
                  <div className="font-medium text-red-700">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- Step 2 (CARD STYLE) ---------------- */}
        {step === 2 && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-red-700">
              Select Category:
            </div>

            <div className="grid gap-3">
              {productType &&
                CATEGORY_OPTIONS[productType].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCategory(option)}
                    className={cn(
                      "rounded-md border p-4 text-left transition-all",
                      category === option
                        ? "border-red-600 bg-gradient-to-r from-red-50 to-red-100 shadow-sm"
                        : "hover:bg-red-50",
                    )}
                  >
                    <div className="font-medium text-red-700">{option}</div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* ---------------- Step 3 ---------------- */}
        {step === 3 && productType && category && (
          <div className="space-y-4 mt-6">
            <div className="text-sm font-medium text-red-700">
              Select Product Type:
            </div>

            <div className="grid gap-3">
              {PRODUCT_TYPE_OPTIONS[productType]?.[category]?.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setProductSubType(option)}
                  className={cn(
                    "rounded-md border p-4 text-left transition-all",
                    productSubType === option
                      ? "border-red-600 bg-gradient-to-r from-red-50 to-red-100 shadow-sm"
                      : "hover:bg-red-50",
                  )}
                >
                  <div className="font-medium text-red-700">{option}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------- Footer ---------------- */}
        <SheetFooter className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="hover:border-red-600 hover:text-red-700"
          >
            Back
          </Button>

          {step < STEPS.length ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !productType) ||
                (step === 2 && !category) ||
                (step === 3 && !productSubType)
              }
              className="
                bg-gradient-to-r
                from-red-600
                to-red-700
                hover:from-red-700
                hover:to-red-800
                text-white
                shadow-md
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              Next
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AddProduct;
