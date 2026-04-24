/**
 * Server/client Firestore bulk insert used when a product Excel upload is approved.
 * Auditing uses the original requester's referenceID / userId.
 */

import type { Workbook } from "exceljs";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  logProductEvent,
  logProductUsageEvent,
  logProductFamilyEvent,
} from "@/lib/auditlogger";

export type ParsedProductRow = {
  usage: string;
  family: string;
  productClass: string;
  pricePoint: string;
  brandOrigin: string;
  supplierBrand: string;
  imageURL: string;
  dimensionalURL: string;
  illuminanceURL: string;
  unitCost: string;
  length: string;
  width: string;
  height: string;
  pcsPerCarton: string;
  factoryAddress: string;
  portOfDischarge: string;
  countries: string;
  wsIndex: number;
  rowIndex: number;
  specValues: Record<string, string>;
};

export type ExcelColumnsByWs = Record<string, { title: string; specId: string; col: number }[]>;

type CategoryType = { id: string; name: string };
type ProductFamily = { id: string; name: string; categoryTypeId: string };
type Supplier = { supplierId: string; company: string; supplierBrand?: string };
type TemplateSpec = { id: string; title: string; specs: { specId: string }[]; sortOrder?: number };

export function buildExcelColumnsMapFromWorkbook(workbook: Workbook): ExcelColumnsByWs {
  const cleanExcelValue = (val: unknown) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") return val.toString();
    const str = val.toString().trim();
    if (str === "-") return "";
    return str;
  };

  const out: ExcelColumnsByWs = {};
  for (let wsIndex = 0; wsIndex < workbook.worksheets.length; wsIndex++) {
    const ws = workbook.worksheets[wsIndex];
    const header1Row = ws.getRow(1);
    const header2Row = ws.getRow(2);
    const header3Row = ws.getRow(3);
    const cols: { title: string; specId: string; col: number }[] = [];
    for (let col = 1; col <= ws.columnCount; col++) {
      const specHeader = cleanExcelValue(header1Row.getCell(col).value);
      const groupHeader = cleanExcelValue(header2Row.getCell(col).value);
      const commercialHdr = cleanExcelValue(header3Row.getCell(col).value);
      if (
        ["Unit Cost", "Length", "Width", "Height", "pcs/carton", "Factory Address", "Port of Discharge"].includes(
          commercialHdr,
        )
      )
        continue;
      if (specHeader === "Dimensional Drawing" || specHeader === "Illuminance Level") continue;
      if (specHeader === "Available Countries") continue;
      if (col < 8) continue;
      if (groupHeader === "COMMERCIAL DETAILS") continue;
      if (!groupHeader || !specHeader) continue;
      cols.push({ title: groupHeader, specId: specHeader, col });
    }
    out[String(wsIndex)] = cols;
  }
  return out;
}

