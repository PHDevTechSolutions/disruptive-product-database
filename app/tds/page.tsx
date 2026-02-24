"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SidebarTrigger } from "@/components/ui/sidebar";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

export default function TDS() {
  const router = useRouter();
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch User ---------------- */
  useEffect(() => {
    if (userId === null) return;

    if (!userId) {
      router.push("/login");
      return;
    }

    async function fetchUser() {
      try {
        const res = await fetch(`/api/users?id=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch user");

        const data = await res.json();
        setUser(data);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId, router]);

  return (
    <div className="p-6 space-y-4 flex justify-center items-center h-screen">
      {/* HEADER */}
      <h1 className="text-4xl font-bold text-center">
        This is the TDS page
      </h1>

      {/* USER INFO */}
      {loading ? (
        "Loading..."
      ) : user ? (
        <p className="mt-4 text-lg text-center">
          Welcome, {user.Firstname} {user.Lastname}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({user.Role})
          </span>
        </p>
      ) : (
        "Welcome"
      )}
    </div>
  );
}