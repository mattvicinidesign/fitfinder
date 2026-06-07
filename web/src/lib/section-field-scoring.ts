/**
 * Scoring items inside scoring category cards.
 * — Each identified item counts equally toward the category subtotal.
 * — Not Specified items are excluded (no penalty).
 * — Category weights toward the global score stay in SCORING_CATEGORY_WEIGHTS.
 */

import { buildAiEmphasisDetail } from "@/lib/ai-emphasis-match";
import {
  buildCompensationDetail,
  formatCompensation,
  isHourlyCompensationWithinProfileRange,
} from "@/lib/compensation-match";
import {
  buildClientOriginTimezoneSummary,
  clientOriginTimezoneToneToSummaryState,
  extractTimezoneFromAboutClient,
} from "@/lib/client-origin-timezone";
import { buildIndustryDetail } from "@/lib/industry-match";
import { preferredLocationMatchesCandidate } from "@/lib/country-match";
import {
  jobPreferredLocationDisplay,
  jobTimezoneRequirementDisplay,
} from "@/lib/job-posting-requirements";
import { resolveJobPreferredLocation } from "@/lib/preferred-qualifications-parse";
import { NOT_SPECIFIED_LABEL, isNotSpecifiedDisplay } from "@/lib/not-specified";
import {
  isClientRatingAtLeast3,
  isDurationMoreThan1Month,
  isHoursNeededAtLeast30PerWeek,
  isPostingDetailHighlightPositive,
  isRoleArchetypeMatch,
  type PostingDetailHighlightContext,
} from "@/lib/posting-detail-highlights";
import {
  isClientAvgHourlyAtOrAboveProfile,
  POSTING_DETAIL_MISSING,
  type PostingDetailRow,
} from "@/lib/posting-details";
import {
  coverageDetailForCategory,
  type CoverageResult,
} from "@/lib/coverage-detail";
import { talentTypeDisplay } from "@/lib/talent-type-display";
import type { SummaryMatchState } from "@/lib/summary-criteria";
import type {
  CategoryScore,
  Compensation,
  ParsedJob,
  ParsedResume,
} from "@/lib/types";
import type { ReportSectionId } from "@/lib/section-score-rollups";

/** One scoring item row (e.g. Timezone → America/Los Angeles). */
export interface SectionFieldScore {
  key: string;
  /** Scoring item label (e.g. "Timezone"). */
  title: string;
  /** Value pill text when identified in the posting. */
  badgeLabel: string;
  state: SummaryMatchState;
  /** False when posting has no value — excluded from category subtotal. */
  identified: boolean;
  /** 0–100 when identified; null when excluded. */
  points: number | null;
}

export interface SectionFieldScoreContext {
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  breakdown: CategoryScore[];
  isGuest: boolean;
}

function lookupCategory(
  breakdown: CategoryScore[],
  key: string,
): CategoryScore | undefined {
  return breakdown.find((c) => c.category === key);
}

function field(
  key: string,
  title: string,
  identified: boolean,
  badgeLabel: string,
  state: SummaryMatchState,
  points: number | null,
): SectionFieldScore {
  return {
    key,
    title,
    identified,
    badgeLabel: identified ? badgeLabel : NOT_SPECIFIED_LABEL,
    state: identified ? state : "unknown",
    points: identified ? points : null,
  };
}

function binaryField(
  key: string,
  title: string,
  identified: boolean,
  badgeLabel: string,
  matched: boolean,
): SectionFieldScore {
  return field(
    key,
    title,
    identified,
    badgeLabel,
    matched ? "match" : "mismatch",
    identified ? (matched ? 100 : 0) : null,
  );
}

function categoryPoints(c?: CategoryScore): {
  identified: boolean;
  points: number | null;
  state: SummaryMatchState;
} {
  if (!c || c.status === "unknown") {
    return { identified: false, points: null, state: "unknown" };
  }
  const pts = Math.round(c.score);
  return {
    identified: true,
    points: pts,
    state: c.status === "match" ? "match" : "mismatch",
  };
}

function postingRowIdentified(row?: PostingDetailRow): row is PostingDetailRow {
  return Boolean(row && !row.missing);
}

function postingRowByKey(
  rows: PostingDetailRow[],
  key: string,
): PostingDetailRow | undefined {
  return rows.find((r) => r.key === key);
}

function postingRowField(
  row: PostingDetailRow | undefined,
  highlightCtx: PostingDetailHighlightContext,
): SectionFieldScore {
  const key = row?.key ?? "unknown";
  const title = row?.title ?? "Field";
  if (!postingRowIdentified(row)) {
    return field(key, title, false, "", "unknown", null);
  }
  const matched = isPostingDetailHighlightPositive(
    row.key,
    row.value,
    highlightCtx,
  );
  return binaryField(row.key, row.title, true, row.value, matched);
}

