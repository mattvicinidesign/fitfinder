"use client";

import { createClient } from "@/lib/supabase/client";
import { clearProfileHeaderSnapshot } from "@/lib/profile";
import { clearLatestResumeCache } from "@/lib/latest-resume-cache";
import { invokeFunction } from "@/lib/invoke-function";

const RECENT_ACTIVITY_KEY = "fitfinder:recent-activity";

export async function deleteAccount(): Promise<{ error?: string }> {
  try {
    await invokeFunction<{ ok: boolean }>("delete-account", {}, 60_000);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not delete account.",
    };
  }

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(RECENT_ACTIVITY_KEY);
  }

  clearProfileHeaderSnapshot();
  clearLatestResumeCache();

  const supabase = createClient();
  await supabase.auth.signOut();

  return {};
}
