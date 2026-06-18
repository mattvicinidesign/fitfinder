import { clearOnboardingProgress } from "@/lib/onboarding-progress";

export const SPLASH_STORAGE_KEY = "fitfinder-splash-seen";
export const WELCOME_STORAGE_KEY = "fitfinder-welcome-seen";
export const APP_SESSION_ACTIVE_KEY = "fitfinder-app-session-active";
export const LAST_ROUTE_KEY = "fitfinder-last-route";
export const QA_RETURNING_SPLASH_KEY = "fitfinder-qa-returning-splash";
export const SIGNUP_LAUNCH_KEY = "fitfinder-signup-launch";
export const AUTH_DEEP_LINK_KEY = "fitfinder-auth-deep-link";
export const SEARCH_TYPEWRITER_DONE_KEY = "fitfinder-home-search-typewriter-done";
export const DEFAULT_APP_ROUTE = "/home";

/** @deprecated Signup is in the launch overlay — use requestSignupFlow() instead. */
export const SIGNUP_PATH = "/home?signup=1";

/** @deprecated Use SPLASH_STORAGE_KEY — kept for existing imports. */
export const SPLASH_SESSION_KEY = SPLASH_STORAGE_KEY;

/** @deprecated Use WELCOME_STORAGE_KEY — kept for existing imports. */
export const WELCOME_SESSION_KEY = WELCOME_STORAGE_KEY;

function canUseLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function hasCompletedSplash(): boolean {
  if (!canUseLocalStorage()) return false;
  if (localStorage.getItem(SPLASH_STORAGE_KEY) === "true") return true;
  if (canUseSessionStorage() && sessionStorage.getItem(SPLASH_STORAGE_KEY) === "true") {
    localStorage.setItem(SPLASH_STORAGE_KEY, "true");
    sessionStorage.removeItem(SPLASH_STORAGE_KEY);
    return true;
  }
  return false;
}

export function hasCompletedWelcome(): boolean {
  if (!canUseLocalStorage()) return false;
  if (localStorage.getItem(WELCOME_STORAGE_KEY) === "true") return true;
  if (canUseSessionStorage() && sessionStorage.getItem(WELCOME_STORAGE_KEY) === "true") {
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
    sessionStorage.removeItem(WELCOME_STORAGE_KEY);
    return true;
  }
  return false;
}

export function markSplashComplete(): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(SPLASH_STORAGE_KEY, "true");
}

export function markWelcomeComplete(): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(WELCOME_STORAGE_KEY, "true");
}

export function markLaunchFlowComplete(): void {
  markSplashComplete();
  markWelcomeComplete();
}

export function isWarmAppSession(): boolean {
  if (!canUseSessionStorage()) return false;
  return sessionStorage.getItem(APP_SESSION_ACTIVE_KEY) === "true";
}

export function markAppSessionActive(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(APP_SESSION_ACTIVE_KEY, "true");
}

export function clearAppSessionActive(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(APP_SESSION_ACTIVE_KEY);
}

export function isColdAppStart(): boolean {
  return !isWarmAppSession();
}

export function saveLastRoute(pathname: string): void {
  if (!canUseSessionStorage() || !shouldPersistRoute(pathname)) return;
  sessionStorage.setItem(LAST_ROUTE_KEY, pathname);
}

export function getLastRoute(): string | null {
  if (!canUseSessionStorage()) return null;
  const route = sessionStorage.getItem(LAST_ROUTE_KEY);
  return route && shouldPersistRoute(route) ? route : null;
}

export function shouldPersistRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login" || pathname === "/preview") {
    return false;
  }
  if (pathname.startsWith("/auth/")) return false;
  return true;
}

/** Dev-only: allow direct route preview without trapping on welcome after splash. */
export function shouldSkipWelcomeForDevDeepLink(pathname: string): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    hasCompletedSplash() &&
    !hasCompletedWelcome() &&
    shouldPersistRoute(pathname) &&
    pathname !== DEFAULT_APP_ROUTE
  );
}

export function clearOnboardingState(): void {
  if (canUseLocalStorage()) {
    localStorage.removeItem(SPLASH_STORAGE_KEY);
    localStorage.removeItem(WELCOME_STORAGE_KEY);
  }
  clearOnboardingProgress();
  clearAppSessionActive();
}

export function markReturningUserState(): void {
  markSplashComplete();
  markWelcomeComplete();
  clearAppSessionActive();
}

export function requestSignupFlow(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(SIGNUP_LAUNCH_KEY, "true");
}

export function isSignupLaunchRequested(): boolean {
  if (!canUseSessionStorage()) return false;
  return sessionStorage.getItem(SIGNUP_LAUNCH_KEY) === "true";
}

export function consumeSignupLaunch(): boolean {
  if (!canUseSessionStorage()) return false;
  if (sessionStorage.getItem(SIGNUP_LAUNCH_KEY) !== "true") return false;
  sessionStorage.removeItem(SIGNUP_LAUNCH_KEY);
  return true;
}

/** Set before sending a magic link — skip launch splash when the link reopens the app. */
export function markAuthDeepLinkPending(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(AUTH_DEEP_LINK_KEY, "true");
}

export function isAuthDeepLinkPending(): boolean {
  if (!canUseSessionStorage()) return false;
  return sessionStorage.getItem(AUTH_DEEP_LINK_KEY) === "true";
}

export function clearAuthDeepLinkPending(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(AUTH_DEEP_LINK_KEY);
}

/** Cold session (first open / force quit) — play home search placeholder typewriter once. */
export function shouldPlaySearchReportsTypewriter(): boolean {
  if (!canUseSessionStorage()) return false;
  return sessionStorage.getItem(SEARCH_TYPEWRITER_DONE_KEY) !== "true";
}

export function markSearchReportsTypewriterDone(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(SEARCH_TYPEWRITER_DONE_KEY, "true");
}
