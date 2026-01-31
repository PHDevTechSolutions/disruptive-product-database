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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
import AddProductSelectType from "@/components/add-product-edit-select-classifcation-type";
import AddProductSelectProductType from "@/components/add-product-edit-select-category-type";
import AddProductEditSelectProduct from "@/components/add-product-edit-select-product";

/* 🔹 DELETE (SOFT DELETE) COMPONENT */
import AddProductDeleteClassification from "@/components/add-product-delete-select-classification-type";
import AddProductDeleteProductType from "@/components/add-product-delete-select-category-type";

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

type SelectedClassification = {
  id: string;
  name: string;
} | null;

type CategoryType = {
  id: string;
  name: string;
};

type Supplier = {
  supplierId: string;
  company: string;
};

export default function AddProductPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [technicalSpecs, setTechnicalSpecs] = useState<TechSpec[]>([
    { key: "", value: "" },
  ]);

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  type GalleryItem = {
    type: "image" | "video";
    file: File;
    preview: string; // UI only
  };

  const [galleryMedia, setGalleryMedia] = useState<GalleryItem[]>([]);

  const [classificationType, setClassificationType] =
    useState<SelectedClassification>(null);

  /* ===== CLASSIFICATION (REAL-TIME + SOFT DELETE) ===== */
  const [classificationTypes, setClassificationTypes] = useState<
    Classification[]
  >([]);
  const [newClassification, setNewClassification] = useState("");

  /* ===== PRODUCT TYPE STATE ===== */
  const [newCategoryType, setNewCategoryType] = useState("");
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);

  /* ===== PRODUCT TYPE (DEPENDENT ON CATEGORY TYPE) ===== */
  type ProductType = {
    id: string;
    name: string;
    categoryTypeId: string;
  };

  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<
    ProductType[]
  >([]);
  const [productTypeSearch, setProductTypeSearch] = useState("");
  const [newProductType, setNewProductType] = useState("");
  type SelectedCategoryType = {
    id: string;
    name: string;
  };

  const [selectedCategoryTypes, setSelectedCategoryTypes] = useState<
    SelectedCategoryType[]
  >([]);

  const [classificationSearch, setClassificationSearch] = useState("");
  const [categoryTypeSearch, setCategoryTypeSearch] = useState("");

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

  /* ================= FETCH SUPPLIERS ================= */
  useEffect(() => {
    const q = query(collection(db, "suppliers"), where("isActive", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const SUPPLIER_LIST = snapshot.docs.map((doc) => ({
        supplierId: doc.id,
        company: doc.data().company,
      }));

      SUPPLIER_LIST.sort((a, b) => a.company.localeCompare(b.company));

      setSuppliers(SUPPLIER_LIST);
    });

    return () => unsubscribe();
  }, []);

  /* ---------------- REAL-TIME CLASSIFICATIONS ---------------- */

  /* ---------------- REAL-TIME PRODUCT TYPES (DEPENDS ON CLASSIFICATION) ---------------- */

  useEffect(() => {
    if (!classificationType) return;
    if (selectedCategoryTypes.length === 0) return;

    const unsubscribers = selectedCategoryTypes.map((cat) => {
      const q = query(
        collection(
          db,
          "classificationTypes",
          classificationType.id,
          "categoryTypes",
          cat.id,
          "productTypes",
        ),
        where("isActive", "==", true),
      );

      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name,
          categoryTypeId: cat.id,
        }));

        setProductTypes((prev) => {
          const filtered = prev.filter((p) => p.categoryTypeId !== cat.id);
          return [...filtered, ...list];
        });
      });
    });

    return () => unsubscribers.forEach((u) => u());
  }, [
    selectedCategoryTypes.map((c) => c.id).join(","),
    classificationType?.id,
  ]);
  useEffect(() => {
    setCategoryTypes([]);

    if (!classificationType) return;

    const selected = classificationTypes.find(
      (c) => c.id === classificationType.id,
    );
    if (!selected) return;

    const q = query(
      collection(db, "classificationTypes", selected.id, "categoryTypes"),
      where("isActive", "==", true),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name as string,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setCategoryTypes(list);
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

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-product", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Cloudinary upload failed");

    const data = await res.json();

    if (!data.secure_url || !data.public_id) {
      throw new Error("Invalid Cloudinary response");
    }

    return data;
  };

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

  // ================= PRODUCT CODE HELPERS =================
  const normalizeProductPrefix = (name: string) => {
    return name
      .replace(/[^a-zA-Z ]/g, "")
      .split(" ")
      .filter((w) => w)
      .map((w) => w[0].toUpperCase())
      .join("")
      .slice(0, 4);
  };

  const generateAlphaNumeric = (length = 6) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  };

  const generateProductCode = (productName: string) => {
    const prefix = normalizeProductPrefix(productName) || "PROD";
    return `${prefix}-PROD-${generateAlphaNumeric(6)}`;
  };

  const handleProductNameBlur = () => {
    if (!productName.trim()) return;
    if (!productCode) {
      setProductCode(generateProductCode(productName));
    }
  };

  const removeSpecRow = (index: number) => {
    setTechnicalSpecs((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    setMainImage(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const handleAddGalleryMedia = async (file: File | null) => {
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      toast.error("Only image or video files are allowed");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setGalleryMedia((prev) => [
      ...prev,
      {
        type: isVideo ? "video" : "image",
        file,
        preview: previewUrl,
      },
    ]);
  };

  const handleRemoveGalleryMedia = (index: number) => {
    setGalleryMedia((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
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
  const handleAddCategoryType = async () => {
    if (!newCategoryType.trim() || !classificationType) return;

    const selected = classificationTypes.find(
      (c) => c.id === classificationType.id,
    );
    if (!selected) return;

    if (categoryTypes.some((p) => p.name === newCategoryType.trim())) {
      toast.error("Product type already exists");
      return;
    }

    await addDoc(
      collection(db, "classificationTypes", selected.id, "categoryTypes"),
      {
        name: newCategoryType.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
      },
    );

    setNewCategoryType("");
  };

  const handleRemoveCategoryType = async (_item: CategoryType) => {
    // UI ONLY – no soft delete logic
    return;
  };

  const toggleCategoryType = (item: { id: string; name: string }) => {
    setSelectedCategoryTypes((prev) =>
      prev.some((p) => p.id === item.id)
        ? prev.filter((p) => p.id !== item.id)
        : [...prev, item],
    );
  };

  const toggleProductType = (item: ProductType) => {
    setSelectedProductTypes((prev) =>
      prev.some((p) => p.id === item.id)
        ? prev.filter((p) => p.id !== item.id)
        : [...prev, item],
    );
  };

  const handleAddProductType = async () => {
    if (!newProductType.trim()) return;
    if (!classificationType) return;
    if (selectedCategoryTypes.length !== 1) {
      toast.error("Select exactly one category type to add a product type");
      return;
    }

    const categoryTypeId = selectedCategoryTypes[0].id;

    // Prevent duplicate
    if (
      productTypes.some(
        (p) =>
          p.name === newProductType.trim() &&
          p.categoryTypeId === categoryTypeId,
      )
    ) {
      toast.error("Product type already exists");
      return;
    }

    await addDoc(
      collection(
        db,
        "classificationTypes",
        classificationType.id,
        "categoryTypes",
        categoryTypeId,
        "productTypes",
      ),
      {
        name: newProductType.trim(),
        isActive: true,
        createdAt: serverTimestamp(),
      },
    );

    setNewProductType("");
  };

  const handleRemoveClassification = async (_item: Classification) => {
    // UI ONLY – no soft delete logic
    return;
  };

  const uploadProductMedia = async (productId: string) => {
  try {
    const uploads: Promise<any>[] = [];

    if (mainImage) uploads.push(uploadToCloudinary(mainImage));
    galleryMedia.forEach((item) =>
      uploads.push(uploadToCloudinary(item.file)),
    );

    if (uploads.length === 0) return;

    const results = await Promise.all(uploads);

    let uploadedMainImage = null;
    let galleryIndex = 0;

    if (mainImage) {
      const r = results[0];
      uploadedMainImage = {
        name: mainImage.name,
        url: r.secure_url,
        publicId: r.public_id,
      };
      galleryIndex = 1;
    }

    const uploadedGallery = galleryMedia.map((item, i) => {
      const r = results[i + galleryIndex];
      return {
        type: item.type,
        name: item.file.name,
        url: r.secure_url,
        publicId: r.public_id,
      };
    });

    await updateDoc(doc(db, "products", productId), {
      mainImage: uploadedMainImage,
      gallery: uploadedGallery,
      mediaStatus: "done",
    });
  } catch (error) {
    console.error("MEDIA UPLOAD FAILED:", error);
    await updateDoc(doc(db, "products", productId), {
      mediaStatus: "failed",
    });
  }
};


  const filteredClassifications = React.useMemo(() => {
  return classificationTypes.filter((item) =>
    item.name.toLowerCase().includes(classificationSearch.toLowerCase()),
  );
}, [classificationTypes, classificationSearch]);

const filteredCategoryTypes = React.useMemo(() => {
  return categoryTypes.filter((item) =>
    item.name.toLowerCase().includes(categoryTypeSearch.toLowerCase()),
  );
}, [categoryTypes, categoryTypeSearch]);

const filteredProductTypes = React.useMemo(() => {
  return productTypes.filter((item) =>
    item.name.toLowerCase().includes(productTypeSearch.toLowerCase()),
  );
}, [productTypes, productTypeSearch]);

  /* ---------------- Save Product ---------------- */
  const handleSaveProduct = async () => {
    if (saving) return;
    try {
      setSaving(true);
      if (!productName.trim()) {
        toast.error("Product name is required");
        return;
      }
      if (!selectedSupplier) {
        toast.error("Please select a supplier");
        return;
      }

      if (!classificationType) {
        toast.error("Please select a classification type");
        return;
      }

      // ================= CLOUDINARY UPLOAD =================

      // MAIN IMAGE
// 🔥 INSTANT SAVE — NO MEDIA WAIT
const productRef = await addDoc(collection(db, "products"), {
  productName,
  productCode,

  classificationId: classificationType.id,
  classificationName: classificationType.name,

  supplier: {
    supplierId: selectedSupplier.supplierId,
    company: selectedSupplier.company,
  },

  productTypes: selectedProductTypes.map((p) => ({
    productTypeId: p.id,
    productTypeName: p.name,
    categoryTypeId: p.categoryTypeId,
  })),

  categoryTypes: selectedCategoryTypes.map((c) => ({
    categoryTypeId: c.id,
    categoryTypeName: c.name,
  })),

  technicalSpecifications: technicalSpecs.filter((s) => s.key || s.value),

  // placeholders muna
  mainImage: null,
  gallery: [],
  mediaStatus: "pending",

  createdBy: userId,
  referenceID: user?.ReferenceID || null,
  isActive: true,
  createdAt: serverTimestamp(),
});

toast.success("Product saved successfully");
router.push("/products");

// 🚀 background upload (wag hintayin)
uploadProductMedia(productRef.id);




      toast.success("Product saved successfully");
      router.push("/products");
    } catch (error) {
      console.error("SAVE PRODUCT ERROR:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save product",
      );
    } finally {
      setSaving(false);
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
            {/* IMAGE */}
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

            {/* GALLERY IMAGES & VIDEOS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center text-sm">
                  GALLERY IMAGES & VIDEOS
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {/* EXISTING MEDIA */}
                  {galleryMedia.map((item, index) => (
                    <div
                      key={index}
                      className="relative min-w-[160px] h-[120px] border rounded-lg overflow-hidden bg-black"
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.preview}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={item.preview}
                          className="w-full h-full object-cover"
                          controls
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryMedia(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* ADD MEDIA */}
                  <label className="min-w-[160px] h-[120px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer text-muted-foreground">
                    <Plus className="h-6 w-6" />
                    <span className="text-xs mt-1">ADD PHOTO / VIDEO</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      onChange={(e) =>
                        handleAddGalleryMedia(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Product Name</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  onBlur={handleProductNameBlur}
                  placeholder="Enter product name..."
                />
              </div>

              <div>
                <Label>Product Code</Label>
                <Input
                  value={productCode}
                  disabled
                  className="opacity-100 cursor-not-allowed bg-background text-foreground"
                />
              </div>
            </div>
            {/* ================= SUPPLIER SELECT ================= */}
            <div className="space-y-2">
              <Label>Supplier / Company</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-[360px] justify-between" // 🔒 FIXED WIDTH
                  >
                    <span className="truncate text-left max-w-[85%]">
                      {selectedSupplier
                        ? selectedSupplier.company
                        : "Select supplier..."}
                    </span>

                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="p-0 w-[360px]">
                  <Command>
                    <CommandInput placeholder="Search supplier..." />
                    <CommandEmpty>No supplier found.</CommandEmpty>

                    <CommandGroup>
                      {suppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.supplierId}
                          value={supplier.company}
                          onSelect={() => setSelectedSupplier(supplier)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSupplier?.supplierId ===
                                supplier.supplierId
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="truncate">{supplier.company}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
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
          {/* CLASSIFICATION */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                CLASSIFICATION TYPE
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Select Classification Type</Label>
                <Input
                  value={classificationSearch}
                  onChange={(e) => setClassificationSearch(e.target.value)}
                  placeholder="Search type..."
                  className="h-8 w-[160px]"
                />
              </div>

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

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredClassifications.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={classificationType?.id === item.id}
                        onCheckedChange={() =>
                          setClassificationType(
                            classificationType?.id === item.id
                              ? null
                              : { id: item.id, name: item.name },
                          )
                        }
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    <div className="flex gap-1">
                      <AddProductSelectType item={item} />
                      <AddProductDeleteClassification
                        item={item}
                        referenceID={user?.ReferenceID || ""}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CATEGORY TYPE */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                CATEGORY TYPE
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Select Category Type</Label>
                <Input
                  value={categoryTypeSearch}
                  onChange={(e) => setCategoryTypeSearch(e.target.value)}
                  placeholder="Search category type..."
                  className="h-8 w-[160px]"
                  disabled={!classificationType}
                />
              </div>

              <div className="flex gap-2">
                <Input
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value)}
                  placeholder="Add category type..."
                  disabled={!classificationType}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddCategoryType}
                  disabled={!classificationType}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredCategoryTypes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedCategoryTypes.some(
                          (p) => p.id === item.id,
                        )}
                        onCheckedChange={() =>
                          toggleCategoryType({
                            id: item.id,
                            name: item.name,
                          })
                        }
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    <div className="flex gap-1">
                      <AddProductSelectProductType
                        classificationId={classificationType?.id || ""}
                        item={item}
                      />
                      <AddProductDeleteProductType
                        classificationId={classificationType?.id || ""}
                        item={item}
                        referenceID={user?.ReferenceID || ""}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SELECT PRODUCT TYPE */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                SELECT PRODUCT TYPE
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Select Product Type</Label>
                <Input
                  value={productTypeSearch}
                  onChange={(e) => setProductTypeSearch(e.target.value)}
                  placeholder="Search product type..."
                  className="h-8 w-[160px]"
                  disabled={selectedCategoryTypes.length === 0}
                />
              </div>

              <Separator />

              <div className="flex gap-2">
                <Input
                  value={newProductType}
                  onChange={(e) => setNewProductType(e.target.value)}
                  placeholder={
                    selectedCategoryTypes.length === 1
                      ? "Add product type..."
                      : "Select exactly 1 category type"
                  }
                  disabled={selectedCategoryTypes.length !== 1}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddProductType}
                  disabled={selectedCategoryTypes.length !== 1}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredProductTypes.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={selectedProductTypes.some(
                          (p) => p.id === item.id,
                        )}
                        onCheckedChange={() => toggleProductType(item)}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    <AddProductEditSelectProduct
                      classificationId={classificationType!.id}
                      item={item}
                    />
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
        <Button onClick={handleSaveProduct} disabled={saving}>
          {saving ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </div>
  );
}
