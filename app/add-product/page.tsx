"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, ImagePlus, Pencil } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

import { useUser } from "@/contexts/UserContext";

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/* 🔹 EDIT COMPONENT */
import AddProductSelectType from "@/components/add-product-select-type";
import AddProductSelectProductType from "@/components/add-product-select-product-type";

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

type Classification = {
  id: string;
  name: string;
};

type ClassificationType = string | null;

type ProductType = {
  id: string;
  name: string;
};

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

  /* ===== CLASSIFICATION (REAL-TIME + SOFT DELETE) ===== */
  const [classificationTypes, setClassificationTypes] = useState<
    Classification[]
  >([]);
  const [newClassification, setNewClassification] = useState("");

  /* ===== PRODUCT TYPE STATE ===== */
  const [newProductType, setNewProductType] = useState("");
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(
    [],
  );

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

  /* ---------------- REAL-TIME CLASSIFICATIONS ---------------- */

  /* ---------------- REAL-TIME PRODUCT TYPES (DEPENDS ON CLASSIFICATION) ---------------- */
  useEffect(() => {
    setProductTypes([]);
    setSelectedProductTypes([]);

    if (!classificationType) return;

    const selected = classificationTypes.find(
      (c) => c.name === classificationType,
    );
    if (!selected) return;

    const q = query(
      collection(db, "classificationTypes", selected.id, "productTypes"),
      where("isActive", "==", true),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name as string,
      }));

      setProductTypes(list);
    });

    return () => unsubscribe();
  }, [classificationType, classificationTypes]);

  useEffect(() => {
    const q = query(
      collection(db, "classificationTypes"),
      where("isActive", "==", true),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const types = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name as string,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setClassificationTypes(types);
    });

    return () => unsubscribe();
  }, []);

  /* ---------------- Helpers ---------------- */
  const updateSpec = (index: number, field: "key" | "value", value: string) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
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

  /* ---------------- Classification Handlers ---------------- */
  const handleAddClassification = async () => {
    if (!newClassification.trim()) return;

    if (classificationTypes.some((c) => c.name === newClassification.trim())) {
      toast.error("Classification already exists");
      return;
    }

    await addDoc(collection(db, "classificationTypes"), {
      name: newClassification.trim(),
      isActive: true,
      createdAt: serverTimestamp(),
    });

    setNewClassification("");
  };

  /* ---------------- Product Type Handlers ---------------- */
  const handleAddProductType = async () => {
    if (!newProductType.trim() || !classificationType) return;

    const selected = classificationTypes.find(
      (c) => c.name === classificationType,
    );
    if (!selected) return;

    if (productTypes.some((p) => p.name === newProductType.trim())) {
      toast.error("Product type already exists");
      return;
    }

    await addDoc(
      collection(db, "classificationTypes", selected.id, "productTypes"),
      {
        name: newProductType.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
      },
    );

    setNewProductType("");
  };

  const handleRemoveProductType = async (item: ProductType) => {
    if (!classificationType) return;

    const selected = classificationTypes.find(
      (c) => c.name === classificationType,
    );
    if (!selected) return;

    await updateDoc(
      doc(db, "classificationTypes", selected.id, "productTypes", item.id),
      {
        isActive: false,
      },
    );

    // remove if currently selected
    setSelectedProductTypes((prev) =>
      prev.filter((name) => name !== item.name),
    );

    toast.success("Product type removed");
  };

  const toggleProductType = (name: string) => {
    setSelectedProductTypes((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  };

  const handleRemoveClassification = async (item: Classification) => {
    await updateDoc(doc(db, "classificationTypes", item.id), {
      isActive: false,
    });

    if (classificationType === item.name) {
      setClassificationType(null);
    }

    toast.success("Classification removed");
  };

  /* ---------------- Save Product ---------------- */
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
        productTypes: selectedProductTypes,
        technicalSpecifications: technicalSpecs.filter((s) => s.key || s.value),
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
                    onChange={(e) => updateSpec(index, "key", e.target.value)}
                  />
                  <Input
                    value={spec.value}
                    placeholder="Value"
                    onChange={(e) => updateSpec(index, "value", e.target.value)}
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
              {/* ===== CLASSIFICATION ===== */}
              <Label>Add / Select Type</Label>

              <div className="flex gap-2">
                <Input
                  value={newClassification}
                  onChange={(e) => setNewClassification(e.target.value)}
                  placeholder="Add classification..."
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddClassification}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                {classificationTypes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={classificationType === item.name}
                        onCheckedChange={() => setClassificationType(item.name)}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    <div className="flex gap-1">
                      {/* EDIT */}
                      <AddProductSelectType item={item} />

                      {/* DELETE */}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleRemoveClassification(item)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ===== PRODUCT TYPE (UI ONLY – SEPARATE SECTION) ===== */}
              <Separator />

              <Label>Add / Select Product Type</Label>

              <div className="flex gap-2">
                <Input
                  value={newProductType}
                  onChange={(e) => setNewProductType(e.target.value)}
                  placeholder="Add product type..."
                  disabled={!classificationType}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddProductType}
                  disabled={!classificationType}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 mt-3">
                {productTypes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedProductTypes.includes(item.name)}
                        onCheckedChange={() => toggleProductType(item.name)}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    <div className="flex gap-1">
                      {/* ✏️ EDIT PRODUCT TYPE */}
                      <AddProductSelectProductType
                        classificationId={
                          classificationTypes.find(
                            (c) => c.name === classificationType,
                          )?.id || ""
                        }
                        item={item}
                      />

                      {/* ➖ DELETE PRODUCT TYPE */}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleRemoveProductType(item)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => router.push("/products")}>
          Cancel
        </Button>
        <Button onClick={handleSaveProduct}>Save Product</Button>
      </div>
    </div>
  );
}
