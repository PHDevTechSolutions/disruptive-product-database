"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SplashScreen } from "@/components/splash-screen";
import { useUser } from "@/contexts/UserContext";
import Image from "next/image";

export default function LoginPage() {
  const { userId } = useUser();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);

  // If already logged in on page load, go straight to dashboard
  useEffect(() => {
    if (userId && !showSplash) {
      router.replace("/dashboard");
    }
  }, [userId, showSplash, router]);

  // Called by LoginForm after successful login
  function handleLoginSuccess() {
    setShowSplash(true);
  }

  if (showSplash) {
    return <SplashScreen onDone={() => router.replace("/dashboard")} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">

      {/* CENTER MAIN CARD */}
      <div className="w-full max-w-5xl bg-white shadow-2xl rounded-xl border overflow-hidden">

        {/* INNER GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* LEFT CARD (LOGIN FORM) */}
          <div className="bg-white p-8 flex flex-col justify-center gap-6 border-b lg:border-b-0 lg:border-r border-gray-200">

            <div className="flex items-center gap-3 mb-8">
              <div className="relative w-24 h-24">
                <Image
                  src="/images/disruptive-logo.png"
                  alt="Disruptive Solutions"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-semibold text-red-600 text-lg">
                Disruptive Solutions Inc.
              </span>
            </div>

            <LoginForm onLoginSuccess={handleLoginSuccess} />

          </div>

          {/* RIGHT CARD (IMAGE) - hidden on mobile */}
          <div className="relative hidden lg:block min-h-[500px] w-full">
            <Image
              src="/images/login-wallpaper-3.png"
              alt="Login Wallpaper"
              fill
              className="object-cover"
              priority
            />
          </div>

        </div>
      </div>
    </div>
  );
}
