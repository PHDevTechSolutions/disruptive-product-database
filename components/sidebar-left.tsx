"use client";

// MERGED: sidebar-bottom behavior is now handled here via isMobile detection.
// Delete components/sidebar-bottom.tsx — it is no longer needed.

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";

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
  ClipboardCheck,
  ClipboardList,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useUser } from "@/contexts/UserContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useRoleAccess, type AccessKey } from "@/contexts/RoleAccessContext";
import { NavUser } from "@/components/nav-user";
import { db } from "@/lib/firebase";

type UserDetails = {
  Firstname: string;
  Lastname: string;
  Role: string;
  Email: string;
  profilePicture: string;
  Department: string;
};

const NAV_ITEMS: Array<{
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  label: string;
  badgeKey?: "requests" | "forApproval";
  accessKey?: AccessKey;
  onlyForEngineeringManagerOrIT?: boolean;
}> = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/products", icon: Package, label: "Products", accessKey: "page:products" },
  { href: "/suppliers", icon: Truck, label: "Suppliers", accessKey: "page:suppliers" },
  { href: "/requests", icon: ClipboardList, label: "Requests", badgeKey: "requests", accessKey: "page:requests" },
  { href: "/history", icon: History, label: "History" },
 { href: "/for-approval", icon: ClipboardCheck, label: "Approval", badgeKey: "forApproval", onlyForEngineeringManagerOrIT: true },
  { href: "/roles", icon: User, label: "Roles", accessKey: "page:roles", onlyForEngineeringManagerOrIT: true },
];

const BOTTOM_NAV_HREFS = new Set(["/for-approval", "/roles"]);

