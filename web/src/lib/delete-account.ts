"use client";

import { createClient } from "@/lib/supabase/client";
import {
  clearOnboardingState,
  DEFAULT_APP_ROUTE,
} from "@/lib/app-session";
import { clearProfileHeaderSnapshot } from "@/lib/profile";
import { clearLatestResumeCache } from "@/lib/latest-resume-cache";
import { clearPendingSignup } from "@/lib/pending-signup";
import { invokeFunction } from "@/lib/invoke-function";

const FITFINDER_KEY_PREFIX = "fitfinder";

function clearFitFinderStorage(storage: Storage): void {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(FITFINDER_KEY_PREFIX)) {
      storage.removeItem(key);
    }
  }
}

/**
 * Delete the signed-in account on the server, wipe local app state, and sign out.
 * Caller should hard-navigate to the launch route so SplashGate shows Welcome
 * (Sign up / Use as a guest) again.
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  try {
    await invokeFunction<{ ok: boolean }>("delete-account", {}, 60_000);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not delete account.",
    };
  }

  clearPendingSignup();
  clearProfileHeaderSnapshot();
  clearLatestResumeCache();
  clearOnboardingState();

  if (typeof localStorage !== "undefined") {
    clearFitFinderStorage(localStorage);
  }
  if (typeof sessionStorage !== "undefined") {
    clearFitFinderStorage(sessionStorage);
  }

  // Re-apply after storage wipe — SplashGate needs welcome incomplete.
  clearOnboardingState();

  const supabase = createClient();
  await supabase.auth.signOut();

  return {};
}

/** Full reload onto the launch route so Sign up / Use as guest is shown. */
export function redirectAfterAccountDeletion(): void {
  if (typeof window === "undefined") return;
  window.location.replace(DEFAULT_APP_ROUTE);
}
