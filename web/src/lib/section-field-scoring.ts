/**
 * Scoring items inside scoring category cards.
 * — Each identified item counts equally toward the category subtotal.
 * — Not Specified items are excluded (no penalty).
 * — Category weights toward the global score stay in SCORING_CATEGORY_WEIGHTS.
 */

import {
  buildAiEmphasisDetail,
  isAiEmphasisPreferenceMatch,
  jobHasAiEmphasis,
} from "@/lib/ai-emphasis-match";
import {
  buildCompensationDetail,
  formatCompensationDisplay,
  isHourlyCompensationWithinProfileRange,
  resolveJobCompensation,
} from "@/lib/compensation-match";
import {
  CLIENT_QUALITY_FIELD_LABELS,
  clientQualityAvgPayPoints,
  clientQualityDatePostedPoints,
  clientQualityEmployerPoints,
  clientQualityHireAreaPoints,
  clientQualityPlatformPoints,
  clientQualityRatingPoints,
  formatClientQualityLocationLabel,
  isExplicitClientAvgPayRate,
} from "@/lib/client-quality-scoring";
import { buildEmployerTypeMatchDetail } from "@/lib/company-type-match";
import { buildProjectTypeMatchDetail } from "@/lib/project-type-match";
import { buildEmployerRatingMatchDetail } from "@/lib/employer-rating-match";
import { buildClientAvgPayMatchDetail } from "@/lib/client-avg-pay-match";
import { buildEnglishLevelPreferenceDetail } from "@/lib/english-level-match";
import { detectJobPlatform } from "@/lib/job-platform";
import {
  formatHeaderDatePosted,
} from "@/lib/posting-header-meta";
import { preferredLocationMatchesCandidate } from "@/lib/country-match";
import {
  jobPreferredLocationDisplay,
  jobTimezoneRequirementDisplay,
} from "@/lib/job-posting-requirements";
import { resolveJobPreferredLocation } from "@/lib/preferred-qualifications-parse";
import { NOT_SPECIFIED_LABEL, isNotSpecifiedDisplay } from "@/lib/not-specified";
import {
  isPostingDetailHighlightPositive,
  isRoleArchetypeMatch,
  type PostingDetailHighlightContext,
} from "@/lib/posting-detail-highlights";
import {
  type PostingDetailRow,
} from "@/lib/posting-details";
import {
  coverageDetailForCategory,
  type CoverageResult,
} from "@/lib/coverage-detail";
import { buildIndustryDetail } from "@/lib/industry-match";
import type { SummaryMatchState } from "@/lib/summary-criteria";
import type {
  CategoryScore,
  Compensation,
  ParsedJob,
  ParsedResume,
  PostingContext,
} from "@/lib/types";
import type { ReportSectionId } from "@/lib/section-score-rollups";

/** One scoring item row (e.g. Timezone → America/Los Angeles). */
export interface SectionFieldScore {
  key: string;
  /** Scoring item label (e.g. "Timezone"). */
  title: string;
  /** Value pill text when identified in the posting. */
  badgeLabel: string;
  /** Secondary line under the pill (e.g. "Hourly" for pay bands). */
  badgeSubtext?: string | null;
  state: SummaryMatchState;
  /** False when posting has no value — excluded from category subtotal. */
  identified: boolean;
  /** 0–100 when identified; null when excluded. */
  points: number | null;
  /** Posting metadata only — render as plain text, not match/mismatch pills. */
  displayAsPlainText?: boolean;
  /** Informational only — blue pill, excluded from category score. */
  displayAsInformational?: boolean;
}

export interface SectionFieldOptions {
  badgeSubtext?: string | null;
  displayAsPlainText?: boolean;
  displayAsInformational?: boolean;
}

/** Posting facts that do not compare resume/profile — plain text in the UI. */
const POSTING_ONLY: SectionFieldOptions = { displayAsPlainText: true };

