// Fit Finder V1 Qualification Engine — single source of truth.
//
// Pure, deterministic scoring: match | mismatch | unknown per category.
// Unknown categories are excluded from qualification (never penalized).
// Confidence is separate and never blended into fit.

import type {
  CategoryKey,
  CategoryScore,
  Compensation,
  MatchStatus,
  ParsedJob,
  ParsedResume,
  Recommendation,
  ScoreResult,
} from "./types.ts";
import {
  ARCHETYPE_SIMILARITY,
  CATEGORY_LABELS,
  CONSUMER_MOBILE_MITIGATIONS,
  CONSUMER_MOBILE_SIGNALS,
  GUEST_WEIGHTS,
  HIGH_PENALTY_ROLES,
  HIGH_PENALTY_SIGNALS,
  MEDIUM_PENALTY_ROLES,
  MEDIUM_PENALTY_SIGNALS,
  POSITIVE_SIGNALS,
  RECOMMENDATION_BANDS,
  REGISTERED_WEIGHTS,
  type ScoringMode,
} from "./scoring_constants.ts";
import { industrySimilarity, normalizeIndustryList } from "./tech_industries.ts";

export type { ScoringMode };

export interface ScoreFitOptions {
  mode?: ScoringMode;
  jobTitle?: string | null;
}

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toSet(tokens: string[]): Set<string> {
  return new Set(tokens.map(normalize).filter((t) => t.length > 0));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function hasItems(list: string[] | undefined | null): boolean {
  return (list?.length ?? 0) > 0;
}

/** Count job requirements matched on the resume (same rules as coverage). */
function coverageCounts(
  required: string[],
  candidate: string[],
): { matched: number; total: number } {
  const req = [...toSet(required)];
  if (req.length === 0) return { matched: 0, total: 0 };
  const cand = [...toSet(candidate)];
  let matched = 0;
  for (const r of req) {
    const hit = cand.some((c) => c === r || c.includes(r) || r.includes(c));
    if (hit) matched += 1;
  }
  return { matched, total: req.length };
}

/** Fraction of required items matched (0–1). Used only when requirements exist. */
function coverage(required: string[], candidate: string[]): number {
  const { matched, total } = coverageCounts(required, candidate);
  if (total === 0) return 1;
  return matched / total;
}

function categoryResult(
  category: CategoryKey,
  status: MatchStatus,
  score: number,
  weight: number,
  counts?: { matched: number; total: number },
): CategoryScore {
  const contribution = status === "unknown" ? 0 : round(weight * (score / 100));
  const result: CategoryScore = {
    category,
    label: CATEGORY_LABELS[category],
    status,
    score: status === "unknown" ? 0 : round(score),
    weight,
    contribution,
  };
  if (counts && counts.total > 0) {
    result.matchedCount = counts.matched;
    result.totalCount = counts.total;
  }
  return result;
}

function collectResumeWorkflowTokens(resume: ParsedResume): string[] {
  const tokens: string[] = [
    ...resume.archetypes,
    ...resume.skills,
    ...resume.tools,
  ];
  for (const job of resume.workHistory) {
    tokens.push(job.title);
    if (job.summary) tokens.push(job.summary);
  }
  return tokens;
}

function scoreSkills(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  if (!hasItems(job.skills)) {
    return categoryResult("skills", "unknown", 0, weight);
  }
  if (!hasItems(resume.skills)) {
    return categoryResult("skills", "unknown", 0, weight);
  }
  const counts = coverageCounts(job.skills, resume.skills);
  const pct = (counts.matched / counts.total) * 100;
  const status: MatchStatus = pct >= 50 ? "match" : "mismatch";
  return categoryResult("skills", status, pct, weight, counts);
}

function scoreIndustry(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  const jobIndustries = normalizeIndustryList(job.industries).industries;
  const resumeIndustries = normalizeIndustryList(resume.industries).industries;

  if (!hasItems(jobIndustries)) {
    return categoryResult("industry", "unknown", 0, weight);
  }
  if (!hasItems(resumeIndustries)) {
    return categoryResult("industry", "unknown", 0, weight);
  }

  let best = 0;
  for (const j of jobIndustries) {
    for (const r of resumeIndustries) {
      best = Math.max(best, industrySimilarity(j, r));
    }
  }

  const status: MatchStatus = best >= 50 ? "match" : "mismatch";
  return categoryResult("industry", status, best, weight);
}

function scoreWorkflow(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  if (!hasItems(job.workflows)) {
    return categoryResult("workflow", "unknown", 0, weight);
  }
  const resumeTokens = collectResumeWorkflowTokens(resume);
  if (resumeTokens.length === 0) {
    return categoryResult("workflow", "unknown", 0, weight);
  }
  const counts = coverageCounts(job.workflows, resumeTokens);
  const pct = (counts.matched / counts.total) * 100;
  const status: MatchStatus = pct >= 40 ? "match" : "mismatch";
  return categoryResult("workflow", status, pct, weight, counts);
}

function scoreTools(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  if (!hasItems(job.toolRequirements)) {
    return categoryResult("tools", "unknown", 0, weight);
  }
  if (!hasItems(resume.tools)) {
    return categoryResult("tools", "unknown", 0, weight);
  }
  const counts = coverageCounts(job.toolRequirements, resume.tools);
  const pct = (counts.matched / counts.total) * 100;
  const status: MatchStatus = pct >= 50 ? "match" : "mismatch";
  return categoryResult("tools", status, pct, weight, counts);
}

function inferAiMaturity(signals: string[]): number | null {
  if (signals.length === 0) return null;
  const text = signals.map(normalize).join(" ");

  if (
    /ai[- ]?native|agentic|llm product|foundation model|genai[- ]?first/.test(text)
  ) return 100;
  if (/ai[- ]?heavy|heavy ai|copilot|generative ai|genai/.test(text)) return 75;
  if (/ai[- ]?assisted|ml[- ]?assisted|chatgpt|claude|openai|prompt/.test(text)) {
    return 50;
  }
  if (/ai|machine learning|ml|llm|rag/.test(text)) return 25;
  return 0;
}

function scoreAiEmphasis(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  const jobSignals = job.aiRequirements ?? [];
  const jobLevel = job.aiMaturityLevel ?? inferAiMaturity(jobSignals);

  if (jobLevel === null && !hasItems(jobSignals)) {
    return categoryResult("aiEmphasis", "unknown", 0, weight);
  }

  const resumeSignals = [
    ...resume.aiExperience,
    ...resume.skills,
    ...resume.tools,
  ];
  const resumeLevel = inferAiMaturity(resumeSignals);

  if (resumeLevel === null) {
    return categoryResult("aiEmphasis", "unknown", 0, weight);
  }

  const required = jobLevel ?? 50;
  const gap = Math.abs(required - resumeLevel);
  const score = clamp(100 - gap * 1.2, 0, 100);
  const status: MatchStatus = score >= 45 ? "match" : "mismatch";
  return categoryResult("aiEmphasis", status, score, weight);
}

function archetypeSimilarity(roleA: string, roleB: string): number {
  const a = normalize(roleA);
  const b = normalize(roleB);
  if (!a || !b) return 0;
  if (a === b || a.includes(b) || b.includes(a)) return 100;

  for (const [base, map] of Object.entries(ARCHETYPE_SIMILARITY)) {
    if (a.includes(base) || base.includes(a)) {
      for (const [other, score] of Object.entries(map)) {
        if (b.includes(other) || other.includes(b)) return score;
      }
    }
  }

  const tokensA = a.split(" ");
  const tokensB = b.split(" ");
  const overlap = tokensA.filter((t) => tokensB.includes(t) && t.length > 2).length;
  if (overlap >= 2) return 75;
  if (overlap === 1) return 50;
  return 20;
}

function scoreArchetype(
  resume: ParsedResume,
  job: ParsedJob,
  weight: number,
  jobTitle?: string | null,
): CategoryScore {
  const jobRole = job.roleTitle ?? jobTitle ?? "";
  if (!jobRole.trim()) {
    return categoryResult("archetype", "unknown", 0, weight);
  }

  const resumeRoles = [
    ...(resume.roleTitle ? [resume.roleTitle] : []),
    ...resume.archetypes,
    ...resume.workHistory.map((w) => w.title),
  ];
  if (resumeRoles.length === 0) {
    return categoryResult("archetype", "unknown", 0, weight);
  }

  let best = 0;
  for (const r of resumeRoles) {
    best = Math.max(best, archetypeSimilarity(jobRole, r));
  }

  const status: MatchStatus = best >= 50 ? "match" : "mismatch";
  return categoryResult("archetype", status, best, weight);
}

function scoreSoftwareModel(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  const jobModels = job.softwareModels ?? [];
  const resumeModels = resume.softwareModels ?? [];

  if (!hasItems(jobModels)) {
    return categoryResult("softwareModel", "unknown", 0, weight);
  }
  if (!hasItems(resumeModels)) {
    return categoryResult("softwareModel", "unknown", 0, weight);
  }

  const pct = coverage(jobModels, resumeModels) * 100;
  const status: MatchStatus = pct >= 50 ? "match" : "mismatch";
  return categoryResult("softwareModel", status, pct, weight);
}

function annualize(comp: Compensation): number | null {
  const base = comp.max ?? comp.min;
  if (base == null) return null;
  if (comp.period === "month") return base * 12;
  if (comp.period === "hour") return base * 2080;
  return base;
}

/** Candidate ask: midpoint when min+max range, else top of range. */
function annualizeDesired(comp: Compensation): number | null {
  let base: number | null = null;
  if (comp.min != null && comp.max != null) {
    base = (comp.min + comp.max) / 2;
  } else {
    base = comp.max ?? comp.min ?? null;
  }
  if (base == null) return null;
  if (comp.period === "month") return base * 12;
  if (comp.period === "hour") return base * 2080;
  return base;
}

function scoreCompensation(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  if (!job.compensation) {
    return categoryResult("compensation", "unknown", 0, weight);
  }
  const desired = resume.desiredCompensation;
  if (!desired) {
    return categoryResult("compensation", "unknown", 0, weight);
  }

  const want = annualizeDesired(desired);
  const offerMin = annualize({
    ...job.compensation,
    max: job.compensation.min,
    min: job.compensation.min,
  });
  const offerMax = annualize(job.compensation);

  if (want == null || offerMax == null) {
    return categoryResult("compensation", "unknown", 0, weight);
  }

  const floor = offerMin ?? offerMax * 0.9;
  const ceiling = offerMax;

  let score = 100;
  if (want > ceiling) {
    const over = (want - ceiling) / ceiling;
    score = clamp(100 - over * 80, 20, 100);
  } else if (want < floor * 0.85) {
    const under = (floor - want) / floor;
    score = clamp(100 - under * 60, 15, 100);
  }

  const status: MatchStatus = score >= 55 ? "match" : "mismatch";
  return categoryResult("compensation", status, score, weight);
}

function normalizeCountry(value: string): string {
  const n = normalize(value);
  if (n === "us" || n === "usa" || n.includes("united states")) return "us";
  return n;
}

function scoreCountry(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  const req = job.countryRequirement;
  if (!req?.trim()) {
    return categoryResult("country", "unknown", 0, weight);
  }
  const cand = resume.country;
  if (!cand?.trim()) {
    return categoryResult("country", "unknown", 0, weight);
  }

  const match = normalizeCountry(req) === normalizeCountry(cand);
  const score = match ? 100 : 15;
  const status: MatchStatus = match ? "match" : "mismatch";
  return categoryResult("country", status, score, weight);
}

function scoreTimezone(resume: ParsedResume, job: ParsedJob, weight: number): CategoryScore {
  const req = job.timezoneRequirement;
  if (!req?.trim()) {
    return categoryResult("timezone", "unknown", 0, weight);
  }
  const cand = resume.timezone;
  if (!cand?.trim()) {
    return categoryResult("timezone", "unknown", 0, weight);
  }

  const nr = normalize(req);
  const nc = normalize(cand);
  const overlap = nr === nc || nr.includes(nc) || nc.includes(nr);
  const score = overlap ? 100 : 40;
  const status: MatchStatus = overlap ? "match" : "mismatch";
  return categoryResult("timezone", status, score, weight);
}

function computeQualification(categories: CategoryScore[]): number {
  const known = categories.filter((c) => c.status !== "unknown");
  const availableWeight = known.reduce((s, c) => s + c.weight, 0);
  if (availableWeight === 0) return 50;

  const contributionSum = known.reduce((s, c) => s + c.contribution, 0);
  return round((contributionSum / availableWeight) * 100);
}

function computeConfidence(
  categories: CategoryScore[],
  resume: ParsedResume,
  job: ParsedJob,
  mode: ScoringMode,
): number {
  const totalWeight = mode === "guest"
    ? Object.values(GUEST_WEIGHTS).reduce((a, b) => a + (b ?? 0), 0)
    : Object.values(REGISTERED_WEIGHTS).reduce((a, b) => a + b, 0);

  const unknownWeight = categories
    .filter((c) => c.status === "unknown")
    .reduce((s, c) => s + c.weight, 0);

  const informationAvailability = clamp(1 - unknownWeight / totalWeight, 0, 1);

  const jobFields = [
    job.skills,
    job.industries,
    job.workflows,
    job.toolRequirements,
    job.aiRequirements,
    job.softwareModels ?? [],
    job.roleTitle ? [job.roleTitle] : [],
  ];
  const jobFilled = jobFields.filter((f) => hasItems(f as string[])).length / jobFields.length;

  const resumeFields = [
    resume.skills,
    resume.industries,
    resume.tools,
    resume.aiExperience,
    resume.archetypes,
    resume.workHistory,
  ];
  const resumeFilled =
    resumeFields.filter((f) => (Array.isArray(f) ? f.length > 0 : false)).length /
    resumeFields.length;

  return round(
    100 * (0.5 * informationAvailability + 0.25 * jobFilled + 0.25 * resumeFilled),
  );
}

function buildTextBlob(
  resume: ParsedResume,
  job: ParsedJob,
  jobTitle?: string | null,
): string {
  const parts = [
    jobTitle ?? "",
    job.roleTitle ?? "",
    ...job.skills,
    ...job.industries,
    ...job.workflows,
    ...job.toolRequirements,
    ...job.aiRequirements,
    ...(job.softwareModels ?? []),
    ...resume.skills,
    ...resume.industries,
    ...resume.archetypes,
    ...resume.tools,
    ...resume.aiExperience,
    ...resume.workHistory.map((w) => `${w.title} ${w.summary ?? ""}`),
  ];
  return normalize(parts.join(" "));
}

function computeCareerFitAdjustment(blob: string): {
  adjustment: number;
  positiveSignalsFound: string[];
  negativeSignalsFound: string[];
} {
  let adjustment = 0;
  const positiveSignalsFound: string[] = [];
  const negativeSignalsFound: string[] = [];

  for (const role of HIGH_PENALTY_ROLES) {
    if (blob.includes(role)) {
      adjustment -= 8;
      negativeSignalsFound.push(`Role signal: ${role}`);
    }
  }
  for (const signal of HIGH_PENALTY_SIGNALS) {
    if (blob.includes(signal)) {
      adjustment -= 6;
      negativeSignalsFound.push(signal);
    }
  }
  for (const role of MEDIUM_PENALTY_ROLES) {
    if (blob.includes(role)) {
      adjustment -= 5;
      negativeSignalsFound.push(`Role signal: ${role}`);
    }
  }
  for (const signal of MEDIUM_PENALTY_SIGNALS) {
    if (blob.includes(signal)) {
      adjustment -= 4;
      negativeSignalsFound.push(signal);
    }
  }

  const consumerHit = CONSUMER_MOBILE_SIGNALS.some((s) => blob.includes(s));
  if (consumerHit) {
    const mitigated = CONSUMER_MOBILE_MITIGATIONS.some((s) => blob.includes(s));
    adjustment -= mitigated ? 2 : 6;
    negativeSignalsFound.push("Consumer mobile / lifestyle product signals");
  }

  for (const signal of POSITIVE_SIGNALS) {
    if (blob.includes(signal)) {
      adjustment += 4;
      positiveSignalsFound.push(signal);
    }
  }

  adjustment = clamp(adjustment, -25, 15);
  return { adjustment: round(adjustment), positiveSignalsFound, negativeSignalsFound };
}

function recommend(fitScore: number): { recommendation: Recommendation; label: string } {
  for (const band of RECOMMENDATION_BANDS) {
    if (fitScore >= band.min) {
      return { recommendation: band.recommendation, label: band.label };
    }
  }
  return RECOMMENDATION_BANDS[RECOMMENDATION_BANDS.length - 1];
}

function buildExplanation(
  qualificationScore: number,
  categories: CategoryScore[],
  unknownCategories: string[],
  adjustment: number,
  fitScore: number,
): string {
  const known = categories.filter((c) => c.status !== "unknown");
  const lines = [
    `Qualification ${qualificationScore}% from ${known.length} scored categories (${known.map((c) => `${c.label} ${c.score}%`).join(", ")}).`,
  ];
  if (unknownCategories.length) {
    lines.push(
      `Excluded from scoring (not treated as mismatch): ${unknownCategories.join(", ")}.`,
    );
  }
  lines.push(
    `Career fit adjustment ${adjustment >= 0 ? "+" : ""}${adjustment} → final fit ${fitScore}%.`,
  );
  return lines.join(" ");
}

function buildStrengthsAndGaps(categories: CategoryScore[]): {
  strengths: string[];
  gaps: string[];
} {
  const strengths: string[] = [];
  const gaps: string[] = [];

  for (const c of categories) {
    if (c.status === "unknown") continue;
    if (c.score >= 75) {
      strengths.push(`${c.label}: strong alignment (${c.score}%).`);
    } else if (c.score < 50) {
      gaps.push(`${c.label}: limited alignment (${c.score}%).`);
    }
  }

  return { strengths, gaps };
}

/**
 * V1 Qualification Engine — score a parsed resume against a parsed job.
 */
export function scoreFit(
  resume: ParsedResume,
  job: ParsedJob,
  options: ScoreFitOptions = {},
): ScoreResult {
  const mode: ScoringMode = options.mode ?? "registered";
  const jobTitle = options.jobTitle ?? null;

  const weights = mode === "guest" ? GUEST_WEIGHTS : REGISTERED_WEIGHTS;
  const categories: CategoryScore[] = [];

  const scoreCategory = (
    key: CategoryKey,
    scorer: (w: number) => CategoryScore,
  ) => {
    const w = weights[key];
    if (w == null || w === 0) return;
    categories.push(scorer(w));
  };

  scoreCategory("skills", (w) => scoreSkills(resume, job, w));
  scoreCategory("industry", (w) => scoreIndustry(resume, job, w));
  scoreCategory("workflow", (w) => scoreWorkflow(resume, job, w));
  scoreCategory("tools", (w) => scoreTools(resume, job, w));
  scoreCategory("aiEmphasis", (w) => scoreAiEmphasis(resume, job, w));
  scoreCategory("archetype", (w) => scoreArchetype(resume, job, w, jobTitle));
  scoreCategory("softwareModel", (w) => scoreSoftwareModel(resume, job, w));
  scoreCategory("compensation", (w) => scoreCompensation(resume, job, w));
  scoreCategory("country", (w) => scoreCountry(resume, job, w));
  scoreCategory("timezone", (w) => scoreTimezone(resume, job, w));

  const unknownCategories = categories
    .filter((c) => c.status === "unknown")
    .map((c) => c.label);

  const qualificationScore = computeQualification(categories);
  const confidenceScore = computeConfidence(categories, resume, job, mode);

  const blob = buildTextBlob(resume, job, jobTitle);
  const {
    adjustment: careerFitAdjustment,
    positiveSignalsFound,
    negativeSignalsFound,
  } = computeCareerFitAdjustment(blob);

  const fitScore = round(clamp(qualificationScore + careerFitAdjustment, 0, 100));
  const { recommendation, label: recommendationLabel } = recommend(fitScore);

  const { strengths, gaps } = buildStrengthsAndGaps(categories);
  const explanation = buildExplanation(
    qualificationScore,
    categories,
    unknownCategories,
    careerFitAdjustment,
    fitScore,
  );

  return {
    qualificationScore,
    confidenceScore,
    careerFitAdjustment,
    fitScore,
    recommendation,
    recommendationLabel,
    scoringMode: mode,
    categoryBreakdown: categories,
    unknownCategories,
    explanation,
    strengths,
    gaps,
    positiveSignalsFound,
    negativeSignalsFound,
  };
}
