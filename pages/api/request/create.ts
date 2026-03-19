import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/* ─────────────────────────────────────────────────────────────────
   DELIMITER STRATEGY (all stored in Supabase columns):

   Within one product's tech specs:
     "@@"  → separates spec GROUPS  (LAMP DETAILS vs ELECTRICAL)
     "~~"  → separates group TITLE from its spec rows
     ";;"  → separates individual SPEC ROWS within a group

   Between products within the same item row:
     ","   → standard comma separator

   Between item ROWS:
     "|ROW|"  → row boundary separator
                parsed by spf-request-view.tsx to show the right
                products under the right item row

   ALL columns follow the same structure:
     product1,product2|ROW|product1,product2
─────────────────────────────────────────────────────────────────── */
const ROW_SEP = "|ROW|";

/* Cache supplier contacts to avoid redundant Firestore fetches */
const supplierCache = new Map<string, { company: string; contactNames: string; contactNumbers: string }>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      spf_number,
      referenceid,
      tsm,
      totalItemRows,
      selectedProducts,
    } = req.body;

    if (!spf_number) {
      return res.status(400).json({ message: "Missing SPF number" });
    }

    const products = Array.isArray(selectedProducts) ? selectedProducts : [];
    const rowCount = typeof totalItemRows === "number" ? totalItemRows : 1;

    /* ── Pre-fetch all unique supplier contacts ── */
    const uniqueSupplierIds = [...new Set(
      products
        .map((p: any) => p?.supplier?.supplierId)
        .filter(Boolean)
    )];

    for (const supplierId of uniqueSupplierIds) {
      if (supplierCache.has(supplierId)) continue;
      try {
        const supplierRef = doc(db, "suppliers", supplierId);
        const supplierSnap = await getDoc(supplierRef);
        if (supplierSnap.exists()) {
          const supplierData: any = supplierSnap.data();
          const contacts = supplierData.contacts || [];
          supplierCache.set(supplierId, {
            company: supplierData.company || "-",
            contactNames:  contacts.map((c: any) => c.name).filter(Boolean).join(" | "),
            contactNumbers: contacts.map((c: any) => c.phone).filter(Boolean).join(" | "),
          });
        }
      } catch (err) {
        console.error("Supplier contact fetch error:", err);
      }
    }

    /* ── Group products by their item row ── */
    const rowMap: Record<number, any[]> = {};
    for (let i = 0; i < rowCount; i++) rowMap[i] = [];
    for (const p of products) {
      const idx = typeof p.__rowIndex === "number" ? p.__rowIndex : 0;
      if (!rowMap[idx]) rowMap[idx] = [];
      rowMap[idx].push(p);
    }

    /* ── Build per-row arrays, then join rows with ROW_SEP ── */
    const rowImages: string[]        = [];
    const rowQtys: string[]          = [];
    const rowSpecs: string[]         = [];
    const rowUnitCosts: string[]     = [];
    const rowPackaging: string[]     = [];
    const rowFactories: string[]     = [];
    const rowPorts: string[]         = [];
    const rowSubtotals: string[]     = [];
    const rowSupplierBrands: string[] = [];
    const rowCompanyNames: string[]  = [];   // ← NEW: per-row per-product
    const rowContactNames: string[]  = [];   // ← NEW: per-row per-product
    const rowContactNumbers: string[] = [];  // ← NEW: per-row per-product

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const rowProducts = rowMap[rowIdx] || [];

      const images: string[]         = [];
      const qtys: string[]           = [];
      const specs: string[]          = [];
      const unitCosts: string[]      = [];
      const packaging: string[]      = [];
      const factories: string[]      = [];
      const ports: string[]          = [];
      const subtotals: string[]      = [];
      const supplierBrands: string[] = [];
      const companyNames: string[]   = [];
      const contactNames: string[]   = [];
      const contactNumbers: string[] = [];

      for (const p of rowProducts) {
        const qty      = Number(p.qty || 0);
        const unitCost = Number(p?.commercialDetails?.unitCost || 0);
        const length   = p?.commercialDetails?.packaging?.length || "-";
        const width    = p?.commercialDetails?.packaging?.width  || "-";
        const height   = p?.commercialDetails?.packaging?.height || "-";
        const factory  = p?.commercialDetails?.factoryAddress   || "-";
        const port     = p?.commercialDetails?.portOfDischarge  || "-";
        const subtotal = qty * unitCost;

        images.push(p?.mainImage?.url || "-");
        qtys.push(String(qty));
        unitCosts.push(String(unitCost));
        packaging.push(`${length} x ${width} x ${height}`);
        factories.push(factory);
        ports.push(port);
        subtotals.push(String(subtotal));
        supplierBrands.push(p?.supplier?.supplierBrand || "-");

        /* ── Company / Contact — per product, from cache ── */
        const supplierId = p?.supplier?.supplierId;
        const cached = supplierId ? supplierCache.get(supplierId) : null;

        companyNames.push(cached?.company   || p?.supplier?.company || "-");
        contactNames.push(cached?.contactNames   || "-");
        contactNumbers.push(cached?.contactNumbers || "-");

        /* TECH SPECS */
        if (p?.technicalSpecifications?.length) {
          const groupedTech = p.technicalSpecifications
            .map((g: any) => {
              const title = (g.title || "").trim();
              const specLines = (g.specs || [])
                .filter((s: any) => s.value && s.value.trim() !== "")
                .map((s: any) => `${s.specId}: ${s.value.trim()}`)
                .join(";;");
              if (!specLines) return null;
              return title ? `${title}~~${specLines}` : specLines;
            })
            .filter(Boolean)
            .join("@@");
          specs.push(groupedTech || "-");
        } else {
          specs.push("-");
        }
      }

      /* Each row's products joined by comma */
      rowImages.push(images.join(","));
      rowQtys.push(qtys.join(","));
      rowSpecs.push(specs.join(" || "));
      rowUnitCosts.push(unitCosts.join(","));
      rowPackaging.push(packaging.join(","));
      rowFactories.push(factories.join(","));
      rowPorts.push(ports.join(","));
      rowSubtotals.push(subtotals.join(","));
      rowSupplierBrands.push(supplierBrands.join(","));
      rowCompanyNames.push(companyNames.join(","));
      rowContactNames.push(contactNames.join(","));
      rowContactNumbers.push(contactNumbers.join(","));
    }

    /* ── Final strings stored in Supabase — all use ROW_SEP ── */
    const finalImages          = rowImages.join(ROW_SEP);
    const finalQtys            = rowQtys.join(ROW_SEP);
    const finalSpecs           = rowSpecs.join(ROW_SEP);
    const finalUnitCosts       = rowUnitCosts.join(ROW_SEP);
    const finalPackaging       = rowPackaging.join(ROW_SEP);
    const finalFactories       = rowFactories.join(ROW_SEP);
    const finalPorts           = rowPorts.join(ROW_SEP);
    const finalSubtotals       = rowSubtotals.join(ROW_SEP);
    const finalSupplierBrands  = rowSupplierBrands.join(ROW_SEP);
    const finalCompanyNames    = rowCompanyNames.join(ROW_SEP);    // ← NEW
    const finalContactNames    = rowContactNames.join(ROW_SEP);    // ← NEW
    const finalContactNumbers  = rowContactNumbers.join(ROW_SEP);  // ← NEW

    /* ── CHECK EXISTING SPF ── */
    const { data: existing, error: checkError } = await supabase
      .from("spf_creation")
      .select("id")
      .eq("spf_number", spf_number)
      .maybeSingle();

    if (checkError) {
      console.error(checkError);
      return res.status(500).json(checkError);
    }

    /* ── INSERT SPF ── */
    if (!existing) {
      const { error: insertError } = await supabase
        .from("spf_creation")
        .insert({
          spf_number,
          referenceid,
          tsm,

          company_name:   finalCompanyNames,   // ← now per-row per-product
          supplier_brand: finalSupplierBrands,
          contact_name:   finalContactNames,   // ← now per-row per-product
          contact_number: finalContactNumbers, // ← now per-row per-product

          product_offer_image:                   finalImages,
          product_offer_qty:                     finalQtys,
          product_offer_technical_specification: finalSpecs,
          product_offer_unit_cost:               finalUnitCosts,
          product_offer_packaging_details:       finalPackaging,
          product_offer_factory_address:         finalFactories,
          product_offer_port_of_discharge:       finalPorts,
          product_offer_subtotal:                finalSubtotals,

          status: "Pending For Procurement",

          date_created: new Date().toISOString(),
          date_updated: new Date().toISOString(),
        });

      if (insertError) {
        console.error(insertError);
        return res.status(500).json(insertError);
      }
    }

    /* ── UPDATE REQUEST STATUS ── */
    const { error: updateError } = await supabase
      .from("spf_request")
      .update({
        status: "Processed by PD",
        date_updated: new Date().toISOString(),
      })
      .eq("spf_number", spf_number);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json(updateError);
    }

    return res.status(200).json({ success: true, message: "SPF created successfully" });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}