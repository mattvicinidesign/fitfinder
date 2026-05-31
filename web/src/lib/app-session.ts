export const SPLASH_STORAGE_KEY = "fitfinder-splash-seen";
export const WELCOME_STORAGE_KEY = "fitfinder-welcome-seen";
export const APP_SESSION_ACTIVE_KEY = "fitfinder-app-session-active";
export const LAST_ROUTE_KEY = "fitfinder-last-route";
export const QA_RETURNING_SPLASH_KEY = "fitfinder-qa-returning-splash";
export const DEFAULT_APP_ROUTE = "/home";

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

export function clearOnboardingState(): void {
  if (canUseLocalStorage()) {
    localStorage.removeItem(SPLASH_STORAGE_KEY);
    localStorage.removeItem(WELCOME_STORAGE_KEY);
  }
  clearAppSessionActive();
}

export function markReturningUserState(): void {
  markSplashComplete();
  markWelcomeComplete();
  clearAppSessionActive();
}
