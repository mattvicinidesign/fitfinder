import { createClient } from "@/lib/supabase/client";
import {
  markAppSessionActive,
  markLaunchFlowComplete,
} from "@/lib/app-session";
import { isQaLaunchSimulationPending } from "@/lib/splash-qa";

const GUEST_SIGN_IN_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

/** Start an anonymous Supabase session when the app needs auth but has none. */
export async function ensureGuestSession(options?: {
  /** User explicitly finished onboarding (welcome) — always persist launch state. */
  completeLaunchFlow?: boolean;
}): Promise<{ error: string | null }> {
  const completeLaunchFlow = options?.completeLaunchFlow ?? false;
  const shouldMarkLaunchComplete =
    completeLaunchFlow || !isQaLaunchSimulationPending();

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    if (shouldMarkLaunchComplete) {
      markLaunchFlowComplete();
    }
    markAppSessionActive();
    return { error: null };
  }

  let signInResult: Awaited<ReturnType<typeof supabase.auth.signInAnonymously>>;
  try {
    signInResult = await withTimeout(
      supabase.auth.signInAnonymously(),
      GUEST_SIGN_IN_TIMEOUT_MS,
      "Guest sign-in timed out. Try again.",
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not start guest session.",
    };
  }

  const { error } = signInResult;
  if (error) {
    return { error: error.message };
  }

  const {
    data: { session: nextSession },
  } = await supabase.auth.getSession();

  if (!nextSession) {
    return { error: "Could not start guest session." };
  }

  if (!shouldMarkLaunchComplete) {
    markAppSessionActive();
    return { error: null };
  }

  markLaunchFlowComplete();
  markAppSessionActive();
  return { error: null };
}
