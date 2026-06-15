import { normalizeCountry } from "@/lib/country-match";
import { resolveJobEnglishLevel } from "@/lib/preferred-qualifications-parse";

/** True when onboarding step 1 location is the United States. */
export function isUnitedStatesOnboardingCountry(
  profileCountry: string | null | undefined,
): boolean {
  const value = profileCountry?.trim();
  if (!value) return false;
  return normalizeCountry(value) === "us";
}

export function buildEnglishLevelPreferenceDetail(
  jobDescription: string | null | undefined,
  profileCountry: string | null | undefined,
): {
  badgeLabel: string;
  identified: boolean;
  matched: boolean;
  points: number | null;
} {
  const level = resolveJobEnglishLevel(jobDescription);
  const identified = Boolean(level?.trim());
  if (!identified) {
    return {
      badgeLabel: "",
      identified: false,
      matched: false,
      points: null,
    };
  }

  const matched = isUnitedStatesOnboardingCountry(profileCountry);
  return {
    badgeLabel: level!.trim(),
    identified: true,
    matched,
    points: matched ? 100 : 0,
  };
}
