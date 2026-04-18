"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Plus, Minus, ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";

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
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { logProductEvent, logProductUsageEvent, logProductFamilyEvent } from "@/lib/auditlogger"; // ✅ AUDIT
import { triggerProductNotification } from "@/hooks/use-notification-triggers"; // ✅ NOTIFICATIONS

import AddProductSelectProductType from "@/components/add-product-edit-select-category-type";
import AddProductEditSelectProduct from "@/components/add-product-edit-select-product";
import AddProductDeleteProductType from "@/components/add-product-delete-select-category-type";
import AddProductDeleteProduct from "@/components/add-product-delete-select-product";
import AddProductDeleteTechnicalSpecification from "@/components/add-product-delete-technical-specification";
import RequestApprovalDialog from "@/components/request-approval-dialog";
import {
  createApprovalRequest,
  getApprovalUserProfile,
  shouldRequireApproval,
} from "@/lib/for-approval";

type UserData = { Firstname: string; Lastname: string; Role: string; ReferenceID: string };
type SpecRow = {
  specId: string; unit: string;
  isRanging: boolean; isSlashing: boolean; isDimension: boolean; isRating: boolean;
  value: string; rangeFrom: string; rangeTo: string; slashValues: string[];
  length: string; width: string; height: string; ipFirst: string; ipSecond: string;
};
type TechnicalSpecification = { id: string; title: string; specs: SpecRow[] };
type Classification = { id: string; name: string };
type SelectedClassification = { id: string; name: string } | null;
type CategoryType = { id: string; name: string };
type Supplier = { supplierId: string; company: string; supplierBrand?: string };
type Brand = { id: string; name: string };
type ProductFamily = { id: string; name: string; productUsageId: string };
type SelectedCategoryType = { id: string; name: string };
type PackagingDimension = { length: string; width: string; height: string; pcsPerCarton: string };

const convertDriveToThumbnail = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.includes("drive.google.com")) {
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return `file:///${encodeURI(trimmed.replace(/\\/g, "/"))}`;
  }
  if (/^\\\\[^\\]+\\[^\\]+/.test(trimmed)) {
    const uncPath = trimmed.replace(/\\/g, "/").replace(/^\/+/, "");
    return `file://${encodeURI(uncPath)}`;
  }
  return trimmed;
};

const emptySpecRow = (): SpecRow => ({
  specId: "", unit: "", isRanging: false, isSlashing: false, isDimension: false, isRating: false,
  value: "", rangeFrom: "", rangeTo: "", slashValues: [""], length: "", width: "", height: "", ipFirst: "", ipSecond: "",
});

interface AddProductComponentProps {
  onClose?: () => void;
}

