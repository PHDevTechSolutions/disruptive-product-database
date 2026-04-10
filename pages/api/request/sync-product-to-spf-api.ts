import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { getPhilippinesISOString } from "@/lib/datetime";

const ROW_SEP = "|ROW|";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/*
 * This API syncs product changes from Firebase to existing SPF records in Supabase.
 * When a product's technical specifications are edited in Firebase,
 * this updates the original_technical_specification in spf_creation and spf_creation_history.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const {
      productReferenceID,
      technicalSpecifications,
      mainImage,
      supplier,
      commercialDetails,
      productClass,
    } = req.body;

    if (!productReferenceID) {
      return res.status(400).json({ message: "Missing productReferenceID" });
    }

    if (!technicalSpecifications || !Array.isArray(technicalSpecifications)) {
      return res.status(400).json({ message: "Missing technicalSpecifications" });
    }

    // Format technical specifications for Supabase storage
    const formatSpecs = (specs: any[]) => {
      if (!specs?.length) return "-";
      const grouped = specs
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
      return grouped || "-";
    };

    const formattedSpecs = formatSpecs(technicalSpecifications);

    // Find all SPF records in spf_creation that contain this productReferenceID
    // We search in product_reference_id column which stores comma-separated product IDs per row
    const { data: spfRecords, error: fetchError } = await supabase
      .from("spf_creation")
      .select("id, spf_number, product_reference_id, original_technical_specification")
      .not("product_reference_id", "is", null);

    if (fetchError) {
      console.error("Error fetching SPF records:", fetchError);
      return res.status(500).json({ message: "Failed to fetch SPF records" });
    }

    // Also fetch from spf_creation_history
    const { data: historyRecords, error: historyFetchError } = await supabase
      .from("spf_creation_history")
      .select("id, spf_number, version_number, product_reference_id, original_technical_specification")
      .not("product_reference_id", "is", null);

    if (historyFetchError) {
      console.error("Error fetching history records:", historyFetchError);
    }

    // Helper to split by row
    const splitByRow = (val: string | null | undefined): string[][] => {
      if (!val) return [];
      return val.split(ROW_SEP).map((r) => r.split(",").map((s) => s.trim()));
    };

    // Track which records were updated
    const updatedSpfs: string[] = [];
    const updatedHistory: Array<{ spf_number: string; version: number }> = [];

    // Update spf_creation records
    for (const spf of (spfRecords || [])) {
      const rowProductRefIDs = splitByRow(spf.product_reference_id);
      const rowOriginalSpecs = splitByRow(spf.original_technical_specification);
      
      let needsUpdate = false;
      const updatedOriginalSpecs: string[] = [];
      
      // Check each row
      for (let rowIdx = 0; rowIdx < rowProductRefIDs.length; rowIdx++) {
        const productRefIDs = rowProductRefIDs[rowIdx] || [];
        const originalSpecs = rowOriginalSpecs[rowIdx] || [];
        const rowUpdatedSpecs: string[] = [];
        
        // Check each product in the row
        for (let optIdx = 0; optIdx < productRefIDs.length; optIdx++) {
          const refID = productRefIDs[optIdx];
          // If this product matches the edited productReferenceID, update its specs
          if (refID === productReferenceID) {
            rowUpdatedSpecs.push(formattedSpecs);
            needsUpdate = true;
          } else {
            // Keep existing specs for other products
            rowUpdatedSpecs.push(originalSpecs[optIdx] || "-");
          }
        }
        
        updatedOriginalSpecs.push(rowUpdatedSpecs.join(","));
      }
      
      if (needsUpdate) {
        // Update the spf_creation record
        const newOriginalSpecs = updatedOriginalSpecs.join(ROW_SEP);
        const syncISO = getPhilippinesISOString();

        const { error: updateError } = await supabase
          .from("spf_creation")
          .update({
            original_technical_specification: newOriginalSpecs,
            date_updated: syncISO,
          })
          .eq("id", spf.id);

        /* ── UPDATE parent spf_request date_updated ── */
        if (!updateError) {
          await supabase
            .from("spf_request")
            .update({ date_updated: syncISO })
            .eq("spf_number", spf.spf_number);
        }

        if (updateError) {
          console.error(`Error updating SPF ${spf.spf_number}:`, updateError);
        } else {
          updatedSpfs.push(spf.spf_number);
        }
      }
    }

    // Update spf_creation_history records similarly
    for (const history of (historyRecords || [])) {
      const rowProductRefIDs = splitByRow(history.product_reference_id);
      const rowOriginalSpecs = splitByRow(history.original_technical_specification);
      
      let needsUpdate = false;
      const updatedOriginalSpecs: string[] = [];
      
      for (let rowIdx = 0; rowIdx < rowProductRefIDs.length; rowIdx++) {
        const productRefIDs = rowProductRefIDs[rowIdx] || [];
        const originalSpecs = rowOriginalSpecs[rowIdx] || [];
        const rowUpdatedSpecs: string[] = [];
        
        for (let optIdx = 0; optIdx < productRefIDs.length; optIdx++) {
          const refID = productRefIDs[optIdx];
          if (refID === productReferenceID) {
            rowUpdatedSpecs.push(formattedSpecs);
            needsUpdate = true;
          } else {
            rowUpdatedSpecs.push(originalSpecs[optIdx] || "-");
          }
        }
        
        updatedOriginalSpecs.push(rowUpdatedSpecs.join(","));
      }
      
      if (needsUpdate) {
        const newOriginalSpecs = updatedOriginalSpecs.join(ROW_SEP);
        
        const { error: updateError } = await supabase
          .from("spf_creation_history")
          .update({
            original_technical_specification: newOriginalSpecs,
            date_updated: getPhilippinesISOString(),
          })
          .eq("id", history.id);
        
        if (updateError) {
          console.error(`Error updating history ${history.spf_number} v${history.version_number}:`, updateError);
        } else {
          updatedHistory.push({ spf_number: history.spf_number, version: history.version_number });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Product synced to SPF records",
      updatedSpfs,
      updatedHistory,
      updatedCount: updatedSpfs.length + updatedHistory.length,
    });

  } catch (err: any) {
    console.error("Sync error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
