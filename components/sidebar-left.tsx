"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

import { LayoutDashboard, Package, Truck } from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import { NavUser } from "@/components/nav-user";

type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  profilePicture: string;
};

export function SidebarLeft() {
  const { state, isMobile } = useSidebar();
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
        console.error("Sidebar user fetch error:", err);
      });
  }, [userId]);

  return (
    <Sidebar
      collapsible="icon"
      className="
        bg-white/90
        backdrop-blur-md
        shadow-2xl
        border-r
        border-border/50
      "
    >
      {/* HEADER */}
      <SidebarHeader className="h-16 px-4 flex items-center">
        {state === "expanded" && (
          <span className="text-lg font-bold tracking-tight text-gray-900">
            Inventory
          </span>
        )}
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="px-2">
        <SidebarMenu>

          {/* DASHBOARD */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              data-active={pathname === "/dashboard"}
              className="
                transition-all
                hover:bg-red-50
                hover:text-red-700
                hover:scale-[1.01]
                data-[active=true]:bg-gradient-to-r
                data-[active=true]:from-red-600
                data-[active=true]:to-red-700
                data-[active=true]:text-white
                data-[active=true]:shadow-md
                data-[active=true]:hover:from-red-700
                data-[active=true]:hover:to-red-800
              "
            >
              <Link href="/dashboard">
                <LayoutDashboard />
                {(isMobile || state === "expanded") && (
                  <span>Dashboard</span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* PRODUCTS */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              data-active={pathname === "/products"}
              className="
                transition-all
                hover:bg-red-50
                hover:text-red-700
                hover:scale-[1.01]
                data-[active=true]:bg-gradient-to-r
                data-[active=true]:from-red-600
                data-[active=true]:to-red-700
                data-[active=true]:text-white
                data-[active=true]:shadow-md
                data-[active=true]:hover:from-red-700
                data-[active=true]:hover:to-red-800
              "
            >
              <Link href="/products">
                <Package />
                {(isMobile || state === "expanded") && (
                  <span>Products</span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* SUPPLIERS */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              data-active={pathname === "/suppliers"}
              className="
                transition-all
                hover:bg-red-50
                hover:text-red-700
                hover:scale-[1.01]
                data-[active=true]:bg-gradient-to-r
                data-[active=true]:from-red-600
                data-[active=true]:to-red-700
                data-[active=true]:text-white
                data-[active=true]:shadow-md
                data-[active=true]:hover:from-red-700
                data-[active=true]:hover:to-red-800
              "
            >
              <Link href="/suppliers">
                <Truck />
                {(isMobile || state === "expanded") && (
                  <span>Suppliers</span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator />

      {/* FOOTER */}
      <SidebarFooter className="p-2">
        {user && userId && (
          <div
            className="
              cursor-pointer
              rounded-xl
              bg-white/80
              backdrop-blur-md
              shadow-lg
              transition
              hover:shadow-xl
            "
          >
            <NavUser
              user={{
                name: `${user.Firstname} ${user.Lastname}`.trim() || "Unknown User",
                position: user.Role,
                email: user.Email,
                avatar: user.profilePicture || "/avatars/shadcn.jpg",
              }}
              userId={userId}
            />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
