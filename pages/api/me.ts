import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = req.cookies.session;

  if (!session) {
    return res.status(401).json(null);
  }

  try {
    const db = await connectToDatabase();

    // ⚠️ IMPORTANT:
    // You MUST be saving userId in session when logging in
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(session) });

    if (!user) {
      return res.status(401).json(null);
    }

    return res.status(200).json({
      userId: user._id.toString(),
    });
  } catch (err) {
    console.error("ME API ERROR:", err);
    return res.status(500).json(null);
  }
}
