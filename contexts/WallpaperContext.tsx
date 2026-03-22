"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY     = "app_wallpaper_b64";
const OPACITY_KEY     = "app_wallpaper_opacity";
const DEFAULT_OPACITY = 0.15; // subtle by default

type WallpaperContextType = {
  wallpaper: string | null;
  opacity: number;
  setWallpaper: (b64: string | null) => void;
  setOpacity: (value: number) => void;
};

const WallpaperContext = createContext<WallpaperContextType>({
  wallpaper: null,
  opacity: DEFAULT_OPACITY,
  setWallpaper: () => {},
  setOpacity: () => {},
});

export function WallpaperProvider({ children }: { children: React.ReactNode }) {
  const [wallpaper, setWallpaperState] = useState<string | null>(null);
  const [opacity, setOpacityState]     = useState<number>(DEFAULT_OPACITY);

  useEffect(() => {
    try {
      const savedWall = localStorage.getItem(STORAGE_KEY);
      if (savedWall) setWallpaperState(savedWall);

      const savedOpacity = localStorage.getItem(OPACITY_KEY);
      if (savedOpacity !== null) setOpacityState(parseFloat(savedOpacity));
    } catch {}
  }, []);

  const setWallpaper = (b64: string | null) => {
    setWallpaperState(b64);
    try {
      if (b64) localStorage.setItem(STORAGE_KEY, b64);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const setOpacity = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setOpacityState(clamped);
    try {
      localStorage.setItem(OPACITY_KEY, clamped.toString());
    } catch {}
  };

  return (
    <WallpaperContext.Provider value={{ wallpaper, opacity, setWallpaper, setOpacity }}>
      {children}
    </WallpaperContext.Provider>
  );
}

export const useWallpaper = () => useContext(WallpaperContext);
