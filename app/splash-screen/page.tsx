"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

const slides = [
  "Getting things ready...",
  "Starting up...",
  "Loading products...",
  "Bringing everything in...",
  "Setting things up...",
  "Almost there...",
  "Making sure it's all good...",
  "Finishing up...",
  "Just a moment...",
  "All set.",
];

export function SplashScreen() {
  const router = useRouter();
  const { setSplashDone } = useUser();
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          startClose();
          return 100;
        }
        return prev + 1;
      });
    }, 25);

    return () => clearInterval(interval);
  }, []);

  function startClose() {
    setClosing(true);
    setTimeout(() => {
      setSplashDone(true);
      router.replace("/dashboard");
    }, 800);
  }

  function handleClick() {
    setMessageIndex((prev) => (prev + 1 >= slides.length ? 0 : prev + 1));
  }

  return (
    <div
      onClick={handleClick}
      className={`splash-clean ${closing ? "closing" : ""}`}
    >
      <Image
        src="/images/disruptive-logo.png"
        alt="logo"
        width={140}
        height={140}
        className="splash-logo-img"
        priority
      />

      <h1 className="splash-clean-title">Product Database</h1>

      <p className="splash-clean-status">{slides[messageIndex]}</p>

      <div className="splash-clean-progress-wrapper">
        <div
          className="splash-clean-progress"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="splash-clean-percent">{progress}%</p>
    </div>
  );
}
