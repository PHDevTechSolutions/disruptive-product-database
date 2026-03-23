"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
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
  const { wallpaper, opacity } = useWallpaper();
  const pathname = usePathname();

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
      <div className="relative flex min-h-svh w-full">
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

        <main className="relative flex-1 overflow-y-auto overscroll-contain pb-[calc(144px+env(safe-area-inset-bottom))] md:pb-0">
          {/* Wallpaper layer — sits behind content, opacity-controlled */}
          {wallpaper && (
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500"
              style={{
                backgroundImage: `url(${wallpaper})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                opacity,
              }}
            />
          )}
          {/* Content sits above wallpaper */}
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
}