export interface SectionFieldScoreContext {
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileDesiredCompensation?: Compensation | null;
  profileQualifiedIndustries?: string[] | null;
  profileQualifiedSkills?: string[] | null;
  profileCountry?: string | null;
  profileTimezone?: string | null;
  profilePreferredCompanyTypes?: string[] | null;
  profilePreferredMinimumEmployerRating?: number | null;
  profilePreferredRegions?: string[] | null;
  profilePreferredProjectTypes?: string[] | null;
  profileMinimumHourlyRate?: number | null;
  jobDescription?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;
  postingContext?: PostingContext | null;
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
  options?: SectionFieldOptions,
): SectionFieldScore {
  return {
    key,
    title,
    identified,
    badgeLabel: identified ? badgeLabel : NOT_SPECIFIED_LABEL,
    badgeSubtext: identified ? (options?.badgeSubtext ?? null) : null,
    state: identified ? state : "unknown",
    points: identified ? points : null,
    displayAsPlainText: options?.displayAsPlainText ?? false,
    displayAsInformational: options?.displayAsInformational ?? false,
  };
}

function binaryField(
  key: string,
  title: string,
  identified: boolean,
  badgeLabel: string,
  matched: boolean,
  options?: SectionFieldOptions,
): SectionFieldScore {
  return field(
    key,
    title,
    identified,
    badgeLabel,
    matched ? "match" : "mismatch",
    identified ? (matched ? 100 : 0) : null,
    options,
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

function cleanPostingValue(value?: string | null): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || isNotSpecifiedDisplay(trimmed)) return "";
  return trimmed;
}

