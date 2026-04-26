import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { spf_numbers, spf_number } = req.query;

    // Single SPF number check
    if (spf_number && typeof spf_number === "string") {
      const { data, error } = await supabase
        .from("spf_creation_draft")
        .select("spf_number, date_updated")
        .eq("spf_number", spf_number)
        .maybeSingle();

      if (error) {
        console.error("Draft check error:", error);
        return res.status(500).json({ message: "Failed to check draft", error });
      }

      return res.status(200).json({
        success: true,
        hasDraft: !!data,
        spf_number,
        date_updated: data?.date_updated || null,
      });
    }

    // Batch check for multiple SPF numbers
    if (spf_numbers) {
      const spfNumberList = typeof spf_numbers === "string" 
        ? spf_numbers.split(",").map(s => s.trim()).filter(Boolean)
        : Array.isArray(spf_numbers) 
          ? spf_numbers.filter(Boolean)
          : [];

      if (spfNumberList.length === 0) {
        return res.status(200).json({ success: true, drafts: {} });
      }

      const { data, error } = await supabase
        .from("spf_creation_draft")
        .select("spf_number, date_updated")
        .in("spf_number", spfNumberList);

      if (error) {
        console.error("Draft batch check error:", error);
        return res.status(500).json({ message: "Failed to check drafts", error });
      }

      const draftMap: Record<string, { hasDraft: boolean; date_updated: string | null }> = {};
      
      // Initialize all as false
      spfNumberList.forEach(sn => {
        draftMap[sn] = { hasDraft: false, date_updated: null };
      });

      // Mark found drafts
      data?.forEach((draft: any) => {
        if (draft.spf_number) {
          draftMap[draft.spf_number] = { 
            hasDraft: true, 
            date_updated: draft.date_updated || null 
          };
        }
      });

      return res.status(200).json({
        success: true,
        drafts: draftMap,
      });
    }

    return res.status(400).json({ message: "Missing spf_number or spf_numbers parameter" });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
