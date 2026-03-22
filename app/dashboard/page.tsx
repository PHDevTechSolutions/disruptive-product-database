// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { supabase } from "@/utils/supabase";

// Full page components
import ProductsPage from "@/app/products/page";
import SuppliersPage from "@/app/suppliers/page";
import RequestsPage from "@/app/requests/page";

type UserData = {
  Firstname: string;
  Lastname: string;
  Role: string;
};

type ActiveView = "products" | "suppliers" | "requests" | null;

export default function Dashboard() {
  const { userId } = useUser();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>(null);

  const [totalProducts, setTotalProducts]   = useState<number | null>(null);
  const [totalSuppliers, setTotalSuppliers] = useState<number | null>(null);
  const [totalSPF, setTotalSPF]             = useState<number | null>(null);

  /* ── Auth guard ── */
  useEffect(() => {
    if (userId === null) return;
    if (!userId) { window.location.href = "/login"; }
  }, [userId]);

  /* ── Fetch user ── */
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setUser({ Firstname: d.Firstname ?? "", Lastname: d.Lastname ?? "", Role: d.Role ?? "" }))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  /* ── Fetch counts ── */
  useEffect(() => {
    if (!userId) return;

    async function fetchCounts() {
      try {
        const [prodSnap, suppSnap] = await Promise.all([
          getCountFromServer(query(collection(db, "products"),  where("isActive", "==", true))),
          getCountFromServer(query(collection(db, "suppliers"), where("isActive", "==", true))),
        ]);
        setTotalProducts(prodSnap.data().count);
        setTotalSuppliers(suppSnap.data().count);

        const { count } = await supabase
          .from("spf_request")
          .select("*", { count: "exact", head: true });
        setTotalSPF(count ?? 0);
      } catch (err) {
        console.error("fetchCounts error:", err);
      }
    }

    fetchCounts();
  }, [userId]);

  const metrics: {
    key: ActiveView;
    label: string;
    value: number | null;
    color: string;
  }[] = [
    { key: "products",  label: "Total Products",  value: totalProducts,  color: "#378ADD" },
    { key: "suppliers", label: "Total Suppliers",  value: totalSuppliers, color: "#1D9E75" },
    { key: "requests",  label: "SPF Requests",     value: totalSPF,       color: "#BA7517" },
  ];

  /* ── If a view is active render it full-screen in place ── */
  if (activeView === "products")  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <BackBar label="Products"  onBack={() => setActiveView(null)} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ProductsPage />
      </div>
    </div>
  );

  if (activeView === "suppliers") return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <BackBar label="Suppliers" onBack={() => setActiveView(null)} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <SuppliersPage />
      </div>
    </div>
  );

  if (activeView === "requests")  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <BackBar label="SPF Requests" onBack={() => setActiveView(null)} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <RequestsPage />
      </div>
    </div>
  );

  /* ── Default: dashboard metrics ── */
  return (
    <div className="p-6 space-y-6">
      <SidebarTrigger className="hidden md:flex" />

      <h1 className="text-2xl font-bold">
        {loading ? "Loading..." : user ? (
          <>
            Welcome, {user.Firstname} {user.Lastname}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({user.Role})</span>
          </>
        ) : "Welcome"}
      </h1>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {metrics.map(({ key, label, value, color }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className="bg-muted/50 rounded-lg p-4 space-y-2 text-left hover:bg-muted transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <p className="text-3xl font-semibold group-hover:underline underline-offset-2">
              {value === null
                ? <span className="text-muted-foreground text-lg animate-pulse">—</span>
                : value.toLocaleString()
              }
            </p>
            <p className="text-xs text-muted-foreground">Click to view →</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Small back bar rendered above the embedded page ── */
function BackBar({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2 bg-white border-b">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Dashboard
      </button>
      <span className="text-muted-foreground">/</span>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}