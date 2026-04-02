import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const db = await connectToDatabase();
    const userId      = req.query.id          as string | undefined;
    const referenceID = req.query.referenceID as string | undefined;
    const listType    = req.query.list        as string | undefined;

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

    /* ── Query for Engineering and IT users list ── */
    if (listType === "engineering-it") {
      try {
        // Get the viewer's user data from the session to check if they're IT
        const viewerId = req.headers["x-user-id"] || req.query.viewerId;
        let isITViewer = false;
        
        if (viewerId) {
          try {
            const viewerUser = await db.collection("users").findOne({ _id: new ObjectId(viewerId as string) });
            isITViewer = viewerUser?.Department === "IT";
          } catch (error) {
            console.error("Error checking viewer department:", error);
          }
        }
        
        // Base query: Engineering non-managers + IT users
        let queryFilter = {
          $or: [
            { 
              $and: [
                { Department: "Engineering" },
                { Role: { $ne: "Manager" } }
              ]
            },
            { Department: "IT" }
          ]
        };
        
        // If viewer is IT, also include Engineering Managers
        if (isITViewer) {
          queryFilter = {
            $or: [
              { Department: "Engineering" },
              { Department: "IT" }
            ]
          };
        }
        
        const users = await db.collection("users")
          .find(queryFilter)
          .project({ Password: 0, password: 0 })
          .toArray();
        
        const usersWithSerializedId = users.map(user => ({
          ...user,
          _id: user._id.toString()
        }));
        
        return res.status(200).json(usersWithSerializedId);
      } catch (error) {
        console.error("Error fetching engineering-it users:", error);
        return res.status(500).json({ error: "Server error" });
      }
    }

    return res.status(400).json({ error: "User ID, ReferenceID, or list parameter is required" });

  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}