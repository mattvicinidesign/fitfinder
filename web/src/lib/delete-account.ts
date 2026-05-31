"use client";

import { createClient } from "@/lib/supabase/client";

const RECENT_ACTIVITY_KEY = "fitfinder:recent-activity";

export async function deleteAccount(): Promise<{ error?: string }> {
  const response = await fetch("/api/account/delete", { method: "DELETE" });
  const body = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    return { error: body.error ?? "Could not delete account." };
  }

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(RECENT_ACTIVITY_KEY);
  }

  const supabase = createClient();
  await supabase.auth.signOut();

  return {};
}
