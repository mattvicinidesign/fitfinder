import { createClient } from "@/lib/supabase/client";
import { normalizeEmailOtpError } from "@/lib/email-otp";

/**
 * Send the sign-up verification code. When the user already has an anonymous
 * session (e.g. resume uploaded during onboarding), link the email to that
 * account first, then send the OTP so storage rows stay on the same id.
 */
export async function sendSignupVerificationEmail(input: {
  email: string;
  profile: { fullName: string | null; country: string | null };
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const metadata = {
    full_name: input.profile.fullName,
    location: input.profile.country,
  };
  const isAnonymous = user?.is_anonymous === true;

  if (isAnonymous) {
    const { error: updateError } = await supabase.auth.updateUser({
      email: input.email,
      data: metadata,
    });
    if (updateError) {
      return { error: normalizeEmailOtpError(updateError.message) };
    }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      shouldCreateUser: !isAnonymous,
      data: metadata,
    },
  });
  return { error: error ? normalizeEmailOtpError(error.message) : null };
}

/** Verify the 6-digit email OTP and establish the registered session. */
export async function verifySignupOtp(input: {
  email: string;
  token: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const trimmedEmail = input.email.trim();
  const token = input.token.trim();

  const { error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token,
    type: "email",
  });

  if (!error) {
    return { error: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.is_anonymous === true) {
    const { error: emailChangeError } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token,
      type: "email_change",
    });
    if (!emailChangeError) {
      return { error: null };
    }
    return { error: normalizeEmailOtpError(emailChangeError.message) };
  }

  return { error: normalizeEmailOtpError(error.message) };
}