export function SidebarLeft() {
  const { state, isMobile } = useSidebar();
  const { userId } = useUser();
  const { unreadCount } = useNotifications();
  const { subscribeToUserAccess } = useRoleAccess();
  const pathname = usePathname();

  const [user, setUser] = React.useState<UserDetails | null>(null);
  const [userAccess, setUserAccess] = React.useState<Record<string, boolean> | null>(null);
  const [forApprovalCount, setForApprovalCount] = React.useState(0);
  const [navOffset, setNavOffset] = React.useState(0);
  const VISIBLE_COUNT = 4;

  React.useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function fetchUser() {
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(userId!)}`);

        if (!res.ok) {
          console.warn(`SidebarLeft: /api/users returned ${res.status}`);
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        setUser({
          Firstname:      data.Firstname      ?? "",
          Lastname:       data.Lastname       ?? "",
          Role:           data.Role           ?? "",
          Email:          data.Email          ?? "",
          profilePicture: data.profilePicture ?? "",
          Department:     data.Department     ?? "",
        });
      } catch (err) {
        if (!cancelled) {
          console.error("SidebarLeft user fetch error:", err);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    if (!userId) {
      setUserAccess(null);
      return;
    }

    const unsub = subscribeToUserAccess(userId, (access) => {
      setUserAccess(access);
    });

    return () => unsub();
  }, [userId, subscribeToUserAccess]);

  React.useEffect(() => {
    const q = query(collection(db, "forApprovals"), where("status", "==", "Pending"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setForApprovalCount(snapshot.size);
      },
      () => {
        setForApprovalCount(0);
      }
    );
    return () => unsub();
  }, []);

  const hasFullAccess = React.useMemo(() => {
    if (!user) return false;
    return (
      (user.Department === "Engineering" && user.Role === "Manager") ||
      user.Department === "IT"
    );
  }, [user]);

  // Filter NAV_ITEMS based on user permissions
  const filteredNavItems = React.useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      if (item.onlyForEngineeringManagerOrIT && !hasFullAccess) {
        return false;
      }

      if (!item.accessKey || hasFullAccess) {
        return true;
      }

      if (!userAccess) {
        return true;
      }

      return userAccess[item.accessKey] ?? true;
    });
  }, [hasFullAccess, userAccess]);

  const mainDesktopNavItems = React.useMemo(
    () => filteredNavItems.filter((item) => !BOTTOM_NAV_HREFS.has(item.href)),
    [filteredNavItems]
  );

  const bottomDesktopNavItems = React.useMemo(
    () => filteredNavItems.filter((item) => BOTTOM_NAV_HREFS.has(item.href)),
    [filteredNavItems]
  );

  /* ─────────────────────────────────────────────
     MOBILE — bottom nav bar
  ───────────────────────────────────────────── */
  if (isMobile) {
    const visibleItems = filteredNavItems.slice(navOffset, navOffset + VISIBLE_COUNT);
    const canPrev = navOffset > 0;
    const canNext = navOffset + VISIBLE_COUNT < filteredNavItems.length;

    return (
      <div
        className="fixed left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-[0_-1px_12px_rgba(0,0,0,0.06)]"
        style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center h-[62px] px-1">

          {/* Left arrow */}
          <button
            onClick={() => setNavOffset((o) => Math.max(0, o - 1))}
            disabled={!canPrev}
            className="flex items-center justify-center w-6 h-full text-gray-400 disabled:opacity-0 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Visible nav items */}
          {visibleItems.map(({ href, icon: Icon, label, badgeKey }) => {
            const active = pathname === href;
            const badge =
              badgeKey === "requests"
                ? unreadCount
                : badgeKey === "forApproval"
                  ? forApprovalCount
                  : 0;

            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-red-500" />
                )}
                <span className="relative">
                  <Icon
                    className={`h-5 w-5 transition-colors ${active ? "text-red-600" : "text-gray-400"}`}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white shadow-sm">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className={`text-[10px] font-medium transition-colors ${active ? "text-red-600" : "text-gray-400"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Right arrow */}
          <button
            onClick={() => setNavOffset((o) => Math.min(filteredNavItems.length - VISIBLE_COUNT, o + 1))}
            disabled={!canNext}
            className="flex items-center justify-center w-6 h-full text-gray-400 disabled:opacity-0 shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Avatar */}
          {user && userId && (
            <div className="flex items-center justify-center w-10 h-full shrink-0">
              <NavUser
                user={{
                  name:     `${user.Firstname} ${user.Lastname}`.trim() || "User",
                  position: user.Role,
                  email:    user.Email,
                  avatar:   user.profilePicture || "/avatars/shadcn.jpg",
                }}
                userId={userId}
                avatarOnly
                notificationCount={unreadCount}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     DESKTOP — left sidebar (collapsible icon)
  ───────────────────────────────────────────── */
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
<SidebarHeader className="h-16 px-3 flex items-center">
  <div className="flex items-center gap-2.5 min-w-0">
    {/* Logo mark — always visible, even when collapsed */}
    <div className="shrink-0">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer hexagon */}
        <path
          d="M16 2L28.1244 9V23L16 30L3.87564 23V9L16 2Z"
          fill="url(#espironGrad)"
        />
        {/* Inner "E" mark built from bars */}
        <rect x="10" y="10" width="10" height="2" rx="1" fill="white" opacity="0.95" />
        <rect x="10" y="15" width="7.5" height="2" rx="1" fill="white" opacity="0.85" />
        <rect x="10" y="20" width="10" height="2" rx="1" fill="white" opacity="0.95" />
        <rect x="10" y="10" width="2" height="12" rx="1" fill="white" opacity="0.95" />
        <defs>
          <linearGradient id="espironGrad" x1="3.87564" y1="2" x2="28.1244" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    {/* Wordmark — only when expanded */}
    {state === "expanded" && (
      <div className="flex flex-col leading-none min-w-0">
        <span
          className="text-[13px] font-black tracking-widest uppercase text-gray-900 truncate"
          style={{ letterSpacing: "0.12em" }}
        >
          Espiron
        </span>
        <span
          className="text-[9px] font-semibold tracking-[0.18em] uppercase text-red-600 truncate"
          style={{ letterSpacing: "0.2em" }}
        >
          Product Database
        </span>
      </div>
    )}
  </div>
</SidebarHeader>

      {/* CONTENT */}
      <SidebarContent className="px-2 flex flex-col">
        <SidebarMenu>
          {mainDesktopNavItems.map(({ href, icon: Icon, label, badgeKey }) => {
            const badge =
              badgeKey === "requests"
                ? unreadCount
                : badgeKey === "forApproval"
                  ? forApprovalCount
                  : 0;

            return (
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
                    {/* Icon + badge overlay when collapsed */}
                    <span className="relative shrink-0">
                      <Icon className="h-4 w-4" />
                      {badge > 0 && state === "collapsed" && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </span>

                    {/* Label + badge when expanded */}
                    {state === "expanded" && (
                      <>
                        <span className="flex-1">{label}</span>
                        {badge > 0 && (
                          <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        {bottomDesktopNavItems.length > 0 && (
          <SidebarMenu className="mt-auto pt-2">
            {bottomDesktopNavItems.map(({ href, icon: Icon, label, badgeKey }) => {
              const badge =
                badgeKey === "requests"
                  ? unreadCount
                  : badgeKey === "forApproval"
                    ? forApprovalCount
                    : 0;

              return (
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
                      <span className="relative shrink-0">
                        <Icon className="h-4 w-4" />
                        {badge > 0 && state === "collapsed" && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </span>

                      {state === "expanded" && (
                        <>
                          <span className="flex-1">{label}</span>
                          {badge > 0 && (
                            <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                              {badge > 9 ? "9+" : badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}
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
                name:     `${user.Firstname} ${user.Lastname}`.trim() || "Unknown User",
                position: user.Role,
                email:    user.Email,
                avatar:   user.profilePicture || "/avatars/shadcn.jpg",
              }}
              userId={userId}
              notificationCount={unreadCount}
            />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
