"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

import SPF from "@/components/spf-request";

interface UserDetails {
  process_by: string;
}

export default function RequestsPage() {
  const { userId } = useUser();
  const { clearNotifications } = useNotifications();
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails>({
    process_by: "",
  });

  /* ── Clear badge as soon as user lands on this page ── */
  useEffect(() => {
    clearNotifications();
  }, [clearNotifications]);

  useEffect(() => {
    if (!userId) { setLoadingUser(false); return; }

    const fetchUserData = async () => {
      setError(null);
      setLoadingUser(true);
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();
        setUserDetails({
          process_by: `${data.Firstname ?? ""} ${data.Lastname ?? ""}`.trim(),
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
      <SidebarTrigger className="hidden md:flex" />
      <h1 className="text-2xl font-bold">SPF Requests</h1>
      <Separator />
      <SPF processBy={userDetails.process_by} />
    </div>
  );
}
