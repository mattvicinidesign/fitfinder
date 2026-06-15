/**
 * Green-pill rules for non-scored posting detail fields (Summary UI).
 */

import { archetypeSimilarity, buildArchetypeDetail } from "@/lib/archetype-match";
import { normalizeCountry } from "@/lib/country-match";
import { isHourlyCompensationWithinProfileRange } from "@/lib/compensation-match";
import {
  isClientAvgHourlyAtOrAboveProfile,
  isUnitedStatesClientOrigin,
  POSTING_DETAIL_MISSING,
} from "@/lib/posting-details";
import type { Compensation, ParsedJob, ParsedResume } from "@/lib/types";

const ARCHETYPE_MATCH_THRESHOLD = 50;

export interface PostingDetailHighlightContext {
  profileDesiredCompensation?: Compensation | null;
  parsedResume?: ParsedResume | null;
  parsedJob?: ParsedJob;
  jobTitle?: string | null;
}

export function parseClientRatingOutOfFive(label: string): number | null {
  if (!label || label === POSTING_DETAIL_MISSING) return null;
  const m = label.match(/(\d+(?:\.\d+)?)\s*(?:out\s+of\s+5|\/\s*5)/i);
  if (m) return Number.parseFloat(m[1]);
  const bare = label.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return Number.parseFloat(bare[1]);
  const first = label.match(/(\d+(?:\.\d+)?)/);
  if (first) {
    const rating = Number.parseFloat(first[1]);
    if (Number.isFinite(rating) && rating >= 0 && rating <= 5) return rating;
  }
  return null;
}

export function isClientRatingAtLeast3(label: string): boolean {
  const rating = parseClientRatingOutOfFive(label);
  return rating != null && rating >= 3;
}

export function isUnitedStatesHireArea(label: string): boolean {
  if (!label || label === POSTING_DETAIL_MISSING) return false;
  return normalizeCountry(label) === "us";
}

const US_FLAG_ICON = "🇺🇸";

/** Small flag prefix for Who Can Apply when the posting targets the United States. */
export function getPostingDetailBadgeIcon(
  key: string,
  value: string,
): string | undefined {
  if (key === "hireArea" && isUnitedStatesHireArea(value)) return US_FLAG_ICON;
  return undefined;
}

export function isRoleArchetypeMatch(
  roleLabel: string,
  ctx: PostingDetailHighlightContext,
): boolean {
  if (!roleLabel || roleLabel === POSTING_DETAIL_MISSING) return false;
  if (!ctx.parsedResume) return false;

  const jobForMatch: ParsedJob = {
    skills: [],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: [],
    aiRequirements: [],
    ...ctx.parsedJob,
    roleTitle: roleLabel,
  };

  const detail = buildArchetypeDetail(
    jobForMatch,
    ctx.parsedResume,
    ctx.jobTitle,
  );
  if (detail) return detail.bestScore >= ARCHETYPE_MATCH_THRESHOLD;

  const resumeRoles = [
    ...(ctx.parsedResume.roleTitle ? [ctx.parsedResume.roleTitle] : []),
    ...(ctx.parsedResume.archetypes ?? []),
  ];
  return resumeRoles.some(
    (r) => archetypeSimilarity(roleLabel, r) >= ARCHETYPE_MATCH_THRESHOLD,
  );
}

/** Posted less than 3 days ago (0–2 days). */
export function isDatePostedWithin3Days(label: string): boolean {
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

/**
 * Green when commitment is at least 30 hrs/week.
 * "Less than 30 hrs/week" stays neutral (not green).
 */
export function isHoursNeededAtLeast30PerWeek(label: string): boolean {
  if (!label || label === POSTING_DETAIL_MISSING) return false;
  const lower = label.toLowerCase();

  const lessThan = lower.match(/less\s+than\s+(\d+)\s+hrs?/);
  if (lessThan) {
    const cap = Number.parseInt(lessThan[1], 10);
    return Number.isFinite(cap) && cap > 30;
  }

  const moreThan = lower.match(/more\s+than\s+(\d+)\s+hrs?/);
  if (moreThan) {
    const floor = Number.parseInt(moreThan[1], 10);
    return Number.isFinite(floor) && floor >= 30;
  }

  const range = lower.match(/(\d+)\s*-\s*(\d+)\s+hrs?/);
  if (range) {
    const high = Number.parseInt(range[2], 10);
    return Number.isFinite(high) && high >= 30;
  }

  const atLeast = lower.match(/at\s+least\s+(\d+)\s+hrs?/);
  if (atLeast) {
    const n = Number.parseInt(atLeast[1], 10);
    return Number.isFinite(n) && n >= 30;
  }

  const plus = lower.match(/(\d+)\s*\+\s*hrs?/);
  if (plus) {
    const n = Number.parseInt(plus[1], 10);
    return Number.isFinite(n) && n >= 30;
  }

  return false;
}

/** Green when engagement is longer than one month. */
export function isDurationMoreThan1Month(label: string): boolean {
  if (!label || label === POSTING_DETAIL_MISSING) return false;
  const lower = label.toLowerCase();

  const lessThanMo = lower.match(/less\s+than\s+(\d+)\s+month/);
  if (lessThanMo) {
    const cap = Number.parseInt(lessThanMo[1], 10);
    if (Number.isFinite(cap) && cap <= 1) return false;
  }

  const moreThanMo = lower.match(/more\s+than\s+(\d+)\s+month/);
  if (moreThanMo) {
    const floor = Number.parseInt(moreThanMo[1], 10);
    return Number.isFinite(floor) && floor >= 1;
  }

  const rangeMo = lower.match(/(\d+)\s*to\s*(\d+)\s+month/);
  if (rangeMo) {
    const high = Number.parseInt(rangeMo[2], 10);
    return Number.isFinite(high) && high > 1;
  }

  const plusMo = lower.match(/(\d+)\+\s*month/);
  if (plusMo) {
    const n = Number.parseInt(plusMo[1], 10);
    return Number.isFinite(n) && n > 1;
  }

  const weeks = lower.match(/more\s+than\s+(\d+)\s+week/);
  if (weeks) {
    const w = Number.parseInt(weeks[1], 10);
    return Number.isFinite(w) && w > 4;
  }

  return false;
}

export function isPostingDetailHighlightPositive(
  key: string,
  value: string,
  ctx: PostingDetailHighlightContext,
): boolean {
  switch (key) {
    case "role":
      return isRoleArchetypeMatch(value, ctx);
    case "datePosted":
    case "hireArea":
      return false;
    case "clientRating":
      return isClientRatingAtLeast3(value);
    case "clientOrigin":
      return isUnitedStatesClientOrigin(value);
    case "clientAverageHourlyRate":
      return isClientAvgHourlyAtOrAboveProfile(
        value,
        ctx.profileDesiredCompensation,
      );
    case "hoursNeeded":
      return isHoursNeededAtLeast30PerWeek(value);
    case "duration":
      return isDurationMoreThan1Month(value);
    default:
      return false;
  }
}

export function isSummaryCompensationHighlightPositive(
  parsedJob: ParsedJob | undefined,
  profileDesiredCompensation: Compensation | null | undefined,
  parsedResume?: ParsedResume | null,
): boolean {
  const profileAsk =
    parsedResume?.desiredCompensation ?? profileDesiredCompensation ?? null;
  return isHourlyCompensationWithinProfileRange(
    parsedJob?.compensation,
    profileAsk,
  );
}
