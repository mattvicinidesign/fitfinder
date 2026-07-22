"use client";

import type { ComponentType } from "react";
import type { LottieComponentProps } from "lottie-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LaunchOverlayFrame } from "@/components/launch-overlay-frame";
import { safeTopHero } from "@/lib/safe-area";
import { cn } from "@/lib/utils";

const ANIMATION_PATH = "/OFitSplashAnimation.json";
const WORDMARK_PATH = "/only-fit-wordmark.png";
/** Must match web/public/OFitSplashAnimation.json composition size. */
const LOTTIE_COMP_W = 126;
const LOTTIE_COMP_H = 178;
const LOTTIE_DISPLAY_W = 126;
const LOTTIE_DISPLAY_H = Math.round(
  LOTTIE_DISPLAY_W * (LOTTIE_COMP_H / LOTTIE_COMP_W),
);
const WORDMARK_FADE_MS = 700;
const PAUSE_MS = 500;
const EXIT_FADE_MS = 500;

type SplashPhase = "loading" | "playing" | "wordmark" | "exiting";
type LottiePlayer = ComponentType<LottieComponentProps>;

interface SplashScreenProps {
  onComplete: () => void;
  showWordmark?: boolean;
}

export function SplashScreen({
  onComplete,
  showWordmark = true,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<SplashPhase>("loading");
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [LottiePlayer, setLottiePlayer] = useState<LottiePlayer | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(ANIMATION_PATH).then((response) => {
        if (!response.ok) throw new Error("Failed to load splash animation");
        return response.json();
      }),
      import("lottie-react").then((module) => module.default),
    ])
      .then(([data, Lottie]) => {
        if (cancelled) return;
        setAnimationData(data);
        setLottiePlayer(() => Lottie);
        setPhase("playing");
      })
      .catch(() => {
        if (!cancelled) onCompleteRef.current();
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const finishSplash = useCallback(() => {
    setPhase("exiting");
    window.setTimeout(() => onCompleteRef.current(), EXIT_FADE_MS);
  }, []);

  const handleAnimationComplete = useCallback(() => {
    if (!showWordmark) {
      window.setTimeout(() => {
        finishSplash();
      }, PAUSE_MS);
      return;
    }

    setPhase("wordmark");

    window.setTimeout(() => {
      finishSplash();
    }, WORDMARK_FADE_MS + PAUSE_MS);
  }, [finishSplash, showWordmark]);

  const isExiting = phase === "exiting";
  const wordmarkVisible = showWordmark && phase === "wordmark";
  const exitTransition = {
    transitionProperty: "opacity",
    transitionDuration: `${EXIT_FADE_MS}ms`,
    transitionTimingFunction: "ease-out",
  } as const;

  return (
    <LaunchOverlayFrame
      className={cn("items-center justify-center", safeTopHero)}
      aria-hidden={isExiting}
    >
      <div className="flex flex-col items-center justify-center px-6">
        {/*
          Fade Lottie + wordmark with matching element-level opacity.
          Relying on LaunchOverlayFrame's parent opacity breaks on native
          WKWebView for the wordmark image (SVG fades; PNG sticks).
        */}
        <div
          className="splash-lottie-stage flex items-center justify-center overflow-visible"
          style={{
            width: LOTTIE_DISPLAY_W,
            height: LOTTIE_DISPLAY_H,
            opacity: isExiting ? 0 : 1,
            ...exitTransition,
          }}
        >
          {animationData && LottiePlayer ? (
            <LottiePlayer
              animationData={animationData}
              loop={false}
              autoplay
              onComplete={handleAnimationComplete}
              className="splash-lottie-player h-full w-full"
              rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
            />
          ) : null}
        </div>

        {showWordmark ? (
          // Plain img: next/image layers often ignore ancestor opacity in WKWebView.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={WORDMARK_PATH}
            alt="Only Fit"
            width={331}
            height={148}
            decoding="async"
            className="mt-2 h-auto w-[100px] max-w-[60vw] sm:w-[112px]"
            style={{
              opacity: isExiting || !wordmarkVisible ? 0 : 1,
              transform:
                isExiting || wordmarkVisible
                  ? "translateY(0px)"
                  : "translateY(8px)",
              transition: isExiting
                ? `opacity ${EXIT_FADE_MS}ms ease-out`
                : `opacity ${WORDMARK_FADE_MS}ms ease-out, transform ${WORDMARK_FADE_MS}ms ease-out`,
            }}
          />
        ) : null}
      </div>
    </LaunchOverlayFrame>
  );
}
