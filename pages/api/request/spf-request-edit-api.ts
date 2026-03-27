import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
      spf_creation_start_time,
      spf_creation_end_time,
      userId,
    } = req.body;

    if (!spf_number) {
      return res.status(400).json({ message: "Missing SPF number" });
    }

    /* ── Resolve edited_by ── */
    let resolvedEditedBy: string | null = null;
    try {
      if (userId) {
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/users?id=${userId}`
        );
        if (userRes.ok) {
          const user = await userRes.json();
          resolvedEditedBy = user?.ReferenceID || null;
        }
      }
    } catch (err) {
      console.error("Failed to resolve edited_by:", err);
    }

    const products = Array.isArray(selectedProducts) ? selectedProducts : [];
    const rowCount = typeof totalItemRows === "number" ? totalItemRows : 1;

    /* ── Get current version number ── */
    const { data: historyRows } = await supabase
      .from("spf_creation_history")
      .select("version_number")
      .eq("spf_number", spf_number)
      .order("version_number", { ascending: false })
      .limit(1);

    const lastVersion =
      historyRows && historyRows.length > 0 ? historyRows[0].version_number : 0;
    const nextVersion = lastVersion + 1;

    /* ── Pre-fetch all unique supplier contacts ── */
    const uniqueSupplierIds = [
      ...new Set(
        products.map((p: any) => p?.supplier?.supplierId).filter(Boolean)
      ),
    ] as string[];

    for (const supplierId of uniqueSupplierIds) {
      if (supplierCache.has(supplierId)) continue;
      try {
        const supplierSnap = await getDoc(doc(db, "suppliers", supplierId));
        if (supplierSnap.exists()) {
          const d: any   = supplierSnap.data();
          const contacts = d.contacts || [];
          supplierCache.set(supplierId, {
            company:        d.company || "-",
            contactNames:   contacts.map((c: any) => c.name).filter(Boolean).join(" | "),
            contactNumbers: contacts.map((c: any) => c.phone).filter(Boolean).join(" | "),
          });
        }
      } catch (err) {
        console.error("Supplier fetch error:", err);
      }
    }

    /* ── Group products by row ── */
    const rowMap: Record<number, any[]> = {};
    for (let i = 0; i < rowCount; i++) rowMap[i] = [];
    for (const p of products) {
      const idx = typeof p.__rowIndex === "number" ? p.__rowIndex : 0;
      if (!rowMap[idx]) rowMap[idx] = [];
      rowMap[idx].push(p);
    }

    /* ── Per-row accumulators ── */
    const rowImages:         string[] = [];
    const rowQtys:           string[] = [];
    const rowSpecs:          string[] = [];
    const rowUnitCosts:      string[] = [];
    const rowPcsPerCarton:   string[] = [];
    const rowPackaging:      string[] = [];
    const rowFactories:      string[] = [];
    const rowPorts:          string[] = [];
    const rowSubtotals:      string[] = [];
    const rowSupplierBrands: string[] = [];
    const rowCompanyNames:   string[] = [];
    const rowContactNames:   string[] = [];
    const rowContactNumbers: string[] = [];
    const rowSellingCosts:   string[] = [];
    const rowLeadTimes:      string[] = [];
    const rowItemCodes:      string[] = [];

    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      const rowProducts = rowMap[rowIdx] || [];

      const images:         string[] = [];
      const qtys:           string[] = [];
      const specs:          string[] = [];
      const unitCosts:      string[] = [];
      const pcsPerCartons:  string[] = [];
      const packaging:      string[] = [];
      const factories:      string[] = [];
      const ports:          string[] = [];
      const subtotals:      string[] = [];
      const supplierBrands: string[] = [];
      const companyNames:   string[] = [];
      const contactNames:   string[] = [];
      const contactNumbers: string[] = [];
      const sellingCosts:   string[] = [];
      const leadTimes:      string[] = [];
      const itemCodes:      string[] = [];

      const rowBase = `${spf_number}-${String(rowIdx + 1).padStart(3, "0")}`;

      for (let optIdx = 0; optIdx < rowProducts.length; optIdx++) {
        const p = rowProducts[optIdx];

        const qty          = Number(p.qty || 0);
        const unitCost     = Number(p?.commercialDetails?.unitCost || 0);
        const pcsPerCarton = p?.commercialDetails?.pcsPerCarton || "-";
        const length       = p?.commercialDetails?.packaging?.length || "-";
        const width        = p?.commercialDetails?.packaging?.width  || "-";
        const height       = p?.commercialDetails?.packaging?.height || "-";
        const factory      = p?.commercialDetails?.factoryAddress    || "-";
        const port         = p?.commercialDetails?.portOfDischarge   || "-";
        const subtotal     = qty * unitCost;

        /* ── Every array always gets exactly one push per product ── */
        images.push(p?.mainImage?.url || "-");
        qtys.push(String(qty));
        unitCosts.push(String(unitCost));
        pcsPerCartons.push(String(pcsPerCarton));
        packaging.push(`${length} x ${width} x ${height}`);
        factories.push(factory);
        ports.push(port);
        subtotals.push(String(subtotal));
        supplierBrands.push(
          p?.supplier?.supplierBrand || p?.supplier?.supplierBrandName || "-"
        );

        /* ── Carry __sellingCost/__leadTime from existing products ── */
        sellingCosts.push(p?.__sellingCost ?? "-");
        leadTimes.push(p?.__leadTime      ?? "-");

        /* ── Item code ── */
        itemCodes.push(`${rowBase}-OPT-${optIdx + 1}`);

        /* ── company/contact — always push regardless of supplierId ── */
        const supplierId = String(p?.supplier?.supplierId || "");
        const cached     = supplierId ? supplierCache.get(supplierId) : undefined;
        companyNames.push(cached?.company        || p?.supplier?.company || "-");
        contactNames.push(cached?.contactNames    || "-");
        contactNumbers.push(cached?.contactNumbers || "-");

        /* ── Tech specs ── */
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

      rowImages.push(images.join(","));
      rowQtys.push(qtys.join(","));
      rowSpecs.push(specs.join(" || "));
      rowUnitCosts.push(unitCosts.join(","));
      rowPcsPerCarton.push(pcsPerCartons.join(","));
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
    const finalPcsPerCarton   = rowPcsPerCarton.join(ROW_SEP);
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
    const finalItemCode       = rowItemCodes.some((r) => r !== "" && r.length > 0)
      ? rowItemCodes.join(ROW_SEP)
      : (item_code ?? null);

    /* ── INSERT version history snapshot ── */
    await supabase.from("spf_creation_history").insert({
      spf_number,
      version_number: nextVersion,
      version_label:  `${spf_number}_v${nextVersion}`,
      created_at:     new Date().toISOString(),
      edited_by:      resolvedEditedBy,
      item_added_author: resolvedEditedBy,

      supplier_brand:                        finalSupplierBrands,
      product_offer_image:                   finalImages,
      product_offer_qty:                     finalQtys,
      product_offer_technical_specification: finalSpecs,
      product_offer_unit_cost:               finalUnitCosts,
      product_offer_pcs_per_carton:          finalPcsPerCarton,
      product_offer_packaging_details:       finalPackaging,
      product_offer_factory_address:         finalFactories,
      product_offer_port_of_discharge:       finalPorts,
      product_offer_subtotal:                finalSubtotals,

      company_name:   finalCompanyNames,
      contact_name:   finalContactNames,
      contact_number: finalContactNumbers,

      proj_lead_time:     finalLeadTimes,
      final_selling_cost: finalSellingCosts,

      spf_creation_start_time: spf_creation_start_time ?? null,
      spf_creation_end_time:   spf_creation_end_time   ?? null,

      referenceid: referenceid ?? null,
      tsm:         tsm         ?? null,
      manager:     manager     ?? null,
      item_code:   finalItemCode || item_code || null,
    });

    /* ── UPDATE main spf_creation table ── */
    await supabase
      .from("spf_creation")
      .update({
        referenceid: referenceid ?? null,
        tsm:         tsm         ?? null,
        manager:     manager     ?? null,

        item_code: finalItemCode || item_code || null,

        company_name:   finalCompanyNames,
        supplier_brand: finalSupplierBrands,
        contact_name:   finalContactNames,
        contact_number: finalContactNumbers,

        product_offer_image:                   finalImages,
        product_offer_qty:                     finalQtys,
        product_offer_technical_specification: finalSpecs,
        product_offer_unit_cost:               finalUnitCosts,
        product_offer_pcs_per_carton:          finalPcsPerCarton,
        product_offer_packaging_details:       finalPackaging,
        product_offer_factory_address:         finalFactories,
        product_offer_port_of_discharge:       finalPorts,
        product_offer_subtotal:                finalSubtotals,

        final_selling_cost: finalSellingCosts,
        proj_lead_time:     finalLeadTimes,

        status: "Pending For Procurement",

        spf_creation_start_time: spf_creation_start_time ?? null,
        spf_creation_end_time:   spf_creation_end_time   ?? null,
        date_updated: new Date().toISOString(),
      })
      .eq("spf_number", spf_number);

    /* ── Audit log ── */
    import("@/lib/auditlogger").then(({ logSPFVersionEvent }) => {
      logSPFVersionEvent({
        whatHappened:   "SPF Version Created",
        spf_number,
        version_label:  `${spf_number}_v${nextVersion}`,
        version_number: nextVersion,
        referenceID:    resolvedEditedBy ?? undefined,
        userId:         userId           ?? undefined,
      });
    });

    return res.status(200).json({
      success:       true,
      version_label: `${spf_number}_v${nextVersion}`,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}