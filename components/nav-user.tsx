"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BadgeCheck, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { dbLogs } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

import { useUser } from "@/contexts/UserContext";

export function NavUser({
  user,
  userId,
}: {
  user: {
    name: string;
    position?: string;
    email: string;
    avatar: string;
  };
  userId: string;
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { setUserId } = useUser();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const logLogoutActivity = async () => {
    try {
      const deviceId = localStorage.getItem("deviceId") || "unknown-device";

      await addDoc(collection(dbLogs, "activity_logs"), {
        userId,
        email: user.email,
        status: "logout",
        timestamp: new Date().toISOString(),
        deviceId,
        location: null,
        browser: navigator.userAgent,
        os: navigator.platform,
        date_created: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to log logout activity:", error);
    }
  };

  const doLogout = async () => {
    setIsLoggingOut(true);

    try {
      logLogoutActivity().catch(console.error);
      await fetch("/api/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      localStorage.removeItem("userid");
      localStorage.removeItem("deviceId");
      setUserId(null);

      setIsLoggingOut(false);
      setIsDialogOpen(false);

      router.replace("/login");
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>

            {/* AVATAR ONLY TRIGGER */}
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="cursor-pointer p-0 bg-transparent hover:bg-transparent"
              >
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.charAt(0) ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            {/* DROPDOWN */}
            <DropdownMenuContent
              className="min-w-[224px] rounded-lg z-[9999]"
              side={isMobile ? "bottom" : "right"}
              align="start"
              sideOffset={4}
            >

              {/* NAME HERE ONLY */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5">

                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name?.charAt(0) ?? "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="grid flex-1 text-left text-sm leading-tight">

                    <span className="truncate font-medium capitalize">
                      {user.name}
                    </span>

                    {user.position && (
                      <span className="truncate text-xs text-muted-foreground">
                        {user.position}
                      </span>
                    )}

                  </div>

                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>

                <DropdownMenuItem asChild>

                  <Link href={`/profile?id=${encodeURIComponent(userId)}`}>
                    <div className="flex items-center gap-2 cursor-pointer">
                      <BadgeCheck className="size-4" />
                      <span>Account</span>
                    </div>
                  </Link>

                </DropdownMenuItem>

              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setIsDialogOpen(true)}
                className="cursor-pointer"
                disabled={isLoggingOut}
              >

                <LogOut className="size-4" />
                <span>Log out</span>

              </DropdownMenuItem>

            </DropdownMenuContent>

          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>

        <DialogContent>

          <DialogHeader>

            <DialogTitle>
              Confirm Logout
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to log out?
            </DialogDescription>

          </DialogHeader>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>

            <Button
              onClick={doLogout}
              disabled={isLoggingOut}
              className="ml-2"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>
    </>
  );
}