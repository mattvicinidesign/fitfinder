import { createClient } from "@/lib/supabase/client";
import {
  clampEmployerRatingPreference,
  coerceProfileNumeric,
} from "@/lib/employer-rating-match";
import {
  loadLocalProfilePrefs,
  pickLocalProfilePrefs,
  saveLocalProfilePrefs,
} from "@/lib/local-profile-prefs";
import {
  COMPANY_TYPE_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  REGION_OPTIONS,
} from "@/lib/onboarding-options";

/**
 * Onboarding/profile PREFERENCE model.
 *
 * Onboarding only collects what a resume cannot provide. Resume-derived signals
 * (skills, tools, industries, roles, seniority) are NOT part of this model and
 * are never written here, so the resume/analysis-managed `qualified_industries`
 * and `qualified_skills` columns are left untouched.
 *
 * The minimum hourly rate maps to `desired_compensation_min` (period = hour).
 * Minimum client rating maps to `preferred_minimum_employer_rating` (0–5).
 */
export interface UserProfile {
  fullName: string | null;
  minimumHourlyRate: number | null;
  preferredEngagementTypes: string[];
  preferredCompanyTypes: string[];
  preferredRegions: string[];
  /** Ongoing vs one-time project preference from onboarding. */
  preferredProjectTypes: string[];
  /** Minimum client star rating (0–5) from onboarding. */
  preferredMinimumEmployerRating: number | null;
  country: string | null;
  timezone: string | null;
  onboardingCompletedAt: string | null;
}

export function emptyUserProfile(): UserProfile {
  return {
    fullName: null,
    minimumHourlyRate: null,
    preferredEngagementTypes: [],
    preferredCompanyTypes: [],
    preferredRegions: [],
    preferredProjectTypes: [],
    preferredMinimumEmployerRating: null,
    country: null,
    timezone: null,
    onboardingCompletedAt: null,
  };
}

const PROFILE_SELECT =
  "full_name, country, timezone, desired_compensation_min, preferred_engagement_types, preferred_regions, preferred_company_types, preferred_project_types, preferred_minimum_employer_rating, onboarding_completed_at";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

function nameFromAuthMetadata(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const raw = user.user_metadata?.full_name;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function resolveFullName(
  stored: unknown,
  user: { user_metadata?: Record<string, unknown> },
): string | null {
  if (typeof stored === "string" && stored.trim()) return stored.trim();
  return nameFromAuthMetadata(user);
}

function rowToUserProfile(
  data: Record<string, unknown>,
  user: { user_metadata?: Record<string, unknown> },
): UserProfile {
  return {
    fullName: resolveFullName(data.full_name, user),
    minimumHourlyRate: coerceProfileNumeric(data.desired_compensation_min),
    preferredEngagementTypes: toStringArray(data.preferred_engagement_types),
    preferredCompanyTypes: toStringArray(data.preferred_company_types),
    preferredRegions: toStringArray(data.preferred_regions),
    preferredProjectTypes: toStringArray(data.preferred_project_types),
    preferredMinimumEmployerRating: clampEmployerRatingPreference(
      coerceProfileNumeric(data.preferred_minimum_employer_rating),
    ),
    country: typeof data.country === "string" ? data.country : null,
    timezone: typeof data.timezone === "string" ? data.timezone : null,
    onboardingCompletedAt:
      typeof data.onboarding_completed_at === "string"
        ? data.onboarding_completed_at
        : null,
  };
}

const LEGACY_COMPANY_LABELS: Record<string, string> = {
  Enterprise: "Company",
  "Scale-Up": "Startup",
  "Founder-Led": "Startup",
};

function normalizePreferenceArray(
  values: string[],
  allowed: readonly string[],
  legacy?: Record<string, string>,
): string[] {
  const allowedSet = new Set<string>(allowed);
  const out: string[] = [];
  for (const raw of values) {
    const mapped = legacy?.[raw] ?? raw;
    if (allowedSet.has(mapped) && !out.includes(mapped)) {
      out.push(mapped);
    }
  }
  return out;
}

/** Map stored onboarding labels to current chip options. */
export function normalizeUserProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    preferredEngagementTypes: [],
    preferredCompanyTypes: normalizePreferenceArray(
      profile.preferredCompanyTypes,
      COMPANY_TYPE_OPTIONS,
      LEGACY_COMPANY_LABELS,
    ),
    preferredRegions: normalizePreferenceArray(
      profile.preferredRegions,
      REGION_OPTIONS,
    ),
    preferredProjectTypes: normalizePreferenceArray(
      profile.preferredProjectTypes,
      PROJECT_TYPE_OPTIONS,
    ),
    preferredMinimumEmployerRating: clampEmployerRatingPreference(
      profile.preferredMinimumEmployerRating,
    ),
  };
}

