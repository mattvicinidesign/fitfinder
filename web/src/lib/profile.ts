import { createClient } from "@/lib/supabase/client";

/**
 * Onboarding/profile PREFERENCE model.
 *
 * Onboarding only collects what a resume cannot provide. Resume-derived signals
 * (skills, tools, industries, roles, seniority) are NOT part of this model and
 * are never written here, so the resume/analysis-managed `qualified_industries`
 * and `qualified_skills` columns are left untouched.
 *
 * The minimum hourly rate maps to `desired_compensation_min` (period = hour).
 */
export interface UserProfile {
  fullName: string | null;
  professionalTitle: string | null;
  minimumHourlyRate: number | null;
  preferredEngagementTypes: string[];
  preferredCompanyTypes: string[];
  preferredRegions: string[];
  redFlags: string[];
  country: string | null;
  timezone: string | null;
  onboardingCompletedAt: string | null;
}

export function emptyUserProfile(): UserProfile {
  return {
    fullName: null,
    professionalTitle: null,
    minimumHourlyRate: null,
    preferredEngagementTypes: [],
    preferredCompanyTypes: [],
    preferredRegions: [],
    redFlags: [],
    country: null,
    timezone: null,
    onboardingCompletedAt: null,
  };
}

const PROFILE_SELECT =
  "full_name, professional_title, country, timezone, desired_compensation_min, preferred_engagement_types, preferred_regions, preferred_company_types, red_flags, onboarding_completed_at";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

/** Load the signed-in user's profile, or null when not authenticated. */
export async function fetchUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return emptyUserProfile();

  return {
    fullName: typeof data.full_name === "string" ? data.full_name : null,
    professionalTitle:
      typeof data.professional_title === "string"
        ? data.professional_title
        : null,
    minimumHourlyRate:
      typeof data.desired_compensation_min === "number"
        ? data.desired_compensation_min
        : null,
    preferredEngagementTypes: toStringArray(data.preferred_engagement_types),
    preferredCompanyTypes: toStringArray(data.preferred_company_types),
    preferredRegions: toStringArray(data.preferred_regions),
    redFlags: toStringArray(data.red_flags),
    country: typeof data.country === "string" ? data.country : null,
    timezone: typeof data.timezone === "string" ? data.timezone : null,
    onboardingCompletedAt:
      typeof data.onboarding_completed_at === "string"
        ? data.onboarding_completed_at
        : null,
  };
}

/** Persist the profile. Set `markComplete` when finishing onboarding. */
export async function saveUserProfile(
  profile: UserProfile,
  opts: { markComplete?: boolean } = {},
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in required." };

  const rate = profile.minimumHourlyRate;
  // Note: qualified_industries / qualified_skills are resume/analysis-managed
  // and deliberately omitted so onboarding never overwrites resume signals.
  const row: Record<string, unknown> = {
    user_id: user.id,
    full_name: profile.fullName?.trim() || null,
    professional_title: profile.professionalTitle?.trim() || null,
    country: profile.country?.trim() || null,
    timezone: profile.timezone?.trim() || null,
    preferred_engagement_types: profile.preferredEngagementTypes,
    preferred_regions: profile.preferredRegions,
    preferred_company_types: profile.preferredCompanyTypes,
    red_flags: profile.redFlags,
    desired_compensation_min: rate != null && rate > 0 ? rate : null,
    desired_compensation_period: rate != null && rate > 0 ? "hour" : null,
    desired_compensation_currency: "USD",
    updated_at: new Date().toISOString(),
  };
  if (opts.markComplete) {
    row.onboarding_completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("profiles").upsert(row);
  return { error: error?.message ?? null };
}

/** Reset all onboarding preference fields to empty. */
export async function resetUserProfile(): Promise<{ error: string | null }> {
  return saveUserProfile(
    { ...emptyUserProfile(), onboardingCompletedAt: null },
    {},
  );
}

function sortedStringArray(values: string[]): string[] {
  return [...values].sort();
}

/** Whether editable profile fields match (ignores onboardingCompletedAt). */
export function profilesEqual(a: UserProfile, b: UserProfile): boolean {
  const arraysEqual = (left: string[], right: string[]) =>
    JSON.stringify(sortedStringArray(left)) ===
    JSON.stringify(sortedStringArray(right));

  return (
    a.fullName === b.fullName &&
    a.professionalTitle === b.professionalTitle &&
    a.country === b.country &&
    a.timezone === b.timezone &&
    a.minimumHourlyRate === b.minimumHourlyRate &&
    arraysEqual(a.preferredEngagementTypes, b.preferredEngagementTypes) &&
    arraysEqual(a.preferredCompanyTypes, b.preferredCompanyTypes) &&
    arraysEqual(a.preferredRegions, b.preferredRegions) &&
    arraysEqual(a.redFlags, b.redFlags)
  );
}

/** Fields that count toward the completion indicator. */
const COMPLETION_FIELDS: (keyof UserProfile)[] = [
  "minimumHourlyRate",
  "preferredEngagementTypes",
  "preferredCompanyTypes",
  "preferredRegions",
  "redFlags",
];

function isFieldFilled(profile: UserProfile, key: keyof UserProfile): boolean {
  const value = profile[key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return value > 0;
  return value != null && String(value).trim().length > 0;
}

/** Informational completion percentage (0–100). Does not affect scoring. */
export function profileCompletion(profile: UserProfile): number {
  const filled = COMPLETION_FIELDS.filter((k) => isFieldFilled(profile, k))
    .length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}
