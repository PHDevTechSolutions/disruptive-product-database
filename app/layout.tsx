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
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { PushNotificationProvider } from "@/contexts/PushNotificationContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#dc2626",
};

export const metadata: Metadata = {
  title: "Espiron | Product Database",
  description: "Product Database and SPF Request Management System by Disruptive Solutions",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/espiron-logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/images/disruptive-logo.png", sizes: "192x192" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Espiron",
  },
  applicationName: "Espiron Product Database",
  other: {
    "mobile-web-app-capable": "yes",
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#dc2626" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Espiron" />
        <link rel="apple-touch-icon" href="/images/disruptive-logo.png" />
      </head>
      <ThemeProvider>
        <ThemeBody>
          <UserProvider>
            <RoleAccessProvider>
              <WallpaperProvider>
                <PushNotificationProvider>
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
              
              {/* PWA Service Worker Registration */}
              <ServiceWorkerRegistration 
                firebaseConfig={{
                  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
                  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
                  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
                  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
                  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
                  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
                  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
                }}
              />
                </PushNotificationProvider>
            </WallpaperProvider>
          </RoleAccessProvider>
          </UserProvider>
        </ThemeBody>
      </ThemeProvider>
    </html>
  );
}
