"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, ImagePlus } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";

import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
  ReferenceID: string;
};

type TechSpec = {
  key: string;
  value: string;
};

/* ===== CLASSIFICATION TYPE ===== */
type ClassificationType =
  | "Type 1 Per Industry"
  | "Type 2 Per Product Family"
  | null;

export default function AddProductPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [productName, setProductName] = useState("");
  const [technicalSpecs, setTechnicalSpecs] = useState<TechSpec[]>([
    { key: "", value: "" },
  ]);

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [classificationType, setClassificationType] =
    useState<ClassificationType>(null);

  /* ---------------- Fetch User ---------------- */
  useEffect(() => {
    if (!userId) {
      router.push("/login");
      return;
    }

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => res.json())
      .then((data) =>
        setUser({
          Firstname: data.Firstname ?? "",
          Lastname: data.Lastname ?? "",
          Role: data.Role ?? "",
          ReferenceID: data.ReferenceID ?? "",
        }),
      )
      .finally(() => setLoading(false));
  }, [userId, router]);

  /* ---------------- Helpers ---------------- */
  const updateSpec = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addSpecRow = (index: number) => {
    setTechnicalSpecs((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, { key: "", value: "" });
      return copy;
    });
  };

  const removeSpecRow = (index: number) => {
    setTechnicalSpecs((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    setMainImage(file);
    setPreview(URL.createObjectURL(file));
  };

  /* ---------------- Save ---------------- */
  const handleSaveProduct = async () => {
    try {
      if (!productName.trim()) {
        toast.error("Product name is required");
        return;
      }

      if (!classificationType) {
        toast.error("Please select a classification type");
        return;
      }

      await addDoc(collection(db, "products"), {
        productName,
        technicalSpecifications: technicalSpecs.filter(
          (s) => s.key || s.value,
        ),
        mainImage: mainImage?.name || null,
        classificationType,
        createdBy: userId,
        referenceID: user?.ReferenceID || null,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      toast.success("Product saved successfully");
      router.push("/products");
    } catch {
      toast.error("Failed to save product");
    }
  };

  if (loading) return null;

  return (
    /* ✅ SAME SCROLL LOGIC AS SUPPLIERS */
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6 pb-[140px] md:pb-6">
      <SidebarTrigger className="hidden md:flex" />

      <h1 className="text-2xl font-bold">
        Welcome, {user?.Firstname} {user?.Lastname}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          ({user?.Role})
        </span>
      </h1>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* LEFT */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <Label>Product Name</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name..."
              />
            </div>

            <div className="space-y-3">
              <Label>Technical Specifications</Label>

              {technicalSpecs.map((spec, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                >
                  <Input
                    value={spec.key}
                    placeholder="Spec"
                    onChange={(e) =>
                      updateSpec(index, "key", e.target.value)
                    }
                  />
                  <Input
                    value={spec.value}
                    placeholder="Value"
                    onChange={(e) =>
                      updateSpec(index, "value", e.target.value)
                    }
                  />
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => addSpecRow(index)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={technicalSpecs.length === 1}
                      onClick={() => removeSpecRow(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                MAIN PRODUCT IMAGE
              </CardTitle>
            </CardHeader>

            <CardContent>
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-56 cursor-pointer">
                {preview ? (
                  <img src={preview} className="h-full object-contain" />
                ) : (
                  <>
                    <ImagePlus className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mt-2">
                      CLICK TO UPLOAD
                    </span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    handleImageChange(e.target.files?.[0] || null)
                  }
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                CLASSIFICATION
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Label>Select Type</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={classificationType === "Type 1 Per Industry"}
                  onCheckedChange={() =>
                    setClassificationType("Type 1 Per Industry")
                  }
                />
                <span className="text-sm">Type 1 Per Industry</span>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={
                    classificationType === "Type 2 Per Product Family"
                  }
                  onCheckedChange={() =>
                    setClassificationType("Type 2 Per Product Family")
                  }
                />
                <span className="text-sm">
                  Type 2 Per Product Family
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push("/products")}
        >
          Cancel
        </Button>
        <Button onClick={handleSaveProduct}>Save Product</Button>
      </div>
    </div>
  );
}
