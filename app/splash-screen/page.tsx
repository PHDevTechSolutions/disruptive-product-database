"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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


  useEffect(() => {

    const interval = setInterval(() => {

      setProgress(prev => {

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

      router.replace("/dashboard");

    }, 800);

  }



  function handleClick() {

    setMessageIndex(prev =>

      prev + 1 >= slides.length ? 0 : prev + 1

    );

  }



  function handleSkip(e:any){

    e.stopPropagation();

    startClose();

  }



  return (

    <div

      onClick={handleClick}

      className={`splash-clean ${closing ? "closing" : ""}`}

    >



      {/* LOGO */}

      <Image
        src="/disruptive-logo.png"
        alt="logo"
        width={140}
        height={140}
        className="splash-logo-img"
        priority
      />



      {/* TITLE */}

      <h1 className="splash-clean-title">

        Product Database

      </h1>



      {/* STATUS */}

      <p className="splash-clean-status">

        {slides[messageIndex]}

      </p>



      {/* PROGRESS */}

      <div className="splash-clean-progress-wrapper">

        <div

          className="splash-clean-progress"

          style={{ width: `${progress}%` }}

        />

      </div>



      <p className="splash-clean-percent">

        {progress}%

      </p>



      {/* SKIP */}

      <Button

        variant="ghost"

        className="splash-clean-skip"

        onClick={handleSkip}

      >

        Skip →

      </Button>



    </div>

  );

}