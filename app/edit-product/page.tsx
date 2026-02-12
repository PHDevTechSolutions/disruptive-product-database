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
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

/* 🔹 EDIT COMPONENT */
import AddProductSelectType from "@/components/add-product-edit-select-classifcation-type";
import AddProductSelectProductType from "@/components/add-product-edit-select-category-type";
import AddProductEditSelectProduct from "@/components/add-product-edit-select-product";
import AddProductEditSisterCompanyType from "@/components/add-product-edit-sister-company-type";

/* 🔹 DELETE (SOFT DELETE) COMPONENT */
import AddProductDeleteSisterCompany from "@/components/add-product-delete-select-sister-company";
import AddProductDeleteClassification from "@/components/add-product-delete-select-classification-type";
import AddProductDeleteProductType from "@/components/add-product-delete-select-category-type";
import AddProductDeleteProduct from "@/components/add-product-delete-select-product";
import AddProductEditSelectTechnicalSpecification from "@/components/add-product-edit-select-technical-specification";
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
  unit: string;

  isRanging: boolean;
  isSlashing: boolean;
  isDimension: boolean;
  isIPRating: boolean;

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

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [productName, setProductName] = useState("");

  const emptyRow: TechSpecRow = {
    specId: "",
    unit: "",
    isRanging: false,
    isSlashing: false,
    isDimension: false,
    isIPRating: false,
    value: "",
    rangeFrom: "",
    rangeTo: "",
    slashValues: [""],
    length: "",
    width: "",
    height: "",
    ipFirst: "",
    ipSecond: "",
  };

  const [technicalSpecs, setTechnicalSpecs] = useState<TechSpec[]>([
    {
      title: "",
      specs: [emptyRow],
      units: [],
    },
  ]);

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  type GalleryItem = {
    type: "image" | "video";
    file: File | null;
    preview: string;
  };

  const [galleryMedia, setGalleryMedia] = useState<GalleryItem[]>([]);

  const [classificationType, setClassificationType] =
    useState<SelectedClassification>(null);

  /* ===== SISTER COMPANY (REAL-TIME + SOFT DELETE) ===== */
  type SisterCompany = {
    id: string;
    name: string;
  };

  type SelectedSisterCompany = {
    id: string;
    name: string;
  } | null;

  const [selectedSisterCompany, setSelectedSisterCompany] =
    useState<SelectedSisterCompany>(null);

  const [sisterCompanies, setSisterCompanies] = useState<SisterCompany[]>([]);
  const [newSisterCompany, setNewSisterCompany] = useState("");
  const [sisterCompanySearch, setSisterCompanySearch] = useState("");

  /* ===== CLASSIFICATION (REAL-TIME + SOFT DELETE) ===== */
  const [classificationTypes, setClassificationTypes] = useState<
    Classification[]
  >([]);
  const [newClassification, setNewClassification] = useState("");

  /* ===== PRODUCT TYPE STATE ===== */
  const [newCategoryType, setNewCategoryType] = useState("");
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);

  /* ===== PRICING / LOGISTICS STATE (CTRL+F SAFE) ===== */
  type CalculationType = "LIGHTS" | "POLE";

  /* ===== ADDITIONAL LOGISTICS FIELDS ===== */
  type ProductCategory = "Economy" | "Mid-End" | "To Be Evaluated";

  /* ===== SUPPLIER DATA SHEET (FILES ARRAY) ===== */
  type SupplierDataSheetItem = {
    name: string;
    url: string;
    publicId: string;
  };

  type SupplierSheetRow = {
    file: File | null;
    existing?: {
      name: string;
      url: string;
      publicId: string;
    } | null;
  };

  const [supplierDataSheets, setSupplierDataSheets] = useState<
    SupplierSheetRow[]
  >([{ file: null }]);

  const [productCategory, setProductCategory] =
    useState<ProductCategory>("To Be Evaluated");

  const [moq, setMoq] = useState<number>(0);

  const [warrantyValue, setWarrantyValue] = useState<number>(0);
  const [warrantyUnit, setWarrantyUnit] = useState<"Days" | "Months" | "Years">(
    "Years",
  );

  const [calculationType, setCalculationType] =
    useState<CalculationType>("LIGHTS");
  /* ===== RESET FIELDS WHEN CALCULATION TYPE CHANGES ===== */
  useEffect(() => {
    if (calculationType === "POLE") {
      // clear LIGHTS-only fields
      setLength(0);
      setWidth(0);
      setHeight(0);
      setQtyPerCarton(1);
    }

    if (calculationType === "LIGHTS") {
      // clear POLE-only fields
      setQtyPerContainer(1);
    }
  }, [calculationType]);
  const [unitCost, setUnitCost] = useState<number>(0);

  // LIGHTS
  const [length, setLength] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [qtyPerCarton, setQtyPerCarton] = useState<number>(1);

  // POLE
  const [qtyPerContainer, setQtyPerContainer] = useState<number>(1);

  // RESULTS
  const [landedCost, setLandedCost] = useState<number>(0);
  const [srp, setSrp] = useState<number>(0);

  /* ===== MULTIPLE DIMENSIONS (EDIT MODE) ===== */
  const [useArrayInput, setUseArrayInput] = useState(false);

  type MultiRow = {
    itemName: string;
    unitCost: number;
    length: number;
    width: number;
    height: number;
    qtyPerCarton: number;
    landed: number;
    srp: number;
  };

  const [multiRows, setMultiRows] = useState<MultiRow[]>([
    {
      itemName: "",
      unitCost: 0,
      length: 0,
      width: 0,
      height: 0,
      qtyPerCarton: 1,
      landed: 0,
      srp: 0,
    },
  ]);

  /* ===== PRODUCT TYPE (DEPENDENT ON CATEGORY TYPE) ===== */
  type ProductType = {
    id: string;
    name: string;
    categoryTypeId: string;
  };

  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [selectedProductType, setSelectedProductType] =
    useState<ProductType | null>(null);
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

  // ================== LOAD EXISTING PRODUCT (EDIT MODE) ==================
  useEffect(() => {
    if (!productId) return;

    const loadProduct = async () => {
      try {
        const productRef = doc(db, "products", productId);

        const unsubscribe = onSnapshot(productRef, (snap) => {
          if (!snap.exists()) {
            toast.error("Product not found");
            router.push("/products");
            return;
          }

          const data: any = snap.data();

          // BASIC INFO
          setProductName(data.productName || "");

          // SUPPLIER
          if (data.supplier) {
            setSelectedSupplier({
              supplierId: data.supplier.supplierId,
              company: data.supplier.company,
            });
          }

          // SISTER COMPANY
          if (data.sisterCompanyId) {
            setSelectedSisterCompany({
              id: data.sisterCompanyId,
              name: data.sisterCompanyName,
            });
          }

          // CLASSIFICATION
          if (data.classificationId) {
            setClassificationType({
              id: data.classificationId,
              name: data.classificationName,
            });
          }

          // TECHNICAL SPECS ARRAY
          if (Array.isArray(data.technicalSpecifications)) {
            const mappedSpecs = data.technicalSpecifications.map(
              (spec: any) => ({
                id: spec.technicalSpecificationId || "",
                title: spec.title || "",
                specs: Array.isArray(spec.specs) ? spec.specs : [emptyRow],
                units: Array.isArray(spec.units) ? spec.units : [],
              }),
            );

            setTechnicalSpecs(
              mappedSpecs.length
                ? mappedSpecs
                : [
                    {
                      id: "",
                      title: "",
                      specs: [emptyRow],
                      units: [],
                    },
                  ],
            );
          }

          // CATEGORY TYPES ARRAY
          if (
            Array.isArray(data.categoryTypes) &&
            data.categoryTypes.length > 0
          ) {
            setSelectedCategoryTypes([
              {
                id: data.categoryTypes[0].categoryTypeId,
                name: data.categoryTypes[0].categoryTypeName,
              },
            ]);
          }

          // PRODUCT TYPES ARRAY
          if (
            Array.isArray(data.productTypes) &&
            data.productTypes.length > 0
          ) {
            const p = data.productTypes[0];
            setSelectedProductType({
              id: p.productTypeId,
              name: p.productTypeName,
              categoryTypeId: p.categoryTypeId,
            });
          }

          // LOGISTICS DATA
          if (data.logistics) {
            setCalculationType(data.logistics.calculationType || "LIGHTS");
            setUnitCost(data.logistics.unitCost || 0);

            setUseArrayInput(data.logistics.useArrayInput || false);

            if (data.logistics.multiDimensions) {
              setMultiRows(data.logistics.multiDimensions);
            }

            if (data.logistics.packaging) {
              setLength(data.logistics.packaging.length || 0);
              setWidth(data.logistics.packaging.width || 0);
              setHeight(data.logistics.packaging.height || 0);
              setQtyPerCarton(data.logistics.packaging.qtyPerCarton || 1);
            }

            setQtyPerContainer(data.logistics.qtyPerContainer || 1);
            setProductCategory(data.logistics.category || "To Be Evaluated");
            setMoq(data.logistics.moq || 0);

            if (data.logistics.warranty) {
              setWarrantyValue(data.logistics.warranty.value || 0);
              setWarrantyUnit(data.logistics.warranty.unit || "Years");
            }
          }

          // IMAGES (DISPLAY ONLY – CANNOT RELOAD FILE OBJECTS)

          if (Array.isArray(data.gallery)) {
            setGalleryMedia(
              data.gallery.map((g: any) => ({
                type: g.type,
                file: null as any,
                preview: g.url,
              })),
            );
          }

          if (data.mainImage?.url) {
            setPreview(data.mainImage.url);
          }

          // LOAD EXISTING SUPPLIER DATA SHEETS
          if (Array.isArray(data.supplierDataSheets)) {
            setSupplierDataSheets(
              data.supplierDataSheets.map((sheet: any) => ({
                file: null,
                existing: {
                  name: sheet.name,
                  url: sheet.url,
                  publicId: sheet.publicId,
                },
              })),
            );
          }
        });

        return () => unsubscribe();
      } catch (err) {
        console.error(err);
      }
    };

    loadProduct();
  }, [productId]);

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
    const q = query(
      collection(db, "sisterCompanies"),
      where("isActive", "==", true),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          name: docSnap.data().name as string,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setSisterCompanies(list);
    });

    return () => unsubscribe();
  }, []);

  /* ---------------- REAL-TIME CLASSIFICATIONS ---------------- */

  /* ---------------- REAL-TIME PRODUCT TYPES (DEPENDS ON CLASSIFICATION) ---------------- */

  useEffect(() => {
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedSpecs = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        const safeSpecs = Array.isArray(data.specs)
          ? data.specs.map((row: any) => ({
              specId: row.specId || "",
              unit: row.unit || "",

              isRanging: row.isRanging || false,
              isSlashing: row.isSlashing || false,
              isDimension: row.isDimension || false,
              isIPRating: row.isIPRating || false,

              value: row.value || "",

              rangeFrom: row.rangeFrom || "",
              rangeTo: row.rangeTo || "",

              slashValues:
                Array.isArray(row.slashValues) && row.slashValues.length
                  ? row.slashValues
                  : [""],

              length: row.length || "",
              width: row.width || "",
              height: row.height || "",

              ipFirst: row.ipFirst || "",
              ipSecond: row.ipSecond || "",
            }))
          : [{ ...emptyRow }];

        return {
          id: docSnap.id,
          title: data.title || "",
          specs: safeSpecs,
          units: Array.isArray(data.units) ? data.units : [],
        };
      });

      // 🧠 CHECK IF SAME AS CURRENT SPECS
      const current = JSON.stringify(technicalSpecs);
      const incoming = JSON.stringify(fetchedSpecs);

      // ONLY update if DIFFERENT
      if (current !== incoming) {
        setTechnicalSpecs(
          fetchedSpecs.length
            ? fetchedSpecs
            : [
                {
                  id: "",
                  title: "",
                  specs: [emptyRow],
                  units: [],
                },
              ],
        );
      }
    });

    return () => unsubscribe();
  }, [
    classificationType?.id,
    selectedProductType?.id,
    selectedCategoryTypes.map((c) => c.id).join(","),
  ]);

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
          const updated = [...filtered, ...list];

          // 🟢 IMPORTANT: restore selected product type if exists
          setSelectedProductType((current) =>
            current && updated.some((u) => u.id === current.id)
              ? current
              : null,
          );

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

  /* ---------------- Helpers ---------------- */

  const updateMultiRow = (index: number, field: keyof MultiRow, value: any) => {
    setMultiRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const addMultiRow = (index: number) => {
    setMultiRows((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, {
        itemName: "",
        unitCost: 0,
        length: 0,
        width: 0,
        height: 0,
        qtyPerCarton: 1,
        landed: 0,
        srp: 0,
      });
      return copy;
    });
  };

  const removeMultiRow = (index: number) => {
    setMultiRows((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  };

  /* ================= NUMBER FORMATTERS ================= */
  const formatPHP = (value: number, decimals = 2) => {
    return value.toLocaleString("en-PH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };
  /* ================= PRICING / LOGISTICS FORMULAS ================= */
  useEffect(() => {
    // ===== POLE LOGIC =====
    if (calculationType === "POLE") {
      let lc = 0;

      if (qtyPerContainer > 0) {
        lc = (unitCost * 60 + 600000 / qtyPerContainer) * 1.01;
      }

      setLandedCost(lc);
      setSrp(lc ? Math.ceil(lc / 0.45 / 100) * 100 : 0);
      return;
    }

    // ===== LIGHTS - MULTIPLE DIMENSIONS MODE =====
    if (calculationType === "LIGHTS" && useArrayInput) {
      let grandTotal = 0;

      const updated = multiRows.map((row) => {
        const cbm = (row.length * row.width * row.height) / 1_000_000;

        let landed = 0;
        let srp = 0;

        if (cbm > 0 && row.qtyPerCarton > 0) {
          const shippingPerItem = 520000 / ((65 / cbm) * row.qtyPerCarton);

          landed = (row.unitCost * 60 + shippingPerItem) * 1.01;

          srp = Math.ceil(landed / 0.35 / 10) * 10;
        }

        grandTotal += landed;

        return { ...row, landed, srp };
      });

      setMultiRows(updated);

      setLandedCost(grandTotal);
      setSrp(grandTotal ? Math.ceil(grandTotal / 0.35 / 100) * 100 : 0);
      return;
    }

    // ===== LIGHTS - SINGLE MODE =====
    if (calculationType === "LIGHTS" && !useArrayInput) {
      let lc = 0;

      const cbm = (length * width * height) / 1_000_000;

      if (cbm > 0 && qtyPerCarton > 0) {
        const shippingPerItem = 520000 / ((65 / cbm) * qtyPerCarton);

        lc = (unitCost * 60 + shippingPerItem) * 1.01;
      }

      setLandedCost(lc);
      setSrp(lc ? Math.ceil(lc / 0.35 / 10) * 10 : 0);
    }
  }, [
    calculationType,
    unitCost,
    length,
    width,
    height,
    qtyPerCarton,
    qtyPerContainer,
    useArrayInput,
    multiRows
      .map(
        (r) =>
          `${r.unitCost}-${r.length}-${r.width}-${r.height}-${r.qtyPerCarton}`,
      )
      .join("|"),
  ]);

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

  const toggleMode = (
    specIndex: number,
    rowIndex: number,
    mode: "isRanging" | "isSlashing" | "isDimension" | "isIPRating",
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
                    isIPRating: false,

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
                  isIPRating: mode === "isIPRating",

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
                    mode === "isSlashing" || mode === "isIPRating"
                      ? ""
                      : row.unit,
                };
              }),
            }
          : item,
      ),
    );
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

  /* ===== SUPPLIER DATA SHEET HANDLERS ===== */
  const updateSupplierSheet = (index: number, file: File | null) => {
    setSupplierDataSheets((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row, // KEEP EXISTING DATA
              file, // ADD NEW FILE
            }
          : row,
      ),
    );
  };

  const addSupplierSheetRow = (index: number) => {
    setSupplierDataSheets((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, { file: null });
      return copy;
    });
  };

  const removeSupplierSheetRow = (index: number) => {
    setSupplierDataSheets((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
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
  const handleAddSisterCompany = async () => {
    if (!newSisterCompany.trim()) return;

    if (sisterCompanies.some((s) => s.name === newSisterCompany.trim())) {
      toast.error("Sister company already exists");
      return;
    }

    await addDoc(collection(db, "sisterCompanies"), {
      name: newSisterCompany.trim(),
      isActive: true,
      createdAt: serverTimestamp(),
    });

    setNewSisterCompany("");
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

  const uploadProductMedia = async (productId: string) => {
    try {
      const uploads: Promise<any>[] = [];

      // Only upload NEW files (skip existing ones)
      if (mainImage) {
        uploads.push(uploadToCloudinary(mainImage));
      }

      galleryMedia.forEach((item) => {
        if (item.file) {
          uploads.push(uploadToCloudinary(item.file));
        }
      });

      // HUWAG mag return agad – kahit walang images, tuloy pa rin for documents
      if (uploads.length > 0) {
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

        let resultCursor = galleryIndex;

        const uploadedGallery = galleryMedia.map((item) => {
          if (!item.file) {
            return {
              type: item.type,
              name: "existing",
              url: item.preview,
              publicId: "existing",
            };
          }

          const r = results[resultCursor];
          resultCursor++;

          return {
            type: item.type,
            name: item.file.name,
            url: r.secure_url,
            publicId: r.public_id,
          };
        });

        await updateDoc(doc(db, "products", productId), {
          mainImage: uploadedMainImage || null,
          gallery: uploadedGallery,
          mediaStatus: "done",
        });
      }

      const finalSupplierSheets: SupplierDataSheetItem[] = [];

      // 1. KEEP EXISTING FILES (that were not removed)
      for (const row of supplierDataSheets) {
        if (row.existing && !row.file) {
          finalSupplierSheets.push({
            name: row.existing.name,
            url: row.existing.url,
            publicId: row.existing.publicId,
          });
        }
      }

      // 2. UPLOAD NEW FILES (added or replaced)
      for (const row of supplierDataSheets) {
        if (row.file) {
          const res = await uploadToCloudinary(row.file);

          finalSupplierSheets.push({
            name: row.file.name,
            url: res.secure_url,
            publicId: res.public_id,
          });
        }
      }

      // 3. SAVE UPDATED ARRAY (even if empty)
      await updateDoc(doc(db, "products", productId), {
        supplierDataSheets: finalSupplierSheets,
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

  const filteredSisterCompanies = React.useMemo(() => {
    return sisterCompanies.filter((item) =>
      item.name.toLowerCase().includes(sisterCompanySearch.toLowerCase()),
    );
  }, [sisterCompanies, sisterCompanySearch]);

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

  /* ===== SAFE LOGISTICS PAYLOAD (FIRESTORE SAFE) ===== */
  const logisticsPayload = {
    calculationType,
    unitCost: unitCost ?? 0,

    useArrayInput: useArrayInput,

    multiDimensions:
      calculationType === "LIGHTS" && useArrayInput ? multiRows : null,

    packaging:
      calculationType === "LIGHTS" && !useArrayInput
        ? {
            length: length ?? 0,
            width: width ?? 0,
            height: height ?? 0,
            qtyPerCarton: qtyPerCarton ?? 1,
          }
        : null,

    qtyPerContainer: calculationType === "POLE" ? (qtyPerContainer ?? 1) : null,

    landedCost: landedCost ?? 0,
    srp: srp ?? 0,

    category: productCategory || "To Be Evaluated",
    moq: moq ?? 0,

    warranty: {
      value: warrantyValue ?? 0,
      unit: warrantyUnit || "Years",
    },
  };

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

      const batch = writeBatch(db);

      technicalSpecs.forEach((spec) => {
        const ref = spec.id ? doc(specsRef, spec.id) : doc(specsRef);

batch.set(
  ref,
  {
    title: spec.title,

    specs: spec.specs.map((row) => {
      let formattedValue = "";

      if (row.isRanging) {
        formattedValue = `${row.rangeFrom} - ${row.rangeTo}${row.unit ? " " + row.unit : ""}`;
      } 
      else if (row.isSlashing) {
        formattedValue = row.slashValues.join("/");
      } 
      else if (row.isDimension) {
        formattedValue = `${row.length} x ${row.width} x ${row.height}${row.unit ? " " + row.unit : ""}`;
      } 
      else if (row.isIPRating) {
        formattedValue = `IP${row.ipFirst}${row.ipSecond}`;
      } 
      else {
        formattedValue = `${row.value}${row.unit ? " " + row.unit : ""}`;
      }

      return {
        ...row,
        value: formattedValue
      };
    }),

    units: spec.units,
    isActive: true,
    updatedAt: serverTimestamp(),
  },
  { merge: true },
);


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

      if (!classificationType) {
        toast.error("Please select a classification type");
        return;
      }

      if (!selectedSisterCompany) {
        toast.error("Please select a sister company");
        return;
      }

      // ================= CLOUDINARY UPLOAD =================

      // MAIN IMAGE
      // 🔥 INSTANT SAVE — NO MEDIA WAIT
      const productRef = doc(db, "products", productId!);

      const updatePayload: any = {
        productName,

        sisterCompanyId: selectedSisterCompany.id,
        sisterCompanyName: selectedSisterCompany.name,

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

technicalSpecifications: technicalSpecs.map((spec) => ({
  technicalSpecificationId: spec.id || "",
  title: spec.title,

  specs: spec.specs.map((row) => {
    let formattedValue = "";

    if (row.isRanging) {
      formattedValue = `${row.rangeFrom} - ${row.rangeTo}${row.unit ? " " + row.unit : ""}`;
    } 
    else if (row.isSlashing) {
      formattedValue = row.slashValues.join("/");
    } 
    else if (row.isDimension) {
      formattedValue = `${row.length} x ${row.width} x ${row.height}${row.unit ? " " + row.unit : ""}`;
    } 
    else if (row.isIPRating) {
      formattedValue = `IP${row.ipFirst}${row.ipSecond}`;
    } 
    else {
      formattedValue = `${row.value}${row.unit ? " " + row.unit : ""}`;
    }

    return {
      ...row,
      value: formattedValue
    };
  }),

  units: spec.units,
})),

        logistics: logisticsPayload,

        createdBy: userId,
        referenceID: user?.ReferenceID || null,
        isActive: true,
        createdAt: serverTimestamp(),
      };

      // ONLY reset media fields IF NEW FILES ARE ACTUALLY ADDED
      const hasNewMainImage = !!mainImage;
      const hasNewGalleryFiles = galleryMedia.some((g) => g.file);
      const hasNewDocuments = supplierDataSheets.some((s) => s.file);

      if (hasNewMainImage || hasNewGalleryFiles || hasNewDocuments) {
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
            <div>
              <Label>Product Name</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name..."
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

              <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3">
                {technicalSpecs.map((item, index) => (
                  <Card key={index} className="p-3 space-y-3">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Title"
                        value={item.title}
                        onChange={(e) => updateTitle(index, e.target.value)}
                      />

                      {item.id &&
                        classificationType &&
                        selectedCategoryTypes.length === 1 &&
                        selectedProductType && (
                          <AddProductEditSelectTechnicalSpecification
                            classificationId={classificationType.id}
                            categoryTypeId={selectedCategoryTypes[0].id}
                            productTypeId={selectedProductType.id}
                            technicalSpecificationId={item.id}
                            title={item.title}
                            specs={item.specs}
                            units={item.units}
                          />
                        )}

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
                          disabled={technicalSpecs.length === 1}
                          onClick={() => removeTechnicalSpec(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {(item.specs || []).map((row, rIndex) => (
                      <div
                        key={rIndex}
                        className="space-y-2 border p-2 rounded"
                      >
                        <div className="grid grid-cols-[2fr_1fr_1fr_120px_auto] gap-2 items-center">
                          {/* SPECIFICATION NAME */}
                          <Input
                            placeholder="Specification"
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

                          {/* DEFAULT MODE */}
                          {!row.isRanging &&
                            !row.isSlashing &&
                            !row.isDimension &&
                            !row.isIPRating && (
                              <Input
                                placeholder="Value"
                                value={row.value || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "value",
                                    e.target.value,
                                  )
                                }
                              />
                            )}

                          {/* RANGING MODE */}
                          {row.isRanging && (
                            <div className="flex gap-1 items-center">
                              <Input
                                placeholder="From"
                                value={row.rangeFrom || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "rangeFrom",
                                    e.target.value,
                                  )
                                }
                              />

                              <span>-</span>

                              <Input
                                placeholder="To"
                                value={row.rangeTo || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "rangeTo",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          )}

                          {/* SLASHING MODE - CUSTOM FORMAT */}
                          {row.isSlashing && (
                            <div className="flex flex-wrap items-center gap-1">
                              {row.slashValues.map((s, si) => (
                                <React.Fragment key={si}>
                                  <Input
                                    className="w-[80px]"
                                    placeholder="Value"
                                    value={s}
                                    onChange={(e) => {
                                      const newArr = [...row.slashValues];
                                      newArr[si] = e.target.value;

                                      setTechnicalSpecs((prev) =>
                                        prev.map((it, ii) =>
                                          ii === index
                                            ? {
                                                ...it,
                                                specs: it.specs.map((sr, ri) =>
                                                  ri === rIndex
                                                    ? {
                                                        ...sr,
                                                        slashValues: newArr,
                                                      }
                                                    : sr,
                                                ),
                                              }
                                            : it,
                                        ),
                                      );
                                    }}
                                  />

                                  {/* SHOW SLASH ONLY IF NOT LAST ITEM */}
                                  {si < row.slashValues.length - 1 && (
                                    <span className="px-1 font-bold">/</span>
                                  )}

                                  {/* ADD SLASH BUTTON */}
                                  {si === row.slashValues.length - 1 && (
                                    <div className="flex gap-1 ml-1">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() =>
                                          addSlashValue(index, rIndex)
                                        }
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>

                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={row.slashValues.length === 1}
                                        onClick={() =>
                                          removeSlashValue(index, rIndex, si)
                                        }
                                      >
                                        <Minus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          )}

                          {/* DIMENSION MODE */}
                          {row.isDimension && (
                            <div className="flex gap-1">
                              <Input
                                placeholder="L"
                                value={row.length || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "length",
                                    e.target.value,
                                  )
                                }
                              />
                              <Input
                                placeholder="W"
                                value={row.width || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "width",
                                    e.target.value,
                                  )
                                }
                              />
                              <Input
                                placeholder="H"
                                value={row.height || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "height",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          )}

                          {/* IP RATING MODE */}
                          {row.isIPRating && (
                            <div className="flex gap-1 items-center">
                              <span>IP</span>
                              <Input
                                placeholder="X"
                                value={row.ipFirst || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "ipFirst",
                                    e.target.value,
                                  )
                                }
                              />
                              <Input
                                placeholder="Y"
                                value={row.ipSecond || ""}
                                onChange={(e) =>
                                  updateSpecField(
                                    index,
                                    rIndex,
                                    "ipSecond",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          )}

                          {/* ADD / REMOVE ROW */}
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
                              disabled={item.specs.length === 1}
                              onClick={() => removeSpecRow(index, rIndex)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* UNIT FIELD */}
                          {!row.isSlashing && !row.isIPRating && (
                            <Input
                              placeholder="Unit"
                              className="w-[120px]"
                              value={row.unit || ""}
                              onChange={(e) =>
                                updateSpecField(
                                  index,
                                  rIndex,
                                  "unit",
                                  e.target.value,
                                )
                              }
                            />
                          )}
                        </div>

                        {/* CHECKBOX MODES */}
                        <div className="flex gap-3 text-sm mt-1">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={row.isRanging}
                              onChange={() =>
                                toggleMode(index, rIndex, "isRanging")
                              }
                            />
                            isRanging
                          </label>

                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={row.isSlashing}
                              onChange={() =>
                                toggleMode(index, rIndex, "isSlashing")
                              }
                            />
                            isSlashing
                          </label>

                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={row.isDimension}
                              onChange={() =>
                                toggleMode(index, rIndex, "isDimension")
                              }
                            />
                            isDimension
                          </label>

                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={row.isIPRating}
                              onChange={() =>
                                toggleMode(index, rIndex, "isIPRating")
                              }
                            />
                            isIPRating
                          </label>
                        </div>
                      </div>
                    ))}
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>

          {/* ================= PRICING / LOGISTICS ================= */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                PRICING / LOGISTICS
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* CALCULATION TYPE */}
              <div>
                <Label>Calculation Type</Label>
                <select
                  className="w-full h-10 border rounded-md px-2"
                  value={calculationType}
                  onChange={(e) =>
                    setCalculationType(e.target.value as CalculationType)
                  }
                >
                  <option value="LIGHTS">Lights</option>
                  <option value="POLE">Pole</option>
                </select>
              </div>

              {/* UNIT COST */}
              {calculationType === "LIGHTS" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={useArrayInput}
                    onCheckedChange={(v) => {
                      const newValue = !!v;
                      setUseArrayInput(newValue);

                      setUnitCost(0);
                      setLength(0);
                      setWidth(0);
                      setHeight(0);
                      setQtyPerCarton(1);

                      setMultiRows([
                        {
                          itemName: "",
                          unitCost: 0,
                          length: 0,
                          width: 0,
                          height: 0,
                          qtyPerCarton: 1,
                          landed: 0,
                          srp: 0,
                        },
                      ]);
                    }}
                  />
                  <Label>Multiple Dimensions ?</Label>
                </div>
              )}

              {calculationType === "LIGHTS" && !useArrayInput && (
                <div>
                  <Label>Unit Cost (USD)</Label>
                  <Input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                  />
                </div>
              )}
{calculationType === "LIGHTS" && !useArrayInput && (
  <div className="space-y-2">
    <Label>Packaging Dimensions (CM)</Label>

    <div className="grid grid-cols-4 gap-2">
      <Input
        type="number"
        placeholder="L"
        value={length || ""}
        onChange={(e) => setLength(Number(e.target.value))}
      />
      <Input
        type="number"
        placeholder="W"
        value={width || ""}
        onChange={(e) => setWidth(Number(e.target.value))}
      />
      <Input
        type="number"
        placeholder="H"
        value={height || ""}
        onChange={(e) => setHeight(Number(e.target.value))}
      />
      <Input
        type="number"
        placeholder="Qty/Box"
        value={qtyPerCarton || ""}
        onChange={(e) => setQtyPerCarton(Number(e.target.value))}
      />
    </div>
  </div>
)}

              {/* ================= LIGHTS ONLY ================= */}
              {calculationType === "LIGHTS" && useArrayInput && (
                <div className="space-y-2">
                  <Label>Multiple Packaging Dimensions</Label>

                  {multiRows.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2"
                    >
                      <Input
                        placeholder="Item Name"
                        value={row.itemName}
                        onChange={(e) =>
                          updateMultiRow(index, "itemName", e.target.value)
                        }
                      />

                      <Input
                        type="number"
                        placeholder="Unit Cost"
                        value={row.unitCost || ""}
                        onChange={(e) =>
                          updateMultiRow(
                            index,
                            "unitCost",
                            Number(e.target.value),
                          )
                        }
                      />

                      <Input
                        type="number"
                        placeholder="L"
                        value={row.length || ""}
                        onChange={(e) =>
                          updateMultiRow(
                            index,
                            "length",
                            Number(e.target.value),
                          )
                        }
                      />

                      <Input
                        type="number"
                        placeholder="W"
                        value={row.width || ""}
                        onChange={(e) =>
                          updateMultiRow(index, "width", Number(e.target.value))
                        }
                      />

                      <Input
                        type="number"
                        placeholder="H"
                        value={row.height || ""}
                        onChange={(e) =>
                          updateMultiRow(
                            index,
                            "height",
                            Number(e.target.value),
                          )
                        }
                      />

                      <Input
                        type="number"
                        placeholder="Qty/Box"
                        value={row.qtyPerCarton || ""}
                        onChange={(e) =>
                          updateMultiRow(
                            index,
                            "qtyPerCarton",
                            Number(e.target.value),
                          )
                        }
                      />

                      <Input disabled value={formatPHP(row.landed, 2)} />
                      <Input disabled value={formatPHP(row.srp, 0)} />

                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => addMultiRow(index)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          disabled={multiRows.length === 1}
                          onClick={() => removeMultiRow(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ================= POLE ONLY ================= */}
              {calculationType === "POLE" && (
                <div>
                  <Label>Quantity Per Container</Label>
                  <Input
                    type="number"
                    min={1}
                    value={qtyPerContainer || ""}
                    onChange={(e) => setQtyPerContainer(Number(e.target.value))}
                  />
                </div>
              )}

              <Separator />

              {/* RESULTS */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Landed Cost (PHP)</Label>
                  <Input value={formatPHP(landedCost, 2)} disabled />
                </div>
                <div>
                  <Label>SRP (PHP)</Label>
                  <Input value={formatPHP(srp, 0)} disabled />
                </div>
              </div>

              <Separator />

              {/* ===== ADDITIONAL LOGISTICS INFO ===== */}

              <div className="space-y-4">
                {/* CATEGORY */}
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full h-10 border rounded-md px-2"
                    value={productCategory}
                    onChange={(e) =>
                      setProductCategory(e.target.value as ProductCategory)
                    }
                  >
                    <option value="Economy">Economy</option>
                    <option value="Mid-End">Mid-End</option>
                    <option value="To Be Evaluated">To Be Evaluated</option>
                  </select>
                </div>

                {/* MOQ */}
                <div>
                  <Label>MOQ</Label>
                  <Input
                    type="number"
                    min={0}
                    value={moq || ""}
                    onChange={(e) => setMoq(Number(e.target.value))}
                    placeholder="Enter MOQ"
                  />
                </div>

                {/* WARRANTY */}
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <div>
                    <Label>Warranty</Label>
                    <Input
                      type="number"
                      min={0}
                      value={warrantyValue || ""}
                      onChange={(e) => setWarrantyValue(Number(e.target.value))}
                      placeholder="Enter number"
                    />
                  </div>

                  <div>
                    <Label>Unit</Label>
                    <select
                      className="w-full h-10 border rounded-md px-2"
                      value={warrantyUnit}
                      onChange={(e) =>
                        setWarrantyUnit(
                          e.target.value as "Days" | "Months" | "Years",
                        )
                      }
                    >
                      <option value="Days">Days</option>
                      <option value="Months">Months</option>
                      <option value="Years">Years</option>
                    </select>
                  </div>
                </div>

                {/* ===== SUPPLIER DATA SHEET ===== */}
                <div className="space-y-3">
                  <Label>Supplier&apos;s Data Sheet (PDF / Docs)</Label>

                  {supplierDataSheets.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_auto] gap-2 items-center"
                    >
                      <div className="space-y-1">
                        {/* SHOW EXISTING FILE IF PRESENT */}
                        {row.existing && !row.file && (
                          <div className="text-sm text-blue-600">
                            Current File:
                            <a
                              href={row.existing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline ml-1"
                            >
                              {row.existing.name}
                            </a>
                          </div>
                        )}

                        {/* SHOW NEWLY SELECTED FILE */}
                        {row.file && (
                          <div className="text-sm text-green-600">
                            New File: {row.file.name}
                          </div>
                        )}

                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) =>
                            updateSupplierSheet(
                              index,
                              e.target.files?.[0] || null,
                            )
                          }
                        />
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => addSupplierSheetRow(index)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="outline"
                          disabled={supplierDataSheets.length === 1}
                          onClick={() => removeSupplierSheetRow(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </Card>

        {/* RIGHT */}
        <div className="space-y-6">
          {/* SELECT SISTER COMPANY */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-sm">
                SELECT SISTER COMPANY
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* SEARCH */}
              <div className="flex items-center justify-between gap-2">
                <Label>Select Sister Company</Label>
                <Input
                  value={sisterCompanySearch}
                  onChange={(e) => setSisterCompanySearch(e.target.value)}
                  placeholder="Search sister company..."
                  className="h-8 w-[160px]"
                />
              </div>

              {/* ADD */}
              <div className="flex gap-2">
                <Input
                  value={newSisterCompany}
                  onChange={(e) => setNewSisterCompany(e.target.value)}
                  placeholder="Add sister company..."
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddSisterCompany}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              {/* LIST */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {filteredSisterCompanies.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="sisterCompany"
                        checked={selectedSisterCompany?.id === item.id}
                        onChange={() =>
                          setSelectedSisterCompany({
                            id: item.id,
                            name: item.name,
                          })
                        }
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>

                    <div className="flex gap-1">
                      {/* EDIT */}
                      <AddProductEditSisterCompanyType item={item} />

                      {/* DELETE */}
                      <AddProductDeleteSisterCompany
                        item={item}
                        referenceID={user?.ReferenceID || ""}
                      />
                    </div>
                  </div>
                ))}

                {filteredSisterCompanies.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sister companies found
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
                        classificationId={
                          classificationType ? classificationType.id : ""
                        }
                        item={item}
                      />

                      <AddProductDeleteProduct
                        item={{
                          id: item.id,
                          productName: item.name,
                          categoryTypeId: item.categoryTypeId,
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
