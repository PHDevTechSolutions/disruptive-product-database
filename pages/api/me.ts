import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { serialize } from "cookie";

const ALLOWED_ROLES = ["Engineering", "IT"];

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

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(session) });

    if (!user) {
      return res.status(401).json(null);
    }

    // ❌ If the user's role is no longer allowed, force logout
    if (!ALLOWED_ROLES.includes(user.Role)) {
      // Clear the session cookie
      res.setHeader(
        "Set-Cookie",
        serialize("session", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV !== "development",
          sameSite: "strict",
          expires: new Date(0),
          path: "/",
        })
      );

      return res.status(403).json({
        forceLogout: true,
        message: "Your role no longer has access. You have been logged out.",
      });
    }

    return res.status(200).json({
      userId: user._id.toString(),
    });
  } catch (err) {
    console.error("ME API ERROR:", err);
    return res.status(500).json(null);
  }
}