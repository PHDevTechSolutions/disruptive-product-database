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
  const { userId, loading } = useUser();
  const pathname = usePathname();

  const isSplash = pathname === "/splash-screen";

  // ✅ allow splash screen while loading
  if (loading && !isSplash) return null;

  return (
    <div className="relative flex min-h-[100svh] w-full">
      {userId && !isSplash && (
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