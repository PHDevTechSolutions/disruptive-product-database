"use client";

import React, { Suspense } from "react";
import ProfileClient from "@/components/profile-update";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarBottom } from "@/components/sidebar-bottom";

export default function ProfilePage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">

        {/* DESKTOP SIDEBAR */}
        <div className="hidden md:block">
          <SidebarLeft />
        </div>

        {/* MOBILE BOTTOM SIDEBAR */}
        <SidebarBottom />

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 space-y-4">
          {/* DESKTOP TOGGLE */}
          <SidebarTrigger className="hidden md:flex" />

          <Suspense fallback={<div>Loading profile...</div>}>
            <ProfileClient />
          </Suspense>
        </main>

      </div>
    </SidebarProvider>
  );
}
