import { createClient } from "@/lib/supabase/client";
import { clearOnboardingState } from "@/lib/app-session";
import { isNativePlatform } from "@/lib/platform";

const FITFINDER_KEY_PREFIX = "fitfinder";

function clearFitFinderStorage(storage: Storage): void {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(FITFINDER_KEY_PREFIX)) {
      storage.removeItem(key);
    }
  }
}

export function isFirstLaunchResetRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("firstLaunch") === "1";
}

/** Clear local app state and auth so splash / welcome run again (web testing). */
export async function resetWebFirstLaunch(): Promise<void> {
  clearOnboardingState();

  if (typeof localStorage !== "undefined") {
    clearFitFinderStorage(localStorage);
  }
  if (typeof sessionStorage !== "undefined") {
    clearFitFinderStorage(sessionStorage);
  }

  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {
    // Best-effort — storage clear is enough for launch UX.
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("firstLaunch");
  const target = `${url.pathname}${url.search}${url.hash}` || "/";
  window.location.replace(target);
}

export function canResetWebFirstLaunch(): boolean {
  return !isNativePlatform();
}
