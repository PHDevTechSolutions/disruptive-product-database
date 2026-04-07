"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollaborationHubDialog } from "./collaboration-hub-dialog";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

interface CollaborationHubRowTriggerProps {
  requestId: string;
  spfNumber: string;
  status?: string;
  collectionName?: string;
  title?: string;
  variant?: "icon" | "button";
  className?: string;
}

export function CollaborationHubRowTrigger({
  requestId,
  spfNumber,
  status = "PENDING",
  collectionName = "spf_creations",
  title,
  variant = "icon",
  className,
}: CollaborationHubRowTriggerProps) {
  const [open, setOpen] = useState(false);
  const { userId } = useUser();
  const [userData, setUserData] = useState<{
    userName: string;
    profilePicture?: string;
    userRole: string;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setUserData({
            userName: `${data.Firstname || ""} ${data.Lastname || ""}`.trim(),
            profilePicture: data.ProfilePicture || "",
            userRole: data.Role || "User",
          });
        }
      } catch (e) {
        console.error("Failed to fetch user:", e);
      }
    };

    fetchUser();
  }, [userId]);

  const handleOpen = () => {
    setOpen(true);
  };

  if (variant === "button") {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          onClick={handleOpen}
          className={cn(
            "h-9 px-3 rounded-xl flex items-center gap-1.5 border-blue-200 hover:bg-blue-50 hover:border-blue-300",
            className
          )}
        >
          <MessageSquare size={14} className="text-blue-600" />
          <span className="text-xs font-medium">Chat</span>
        </Button>
        {userData && (
          <CollaborationHubDialog
            open={open}
            onOpenChange={setOpen}
            requestId={requestId}
            collectionName={collectionName}
            currentUserId={userId || ""}
            userName={userData.userName}
            profilePicture={userData.profilePicture}
            userRole={userData.userRole}
            status={status}
            title={title || spfNumber}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleOpen}
        className={cn(
          "h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors",
          className
        )}
        title="Open collaboration chat"
      >
        <MessageSquare size={16} />
      </Button>
      {userData && (
        <CollaborationHubDialog
          open={open}
          onOpenChange={setOpen}
          requestId={requestId}
          collectionName={collectionName}
          currentUserId={userId || ""}
          userName={userData.userName}
          profilePicture={userData.profilePicture}
          userRole={userData.userRole}
          status={status}
          title={title || spfNumber}
        />
      )}
    </>
  );
}
