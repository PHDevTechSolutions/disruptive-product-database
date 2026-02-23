"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid"; // Import UUID for generating unique IDs
import { useRouter } from "next/navigation";
import { Plus, Minus, ImagePlus, Pencil } from "lucide-react";
import { GripVertical } from "lucide-react";
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

/* ================= DRAG IMPORTS ================= */
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
/* ================= END DRAG IMPORTS ================= */

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
import AddProductSelectType from "@/components/add-product-edit-select-classifcation-type";
import AddProductSelectProductType from "@/components/add-product-edit-select-category-type";
import AddProductEditSelectProduct from "@/components/add-product-edit-select-product";
import AddProductEditBrandType from "@/components/add-product-edit-sister-company-type";

/* 🔹 DELETE (SOFT DELETE) COMPONENT */
import AddProductDeleteBrand from "@/components/add-product-delete-select-sister-company";
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

/* ================= SORTABLE TITLE ================= */

function SortableSpecTitle({ id, children }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      {/* DRAG HANDLE */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
      >
        <GripVertical size={18} />
      </div>

      {children}
    </div>
  );
}

/* ================= END SORTABLE TITLE ================= */

/* ================= SORTABLE SPEC ROW ================= */

function SortableSpecRow({ id, children }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2">
      {/* DRAG HANDLE */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center text-muted-foreground"
      >
        <GripVertical size={16} />
      </div>

      {/* CONTENT */}
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ================= END SORTABLE SPEC ROW ================= */

export default function AddProductPage() {
  const router = useRouter();
  const { userId } = useUser();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

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
  type ProductType = {
    id: string;
    name: string;
    categoryTypeId: string;
  };

  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [selectedProductType, setSelectedProductType] =
    useState<ProductType | null>(null);

  /* ===== TECHNICAL SPECIFICATIONS DEPENDENT ON PRODUCT TYPE ===== */

  type SpecRow = {
    specId: string; // autogenerated permanent ID

    title: string; // ← ito ang editable

    unit: string;

    isRanging: boolean;
    isSlashing: boolean;
    isDimension: boolean;
    isRating: boolean;

    value: string;

    rangeFrom: string;
    rangeTo: string;

    slashValues: string[];

    length: string;
    width: string;
    height: string;

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

  /* ================= DRAG SENSOR ================= */

  const sensors = useSensors(useSensor(PointerSensor));

  /* ================= END DRAG SENSOR ================= */

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
        const list = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            name: docSnap.data().name as string,
            categoryTypeId: cat.id,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

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

  /* ===== REAL-TIME TECHNICAL SPECS (DEPENDENT ON PRODUCT TYPE) ===== */

  useEffect(() => {
    setTechnicalSpecs([]);

    if (!classificationType) return;
    if (!selectedProductType) return;
    if (selectedCategoryTypes.length !== 1) return;

    const categoryTypeId = selectedCategoryTypes[0].id;

    const q = query(
      collection(
        db,
        "classificationTypes",
        classificationType.id,
        "categoryTypes",
        categoryTypeId,
        "productTypes",
        selectedProductType.id,
        "technicalSpecifications",
      ),
      where("isActive", "==", true),
    );

    /* ✅ LOAD ONLY ONCE — NOT REALTIME */

    getDocs(q).then((snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,

        title: docSnap.data().title || "",

        specs: (docSnap.data().specs || []).map((row: any) => ({
          specId: row.specId || "",
          title: row.title || "",
          unit: row.unit || "",

          isRanging: row.isRanging || false,
          isSlashing: row.isSlashing || false,
          isDimension: row.isDimension || false,
          isRating: row.isRating || false,

          /* CLEAR VALUES BUT KEEP STRUCTURE */

          value: "",
          rangeFrom: "",
          rangeTo: "",

          slashValues: Array.isArray(row.slashValues)
            ? row.slashValues.map(() => "")
            : [""],

          length: "",
          width: "",
          height: "",

          ipFirst: "",
          ipSecond: "",
        })),
      }));

      setTechnicalSpecs(list);
    });
  }, [
    classificationType?.id,
    selectedProductType?.id,
    selectedCategoryTypes.map((c) => c.id).join(","),
  ]);

  const addTechnicalSpec = () => {
    setTechnicalSpecs((prev) => [
      ...prev,
      {
        id: uuidv4(), // Auto-generate a unique ID for each specification entry
        title: "",
        specs: [
          {
            specId: uuidv4(), // permanent unique id

            title: "", // editable title

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

  /* ================= TITLE DRAG HANDLER ================= */

  const handleTitleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setTechnicalSpecs((prev) => {
      const oldIndex = prev.findIndex(
        (item, i) => (item.id || item.title || `title-${i}`) === active.id,
      );

      const newIndex = prev.findIndex(
        (item, i) => (item.id || item.title || `title-${i}`) === over.id,
      );

      return arrayMove(prev, oldIndex, newIndex);
    });
  };
  /* ================= END TITLE DRAG HANDLER ================= */

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
                  specId: uuidv4(), // ✅ permanent unique ID

                  title: "", // ✅ editable specification name

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

  /* ================= SPEC ROW DRAG HANDLER ================= */

  const handleSpecRowDragEnd = (event: any, specIndex: number) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setTechnicalSpecs((prev) => {
      const updated = [...prev];

      const rows = updated[specIndex].specs;

      const oldIndex = rows.findIndex(
        (_, i) => `${rows[i].specId}-${i}` === active.id,
      );

      const newIndex = rows.findIndex(
        (_, i) => `${rows[i].specId}-${i}` === over.id,
      );

      updated[specIndex].specs = arrayMove(rows, oldIndex, newIndex);

      return updated;
    });
  };

  /* ================= END SPEC ROW DRAG HANDLER ================= */

  const updateSpecField = (
    specIndex: number,
    rowIndex: number,
    field:
      | "title"
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
                r === rowIndex
                  ? { ...row, [field]: value, order: rowIndex }
                  : row,
              ),
            }
          : item,
      ),
    );
  };
  useEffect(() => {
    setCategoryTypes([]);

    setSelectedCategoryTypes([]);
    setSelectedProductType(null);
    setProductTypes([]);

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

  /* ===== SAVE EDITABLE SPECS BACK TO PRODUCT TYPE COLLECTION ===== */

  const syncSpecsToProductType = async () => {
    if (!classificationType) return;
    if (!selectedProductType) return;
    if (selectedCategoryTypes.length !== 1) return;

    try {
      const categoryTypeId = selectedCategoryTypes[0].id;

      const specsRef = collection(
        db,
        "classificationTypes",
        classificationType.id,
        "categoryTypes",
        categoryTypeId,
        "productTypes",
        selectedProductType.id,
        "technicalSpecifications",
      );

      const existingSnapshot = await getDocs(specsRef);

      const batch = writeBatch(db);

      technicalSpecs.forEach((spec, specIndex) => {
        if (!spec.title.trim()) return;

const existingDoc = existingSnapshot.docs.find(
  (d) => d.data().titleId === spec.id
);

const ref = existingDoc
  ? doc(specsRef, existingDoc.id)
  : doc(specsRef);

        batch.set(ref, {
          titleId: spec.id, // Save the constant titleId
          title: spec.title, // Save the editable title
          specs: spec.specs
            .filter((row) => row.specId.trim() !== "")
            .map((row, rowIndex) => ({
              specId: row.specId.trim(), // permanent specId
              title: row.title?.trim() || "", // editable specification name
              value: row.value?.trim() || "",
              order: rowIndex, // Correctly assign the order here
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
        setSelectedProductType(null);
        setProductTypes([]);
        return [];
      }

      setSelectedProductType(null);
      setProductTypes([]);

      return [item];
    });
  };

  const selectProductType = (item: ProductType) => {
    setSelectedProductType(item);
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

  const filteredProductTypes = React.useMemo(() => {
    const allowedCategoryIds = selectedCategoryTypes.map((c) => c.id);

    return productTypes
      .filter(
        (item) =>
          allowedCategoryIds.includes(item.categoryTypeId) &&
          item.name.toLowerCase().includes(productTypeSearch.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [productTypes, productTypeSearch, selectedCategoryTypes]);

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

      if (!mainImage) {
        toast.error("Please upload main image");
        return;
      }

      // ================= CLOUDINARY UPLOAD =================

      // MAIN IMAGE
      const newProductReferenceID = await generateProductReferenceID();

      const productRef = await addDoc(collection(db, "products"), {
        productReferenceID: newProductReferenceID,

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

        productTypes: selectedProductType
          ? [
              {
                productTypeId: selectedProductType.id,
                productTypeName: selectedProductType.name,
                categoryTypeId: selectedProductType.categoryTypeId,
              },
            ]
          : [],

        categoryTypes: selectedCategoryTypes.map((c) => ({
          categoryTypeId: c.id,
          categoryTypeName: c.name,
        })),

        technicalSpecifications: technicalSpecs
          .filter((spec) => spec.title.trim() !== "")
          .map((spec, specIndex) => ({
            titleId: spec.id, // this should remain fixed
            technicalSpecificationId: spec.id || "",
            title: spec.title, // editable title
            order: specIndex,
            specs: spec.specs
              .filter((row) => row.specId.trim() !== "")
              .map((row, rowIndex) => ({
                specId: row.specId.trim(),
                title: row.title?.trim() || "",
                value: row.value?.trim() || "",
                order: rowIndex,
              })),
          })),

        mainImage: null,

        mediaStatus: "pending",

        createdBy: userId,

        referenceID: user?.ReferenceID || null,

        isActive: true,

        createdAt: serverTimestamp(),
      });

      await uploadProductMedia(productRef.id);

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

            {/* ===== TECHNICAL SPECIFICATIONS (EDITABLE) ===== */}

            {/* ================= DRAGGABLE TECH SPECS START ================= */}

            <div className="space-y-3">
              {/* ---- STICKY HEADER ---- */}
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

              {/* ---- SCROLLABLE CONTENT ---- */}

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTitleDragEnd}
              >
                <SortableContext
                  items={technicalSpecs.map(
                    (item, i) => item.id || item.title || `title-${i}`,
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
                    {technicalSpecs.map((item, index) => (
                      <SortableSpecTitle
                        key={item.id || index}
                        id={item.id || item.title || `title-${index}`}
                      >
                        <Card className="p-4 space-y-4 border-2 border-blue-200 bg-blue-50">
                          {/* ================= TITLE ================= */}

                          <div className="space-y-1">
                            {/* ✅ TITLE ID */}
                            <Label className="block w-full text-center text-xs font-bold uppercase text-blue-600 tracking-widest">
                              TITLE ID: {item.id}
                            </Label>

                            {/* TITLE TEXT */}
                            <Label className="block w-full text-center text-xs font-bold uppercase text-orange-600 tracking-widest cursor-grab active:cursor-grabbing">
                              TECHNICAL SPECIFICATION TITLE
                            </Label>

                            <div className="flex gap-2 items-center">
                              <Input
                                className="border-orange-300 focus-visible:ring-orange-400 bg-white"
                                placeholder="Enter title..."
                                value={item.title}
                                onChange={(e) =>
                                  updateTitle(index, e.target.value)
                                }
                              />

                              {item.id &&
                              classificationType &&
                              selectedProductType &&
                              selectedCategoryTypes.length === 1 ? (
                                <AddProductDeleteTechnicalSpecification
                                  classificationId={classificationType.id}
                                  categoryTypeId={selectedCategoryTypes[0].id}
                                  productTypeId={selectedProductType.id}
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

                          {/* ================= SPEC ROW DRAG ================= */}

                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) =>
                              handleSpecRowDragEnd(event, index)
                            }
                          >
                            <SortableContext
                              items={item.specs.map(
                                (row, i) => `${row.specId}-${i}`,
                              )}
                              strategy={verticalListSortingStrategy}
                            >
                              {item.specs.map((row, rIndex) => (
                                <SortableSpecRow
                                  key={`${row.specId}-${rIndex}`}
                                  id={`${row.specId}-${rIndex}`}
                                >
                                  <div className="space-y-2 border-2 border-orange-200 rounded-md p-3 bg-orange-50">
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

                                    <div className="grid grid-cols-[2fr_1fr_120px] gap-2 items-center cursor-grab active:cursor-grabbing">
                                      <Input
                                        className="border-blue-300 focus-visible:ring-blue-400 bg-white"
                                        placeholder="Enter specification..."
                                        value={row.title ?? ""}
                                        onChange={(e) =>
                                          updateSpecField(
                                            index,
                                            rIndex,
                                            "title",
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
                                          onClick={() =>
                                            removeSpecRow(index, rIndex)
                                          }
                                        >
                                          <Minus />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </SortableSpecRow>
                              ))}
                            </SortableContext>
                          </DndContext>

                          {/* ================= END SPEC ROW ================= */}
                        </Card>
                      </SortableSpecTitle>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* ================= DRAGGABLE TECH SPECS END ================= */}
          </CardContent>
        </Card>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* SELECT BRAND */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                SELECT BRAND
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* SEARCH */}

              <div className="flex items-center justify-between gap-2">
                <Label>Select Brand</Label>

                <Input
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Search brand..."
                  className="h-8 w-[160px]"
                />
              </div>

              {/* ADD */}

              <div className="flex gap-2">
                <Input
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="Add brand..."
                />

                <Button size="icon" variant="outline" onClick={handleAddBrand}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              {/* LIST */}

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredBrands.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="brand"
                        checked={selectedBrand?.id === item.id}
                        onChange={() =>
                          setSelectedBrand({
                            id: item.id,
                            name: item.name,
                          })
                        }
                      />

                      <span className="text-sm">{item.name}</span>
                    </div>

                    <div className="flex gap-1">
                      <AddProductEditBrandType item={item} />

                      <AddProductDeleteBrand
                        item={item}
                        referenceID={user?.ReferenceID || ""}
                      />
                    </div>
                  </div>
                ))}

                {filteredBrands.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No brands found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CLASSIFICATION */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                SELECT CLASSIFICATION TYPE
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
                      <input
                        type="radio"
                        name="classificationType"
                        checked={classificationType?.id === item.id}
                        onChange={() =>
                          setClassificationType({
                            id: item.id,
                            name: item.name,
                          })
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
                SELECT CATEGORY TYPE
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
                      <input
                        type="radio"
                        name="productType"
                        checked={selectedProductType?.id === item.id}
                        onChange={() => selectProductType(item)}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex gap-1">
                      <AddProductEditSelectProduct
                        classificationId={classificationType!.id}
                        item={item}
                      />

                      <AddProductDeleteProduct
                        item={{
                          id: item.id,
                          productName: item.name,
                          categoryTypeId: item.categoryTypeId,
                          classificationId: classificationType!.id,
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