function pickString(
  current: string | null,
  next: string | null | undefined,
): string | null {
  if (current?.trim()) return current.trim();
  if (typeof next === "string" && next.trim()) return next.trim();
  return current;
}

function pickNumber(
  current: number | null,
  next: number | null | undefined,
): number | null {
  if (current != null && current > 0) return current;
  if (next != null && next > 0) return next;
  return current;
}

function pickRatingFloor(
  current: number | null,
  next: number | null | undefined,
): number | null {
  if (current != null && Number.isFinite(current)) return current;
  if (next != null && Number.isFinite(next)) return clampEmployerRatingPreference(next);
  return current;
}

function pickArray(current: string[], next: string[] | undefined): string[] {
  if (current.length > 0) return current;
  if (next && next.length > 0) return [...next];
  return current;
}

/** Fill empty profile fields from onboarding drafts (DB values win when set). */
export function mergeUserProfileLayers(
  base: UserProfile,
  ...overlays: Partial<UserProfile>[]
): UserProfile {
  let merged = { ...base };
  for (const overlay of overlays) {
    merged = {
      ...merged,
      fullName: pickString(merged.fullName, overlay.fullName),
      country: pickString(merged.country, overlay.country),
      timezone: pickString(merged.timezone, overlay.timezone),
      minimumHourlyRate: pickNumber(
        merged.minimumHourlyRate,
        overlay.minimumHourlyRate,
      ),
      preferredEngagementTypes: pickArray(
        merged.preferredEngagementTypes,
        overlay.preferredEngagementTypes,
      ),
      preferredCompanyTypes: pickArray(
        merged.preferredCompanyTypes,
        overlay.preferredCompanyTypes,
      ),
      preferredRegions: pickArray(
        merged.preferredRegions,
        overlay.preferredRegions,
      ),
      preferredProjectTypes: pickArray(
        merged.preferredProjectTypes,
        overlay.preferredProjectTypes,
      ),
      preferredMinimumEmployerRating: pickRatingFloor(
        merged.preferredMinimumEmployerRating,
        overlay.preferredMinimumEmployerRating,
      ),
      onboardingCompletedAt:
        merged.onboardingCompletedAt ?? overlay.onboardingCompletedAt ?? null,
    };
  }
  return merged;
}

async function loadLocalProfileDrafts(): Promise<Partial<UserProfile>[]> {
  const { loadPendingSignup } = await import("@/lib/pending-signup");
  const { loadOnboardingProgress } = await import("@/lib/onboarding-progress");

  const drafts: Partial<UserProfile>[] = [];
  const pending = loadPendingSignup()?.profile;
  if (pending) drafts.push(pending);
  const progress = loadOnboardingProgress()?.profile;
  if (progress) drafts.push(progress);
  return drafts;
}

function profileNeedsPreferenceSync(
  stored: UserProfile,
  resolved: UserProfile,
): boolean {
  return !profilesEqual(stored, resolved);
}

/** Raw profile row from Postgres (no local draft merge). */
export async function fetchUserProfileFromDatabase(): Promise<UserProfile | null> {
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

  if (!data) {
    const metaName = nameFromAuthMetadata(user);
    return metaName
      ? { ...emptyUserProfile(), fullName: metaName }
      : emptyUserProfile();
  }

  return rowToUserProfile(data, user);
}

