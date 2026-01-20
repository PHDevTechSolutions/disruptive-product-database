"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { SidebarLeft } from "@/components/sidebar-left";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

function Dashboard() {
  const router = useRouter();
  const { userId, setUserId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch User ---------------- */
  useEffect(() => {
    // ✅ ADD THIS LINE (do nothing while restoring)
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

  /* ---------------- Logout ---------------- */
  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    setUserId(null);
    router.push("/login");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">

        {/* SIDEBAR */}
        <SidebarLeft />

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 space-y-4">

          {/* TOGGLE SIDEBAR */}
          <SidebarTrigger />

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

          {/* LOGOUT */}
          <Button
            onClick={handleLogout}
            className="border border-border cursor-pointer"
          >
            Logout
          </Button>

        </main>
      </div>
    </SidebarProvider>
  );
}

export default Dashboard;
