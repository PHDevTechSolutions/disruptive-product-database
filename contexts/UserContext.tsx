"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type UserContextType = {
  userId: string | null;
  setUserId: (id: string | null) => void;
  loading: boolean;
  splashDone: boolean;
  setSplashDone: (done: boolean) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // sessionStorage: persists across page refreshes within the same tab,
  // but resets when the tab is closed (so splash shows again on fresh session)
  const [splashDone, setSplashDoneState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("splashDone") === "true";
    }
    return false;
  });

  function setSplashDone(done: boolean) {
    if (typeof window !== "undefined") {
      if (done) {
        sessionStorage.setItem("splashDone", "true");
      } else {
        sessionStorage.removeItem("splashDone");
      }
    }
    setSplashDoneState(done);
  }

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.userId) {
          setUserId(data.userId);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <UserContext.Provider value={{ userId, setUserId, loading, splashDone, setSplashDone }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
