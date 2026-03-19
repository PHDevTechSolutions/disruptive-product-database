import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
      selectedProducts
    } = req.body;

    if (!spf_number) {
      return res.status(400).json({ message: "Missing SPF number" });
    }

    const products = Array.isArray(selectedProducts) ? selectedProducts : [];

    /* PRODUCT ARRAYS */

    const images: string[] = [];
    const qtys: string[] = [];
    const specs: string[] = [];
    const unitCosts: string[] = [];
    const packaging: string[] = [];
    const factories: string[] = [];
    const ports: string[] = [];
    const subtotals: string[] = [];

    /* SUPPLIER ARRAYS */

    const company_names: string[] = [];
    const supplier_brands: string[] = [];
    const contact_names: string[] = [];
    const contact_numbers: string[] = [];

    /* LOOP PRODUCTS */
    for (const p of products) {

      const qty = Number(p.qty || 0);
      const unitCost = Number(p?.commercialDetails?.unitCost || 0);

      const length = p?.commercialDetails?.packaging?.length || "-";
      const width = p?.commercialDetails?.packaging?.width || "-";
      const height = p?.commercialDetails?.packaging?.height || "-";

      const factory = p?.commercialDetails?.factoryAddress || "-";
      const port = p?.commercialDetails?.portOfDischarge || "-";

      const subtotal = qty * unitCost;

      images.push(p?.mainImage?.url || "-");
      qtys.push(String(qty));
      unitCosts.push(String(unitCost));
      packaging.push(`${length} x ${width} x ${height}`);
      factories.push(factory);
      ports.push(port);
      subtotals.push(String(subtotal));

      /* ─────────────────────────────────────────────────────────────
         TECH SPECS — new format preserving group titles:
           "TITLE~~spec1: val1 | spec2: val2@@TITLE2~~spec3: val3"
         Groups separated by "@@", title from specs by "~~", specs by "|"
      ───────────────────────────────────────────────────────────── */
      if (
        p?.technicalSpecifications &&
        Array.isArray(p.technicalSpecifications) &&
        p.technicalSpecifications.length > 0
      ) {
        const groupedTech = p.technicalSpecifications
          .map((g: any) => {
            const title = (g.title || "").trim();
            const specLines = (g.specs || [])
              .filter((s: any) => s.value && s.value.trim() !== "")
              .map((s: any) => `${s.specId}: ${s.value}`)
              .join(" | ");

            if (!specLines) return null;

            return title ? `${title}~~${specLines}` : specLines;
          })
          .filter(Boolean)
          .join("@@");

        specs.push(groupedTech || "-");
      } else {
        specs.push("-");
      }

      /* SUPPLIER DATA */

      const company = p?.supplier?.company || "-";
      const brand = p?.supplier?.supplierBrand || "-";

      supplier_brands.push(brand);

      if (!company_names.includes(company)) {
        company_names.push(company);
      }

      /* CONTACTS - FETCH FROM SUPPLIER COLLECTION */

      if (p?.supplier?.supplierId) {

        try {

          const supplierRef = doc(db, "suppliers", p.supplier.supplierId);
          const supplierSnap = await getDoc(supplierRef);

          if (supplierSnap.exists()) {

            const supplierData: any = supplierSnap.data();
            const contacts = supplierData.contacts || [];

            const names = contacts
              .map((c: any) => c.name)
              .filter(Boolean)
              .join(" | ");

            const phones = contacts
              .map((c: any) => c.phone)
              .filter(Boolean)
              .join(" | ");

            if (names && !contact_names.includes(names)) {
              contact_names.push(names);
            }

            if (phones && !contact_numbers.includes(phones)) {
              contact_numbers.push(phones);
            }

          }

        } catch (err) {
          console.error("Supplier contact fetch error:", err);
        }

      }

    }

    /* CHECK EXISTING SPF */

    const { data: existing, error: checkError } = await supabase
      .from("spf_creation")
      .select("id")
      .eq("spf_number", spf_number)
      .maybeSingle();

    if (checkError) {
      console.error(checkError);
      return res.status(500).json(checkError);
    }

    /* INSERT SPF */

    if (!existing) {

      const { error: insertError } = await supabase
        .from("spf_creation")
        .insert({

          spf_number,
          referenceid,
          tsm,

          company_name: company_names.join(","),
          supplier_brand: supplier_brands.join(","),
          contact_name: contact_names.join(","),
          contact_number: contact_numbers.join(","),

          product_offer_image: images.join(","),
          product_offer_qty: qtys.join(","),
          product_offer_technical_specification: specs.join(" || "),
          product_offer_unit_cost: unitCosts.join(","),
          product_offer_packaging_details: packaging.join(","),
          product_offer_factory_address: factories.join(","),
          product_offer_port_of_discharge: ports.join(","),
          product_offer_subtotal: subtotals.join(","),

          status: "Pending For Procurement",

          date_created: new Date().toISOString(),
          date_updated: new Date().toISOString()

        });

      if (insertError) {
        console.error(insertError);
        return res.status(500).json(insertError);
      }

    }

    /* UPDATE REQUEST */

    const { error: updateError } = await supabase
      .from("spf_request")
      .update({
        status: "Processed by PD",
        date_updated: new Date().toISOString()
      })
      .eq("spf_number", spf_number);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json(updateError);
    }

    return res.status(200).json({
      success: true,
      message: "SPF created successfully"
    });

  } catch (err: any) {

    console.error(err);

    return res.status(500).json({
      message: err.message || "Server error"
    });

  }

}