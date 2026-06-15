import { parseClientRatingOutOfFive } from "@/lib/posting-detail-highlights";

export function clampEmployerRatingPreference(
  value: number | null | undefined,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(5, value));
}

export interface EmployerRatingMatchDetail {
  badgeLabel: string;
  identified: boolean;
  compareToProfile: boolean;
  matched: boolean;
  points: number | null;
}

export function buildEmployerRatingMatchDetail({
  clientRating,
  profilePreferredMinimumEmployerRating,
}: {
  clientRating?: string | null;
  profilePreferredMinimumEmployerRating?: number | null;
}): EmployerRatingMatchDetail {
  const value = clientRating?.trim() ?? "";
  if (!value) {
    return {
      badgeLabel: "",
      identified: false,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const parsed = parseClientRatingOutOfFive(value);
  const floor = clampEmployerRatingPreference(
    profilePreferredMinimumEmployerRating,
  );

  if (parsed == null) {
    return {
      badgeLabel: value,
      identified: true,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  if (floor == null) {
    return {
      badgeLabel: value,
      identified: true,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const matched = parsed >= floor;

  return {
    badgeLabel: value,
    identified: true,
    compareToProfile: true,
    matched,
    points: matched ? 100 : 0,
  };
}
