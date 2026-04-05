"use client";

import { useEffect } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { useUser } from "@/contexts/UserContext";

export default function ApprovalToastListener() {
  const { userId } = useUser();

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "forApprovals"),
      where("requesterUserId", "==", userId),
      where("status", "in", ["Approved", "Rejected"]),
      where("resultNotifiedAt", "==", null),
    );
    return onSnapshot(q, async (snap) => {
      for (const d of snap.docs) {
        const data = d.data();
        const label = (data?.summary as string) || (data?.entityLabel as string) || "Your request";
        const remarks =
          typeof data?.reviewRemarks === "string" && data.reviewRemarks.trim()
            ? data.reviewRemarks.trim()
            : "";
        try {
          if (data?.status === "Approved") {
            toast.success("Request approved", {
              description: remarks
                ? `${label} is approved and applied. Reviewer: ${remarks}`
                : `${label} is approved and has been applied.`,
            });
          } else {
            toast.error("Request rejected", {
              description: remarks ? `${label} was rejected. Reason: ${remarks}` : `${label} was rejected.`,
            });
          }
          await updateDoc(doc(db, "forApprovals", d.id), {
            resultNotifiedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Approval toast / notify update failed:", e);
        }
      }
    });
  }, [userId]);

  return null;
}