export default function AddProductComponent({ onClose }: AddProductComponentProps) {
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedSupplierBrand, setSelectedSupplierBrand] = useState<Supplier | null>(null);
  const [noSupplier, setNoSupplier] = useState(false);

  const [pricePoint, setPricePoint] = useState("");
  const [brandOrigin, setBrandOrigin] = useState("");
  const [productClass, setProductClass] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [packLength, setPackLength] = useState("");
  const [packWidth, setPackWidth] = useState("");
  const [packHeight, setPackHeight] = useState("");
  const [pcsPerCarton, setPcsPerCarton] = useState("");
  const [hasMultipleDimensions, setHasMultipleDimensions] = useState(false);
  const [packagingDimensions, setPackagingDimensions] = useState<PackagingDimension[]>([{ length: "", width: "", height: "", pcsPerCarton: "" }]);
  const [factoryAddress, setFactoryAddress] = useState("");
  const [portOfDischarge, setPortOfDischarge] = useState("");

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageLink, setImageLink] = useState("");

  const [dimensionalDrawing, setDimensionalDrawing] = useState<File | null>(null);
  const [dimensionalPreview, setDimensionalPreview] = useState<string | null>(null);
  const [dimensionalLink, setDimensionalLink] = useState("");

  const [illuminanceDrawing, setIlluminanceDrawing] = useState<File | null>(null);
  const [illuminancePreview, setIlluminancePreview] = useState<string | null>(null);
  const [illuminanceLink, setIlluminanceLink] = useState("");

  const [classificationType, setClassificationType] = useState<SelectedClassification>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandSearch, setBrandSearch] = useState("");
  const [classificationTypes, setClassificationTypes] = useState<Classification[]>([]);
  const [newClassification, setNewClassification] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("");
  const [categoryTypes, setCategoryTypes] = useState<CategoryType[]>([]);
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([]);
  const [selectedProductFamily, setSelectedProductFamily] = useState<ProductFamily | null>(null);
  const [technicalSpecs, setTechnicalSpecs] = useState<TechnicalSpecification[]>([]);
  const [productFamilySearch, setProductFamilySearch] = useState("");
  const [newProductType, setNewProductType] = useState("");
  const [selectedCategoryTypes, setSelectedCategoryTypes] = useState<SelectedCategoryType[]>([]);
  const [classificationSearch, setClassificationSearch] = useState("");
  const [categoryTypeSearch, setCategoryTypeSearch] = useState("");
  const [requestApprovalOpen, setRequestApprovalOpen] = useState(false);
  const [requestingApproval, setRequestingApproval] = useState(false);

  const dragIndex = useRef<number | null>(null);
  const dragRow = useRef<{ specIndex: number; rowIndex: number } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("technicalSpecs");
    if (saved) setTechnicalSpecs(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then(r => r.json())
      .then(d => setUser({ Firstname: d.Firstname ?? "", Lastname: d.Lastname ?? "", Role: d.Role ?? "", ReferenceID: d.ReferenceID ?? "" }))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    const q = query(collection(db, "suppliers"), where("isActive", "==", true));
    return onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ supplierId: d.id, company: d.data().company, supplierBrand: d.data().supplierBrand || d.data().supplierBrandName || "" }));
      setSuppliers(list.sort((a, b) => a.company.localeCompare(b.company)));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "brands"), where("isActive", "==", true));
    return onSnapshot(q, snap => setBrands(snap.docs.map(d => ({ id: d.id, name: d.data().name as string })).sort((a, b) => a.name.localeCompare(b.name))));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "categoryTypes"), where("isActive", "==", true));
    return onSnapshot(q, snap => setCategoryTypes(snap.docs.map(d => ({ id: d.id, name: d.data().name }))));
  }, []);

  useEffect(() => {
    if (selectedCategoryTypes.length === 0) { setProductFamilies([]); return; }
    const q = query(collection(db, "productFamilies"), where("categoryTypeId", "==", selectedCategoryTypes[0].id), where("isActive", "==", true));
    return onSnapshot(q, snap => setProductFamilies(snap.docs.map(d => ({ id: d.id, name: d.data().name, productUsageId: d.data().categoryTypeId }))));
  }, [selectedCategoryTypes]);

  const addTechnicalSpec = () => setTechnicalSpecs(p => [...p, { id: "", title: "", specs: [emptySpecRow()] }]);
  const removeTechnicalSpec = (i: number) => setTechnicalSpecs(p => p.length > 1 ? p.filter((_, idx) => idx !== i) : p);
  const updateTitle = (i: number, v: string) => setTechnicalSpecs(p => p.map((x, idx) => idx === i ? { ...x, title: v } : x));
  const addSpecRow = (si: number) => setTechnicalSpecs(p => p.map((x, i) => i === si ? { ...x, specs: [...x.specs, emptySpecRow()] } : x));
  const removeSpecRow = (si: number, ri: number) => setTechnicalSpecs(p => p.map((x, i) => i === si ? { ...x, specs: x.specs.length > 1 ? x.specs.filter((_, r) => r !== ri) : x.specs } : x));
  const updateSpecField = (si: number, ri: number, field: keyof SpecRow, v: string) => {
    const copy = [...technicalSpecs];
    (copy[si].specs[ri] as any)[field] = v;
    setTechnicalSpecs(copy);
  };

  const handleDragStart = (i: number) => { dragIndex.current = i; };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (di: number) => {
    if (dragIndex.current === null) return;
    const copy = [...technicalSpecs];
    const dragged = copy[dragIndex.current];
    copy.splice(dragIndex.current, 1);
    copy.splice(di, 0, dragged);
    dragIndex.current = null;
    setTechnicalSpecs(copy);
  };
  const handleRowDragStart = (si: number, ri: number) => { dragRow.current = { specIndex: si, rowIndex: ri }; };
  const handleRowDrop = (si: number, dri: number) => {
    if (!dragRow.current || dragRow.current.specIndex !== si) return;
    const copy = [...technicalSpecs];
    const dragged = copy[si].specs[dragRow.current.rowIndex];
    copy[si].specs.splice(dragRow.current.rowIndex, 1);
    copy[si].specs.splice(dri, 0, dragged);
    dragRow.current = null;
    setTechnicalSpecs(copy);
  };

  const handleImageChange = (file: File | null) => {
    if (!file) return;
    setMainImage(file); setImageLink("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };
  const handleDimensionalChange = (file: File | null) => {
    if (!file) return;
    setDimensionalDrawing(file);
    if (dimensionalPreview) URL.revokeObjectURL(dimensionalPreview);
    setDimensionalPreview(URL.createObjectURL(file));
  };
  const handleIlluminanceChange = (file: File | null) => {
    if (!file) return;
    setIlluminanceDrawing(file);
    if (illuminancePreview) URL.revokeObjectURL(illuminancePreview);
    setIlluminancePreview(URL.createObjectURL(file));
  };

  // Multiple dimensions helpers
  const addPackagingDimension = () => setPackagingDimensions(p => [...p, { length: "", width: "", height: "", pcsPerCarton: "" }]);
  const removePackagingDimension = (index: number) => setPackagingDimensions(p => p.length > 1 ? p.filter((_, i) => i !== index) : p);
  const updatePackagingDimension = (index: number, field: keyof PackagingDimension, value: string) => {
    setPackagingDimensions(p => p.map((dim, i) => i === index ? { ...dim, [field]: value } : dim));
  };

  const handleAddCategoryType = async () => {
    if (!newCategoryType.trim()) return;
    const newCatRef = await addDoc(collection(db, "categoryTypes"), { name: newCategoryType.trim(), isActive: true, createdAt: serverTimestamp(), whatHappened: "Product Usage Added", date_updated: serverTimestamp() });
    await logProductUsageEvent({
      whatHappened    : "Product Usage Added",
      productUsageId  : newCatRef.id,
      productUsageName: newCategoryType.trim(),
      referenceID     : user?.ReferenceID,
      userId          : userId ?? undefined,
    });
    setNewCategoryType("");
  };

  const handleAddProductType = async () => {
    if (!newProductType.trim() || selectedCategoryTypes.length !== 1) return;
    const newFamRef = await addDoc(collection(db, "productFamilies"), { name: newProductType.trim(), categoryTypeId: selectedCategoryTypes[0].id, isActive: true, createdAt: serverTimestamp(), whatHappened: "Product Family Added", date_updated: serverTimestamp() });
    await logProductFamilyEvent({
      whatHappened     : "Product Family Added",
      productFamilyId  : newFamRef.id,
      productFamilyName: newProductType.trim(),
      productUsageId   : selectedCategoryTypes[0].id,
      referenceID      : user?.ReferenceID,
      userId           : userId ?? undefined,
    });
    setNewProductType("");
  };

  const selectProductFamily = async (item: ProductFamily) => {
    setSelectedProductFamily(item);
    if (selectedCategoryTypes.length !== 1) return;
    const snap = await getDocs(query(collection(db, "technicalSpecifications"), where("categoryTypeId", "==", selectedCategoryTypes[0].id), where("productFamilyId", "==", item.id), where("isActive", "==", true)));
    const loaded = snap.docs
      .map(d => ({ id: d.id, title: d.data().title, sortOrder: d.data().sortOrder ?? 999, specs: (d.data().specs || []).map((r: any) => ({ ...r, value: "" })) }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    setTechnicalSpecs(loaded);
  };

  const syncSpecsToProductType = async () => {
    if (!selectedProductFamily || selectedCategoryTypes.length !== 1) return;
    const { id: categoryTypeId } = selectedCategoryTypes[0];
    const snap = await getDocs(query(collection(db, "technicalSpecifications"), where("categoryTypeId", "==", categoryTypeId), where("productFamilyId", "==", selectedProductFamily.id)));
    const batch = writeBatch(db);
    technicalSpecs.forEach((spec, i) => {
      if (!spec.title.trim()) return;
      const existing = snap.docs.find(d => d.data().title === spec.title);
      const ref = existing ? doc(db, "technicalSpecifications", existing.id) : doc(collection(db, "technicalSpecifications"));
      batch.set(ref, { categoryTypeId, productFamilyId: selectedProductFamily.id, title: spec.title.trim(), sortOrder: i + 1, specs: spec.specs.filter(r => r.specId.trim()).map(r => ({ specId: r.specId.trim(), unit: r.unit || "", isRanging: r.isRanging || false, isSlashing: r.isSlashing || false, isDimension: r.isDimension || false, isRating: r.isRating || false, rangeFrom: r.rangeFrom || "", rangeTo: r.rangeTo || "", slashValues: r.slashValues || [""], length: r.length || "", width: r.width || "", height: r.height || "", ipFirst: r.ipFirst || "", ipSecond: r.ipSecond || "" })), isActive: true, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  };

  const syncProductsUsingThisFamily = async (productFamilyId: string, productFamilyName: string, categoryTypeId: string, templateSpecs: any[]) => {
    const q = query(collection(db, "products"), where("productFamilies", "array-contains", { productFamilyId, productFamilyName, productUsageId: categoryTypeId }));
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    const CHUNK_SIZE = 200;
    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      chunk.forEach(productDoc => {
        const ref = doc(db, "products", productDoc.id);
        const data: any = productDoc.data();
        const existingSpecs = data.technicalSpecifications || [];
        const mergedSpecs = templateSpecs.map((templateSpec) => {
          const existingSpec = existingSpecs.find((s: any) => s.technicalSpecificationId === templateSpec.id);
          return {
            technicalSpecificationId: templateSpec.id,
            title: templateSpec.title,
            specs: templateSpec.specs.map((templateRow: SpecRow) => {
              const existingRow = existingSpec?.specs?.find((r: SpecRow) => r.specId === templateRow.specId);
              return { specId: templateRow.specId, value: existingRow?.value || "" };
            }),
          };
        });
        batch.update(ref, { technicalSpecifications: mergedSpecs, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/upload-product", { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    if (!data.secure_url || !data.public_id) throw new Error("Invalid response");
    return data;
  };

  const uploadProductMedia = async (productId: string) => {
    try {
      if (mainImage) { const r = await uploadToCloudinary(mainImage); await updateDoc(doc(db, "products", productId), { mainImage: { name: mainImage.name, url: r.secure_url, publicId: r.public_id } }); }
      if (dimensionalDrawing) { const r = await uploadToCloudinary(dimensionalDrawing); await updateDoc(doc(db, "products", productId), { dimensionalDrawing: { name: dimensionalDrawing.name, url: r.secure_url, publicId: r.public_id } }); }
      if (illuminanceDrawing) { const r = await uploadToCloudinary(illuminanceDrawing); await updateDoc(doc(db, "products", productId), { illuminanceDrawing: { name: illuminanceDrawing.name, url: r.secure_url, publicId: r.public_id } }); }
      await updateDoc(doc(db, "products", productId), { mediaStatus: "done" });
    } catch { await updateDoc(doc(db, "products", productId), { mediaStatus: "failed" }); }
  };

  const generateProductReferenceID = async () => {
    try {
      const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(1)));
      if (snap.empty) return "PROD-SPF-00001";
      const last = snap.docs[0].data().productReferenceID || "PROD-SPF-00000";
      return `PROD-SPF-${(parseInt(last.replace("PROD-SPF-", ""), 10) + 1).toString().padStart(5, "0")}`;
    } catch { return `PROD-SPF-${Date.now().toString().slice(-5)}`; }
  };

  /* ---------------- Save ---------------- */
  const handleSaveProduct = async () => {
    if (saving) return;
    try {
      setSaving(true);
      if (!selectedSupplier && !noSupplier) { toast.error("Please select a supplier"); return; }
      if (!noSupplier && !pricePoint) { toast.error("Please select price point"); return; }
      if (!noSupplier && !brandOrigin) { toast.error("Please select brand origin"); return; }
      if (!productClass) { toast.error("Please select product class"); return; }
      if (!mainImage && !imageLink) { toast.error("Please upload an image or provide an image link"); return; }
      if (!selectedProductFamily) { toast.error("Please select product family"); setSaving(false); return; }

      const profile = userId ? await getApprovalUserProfile(userId) : null;
      const requiresApproval = shouldRequireApproval(profile);
      if (requiresApproval) {
        setRequestApprovalOpen(true);
        return;
      }

      const newProductReferenceID = await generateProductReferenceID();
      const categoryTypeId = selectedCategoryTypes[0]?.id;

      await syncSpecsToProductType();
      await syncProductsUsingThisFamily(selectedProductFamily.id, selectedProductFamily.name, categoryTypeId, technicalSpecs);

      // Prepare packaging data based on multiple dimensions checkbox
      const packagingData = hasMultipleDimensions
        ? packagingDimensions
            .filter(d => d.length || d.width || d.height)
            .map(d => ({
              length: d.length ? `${parseFloat(d.length)} cm` : null,
              width: d.width ? `${parseFloat(d.width)} cm` : null,
              height: d.height ? `${parseFloat(d.height)} cm` : null,
              pcsPerCarton: d.pcsPerCarton ? parseInt(d.pcsPerCarton) : null,
            }))
        : {
            length: packLength ? `${parseFloat(packLength)} cm` : null,
            width: packWidth ? `${parseFloat(packWidth)} cm` : null,
            height: packHeight ? `${parseFloat(packHeight)} cm` : null,
          };

      const pcsPerCartonValue = hasMultipleDimensions
        ? null
        : pcsPerCarton ? parseInt(pcsPerCarton) : null;

      const productRef = await addDoc(collection(db, "products"), {
        productReferenceID: newProductReferenceID,
        pricePoint: noSupplier ? "ECONOMY" : pricePoint,
        brandOrigin: noSupplier ? "CHINA" : brandOrigin,
        productClass,
        supplier: noSupplier ? null : { supplierId: selectedSupplier!.supplierId, company: selectedSupplier!.company, supplierBrand: selectedSupplierBrand?.supplierBrand || "" },
        productFamilies: [{ productFamilyId: selectedProductFamily.id, productFamilyName: selectedProductFamily.name, productUsageId: categoryTypeId || "" }],
        categoryTypes: selectedCategoryTypes.map(c => ({ productUsageId: c.id, categoryTypeName: c.name })),
        commercialDetails: {
          unitCost: unitCost ? parseFloat(unitCost) : null,
          packaging: packagingData,
          pcsPerCarton: pcsPerCartonValue,
          factoryAddress: factoryAddress || "",
          portOfDischarge: portOfDischarge || "",
          hasMultipleDimensions,
        },
        technicalSpecifications: technicalSpecs.filter(s => s.title.trim()).map(s => ({
          technicalSpecificationId: s.id || "",
          title: s.title,
          specs: s.specs.filter(r => r.specId.trim()).map(r => ({ specId: r.specId.trim(), value: r.value?.trim() || "" })),
        })),
        mainImage: imageLink ? { name: "external-image", url: imageLink, publicId: null } : null,
        dimensionalDrawing: dimensionalLink ? { name: "external-image", url: dimensionalLink, publicId: null } : null,
        illuminanceDrawing: illuminanceLink ? { name: "external-image", url: illuminanceLink, publicId: null } : null,
        mediaStatus: mainImage ? "pending" : "done",
        createdBy: userId,
        referenceID: user?.ReferenceID || null,
        isActive: true,
        createdAt: serverTimestamp(),
        whatHappened: "Product Added",
        date_updated: serverTimestamp(),
      });

      if (mainImage) await uploadProductMedia(productRef.id);

      // ✅ AUDIT LOG
      await logProductEvent({
        whatHappened      : "Product Added",
        productId         : productRef.id,
        productReferenceID: newProductReferenceID,
        productClass,
        pricePoint        : noSupplier ? "ECONOMY" : pricePoint,
        brandOrigin       : noSupplier ? "CHINA" : brandOrigin,
        supplier          : noSupplier ? null : {
          supplierId   : selectedSupplier!.supplierId,
          company      : selectedSupplier!.company,
          supplierBrand: selectedSupplierBrand?.supplierBrand || "",
        },
        categoryTypes : selectedCategoryTypes.map(c => ({ productUsageId: c.id, categoryTypeName: c.name })),
        productFamilies: selectedProductFamily
          ? [{ productFamilyId: selectedProductFamily.id, productFamilyName: selectedProductFamily.name }]
          : [],
        mainImage          : imageLink ? { url: imageLink } : null,
        dimensionalDrawing : dimensionalLink ? { url: dimensionalLink } : null,
        illuminanceDrawing : illuminanceLink ? { url: illuminanceLink } : null,
        technicalSpecifications: technicalSpecs.filter(s => s.title.trim()).map(s => ({
          technicalSpecificationId: s.id || "",
          title: s.title,
          specs: s.specs.filter(r => r.specId.trim()).map(r => ({ specId: r.specId.trim(), value: r.value?.trim() || "" })),
        })),
        referenceID: user?.ReferenceID,
        userId     : userId ?? undefined,
      });

      // ✅ TRIGGER PUSH NOTIFICATION
      void triggerProductNotification(
        newProductReferenceID || productClass || "New Product",
        user?.Firstname ? `${user.Firstname} ${user.Lastname || ""}`.trim() : "Someone"
      );

      toast.success("Product saved successfully");
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save product");
    } finally { setSaving(false); }
  };

  const handleRequestApproval = async (message: string) => {
    try {
      if (!userId) return;
      setRequestingApproval(true);
      const profile = await getApprovalUserProfile(userId);
      if (!profile) {
        toast.error("User profile not loaded");
        return;
      }
      const resolvedMainImage = imageLink || (mainImage ? (await uploadToCloudinary(mainImage)).secure_url : null);
      const resolvedDimensionalDrawing = dimensionalLink || (dimensionalDrawing ? (await uploadToCloudinary(dimensionalDrawing)).secure_url : null);
      const resolvedIlluminanceDrawing = illuminanceLink || (illuminanceDrawing ? (await uploadToCloudinary(illuminanceDrawing)).secure_url : null);
      await createApprovalRequest({
        actionType: "product_add",
        entityLabel: productClass || "New Product",
        requester: profile,
        message,
        summary: `Add product: ${productClass || "Unspecified Class"}`,
        payload: {
          productClass,
          pricePoint: noSupplier ? "ECONOMY" : pricePoint,
          brandOrigin: noSupplier ? "CHINA" : brandOrigin,
          supplier: noSupplier ? null : {
            supplierId: selectedSupplier?.supplierId ?? null,
            company: selectedSupplier?.company ?? "",
            supplierBrand: selectedSupplierBrand?.supplierBrand || "",
          },
          categoryTypes: selectedCategoryTypes.map(c => ({ productUsageId: c.id, categoryTypeName: c.name })),
          productFamily: selectedProductFamily ? { productFamilyId: selectedProductFamily.id, productFamilyName: selectedProductFamily.name } : null,
          commercialDetails: {
            unitCost: unitCost ? parseFloat(unitCost) : null,
            packaging: {
              length: packLength ? `${parseFloat(packLength)} cm` : null,
              width: packWidth ? `${parseFloat(packWidth)} cm` : null,
              height: packHeight ? `${parseFloat(packHeight)} cm` : null,
            },
            pcsPerCarton: pcsPerCarton ? parseInt(pcsPerCarton) : null,
            factoryAddress: factoryAddress || "",
            portOfDischarge: portOfDischarge || "",
          },
          mainImage: resolvedMainImage,
          dimensionalDrawing: resolvedDimensionalDrawing,
          illuminanceDrawing: resolvedIlluminanceDrawing,
          technicalSpecifications: technicalSpecs.filter(s => s.title.trim()).map(s => ({
            technicalSpecificationId: s.id || "",
            title: s.title,
            specs: s.specs.filter(r => r.specId.trim()).map(r => ({ specId: r.specId.trim(), value: r.value?.trim() || "" })),
          })),
        },
      });
      await logProductEvent({
        whatHappened: "Product For Approval Requested",
        productClass,
        pricePoint: noSupplier ? "ECONOMY" : pricePoint,
        brandOrigin: noSupplier ? "CHINA" : brandOrigin,
        referenceID: profile.referenceID,
        userId,
      });
      toast.success("Request sent for approval");
      setRequestApprovalOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error("Request approval failed:", error);
      toast.error("Failed to send approval request");
    } finally {
      setRequestingApproval(false);
    }
  };

  const filteredCategoryTypes = React.useMemo(() => categoryTypes.filter(i => i.name.toLowerCase().includes(categoryTypeSearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [categoryTypes, categoryTypeSearch]);
  const filteredProductFamilies = React.useMemo(() => productFamilies.filter(i => selectedCategoryTypes.map(c => c.id).includes(i.productUsageId) && i.name.toLowerCase().includes(productFamilySearch.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)), [productFamilies, productFamilySearch, selectedCategoryTypes]);

  if (loading) return null;

  const ImageUploadCard = ({ label, file, previewUrl, link, onFile, onLink }: { label: string; file: File | null; previewUrl: string | null; link: string; onFile: (f: File | null) => void; onLink: (l: string, p: string) => void }) => (
    <Card>
      <CardHeader><CardTitle className="text-center text-xs font-bold uppercase tracking-wide">{label}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <label
          className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl h-40 cursor-pointer hover:border-blue-400 transition bg-gray-50"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("image/")) onFile(f); else toast.error("Only image files allowed"); }}
        >
          {previewUrl ? <img src={previewUrl} className="h-full w-full object-contain rounded-xl p-1" /> : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <ImagePlus className="h-8 w-8" />
              <span className="text-xs">Tap or drag image</span>
            </div>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={e => onFile(e.target.files?.[0] || null)} />
        </label>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">Or paste image link</Label>
          <Input placeholder="https://..." value={link} onChange={e => { const orig = e.target.value; onLink(orig, convertDriveToThumbnail(orig)); }} className="text-xs" />
        </div>
      </CardContent>
    </Card>
  );

  return (
  <>
  <div className="h-screen overflow-hidden bg-gray-50">
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-35">

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 md:gap-6">

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm text-center">PRODUCT IMAGES</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl h-52 cursor-pointer hover:border-blue-400 transition bg-gray-50"
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith("image/")) handleImageChange(f); else toast.error("Only image files allowed"); }}
              >
                {preview ? <img src={preview} className="h-full w-full object-contain p-2" /> : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ImagePlus className="h-10 w-10" />
                    <span className="text-sm">Tap or drag main image here</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e.target.files?.[0] || null)} />
              </label>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Or paste image link</Label>
                <Input placeholder="https://..." value={imageLink} onChange={e => { const orig = e.target.value; setImageLink(orig); setMainImage(null); setPreview(convertDriveToThumbnail(orig)); }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ImageUploadCard label="Dimensional Drawing" file={dimensionalDrawing} previewUrl={dimensionalPreview} link={dimensionalLink} onFile={handleDimensionalChange} onLink={(orig, conv) => { setDimensionalLink(orig); setDimensionalDrawing(null); setDimensionalPreview(conv); }} />
                <ImageUploadCard label="Illuminance Drawing" file={illuminanceDrawing} previewUrl={illuminancePreview} link={illuminanceLink} onFile={handleIlluminanceChange} onLink={(orig, conv) => { setIlluminanceLink(orig); setIlluminanceDrawing(null); setIlluminancePreview(conv); }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Supplier & Classification</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={noSupplier} onChange={e => { setNoSupplier(e.target.checked); if (e.target.checked) { setSelectedSupplier(null); setSelectedSupplierBrand(null); setPricePoint("ECONOMY"); setBrandOrigin("CHINA"); } }} className="rounded" />
                No supplier for this product
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Supplier / Company</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={noSupplier} className="w-full justify-between text-sm h-10">
                        <span className="truncate">{selectedSupplier ? selectedSupplier.company : "Select supplier..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-72">
                      <Command>
                        <CommandInput placeholder="Search supplier..." />
                        <CommandEmpty>No supplier found.</CommandEmpty>
                        <CommandGroup>
                          {suppliers.map(s => (
                            <CommandItem key={s.supplierId} value={s.company} onSelect={() => { setSelectedSupplier(s); setSelectedSupplierBrand(s); }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedSupplier?.supplierId === s.supplierId ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{s.company}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Supplier Brand</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={noSupplier} className="w-full justify-between text-sm h-10">
                        <span className="truncate">{selectedSupplierBrand ? selectedSupplierBrand.supplierBrand || "No brand" : "Select brand..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-72">
                      <Command>
                        <CommandInput placeholder="Search brand..." />
                        <CommandEmpty>No brand found.</CommandEmpty>
                        <CommandGroup>
                          {suppliers.map(s => (
                            <CommandItem key={s.supplierId} value={s.supplierBrand} onSelect={() => { setSelectedSupplierBrand(s); setSelectedSupplier(s); }}>
                              <Check className={cn("mr-2 h-4 w-4", selectedSupplierBrand?.supplierId === s.supplierId ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{s.supplierBrand || "No Brand"}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Price Point</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={noSupplier} className="w-full justify-between text-sm h-10 uppercase">
                        {noSupplier ? "ECONOMY" : pricePoint || "Select..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-56">
                      <Command>
                        <CommandGroup>
                          {["ECONOMY", "MID-END", "HIGH-END"].map(item => (
                            <CommandItem key={item} value={item} onSelect={() => setPricePoint(item)}>
                              <Check className={cn("mr-2 h-4 w-4", pricePoint === item ? "opacity-100" : "opacity-0")} />{item}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Brand Origin</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" disabled={noSupplier} className="w-full justify-between text-sm h-10 uppercase">
                        {noSupplier ? "CHINA" : brandOrigin || "Select..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-56">
                      <Command>
                        <CommandGroup>
                          {["CHINA", "NON-CHINA"].map(item => (
                            <CommandItem key={item} value={item} onSelect={() => setBrandOrigin(item)}>
                              <Check className={cn("mr-2 h-4 w-4", brandOrigin === item ? "opacity-100" : "opacity-0")} />{item}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-gray-500">Product Class</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between text-sm h-10 uppercase">
                        {productClass || "Select product class..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-56">
                      <Command>
                        <CommandGroup>
                          {["STANDARD", "SPF"].map(item => (
                            <CommandItem key={item} value={item} onSelect={() => setProductClass(item)}>
                              <Check className={cn("mr-2 h-4 w-4", productClass === item ? "opacity-100" : "opacity-0")} />{item}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm text-center">COMMERCIAL DETAILS</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Unit Cost (USD)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={unitCost} onChange={e => setUnitCost(e.target.value)} />
              </div>
              {/* Multiple Dimensions Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="multiple-dimensions"
                  checked={hasMultipleDimensions}
                  onCheckedChange={(checked) => setHasMultipleDimensions(checked as boolean)}
                />
                <Label htmlFor="multiple-dimensions" className="text-sm text-gray-600 cursor-pointer">
                  Multiple Dimensions
                </Label>
              </div>

              {/* Single Dimension Mode */}
              {!hasMultipleDimensions && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Packaging (cm) — L × W × H</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" step="0.01" placeholder="Length" value={packLength} onChange={e => setPackLength(e.target.value)} />
                      <Input type="number" step="0.01" placeholder="Width" value={packWidth} onChange={e => setPackWidth(e.target.value)} />
                      <Input type="number" step="0.01" placeholder="Height" value={packHeight} onChange={e => setPackHeight(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">pcs / carton</Label>
                    <Input type="number" step="1" placeholder="0" value={pcsPerCarton} onChange={e => setPcsPerCarton(e.target.value)} />
                  </div>
                </>
              )}

              {/* Multiple Dimensions Mode */}
              {hasMultipleDimensions && (
                <div className="space-y-3">
                  {packagingDimensions.map((dim, index) => (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">Dimension Set {index + 1}</span>
                        {packagingDimensions.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-red-500"
                            onClick={() => removePackagingDimension(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Length"
                          value={dim.length}
                          onChange={e => updatePackagingDimension(index, 'length', e.target.value)}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Width"
                          value={dim.width}
                          onChange={e => updatePackagingDimension(index, 'width', e.target.value)}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Height"
                          value={dim.height}
                          onChange={e => updatePackagingDimension(index, 'height', e.target.value)}
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          step="1"
                          placeholder="pcs / carton"
                          value={dim.pcsPerCarton}
                          onChange={e => updatePackagingDimension(index, 'pcsPerCarton', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addPackagingDimension}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Dimension Set
                  </Button>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Factory Address</Label>
                <textarea className="w-full border rounded-xl p-2.5 text-sm bg-white resize-none" rows={3} placeholder="Enter factory address..." value={factoryAddress} onChange={e => setFactoryAddress(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Port of Discharge</Label>
                <Input placeholder="e.g. Manila, PH" value={portOfDischarge} onChange={e => setPortOfDischarge(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Technical Specifications</Label>
              <Button size="sm" variant="outline" onClick={addTechnicalSpec} className="h-8 text-xs rounded-xl">+ Add Group</Button>
            </div>
            <div className="max-h-150 overflow-y-auto pr-1 space-y-3">
              {technicalSpecs.map((item, index) => (
                <Card key={index} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)} className="border-2 border-blue-200 bg-blue-50 cursor-move">
                  <CardContent className="p-3 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-orange-600 tracking-widest block text-center">Group Title</Label>
                      <div className="flex gap-2">
                        <Input className="border-orange-300 bg-white text-sm" placeholder="e.g. ELECTRICAL" value={item.title} onChange={e => updateTitle(index, e.target.value.toUpperCase())} />
                        {item.id && classificationType && selectedProductFamily && selectedCategoryTypes.length === 1 ? (
                          <AddProductDeleteTechnicalSpecification classificationId={classificationType.id} productUsageId={selectedCategoryTypes[0].id} productFamilyId={selectedProductFamily.id} technicalSpecificationId={item.id} title={item.title} referenceID={user?.ReferenceID || ""} />
                        ) : (
                          <Button size="icon" variant="outline" className="border-orange-400 text-orange-600 shrink-0" disabled={technicalSpecs.length === 1} onClick={() => removeTechnicalSpec(index)}><Minus className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </div>
                    {item.specs.map((row, rIndex) => (
                      <div key={rIndex} draggable onDragStart={() => handleRowDragStart(index, rIndex)} onDragOver={e => e.preventDefault()} onDrop={() => handleRowDrop(index, rIndex)} className="border-2 border-orange-200 rounded-xl p-3 bg-orange-50 space-y-2 cursor-move">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-blue-600 font-bold uppercase">Specification</Label>
                            <Input className="border-blue-300 bg-white text-sm" placeholder="e.g. Wattage" value={row.specId ?? ""} onChange={e => updateSpecField(index, rIndex, "specId", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-orange-600 font-bold uppercase">Value</Label>
                            <Input className="border-orange-300 bg-white text-sm" placeholder="e.g. 40W" value={row.value ?? ""} onChange={e => updateSpecField(index, rIndex, "value", e.target.value)} />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="border-blue-400 text-blue-700 h-7 px-2.5 text-xs" onClick={() => addSpecRow(index)}><Plus className="h-3 w-3 mr-1" /> Row</Button>
                          <Button size="sm" variant="outline" className="border-orange-400 text-orange-700 h-7 px-2.5 text-xs" disabled={item.specs.length === 1} onClick={() => removeSpecRow(index, rIndex)}><Minus className="h-3 w-3 mr-1" /> Remove</Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto lg:pb-6">
          <Card>
            <CardHeader><CardTitle className="text-sm text-center">SELECT PRODUCT USAGE</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input value={categoryTypeSearch} onChange={e => setCategoryTypeSearch(e.target.value)} placeholder="Search usage..." className="h-9" />
              <div className="flex gap-2">
                <Input value={newCategoryType} onChange={e => setNewCategoryType(e.target.value)} placeholder="Add new usage..." className="h-9" />
                <Button size="icon" variant="outline" onClick={handleAddCategoryType} className="h-9 w-9 shrink-0"><Plus className="h-4 w-4" /></Button>
              </div>
              <Separator />
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredCategoryTypes.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 py-1">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input type="radio" name="categoryType" checked={selectedCategoryTypes.length === 1 && selectedCategoryTypes[0].id === item.id} onChange={() => setSelectedCategoryTypes([{ id: item.id, name: item.name }])} className="shrink-0" />
                      <span className="text-sm truncate">{item.name}</span>
                    </label>
                    <div className="flex gap-1 shrink-0">
                      <AddProductSelectProductType item={item} />
                      <AddProductDeleteProductType item={item} referenceID={user?.ReferenceID || ""} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm text-center">SELECT PRODUCT FAMILY</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input value={productFamilySearch} onChange={e => setProductFamilySearch(e.target.value)} placeholder="Search family..." disabled={selectedCategoryTypes.length === 0} className="h-9" />
              <div className="flex gap-2">
                <Input value={newProductType} onChange={e => setNewProductType(e.target.value)} placeholder={selectedCategoryTypes.length === 1 ? "Add product family..." : "Select a usage first"} disabled={selectedCategoryTypes.length !== 1} className="h-9" />
                <Button size="icon" variant="outline" onClick={handleAddProductType} disabled={selectedCategoryTypes.length !== 1} className="h-9 w-9 shrink-0"><Plus className="h-4 w-4" /></Button>
              </div>
              <Separator />
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredProductFamilies.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 py-1">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input type="radio" name="productType" checked={selectedProductFamily?.id === item.id} onChange={() => selectProductFamily(item)} className="shrink-0" />
                      <span className="text-sm truncate">{item.name}</span>
                    </label>
                    <div className="flex gap-1 shrink-0">
                      <AddProductEditSelectProduct item={item} />
                      <AddProductDeleteProduct item={{ id: item.id, productName: item.name, productUsageId: item.productUsageId }} referenceID={user?.ReferenceID || ""} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button onClick={handleSaveProduct} disabled={saving} className="rounded-xl h-11 px-6">
          {saving ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </div>
    </div>
    <RequestApprovalDialog
      open={requestApprovalOpen}
      onOpenChange={setRequestApprovalOpen}
      actionLabel="Add Product"
      entityLabel={productClass || "New Product"}
      onConfirm={handleRequestApproval}
      loading={requestingApproval}
    />
  </>
  );
}
