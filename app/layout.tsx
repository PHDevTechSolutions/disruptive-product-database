import type { Metadata } from "next";
import { Oxanium } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "sonner";

const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-oxanium",
});

export const metadata: Metadata = {
  title: "Inventory Management System",
  description: "Aaron Espiritu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${oxanium.variable} antialiased`}>
        <UserProvider>
          {children}
        <Toaster
          position="top-right"
          richColors={false}
          closeButton
          toastOptions={{
            className:
              "bg-background border border-border text-foreground shadow-lg rounded-lg",
          }}
        />
        </UserProvider>
      </body>
    </html>
  );
}
