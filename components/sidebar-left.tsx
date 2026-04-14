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
  Key,
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
  onlyForIT?: boolean;
}> = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/products", icon: Package, label: "Products", accessKey: "page:products" },
  { href: "/suppliers", icon: Truck, label: "Suppliers", accessKey: "page:suppliers" },
  { href: "/requests", icon: ClipboardList, label: "Requests", badgeKey: "requests", accessKey: "page:requests" },
  { href: "/history", icon: History, label: "History" },
 { href: "/for-approval", icon: ClipboardCheck, label: "Approval", badgeKey: "forApproval", onlyForEngineeringManagerOrIT: true },
  { href: "/roles", icon: User, label: "Roles", accessKey: "page:roles", onlyForEngineeringManagerOrIT: true },
  { href: "/api-management", icon: Key, label: "API Keys", onlyForIT: true },
];

const BOTTOM_NAV_HREFS = new Set(["/for-approval", "/roles", "/api-management"]);

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

      if (item.onlyForIT && user?.Department !== "IT") {
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
  }, [hasFullAccess, userAccess, user]);

  const mainDesktopNavItems = React.useMemo(
    () => filteredNavItems.filter((item) => !BOTTOM_NAV_HREFS.has(item.href)),
    [filteredNavItems]
  );

  const bottomDesktopNavItems = React.useMemo(
    () => filteredNavItems.filter((item) => BOTTOM_NAV_HREFS.has(item.href)),
    [filteredNavItems]
  );

  /* ─────────────────────────────────────────────
     MOBILE — bottom nav bar (Comic Style)
  ───────────────────────────────────────────── */
  if (isMobile) {
    const visibleItems = filteredNavItems.slice(navOffset, navOffset + VISIBLE_COUNT);
    const canPrev = navOffset > 0;
    const canNext = navOffset + VISIBLE_COUNT < filteredNavItems.length;

    return (
      <div
        className="fixed left-0 right-0 z-50 bg-white border-t-4 border-gray-800 shadow-[0_-4px_0px_#2d3436]"
        style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Comic decoration stripe */}
        <div className="h-1 bg-linear-to-r from-red-400 via-yellow-400 to-blue-400 w-full"></div>

        <div className="flex items-center h-15.5 px-1">

          {/* Left arrow */}
          <button
            onClick={() => setNavOffset((o) => Math.max(0, o - 1))}
            disabled={!canPrev}
            className="flex items-center justify-center w-8 h-full text-gray-800 disabled:opacity-30 shrink-0 font-comic font-bold text-xl"
          >
            <ChevronLeft className="h-6 w-6" />
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
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full relative font-comic ${active ? 'comic-animate-bounce' : ''}`}
              >
                {active && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-linear-to-r from-red-400 to-orange-400 border-2 border-gray-800" />
                )}
                <span className="relative">
                  <Icon
                    className={`h-6 w-6 transition-all ${active ? "text-red-500 comic-text-shadow" : "text-gray-600"}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-yellow-400 text-gray-900 text-[10px] font-comic font-bold flex items-center justify-center border-2 border-gray-800 shadow-[2px_2px_0px_#2d3436]">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span className={`text-[11px] font-comic font-bold transition-colors ${active ? "text-red-500" : "text-gray-600"}`}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* Right arrow */}
          <button
            onClick={() => setNavOffset((o) => Math.min(filteredNavItems.length - VISIBLE_COUNT, o + 1))}
            disabled={!canNext}
            className="flex items-center justify-center w-8 h-full text-gray-800 disabled:opacity-30 shrink-0 font-comic font-bold text-xl"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Avatar */}
          {user && userId && (
            <div className="flex items-center justify-center w-12 h-full shrink-0">
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
<SidebarHeader className="h-18 px-3 flex items-center bg-linear-to-r from-yellow-300 to-orange-300 comic-border-thick m-2 rounded-2xl">
  <Link 
    href="/dashboard" 
    className="flex items-center gap-2.5 min-w-0 cursor-pointer comic-hover-scale"
  >
    {/* Logo mark — always visible, even when collapsed */}
    <div className="shrink-0 comic-animate-bounce">
      <svg
        width="36"
        height="36"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="drop-shadow-lg"
      >
        {/* Outer hexagon */}
        <path
          d="M16 2L28.1244 9V23L16 30L3.87564 23V9L16 2Z"
          fill="url(#espironGrad)"
          stroke="#2d3436"
          strokeWidth="1"
        />
        {/* Inner "E" mark built from bars */}
        <rect x="10" y="10" width="10" height="2" rx="1" fill="white" opacity="0.95" />
        <rect x="10" y="15" width="7.5" height="2" rx="1" fill="white" opacity="0.85" />
        <rect x="10" y="20" width="10" height="2" rx="1" fill="white" opacity="0.95" />
        <rect x="10" y="10" width="2" height="12" rx="1" fill="white" opacity="0.95" />
        <defs>
          <linearGradient id="espironGrad" x1="3.87564" y1="2" x2="28.1244" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ff4757" />
            <stop offset="100%" stopColor="#ffa502" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    {/* Wordmark — only when expanded */}
    {state === "expanded" && (
      <div className="flex flex-col leading-none min-w-0">
        <span
          className="font-comic-title text-lg text-gray-900 truncate comic-text-outline"
        >
          ESPIRON
        </span>
        <span
          className="font-comic text-xs font-bold text-red-500 truncate"
        >
          Product Database 🚀
        </span>
      </div>
    )}
  </Link>
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
                  className={`
                    font-comic font-bold text-sm
                    transition-all duration-200
                    border-2 border-transparent
                    hover:border-gray-800
                    hover:shadow-[4px_4px_0px_#2d3436]
                    hover:-translate-x-0.5
                    hover:-translate-y-0.5
                    hover:bg-yellow-100
                    rounded-xl
                    ${pathname === href 
                      ? 'bg-linear-to-r from-red-400 to-orange-400 text-white border-2 border-gray-800 shadow-[4px_4px_0px_#2d3436]' 
                      : 'bg-white text-gray-700'
                    }
                  `}
                >
                  <Link href={href} className="relative flex items-center gap-3 w-full py-3">
                    {/* Icon + badge overlay when collapsed */}
                    <span className="relative shrink-0">
                      <Icon className="h-5 w-5" />
                      {badge > 0 && state === "collapsed" && (
                        <span className="absolute -top-2 -right-2 min-w-4.5 h-4.5 px-1 rounded-full bg-yellow-400 text-gray-900 text-[9px] font-bold flex items-center justify-center border-2 border-gray-800 shadow-[2px_2px_0px_#2d3436]">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </span>

                    {/* Label + badge when expanded */}
                    {state === "expanded" && (
                      <>
                        <span className="flex-1">{label}</span>
                        {badge > 0 && (
                          <span className="ml-auto min-w-6 h-6 px-1.5 rounded-full bg-yellow-400 text-gray-900 text-xs font-bold flex items-center justify-center border-2 border-gray-800 shadow-[2px_2px_0px_#2d3436]">
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
                      data-[active=true]:bg-linear-to-r
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
                          <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                            {badge > 9 ? "9+" : badge}
                          </span>
                        )}
                      </span>

                      {state === "expanded" && (
                        <>
                          <span className="flex-1">{label}</span>
                          {badge > 0 && (
                            <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
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

      <SidebarSeparator className="h-1 bg-gray-800 my-2" />

      {/* FOOTER - Comic Style */}
      <SidebarFooter className="p-3">
        {user && userId && (
          <div
            className="
              comic-card
              cursor-pointer
              bg-linear-to-r from-blue-100 to-purple-100
              comic-hover-lift
              p-3
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
