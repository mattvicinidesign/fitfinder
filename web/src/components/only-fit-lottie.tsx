"use client";

import type { ComponentType } from "react";
import type { LottieComponentProps } from "lottie-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ANIMATION_PATH = "/OFitSplashAnimation.json";

type LottiePlayer = ComponentType<LottieComponentProps>;

interface OnlyFitLottieProps {
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export function OnlyFitLottie({
  className,
  loop = false,
  autoplay = true,
}: OnlyFitLottieProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [LottiePlayer, setLottiePlayer] = useState<LottiePlayer | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(ANIMATION_PATH).then((response) => {
        if (!response.ok) throw new Error("Failed to load animation");
        return response.json();
      }),
      import("lottie-react").then((module) => module.default),
    ])
      .then(([data, Lottie]) => {
        if (cancelled) return;
        setAnimationData(data);
        setLottiePlayer(() => Lottie);
      })
      .catch(() => {
        /* hero area stays empty on failure */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!animationData || !LottiePlayer) {
    return <div className={cn("aspect-square", className)} aria-hidden />;
  }

  return (
    <LottiePlayer
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={cn("h-full w-full", className)}
    />
  );
}