function isExplicitClientAvgPayRate(value: string): boolean {
  return (
    !isNotSpecifiedDisplay(value) &&
    value !== POSTING_DETAIL_MISSING &&
    !value.includes("(job budget)")
  );
}

export function buildClientProfileFields(
  ctx: SectionFieldScoreContext,
  rows: PostingDetailRow[],
  highlightCtx: PostingDetailHighlightContext,
): SectionFieldScore[] {
  const originRow = postingRowByKey(rows, "clientOrigin");
  const ratingRow = postingRowByKey(rows, "clientRating");
  const avgRow = postingRowByKey(rows, "clientAverageHourlyRate");

  const clientOrigin = ctx.parsedJob?.postingDetails?.clientOrigin?.trim() ?? "";
  const userTimezone =
    ctx.parsedResume?.timezone?.trim() || ctx.profileTimezone?.trim() || null;
  const tzFromPosting =
    extractTimezoneFromAboutClient(ctx.jobDescription ?? "") != null ||
    Boolean(clientOrigin);
  const tzSummary = buildClientOriginTimezoneSummary(clientOrigin, userTimezone, {
    jobDescription: ctx.jobDescription,
    clientCity: ctx.parsedJob?.postingDetails?.clientCity?.trim() || null,
  });

  const timezoneIdentified = tzFromPosting && !isNotSpecifiedDisplay(tzSummary.label);
  // Green / matched only on an exact timezone match with the user's timezone.
  // Same country, different timezone (e.g. PST client vs CST user) does not count.
  const timezoneMatched =
    timezoneIdentified &&
    clientOriginTimezoneToneToSummaryState(tzSummary.tone) === "match";

  const fields: SectionFieldScore[] = [
    postingRowIdentified(originRow)
      ? postingRowField(originRow, highlightCtx)
      : field("clientOrigin", "Location", false, "", "unknown", null),
    field(
      "timezone",
      "Timezone",
      timezoneIdentified,
      tzSummary.label,
      timezoneMatched ? "match" : "unknown",
      timezoneIdentified ? (timezoneMatched ? 100 : 0) : null,
    ),
  ];

  if (ratingRow) {
    fields.push(
      postingRowIdentified(ratingRow)
        ? binaryField(
            "clientRating",
            "Rating",
            true,
            ratingRow.value,
            isClientRatingAtLeast3(ratingRow.value),
          )
        : field("clientRating", "Rating", false, "", "unknown", null),
    );
  }

  if (avgRow) {
    const identified = postingRowIdentified(avgRow) &&
      isExplicitClientAvgPayRate(avgRow.value);
    fields.push(
      identified
        ? binaryField(
            "clientAverageHourlyRate",
            "Avg. Rate",
            true,
            avgRow.value,
            isClientAvgHourlyAtOrAboveProfile(
              avgRow.value,
              highlightCtx.profileDesiredCompensation,
            ),
          )
        : field("clientAverageHourlyRate", "Avg. Rate", false, "", "unknown", null),
    );
  }

  return fields;
}

