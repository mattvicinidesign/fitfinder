import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackRedirectUrl } from "@/lib/auth-redirect";

/**
 * Send the sign-up verification email. When the user already has an anonymous
 * session (e.g. resume uploaded during onboarding), link the email to that
 * account first, then send the magic link so storage rows stay on the same id.
 */
export async function sendSignupVerificationEmail(input: {
  email: string;
  profile: { fullName: string | null; country: string | null };
  redirectNext: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emailRedirectTo = getAuthCallbackRedirectUrl(input.redirectNext);
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
      return { error: updateError.message };
    }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo,
      shouldCreateUser: !isAnonymous,
      data: metadata,
    },
  });
  return { error: error?.message ?? null };
}
