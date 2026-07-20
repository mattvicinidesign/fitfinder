import type { UserProfile } from "@/lib/profile";

/** Signup wizard indexes: 0 basic, 1 resume, 2 goals, 3 stage, 4 help, 5 completion. */
export const SIGNUP_RESUME_STEP_INDEX = 1;
export const SIGNUP_GOALS_STEP_INDEX = 2;
export const SIGNUP_SEARCH_STAGE_STEP_INDEX = 3;
export const SIGNUP_HELP_STEP_INDEX = 4;
export const SIGNUP_COMPLETION_STEP_INDEX = 5;

/** Steps that may continue without filling fields: resume + completion. */
const SIGNUP_OPTIONAL_STEP_INDEXES = new Set([
  SIGNUP_RESUME_STEP_INDEX,
  SIGNUP_COMPLETION_STEP_INDEX,
]);

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

export function isSignupGoalsComplete(profile: UserProfile): boolean {
  return profile.jobSearchGoals.length > 0;
}

export function isSignupSearchStageComplete(profile: UserProfile): boolean {
  return Boolean(profile.searchStage?.trim());
}

export function isSignupHelpTopicsComplete(profile: UserProfile): boolean {
  return profile.helpTopics.length > 0;
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
    case SIGNUP_GOALS_STEP_INDEX:
      return isSignupGoalsComplete(profile);
    case SIGNUP_SEARCH_STAGE_STEP_INDEX:
      return isSignupSearchStageComplete(profile);
    case SIGNUP_HELP_STEP_INDEX:
      return isSignupHelpTopicsComplete(profile);
    default:
      return true;
  }
}

/** Intent steps required before account creation (excludes optional resume). */
export function isSignupIntentComplete(profile: UserProfile): boolean {
  return (
    isSignupGoalsComplete(profile) &&
    isSignupSearchStageComplete(profile) &&
    isSignupHelpTopicsComplete(profile)
  );
}

/** @deprecated Use isSignupIntentComplete — scoring prefs are no longer part of signup. */
export function isSignupPreferencesComplete(profile: UserProfile): boolean {
  return isSignupIntentComplete(profile);
}

/** First signup step index that still needs input, or null when ready to finish. */
export function firstIncompleteSignupStep(
  profile: UserProfile,
  email: string,
): number | null {
  if (!isSignupGeneralDetailsComplete(profile, email)) return 0;
  if (!isSignupGoalsComplete(profile)) return SIGNUP_GOALS_STEP_INDEX;
  if (!isSignupSearchStageComplete(profile)) return SIGNUP_SEARCH_STAGE_STEP_INDEX;
  if (!isSignupHelpTopicsComplete(profile)) return SIGNUP_HELP_STEP_INDEX;
  return null;
}
