"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import AddProduct from "@/components/add-product";

/* ---------------- Types ---------------- */
type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

export default function Products() {
  const router = useRouter();
  const { userId } = useUser();

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [addProductOpen, setAddProductOpen] = useState(false);

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
    <div className="p-6 space-y-6">
      {/* DESKTOP SIDEBAR TOGGLE */}
      <SidebarTrigger className="hidden md:flex" />

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>

        <div className="flex gap-2">

          {/* ADD PRODUCT V2 */}
          <Button
            type="button"
            className="gap-1 cursor-pointer"
            onClick={() => router.push("/add-product")}
          >
            + Add Product v2
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground">
        No products yet.
      </div>

      {/* ADD PRODUCT SHEET */}
      <AddProduct
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
      />
    </div>
  );
}
