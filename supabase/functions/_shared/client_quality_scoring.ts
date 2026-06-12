/**
 * About Client scoring items from job posting metadata:
 * platform, employer type, posting metadata, location, rating, and avg pay rate.
 */

import { formatClientLocationDisplay } from "./client_location_parse.ts";
import { detectJobPlatform, type JobPlatform } from "./job_platform.ts";
import type { ProfileScoringRow } from "./profile_scoring.ts";
import type { JobPostingDetails, ParsedJob } from "./types.ts";

export const POSTING_DETAIL_MISSING = "—";

function normalizeCountry(value: string): string | null {
  const n = value.trim().toLowerCase();
  if (n === "united states" || n === "usa" || n === "u.s." || n === "u.s.a.") {
    return "us";
  }
  return null;
}

function isDatePostedWithin3Days(label: string): boolean {
  if (!label || label === POSTING_DETAIL_MISSING) return false;
  const lower = label.toLowerCase();
  if (/\btoday\b/.test(lower)) return true;
  if (/\byesterday\b/.test(lower)) return true;
  const daysAgo = label.match(/(\d+)\s+days?\s+ago/i);
  if (daysAgo) {
    const n = Number.parseInt(daysAgo[1], 10);
    return Number.isFinite(n) && n < 3;
  }
  const hoursAgo = label.match(/(\d+)\s+hours?\s+ago/i);
  if (hoursAgo) return true;
  return false;
}

function isUnitedStatesHireArea(label: string): boolean {
  if (!label || label === POSTING_DETAIL_MISSING) return false;
  return normalizeCountry(label) === "us";
}

export function isExplicitClientAvgPayRate(value: string): boolean {
  return (
    Boolean(value?.trim()) &&
    value !== POSTING_DETAIL_MISSING &&
    !value.includes("(job budget)")
  );
}

function parseHourlyRateFromLabel(label: string): number | null {
  if (!label || label === POSTING_DETAIL_MISSING) return null;
  const m = label.match(/\$\s*([\d,]+(?:\.\d+)?)\s*(?:\/\s*|-\s*)?(?:hr|hour)\b/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function isUnitedStatesClientOrigin(value: string): boolean {
  if (!value || value === POSTING_DETAIL_MISSING) return false;
  return normalizeCountry(value) === "us";
}

export function isClientRatingAtLeast3(value: string): boolean {
  const m = value.match(/(\d+(?:\.\d+)?)/);
  if (!m) return false;
  const rating = Number.parseFloat(m[1]);
  return Number.isFinite(rating) && rating >= 3;
}

export function isClientAvgHourlyAtOrAboveProfile(
  clientAvgLabel: string,
  profile: { desired_compensation_min?: number | null; desired_compensation?: number | null; desired_compensation_period?: string | null } | null | undefined,
): boolean {
  if (clientAvgLabel.includes("(job budget)")) return false;
  const clientRate = parseHourlyRateFromLabel(clientAvgLabel);
  if (clientRate == null || !profile) return false;
  const period = profile.desired_compensation_period;
  const floor = profile.desired_compensation_min ?? profile.desired_compensation;
  if (period !== "hour" || floor == null || !Number.isFinite(floor)) return false;
  return clientRate >= floor;
}

export function clientQualityLocationPoints(
  clientOrigin: string | null | undefined,
  clientCity?: string | null,
): number | null {
  const country = clientOrigin?.trim();
  const city = clientCity?.trim();
  if (!country && !city) return null;
  if (!country) return null;
  return isUnitedStatesClientOrigin(country) ? 100 : 0;
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
  profile?: ProfileScoringRow | null,
): number | null {
  const value = avgPayLabel?.trim();
  if (!value || !isExplicitClientAvgPayRate(value)) return null;

  if (profile) {
    return isClientAvgHourlyAtOrAboveProfile(value, profile) ? 100 : 0;
  }

  const rate = parseHourlyRateFromLabel(value);
  if (rate == null) return 50;
  if (rate >= 45) return 100;
  if (rate >= 30) return 75;
  return 50;
}

export function clientQualityPlatformPoints(
  platform: JobPlatform | null,
): number | null {
  if (!platform) return null;
  return 100;
}

export function clientQualityEmployerPoints(
  employerType?: ParsedJob["employerType"] | null,
): number | null {
  if (employerType === "product_company") return 100;
  if (employerType === "agency") return 50;
  return null;
}

export function clientQualityDatePostedPoints(
  datePosted?: string | null,
): number | null {
  const value = datePosted?.trim();
  if (!value || value === POSTING_DETAIL_MISSING) return null;
  return isDatePostedWithin3Days(value) ? 100 : 60;
}

export function clientQualityHireAreaPoints(
  hireArea?: string | null,
): number | null {
  const value = hireArea?.trim();
  if (!value || value === POSTING_DETAIL_MISSING) return null;
  return isUnitedStatesHireArea(value) ? 100 : 0;
}

export function formatClientQualityLocationLabel(
  details?: JobPostingDetails | null,
): string | null {
  return formatClientLocationDisplay(
    details?.clientCity,
    details?.clientOrigin,
  );
}

export function clientQualityScoreFromPostingDetails(
  details: JobPostingDetails | null | undefined,
  profile?: ProfileScoringRow | null,
  employerType?: ParsedJob["employerType"] | null,
  jobText?: string | null,
): number | null {
  const points = [
    clientQualityPlatformPoints(detectJobPlatform(jobText)),
    clientQualityEmployerPoints(employerType),
    clientQualityDatePostedPoints(details?.datePosted),
    clientQualityHireAreaPoints(details?.hireArea),
    clientQualityLocationPoints(details?.clientOrigin, details?.clientCity),
    clientQualityRatingPoints(details?.clientRating),
    clientQualityAvgPayPoints(details?.clientAverageHourlyRate, profile),
  ].filter((score): score is number => score != null);

  if (points.length === 0) return null;
  return Math.round(points.reduce((sum, score) => sum + score, 0) / points.length);
}

export function clientQualityScoreFromJob(
  job: ParsedJob,
  profile?: ProfileScoringRow | null,
  jobText?: string | null,
): number | null {
  return clientQualityScoreFromPostingDetails(
    job.postingDetails ?? null,
    profile,
    job.employerType ?? null,
    jobText,
  );
}
