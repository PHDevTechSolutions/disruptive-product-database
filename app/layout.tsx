import type { Metadata } from "next";
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
import { NotificationBanner } from "@/components/notification-banner";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "Espiron | Product Database",
  description: "Product and Supplier Database with Push Notifications",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/espiron-logo.svg", type: "image/svg+xml" },
      { url: "/disruptive-logo.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/disruptive-logo.png", sizes: "192x192" },
    ],
  },
  themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Espiron",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <ThemeProvider>
        <ThemeBody>
          <UserProvider>
            <RoleAccessProvider>
              <WallpaperProvider>
                <SidebarProvider>
                  <LayoutShell>{children}</LayoutShell>
                </SidebarProvider>

              <Toaster
                position="top-right"
                closeButton
                toastOptions={{
                  className:
                    "bg-background border border-border text-foreground shadow-lg rounded-lg",
                }}
              />
              <NotificationBanner />
              <PWAInstallPrompt />
              <ServiceWorkerRegistration />
            </WallpaperProvider>
          </RoleAccessProvider>
          </UserProvider>
        </ThemeBody>
      </ThemeProvider>
    </html>
  );
}
