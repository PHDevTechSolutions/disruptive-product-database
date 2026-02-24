"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, ImagePlus, Pencil } from "lucide-react";
import { useRef } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
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
  getDocs,
  deleteDoc,
  writeBatch,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* 🔹 EDIT COMPONENT */
import AddProductSelectProductType from "@/components/add-product-edit-select-category-type";
import AddProductEditSelectProduct from "@/components/add-product-edit-select-product";

/* 🔹 DELETE (SOFT DELETE) COMPONENT */

import AddProductDeleteProductType from "@/components/add-product-delete-select-category-type";
import AddProductDeleteProduct from "@/components/add-product-delete-select-product";
import AddProductDeleteTechnicalSpecification from "@/components/add-product-delete-technical-specification";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
  ReferenceID: string;
};

type TechnicalSpecRow = {
  key: string;
  value: string;
};

type TechnicalSpecGroup = {
  title: string;
  specs: TechnicalSpecRow[];
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

export default function EditProductPage() {
  const router = useRouter();
  const { userId } = useUser();

  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  const productId = searchParams.get("id");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [noSupplier, setNoSupplier] = useState(false);

  const [pricePoint, setPricePoint] = useState("");
  const [brandOrigin, setBrandOrigin] = useState("");

  const isInitialLoad = useRef(true);

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productName, setProductName] = useState("");

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [classificationType, setClassificationType] =
    useState<SelectedClassification>(null);

  /* ===== BRAND (REAL-TIME + SOFT DELETE) ===== */
  type Brand = {
    id: string;
    name: string;
  };

  type SelectedBrand = {
    id: string;
    name: string;
  } | null;

  const [selectedBrand, setSelectedBrand] = useState<SelectedBrand>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrand, setNewBrand] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  /* ===== CLASSIFICATION (REAL-TIME + SOFT DELETE) ===== */
  const [classificationTypes, setClassificationTypes] = useState<
    Classification[]
  >([]);
  const [newClassification, setNewClassification] = useState("");

  /* ===== PRODUCT TYPE STATE ===== */
  const [newCategoryType, setNewCategoryType] = useState("");
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);

  /* ===== PRODUCT TYPE (DEPENDENT ON CATEGORY TYPE) ===== */
  type ProductFamily = {
    id: string;
    name: string;
    productUsageId: string;
  };

  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([]);
  const [selectedProductFamily, setSelectedProductFamily] =
    useState<ProductFamily | null>(null);

  /* ===== TECHNICAL SPECIFICATIONS DEPENDENT ON PRODUCT TYPE ===== */

  type SpecRow = {
    specId: string;

    unit: string;

    isRanging: boolean;
    isSlashing: boolean;
    isDimension: boolean;
    isRating: boolean;

    // Default
    value: string;

    // Ranging
    rangeFrom: string;
    rangeTo: string;

    // Slashing
    slashValues: string[];

    // Dimension
    length: string;
    width: string;
    height: string;

    // IP Rating
    ipFirst: string;
    ipSecond: string;
  };

  type TechnicalSpecification = {
    id: string;
    title: string;
    specs: SpecRow[];
  };

  const [technicalSpecs, setTechnicalSpecs] = useState<
    TechnicalSpecification[]
  >([]);

  const dragIndex = useRef<number | null>(null);

  /* ================= DRAG SPEC ROW ================= */

  const dragRow = useRef<{
    specIndex: number;
    rowIndex: number;
  } | null>(null);

  const handleRowDragStart = (specIndex: number, rowIndex: number) => {
    dragRow.current = { specIndex, rowIndex };
  };

  const handleRowDrop = (specIndex: number, dropRowIndex: number) => {
    if (!dragRow.current) return;

    const { specIndex: fromSpec, rowIndex: fromRow } = dragRow.current;

    if (fromSpec !== specIndex) return;

    const copy = [...technicalSpecs];

    const dragged = copy[specIndex].specs[fromRow];

    copy[specIndex].specs.splice(fromRow, 1);

    copy[specIndex].specs.splice(dropRowIndex, 0, dragged);

    dragRow.current = null;

    setTechnicalSpecs(copy);
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dropIndex: number) => {
    if (dragIndex.current === null) return;

    const copy = [...technicalSpecs];

    const draggedItem = copy[dragIndex.current];

    copy.splice(dragIndex.current, 1);

    copy.splice(dropIndex, 0, draggedItem);

    dragIndex.current = null;

    setTechnicalSpecs(copy);
  };

  const [productFamilySearch, setProductFamilySearch] = useState("");
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

  /* ================= LOAD PRODUCT DATA ================= */

  useEffect(() => {
    if (!productId) return;

    const ref = doc(db, "products", productId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        toast.error("Product not found");

        router.push("/products");

        return;
      }

      const data: any = snap.data();

      setProductName(data.productName || "");

      setPricePoint(data.pricePoint || "");

      setBrandOrigin(data.brandOrigin || "");

      if (data.supplier) {
        setSelectedSupplier({
          supplierId: data.supplier.supplierId,
          company: data.supplier.company,
        });
      }

      if (data.mainImage?.url) {
        setPreview(data.mainImage.url);
      }

      if (Array.isArray(data.categoryTypes)) {
        setSelectedCategoryTypes(
          data.categoryTypes.map((c: any) => ({
            id: c.productUsageId,
            name: c.categoryTypeName,
          })),
        );
      }

      if (
        Array.isArray(data.productFamilies) &&
        data.productFamilies.length > 0
      ) {
        const p = data.productFamilies[0];

        setSelectedProductFamily({
          id: p.productFamilyId,
          name: p.productFamilyName,
          productUsageId: p.productUsageId,
        });
      }

      if (Array.isArray(data.technicalSpecifications)) {
        setTechnicalSpecs(
          data.technicalSpecifications.map((spec: any) => ({
            id: spec.technicalSpecificationId,
            title: spec.title,
            specs: spec.specs,
          })),
        );
      }
    });

    return () => unsub();
  }, [productId]);

  /* ---------------- REAL-TIME SISTER COMPANIES ---------------- */
  useEffect(() => {
    const q = query(collection(db, "brands"), where("isActive", "==", true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name as string,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setBrands(list);
    });

    return () => unsubscribe();
  }, []);

  /* ---------------- REAL-TIME CLASSIFICATIONS ---------------- */

  /* ================= PRODUCT FAMILY FETCH INDEPENDENT ================= */

  useEffect(() => {
    if (selectedCategoryTypes.length === 0) {
      setProductFamilies([]);
      return;
    }

    const unsubscribers = selectedCategoryTypes.map((cat) => {
      const q = query(
        collection(db, "categoryTypes", cat.id, "productFamilies"),
        where("isActive", "==", true),
      );

      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          productUsageId: cat.id,
        }));

        setProductFamilies((prev) => {
          const filtered = prev.filter((p) => p.productUsageId !== cat.id);
          return [...filtered, ...list];
        });
      });
    });

    return () => unsubscribers.forEach((u) => u());
  }, [selectedCategoryTypes]);

  const addTechnicalSpec = () => {
    setTechnicalSpecs((prev) => [
      ...prev,
      {
        id: "",
        title: "",
        specs: [
          {
            specId: "",
            unit: "",

            isRanging: false,
            isSlashing: false,
            isDimension: false,
            isRating: false,

            value: "",

            rangeFrom: "",
            rangeTo: "",

            slashValues: [""],

            length: "",
            width: "",
            height: "",

            ipFirst: "",
            ipSecond: "",
          },
        ],
      },
    ]);
  };

  const removeTechnicalSpec = (index: number) => {
    setTechnicalSpecs((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const updateTitle = (index: number, value: string) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, title: value } : item)),
    );
  };

  const addSpecRow = (specIndex: number) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === specIndex
          ? {
              ...item,
              specs: [
                ...item.specs,
                {
                  specId: "",
                  unit: "",

                  isRanging: false,
                  isSlashing: false,
                  isDimension: false,
                  isRating: false,

                  value: "",

                  rangeFrom: "",
                  rangeTo: "",

                  slashValues: [""],

                  length: "",
                  width: "",
                  height: "",

                  ipFirst: "",
                  ipSecond: "",
                },
              ],
            }
          : item,
      ),
    );
  };

  const toggleMode = (
    specIndex: number,
    rowIndex: number,
    mode: "isRanging" | "isSlashing" | "isDimension" | "isRating",
  ) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === specIndex
          ? {
              ...item,
              specs: item.specs.map((row, r) => {
                if (r !== rowIndex) return row;

                // If the clicked mode is already active → TURN EVERYTHING OFF
                const isCurrentlyActive = row[mode];

                if (isCurrentlyActive) {
                  return {
                    ...row,

                    isRanging: false,
                    isSlashing: false,
                    isDimension: false,
                    isRating: false,

                    // Clear special fields
                    rangeFrom: "",
                    rangeTo: "",
                    slashValues: [""],
                    length: "",
                    width: "",
                    height: "",
                    ipFirst: "",
                    ipSecond: "",
                  };
                }

                // Otherwise activate ONLY the selected mode
                return {
                  ...row,

                  isRanging: mode === "isRanging",
                  isSlashing: mode === "isSlashing",
                  isDimension: mode === "isDimension",
                  isRating: mode === "isRating",

                  // Auto clear value fields when switching modes
                  value: "",
                  rangeFrom: "",
                  rangeTo: "",
                  slashValues: [""],
                  length: "",
                  width: "",
                  height: "",
                  ipFirst: "",
                  ipSecond: "",

                  // Auto remove unit if slashing or IP Rating
                  unit:
                    mode === "isSlashing" || mode === "isRating"
                      ? ""
                      : row.unit,
                };
              }),
            }
          : item,
      ),
    );
  };

  const removeSpecRow = (specIndex: number, rowIndex: number) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === specIndex
          ? {
              ...item,
              specs:
                item.specs.length > 1
                  ? item.specs.filter((_, r) => r !== rowIndex)
                  : item.specs,
            }
          : item,
      ),
    );
  };

  const updateSpecField = (
    specIndex: number,
    rowIndex: number,
    field:
      | "specId"
      | "value"
      | "unit"
      | "rangeFrom"
      | "rangeTo"
      | "length"
      | "width"
      | "height"
      | "ipFirst"
      | "ipSecond",
    value: string,
  ) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === specIndex
          ? {
              ...item,
              specs: item.specs.map((row, r) =>
                r === rowIndex ? { ...row, [field]: value } : row,
              ),
            }
          : item,
      ),
    );
  };

  /* ================= PRODUCT USAGE FETCH FINAL ================= */

  useEffect(() => {
    const q = query(
      collection(db, "categoryTypes"),

      where("isActive", "==", true),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,

        name: doc.data().name,
      }));

      setCategoryTypes(list);
    });

    return () => unsub();
  }, []);

  const syncSpecsToProductType = async () => {
    if (!selectedProductFamily) return;

    if (selectedCategoryTypes.length !== 1) return;

    const productUsageId = selectedCategoryTypes[0].id;

    const specsRef = collection(
      db,

      "categoryTypes",

      productUsageId,

      "productFamilies",

      selectedProductFamily.id,

      "technicalSpecifications",
    );

    const batch = writeBatch(db);

    technicalSpecs.forEach((spec) => {
      if (!spec.title.trim()) return;

      const ref = doc(specsRef);

      batch.set(ref, {
        title: spec.title,

        specs: spec.specs,

        isActive: true,

        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();

    toast.success("Specs Saved");
  };

  /* ================= NUMBER FORMATTERS ================= */
  const formatPHP = (value: number, decimals = 2) => {
    return value.toLocaleString("en-PH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const addSlashValue = (specIndex: number, rowIndex: number) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === specIndex
          ? {
              ...item,
              specs: item.specs.map((row, r) =>
                r === rowIndex
                  ? {
                      ...row,
                      slashValues: [...row.slashValues, ""],
                    }
                  : row,
              ),
            }
          : item,
      ),
    );
  };

  const removeSlashValue = (
    specIndex: number,
    rowIndex: number,
    slashIndex: number,
  ) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === specIndex
          ? {
              ...item,
              specs: item.specs.map((row, r) =>
                r === rowIndex
                  ? {
                      ...row,
                      slashValues:
                        row.slashValues.length > 1
                          ? row.slashValues.filter((_, si) => si !== slashIndex)
                          : row.slashValues,
                    }
                  : row,
              ),
            }
          : item,
      ),
    );
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    setMainImage(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const handleAddCategoryType = async () => {
    if (!newCategoryType.trim()) return;

    await addDoc(
      collection(db, "categoryTypes"),

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
    setSelectedCategoryTypes((prev) => {
      const isSame = prev.length === 1 && prev[0].id === item.id;

      if (isSame) {
        setSelectedProductFamily(null);
        setProductFamilies([]);
        return [];
      }

      setSelectedProductFamily(null);
      setProductFamilies([]);

      return [item];
    });
  };

  const selectProductFamily = async (item: ProductFamily) => {
    setSelectedProductFamily(item);

    if (selectedCategoryTypes.length !== 1) return;

    const productUsageId = selectedCategoryTypes[0].id;

    const specsRef = collection(
      db,
      "categoryTypes",
      productUsageId,
      "productFamilies",
      item.id,
      "technicalSpecifications",
    );

    const q = query(specsRef, where("isActive", "==", true));

    const snapshot = await getDocs(q);

    const loadedSpecs: TechnicalSpecification[] = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,

        title: data.title,

        specs: data.specs || [],
      };
    });

    setTechnicalSpecs(loadedSpecs);
  };

  const handleAddProductType = async () => {
    if (!newProductType.trim()) return;

    if (selectedCategoryTypes.length !== 1) return;

    const productUsageId = selectedCategoryTypes[0].id;

    await addDoc(
      collection(db, "categoryTypes", productUsageId, "productFamilies"),

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

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();

    formData.append("file", file);

    const res = await fetch("/api/upload-product", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Cloudinary upload failed");
    }

    const data = await res.json();

    if (!data.secure_url || !data.public_id) {
      throw new Error("Invalid Cloudinary response");
    }

    return data;
  };

  const uploadProductMedia = async (productId: string) => {
    try {
      if (!mainImage) return;

      const result = await uploadToCloudinary(mainImage);

      if (!result.secure_url) {
        throw new Error("Upload failed");
      }

      await updateDoc(doc(db, "products", productId), {
        mainImage: {
          name: mainImage.name,
          url: result.secure_url,
          publicId: result.public_id,
        },

        mediaStatus: "done",
      });
    } catch {
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

  const filteredBrands = React.useMemo(() => {
    return brands.filter((item) =>
      item.name.toLowerCase().includes(brandSearch.toLowerCase()),
    );
  }, [brands, brandSearch]);

  const filteredCategoryTypes = React.useMemo(() => {
    return categoryTypes.filter((item) =>
      item.name.toLowerCase().includes(categoryTypeSearch.toLowerCase()),
    );
  }, [categoryTypes, categoryTypeSearch]);

  const filteredProductFamilies = React.useMemo(() => {
    const allowedCategoryIds = selectedCategoryTypes.map((c) => c.id);

    return productFamilies
      .filter(
        (item) =>
          allowedCategoryIds.includes(item.productUsageId) &&
          item.name.toLowerCase().includes(productFamilySearch.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productFamilies, productFamilySearch, selectedCategoryTypes]);

  /* ---------------- Save Product ---------------- */

  /* ===== GENERATE UNIQUE PRODUCT REFERENCE ID ===== */
  const generateProductReferenceID = async () => {
    try {
      const q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc"),
        limit(1),
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return "PROD-SPF-00001";
      }

      const lastProduct = snapshot.docs[0].data();
      const lastRef: string =
        lastProduct.productReferenceID || "PROD-SPF-00000";

      // Extract only the numeric part after PROD-SPF-
      const lastNumber = parseInt(lastRef.replace("PROD-SPF-", ""), 10);

      const newNumber = lastNumber + 1;

      return `PROD-SPF-${newNumber.toString().padStart(5, "0")}`;
    } catch (error) {
      console.error("Error generating productReferenceID:", error);

      // Fallback format if something goes wrong
      return `PROD-SPF-${Date.now().toString().slice(-5)}`;
    }
  };

  const handleSaveProduct = async () => {
    if (saving) return;
    try {
      setSaving(true);
      if (!productName.trim()) {
        toast.error("Product name is required");
        return;
      }

if (!selectedSupplier && !noSupplier) {
  toast.error("Please select a supplier");
  return;
}

      if (!pricePoint) {
        toast.error("Please select price point");
        return;
      }

      if (!brandOrigin) {
        toast.error("Please select brand origin");
        return;
      }

      // ================= CLOUDINARY UPLOAD =================

      const productRef = doc(db, "products", productId!);

      await updateDoc(productRef, {
        productName,

        pricePoint,
        brandOrigin,

supplier: noSupplier
  ? null
  : {
      supplierId: selectedSupplier!.supplierId,
      company: selectedSupplier!.company,
    },

        productFamilies: selectedProductFamily
          ? [
              {
                productFamilyId: selectedProductFamily.id,
                productFamilyName: selectedProductFamily.name,
                productUsageId: selectedProductFamily.productUsageId,
              },
            ]
          : [],

        categoryTypes: selectedCategoryTypes.map((c) => ({
          productUsageId: c.id,
          categoryTypeName: c.name,
        })),

        technicalSpecifications: technicalSpecs
          .filter((spec) => spec.title.trim() !== "")
          .map((spec) => ({
            technicalSpecificationId: spec.id || "",
            title: spec.title,
            specs: spec.specs
              .filter((row) => row.specId.trim() !== "")
              .map((row) => ({
                specId: row.specId.trim(),

                // ✅ FIX HERE
                value: row.value?.trim() || "",
              })),
          })),

        ...(mainImage && { mediaStatus: "pending" }),

        createdBy: userId,
        referenceID: user?.ReferenceID || null,

        isActive: true,

        updatedAt: serverTimestamp(),
      });

      if (mainImage) uploadProductMedia(productId!);

      toast.success("Product saved successfully");

      router.push("/products");
    } catch (error) {
      console.error(error);

      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6 pb-[140px] md:pb-6">
      <SidebarTrigger className="hidden md:flex" />

      <h1 className="text-2xl font-bold">
        Edit Product – {user?.Firstname} {user?.Lastname}
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

            <div>
              <Label>Model No.</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter Model No."
              />
            </div>
            {/* ================= SUPPLIER SELECT ================= */}
            <div className="space-y-2">
<Label>Supplier / Company</Label>

{/* ✅ NO SUPPLIER CHECKBOX */}
<div className="flex items-center gap-2 mb-2">
  <input
    type="checkbox"
    checked={noSupplier}
    onChange={(e) => {
      const checked = e.target.checked;
      setNoSupplier(checked);

      if (checked) {
        setSelectedSupplier(null);

        // ✅ Force defaults
        setPricePoint("Economy");
        setBrandOrigin("China");
      }
    }}
  />

  <span className="text-sm text-muted-foreground">
    Check if no supplier
  </span>
</div>

<Popover>
                <PopoverTrigger asChild>
<Button
  variant="outline"
  role="combobox"
  disabled={noSupplier}
  className="w-[360px] justify-between"
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

            {/* ================= PRICE POINT SELECT ================= */}
            <div className="space-y-2">
              <Label>Price Point</Label>

<select
  value={noSupplier ? "Economy" : pricePoint}
  disabled={noSupplier}
  onChange={(e) => setPricePoint(e.target.value)}
  className="w-[360px] border rounded-md h-10 px-3 text-sm bg-background"
>
                <option value="">Select price point...</option>
                <option value="Economy">Economy</option>
                <option value="Mid-End">Mid-End</option>
                <option value="High-End">High-End</option>
              </select>
            </div>

            {/* ================= BRAND ORIGIN SELECT ================= */}
            <div className="space-y-2">
              <Label>Brand Origin</Label>

<select
  value={noSupplier ? "China" : brandOrigin}
  disabled={noSupplier}
  onChange={(e) => setBrandOrigin(e.target.value)}
  className="w-[360px] border rounded-md h-10 px-3 text-sm bg-background"
>
                <option value="">Select brand origin...</option>
                <option value="China">China</option>
                <option value="Non-China">Non-China</option>
              </select>
            </div>

            {/* ===== TECHNICAL SPECIFICATIONS (EDITABLE) ===== */}

            <div className="space-y-3">
              {/* ---- STICKY HEADER (NOT SCROLLABLE) ---- */}
              <div className="flex justify-between items-center bg-white sticky top-0 z-10 pb-2">
                <Label>Technical Specifications</Label>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addTechnicalSpec}
                  >
                    Add Title
                  </Button>

                  <Button size="sm" onClick={syncSpecsToProductType}>
                    Confirm Save
                  </Button>
                </div>
              </div>

              {/* ---- SCROLLABLE CONTENT ONLY ---- */}
              <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
                {technicalSpecs.map((item, index) => (
                  <Card
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className="p-4 space-y-4 border-2 border-blue-200 bg-blue-50 cursor-move"
                  >
                    {/* TITLE */}
                    <div className="space-y-1">
                      <Label className="block w-full text-center text-xs font-bold uppercase text-orange-600 tracking-widest">
                        TECHNICAL SPECIFICATION TITLE
                      </Label>

                      <div className="flex gap-2 items-center">
                        <Input
                          className="border-orange-300 focus-visible:ring-orange-400 bg-white"
                          placeholder="Enter title..."
                          value={item.title}
                          onChange={(e) => updateTitle(index, e.target.value)}
                        />

                        {item.id &&
                        classificationType &&
                        selectedProductFamily &&
                        selectedCategoryTypes.length === 1 ? (
                          <AddProductDeleteTechnicalSpecification
                            classificationId={classificationType.id}
                            productUsageId={selectedCategoryTypes[0].id}
                            productFamilyId={selectedProductFamily.id}
                            technicalSpecificationId={item.id}
                            title={item.title}
                            referenceID={user?.ReferenceID || ""}
                          />
                        ) : (
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-orange-400 text-orange-600 hover:bg-orange-100"
                            disabled={technicalSpecs.length === 1}
                            onClick={() => removeTechnicalSpec(index)}
                          >
                            <Minus />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* SPECIFICATION ROW */}
                    {item.specs.map((row, rIndex) => (
                      <div
                        key={rIndex}
                        draggable
                        onDragStart={() => handleRowDragStart(index, rIndex)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleRowDrop(index, rIndex)}
                        className="space-y-2 border-2 border-orange-200 rounded-md p-3 bg-orange-50 cursor-move"
                      >
                        {/* HEADER */}
                        <div className="grid grid-cols-[2fr_1fr_120px] gap-2">
                          <Label className="block w-full text-center text-xs font-bold uppercase text-blue-700 tracking-widest">
                            SPECIFICATION
                          </Label>

                          <Label className="block w-full text-center text-xs font-bold uppercase text-orange-700 tracking-widest">
                            VALUE
                          </Label>

                          <Label className="block w-full text-center text-xs font-bold uppercase text-blue-700 tracking-widest">
                            ACTION
                          </Label>
                        </div>

                        {/* INPUT */}
                        <div className="grid grid-cols-[2fr_1fr_120px] gap-2 items-center">
                          <Input
                            className="border-blue-300 focus-visible:ring-blue-400 bg-white"
                            placeholder="Enter specification..."
                            value={row.specId ?? ""}
                            onChange={(e) =>
                              updateSpecField(
                                index,
                                rIndex,
                                "specId",
                                e.target.value,
                              )
                            }
                          />

                          <Input
                            className="border-orange-300 focus-visible:ring-orange-400 bg-white"
                            placeholder="Enter value..."
                            value={row.value ?? ""}
                            onChange={(e) =>
                              updateSpecField(
                                index,
                                rIndex,
                                "value",
                                e.target.value,
                              )
                            }
                          />

                          <div className="flex gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="outline"
                              className="border-blue-400 text-blue-700 hover:bg-blue-100"
                              onClick={() => addSpecRow(index)}
                            >
                              <Plus />
                            </Button>

                            <Button
                              size="icon"
                              variant="outline"
                              className="border-orange-400 text-orange-700 hover:bg-orange-100"
                              disabled={item.specs.length === 1}
                              onClick={() => removeSpecRow(index, rIndex)}
                            >
                              <Minus />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* PRODUCT USAGE */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                SELECT PRODUCT USAGE
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Select Product Usage</Label>
                <Input
                  value={categoryTypeSearch}
                  onChange={(e) => setCategoryTypeSearch(e.target.value)}
                  placeholder="Search Product Usage..."
                  className="h-8 w-[160px]"
                />
              </div>

              <div className="flex gap-2">
                <Input
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value)}
                  placeholder="Add category type..."
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddCategoryType}
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
                      <input
                        type="radio"
                        name="categoryType"
                        checked={
                          selectedCategoryTypes.length === 1 &&
                          selectedCategoryTypes[0].id === item.id
                        }
                        onChange={() =>
                          setSelectedCategoryTypes([
                            { id: item.id, name: item.name },
                          ])
                        }
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    <div className="flex gap-1">
                      <AddProductSelectProductType item={item} />
                      <AddProductDeleteProductType
                        item={item}
                        referenceID={user?.ReferenceID || ""}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SELECT PRODUCT FAMILY */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                SELECT PRODUCT FAMILY
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Select Product Family</Label>
                <Input
                  value={productFamilySearch}
                  onChange={(e) => setProductFamilySearch(e.target.value)}
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
                {filteredProductFamilies.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="productType"
                        checked={selectedProductFamily?.id === item.id}
                        onChange={() => selectProductFamily(item)}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-1">
                      <AddProductEditSelectProduct item={item} />

                      <AddProductDeleteProduct
                        item={{
                          id: item.id,
                          productName: item.name,
                          productUsageId: item.productUsageId,
                        }}
                        referenceID={user?.ReferenceID || ""}
                      />
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
        <Button onClick={handleSaveProduct} disabled={saving}>
          {saving ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </div>
  );
}
