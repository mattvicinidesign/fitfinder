"use client";

import { useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 900;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Flip true after mount (optionally delayed) to drive CSS fill transitions. */
export function useRevealOnMount(delayMs = 0, disabled = false): boolean {
  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(reducedMotion || disabled);

  useEffect(() => {
    if (reducedMotion || disabled) {
      setRevealed(true);
      return;
    }

    setRevealed(false);
    const timeout = window.setTimeout(() => {
      requestAnimationFrame(() => setRevealed(true));
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, reducedMotion, disabled]);

  return revealed;
}

/** Count up from 0 to target on first load. */
export function useAnimatedNumber(
  target: number,
  options?: { duration?: number; delay?: number; disabled?: boolean },
): number {
  const duration = options?.duration ?? DEFAULT_DURATION_MS;
  const delay = options?.delay ?? 0;
  const disabled = options?.disabled ?? false;
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(
    reducedMotion || disabled ? target : 0,
  );

  useEffect(() => {
    if (reducedMotion || disabled) {
      setValue(target);
      return;
    }

    setValue(0);
    let startTime: number | null = null;
    let raf = 0;
    let timeout = 0;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      setValue(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };

    timeout = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, reducedMotion, disabled]);

  return value;
}

/** Format a 0–10 animated value for display (matches categoryScoreOutOfTen). */
export function formatScoreOnTen(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export const SCORE_BAR_REVEAL_CLASS =
  "transition-[width] duration-[900ms] ease-out";

export const SCORE_RING_REVEAL_CLASS =
  "transition-[stroke-dashoffset] duration-[1000ms] ease-out";
