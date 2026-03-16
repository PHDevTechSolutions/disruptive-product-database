"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import SPF from "@/components/spf-request"; // new component

/* ---------------- Types ---------------- */
interface UserDetails {
  process_by: string;
}

/* ---------------- Component ---------------- */
export default function RequestsPage() {
  const { userId } = useUser();
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails>({
    process_by: "",
  });

  /* ---------------- Fetch User ---------------- */
  useEffect(() => {
    if (!userId) {
      setLoadingUser(false);
      return;
    }

    const fetchUserData = async () => {
      setError(null);
      setLoadingUser(true);
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();

        const processby =
          `${data.Firstname ?? ""} ${data.Lastname ?? ""}`.trim();

        setUserDetails({
          process_by: processby,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load user data");
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (loadingUser) return <p>Loading user...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="h-[100dvh] overflow-y-auto p-6 space-y-6">
      {/* Sidebar */}
      <SidebarTrigger className="hidden md:flex" />

      {/* Header */}
      <h1 className="text-2xl font-bold">SPF Requests</h1>
      <Separator />

      {/* ================= REQUEST TABLE ================= */}
      <SPF processBy={userDetails.process_by} />
    </div>
  );
}
