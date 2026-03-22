"use client";

import { useUser } from "@/contexts/UserContext";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarBottom } from "@/components/sidebar-bottom";
import { usePathname } from "next/navigation";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, loading, splashDone } = useUser();
  const pathname = usePathname();

  const isLogin = pathname === "/login";

  // While loading auth state, don't render anything (except on login page)
  if (loading && !isLogin) return null;

  return (
    <div className="relative flex min-h-[100svh] w-full">
      {/* Show sidebars only after splash is done and user is logged in */}
      {userId && splashDone && (
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
