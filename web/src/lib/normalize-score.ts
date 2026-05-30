import { normalizePostingDetails } from "@/lib/posting-details";
import { resolvePostingContext } from "@/lib/posting-context";
import {
  coverageDetailForCategory,
  collectResumeWorkflowTokens,
} from "@/lib/coverage-detail";
import { resumeToolsMatchPool } from "@/lib/resume-tools";
import { recommendFromFitScore } from "@/lib/recommendation-bands";
import { buildReportRollupOptions } from "@/lib/report-rollup-context";
import { computeWeightedReportScore } from "@/lib/section-score-rollups";
import type {
  AnalysisResult,
  CategoryKey,
  CategoryScore,
  Compensation,
  CoverageMatchDetail,
  Narrative,
  ParsedJob,
  ParsedResume,
  PostingContext,
  ScoreResult,
} from "@/lib/types";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeMatchDetail(raw: unknown): CoverageMatchDetail[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => {
    const i = (item ?? {}) as Record<string, unknown>;
    const resumeMatch = i.resumeMatch ?? i.resumeSkill;
    return {
      label: typeof i.label === "string" ? i.label : "",
      matched: Boolean(i.matched),
      resumeMatch:
        typeof resumeMatch === "string" ? resumeMatch : null,
      listedInBonus: i.listedInBonus === true,
    };
  });
}

function normalizeCategoryScore(raw: unknown): CategoryScore {
  const c = (raw ?? {}) as Partial<CategoryScore> & Record<string, unknown>;
  const matchDetail =
    normalizeMatchDetail(c.matchDetail) ??
    normalizeMatchDetail(c.skillsDetail);

  return {
    category: (c.category as CategoryKey) ?? "skills",
    label: typeof c.label === "string" ? c.label : "",
    status:
      c.status === "match" || c.status === "mismatch" || c.status === "unknown"
        ? c.status
        : "unknown",
    score: Number(c.score) || 0,
    weight: Number(c.weight) || 0,
    contribution: Number(c.contribution) || 0,
    matchedCount:
      typeof c.matchedCount === "number" ? c.matchedCount : undefined,
    totalCount: typeof c.totalCount === "number" ? c.totalCount : undefined,
    matchDetail,
    skillsDetail: matchDetail,
  };
}

const COVERAGE_CATEGORIES: CategoryKey[] = ["skills", "tools"];

function hasResumeSignalsForCategory(
  category: CategoryKey,
  resume?: ParsedResume | null,
): boolean {
  if (!resume) return false;
  if (category === "skills") return (resume.skills?.length ?? 0) > 0;
  if (category === "tools") return resumeToolsMatchPool(resume).length > 0;
  return collectResumeWorkflowTokens(resume).length > 0;
}

function enrichCoverageCategories(
  score: ScoreResult,
  job: ParsedJob,
  resume?: ParsedResume | null,
  jobDescription?: string | null,
): ScoreResult {
  const categoryBreakdown = score.categoryBreakdown.map((c) => {
    if (!COVERAGE_CATEGORIES.includes(c.category) || c.status === "unknown") {
      return c;
    }

    const coverage = coverageDetailForCategory(
      c.category as "skills" | "workflow" | "tools",
      job,
      resume,
      jobDescription,
    );
    if (coverage.total === 0) return c;

    let { matched, total, items } = coverage;

    if (
      matched === 0 &&
      !(hasResumeSignalsForCategory(c.category, resume))
    ) {
      matched = Math.round((c.score / 100) * total);
      items = [];
    }

    const matchDetail =
      c.matchDetail?.length && hasResumeSignalsForCategory(c.category, resume)
        ? c.matchDetail
        : items.length
          ? items
          : c.matchDetail;

    return {
      ...c,
      matchedCount:
        typeof c.matchedCount === "number" ? c.matchedCount : matched,
      totalCount: typeof c.totalCount === "number" ? c.totalCount : total,
      matchDetail,
      skillsDetail: c.category === "skills" ? matchDetail : c.skillsDetail,
    };
  });

  return { ...score, categoryBreakdown };
}

