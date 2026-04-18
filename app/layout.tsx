import type { Metadata, Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";

import { UserProvider } from "@/contexts/UserContext";
import { WallpaperProvider } from "@/contexts/WallpaperContext";
import { RoleAccessProvider } from "@/contexts/RoleAccessContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { Toaster } from "sonner";

import { SidebarProvider } from "@/components/ui/sidebar";
import LayoutShell from "@/components/layout-shell";
import { ThemeBody } from "@/components/theme-body";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { NotificationBanner } from "@/components/notification-banner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export const metadata: Metadata = {
  title: "Espiron | Product Database",
  description: "Product Database and Supplier Management System with SPF Request tracking",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/espiron-logo.svg", type: "image/svg+xml" },
      { url: "/disruptive-logo.png", sizes: "192x192", type: "image/png" },
      { url: "/disruptive-logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/disruptive-logo.png", sizes: "192x192", type: "image/png" },
    ],
  },
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
              <NotificationProvider>
                <WallpaperProvider>
                  <SidebarProvider>
                    <LayoutShell>{children}</LayoutShell>
                  </SidebarProvider>
                  <ServiceWorkerRegistration />
                  <PWAInstallPrompt />
                <Toaster
                  position="top-right"
                  closeButton
                  toastOptions={{
                    className:
                      "bg-background border border-border text-foreground shadow-lg rounded-lg",
                  }}
                />
              </WallpaperProvider>
              </NotificationProvider>
            </RoleAccessProvider>
          </UserProvider>
        </ThemeBody>
      </ThemeProvider>
    </html>
  );
}
