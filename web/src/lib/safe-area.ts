/**
 * Safe-area padding utilities for viewport-fit=cover.
 * Use these instead of raw env() so spacing stays consistent on web and Capacitor.
 *
 * iOS uses contentInset: never — the WebView does not pre-inset content, so
 * env(safe-area-inset-*) is the single source of truth (no double top gap).
 */

/** Back-button / compact screen headers (Analyze, Report). */
export const safeTopCompact = "pt-[max(0.5rem,env(safe-area-inset-top))]";

/** Large-title list screens (Saved, History, Profile title). */
export const safeTopTitle = "pt-[max(0.75rem,env(safe-area-inset-top))]";

/** Launch overlays and hero headers (Welcome, Sign up, Home). */
export const safeTopHero = "pt-[max(1.5rem,env(safe-area-inset-top))]";

export const safeTopHomeHero = "pt-[max(2rem,env(safe-area-inset-top))]";

/** Sticky bottom CTAs and sheets. */
export const safeBottomCta = "pb-[max(0.75rem,env(safe-area-inset-bottom))]";

/** Tab bar — flush to home indicator when inset is zero. */
export const safeBottomTabBar = "pb-[max(0px,env(safe-area-inset-bottom))]";

export const safeBottomOverlay = "pb-[max(1.5rem,env(safe-area-inset-bottom))]";
