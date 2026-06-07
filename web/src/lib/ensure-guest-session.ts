import { createClient } from "@/lib/supabase/client";
import {
  markAppSessionActive,
  markLaunchFlowComplete,
} from "@/lib/app-session";

/** Start an anonymous Supabase session when the app needs auth but has none. */
export async function ensureGuestSession(): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return { error: null };
  }

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    return { error: error.message };
  }

  const {
    data: { session: nextSession },
  } = await supabase.auth.getSession();

  if (!nextSession) {
    return { error: "Could not start guest session." };
  }

  markLaunchFlowComplete();
  markAppSessionActive();
  return { error: null };
}
