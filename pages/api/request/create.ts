import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";

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
      customer_name,
      referenceid,
      tsm,
      selectedProducts
    } = req.body;

    if (!spf_number) {
      return res.status(400).json({ message: "Missing SPF number" });
    }

    const products = Array.isArray(selectedProducts) ? selectedProducts : [];

    /* ARRAYS */
    const images: string[] = [];
    const qtys: string[] = [];
    const specs: string[] = [];
    const unitCosts: string[] = [];
    const packaging: string[] = [];
    const factories: string[] = [];
    const ports: string[] = [];
    const subtotals: string[] = [];

    products.forEach((p: any) => {

      const qty = Number(p.qty || 0);
      const unitCost = Number(p?.commercialDetails?.unitCost || 0);

      const length = p?.commercialDetails?.packaging?.length || "-";
      const width = p?.commercialDetails?.packaging?.width || "-";
      const height = p?.commercialDetails?.packaging?.height || "-";

      const factory = p?.commercialDetails?.factoryAddress || "-";
      const port = p?.commercialDetails?.portOfDischarge || "-";

      const subtotal = qty * unitCost;

      /* IMAGE */
      images.push(p?.mainImage?.url || "-");

      /* QTY */
      qtys.push(String(qty));

      /* UNIT COST */
      unitCosts.push(String(unitCost));

      /* PACKAGING */
      packaging.push(`${length} x ${width} x ${height}`);

      /* FACTORY */
      factories.push(factory);

      /* PORT */
      ports.push(port);

      /* SUBTOTAL */
      subtotals.push(String(subtotal));

      /* TECHNICAL SPECS */
      const tech =
        p?.technicalSpecifications
          ?.map((g: any) =>
            g.specs?.map((s: any) => `${s.specId}: ${s.value}`).join(", ")
          )
          .join(" | ") || "-";

      specs.push(tech);

    });

    /* CHECK IF SPF EXISTS */
    const { data: existing, error: checkError } = await supabase
      .from("spf_creation")
      .select("id")
      .eq("spf_number", spf_number)
      .maybeSingle();

    if (checkError) {
      console.error(checkError);
      return res.status(500).json(checkError);
    }

    /* INSERT SPF CREATION */
    if (!existing) {

      const { error: insertError } = await supabase
        .from("spf_creation")
        .insert({
          spf_number,
          referenceid,
          tsm,

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

    /* UPDATE SPF REQUEST STATUS */
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