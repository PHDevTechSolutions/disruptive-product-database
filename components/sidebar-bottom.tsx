// components/sidebar-bottom.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Truck, History, ClipboardList } from "lucide-react";
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

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/products",  icon: Package,         label: "Products"  },
  { href: "/suppliers", icon: Truck,            label: "Suppliers" },
  { href: "/requests",  icon: ClipboardList,    label: "Requests"  },
  { href: "/history",   icon: History,          label: "History"   },
];

export function SidebarBottom() {
  const { isMobile } = useSidebar();
  const { userId } = useUser();
  const pathname = usePathname();
  const [user, setUser] = React.useState<UserDetails | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    fetch(`/api/users?id=${encodeURIComponent(userId)}`)
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => setUser({
        Firstname: data.Firstname ?? "",
        Lastname: data.Lastname ?? "",
        Role: data.Role ?? "",
        Email: data.Email ?? "",
        profilePicture: data.profilePicture ?? "",
      }))
      .catch((err) => console.error("SidebarBottom fetch error:", err));
  }, [userId]);

  if (!isMobile) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]"
      style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around px-1 h-[62px]">

        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-red-500" />
              )}
              <Icon
                className={`h-5 w-5 transition-colors ${active ? "text-red-600" : "text-gray-400"}`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className={`text-[10px] font-medium transition-colors ${active ? "text-red-600" : "text-gray-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* Avatar only — no name/label visible */}
        {user && userId && (
          <div className="flex items-center justify-center flex-1 h-full">
            <NavUser
              user={{
                name: `${user.Firstname} ${user.Lastname}`.trim() || "User",
                position: user.Role,
                email: user.Email,
                avatar: user.profilePicture || "/avatars/shadcn.jpg",
              }}
              userId={userId}
              avatarOnly
            />
          </div>
        )}

      </div>
    </div>
  );
}