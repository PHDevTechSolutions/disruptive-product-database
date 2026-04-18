import type { Metadata, Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";

import { UserProvider } from "@/contexts/UserContext";
import { WallpaperProvider } from "@/contexts/WallpaperContext";
import { RoleAccessProvider } from "@/contexts/RoleAccessContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";

import { SidebarProvider } from "@/components/ui/sidebar";
import LayoutShell from "@/components/layout-shell";
import { ThemeBody } from "@/components/theme-body";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PWAPrompt } from "@/components/PWAPrompt";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: "Espiron | Product Database",
  description: "Disruptive Product Database & SPF Management System with real-time notifications and mobile support",
  applicationName: "Espiron",
  authors: [{ name: "Espiron Team" }],
  keywords: ["product database", "SPF", "inventory", "notifications", "PWA"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/espiron-logo.svg", type: "image/svg+xml" },
      { url: "/disruptive-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/disruptive-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/disruptive-logo.png", sizes: "152x152", type: "image/png" },
      { url: "/disruptive-logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [{ url: "/espiron-logo.svg", type: "image/svg+xml" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Espiron",
    startupImage: [
      { url: "/images/login-wallpaper.jpg" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Espiron",
    "msapplication-TileColor": "#000000",
    "msapplication-TileImage": "/disruptive-logo.png",
    "msapplication-config": "none",
    "msapplication-navbutton-color": "#000000",
    "msapplication-starturl": "/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Espiron" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="msapplication-TileImage" content="/disruptive-logo.png" />
        <meta name="msapplication-config" content="none" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        
        {/* Splash Screen Images for iOS */}
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
        <link rel="apple-touch-startup-image" href="/images/login-wallpaper.jpg" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <ThemeProvider>
        <ThemeBody>
          <UserProvider>
            <RoleAccessProvider>
              <WallpaperProvider>
                <SidebarProvider>
                  <LayoutShell>
                    {children}
                    <ServiceWorkerRegistration />
                    <PWAPrompt />
                  </LayoutShell>
                </SidebarProvider>

              <Toaster
                position="top-right"
                closeButton
                toastOptions={{
                  className:
                    "bg-background border border-border text-foreground shadow-lg rounded-lg",
                }}
              />
            </WallpaperProvider>
          </RoleAccessProvider>
          </UserProvider>
        </ThemeBody>
      </ThemeProvider>
    </html>
  );
}
