import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackRedirectUrl } from "@/lib/auth-redirect";

export const SIGNIN_COMPLETE_ROUTE = "/home";

export const ACCOUNT_NOT_FOUND_MESSAGE =
  "We couldn’t find an account with that email.";

/**
 * Supabase returns these (and similar) when signInWithOtp is called with
 * shouldCreateUser: false for an unknown email. Prefer this over a separate
 * existence probe so we only reveal “not found” after Auth rejects the send.
 */
export function isSignInUserNotFoundError(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("signups not allowed") ||
    normalized.includes("signup is disabled") ||
    normalized.includes("user not found") ||
    normalized.includes("unable to find user") ||
    (normalized.includes("user") && normalized.includes("not found"))
  );
}

/**
 * Send a passwordless email OTP for an existing account only.
 * Never creates a user (shouldCreateUser: false). Name is intentionally unused.
 */
export async function sendSignInVerificationEmail(input: {
  email: string;
  redirectNext?: string;
}): Promise<{ error: string | null; accountNotFound: boolean }> {
  const supabase = createClient();
  const trimmedEmail = input.email.trim();

  // Drop an anonymous guest session so OTP verify restores the registered user
  // id rather than attempting to link email onto a new anonymous identity.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.is_anonymous === true) {
    await supabase.auth.signOut();
  }

  const emailRedirectTo = getAuthCallbackRedirectUrl(
    input.redirectNext ?? SIGNIN_COMPLETE_ROUTE,
  );

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });

  if (!error) {
    return { error: null, accountNotFound: false };
  }

  if (isSignInUserNotFoundError(error.message)) {
    return { error: ACCOUNT_NOT_FOUND_MESSAGE, accountNotFound: true };
  }

  return { error: error.message, accountNotFound: false };
}

/** Verify the 6-digit email OTP for an existing account. */
export async function verifySignInOtp(input: {
  email: string;
  token: string;
}): Promise<{ error: string | null; accountNotFound: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: input.email.trim(),
    token: input.token.trim(),
    type: "email",
  });

  if (!error) {
    return { error: null, accountNotFound: false };
  }

  if (isSignInUserNotFoundError(error.message)) {
    return { error: ACCOUNT_NOT_FOUND_MESSAGE, accountNotFound: true };
  }

  return { error: error.message, accountNotFound: false };
}