/** Load the signed-in user's profile, or null when not authenticated. */
export async function fetchUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stored = (await fetchUserProfileFromDatabase()) ?? emptyUserProfile();
  const drafts = await loadLocalProfileDrafts();
  const localPrefs = loadLocalProfilePrefs();
  const resolved = normalizeUserProfile(
    mergeUserProfileLayers(stored, ...drafts, localPrefs ?? {}),
  );

  if (profileNeedsPreferenceSync(stored, resolved)) {
    void saveUserProfile(resolved);
  }

  return resolved;
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
    country: profile.country?.trim() || null,
    timezone: profile.timezone?.trim() || null,
    preferred_engagement_types: profile.preferredEngagementTypes,
    preferred_regions: profile.preferredRegions,
    preferred_company_types: profile.preferredCompanyTypes,
    preferred_project_types: profile.preferredProjectTypes,
    preferred_minimum_employer_rating: clampEmployerRatingPreference(
      profile.preferredMinimumEmployerRating,
    ),
    desired_compensation_min: rate != null && rate > 0 ? rate : null,
    desired_compensation_period: rate != null && rate > 0 ? "hour" : null,
    desired_compensation_currency: "USD",
    updated_at: new Date().toISOString(),
  };
  if (opts.markComplete) {
    row.onboarding_completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" });
  saveLocalProfilePrefs(pickLocalProfilePrefs(profile));
  if (!error) {
    saveProfileHeaderSnapshot({
      fullName: profile.fullName?.trim() || null,
      isGuest: user.is_anonymous ?? false,
    });
  }
  return { error: error?.message ?? null };
}

export const PROFILE_HEADER_CACHE_KEY = "fitfinder-profile-header";

export type ProfileHeaderSnapshot = {
  fullName: string | null;
  isGuest: boolean;
};

function canUseProfileHeaderCache(): boolean {
  return typeof localStorage !== "undefined";
}

/** Synchronous read for profile screen header — avoids a "Profile" flash before fetch. */
export function loadProfileHeaderSnapshot(): ProfileHeaderSnapshot | null {
  if (!canUseProfileHeaderCache()) return null;

  const raw = localStorage.getItem(PROFILE_HEADER_CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ProfileHeaderSnapshot>;
    if (typeof parsed.isGuest !== "boolean") return null;
    const fullName =
      typeof parsed.fullName === "string" ? parsed.fullName.trim() || null : null;
    return { fullName, isGuest: parsed.isGuest };
  } catch {
    return null;
  }
}

export function saveProfileHeaderSnapshot(snapshot: ProfileHeaderSnapshot): void {
  if (!canUseProfileHeaderCache()) return;
  localStorage.setItem(
    PROFILE_HEADER_CACHE_KEY,
    JSON.stringify({
      fullName: snapshot.fullName?.trim() || null,
      isGuest: snapshot.isGuest,
    }),
  );
}

export function clearProfileHeaderSnapshot(): void {
  if (!canUseProfileHeaderCache()) return;
  localStorage.removeItem(PROFILE_HEADER_CACHE_KEY);
}

/** Seed profile screen state from the header cache before async fetch completes. */
export function initialProfileScreenState(): {
  profile: UserProfile;
  savedProfile: UserProfile;
  isGuest: boolean;
} {
  const snapshot = loadProfileHeaderSnapshot();
  const base = emptyUserProfile();
  const profile = snapshot?.fullName
    ? { ...base, fullName: snapshot.fullName }
    : base;
  return {
    profile: structuredClone(profile),
    savedProfile: structuredClone(profile),
    isGuest: snapshot?.isGuest ?? false,
  };
}

export function readNameFromAuthUser(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  return nameFromAuthMetadata(user);
}

