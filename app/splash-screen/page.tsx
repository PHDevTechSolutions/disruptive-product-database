"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashScreen() {
  const router = useRouter();

  const messages = [
    "Loading dashboard...",
    "Fetching user data...",
    "Preparing sidebar...",
    "Almost ready...",
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  /* rotate messages */
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) =>
        prev + 1 < messages.length ? prev + 1 : prev
      );
    }, 800);

    return () => clearInterval(interval);
  }, []);

  /* redirect to dashboard */
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/dashboard");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-[100svh] w-full flex-col items-center justify-center">

      {/* spinner */}
      <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-red-500 border-t-transparent" />

      {/* main text */}
      <h1 className="text-xl font-semibold">
        Please wait
      </h1>

      {/* changing message */}
      <p className="mt-2 text-sm text-muted-foreground">
        {messages[messageIndex]}
      </p>

    </div>
  );
}