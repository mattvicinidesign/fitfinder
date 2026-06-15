import {
  clampEmployerRatingPreference,
  coerceProfileNumeric,
} from "@/lib/employer-rating-match";
import type { UserProfile } from "@/lib/profile";

export const LOCAL_PROFILE_PREFS_KEY = "fitfinder-local-profile-prefs";

/** Preference fields mirrored to localStorage for preview/offline and pre-migration DB. */
export type LocalProfilePrefs = Pick<
  UserProfile,
  | "minimumHourlyRate"
  | "preferredEngagementTypes"
  | "preferredCompanyTypes"
  | "preferredRegions"
  | "preferredProjectTypes"
  | "preferredMinimumEmployerRating"
>;

function canUseLocalStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeLocalProfilePrefs(raw: unknown): LocalProfilePrefs | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;

  return {
    minimumHourlyRate: coerceProfileNumeric(record.minimumHourlyRate),
    preferredEngagementTypes: toStringArray(record.preferredEngagementTypes),
    preferredCompanyTypes: toStringArray(record.preferredCompanyTypes),
    preferredRegions: toStringArray(record.preferredRegions),
    preferredProjectTypes: toStringArray(record.preferredProjectTypes),
    preferredMinimumEmployerRating: clampEmployerRatingPreference(
      coerceProfileNumeric(record.preferredMinimumEmployerRating),
    ),
  };
}

/** Synchronous read — safe for initial React state in client components. */
export function loadLocalProfilePrefs(): LocalProfilePrefs | null {
  if (!canUseLocalStorage()) return null;
  const raw = localStorage.getItem(LOCAL_PROFILE_PREFS_KEY);
  if (!raw) return null;
  try {
    return normalizeLocalProfilePrefs(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalProfilePrefs(prefs: Partial<LocalProfilePrefs>): void {
  if (!canUseLocalStorage()) return;
  const current = loadLocalProfilePrefs() ?? {
    minimumHourlyRate: null,
    preferredEngagementTypes: [],
    preferredCompanyTypes: [],
    preferredRegions: [],
    preferredProjectTypes: [],
    preferredMinimumEmployerRating: null,
  };

  const next: LocalProfilePrefs = {
    minimumHourlyRate:
      prefs.minimumHourlyRate !== undefined
        ? coerceProfileNumeric(prefs.minimumHourlyRate)
        : current.minimumHourlyRate,
    preferredEngagementTypes:
      prefs.preferredEngagementTypes ?? current.preferredEngagementTypes,
    preferredCompanyTypes:
      prefs.preferredCompanyTypes ?? current.preferredCompanyTypes,
    preferredRegions: prefs.preferredRegions ?? current.preferredRegions,
    preferredProjectTypes:
      prefs.preferredProjectTypes ?? current.preferredProjectTypes,
    preferredMinimumEmployerRating:
      prefs.preferredMinimumEmployerRating !== undefined
        ? clampEmployerRatingPreference(prefs.preferredMinimumEmployerRating)
        : current.preferredMinimumEmployerRating,
  };

  localStorage.setItem(LOCAL_PROFILE_PREFS_KEY, JSON.stringify(next));
}

export function pickLocalProfilePrefs(
  profile: UserProfile,
): LocalProfilePrefs {
  return {
    minimumHourlyRate: profile.minimumHourlyRate,
    preferredEngagementTypes: profile.preferredEngagementTypes,
    preferredCompanyTypes: profile.preferredCompanyTypes,
    preferredRegions: profile.preferredRegions,
    preferredProjectTypes: profile.preferredProjectTypes,
    preferredMinimumEmployerRating: profile.preferredMinimumEmployerRating,
  };
}
