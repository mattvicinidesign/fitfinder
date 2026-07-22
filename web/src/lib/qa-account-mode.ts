import {
  DEFAULT_APP_ROUTE,
  markAppSessionActive,
  markLaunchFlowComplete,
} from "@/lib/app-session";
import { isSplashQaEnabled } from "@/lib/splash-qa";

export const QA_ACCOUNT_MODE_KEY = "fitfinder-qa-account-mode";
export const QA_ACCOUNT_MODE_CHANGED_EVENT = "fitfinder:qa-account-mode-changed";

export type QaAccountMode = "guest" | "registered";

function canUseStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

/** Active QA account override — null means use real auth (`is_anonymous`). */
export function getQaAccountMode(): QaAccountMode | null {
  if (!isSplashQaEnabled() || !canUseStorage()) return null;
  const mode =
    sessionStorage.getItem(QA_ACCOUNT_MODE_KEY) ??
    (typeof localStorage !== "undefined"
      ? localStorage.getItem(QA_ACCOUNT_MODE_KEY)
      : null);
  if (mode === "guest" || mode === "registered") return mode;
  return null;
}

export function setQaAccountMode(mode: QaAccountMode | null): void {
  if (!canUseStorage()) return;
  if (!mode) {
    sessionStorage.removeItem(QA_ACCOUNT_MODE_KEY);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(QA_ACCOUNT_MODE_KEY);
    }
  } else {
    sessionStorage.setItem(QA_ACCOUNT_MODE_KEY, mode);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(QA_ACCOUNT_MODE_KEY, mode);
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QA_ACCOUNT_MODE_CHANGED_EVENT));
  }
}

export function clearQaAccountMode(): void {
  setQaAccountMode(null);
}

/**
 * Product “guest” for UI gating (Preferences lock, upgrade prompts, etc.).
 * QA can force guest or registered without changing the Supabase session.
 */
export function resolveIsGuestUser(
  user: { is_anonymous?: boolean | null } | null | undefined,
): boolean {
  const qa = getQaAccountMode();
  if (qa === "registered") return false;
  if (qa === "guest") return true;
  return Boolean(user?.is_anonymous);
}

/** Skip splash/welcome and open the main dashboard as guest or registered (QA). */
export async function enterDashboardAsQaAccount(
  mode: QaAccountMode,
): Promise<{ error: string | null }> {
  if (!isSplashQaEnabled()) {
    return { error: "Splash QA is disabled." };
  }

  const { clearQaLaunchSimulation } = await import("@/lib/splash-qa");
  clearQaLaunchSimulation();
  setQaAccountMode(mode);

  markLaunchFlowComplete();
  markAppSessionActive();

  const { ensureGuestSession } = await import("@/lib/ensure-guest-session");
  const { error } = await ensureGuestSession({ completeLaunchFlow: true });
  if (error) return { error };

  const { saveProfileHeaderSnapshot, loadProfileHeaderSnapshot } = await import(
    "@/lib/profile"
  );
  const existing = loadProfileHeaderSnapshot();
  saveProfileHeaderSnapshot({
    fullName:
      mode === "registered"
        ? existing?.fullName?.trim() || "QA Registered"
        : existing?.fullName ?? null,
    isGuest: mode === "guest",
  });

  if (typeof window !== "undefined") {
    window.location.assign(DEFAULT_APP_ROUTE);
  }
  return { error: null };
}
