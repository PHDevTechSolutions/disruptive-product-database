"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SidebarTrigger } from "@/components/ui/sidebar";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

export default function Dashboard() {
  const router = useRouter();
  const { userId, setUserId } = useUser();

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

        // ======================================
        // DUMMY USER FALLBACK (MongoDB down)
        // ======================================
        if (userId === "emergency-admin") {
          setUser({
            Firstname: "Emergency",
            Lastname: "Admin",
            Role: "Admin",
          });
        } else {
          setUser({
            Firstname: "System",
            Lastname: "User",
            Role: "Offline Mode",
          });
        }

      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId, router]);

  /* ---------------- Logout ---------------- */
  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setUserId(null);
    router.push("/login");
  }

  return (
    <div className="p-6 space-y-4">

      {/* DESKTOP SIDEBAR TOGGLE */}
      <SidebarTrigger className="hidden md:flex" />

      {/* HEADER */}
      <h1 className="text-2xl font-bold">
        {loading ? (
          "Loading..."
        ) : user ? (
          <>
            Welcome, {user.Firstname} {user.Lastname}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({user.Role})
            </span>
          </>
        ) : (
          "Welcome"
        )}
      </h1>

      <Button variant="destructive" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  );
}