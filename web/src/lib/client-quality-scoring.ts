/**
 * Client Quality scoring items from Upwork "About the client":
 * Location, Rating, and Avg Pay rate.
 */

import {
  isClientAvgHourlyAtOrAboveProfile,
  isUnitedStatesClientOrigin,
  parseHourlyRateFromLabel,
  POSTING_DETAIL_MISSING,
  type JobPostingDetails,
} from "@/lib/posting-details";
import type { Compensation } from "@/lib/types";

export const CLIENT_QUALITY_FIELD_LABELS = {
  location: "Location",
  rating: "Rating",
  avgPayRate: "Avg Pay rate",
} as const;

export function isExplicitClientAvgPayRate(value: string): boolean {
  return (
    Boolean(value?.trim()) &&
    value !== POSTING_DETAIL_MISSING &&
    !value.includes("(job budget)")
  );
}

export function isClientRatingAtLeast3(value: string): boolean {
  const m = value.match(/(\d+(?:\.\d+)?)/);
  if (!m) return false;
  const rating = Number.parseFloat(m[1]);
  return Number.isFinite(rating) && rating >= 3;
}

/** 0–100 points for one Client Quality item, or null when not identified. */
export function clientQualityLocationPoints(
  clientOrigin: string | null | undefined,
): number | null {
  const value = clientOrigin?.trim();
  if (!value) return null;
  return isUnitedStatesClientOrigin(value) ? 100 : 0;
}

export function clientQualityRatingPoints(
  clientRating: string | null | undefined,
): number | null {
  const value = clientRating?.trim();
  if (!value) return null;
  if (!isClientRatingAtLeast3(value)) return 0;
  const m = value.match(/(\d+(?:\.\d+)?)/);
  const rating = m ? Number.parseFloat(m[1]) : 0;
  if (rating >= 4.5) return 100;
  if (rating >= 4) return 85;
  return 70;
}

export function clientQualityAvgPayPoints(
  avgPayLabel: string | null | undefined,
  profileCompensation?: Compensation | null,
): number | null {
  const value = avgPayLabel?.trim();
  if (!value || !isExplicitClientAvgPayRate(value)) return null;

  if (profileCompensation) {
    return isClientAvgHourlyAtOrAboveProfile(value, profileCompensation) ? 100 : 0;
  }

  const rate = parseHourlyRateFromLabel(value);
  if (rate == null) return 50;
  if (rate >= 45) return 100;
  if (rate >= 30) return 75;
  return 50;
}

/** Equal-weight average of identified About-the-client items (0–100). */
export function clientQualityScoreFromPostingDetails(
  details: JobPostingDetails | null | undefined,
  profileCompensation?: Compensation | null,
): number | null {
  const points = [
    clientQualityLocationPoints(details?.clientOrigin),
    clientQualityRatingPoints(details?.clientRating),
    clientQualityAvgPayPoints(details?.clientAverageHourlyRate, profileCompensation),
  ].filter((score): score is number => score != null);

  if (points.length === 0) return null;
  return Math.round(points.reduce((sum, score) => sum + score, 0) / points.length);
}
