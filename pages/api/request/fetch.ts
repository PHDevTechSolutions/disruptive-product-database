import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/utils/supabase";

const BATCH_SIZE = 5000;

// Async generator to fetch spf_request table in batches
async function* fetchHistoryBatches(fromDate?: string, toDate?: string) {
  let lastId: number | null = null;

  while (true) {
    let query = supabase
      .from("spf_request")
      .select("*")
      .order("id", { ascending: true })
      .limit(BATCH_SIZE);

    if (lastId) query = query.gt("id", lastId);
    if (fromDate && toDate)
      query = query.gte("date_created", fromDate).lte("date_created", toDate);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase fetch error:", error);
      throw error;
    }

    if (!data || data.length === 0) break;

    // Make sure all fields are JSON-safe
    const safeData = data.map((r: any) => ({
      ...r,
      id: r.id?.toString() ?? null,
      date_created: r.date_created ? new Date(r.date_created).toISOString() : null,
      special_instructions: r.special_instructions ?? null,
      clientName: r.clientName ?? null,
      spf_number: r.spf_number ?? null,
    }));

    yield safeData;

    lastId = data[data.length - 1].id;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { from, to } = req.query;
  const fromDate = typeof from === "string" ? from : undefined;
  const toDate = typeof to === "string" ? to : undefined;

  try {
    const allRequests: any[] = [];

    for await (const batch of fetchHistoryBatches(fromDate, toDate)) {
      allRequests.push(...batch);
    }

    return res.status(200).json({
      requests: allRequests,
      total: allRequests.length,
      cached: false,
    });
  } catch (err: any) {
    console.error("Server error:", err);
    if (!res.writableEnded) {
      return res.status(500).json({ message: err.message || "Server error" });
    }
  }
}