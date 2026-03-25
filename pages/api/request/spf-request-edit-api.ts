import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

/* ─────────────────────────────────────────────────────────────────
   DELIMITER STRATEGY (same as spf-request-create-api.ts)

   Within one product's tech specs:
     "@@"  → separates spec GROUPS
     "~~"  → separates group TITLE from its spec rows
     ";;"  → separates individual SPEC ROWS within a group

   Between products within the same item row:
     ","   → standard comma separator

   Between item ROWS:
     "|ROW|"  → row boundary separator

   VERSION HISTORY TABLE: spf_creation_history
     Mirrors spf_creation columns + version_label, version_number, created_at
─────────────────────────────────────────────────────────────────── */
const ROW_SEP = "|ROW|";

const supplierCache = new Map<
  string,
  { company: string; contactNames: string; contactNumbers: string }
>();

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
      manager,
      item_code,
      totalItemRows,
      selectedProducts,
      edited_by,
    } = req.body;

    if (!spf_number) {
      return res.status(400).json({ message: "Missing SPF number" });
    }

    const products = Array.isArray(selectedProducts) ? selectedProducts : [];
    const rowCount = typeof totalItemRows === "number" ? totalItemRows : 1;

    /* ── Fetch current record to snapshot as version history ── */
    const { data: currentRecord, error: fetchError } = await supabase
      .from("spf_creation")
      .select("*")
      .eq("spf_number", spf_number)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch current record error:", fetchError);
      return res.status(500).json(fetchError);
    }

    /* ── Determine next version number ── */
    const { data: historyRows, error: historyCountError } = await supabase
      .from("spf_creation_history")
      .select("version_number")
      .eq("spf_number", spf_number)
      .order("version_number", { ascending: false })
      .limit(1);

    if (historyCountError) {
      console.error("History count error:", historyCountError);
      return res.status(500).json(historyCountError);
    }

    const lastVersion = historyRows && historyRows.length > 0
      ? (historyRows[0].version_number || 1)
      : 1;
    const nextVersion = lastVersion + 1;

    /* ── Snapshot current record into history before overwriting ── */
    if (currentRecord) {
      const { error: historyInsertError } = await supabase
        .from("spf_creation_history")
        .insert({
          ...currentRecord,
          id:             undefined, // let Supabase auto-assign
          spf_number,
          version_number: lastVersion,
          version_label:  `${spf_number}_v${lastVersion}`,
          created_at:     new Date().toISOString(),
          edited_by:      edited_by ?? null,
        });

      if (historyInsertError) {
        console.error("History insert error:", historyInsertError);
        return res.status(500).json(historyInsertError);
      }
    }

    /* ── Pre-fetch all unique supplier contacts ── */
    const uniqueSupplierIds = [
      ...new Set(
        products
          .map((p: any) => p?.supplier?.supplierId)
          .filter(Boolean)
      ),
    ];

    for (const supplierId of uniqueSupplierIds) {
      if (supplierCache.has(supplierId)) continue;
      try {
        const supplierRef  = doc(db, "suppliers", supplierId);
        const supplierSnap = await getDoc(supplierRef);
        if (supplierSnap.exists()) {
          const supplierData: any = supplierSnap.data();
          const contacts          = supplierData.contacts || [];
          supplierCache.set(supplierId, {
            company:        supplierData.company || "-",
            contactNames:   contacts.map((c: any) => c.name).filter(Boolean).join(" | "),
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

    /* ── Build per-row arrays ── */
    const rowImages: string[]         = [];
    const rowQtys: string[]           = [];
    const rowSpecs: string[]          = [];
    const rowUnitCosts: string[]      = [];
    const rowPackaging: string[]      = [];
    const rowFactories: string[]      = [];
    const rowPorts: string[]          = [];
    const rowSubtotals: string[]      = [];
    const rowSupplierBrands: string[] = [];
    const rowCompanyNames: string[]   = [];
    const rowContactNames: string[]   = [];
    const rowContactNumbers: string[] = [];
    const rowSellingCosts: string[]   = [];
    const rowLeadTimes: string[]      = [];
    const rowItemCodes: string[]      = [];

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
      const sellingCosts: string[]   = [];
      const leadTimes: string[]      = [];
      const itemCodes: string[]      = [];

      const rowBase = `${spf_number}-${String(rowIdx + 1).padStart(3, "0")}`;

      for (let optIdx = 0; optIdx < rowProducts.length; optIdx++) {
        const p = rowProducts[optIdx];

        const qty      = Number(p.qty || 0);
        const unitCost = Number(p?.commercialDetails?.unitCost || 0);
        const length   = p?.commercialDetails?.packaging?.length || "-";
        const width    = p?.commercialDetails?.packaging?.width  || "-";
        const height   = p?.commercialDetails?.packaging?.height || "-";
        const factory  = p?.commercialDetails?.factoryAddress    || "-";
        const port     = p?.commercialDetails?.portOfDischarge   || "-";
        const subtotal = qty * unitCost;

        images.push(p?.mainImage?.url || "-");
        qtys.push(String(qty));
        unitCosts.push(String(unitCost));
        packaging.push(`${length} x ${width} x ${height}`);
        factories.push(factory);
        ports.push(port);
        subtotals.push(String(subtotal));
        supplierBrands.push(p?.supplier?.supplierBrand || "-");

        /* Preserve existing selling costs & lead times if product carries them,
           otherwise default to "-" (filled later by procurement) */
        sellingCosts.push(p?.__sellingCost ?? "-");
        leadTimes.push(p?.__leadTime ?? "-");

        itemCodes.push(`${rowBase}-OPT-${optIdx + 1}`);

        const supplierId = p?.supplier?.supplierId;
        const cached     = supplierId ? supplierCache.get(supplierId) : null;
        companyNames.push(cached?.company         || p?.supplier?.company || "-");
        contactNames.push(cached?.contactNames    || "-");
        contactNumbers.push(cached?.contactNumbers || "-");

        if (p?.technicalSpecifications?.length) {
          const groupedTech = p.technicalSpecifications
            .map((g: any) => {
              const title     = (g.title || "").trim();
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

      if (rowProducts.length === 0) {
        itemCodes.push("-");
      }

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
      rowSellingCosts.push(sellingCosts.join(","));
      rowLeadTimes.push(leadTimes.join(","));
      rowItemCodes.push(itemCodes.join(","));
    }

    /* ── Final strings ── */
    const finalImages         = rowImages.join(ROW_SEP);
    const finalQtys           = rowQtys.join(ROW_SEP);
    const finalSpecs          = rowSpecs.join(ROW_SEP);
    const finalUnitCosts      = rowUnitCosts.join(ROW_SEP);
    const finalPackaging      = rowPackaging.join(ROW_SEP);
    const finalFactories      = rowFactories.join(ROW_SEP);
    const finalPorts          = rowPorts.join(ROW_SEP);
    const finalSubtotals      = rowSubtotals.join(ROW_SEP);
    const finalSupplierBrands = rowSupplierBrands.join(ROW_SEP);
    const finalCompanyNames   = rowCompanyNames.join(ROW_SEP);
    const finalContactNames   = rowContactNames.join(ROW_SEP);
    const finalContactNumbers = rowContactNumbers.join(ROW_SEP);
    const finalSellingCosts   = rowSellingCosts.join(ROW_SEP);
    const finalLeadTimes      = rowLeadTimes.join(ROW_SEP);
    const finalItemCode       = rowItemCodes.some((r) => r !== "-" && r !== "")
      ? rowItemCodes.join(ROW_SEP)
      : (item_code ?? null);

    /* ── UPDATE spf_creation ── */
    const { error: updateError } = await supabase
      .from("spf_creation")
      .update({
        item_code: finalItemCode,

        company_name:   finalCompanyNames,
        supplier_brand: finalSupplierBrands,
        contact_name:   finalContactNames,
        contact_number: finalContactNumbers,

        product_offer_image:                   finalImages,
        product_offer_qty:                     finalQtys,
        product_offer_technical_specification: finalSpecs,
        product_offer_unit_cost:               finalUnitCosts,
        product_offer_packaging_details:       finalPackaging,
        product_offer_factory_address:         finalFactories,
        product_offer_port_of_discharge:       finalPorts,
        product_offer_subtotal:                finalSubtotals,

        final_selling_cost: finalSellingCosts,
        proj_lead_time:     finalLeadTimes,

        /* Mark as back to pending procurement after revision */
        status:       "Pending For Procurement",
        date_updated: new Date().toISOString(),

        /* Track who revised */
        item_added_author: edited_by ?? null,
        item_added_date:   new Date().toISOString(),
      })
      .eq("spf_number", spf_number);

    if (updateError) {
      console.error("Update error:", updateError);
      return res.status(500).json(updateError);
    }

    /* ── UPDATE spf_request status ── */
    const { error: requestUpdateError } = await supabase
      .from("spf_request")
      .update({
        status:       "Processed by PD",
        date_updated: new Date().toISOString(),
      })
      .eq("spf_number", spf_number);

    if (requestUpdateError) {
      console.error("Request update error:", requestUpdateError);
      return res.status(500).json(requestUpdateError);
    }

    return res.status(200).json({
      success:        true,
      message:        "SPF updated successfully",
      version_label:  `${spf_number}_v${nextVersion}`,
      version_number: nextVersion,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}