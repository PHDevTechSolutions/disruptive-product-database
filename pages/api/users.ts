import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const db = await connectToDatabase();
    const userId      = req.query.id          as string | undefined;
    const referenceID = req.query.referenceID as string | undefined;

    /* ── Query by MongoDB _id ── */
    if (userId) {
      try {
        const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
        if (user) {
          const { Password, password, _id, ...userData } = user;
          return res.status(200).json({
            ...userData,
            _id: _id.toString(), // ✅ serialize ObjectId to string
          });
        } else {
          return res.status(404).json({ error: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        return res.status(500).json({ error: "Invalid user ID format or server error" });
      }
    }

    /* ── Query by ReferenceID (used by audit trail name resolution) ── */
    if (referenceID) {
      try {
        const user = await db.collection("users").findOne({ ReferenceID: referenceID });
        if (user) {
          const { Password, password, _id, ...userData } = user;
          return res.status(200).json({
            ...userData,
            _id: _id.toString(), // ✅ serialize ObjectId to string
          });
        } else {
          return res.status(404).json({ error: "User not found" });
        }
      } catch (error) {
        console.error("Error fetching user by referenceID:", error);
        return res.status(500).json({ error: "Server error" });
      }
    }

    return res.status(400).json({ error: "User ID or ReferenceID is required" });

  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}