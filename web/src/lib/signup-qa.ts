import { isSplashQaEnabled } from "@/lib/splash-qa";

export const SIGNUP_QA_DEFAULTS = {
  fullName: "Matt",
  email: "vicinima@gmail.com",
  location: "United States",
} as const;

/** Signup fields stay empty on first visit — including after QA first-launch resets. */
export function getSignupQaDefaults() {
  if (!isSplashQaEnabled()) return null;
  return null;
}
