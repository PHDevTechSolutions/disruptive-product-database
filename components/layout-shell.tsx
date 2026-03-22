"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarBottom } from "@/components/sidebar-bottom";
import { SplashScreen } from "@/components/splash-screen";
import { usePathname } from "next/navigation";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, loading } = useUser();
  const pathname = usePathname();
  const prevUserId = useRef<string | null>(null);

  const [showSplash, setShowSplash] = useState(false);

  const isLogin = pathname === "/login";

  useEffect(() => {
    // Detect fresh login: userId just changed from null to a value
    if (!prevUserId.current && userId) {
      setShowSplash(true);
    }
    prevUserId.current = userId;
  }, [userId]);

  if (loading && !isLogin) return null;

  // Play splash screen after login before showing anything
  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  return (
    <div className="relative flex min-h-[100svh] w-full">
      {userId && !isLogin && (
        <>
          <div className="hidden md:block">
            <SidebarLeft />
          </div>

          <div className="md:hidden">
            <SidebarBottom />
          </div>
        </>
      )}

      <main className="flex-1 overflow-y-auto overscroll-contain pb-[calc(144px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
    </div>
  );
}
