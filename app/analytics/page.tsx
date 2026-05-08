"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper } from "@/contexts/WallpaperContext";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { BarChart3, HardHat, AlertTriangle } from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();
  const { userId } = useUser();
  const { theme } = useTheme();
  const { wallpaper } = useWallpaper();
  const isComic = theme === "comic";
  const isEngineer = theme === "engineer";

  /* ── Auth guard ── */
  React.useEffect(() => {
    if (userId === null) return;
    if (!userId) {
      window.location.href = "/login";
    }
  }, [userId]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* ── HEADER ── */}
      <div
        className={`px-4 md:px-6 pt-4 md:pt-6 pb-3 shrink-0 bg-white ${
          isComic
            ? "border-b-4 border-gray-800"
            : "border-b border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <BarChart3
              className={`h-6 w-6 ${isComic ? "text-red-500" : "text-red-600"}`}
            />
            <h1
              className={`text-xl md:text-2xl text-gray-900 ${
                isComic
                  ? "font-comic-title comic-text-shadow"
                  : "font-formal-title"
              }`}
            >
              Analytics
            </h1>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className={`flex-1 overflow-auto p-4 md:p-6 ${
        isEngineer && !wallpaper ? "engineer-blueprint-bg" : ""
      }`}>
        <div className="flex flex-col items-center justify-center h-full">
          {/* Icons Container */}
          <div className="flex items-center justify-center gap-8 mb-8">
            {/* Hard Hat Icon */}
            <div className={`p-6 rounded-full ${
              isComic 
                ? "bg-yellow-100 border-4 border-gray-800 comic-animate-bounce" 
                : isEngineer 
                ? "bg-orange-100 border-4 border-gray-800 engineer-steel-beam"
                : "bg-gray-100 border-2 border-gray-300"
            }`}>
              <HardHat className={`h-16 w-16 ${
                isComic 
                  ? "text-yellow-600" 
                  : isEngineer 
                  ? "text-orange-600" 
                  : "text-gray-600"
              }`} />
            </div>

            {/* Caution Symbol */}
            <div className={`p-6 rounded-full ${
              isComic 
                ? "bg-red-100 border-4 border-gray-800 comic-animate-pulse" 
                : isEngineer 
                ? "bg-red-100 border-4 border-gray-800 engineer-steel-beam"
                : "bg-gray-100 border-2 border-gray-300"
            }`}>
              <AlertTriangle className={`h-16 w-16 ${
                isComic 
                  ? "text-red-600" 
                  : isEngineer 
                  ? "text-red-600" 
                  : "text-gray-600"
              }`} />
            </div>
          </div>

          {/* COMING SOON Text */}
          <h2 className={`text-4xl md:text-6xl font-bold mb-4 ${
            isComic 
              ? "font-comic-title text-red-500 comic-text-outline comic-animate-bounce" 
              : isEngineer 
              ? "font-engineer-title text-orange-600 engineer-text-shadow"
              : "font-formal-title text-gray-700"
          }`}>
            COMING SOON
          </h2>

          {/* Description */}
          <p className={`text-lg md:text-xl text-center max-w-md ${
            isComic 
              ? "font-comic text-gray-700" 
              : isEngineer 
              ? "font-engineer text-gray-600"
              : "font-formal text-gray-600"
          }`}>
            {isEngineer 
              ? "🔧 Under construction! Our analytics dashboard is being built with precision engineering."
              : isComic 
              ? "🚀 Exciting analytics features are in development! Get ready for data-powered insights!"
              : "Our analytics dashboard is currently under development. Check back soon for powerful insights and reports."
            }
          </p>

          {/* Additional Engineering-themed elements for engineer theme */}
          {isEngineer && (
            <div className="mt-8 flex items-center gap-4 text-sm text-gray-500 font-engineer">
              <span>⚙️</span>
              <span>BUILDING IN PROGRESS</span>
              <span>⚙️</span>
            </div>
          )}

          {/* Comic-themed elements for comic theme */}
          {isComic && (
            <div className="mt-8 flex items-center gap-4 text-sm text-gray-600 font-comic">
              <span>💪</span>
              <span>WORK IN PROGRESS!</span>
              <span>💪</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
