"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Plus, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

  const [suppliers, setSuppliers] = useState<
    { id: string; company: string; companyCode?: string }[]
  >([]);

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

  /* ---------------- Step 4: Company Description ---------------- */

  // company
  const [company, setCompany] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [supplierId, setSupplierId] = useState("");

  // images
  const [images, setImages] = useState<(File | null)[]>([null]);

  // product info
  const [productModel, setProductModel] = useState("");
  const [productCode, setProductCode] = useState("");

  // pricing
  const [unitCost, setUnitCost] = useState(""); // numbers + decimals only
  const [srp, setSrp] = useState(""); // PHP only
  const [pricingCategory, setPricingCategory] = useState("");

  // packaging
  const [packagingLength, setPackagingLength] = useState("");
  const [packagingWidth, setPackagingWidth] = useState("");
  const [packagingHeight, setPackagingHeight] = useState("");

  // quantities
  const [qtyPerCtn, setQtyPerCtn] = useState<number | "">("");
  const [moq, setMoq] = useState<number | "">("");
  const [warrantyYears, setWarrantyYears] = useState<number | "">("");

  /* ---------------- Reset category & product type when parent changes ---------------- */
  useEffect(() => {
    setCategory("");
    setProductSubType("");
  }, [productType]);

  useEffect(() => {
    setProductSubType("");
  }, [category]);

  /* ---------------- Image Array Helpers ---------------- */
  const updateImage = (index: number, file: File | null) => {
    setImages((prev) => prev.map((img, i) => (i === index ? file : img)));
  };

  const addImageAfter = (index: number) => {
    setImages((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, null);
      return copy;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  /* ---------------- Auto Generate Product Code ---------------- */
  useEffect(() => {
    if (!productModel) {
      setProductCode("");
      return;
    }

    const prefix = productModel
      .replace(/[^A-Z0-9]/gi, "")
      .toUpperCase()
      .slice(0, 4);

    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setProductCode(`${prefix}-${random}`);
  }, [productModel]);

  /* ---------------- Silent user detection ---------------- */

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const snap = await getDocs(collection(db, "suppliers"));

const list = snap.docs
  .filter((d) => d.data().isActive !== false)
  .map((d) => ({
    id: d.id,
    company: d.data().company,
    companyCode: d.data().companyCode,
  }))
  .sort((a, b) =>
    a.company.localeCompare(b.company, undefined, { sensitivity: "base" }),
  );
        setSuppliers(list);
      } catch (err) {
        console.error("Failed to fetch suppliers:", err);
      }
    };

    fetchSuppliers();
  }, []);
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
        {step !== 1 && step !== 2 && step !== 3 && step !== 4 && (
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

        {/* ---------------- Step 4: Company Description ---------------- */}
        {step === 4 && (
          <div className="space-y-6 mt-6">
            {/* Select Company + Company Code */}
            <div className="grid grid-cols-2 gap-3">
              {/* Select Company */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Select Company</label>
                <Select
                  value={supplierId}
                  onValueChange={(id) => {
                    const selected = suppliers.find((s) => s.id === id);

                    setSupplierId(id);
                    setCompany(selected?.company || "");
                    setCompanyCode(selected?.companyCode || "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>

                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Company Code */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Company Code</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm bg-muted"
                  value={companyCode}
                  disabled
                />
              </div>
            </div>

            {/* Upload Images */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Product Images</label>

              {images.map((img, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_auto] gap-2 items-center"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      updateImage(index, e.target.files?.[0] || null)
                    }
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />

                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => addImageAfter(index)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      disabled={images.length === 1}
                      onClick={() => removeImage(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Model */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Product Model</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={productModel}
                onChange={(e) => setProductModel(e.target.value)}
              />
            </div>

            {/* Product Code */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Product Code</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm bg-muted"
                value={productCode}
                disabled
              />
            </div>

            {/* Unit Cost */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Unit Cost</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={unitCost}
                onChange={(e) =>
                  /^\d*\.?\d*$/.test(e.target.value) &&
                  setUnitCost(e.target.value)
                }
                placeholder="0.00"
              />
            </div>

            {/* SRP */}
            <div className="space-y-1">
              <label className="text-sm font-medium">SRP (PHP)</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={srp}
                onChange={(e) =>
                  /^\d*\.?\d*$/.test(e.target.value) && setSrp(e.target.value)
                }
                placeholder="₱0.00"
              />
            </div>

            {/* Pricing Category */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Category</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={pricingCategory}
                onChange={(e) => setPricingCategory(e.target.value)}
              >
                <option value="">Select</option>
                <option value="Economy">Economy</option>
                <option value="Mid-End">Mid-End</option>
                <option value="To Be Evaluated">To Be Evaluated</option>
              </select>
            </div>

            {/* Packaging Dimensions */}
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="Length"
                className="border rounded-md px-2 py-2 text-sm"
                value={packagingLength}
                onChange={(e) => setPackagingLength(e.target.value)}
              />
              <input
                placeholder="Width"
                className="border rounded-md px-2 py-2 text-sm"
                value={packagingWidth}
                onChange={(e) => setPackagingWidth(e.target.value)}
              />
              <input
                placeholder="Height"
                className="border rounded-md px-2 py-2 text-sm"
                value={packagingHeight}
                onChange={(e) => setPackagingHeight(e.target.value)}
              />
            </div>

            {/* QTY / CTN */}
            <div className="space-y-1">
              <label className="text-sm font-medium">QTY / CTN</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={qtyPerCtn}
                onChange={(e) => setQtyPerCtn(Number(e.target.value))}
              />
            </div>

            {/* MOQ */}
            <div className="space-y-1">
              <label className="text-sm font-medium">MOQ</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={moq}
                onChange={(e) => setMoq(Number(e.target.value))}
              />
            </div>

            {/* Warranty */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Warranty (Years)</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={warrantyYears}
                onChange={(e) => setWarrantyYears(Number(e.target.value))}
              />
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
                (step === 3 && !productSubType) ||
                (step === 4 && !company)
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
