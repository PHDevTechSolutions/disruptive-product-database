"use client";

import { useEffect, useState } from "react";
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

  const isLogin = pathname === "/login";

  const [showSplash, setShowSplash] = useState(false);
  const [splashChecked, setSplashChecked] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const splashPlayed = sessionStorage.getItem("splashPlayed") === "true";

    if (!splashPlayed) {
      // Fresh login — splash hasn't played yet this session
      setShowSplash(true);
    }

    setSplashChecked(true);
  }, [userId]);

  function handleSplashDone() {
    sessionStorage.setItem("splashPlayed", "true");
    setShowSplash(false);
  }

  // Wait until we know if splash is needed before rendering anything
  if (loading && !isLogin) return null;
  if (userId && !splashChecked && !isLogin) return null;

  if (showSplash) {
    return <SplashScreen onDone={handleSplashDone} />;
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
