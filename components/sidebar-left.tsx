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

import {
  LayoutDashboard,
  Package,
  Truck,
  History,
  ClipboardList,
} from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "@/contexts/NotificationContext";
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
  const { unreadCount } = useNotifications();
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

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/products",  icon: Package,          label: "Products"  },
    { href: "/suppliers", icon: Truck,             label: "Suppliers" },
    { href: "/requests",  icon: ClipboardList,     label: "Requests", badge: unreadCount },
    { href: "/history",   icon: History,           label: "History"   },
  ];

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
            Product Database
          </span>
        )}
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="px-2">
        <SidebarMenu>
          {navItems.map(({ href, icon: Icon, label, badge }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton
                asChild
                data-active={pathname === href}
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
                <Link href={href} className="relative flex items-center gap-2 w-full">
                  {/* Icon with badge overlay when collapsed */}
                  <span className="relative shrink-0">
                    <Icon className="h-4 w-4" />
                    {badge !== undefined && badge > 0 && state === "collapsed" && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-green-500 text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </span>

                  {(isMobile || state === "expanded") && (
                    <>
                      <span className="flex-1">{label}</span>
                      {badge !== undefined && badge > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
      </SidebarFooter>
    </Sidebar>
  );
}
