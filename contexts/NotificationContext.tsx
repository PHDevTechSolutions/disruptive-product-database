"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/utils/supabase";
import { useUser } from "@/contexts/UserContext";

interface NotificationContextValue {
  unreadCount: number;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  clearNotifications: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  /* Track the row count we've already "seen" so we only count net-new changes */
  const seenCountRef = useRef<number | null>(null);
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ── Seed the baseline count once on mount ── */
  useEffect(() => {
    if (!userId) return;

    supabase
      .from("spf_request")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => {
        if (count !== null && seenCountRef.current === null) {
          seenCountRef.current = count;
        }
      });
  }, [userId]);

  /* ── Subscribe to Realtime changes on spf_request ── */
  useEffect(() => {
    if (!userId) return;

    /* Clean up any previous channel */
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel("spf_request_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spf_request" },
        () => {
          /* Any INSERT / UPDATE / DELETE increments the badge */
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  /* ── Called when user visits /requests ── */
  const clearNotifications = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
