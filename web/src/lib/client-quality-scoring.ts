/**
 * Client Quality scoring items from job posting metadata:
 * platform, employer type, posting metadata, location, rating, and avg pay rate.
 */

import { formatClientLocationDisplay } from "@/lib/client-location-parse";
import {
  extractClientNameFromJobDescription,
  formatHeaderDatePosted,
  headerEmployerKindLabel,
} from "@/lib/posting-header-meta";
import {
  isDatePostedWithin3Days,
  isUnitedStatesHireArea,
} from "@/lib/posting-detail-highlights";
import {
  isClientAvgHourlyAtOrAboveProfile,
  isUnitedStatesClientOrigin,
  parseHourlyRateFromLabel,
  POSTING_DETAIL_MISSING,
  type JobPostingDetails,
} from "@/lib/posting-details";
import { detectJobPlatform, type JobPlatform } from "@/lib/job-platform";
import type { Compensation } from "@/lib/types";

export const CLIENT_QUALITY_FIELD_LABELS = {
  platform: "Platform",
  employerType: "Employer Type",
  posted: "Posted",
  applicants: "Who Can Apply",
  location: "Region",
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

export function resolveClientQualityClientName(
  companyName?: string | null,
  jobDescription?: string | null,
): string {
  return (
    companyName?.trim() ||
    extractClientNameFromJobDescription(jobDescription) ||
    "Upwork Client"
  );
}

function clientHasExplicitName(
  companyName?: string | null,
  jobDescription?: string | null,
): boolean {
  return Boolean(
    companyName?.trim() || extractClientNameFromJobDescription(jobDescription),
  );
}

/** Named client = 100; anonymous Upwork Client = 70. */
export function clientQualityClientPoints(
  companyName?: string | null,
  jobDescription?: string | null,
): number {
  return clientHasExplicitName(companyName, jobDescription) ? 100 : 70;
}

export function clientQualityPlatformPoints(
  platform: JobPlatform | null,
): number | null {
  if (!platform) return null;
  return 100;
}

export function clientQualityEmployerPoints(
  employerType?: "agency" | "product_company" | "unknown" | null,
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

export interface ClientQualityScoreExtras {
  companyName?: string | null;
  jobDescription?: string | null;
  employerType?: "agency" | "product_company" | "unknown" | null;
}

/** Equal-weight average of identified About-the-client items (0–100). */
export function clientQualityScoreFromPostingDetails(
  details: JobPostingDetails | null | undefined,
  profileCompensation?: Compensation | null,
  extras?: ClientQualityScoreExtras,
): number | null {
  const points = [
    clientQualityPlatformPoints(detectJobPlatform(extras?.jobDescription)),
    clientQualityEmployerPoints(extras?.employerType),
    clientQualityDatePostedPoints(details?.datePosted),
    clientQualityHireAreaPoints(details?.hireArea),
    clientQualityLocationPoints(details?.clientOrigin, details?.clientCity),
    clientQualityRatingPoints(details?.clientRating),
    clientQualityAvgPayPoints(details?.clientAverageHourlyRate, profileCompensation),
  ].filter((score): score is number => score != null);

  if (points.length === 0) return null;
  return Math.round(points.reduce((sum, score) => sum + score, 0) / points.length);
}
