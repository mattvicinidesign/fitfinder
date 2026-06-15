import { parseClientRatingOutOfFive } from "@/lib/posting-detail-highlights";

/** Postgres numeric columns often arrive as strings from Supabase JS. */
export function coerceProfileNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function clampEmployerRatingPreference(
  value: number | null | undefined,
): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : coerceProfileNumeric(value);
  if (numeric == null) return null;
  return Math.max(0, Math.min(5, numeric));
}

export function formatEmployerRatingDisplay(rating: number): string {
  return Number.isInteger(rating) ? `${rating}.0` : String(rating);
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
    badgeLabel: formatEmployerRatingDisplay(parsed),
    identified: true,
    compareToProfile: true,
    matched,
    points: matched ? 100 : 0,
  };
}
