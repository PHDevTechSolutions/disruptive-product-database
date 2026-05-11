"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import { useNotificationTriggers } from "@/hooks/use-notification-triggers";
import { NotificationPayload } from "@/types/notifications";

interface BroadcastNotificationContextType {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
}

const BroadcastNotificationContext = createContext<BroadcastNotificationContextType | undefined>(undefined);

interface BroadcastNotificationProviderProps {
  children: ReactNode;
}

export function BroadcastNotificationProvider({ children }: BroadcastNotificationProviderProps) {
  const { userId } = useUser();
  const { settings } = useNotificationSettings();
  const { startListening: startListeningFn, stopListening: stopListeningFn } = useNotificationTriggers();
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!userId || isListening) return;

    console.log("Starting broadcast notification listener for user:", userId);
    
    startListeningFn(
      (payload: NotificationPayload) => {
        console.log("Received broadcast notification:", payload);
        // Additional logic can be added here if needed
      },
      {
        soundEnabled: settings?.soundEnabled ?? true,
        vibrationEnabled: settings?.vibrationEnabled ?? true,
      }
    );
    
    setIsListening(true);
  };

  const stopListening = () => {
    if (!isListening) return;

    console.log("Stopping broadcast notification listener");
    stopListeningFn();
    setIsListening(false);
  };

  // Auto-start listening when user is available and notifications are enabled
  useEffect(() => {
    if (userId && settings?.spfNotifications !== false) {
      startListening();
    }

    return () => {
      stopListening();
    };
  }, [userId, settings?.spfNotifications]);

  // Store userId in localStorage for cross-tab synchronization
  useEffect(() => {
    if (userId) {
      localStorage.setItem("userId", userId);
    }
  }, [userId]);

  const value = {
    isListening,
    startListening,
    stopListening,
  };

  return (
    <BroadcastNotificationContext.Provider value={value}>
      {children}
    </BroadcastNotificationContext.Provider>
  );
}

export function useBroadcastNotification() {
  const context = useContext(BroadcastNotificationContext);
  if (context === undefined) {
    throw new Error("useBroadcastNotification must be used within a BroadcastNotificationProvider");
  }
  return context;
}