export function buildClientPreferencesFields(
  ctx: SectionFieldScoreContext,
): SectionFieldScore[] {
  const locationOptions = {
    jobDescription: ctx.jobDescription,
    parsedResume: ctx.parsedResume,
    profileCountry: ctx.profileCountry,
  };
  const locationDisplay = jobPreferredLocationDisplay(
    ctx.parsedJob,
    locationOptions,
  );
  const timezoneDisplay = jobTimezoneRequirementDisplay(ctx.parsedJob, {
    jobDescription: ctx.jobDescription,
  });
  const talent = talentTypeDisplay(ctx.jobDescription);
  const pqLocation = resolveJobPreferredLocation(
    ctx.parsedJob,
    ctx.jobDescription,
  );
  const candidateCountry =
    ctx.parsedResume?.country?.trim() ?? ctx.profileCountry?.trim() ?? null;
  const countryRow = lookupCategory(ctx.breakdown, "country");
  const countryCat = categoryPoints(countryRow);
  const tzCat = categoryPoints(lookupCategory(ctx.breakdown, "timezone"));
  const aiCat = lookupCategory(ctx.breakdown, "aiEmphasis");
  const aiDetail = buildAiEmphasisDetail(ctx.parsedJob, ctx.parsedResume);

  let aiIdentified = Boolean(
    aiCat && aiCat.status !== "unknown",
  );
  if (!aiIdentified && aiDetail) {
    aiIdentified =
      aiDetail.jobRequirements.length > 0 || aiDetail.jobMaturity != null;
  }

  let aiState: SummaryMatchState = "unknown";
  let aiPoints: number | null = null;
  let aiLabel = NOT_SPECIFIED_LABEL;
  if (aiIdentified && aiCat) {
    const aiPts = categoryPoints(aiCat);
    aiState = aiPts.state;
    aiPoints = aiPts.points;
    aiLabel =
      aiPts.state === "unknown" ? "—" : aiPts.state === "match" ? "YES" : "NO";
  } else if (aiIdentified && aiDetail) {
    const matched =
      aiDetail.matched.length > 0 && aiDetail.missing.length === 0;
    aiState = matched ? "match" : "mismatch";
    aiPoints = matched ? 100 : 0;
    aiLabel = matched ? "YES" : "NO";
  }

  const locationIdentified = locationDisplay.hasExplicitRequirement;
  const locationMatched =
    locationIdentified &&
    (pqLocation
      ? preferredLocationMatchesCandidate(pqLocation, candidateCountry)
      : countryCat.identified
        ? countryCat.state === "match" || (countryCat.points ?? 0) >= 50
        : false);

  const tzReqIdentified = timezoneDisplay.hasExplicitRequirement;
  const tzReqMatched = tzReqIdentified
    ? tzCat.identified
      ? tzCat.state === "match" || (tzCat.points ?? 0) >= 50
      : false
    : false;

  return [
    field(
      "locationPreferred",
      "Location",
      locationIdentified,
      locationDisplay.badgeLabel,
      locationMatched ? "match" : "mismatch",
      locationIdentified ? (locationMatched ? 100 : countryCat.points ?? 0) : null,
    ),
    field(
      "timezonePreferred",
      "Timezone",
      tzReqIdentified,
      timezoneDisplay.badgeLabel,
      tzReqMatched ? "match" : "mismatch",
      tzReqIdentified ? (tzReqMatched ? 100 : tzCat.points ?? 0) : null,
    ),
    binaryField(
      "talentType",
      "Type",
      talent.hasExplicitRequirement,
      talent.badgeLabel,
      talent.positive,
    ),
    field("aiEmphasis", "AI", aiIdentified, aiLabel, aiState, aiPoints),
  ];
}

export function buildRoleDetailsFields(
  ctx: SectionFieldScoreContext,
  rows: PostingDetailRow[],
  highlightCtx: PostingDetailHighlightContext,
): SectionFieldScore[] {
  const roleRow = postingRowByKey(rows, "role");
  const hoursRow = postingRowByKey(rows, "hoursNeeded");
  const durationRow = postingRowByKey(rows, "duration");
  const industryCat = lookupCategory(ctx.breakdown, "industry");
  const industryDetail = ctx.parsedJob
    ? buildIndustryDetail(
        ctx.parsedJob,
        ctx.parsedResume,
        ctx.profileQualifiedIndustries,
      )
    : null;
  const industryIdentified = Boolean(
    industryDetail && industryDetail.jobIndustries.length > 0,
  );
  const industryPts = categoryPoints(industryCat);

  const fields: SectionFieldScore[] = [];

  const roleIdentified = postingRowIdentified(roleRow);
  fields.push(
    roleIdentified
      ? binaryField(
          "role",
          "Title",
          true,
          roleRow!.value,
          isRoleArchetypeMatch(roleRow!.value, highlightCtx),
        )
      : field("role", "Title", false, "", "unknown", null),
  );

  const industryLabel =
    industryDetail?.jobIndustries.join(", ") ??
    (industryCat?.status !== "unknown" ? "Industry fit" : NOT_SPECIFIED_LABEL);
  fields.push(
    field(
      "industry",
      "Industry",
      industryIdentified,
      industryLabel,
      industryPts.state,
      industryIdentified ? industryPts.points : null,
    ),
  );

  if (!ctx.isGuest) {
    fields.push(buildCompensationField(ctx));

    fields.push(
      postingRowIdentified(hoursRow)
        ? binaryField(
            "hoursNeeded",
            "Hours",
            true,
            hoursRow!.value,
            isHoursNeededAtLeast30PerWeek(hoursRow!.value),
          )
        : field("hoursNeeded", "Hours", false, "", "unknown", null),
    );

    fields.push(
      postingRowIdentified(durationRow)
        ? binaryField(
            "duration",
            "Duration",
            true,
            durationRow!.value,
            isDurationMoreThan1Month(durationRow!.value),
          )
        : field("duration", "Duration", false, "", "unknown", null),
    );
  }

  return fields;
}

