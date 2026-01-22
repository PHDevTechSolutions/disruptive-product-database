"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { useUser } from "@/contexts/UserContext";
import Image from "next/image";

export default function LoginPage() {
  const { userId } = useUser();
  const router = useRouter();

  // ✅ ADD ONLY THIS LOGIC
  useEffect(() => {
    if (userId) {
      router.replace("/dashboard");
    }
  }, [userId, router]);

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            href="#"
            className="flex items-center gap-2 font-medium"
            style={{ color: "#ea1102" }}
          >
            <div className="relative size-10">
              <Image
                src="/disruptive-logo.png"
                alt="Disruptive Solutions Inc."
                fill
                className="object-contain"
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

      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/login-wallpaper-3.png"
          alt="Image"
          fill
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          priority
        />
      </div>
    </div>
  );
}