/** Prefer parsed posting details; ignore placeholder row values (e.g. "—"). */
function resolvedPostingDetailText(
  fromDetails?: string | null,
  row?: PostingDetailRow,
): string {
  const direct = cleanPostingValue(fromDetails);
  if (direct) return direct;
  if (!postingRowIdentified(row)) return "";
  return cleanPostingValue(row.value);
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

export function buildClientProfileFields(
  ctx: SectionFieldScoreContext,
  rows: PostingDetailRow[],
  _highlightCtx: PostingDetailHighlightContext,
): SectionFieldScore[] {

  const details = ctx.parsedJob?.postingDetails;
  const originRow = postingRowByKey(rows, "clientOrigin");
  const ratingRow = postingRowByKey(rows, "clientRating");
  const avgRow = postingRowByKey(rows, "clientAverageHourlyRate");
  const datePostedRow = postingRowByKey(rows, "datePosted");
  const hireAreaRow = postingRowByKey(rows, "hireArea");
  const profileComp =
    ctx.parsedResume?.desiredCompensation ?? ctx.profileDesiredCompensation ?? null;

  const fields: SectionFieldScore[] = [];

  const platform = detectJobPlatform(ctx.jobDescription);
  const platformPoints = clientQualityPlatformPoints(platform);
  fields.push(
    platformPoints != null
      ? field(
          "platform",
          CLIENT_QUALITY_FIELD_LABELS.platform,
          true,
          platform!,
          "match",
          platformPoints,
          POSTING_ONLY,
        )
      : field(
          "platform",
          CLIENT_QUALITY_FIELD_LABELS.platform,
          false,
          "",
          "unknown",
          null,
        ),
  );

  const employerType =
    ctx.postingContext?.employerType ??
    ctx.parsedJob?.employerType ??
    "unknown";
  const employerMatch = buildEmployerTypeMatchDetail({
    parsedJob: ctx.parsedJob,
    postingContext: ctx.postingContext,
    jobDescription: ctx.jobDescription,
    jobTitle: ctx.jobTitle,
    profilePreferredCompanyTypes: ctx.profilePreferredCompanyTypes,
  });

  if (employerMatch.identified && employerMatch.compareToProfile) {
    fields.push(
      field(
        "employerType",
        CLIENT_QUALITY_FIELD_LABELS.employerType,
        true,
        employerMatch.badgeLabel,
        employerMatch.matched ? "match" : "mismatch",
        employerMatch.points,
      ),
    );
  } else if (employerMatch.identified) {
    const employerPoints = clientQualityEmployerPoints(employerType);
    fields.push(
      field(
        "employerType",
        CLIENT_QUALITY_FIELD_LABELS.employerType,
        true,
        employerMatch.badgeLabel,
        employerPoints != null && employerPoints >= 50 ? "match" : "mismatch",
        employerPoints,
        POSTING_ONLY,
      ),
    );
  } else if (employerType === "unknown") {
    fields.push(
      field(
        "employerType",
        CLIENT_QUALITY_FIELD_LABELS.employerType,
        true,
        "Unknown",
        "unknown",
        null,
        POSTING_ONLY,
      ),
    );
  } else {
    fields.push(
      field(
        "employerType",
        CLIENT_QUALITY_FIELD_LABELS.employerType,
        false,
        "Unknown",
        "unknown",
        null,
      ),
    );
  }

  const datePostedValue =
    details?.datePosted?.trim() || datePostedRow?.value || "";
  const datePostedIdentified =
    postingRowIdentified(datePostedRow) || Boolean(details?.datePosted?.trim());
  const datePostedPoints = clientQualityDatePostedPoints(
    details?.datePosted ?? (datePostedIdentified ? datePostedValue : null),
  );
  const postedBadge =
    formatHeaderDatePosted(datePostedValue) ?? datePostedValue;
  fields.push(
    datePostedIdentified && datePostedPoints != null
      ? field(
          "datePosted",
          CLIENT_QUALITY_FIELD_LABELS.posted,
          true,
          postedBadge,
          datePostedPoints >= 50 ? "match" : "mismatch",
          datePostedPoints,
          POSTING_ONLY,
        )
      : field(
          "datePosted",
          CLIENT_QUALITY_FIELD_LABELS.posted,
          false,
          "",
          "unknown",
          null,
        ),
  );

  const hireAreaValue = details?.hireArea?.trim() || hireAreaRow?.value || "";
  const hireAreaIdentified =
    postingRowIdentified(hireAreaRow) || Boolean(details?.hireArea?.trim());
  const hireAreaPoints = clientQualityHireAreaPoints(
    details?.hireArea ?? (hireAreaIdentified ? hireAreaValue : null),
  );
  fields.push(
    hireAreaIdentified && hireAreaPoints != null
      ? field(
          "hireArea",
          CLIENT_QUALITY_FIELD_LABELS.applicants,
          true,
          hireAreaValue,
          hireAreaPoints >= 50 ? "match" : "mismatch",
          hireAreaPoints,
          POSTING_ONLY,
        )
      : field(
          "hireArea",
          CLIENT_QUALITY_FIELD_LABELS.applicants,
          false,
          "",
          "unknown",
          null,
        ),
  );

  const locationCountry = resolvedPostingDetailText(
    details?.clientOrigin,
    originRow,
  );
  const locationCity = cleanPostingValue(details?.clientCity) || null;
  const locationValue =
    formatClientQualityLocationLabel({
      clientCity: locationCity,
      clientOrigin: locationCountry || null,
    }) ?? "";
  const locationIdentified = Boolean(locationValue.trim());

  if (locationIdentified) {
    fields.push(
      field(
        "clientOrigin",
        CLIENT_QUALITY_FIELD_LABELS.location,
        true,
        locationValue,
        "unknown",
        null,
        { displayAsInformational: true },
      ),
    );
  } else {
    fields.push(
      field(
        "clientOrigin",
        CLIENT_QUALITY_FIELD_LABELS.location,
        false,
        "",
        "unknown",
        null,
      ),
    );
  }

  const ratingValue = details?.clientRating?.trim() || ratingRow?.value || "";
  const ratingIdentified =
    postingRowIdentified(ratingRow) || Boolean(details?.clientRating?.trim());
  const ratingMatch = buildEmployerRatingMatchDetail({
    clientRating: ratingIdentified ? ratingValue : null,
    profilePreferredMinimumEmployerRating:
      ctx.profilePreferredMinimumEmployerRating,
  });

  if (ratingMatch.identified && ratingMatch.compareToProfile) {
    fields.push(
      field(
        "clientRating",
        CLIENT_QUALITY_FIELD_LABELS.rating,
        true,
        ratingMatch.badgeLabel,
        ratingMatch.matched ? "match" : "mismatch",
        ratingMatch.points,
      ),
    );
  } else if (ratingMatch.identified) {
    const ratingPoints = clientQualityRatingPoints(details?.clientRating);
    fields.push(
      field(
        "clientRating",
        CLIENT_QUALITY_FIELD_LABELS.rating,
        true,
        ratingMatch.badgeLabel,
        ratingPoints != null && ratingPoints >= 50 ? "match" : "mismatch",
        ratingPoints,
        POSTING_ONLY,
      ),
    );
  } else {
    fields.push(
      field(
        "clientRating",
        CLIENT_QUALITY_FIELD_LABELS.rating,
        false,
        "",
        "unknown",
        null,
      ),
    );
  }

  const avgValue = resolvedPostingDetailText(
    details?.clientAverageHourlyRate,
    avgRow,
  );
  const avgIdentified = isExplicitClientAvgPayRate(avgValue);
  const avgMatch = buildClientAvgPayMatchDetail({
    avgPayLabel: avgIdentified ? avgValue : null,
    profileCompensation: profileComp,
    profileMinimumHourlyRate: ctx.profileMinimumHourlyRate,
  });

  if (avgMatch.identified && avgMatch.compareToProfile) {
    fields.push(
      field(
        "clientAverageHourlyRate",
        CLIENT_QUALITY_FIELD_LABELS.avgPayRate,
        true,
        avgMatch.badgeLabel,
        avgMatch.matched ? "match" : "mismatch",
        avgMatch.points,
      ),
    );
  } else if (avgMatch.identified) {
    const avgPoints = clientQualityAvgPayPoints(avgValue, profileComp);
    fields.push(
      field(
        "clientAverageHourlyRate",
        CLIENT_QUALITY_FIELD_LABELS.avgPayRate,
        true,
        avgMatch.badgeLabel,
        avgPoints != null && avgPoints >= 50 ? "match" : "mismatch",
        avgPoints,
        POSTING_ONLY,
      ),
    );
  } else {
    fields.push(
      field(
        "clientAverageHourlyRate",
        CLIENT_QUALITY_FIELD_LABELS.avgPayRate,
        false,
        "",
        "unknown",
        null,
      ),
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
  const aiDetail = buildAiEmphasisDetail(
    ctx.parsedJob,
    ctx.parsedResume,
    ctx.jobDescription,
  );

  let aiIdentified = Boolean(
    aiCat && aiCat.status !== "unknown",
  );
  if (!aiIdentified) {
    aiIdentified = jobHasAiEmphasis(ctx.parsedJob, ctx.jobDescription);
  }

  let aiState: SummaryMatchState = "unknown";
  let aiPoints: number | null = null;
  let aiLabel = NOT_SPECIFIED_LABEL;
  if (aiIdentified && aiCat) {
    const aiPts = categoryPoints(aiCat);
    aiState = aiPts.state;
    aiPoints = aiPts.points;
    aiLabel =
      aiPts.state === "unknown"
        ? NOT_SPECIFIED_LABEL
        : aiPts.state === "match"
          ? "YES"
          : "NO";
    if (aiDetail && aiState !== "match" && isAiEmphasisPreferenceMatch(aiDetail)) {
      aiState = "match";
      aiPoints = 100;
      aiLabel = "YES";
    }
  } else if (aiIdentified && aiDetail) {
    const matched = isAiEmphasisPreferenceMatch(aiDetail);
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

  const englishDetail = buildEnglishLevelPreferenceDetail(
    ctx.jobDescription,
    ctx.profileCountry,
  );

  return [
    field(
      "locationPreferred",
      "Region",
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
    field(
      "englishLevel",
      "English Level",
      englishDetail.identified,
      englishDetail.identified ? englishDetail.badgeLabel : NOT_SPECIFIED_LABEL,
      englishDetail.identified
        ? englishDetail.matched
          ? "match"
          : "mismatch"
        : "unknown",
      englishDetail.points,
    ),
    field("aiEmphasis", "AI Emphasis", aiIdentified, aiLabel, aiState, aiPoints),
  ];
}

function buildIndustryField(ctx: SectionFieldScoreContext): SectionFieldScore {
  const job = ctx.parsedJob;
  if (!job) {
    return field("industry", "Industry", false, "", "unknown", null);
  }

  const detail = buildIndustryDetail(
    job,
    ctx.parsedResume,
    ctx.profileQualifiedIndustries,
  );

  if (!detail || detail.jobIndustries.length === 0) {
    return field("industry", "Industry", false, "", "unknown", null);
  }

  const label = detail.jobIndustries.join(", ");
  const points = detail.bestScore;
  const matched = points >= 50;

  return field(
    "industry",
    "Industry",
    true,
    label,
    matched ? "match" : "mismatch",
    points,
  );
}

function buildProjectTypeField(ctx: SectionFieldScoreContext): SectionFieldScore {
  const detail = buildProjectTypeMatchDetail({
    parsedJob: ctx.parsedJob,
    postingContext: ctx.postingContext,
    jobDescription: ctx.jobDescription,
    profilePreferredProjectTypes: ctx.profilePreferredProjectTypes,
  });

  if (!detail.identified) {
    return field("projectType", "Project Type", false, "", "unknown", null);
  }

  if (detail.compareToProfile) {
    return field(
      "projectType",
      "Project Type",
      true,
      detail.label,
      detail.matched ? "match" : "mismatch",
      detail.points,
    );
  }

  return field(
    "projectType",
    "Project Type",
    true,
    detail.label,
    "match",
    100,
    POSTING_ONLY,
  );
}

export function buildRoleDetailsFields(
  ctx: SectionFieldScoreContext,
  rows: PostingDetailRow[],
  highlightCtx: PostingDetailHighlightContext,
): SectionFieldScore[] {
  const roleRow = postingRowByKey(rows, "role");

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

  fields.push(buildIndustryField(ctx));
  fields.push(buildCompensationField(ctx));
  fields.push(buildProjectTypeField(ctx));

  return fields;
}

function buildCompensationField(ctx: SectionFieldScoreContext): SectionFieldScore {
  const resumeAsk =
    ctx.parsedResume?.desiredCompensation ?? ctx.profileDesiredCompensation ?? null;
  const payDisplayOpts: SectionFieldOptions | undefined = resumeAsk
    ? undefined
    : POSTING_ONLY;
  const jobComp = resolveJobCompensation(ctx.parsedJob, ctx.jobDescription);
  const display = formatCompensationDisplay(jobComp);
  const compDetail = buildCompensationDetail(jobComp, resumeAsk);
  const compCategory = lookupCategory(ctx.breakdown, "compensation");

  if (!display) {
    return field("compensation", "Pay", false, "", "unknown", null);
  }

  const withinProfileRange = isHourlyCompensationWithinProfileRange(
    jobComp,
    resumeAsk,
  );

  if (withinProfileRange) {
    return field(
      "compensation",
      "Pay",
      true,
      display.amountLabel,
      "match",
      100,
      { badgeSubtext: display.periodLabel },
    );
  }

  const cat = categoryPoints(compCategory);
  if (cat.identified) {
    return field(
      "compensation",
      "Pay",
      true,
      display.amountLabel,
      cat.state,
      cat.points,
      { badgeSubtext: display.periodLabel, ...payDisplayOpts },
    );
  }

  const matched = compDetail.alignment === "within_range";
  return field(
    "compensation",
    "Pay",
    true,
    display.amountLabel,
    matched ? "match" : "mismatch",
    matched ? 100 : 0,
    { badgeSubtext: display.periodLabel, ...payDisplayOpts },
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

/** About Client card — only these rows are shown and drive the category score. */
export const CLIENT_PROFILE_DISPLAY_KEYS = new Set([
  "employerType",
  "clientOrigin",
  "clientRating",
  "clientAverageHourlyRate",
]);

export function clientProfileDisplayFields(
  fields: SectionFieldScore[],
): SectionFieldScore[] {
  return fields.filter((f) => CLIENT_PROFILE_DISPLAY_KEYS.has(f.key));
}

export function clientProfileCategorySubtotal(
  fields: SectionFieldScore[],
): number | null {
  return equalWeightSectionSubtotal(clientProfileDisplayFields(fields));
}

export function clientProfileFieldFraction(
  fields: SectionFieldScore[],
): { matched: number; total: number } | null {
  return sectionFieldFraction(clientProfileDisplayFields(fields));
}

/** Role Alignment — only profile-compared rows. */
export function roleAlignmentScoringFields(
  fields: SectionFieldScore[],
): SectionFieldScore[] {
  return fields.filter(
    (f) => f.identified && f.points != null && !f.displayAsPlainText,
  );
}

export function roleAlignmentCategorySubtotal(
  fields: SectionFieldScore[],
): number | null {
  return equalWeightSectionSubtotal(roleAlignmentScoringFields(fields));
}

export function roleAlignmentFieldFraction(
  fields: SectionFieldScore[],
): { matched: number; total: number } | null {
  return sectionFieldFraction(roleAlignmentScoringFields(fields));
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