export async function insertParsedProductBulk(params: {
  rows: ParsedProductRow[];
  excelColumnsByWsIndex: ExcelColumnsByWs;
  referenceID: string;
  userId: string;
  filename: string;
}): Promise<{ inserted: number }> {
  const { rows, excelColumnsByWsIndex, referenceID, userId, filename } = params;

  const findCategoryType = async (name: string): Promise<CategoryType | null> => {
    const q = query(collection(db, "categoryTypes"), where("name", "==", name), where("isActive", "==", true));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const d = docSnap.data() as DocumentData;
      return { id: docSnap.id, name: d.name };
    }
    const newDoc = await addDoc(collection(db, "categoryTypes"), {
      name,
      isActive: true,
      createdAt: serverTimestamp(),
      whatHappened: "Product Usage Added (Excel Upload)",
      date_updated: serverTimestamp(),
    });
    await logProductUsageEvent({
      whatHappened: "Product Usage Added",
      productUsageId: newDoc.id,
      productUsageName: name,
      referenceID,
      userId,
      extra: { source: "excel_upload_for_approval" },
    });
    return { id: newDoc.id, name };
  };

  const findProductFamily = async (categoryTypeId: string, name: string): Promise<ProductFamily | null> => {
    const q = query(
      collection(db, "productFamilies"),
      where("categoryTypeId", "==", categoryTypeId),
      where("name", "==", name),
      where("isActive", "==", true),
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const d = docSnap.data() as DocumentData;
      return { id: docSnap.id, name: d.name, categoryTypeId: d.categoryTypeId };
    }
    const newDoc = await addDoc(collection(db, "productFamilies"), {
      name,
      categoryTypeId,
      isActive: true,
      createdAt: serverTimestamp(),
      whatHappened: "Product Family Added (Excel Upload)",
      date_updated: serverTimestamp(),
    });
    await logProductFamilyEvent({
      whatHappened: "Product Family Added",
      productFamilyId: newDoc.id,
      productFamilyName: name,
      productUsageId: categoryTypeId,
      referenceID,
      userId,
      extra: { source: "excel_upload_for_approval" },
    });
    return { id: newDoc.id, name, categoryTypeId };
  };

  const findSupplier = async (brand: string): Promise<Supplier | null> => {
    if (!brand) return null;
    const q = query(collection(db, "suppliers"), where("supplierBrand", "==", brand), where("isActive", "==", true));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data();
    return { supplierId: d.id, company: data.company, supplierBrand: data.supplierBrand || "" };
  };

  const createMissingTemplateSpecs = async (
    categoryTypeId: string,
    productFamilyId: string,
    excelColumns: { title: string; specId: string }[],
  ) => {
    const templateSnap = await getDocs(
      query(
        collection(db, "technicalSpecifications"),
        where("categoryTypeId", "==", categoryTypeId),
        where("productFamilyId", "==", productFamilyId),
        where("isActive", "==", true),
      ),
    );
    const existingTitles = templateSnap.docs.map((d) => d.data().title);
    const excelGroupsMap = new Map<string, { specId: string }[]>();
    for (const col of excelColumns) {
      if (!excelGroupsMap.has(col.title)) excelGroupsMap.set(col.title, []);
      excelGroupsMap.get(col.title)!.push({ specId: col.specId });
    }
    let sortOrder = 0;
    for (const [title, specs] of excelGroupsMap) {
      sortOrder++;
      if (!existingTitles.includes(title)) {
        await addDoc(collection(db, "technicalSpecifications"), {
          categoryTypeId,
          productFamilyId,
          title,
          specs,
          sortOrder,
          isActive: true,
          createdAt: serverTimestamp(),
          whatHappened: "Product Added",
          date_updated: serverTimestamp(),
        });
      } else {
        const existingDoc = templateSnap.docs.find((d) => d.data().title === title);
        if (existingDoc) await updateDoc(existingDoc.ref, { sortOrder, date_updated: serverTimestamp() });
      }
    }
  };

  const findTemplateSpecs = async (categoryTypeId: string, productFamilyId: string): Promise<TemplateSpec[]> => {
    const q = query(
      collection(db, "technicalSpecifications"),
      where("categoryTypeId", "==", categoryTypeId),
      where("productFamilyId", "==", productFamilyId),
      where("isActive", "==", true),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data() as DocumentData;
        return {
          id: d.id,
          title: data.title,
          specs: data.specs || [],
          sortOrder: data.sortOrder ?? 999,
        };
      })
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  };

  const syncExistingProductsToTemplate = async (categoryTypeId: string, productFamilyId: string) => {
    const templateSnap = await getDocs(
      query(
        collection(db, "technicalSpecifications"),
        where("categoryTypeId", "==", categoryTypeId),
        where("productFamilyId", "==", productFamilyId),
        where("isActive", "==", true),
      ),
    );
    const templates = templateSnap.docs
      .map((d) => ({
        id: d.id,
        title: d.data().title,
        specs: d.data().specs || [],
        sortOrder: d.data().sortOrder ?? 999,
      }))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    const productSnap = await getDocs(collection(db, "products"));
    for (const productDoc of productSnap.docs) {
      const data = productDoc.data();
      const family = data.productFamilies?.[0];
      if (!family) continue;
      if (family.productFamilyId !== productFamilyId || family.productUsageId !== categoryTypeId) continue;
      const existingSpecs = data.technicalSpecifications || [];
      const mergedSpecs = templates.map((template) => {
        const existingGroup = existingSpecs.find((g: { title?: string }) => g.title === template.title);
        return {
          technicalSpecificationId: template.id,
          title: template.title,
          specs: template.specs.map((spec: { specId: string }) => {
            const existingRow = existingGroup?.specs?.find((r: { specId: string }) => r.specId === spec.specId);
            return { specId: spec.specId, value: existingRow?.value || "" };
          }),
        };
      });
      await updateDoc(productDoc.ref, {
        technicalSpecifications: mergedSpecs,
        updatedAt: serverTimestamp(),
      });
    }
  };

  const existingSnap = await getDocs(collection(db, "products"));
  let productCounter = existingSnap.size;
  const syncedFamilies = new Set<string>();
  let totalInserted = 0;

  for (const row of rows) {
    const category = await findCategoryType(row.usage);
    if (!category) continue;
    const productFamily = await findProductFamily(category.id, row.family);
    if (!productFamily) continue;
    const supplier = await findSupplier(row.supplierBrand);

    const excelColumns = excelColumnsByWsIndex[String(row.wsIndex)] ?? [];
    const syncKey = `${category.id}_${productFamily.id}`;
    if (!syncedFamilies.has(syncKey)) {
      await createMissingTemplateSpecs(category.id, productFamily.id, excelColumns);
      await syncExistingProductsToTemplate(category.id, productFamily.id);
      syncedFamilies.add(syncKey);
    }

    const templateSpecs = await findTemplateSpecs(category.id, productFamily.id);
    const productSpecs = templateSpecs.map((template) => ({
      technicalSpecificationId: template.id,
      title: template.title,
      specs: template.specs.map((templateSpec) => ({
        specId: templateSpec.specId,
        value: row.specValues[`${template.title}||${templateSpec.specId}`] ?? "",
      })),
    }));

    productCounter++;
    const refID = `PROD-SPF-${productCounter.toString().padStart(5, "0")}`;

    const newDocRef = await addDoc(collection(db, "products"), {
      productReferenceID: refID,
      productClass: row.productClass,
      pricePoint: row.pricePoint,
      brandOrigin: row.brandOrigin,
      supplier,
      mainImage: row.imageURL ? { url: row.imageURL } : null,
      dimensionalDrawing: row.dimensionalURL ? { url: row.dimensionalURL } : null,
      illuminanceDrawing: row.illuminanceURL ? { url: row.illuminanceURL } : null,
      categoryTypes: [{ productUsageId: category.id, categoryTypeName: category.name }],
      productFamilies: [
        { productFamilyId: productFamily.id, productFamilyName: productFamily.name, productUsageId: category.id },
      ],
      technicalSpecifications: productSpecs,
      commercialDetails: {
        unitCost: row.unitCost ? parseFloat(row.unitCost) : null,
        packaging: {
          length: row.length ? `${parseFloat(row.length)} cm` : null,
          width: row.width ? `${parseFloat(row.width)} cm` : null,
          height: row.height ? `${parseFloat(row.height)} cm` : null,
        },
        pcsPerCarton: row.pcsPerCarton ? parseInt(row.pcsPerCarton, 10) : null,
        factoryAddress: row.factoryAddress || "",
        portOfDischarge: row.portOfDischarge || "",
      },
      countries: row.countries ? row.countries.split("|").map(c => c.trim()) : [],
      isActive: true,
      createdAt: serverTimestamp(),
      createdBy: userId,
      referenceID,
      whatHappened: "Product Added",
      date_updated: serverTimestamp(),
    });

    await logProductEvent({
      whatHappened: "Product Added",
      productId: newDocRef.id,
      productReferenceID: refID,
      productClass: row.productClass,
      pricePoint: row.pricePoint,
      brandOrigin: row.brandOrigin,
      supplier: supplier ?? null,
      categoryTypes: [{ productUsageId: category.id, categoryTypeName: category.name }],
      productFamilies: [{ productFamilyId: productFamily.id, productFamilyName: productFamily.name }],
      mainImage: row.imageURL ? { url: row.imageURL } : null,
      dimensionalDrawing: row.dimensionalURL ? { url: row.dimensionalURL } : null,
      illuminanceDrawing: row.illuminanceURL ? { url: row.illuminanceURL } : null,
      technicalSpecifications: productSpecs.map((s) => ({
        technicalSpecificationId: s.technicalSpecificationId,
        title: s.title,
        specs: s.specs,
      })),
      referenceID,
      userId,
      extra: { source: "excel_upload_for_approval", filename },
    });

    totalInserted++;
  }

  await logProductEvent({
    whatHappened: "Product Bulk Upload",
    inserted: totalInserted,
    referenceID,
    userId,
    extra: { source: "excel_upload_for_approval", filename },
  });

  return { inserted: totalInserted };
}
