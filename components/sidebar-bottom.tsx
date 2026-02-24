"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LayoutDashboard, Package, Truck, History, FileText } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";
import { useUser } from "@/contexts/UserContext";
import { NavUser } from "@/components/nav-user";

type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  profilePicture: string;
};

export function SidebarBottom() {
  const { isMobile } = useSidebar();
  const { userId } = useUser();
  const pathname = usePathname();

  const [user, setUser] = React.useState<UserDetails | null>(null);

  React.useEffect(() => {
    if (!userId) return;

    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => {
        setUser({
          Firstname: data.Firstname ?? "",
          Lastname: data.Lastname ?? "",
          Role: data.Role ?? "",
          Email: data.Email ?? "",
          profilePicture: data.profilePicture ?? "",
        });
      })
      .catch((err) => {
        console.error("SidebarBottom user fetch error:", err);
      });
  }, [userId]);

  if (!isMobile) return null;

  return (
    <div
      className="
        fixed left-0 right-0 z-60
        border-t border-border/50
        bg-white/95 backdrop-blur-md
        md:hidden
        h-[120px]
      "
      style={{ bottom: "env(safe-area-inset-bottom)" }}
    >
      {/* NAV ICONS */}
      <div className="flex justify-around py-2">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/dashboard" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/products"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/products" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <Package className="h-5 w-5" />
          <span>Products</span>
        </Link>

        <Link
          href="/suppliers"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/suppliers" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <Truck className="h-5 w-5" />
          <span>Suppliers</span>
        </Link>

        <Link
          href="/tds"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/tds" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <FileText className="h-5 w-5" />
          <span>TDS</span>
        </Link>

        <Link
          href="/history"
          className={`flex flex-col items-center gap-1 text-xs ${
            pathname === "/history" ? "text-red-600" : "text-gray-600"
          }`}
        >
          <History className="h-5 w-5" />
          <span>History</span>
        </Link>
      </div>

      {/* USER */}
      {user && userId && (
        <div className="px-2 pt-1 border-t">
          <NavUser
            user={{
              name:
                `${user.Firstname} ${user.Lastname}`.trim() || "Unknown User",
              position: user.Role,
              email: user.Email,
              avatar: user.profilePicture || "/avatars/shadcn.jpg",
            }}
            userId={userId}
          />
        </div>
      )}
    </div>
  );
}