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
    <div className="flex items-center justify-center min-h-screen comic-bg-dots p-4">
      {/* Floating decorations */}
      <div className="fixed top-20 left-10 text-6xl comic-animate-float" style={{ animationDelay: '0s' }}>⭐</div>
      <div className="fixed top-40 right-20 text-5xl comic-animate-float" style={{ animationDelay: '1s' }}>🚀</div>
      <div className="fixed bottom-32 left-20 text-5xl comic-animate-float" style={{ animationDelay: '2s' }}>💡</div>
      <div className="fixed bottom-20 right-10 text-6xl comic-animate-float" style={{ animationDelay: '0.5s' }}>⚡</div>

      {/* CENTER MAIN CARD - Comic Style */}
      <div className="w-full max-w-5xl comic-card comic-shadow-box overflow-hidden comic-animate-pop relative z-10">

        {/* Comic style header */}
        <div className="bg-gradient-to-r from-yellow-300 via-orange-400 to-red-400 h-4 w-full"></div>

        {/* INNER GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2">

          {/* LEFT CARD (LOGIN FORM) */}
          <div className="bg-white p-8 flex flex-col justify-center gap-6">

            <div className="flex items-center gap-4 mb-6 comic-animate-bounce">
              <div className="relative w-28 h-28 comic-card-primary p-2 flex items-center justify-center">
                <Image
                  src="/images/disruptive-logo.png"
                  alt="Disruptive Solutions"
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-comic-title text-2xl text-red-500 comic-text-outline">
                  ESPIRON
                </span>
                <span className="font-comic text-sm text-gray-600">
                  Product Database
                </span>
              </div>
            </div>

            {/* Comic speech bubble welcome */}
            <div className="comic-bubble comic-bubble-yellow mb-4 comic-animate-pop">
              <p className="font-comic text-lg text-center font-bold text-gray-800">
                👋 Welcome back, hero! Ready to explore?
              </p>
            </div>

            <LoginForm onLoginSuccess={handleLoginSuccess} />

          </div>

          {/* RIGHT CARD (COMIC STYLE) - hidden on mobile */}
          <div className="relative hidden lg:block min-h-[500px] w-full bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
            <div className="absolute inset-0 comic-bg-stripes opacity-30"></div>
            <Image
              src="/images/login-wallpaper-3.png"
              alt="Login Wallpaper"
              fill
              className="object-cover"
              priority
            />
            {/* Comic style overlay elements */}
            <div className="absolute top-4 right-4 comic-badge bg-yellow-400 text-black px-4 py-2 text-lg">
              FUN ZONE! 🎉
            </div>
            <div className="absolute bottom-4 left-4 comic-card-blue p-4 max-w-xs">
              <p className="font-comic text-white text-center">
                Discover amazing products! 🚀
              </p>
            </div>
          </div>

        </div>

        {/* Comic style footer */}
        <div className="bg-gradient-to-r from-red-400 via-orange-400 to-yellow-300 h-4 w-full"></div>
      </div>
    </div>
  );
}
