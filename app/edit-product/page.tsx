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
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* 🔹 EDIT COMPONENT */
import AddProductSelectType from "@/components/add-product-edit-select-classifcation-type";

import AddProductSelectProductType from "@/components/add-product-edit-select-category-type";

import AddProductEditSelectProduct from "@/components/add-product-edit-select-product";

import AddProductEditBrandType from "@/components/add-product-edit-sister-company-type";

import AddProductDeleteBrand from "@/components/add-product-delete-select-sister-company";

/* 🔹 DELETE (SOFT DELETE) COMPONENT */
import AddProductDeleteClassification from "@/components/add-product-delete-select-classification-type";
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

type TechSpecRow = {
  specId: string;

  value: string;

  unit: string;
};

type TechSpec = {
  id?: string;
  title: string;
  specs: TechSpecRow[];
  units: string[];
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

  // ================== EDIT MODE: GET PRODUCT ID ==================
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  const productId = searchParams.get("id");
  const { userId } = useUser();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [pricePoint, setPricePoint] = useState("");
  const [brandOrigin, setBrandOrigin] = useState("");

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productName, setProductName] = useState("");

  const emptyRow = {
    specId: "",
    value: "",
    unit: "",
  };

  const [technicalSpecs, setTechnicalSpecs] = useState<TechSpec[]>([
    {
      title: "",
      specs: [emptyRow],
      units: [],
    },
  ]);

  // ================= DRAG TITLE =================
  const dragTitleIndex = React.useRef<number | null>(null);

  const handleTitleDragStart = (index: number) => {
    dragTitleIndex.current = index;
  };

  const handleTitleDrop = (dropIndex: number) => {
    if (dragTitleIndex.current === null) return;

    const copy = [...technicalSpecs];

    const dragged = copy[dragTitleIndex.current];

    copy.splice(dragTitleIndex.current, 1);

    copy.splice(dropIndex, 0, dragged);

    dragTitleIndex.current = null;

    setTechnicalSpecs(copy);
  };

  // ================= DRAG SPEC ROW =================

  const dragRowIndex = React.useRef<{
    specIndex: number;
    rowIndex: number;
  } | null>(null);

  const handleRowDragStart = (specIndex: number, rowIndex: number) => {
    dragRowIndex.current = { specIndex, rowIndex };
  };

  const handleRowDrop = (specIndex: number, dropRowIndex: number) => {
    if (!dragRowIndex.current) return;

    const { specIndex: fromSpec, rowIndex: fromRow } = dragRowIndex.current;

    if (fromSpec !== specIndex) return;

    const copy = [...technicalSpecs];

    const draggedRow = copy[specIndex].specs[fromRow];

    copy[specIndex].specs.splice(fromRow, 1);

    copy[specIndex].specs.splice(dropRowIndex, 0, draggedRow);

    dragRowIndex.current = null;

    setTechnicalSpecs(copy);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const hasLoadedProductSpecs = React.useRef(false);
  // ✅ TRACK CURRENT PRODUCT TYPE FOR EDIT MODE

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

  // ================== LOAD EXISTING PRODUCT (EDIT MODE) ==================
  useEffect(() => {
    if (!productId) return;

    hasLoadedProductSpecs.current = false;

    const productRef = doc(db, "products", productId);

    const unsubscribe = onSnapshot(
      productRef,
      (snap) => {
        try {
          if (!snap.exists()) {
            toast.error("Product not found");
            router.push("/products");
            return;
          }

          const data: any = snap.data();

          // ================= BASIC INFO =================
          setProductName(data.productName || "");

          // ================= SUPPLIER =================
          if (data.supplier) {
            setSelectedSupplier({
              supplierId: data.supplier.supplierId,
              company: data.supplier.company,
            });
          } else {
            setSelectedSupplier(null);
          }

          // ================= PRICE POINT =================
          setPricePoint(data.pricePoint || "");

          // ================= BRAND ORIGIN =================
          setBrandOrigin(data.brandOrigin || "");

          // ================= BRAND =================
          if (data.brandId) {
            setSelectedBrand({
              id: data.brandId,
              name: data.brandName,
            });
          } else {
            setSelectedBrand(null);
          }

          // ================= CLASSIFICATION =================
          if (data.classificationId) {
            setClassificationType({
              id: data.classificationId,
              name: data.classificationName,
            });
          } else {
            setClassificationType(null);
          }

          // ================= TECHNICAL SPECIFICATIONS =================
          if (Array.isArray(data.technicalSpecifications)) {
            const mappedSpecs = data.technicalSpecifications.map(
              (spec: any) => ({
                id: spec.technicalSpecificationId || "",
                title: spec.title || "",
                specs: Array.isArray(spec.specs)
                  ? spec.specs.map((row: any) => ({
                      specId: row.specId || "",
                      value: row.value || "",
                      unit: row.unit || "",
                    }))
                  : [
                      {
                        specId: "",
                        value: "",
                        unit: "",
                      },
                    ],
                units: [],
              }),
            );

            setTechnicalSpecs(
              mappedSpecs.length > 0
                ? mappedSpecs
                : [
                    {
                      id: "",
                      title: "",
                      specs: [
                        {
                          specId: "",
                          value: "",
                          unit: "",
                        },
                      ],
                      units: [],
                    },
                  ],
            );

            hasLoadedProductSpecs.current = true;
          }

          // ================= CATEGORY TYPES =================
          if (
            Array.isArray(data.categoryTypes) &&
            data.categoryTypes.length > 0
          ) {
            setSelectedCategoryTypes([
              {
                id: data.categoryTypes[0].productUsageId,
                name: data.categoryTypes[0].categoryTypeName,
              },
            ]);
          } else {
            setSelectedCategoryTypes([]);
          }

          // ================= PRODUCT TYPES =================
          if (
            Array.isArray(data.productFamilies) &&
            data.productFamilies.length > 0
          ) {
            const p = data.productFamilies[0];

            setSelectedCategoryTypes([
              {
                id: p.productUsageId,
                name:
                  data.categoryTypes?.find(
                    (c: any) => c.productUsageId === p.productUsageId,
                  )?.categoryTypeName || "",
              },
            ]);

            setSelectedProductFamily({
              id: p.productFamilyId,
              name: p.productFamilyName,
              productUsageId: p.productUsageId,
            });
          } else {
            setSelectedProductFamily(null);
          }

          // ================= IMAGE PREVIEW =================
          if (data.mainImage?.url) {
            setPreview(data.mainImage.url);
          } else {
            setPreview(null);
          }
        } catch (error) {
          console.error("Product snapshot error:", error);
        }
      },
      (error) => {
        console.error("Firestore listener error:", error);
        toast.error("Failed to load product");
      },
    );

    // ✅ CLEANUP — VERY IMPORTANT
    return () => {
      unsubscribe();
    };
  }, [productId, router]);

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
      const list = snapshot.docs.map((docSnap) => ({
        supplierId: docSnap.id,

        company: docSnap.data().company,
      }));

      setSuppliers(list);
    });

    return () => unsubscribe();
  }, []);

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

  /* ---------------- REAL-TIME PRODUCT TYPES (DEPENDS ON CLASSIFICATION) ---------------- */
  useEffect(() => {
    if (!classificationType) return;
    if (!selectedProductFamily) return;
    if (selectedCategoryTypes.length !== 1) return;

    // ❗ IMPORTANT: only run AFTER product fully loaded
    if (!hasLoadedProductSpecs.current) return;

    const productUsageId = selectedCategoryTypes[0].id;

    const unsubscribe = onSnapshot(
      doc(db, "products", productId!),

      (snap) => {
        if (!snap.exists()) return;

        const data: any = snap.data();

        // if same product type → restore original saved specs
        if (
          data.productFamilies?.[0]?.productFamilyId ===
          selectedProductFamily.id
        ) {
          if (Array.isArray(data.technicalSpecifications)) {
            const mappedSpecs = data.technicalSpecifications.map(
              (spec: any) => ({
                id: spec.technicalSpecificationId || "",

                title: spec.title || "",

                specs: Array.isArray(spec.specs)
                  ? spec.specs.map((row: any) => ({
                      specId: row.specId || "",
                      value: row.value || "",
                      unit: row.unit || "",
                    }))
                  : [{ specId: "", value: "", unit: "" }],

                units: [],
              }),
            );

            setTechnicalSpecs(mappedSpecs);
          }
        } else {
          // load specs from classificationTypes

          const q = query(
            collection(
              db,

              "classificationTypes",

              classificationType.id,

              "categoryTypes",

              productUsageId,

              "productFamilies",

              selectedProductFamily.id,

              "technicalSpecifications",
            ),

            where("isActive", "==", true),
          );

          getDocs(q).then((snapshot) => {
            const fetchedSpecs = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();

              return {
                id: docSnap.id,

                title: data.title || "",

                specs: Array.isArray(data.specs)
                  ? data.specs.map((row: any) => ({
                      specId: row.specId || "",
                      value: "",
                      unit: "",
                    }))
                  : [{ specId: "", value: "", unit: "" }],

                units: [],
              };
            });

            setTechnicalSpecs(fetchedSpecs);
          });
        }
      },
    );

    return () => unsubscribe();
  }, [selectedProductFamily?.id]);

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
          "productFamilies",
        ),
        where("isActive", "==", true),
      );

      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            name: docSnap.data().name as string,
            productUsageId: cat.id,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setProductFamilies((prev: ProductFamily[]) => {
          const filtered = prev.filter(
            (p: ProductFamily) => p.productUsageId !== cat.id,
          );
          const updated = [...filtered, ...list];

          // ✅ RESTORE SELECTED PRODUCT TYPE PROPERLY
          if (selectedProductFamily) {
            const match = updated.find(
              (p) => p.id === selectedProductFamily.id,
            );

            if (match) {
              setSelectedProductFamily(match);
            }
          }

          return updated;
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
    setSelectedProductFamily(null);

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

      // 🟢 IMPORTANT: Restore selected category type if existing
      setSelectedCategoryTypes((prev) =>
        prev.filter((p) => list.some((l) => l.id === p.id)),
      );
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

  /* ================= NUMBER FORMATTERS ================= */
  const formatPHP = (value: number, decimals = 2) => {
    return value.toLocaleString("en-PH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

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

  const updateTitle = (index: number, value: string) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, title: value } : item)),
    );
  };

  const updateSpecField = (
    specIndex: number,
    rowIndex: number,
    field: keyof TechSpecRow,
    value: any,
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

  const addTechnicalSpec = () => {
    setTechnicalSpecs((prev) => [
      ...prev,
      {
        title: "",
        specs: [emptyRow],
        units: [],
      },
    ]);
  };

  const removeTechnicalSpec = (index: number) => {
    setTechnicalSpecs((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  const addSpecRow = (index: number) => {
    setTechnicalSpecs((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, specs: [...item.specs, { ...emptyRow }] }
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

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    setMainImage(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

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
    });

    setNewClassification("");
  };

  /* ---------------- Sister Company Handlers ---------------- */
  const handleAddBrand = async () => {
    if (!newBrand.trim()) return;

    if (brands.some((s) => s.name === newBrand.trim())) {
      toast.error("Brand already exists");
      return;
    }

    await addDoc(collection(db, "brands"), {
      name: newBrand.trim(),
      isActive: true,
      createdAt: serverTimestamp(),
    });

    setNewBrand("");
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
    setSelectedCategoryTypes((prev) => {
      const isSame = prev.length === 1 && prev[0].id === item.id;

      if (isSame) {
        setSelectedProductFamily(null);
        setSelectedProductFamily(null);
        return [];
      }

      setSelectedProductFamily(null);
      setSelectedProductFamily(null);

      return [item];
    });
  };

  const selectProductFamily = (item: ProductFamily) => {
    setSelectedProductFamily(item);
  };

  const handleAddProductType = async () => {
    if (!newProductType.trim()) return;
    if (!classificationType) return;
    if (selectedCategoryTypes.length !== 1) {
      toast.error("Select exactly one category type to add a product type");
      return;
    }

    const productUsageId = selectedCategoryTypes[0].id;

    // Prevent duplicate
    if (
      productFamilies.some(
        (p) =>
          p.name === newProductType.trim() &&
          p.productUsageId === productUsageId,
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
        productUsageId,
        "productFamilies",
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
      if (!mainImage) return;

      const result = await uploadToCloudinary(mainImage);

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

  /* ===== SAFE LOGISTICS PAYLOAD (FIRESTORE SAFE) ===== */

  const syncSpecsToProductType = async () => {
    if (!classificationType) return;
    if (!selectedProductFamily) return;
    if (selectedCategoryTypes.length !== 1) return;

    try {
      const productUsageId = selectedCategoryTypes[0].id;

      const specsRef = collection(
        db,
        "classificationTypes",
        classificationType.id,
        "categoryTypes",
        productUsageId,
        "productFamilies",
        selectedProductFamily.id,
        "technicalSpecifications",
      );

      const existingSnapshot = await getDocs(specsRef);

      const batch = writeBatch(db);

      technicalSpecs.forEach((spec, index) => {
        if (!spec.title.trim()) return;

        const existingDoc = existingSnapshot.docs.find(
          (d) => d.data().title === spec.title,
        );

        const ref = existingDoc ? doc(specsRef, existingDoc.id) : doc(specsRef);

        batch.set(ref, {
          title: spec.title,

          order: index, // ✅ SAVE ORDER

          specs: spec.specs
            .filter((row) => row.specId.trim() !== "")
            .map((row, rowIndex) => ({
              specId: row.specId.trim(),

              value: row.value?.trim() || "",

              order: rowIndex, // ✅ SAVE ROW ORDER
            })),

          isActive: true,

          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      toast.success("Technical specifications saved successfully");
    } catch (error) {
      console.error(error);

      toast.error("Failed to save technical specifications");
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

      if (!selectedSupplier) {
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

      if (!classificationType) {
        toast.error("Please select a classification type");
        return;
      }

      if (!selectedBrand) {
        toast.error("Please select a brand");
        return;
      }

      // ================= CLOUDINARY UPLOAD =================

      // MAIN IMAGE
      // 🔥 INSTANT SAVE — NO MEDIA WAIT
      const productRef = doc(db, "products", productId!);

      const updatePayload: any = {
        productName,

        pricePoint,
        brandOrigin,

        brandId: selectedBrand.id,
        brandName: selectedBrand.name,

        classificationId: classificationType.id,
        classificationName: classificationType.name,

        supplier: {
          supplierId: selectedSupplier.supplierId,
          company: selectedSupplier.company,
        },

        /* ===== FIX: ALWAYS SAVE CATEGORY TYPE & PRODUCT TYPE ===== */

        categoryTypes:
          selectedCategoryTypes.length > 0
            ? selectedCategoryTypes.map((c) => ({
                productUsageId: c.id || "",
                categoryTypeName: c.name || "",
              }))
            : [],

        productFamilies:
          selectedProductFamily && selectedCategoryTypes.length > 0
            ? [
                {
                  productFamilyId: selectedProductFamily.id || "",
                  productFamilyName: selectedProductFamily.name || "",
                  productUsageId:
                    selectedProductFamily.productUsageId ||
                    selectedCategoryTypes[0].id ||
                    "",
                },
              ]
            : [],

        technicalSpecifications: technicalSpecs
          .filter((spec) => spec.title.trim() !== "")
          .map((spec, index) => ({
            technicalSpecificationId: spec.id || "",

            title: spec.title,

            order: index, // ✅ SAVE TITLE ORDER

            specs: spec.specs
              .filter((row) => row.specId.trim() !== "")
              .map((row, rowIndex) => ({
                specId: row.specId.trim(),

                value: row.value?.trim() || "",

                unit: row.unit || "",

                order: rowIndex, // ✅ SAVE ROW ORDER
              })),
          })),

        createdBy: userId,
        referenceID: user?.ReferenceID || null,
        isActive: true,
        createdAt: serverTimestamp(),
      };

      // ONLY reset media fields IF NEW FILES ARE ACTUALLY ADDED
      if (mainImage) {
        updatePayload.mediaStatus = "pending";
      }
      await updateDoc(productRef, updatePayload);

      toast.success("Product saved successfully");
      router.push("/products");

      // 🚀 background upload (wag hintayin)
      uploadProductMedia(productId!);
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
    <div className="h-dvh overflow-y-auto p-6 space-y-6 pb-[140px] md:pb-6">
      <SidebarTrigger className="hidden md:flex" />

      <h1 className="text-2xl font-bold">
        Edit Product –
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
                    accept="image/*"
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

            {/* ================= PRICE POINT SELECT ================= */}
            <div className="space-y-2">
              <Label>Price Point</Label>

              <select
                value={pricePoint}
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
                value={brandOrigin}
                onChange={(e) => setBrandOrigin(e.target.value)}
                className="w-[360px] border rounded-md h-10 px-3 text-sm bg-background"
              >
                <option value="">Select brand origin...</option>

                <option value="China">China</option>

                <option value="Non-China">Non-China</option>
              </select>
            </div>

            {/* ===== TECHNICAL SPECIFICATIONS (FULL EDITOR - EDIT MODE) ===== */}

            <div className="space-y-3">
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

              <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
                {technicalSpecs.map((item, index) => (
                  <Card
                    key={item.id || index}
                    draggable
                    onDragStart={() => handleTitleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleTitleDrop(index)}
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
                            productFamilyId={selectedProductFamily?.id || ""}
                            technicalSpecificationId={item.id}
                            title={item.title}
                            referenceID={user?.ReferenceID || ""}
                          />
                        ) : (
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-orange-400 text-orange-700 hover:bg-orange-100"
                            disabled={technicalSpecs.length === 1}
                            onClick={() =>
                              setTechnicalSpecs((prev) =>
                                prev.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Minus />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* SPEC ROWS */}

                    {(item.specs || []).map((row, rIndex) => (
                      <div
                        key={rIndex}
                        draggable
                        onDragStart={() => handleRowDragStart(index, rIndex)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleRowDrop(index, rIndex)}
                        className="space-y-2 border-2 border-orange-200 rounded-md p-3 bg-orange-50 cursor-move"
                      >
                        {/* HEADER */}

                        <div className="grid grid-cols-[1fr_1fr_120px] gap-2">
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

                        {/* INPUT ROW */}

                        <div className="grid grid-cols-[1fr_1fr_120px] gap-2 items-center">
                          <Input
                            className="border-blue-300 focus-visible:ring-blue-400 bg-white"
                            placeholder="Enter specification..."
                            value={row.specId}
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
                            value={row.value}
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

          {/* CATEGORY TYPE */}
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
                  placeholder="Search product usage..."
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
                {filteredProductFamilies.map((item: ProductFamily) => (
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
                      <AddProductEditSelectProduct
                        classificationId={
                          classificationType ? classificationType.id : ""
                        }
                        item={item}
                      />

                      <AddProductDeleteProduct
                        item={{
                          id: item.id,
                          productName: item.name,
                          productUsageId: item.productUsageId,
                          classificationId: classificationType
                            ? classificationType.id
                            : "",
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
