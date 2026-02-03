"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, Package, Truck } from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import { NavUser } from "@/components/nav-user";

/* ================= TYPES ================= */

type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  profilePicture: string;
};

type NavItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
};

/* ================= COMPONENT ================= */

export function SidebarLeft() {
  const { isMobile } = useSidebar();
  const { userId } = useUser();
  const pathname = usePathname();

  const [user, setUser] = React.useState<UserDetails | null>(null);

  /* -------- Fetch User Details -------- */

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
        console.error("Topbar user fetch error:", err);
      });
  }, [userId]);

  return (
    <div
      className="
        fixed top-0 left-0 right-0
        h-12
        bg-white/90
        backdrop-blur-md
        border-b border-border/50
        shadow-sm
        z-50
        flex items-center
        px-3
      "
    >
      {/* ===== LEFT SECTION ===== */}
      <div className="flex items-center gap-2">
        {isMobile && <SidebarTrigger />}

        <span className="text-sm font-semibold tracking-tight text-gray-900">
          Product Database
        </span>
      </div>

      {/* ===== CENTER NAVIGATION ===== */}
      <div className="flex-1 flex items-center justify-center gap-3">
        <NavItem
          href="/dashboard"
          label="Dashboard"
          icon={<LayoutDashboard className="h-3.5 w-3.5" />}
          active={pathname === "/dashboard"}
        />

        <NavItem
          href="/products"
          label="Products"
          icon={<Package className="h-3.5 w-3.5" />}
          active={pathname === "/products"}
        />

        <NavItem
          href="/suppliers"
          label="Suppliers"
          icon={<Truck className="h-3.5 w-3.5" />}
          active={pathname === "/suppliers"}
        />
      </div>

      {/* ===== RIGHT SECTION - USER ===== */}
      <div className="flex items-center">
        {user && userId && (
          <div
            className="
              cursor-pointer
              rounded-md
              bg-white/80
              backdrop-blur-md
              shadow-sm
              transition
              hover:shadow-md
              scale-[0.80]
              origin-right
            "
          >
            <NavUser
              user={{
                name:
                  `${user.Firstname} ${user.Lastname}`.trim() ||
                  "Unknown User",
                position: user.Role,
                email: user.Email,
                avatar: user.profilePicture || "/avatars/shadcn.jpg",
              }}
              userId={userId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SUB COMPONENT ================= */

function NavItem({ href, label, icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-1.5
        px-3 py-1
        rounded-md
        transition-all
        text-xs font-medium

        ${
          active
            ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-sm"
            : "hover:bg-red-50 hover:text-red-700"
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
