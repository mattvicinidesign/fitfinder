import { resolvePostingContext } from "@/lib/posting-context";
import {
  coverageDetailForCategory,
  collectResumeWorkflowTokens,
} from "@/lib/coverage-detail";
import { resumeToolsMatchPool } from "@/lib/resume-tools";
import type {
  AnalysisResult,
  CategoryKey,
  CategoryScore,
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
  },
): ScoreResult {
  const s = (score ?? {}) as Partial<ScoreResult> & Record<string, unknown>;

  const base: ScoreResult = {
    qualificationScore: Number(s.qualificationScore) || 0,
    confidenceScore: Number(s.confidenceScore) || 0,
    careerFitAdjustment: Number(s.careerFitAdjustment) || 0,
    fitScore: Number(s.fitScore) || 0,
    recommendation:
      s.recommendation === "strong_apply" ||
      s.recommendation === "apply" ||
      s.recommendation === "stretch" ||
      s.recommendation === "not_recommended"
        ? s.recommendation
        : "stretch",
    recommendationLabel:
      typeof s.recommendationLabel === "string" ? s.recommendationLabel : "",
    scoringMode: s.scoringMode === "guest" ? "guest" : "registered",
    categoryBreakdown: asArray<unknown>(s.categoryBreakdown).map(normalizeCategoryScore),
    unknownCategories: asArray<string>(s.unknownCategories),
    explanation: typeof s.explanation === "string" ? s.explanation : "",
    strengths: asArray<string>(s.strengths),
    gaps: asArray<string>(s.gaps),
    positiveSignalsFound: asArray<string>(s.positiveSignalsFound),
    negativeSignalsFound: asArray<string>(s.negativeSignalsFound),
  };

  if (options?.parsedJob) {
    return enrichCoverageCategories(
      base,
      options.parsedJob,
      options.parsedResume,
      options.jobDescription,
    );
  }
  return base;
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
): PostingContext {
  const p = raw as Partial<PostingContext> | undefined;
  if (p?.label && p.employerType && p.hireTarget) {
    return {
      employerType: p.employerType,
      hireTarget: p.hireTarget,
      label: p.label,
      detail: typeof p.detail === "string" ? p.detail : null,
    };
  }
  return resolvePostingContext(job);
}

export function normalizeAnalysisResult(result: unknown): AnalysisResult {
  const r = (result ?? {}) as Partial<AnalysisResult>;
  const parsedJob = r.parsedJob ?? defaultParsedJob();
  const parsedResume = r.parsedResume ?? undefined;
  return {
    companyName: r.companyName ?? null,
    jobTitle: r.jobTitle ?? null,
    parsedJob,
    parsedResume,
    score: normalizeScoreResult(r.score, {
      parsedJob,
      parsedResume,
      jobDescription: r.jobDescription,
    }),
    narrative: normalizeNarrative(r.narrative),
    postingContext: normalizePostingContext(r.postingContext, parsedJob),
  };
}
