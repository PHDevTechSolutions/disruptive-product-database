"use client";

// sidebar-bottom.tsx is deleted — SidebarLeft now handles both mobile and desktop.

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { NotificationProvider, useNotifications } from "@/contexts/NotificationContext";
import { SidebarLeft } from "@/components/sidebar-left";
import { SplashScreen } from "@/components/splash-screen";
import ApprovalToastListener from "@/components/approval-toast-listener";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

function TitleUpdater({ pathname, userId }: { pathname: string | null; userId: string | null }) {
  const { activeNotificationCount, unreadChatCount } = useNotifications();
  const [forApprovalCount, setForApprovalCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setForApprovalCount(0);
      return;
    }
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
  }, [userId]);

  useEffect(() => {
    const titles: Record<string, string> = {
      "/dashboard":    "Dashboard",
      "/products":     "Products",
      "/suppliers":    "Suppliers",
      "/requests":     "Requests",
      "/history":      "History",
      "/for-approval": "For Approval",
      "/roles":        "Roles",
      "/api-management": "API Management",
    };

    const pageTitle = pathname ? titles[pathname] : null;
    // Only show notification count when user is logged in
    const totalNotifications = userId ? activeNotificationCount + unreadChatCount + forApprovalCount : 0;

    if (pageTitle) {
      document.title = totalNotifications > 0
        ? `(${totalNotifications}) ${pageTitle} - Espiron | PD`
        : `${pageTitle} - Espiron | PD`;
    } else {
      document.title = totalNotifications > 0
        ? `(${totalNotifications}) Espiron | PD`
        : "Espiron | PD";
    }
  }, [pathname, activeNotificationCount, unreadChatCount, forApprovalCount, userId]);

  return null;
}

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, loading } = useUser();
  const { wallpaper, opacity } = useWallpaper();
  const pathname = usePathname();
  const { state, isMobile } = useSidebar();

  const isLogin = pathname === "/login";

  const [showSplash, setShowSplash] = useState(false);
  const [splashChecked, setSplashChecked] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const splashPlayed = sessionStorage.getItem("splashPlayed") === "true";

    if (!splashPlayed) {
      setShowSplash(true);
    }

    setSplashChecked(true);
  }, [userId]);

  function handleSplashDone() {
    sessionStorage.setItem("splashPlayed", "true");
    setShowSplash(false);
  }

  if (loading && !isLogin) return null;
  if (userId && !splashChecked && !isLogin) return null;

  if (showSplash) {
    return <SplashScreen onDone={handleSplashDone} />;
  }

  return (
    <NotificationProvider>
      <TitleUpdater pathname={pathname} userId={userId} />
      <ApprovalToastListener />
      <div className="relative flex min-h-svh w-full">
        {/* SidebarLeft handles both desktop (left sidebar) and mobile (bottom nav) */}
        {userId && !isLogin && <SidebarLeft />}

        <main className="relative flex-1 overflow-y-auto overscroll-contain pb-[calc(144px+env(safe-area-inset-bottom))] md:pb-0">
          {/* Wallpaper layer — sits behind content, opacity-controlled */}
          {wallpaper && (
            <div
              aria-hidden
              className="pointer-events-none fixed top-0 right-0 bottom-0 z-0 transition-all duration-500"
              style={{
                left: userId
                  ? isMobile
                    ? "0px"
                    : state === "expanded"
                      ? "16rem"
                      : "3rem"
                  : "0px",
                backgroundImage: `url(${wallpaper})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                opacity,
              }}
            />
          )}
          {/* Content sits above wallpaper */}
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </NotificationProvider>
  );
}
