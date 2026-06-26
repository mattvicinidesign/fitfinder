import {
  clearAuthDeepLinkPending,
  clearOnboardingState,
  markReturningUserState,
  QA_RETURNING_SPLASH_KEY,
  SIGNUP_LAUNCH_KEY,
} from "@/lib/app-session";
import { clearAllAtsKeywordOptimizations } from "@/lib/resume-review-ats-optimization";
import { resetAppFirstLaunch } from "@/lib/reset-first-launch";

export {
  SPLASH_STORAGE_KEY as SPLASH_SESSION_KEY,
  WELCOME_STORAGE_KEY as WELCOME_SESSION_KEY,
} from "@/lib/app-session";

/** Set before reload — blocks auto markLaunchFlowComplete until splash finishes. */
export const QA_LAUNCH_SIMULATION_KEY = "fitfinder-qa-launch-simulation";

const FITFINDER_STORAGE_PREFIX = "fitfinder";
const ATS_CACHE_VERSION_KEY = "fitfinder:ats-optimization-cache-version";

/**
 * Splash QA panel (simulate first launch, returning user, replay splash).
 * - Web (Vercel + local dev): on by default (see next.config.ts)
 * - iOS Capacitor build: off unless NEXT_PUBLIC_ENABLE_SPLASH_QA=true at cap:sync
 */
export function isSplashQaEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.NEXT_PUBLIC_ENABLE_SPLASH_QA === "true";
}

export function isQaLaunchSimulationPending(): boolean {
  return getQaLaunchSimulationMode() !== null;
}

export function getQaLaunchSimulationMode(): "first" | "returning" | null {
  const mode =
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(QA_LAUNCH_SIMULATION_KEY)
      : null) ??
    (typeof localStorage !== "undefined"
      ? localStorage.getItem(QA_LAUNCH_SIMULATION_KEY)
      : null);
  if (mode === "first" || mode === "returning") return mode;
  return null;
}

function setQaLaunchSimulationMode(mode: "first" | "returning"): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(QA_LAUNCH_SIMULATION_KEY, mode);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(QA_LAUNCH_SIMULATION_KEY, mode);
  }
}

export function clearQaLaunchSimulation(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(QA_LAUNCH_SIMULATION_KEY);
    sessionStorage.removeItem(QA_RETURNING_SPLASH_KEY);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(QA_LAUNCH_SIMULATION_KEY);
  }
}

function qaHardReload(): void {
  if (typeof window === "undefined") return;
  window.location.reload();
}

function clearFitFinderSessionStorage(): void {
  if (typeof sessionStorage === "undefined") return;
  clearAllAtsKeywordOptimizations();
  sessionStorage.removeItem(ATS_CACHE_VERSION_KEY);
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (key?.startsWith(FITFINDER_STORAGE_PREFIX)) {
      sessionStorage.removeItem(key);
    }
  }
}

/** Clear volatile session caches and reload (dev QA — keeps localStorage auth / onboarding). */
export function hardRefreshFromQa(): void {
  console.log("QA: Hard refresh");
  clearQaLaunchSimulation();
  clearFitFinderSessionStorage();
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("_qaRefresh");
  url.searchParams.set("_qaRefresh", String(Date.now()));
  window.location.replace(`${url.pathname}${url.search}${url.hash}`);
}

export function stripQaHardRefreshParam(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("_qaRefresh")) return;
  url.searchParams.delete("_qaRefresh");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", next || "/");
}

export function simulateFirstLaunch(): void {
  console.log("QA: First Launch Simulation");
  clearOnboardingState();
  clearQaLaunchSimulation();
  setQaLaunchSimulationMode("first");
  qaHardReload();
}

export function simulateReturningUser(): void {
  console.log("QA: Returning User Simulation");
  markReturningUserState();
  clearAuthDeepLinkPending();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SIGNUP_LAUNCH_KEY);
  }
  clearQaLaunchSimulation();
  setQaLaunchSimulationMode("returning");
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(QA_RETURNING_SPLASH_KEY, "true");
  }
  qaHardReload();
}

/** Full reset: storage, sign-out, splash replay (web + native when QA is on). */
export function resetFirstLaunchFromQa(): void {
  console.log("QA: Reset first launch");
  void resetAppFirstLaunch();
}
