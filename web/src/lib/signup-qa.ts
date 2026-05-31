import { isSplashQaEnabled } from "@/lib/splash-qa";

export const SIGNUP_QA_DEFAULTS = {
  fullName: "Matt",
  email: "vicinima@gmail.com",
  location: "United States",
} as const;

/** Dev-only prefills for the sign-up account step. */
export function getSignupQaDefaults() {
  if (!isSplashQaEnabled()) return null;
  return SIGNUP_QA_DEFAULTS;
}
