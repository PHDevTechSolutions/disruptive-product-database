"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SplashScreen() {
  const router = useRouter();

  const slides = [
    "Initializing system...",
    "Loading product classifications...",
    "Preparing database...",
    "Finalizing setup...",
  ];

  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  /* AUTO LOAD */

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

  /* CLOSE */

  function startClose() {
    setClosing(true);

    setTimeout(() => {
      router.replace("/dashboard");
    }, 800);
  }

  /* CHANGE MESSAGE */

  function handleClick() {
    setMessageIndex((prev) =>
      prev + 1 >= slides.length ? 0 : prev + 1
    );
  }

  /* SKIP */

  function handleSkip(e: any) {
    e.stopPropagation();
    startClose();
  }

  return (
    <div
      onClick={handleClick}
      className={`splash-container ${closing ? "closing" : ""}`}
    >
      <div className="splash-center">

        <div className="splash-logo">
          <div className="splash-logo-circle" />
        </div>

        <h1 className="splash-title">
          Product Database
        </h1>

        <p className="splash-status">
          {slides[messageIndex]}
        </p>

        <p className="splash-percent">
          {progress}%
        </p>

      </div>

      <div className="splash-progress-wrapper">
        <div
          className="splash-progress"
          style={{ width: `${progress}%` }}
        />
      </div>

      <Button
        variant="ghost"
        className="splash-skip"
        onClick={handleSkip}
      >
        Skip →
      </Button>

    </div>
  );
}