function buildCompensationField(ctx: SectionFieldScoreContext): SectionFieldScore {
  const resumeAsk =
    ctx.parsedResume?.desiredCompensation ?? ctx.profileDesiredCompensation ?? null;
  const compDetail = buildCompensationDetail(
    ctx.parsedJob?.compensation,
    resumeAsk,
  );
  const compCategory = lookupCategory(ctx.breakdown, "compensation");
  const jobHasComp =
    Boolean(ctx.parsedJob?.compensation) ||
    Boolean(compDetail.jobOfferLabel);

  if (!jobHasComp) {
    return field("compensation", "Pay", false, "", "unknown", null);
  }

  const withinProfileRange = isHourlyCompensationWithinProfileRange(
    ctx.parsedJob?.compensation,
    resumeAsk,
  );
  const jobOfferLabel =
    compDetail.jobOfferLabel?.replace(/\$/g, "").trim() ??
    formatCompensation(ctx.parsedJob?.compensation)?.replace(/\$/g, "").trim() ??
    "—";

  if (withinProfileRange) {
    return field("compensation", "Pay", true, jobOfferLabel, "match", 100);
  }

  const cat = categoryPoints(compCategory);
  if (cat.identified) {
    return field(
      "compensation",
      "Pay",
      true,
      jobOfferLabel,
      cat.state,
      cat.points,
    );
  }

  const matched = compDetail.alignment === "within_range";
  return field(
    "compensation",
    "Pay",
    true,
    jobOfferLabel,
    matched ? "match" : "mismatch",
    matched ? 100 : 0,
  );
}

function slugForQualificationKeyword(label: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "keyword";
}

/** One scoring item per posting keyword (100 if matched, 0 if not). */
function qualificationKeywordFields(
  group: "skills" | "tools",
  coverage: CoverageResult,
): SectionFieldScore[] {
  return coverage.items.map((item) => {
    const matched = item.matched;
    return field(
      `${group}:${slugForQualificationKeyword(item.label)}`,
      item.label,
      true,
      item.label,
      matched ? "match" : "mismatch",
      matched ? 100 : 0,
    );
  });
}

/**
 * Qualifications category: each skill and tool keyword from the posting counts
 * equally (e.g. Prototyping = Product Design, Figma = After Effects).
 */
export function buildQualificationsFields(
  ctx: SectionFieldScoreContext,
): SectionFieldScore[] {
  const job = ctx.parsedJob;
  if (!job) return [];

  const fields: SectionFieldScore[] = [];

  const skillsCoverage = coverageDetailForCategory(
    "skills",
    job,
    ctx.parsedResume,
    ctx.jobDescription,
    ctx.profileQualifiedSkills,
  );
  fields.push(...qualificationKeywordFields("skills", skillsCoverage));

  const toolsCoverage = coverageDetailForCategory(
    "tools",
    job,
    ctx.parsedResume,
    ctx.jobDescription,
  );
  fields.push(...qualificationKeywordFields("tools", toolsCoverage));

  return fields;
}

/**
 * Category subtotal: simple average of identified scoring items (equal weight each).
 * Not Specified items are excluded. Returns null when nothing is identified.
 */
export function equalWeightSectionSubtotal(
  fields: SectionFieldScore[],
): number | null {
  const active = fields.filter((f) => f.identified && f.points != null);
  if (active.length === 0) return null;
  const sum = active.reduce((acc, f) => acc + (f.points ?? 0), 0);
  return Math.round(sum / active.length);
}

/** @alias equalWeightSectionSubtotal */
export const scoringCategorySubtotal = equalWeightSectionSubtotal;

/**
 * Matched / identified item count for a category (e.g. 4/4).
 * A matched item is an identified field with a full (green) match.
 */
export function sectionFieldFraction(
  fields: SectionFieldScore[],
): { matched: number; total: number } | null {
  const active = fields.filter((f) => f.identified && f.points != null);
  if (active.length === 0) return null;
  const matched = active.filter(
    (f) => f.state === "match" || (f.points ?? 0) >= 100,
  ).length;
  return { matched, total: active.length };
}

export function buildSectionFields(
  sectionId: ReportSectionId,
  ctx: SectionFieldScoreContext,
  postingRows: PostingDetailRow[],
  highlightCtx: PostingDetailHighlightContext,
): SectionFieldScore[] {
  switch (sectionId) {
    case "clientProfile":
      return buildClientProfileFields(ctx, postingRows, highlightCtx);
    case "clientPreferences":
      return buildClientPreferencesFields(ctx);
    case "roleDetails":
      return buildRoleDetailsFields(ctx, postingRows, highlightCtx);
    case "categoryMatching":
      return buildQualificationsFields(ctx);
    default:
      return [];
  }
}