/** Coerce API payloads (including pre-V1 analyze responses) into a full ScoreResult. */
export function normalizeScoreResult(
  score: unknown,
  options?: {
    parsedJob?: ParsedJob;
    parsedResume?: ParsedResume | null;
    jobDescription?: string | null;
    jobTitle?: string | null;
    profileDesiredCompensation?: Compensation | null;
    profileQualifiedIndustries?: string[] | null;
    profileCountry?: string | null;
    profileTimezone?: string | null;
  },
): ScoreResult {
  const s = (score ?? {}) as Partial<ScoreResult> & Record<string, unknown>;

  const scoringMode = s.scoringMode === "guest" ? "guest" : "registered";
  const categoryBreakdown = asArray<unknown>(s.categoryBreakdown).map(
    normalizeCategoryScore,
  );
  const baseScore: ScoreResult = {
    qualificationScore: Number(s.qualificationScore) || 0,
    confidenceScore: Number(s.confidenceScore) || 0,
    careerFitAdjustment: Number(s.careerFitAdjustment) || 0,
    fitScore: Number(s.fitScore) || 0,
    recommendation: "not_recommended",
    recommendationLabel: "",
    scoringMode,
    categoryBreakdown,
    unknownCategories: asArray<string>(s.unknownCategories),
    explanation: typeof s.explanation === "string" ? s.explanation : "",
    strengths: asArray<string>(s.strengths),
    gaps: asArray<string>(s.gaps),
    positiveSignalsFound: asArray<string>(s.positiveSignalsFound),
    negativeSignalsFound: asArray<string>(s.negativeSignalsFound),
  };

  const rollupOptions = buildReportRollupOptions({
    score: baseScore,
    parsedJob: options?.parsedJob,
    parsedResume: options?.parsedResume,
    profileDesiredCompensation: options?.profileDesiredCompensation,
    profileQualifiedIndustries: options?.profileQualifiedIndustries,
    profileCountry: options?.profileCountry,
    profileTimezone: options?.profileTimezone,
    jobDescription: options?.jobDescription,
    jobTitle: options?.jobTitle,
  });

  const reportFitScore = computeWeightedReportScore(
    categoryBreakdown,
    scoringMode === "guest",
    rollupOptions,
  );
  const fitScore = reportFitScore ?? (Number(s.fitScore) || 0);
  const { recommendation, label: recommendationLabel } =
    recommendFromFitScore(fitScore);

  const normalized: ScoreResult = {
    ...baseScore,
    fitScore,
    recommendation,
    recommendationLabel,
  };

  if (options?.parsedJob) {
    return enrichCoverageCategories(
      normalized,
      options.parsedJob,
      options.parsedResume,
      options.jobDescription,
    );
  }
  return normalized;
}

export function normalizeNarrative(narrative: unknown): Narrative {
  const n = (narrative ?? {}) as Partial<Narrative>;
  return {
    strengths: asArray<string>(n.strengths),
    gaps: asArray<string>(n.gaps),
    recommendations: asArray<string>(n.recommendations),
    positiveSignals: asArray<string>(n.positiveSignals),
    negativeSignals: asArray<string>(n.negativeSignals),
  };
}

function defaultParsedJob(): ParsedJob {
  return {
    skills: [],
    industries: [],
    workflows: [],
    compensation: null,
    toolRequirements: [],
    aiRequirements: [],
  };
}

function normalizePostingContext(
  raw: unknown,
  job: ParsedJob,
  jobDescription?: string | null,
): PostingContext {
  const resolved = resolvePostingContext(job, null, jobDescription);
  const p = raw as Partial<PostingContext> | undefined;
  if (p?.label && p.employerType && p.hireTarget) {
    return {
      ...resolved,
      employerType: p.employerType,
      hireTarget: p.hireTarget,
      label: p.label,
      detail: typeof p.detail === "string" ? p.detail : resolved.detail,
      engagementDuration: p.engagementDuration ?? resolved.engagementDuration,
      engagementPath: p.engagementPath ?? resolved.engagementPath,
      payStructure: p.payStructure ?? resolved.payStructure,
      badges: p.badges?.length ? p.badges : resolved.badges,
    };
  }
  return resolved;
}

function enrichParsedJob(
  parsedJob: ParsedJob,
  jobDescription: string | null | undefined,
  jobTitle: string | null | undefined,
): ParsedJob {
  const text = jobDescription?.trim();
  if (!text) return parsedJob;

  const postingDetails = normalizePostingDetails(parsedJob, text);
  const roleTitle =
    parsedJob.roleTitle?.trim() ||
    (typeof jobTitle === "string" && jobTitle.trim() ? jobTitle.trim() : null) ||
    parsedJob.roleTitle;

  return {
    ...parsedJob,
    postingDetails,
    ...(roleTitle ? { roleTitle } : {}),
  };
}

export function normalizeAnalysisResult(
  result: unknown,
  profile?: {
    profileDesiredCompensation?: Compensation | null;
    profileQualifiedIndustries?: string[] | null;
    profileCountry?: string | null;
    profileTimezone?: string | null;
  },
): AnalysisResult {
  const r = (result ?? {}) as Partial<AnalysisResult>;
  const jobDescription =
    typeof r.jobDescription === "string" ? r.jobDescription : null;
  const jobTitle = typeof r.jobTitle === "string" ? r.jobTitle : null;
  const parsedJob = enrichParsedJob(
    r.parsedJob ?? defaultParsedJob(),
    jobDescription,
    jobTitle,
  );
  const parsedResume = r.parsedResume ?? undefined;
  return {
    companyName: r.companyName ?? null,
    jobTitle,
    jobDescription,
    parsedJob,
    parsedResume,
    score: normalizeScoreResult(r.score, {
      parsedJob,
      parsedResume,
      jobDescription,
      jobTitle,
      profileDesiredCompensation: profile?.profileDesiredCompensation,
      profileQualifiedIndustries: profile?.profileQualifiedIndustries,
      profileCountry: profile?.profileCountry,
      profileTimezone: profile?.profileTimezone,
    }),
    narrative: normalizeNarrative(r.narrative),
    postingContext: normalizePostingContext(
      r.postingContext,
      parsedJob,
      jobDescription,
    ),
  };
}
