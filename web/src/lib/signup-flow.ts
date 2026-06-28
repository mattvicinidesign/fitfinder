import type { UserProfile } from "@/lib/profile";

/** Signup steps (1-based UI) that may continue without filling fields: resume, rate, rating. */
const SIGNUP_OPTIONAL_STEP_INDEXES = new Set([1, 2, 4]);

export function isSignupGeneralDetailsComplete(
  profile: UserProfile,
  email: string,
): boolean {
  return Boolean(
    profile.fullName?.trim() &&
      email.trim() &&
      profile.country?.trim() &&
      profile.timezone?.trim(),
  );
}

/** Whether the current signup wizard step has required input before Continue / Finish. */
export function canContinueSignupStep(
  stepIndex: number,
  profile: UserProfile,
  email: string,
): boolean {
  if (SIGNUP_OPTIONAL_STEP_INDEXES.has(stepIndex)) return true;

  switch (stepIndex) {
    case 0:
      return isSignupGeneralDetailsComplete(profile, email);
    case 3:
      return profile.preferredCompanyTypes.length > 0;
    case 5:
      return profile.preferredProjectTypes.length > 0;
    case 6:
      return profile.preferredRegions.length > 0;
    default:
      return true;
  }
}

/** Required preference steps for signup finish (excludes optional rate + rating). */
export function isSignupPreferencesComplete(profile: UserProfile): boolean {
  return (
    profile.preferredCompanyTypes.length > 0 &&
    profile.preferredProjectTypes.length > 0 &&
    profile.preferredRegions.length > 0
  );
}

/** First signup step index that still needs input, or null when ready to finish. */
export function firstIncompleteSignupStep(
  profile: UserProfile,
  email: string,
): number | null {
  if (!isSignupGeneralDetailsComplete(profile, email)) return 0;
  if (profile.preferredCompanyTypes.length === 0) return 3;
  if (profile.preferredProjectTypes.length === 0) return 5;
  if (profile.preferredRegions.length === 0) return 6;
  return null;
}
