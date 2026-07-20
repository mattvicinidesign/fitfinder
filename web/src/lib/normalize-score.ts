import { normalizePostingDetails, resolveJobTitle, resolveRoleTitle } from "@/lib/posting-details";
import { normalizeParsedJob } from "@/lib/normalize-parsed-job";
import { resolveJobCompensation } from "@/lib/compensation-match";
import { resolvePostingContext } from "@/lib/posting-context";
import {
  coverageDetailForCategory,
  collectResumeWorkflowTokens,
} from "@/lib/coverage-detail";
import { resumeToolsMatchPool } from "@/lib/resume-tools";
import { normalizeOpportunityCategories } from "@/lib/opportunity-categories";
import { recommendFromFitScore } from "@/lib/recommendation-bands";
import {
  hasSemanticReport,
  normalizeSemanticMatchReport,
  resolveSemanticFitScore,
} from "@/lib/semantic-report";
import { buildReportRollupOptions } from "@/lib/report-rollup-context";
import { resolveReportFitScore } from "@/lib/report-fit-score";
import type {
  AnalysisResult,
  CategoryKey,
  CategoryScore,
  Compensation,
  CoverageMatchDetail,
  Narrative,
  OpportunityCategoryScore,
  OpportunityEngineDebug,
  ParsedJob,
  ParsedResume,
  PostingContext,
  Recommendation,
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
  profileQualifiedSkills?: string[] | null,
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
      c.category === "skills" ? profileQualifiedSkills : undefined,
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

function normalizeOpportunityCategory(raw: unknown): OpportunityCategoryScore {
  const c = (raw ?? {}) as Partial<OpportunityCategoryScore> & Record<string, unknown>;
  return {
    category:
      (c.category as OpportunityCategoryScore["category"]) ?? "roleAlignment",
    label: typeof c.label === "string" ? c.label : "",
    score: Number(c.score) || 0,
    weight: Number(c.weight) || 0,
    contribution: Number(c.contribution) || 0,
    matchedCount:
      typeof c.matchedCount === "number" ? c.matchedCount : undefined,
    totalCount: typeof c.totalCount === "number" ? c.totalCount : undefined,
    matchedLabels: asArray<string>(c.matchedLabels),
    missingLabels: asArray<string>(c.missingLabels),
    details: asArray<string>(c.details),
  };
}

function normalizeOpportunityDebug(raw: unknown): OpportunityEngineDebug | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const d = raw as Partial<OpportunityEngineDebug> & Record<string, unknown>;
  return {
    detectedRoleArchetype:
      typeof d.detectedRoleArchetype === "string" ? d.detectedRoleArchetype : null,
    roleArchetypeTier:
      d.roleArchetypeTier === "positive" ||
      d.roleArchetypeTier === "negative" ||
      d.roleArchetypeTier === "neutral" ||
      d.roleArchetypeTier === "unknown"
        ? d.roleArchetypeTier
        : "unknown",
    detectedIndustries: asArray<string>(d.detectedIndustries),
    matchedQualifications: asArray<string>(d.matchedQualifications),
    missingQualifications: asArray<string>(d.missingQualifications),
    preferencesApplied: asArray<string>(d.preferencesApplied),
    preferenceMismatches: asArray<string>(
      d.preferenceMismatches ?? d.redFlagsTriggered,
    ),
    categoryScores: asArray<unknown>(d.categoryScores).map(normalizeOpportunityCategory),
    weightingCalculation:
      typeof d.weightingCalculation === "string" ? d.weightingCalculation : "",
    finalReasoning: typeof d.finalReasoning === "string" ? d.finalReasoning : "",
    parsedJobMetadata:
      d.parsedJobMetadata && typeof d.parsedJobMetadata === "object"
        ? (d.parsedJobMetadata as Record<string, unknown>)
        : {},
  };
}

function normalizeRecommendation(value: unknown): Recommendation {
  if (
    value === "strong_apply" ||
    value === "apply" ||
    value === "stretch" ||
    value === "not_recommended"
  ) {
    return value;
  }
  return "not_recommended";
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
    profileQualifiedSkills?: string[] | null;
    profileCountry?: string | null;
    profileTimezone?: string | null;
  },
): ScoreResult {
  const s = (score ?? {}) as Partial<ScoreResult> & Record<string, unknown>;

  const scoringMode = s.scoringMode === "guest" ? "guest" : "registered";
  const categoryBreakdown = asArray<unknown>(s.categoryBreakdown).map(
    normalizeCategoryScore,
  );
  const opportunityCategories = normalizeOpportunityCategories(
    asArray<unknown>(s.opportunityCategories).map(normalizeOpportunityCategory),
  );
  const opportunityDebug = normalizeOpportunityDebug(s.opportunityDebug);
  const semanticMatchReport = normalizeSemanticMatchReport(s.semanticMatchReport);

  const baseScore: ScoreResult = {
    qualificationScore: Number(s.qualificationScore) || 0,
    confidenceScore: Number(s.confidenceScore) || 0,
    careerFitAdjustment: Number(s.careerFitAdjustment) || 0,
    fitScore: Number(s.fitScore) || 0,
    recommendation: normalizeRecommendation(s.recommendation),
    recommendationLabel:
      typeof s.recommendationLabel === "string" ? s.recommendationLabel : "",
    scoringMode,
    categoryBreakdown,
    ...(opportunityCategories.length ? { opportunityCategories } : {}),
    ...(opportunityDebug ? { opportunityDebug } : {}),
    ...(semanticMatchReport ? { semanticMatchReport } : {}),
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
    profileQualifiedSkills: options?.profileQualifiedSkills,
    profileCountry: options?.profileCountry,
    profileTimezone: options?.profileTimezone,
    jobDescription: options?.jobDescription,
    jobTitle: options?.jobTitle,
  });

  const fitScore = hasSemanticReport(baseScore)
    ? resolveSemanticFitScore(baseScore)
    : resolveReportFitScore(baseScore, rollupOptions);
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
      options.profileQualifiedSkills,
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
    resolveRoleTitle(jobTitle, text, parsedJob.roleTitle) ?? parsedJob.roleTitle;
  const compensation = resolveJobCompensation(parsedJob, text);

  return normalizeParsedJob(
    {
      ...parsedJob,
      postingDetails,
      ...(roleTitle ? { roleTitle } : {}),
      ...(compensation ? { compensation } : { compensation: null }),
    },
    text,
    jobTitle,
  );
}

export function normalizeAnalysisResult(
  result: unknown,
  profile?: {
    profileDesiredCompensation?: Compensation | null;
    profileQualifiedIndustries?: string[] | null;
    profileQualifiedSkills?: string[] | null;
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
      profileQualifiedSkills: profile?.profileQualifiedSkills,
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
