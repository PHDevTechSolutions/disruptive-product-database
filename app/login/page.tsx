"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { useUser } from "@/contexts/UserContext";
import Image from "next/image";

export default function LoginPage() {
  const { userId } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (userId) {
      router.replace("/dashboard");
    }
  }, [userId, router]);

  return (
    <div className="relative min-h-svh">
      {/* 🔴 BACKGROUND WALLPAPER (SMALL SCREENS) */}
      <div className="absolute inset-0 lg:hidden">
        <Image
          src="/login-wallpaper-3.png"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative grid min-h-svh lg:grid-cols-2">
        {/* LEFT / LOGIN */}
        <div className="flex flex-col gap-4 p-6 md:p-8">
          <div className="flex justify-center gap-2 md:justify-start">
            <a
              href="#"
              className="flex items-center gap-2 font-medium
                         text-white lg:text-red-600"
            >
              <div className="relative size-10">
                <Image
                  src="/disruptive-logo.png"
                  alt="Disruptive Solutions Inc."
                  fill
                  className="
                    object-contain
                    brightness-0 invert
                    lg:brightness-100 lg:invert-0
                  "
                  priority
                />
              </div>
              Disruptive Solutions Inc.
            </a>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <LoginForm />
            </div>
          </div>
        </div>

        {/* 🟢 RIGHT WALLPAPER (DESKTOP ONLY) */}
        <div className="relative hidden lg:block">
          <Image
            src="/login-wallpaper-3.png"
            alt="Image"
            fill
            className="object-cover dark:brightness-[0.2] dark:grayscale"
            priority
          />
        </div>
      </div>
    </div>
  );
}
