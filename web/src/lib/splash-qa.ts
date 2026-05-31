import {
  clearOnboardingState,
  markReturningUserState,
  QA_RETURNING_SPLASH_KEY,
} from "@/lib/app-session";

export {
  SPLASH_STORAGE_KEY as SPLASH_SESSION_KEY,
  WELCOME_STORAGE_KEY as WELCOME_SESSION_KEY,
} from "@/lib/app-session";

/** True in local/dev builds only — never enabled in production. */
export function isSplashQaEnabled(): boolean {
  return process.env.NODE_ENV === "development";
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