/** First non-empty display name from profile row, auth metadata, or local signup draft. */
export async function fetchUserDisplayName(): Promise<string | null> {
  const profile = await fetchUserProfile();
  if (profile?.fullName?.trim()) return profile.fullName.trim();

  const { loadPendingSignup } = await import("@/lib/pending-signup");
  const pending = loadPendingSignup();
  if (pending?.profile.fullName?.trim()) return pending.profile.fullName.trim();

  const { loadOnboardingProgress } = await import("@/lib/onboarding-progress");
  const progress = loadOnboardingProgress();
  if (progress?.profile.fullName?.trim()) return progress.profile.fullName.trim();

  return null;
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

/** Whether name, location, and timezone are all non-empty (required for General Info save). */
export function isGeneralInfoValid(profile: UserProfile): boolean {
  return Boolean(
    profile.fullName?.trim() &&
      profile.country?.trim() &&
      profile.timezone?.trim(),
  );
}

/** Whether preference fields are complete enough to save. */
export function isPreferencesValid(profile: UserProfile): boolean {
  return (
    profile.minimumHourlyRate != null &&
    profile.minimumHourlyRate > 0 &&
    profile.preferredMinimumEmployerRating != null &&
    profile.preferredCompanyTypes.length > 0 &&
    profile.preferredProjectTypes.length > 0 &&
    profile.preferredRegions.length > 0
  );
}

/** Whether preference fields differ from the saved snapshot. */
export function preferencesDirty(a: UserProfile, b: UserProfile): boolean {
  const arraysEqual = (left: string[], right: string[]) =>
    JSON.stringify(sortedStringArray(left)) ===
    JSON.stringify(sortedStringArray(right));

  const rateA = coerceProfileNumeric(a.minimumHourlyRate);
  const rateB = coerceProfileNumeric(b.minimumHourlyRate);
  const ratingA = clampEmployerRatingPreference(a.preferredMinimumEmployerRating);
  const ratingB = clampEmployerRatingPreference(b.preferredMinimumEmployerRating);

  return (
    rateA !== rateB ||
    ratingA !== ratingB ||
    !arraysEqual(a.preferredCompanyTypes, b.preferredCompanyTypes) ||
    !arraysEqual(a.preferredRegions, b.preferredRegions) ||
    !arraysEqual(a.preferredProjectTypes, b.preferredProjectTypes)
  );
}

/** Whether settings fields are complete enough to save. */
export function isSettingsValid(profile: UserProfile): boolean {
  return Boolean(profile.timezone?.trim());
}

/** Whether the timezone field differs from the saved snapshot. */
export function settingsDirty(a: UserProfile, b: UserProfile): boolean {
  return a.timezone !== b.timezone;
}

/** Whether editable general-info fields differ from the saved snapshot. */
export function generalInfoDirty(a: UserProfile, b: UserProfile): boolean {
  return (
    a.fullName !== b.fullName ||
    a.country !== b.country ||
    a.timezone !== b.timezone
  );
}

/** Whether editable profile fields match (ignores onboardingCompletedAt). */
export function profilesEqual(a: UserProfile, b: UserProfile): boolean {
  const arraysEqual = (left: string[], right: string[]) =>
    JSON.stringify(sortedStringArray(left)) ===
    JSON.stringify(sortedStringArray(right));

  return (
    a.fullName === b.fullName &&
    a.country === b.country &&
    a.timezone === b.timezone &&
    a.minimumHourlyRate === b.minimumHourlyRate &&
    a.preferredMinimumEmployerRating === b.preferredMinimumEmployerRating &&
    arraysEqual(a.preferredEngagementTypes, b.preferredEngagementTypes) &&
    arraysEqual(a.preferredCompanyTypes, b.preferredCompanyTypes) &&
    arraysEqual(a.preferredRegions, b.preferredRegions) &&
    arraysEqual(a.preferredProjectTypes, b.preferredProjectTypes)
  );
}

/** Fields that count toward the completion indicator. */
const COMPLETION_FIELDS: (keyof UserProfile)[] = [
  "minimumHourlyRate",
  "preferredMinimumEmployerRating",
  "preferredCompanyTypes",
  "preferredRegions",
  "preferredProjectTypes",
];

function isFieldFilled(profile: UserProfile, key: keyof UserProfile): boolean {
  const value = profile[key];
  if (key === "preferredMinimumEmployerRating") {
    return typeof value === "number" && value >= 0 && value <= 5;
  }
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
