import {
  clearOnboardingState,
  markReturningUserState,
  QA_RETURNING_SPLASH_KEY,
} from "@/lib/app-session";
import { resetAppFirstLaunch } from "@/lib/reset-first-launch";

export {
  SPLASH_STORAGE_KEY as SPLASH_SESSION_KEY,
  WELCOME_STORAGE_KEY as WELCOME_SESSION_KEY,
} from "@/lib/app-session";

/**
 * Splash QA panel (simulate first launch, returning user, replay splash).
 * - Web (Vercel + local dev): on by default (see next.config.ts)
 * - iOS Capacitor build: off unless NEXT_PUBLIC_ENABLE_SPLASH_QA=true at cap:sync
 */
export function isSplashQaEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_ENABLE_SPLASH_QA === "true";
}

export function simulateFirstLaunch(): void {
  console.log("QA: First Launch Simulation");
  clearOnboardingState();
  window.location.reload();
}

export function simulateReturningUser(): void {
  console.log("QA: Returning User Simulation");
  markReturningUserState();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(QA_RETURNING_SPLASH_KEY, "true");
  }
  window.location.reload();
}

/** Full reset: storage, sign-out, splash replay (web + native when QA is on). */
export function resetFirstLaunchFromQa(): void {
  console.log("QA: Reset first launch");
  void resetAppFirstLaunch();
}
