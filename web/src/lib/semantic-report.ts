import {
  SEMANTIC_CATEGORY_LABELS,
  SEMANTIC_CATEGORY_WEIGHTS,
  remapSemanticCategoryKey,
  type CompetencyMatchResult,
  type ImportanceLevel,
  type MatchKind,
  type SemanticCategoryKey,
  type SemanticCategoryScore,
  type SemanticMatchReport,
  type ScoreResult,
} from "@/lib/types";
import {
  areMatchScoreWeightsValid,
  matchScoreWeightsFromProfile,
  type MatchScoreWeights,
} from "@/lib/match-score-weights";
import { formatScoreOnTen } from "@/lib/use-score-reveal";

export const SEMANTIC_CATEGORY_ORDER: SemanticCategoryKey[] = [
  "skillsTools",
  "experience",
  "responsibilities",
  "domainBackground",
];

export { SEMANTIC_CATEGORY_LABELS, SEMANTIC_CATEGORY_WEIGHTS };

export const GLOBAL_SEMANTIC_SCORE_INFO =
  "Your overall match for this role based on resume evidence compared to job requirements. Four weighted categories measure skills & tools, experience, responsibilities, and domain & background.";

export function hasSemanticReport(
  score: { semanticMatchReport?: SemanticMatchReport | null },
): boolean {
  return (score.semanticMatchReport?.categoryScores?.length ?? 0) > 0;
}

export function getSemanticReport(
  score: { semanticMatchReport?: SemanticMatchReport | null },
): SemanticMatchReport | null {
  return hasSemanticReport(score) ? score.semanticMatchReport! : null;
}

export function resolveSemanticFitScore(
  score: { semanticMatchReport?: SemanticMatchReport | null; fitScore: number },
): number {
  return getSemanticReport(score)?.overallMatchPercent ?? score.fitScore;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeImportance(value: unknown): ImportanceLevel {
  if (value === "preferred" || value === "bonus") return value;
  return "required";
}

function normalizeMatchKind(value: unknown): MatchKind {
  if (
    value === "exact" ||
    value === "strong" ||
    value === "partial" ||
    value === "weak" ||
    value === "missing"
  ) {
    return value;
  }
  return "missing";
}

function normalizeCategoryKey(value: unknown): SemanticCategoryKey {
  return remapSemanticCategoryKey(value);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function contributionFor(weight: number, score: number): number {
  return round1(weight * (score / 100));
}

function computeOverallMatchPercent(
  categoryScores: SemanticCategoryScore[],
): number {
  let total = 0;
  for (const row of categoryScores) total += row.contribution;
  return Math.round(Math.max(0, Math.min(100, total)));
}

/** True when weights cover all four modern categories and sum to 100. */
export function isModernMatchScoreWeightSet(
  weights: Partial<Record<SemanticCategoryKey, number | null | undefined>>,
): boolean {
  const resolved = {} as MatchScoreWeights;
  for (const key of SEMANTIC_CATEGORY_ORDER) {
    const value = weights[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return false;
    }
    resolved[key] = Math.round(value);
  }
  return areMatchScoreWeightsValid(resolved);
}

export function normalizeCompetencyMatch(raw: unknown): CompetencyMatchResult {
  const m = (raw ?? {}) as Partial<CompetencyMatchResult> & Record<string, unknown>;
  return {
    jobCompetencyId: typeof m.jobCompetencyId === "string" ? m.jobCompetencyId : "",
    jobLabel: typeof m.jobLabel === "string" ? m.jobLabel : "",
    resumeCompetencyId:
      typeof m.resumeCompetencyId === "string" ? m.resumeCompetencyId : null,
    resumeLabel: typeof m.resumeLabel === "string" ? m.resumeLabel : null,
    canonicalLabel: typeof m.canonicalLabel === "string" ? m.canonicalLabel : "",
    category: normalizeCategoryKey(m.category),
    importance: normalizeImportance(m.importance),
    similarityScore: Math.max(0, Math.min(100, Number(m.similarityScore) || 0)),
    matchKind: normalizeMatchKind(m.matchKind),
    evidenceCount: Math.max(0, Number(m.evidenceCount) || 0),
    reasoning: typeof m.reasoning === "string" ? m.reasoning : "",
  };
}

export function normalizeSemanticCategoryScore(raw: unknown): SemanticCategoryScore {
  const c = (raw ?? {}) as Partial<SemanticCategoryScore> & Record<string, unknown>;
  const rawCategory = typeof c.category === "string" ? c.category : "";
  const category = normalizeCategoryKey(c.category);
  const legacyCategory =
    rawCategory !== "" &&
    rawCategory !== category &&
    !(SEMANTIC_CATEGORY_ORDER as string[]).includes(rawCategory);
  return {
    category,
    label:
      typeof c.label === "string" ? c.label : SEMANTIC_CATEGORY_LABELS[category],
    score: Math.max(0, Math.min(100, Number(c.score) || 0)),
    weight: Number(c.weight) || SEMANTIC_CATEGORY_WEIGHTS[category],
    contribution: Number(c.contribution) || 0,
    matched: asArray<unknown>(c.matched).map(normalizeCompetencyMatch),
    partial: asArray<unknown>(c.partial).map(normalizeCompetencyMatch),
    missing: asArray<unknown>(c.missing).map(normalizeCompetencyMatch),
    reasoning: typeof c.reasoning === "string" ? c.reasoning : "",
    ...(legacyCategory ? { _legacyCategory: rawCategory } : {}),
  } as SemanticCategoryScore;
}

/**
 * Re-apply Fit Score category weights to an existing semantic report.
 * Category scores stay the same; weight, contribution, and overall update.
 */
export function applyMatchScoreWeightsToReport(
  report: SemanticMatchReport,
  weights: MatchScoreWeights,
): SemanticMatchReport {
  const resolved = matchScoreWeightsFromProfile(weights);
  const categoryScores = normalizeSemanticCategoryScores(
    report.categoryScores,
    resolved,
  );
  return {
    ...report,
    categoryScores,
    overallMatchPercent: computeOverallMatchPercent(categoryScores),
  };
}

/** Overlay Preferences weights onto a ScoreResult for report display. */
export function withMatchScoreWeights(
  score: ScoreResult,
  weights: MatchScoreWeights | null | undefined,
): ScoreResult {
  const report = getSemanticReport(score);
  if (!report) return score;
  const nextReport = applyMatchScoreWeightsToReport(
    report,
    matchScoreWeightsFromProfile(weights),
  );
  return {
    ...score,
    fitScore: nextReport.overallMatchPercent,
    semanticMatchReport: nextReport,
  };
}

export function normalizeSemanticMatchReport(
  raw: unknown,
  weightOverrides?: MatchScoreWeights | null,
): SemanticMatchReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SemanticMatchReport> & Record<string, unknown>;
  const categoryScores = asArray<unknown>(r.categoryScores).map(
    normalizeSemanticCategoryScore,
  );
  if (categoryScores.length === 0) return null;

  const normalizedCategories = normalizeSemanticCategoryScores(
    categoryScores,
    weightOverrides ?? null,
  );

  return {
    overallMatchPercent: computeOverallMatchPercent(normalizedCategories),
    categoryScores: normalizedCategories,
    matchedCompetencies: asArray<unknown>(r.matchedCompetencies).map(
      normalizeCompetencyMatch,
    ),
    partialCompetencies: asArray<unknown>(r.partialCompetencies).map(
      normalizeCompetencyMatch,
    ),
    missingCompetencies: asArray<unknown>(r.missingCompetencies).map(
      normalizeCompetencyMatch,
    ),
    strengths: asArray<string>(r.strengths),
    weaknesses: asArray<string>(r.weaknesses),
    scoreReasoning: typeof r.scoreReasoning === "string" ? r.scoreReasoning : "",
    resumeCanonical: (r.resumeCanonical as SemanticMatchReport["resumeCanonical"]) ?? {
      competencies: [],
      seniority: null,
      yearsExperience: null,
      industries: [],
      accomplishments: [],
      quantifiedImpact: [],
    },
    jobCanonical: (r.jobCanonical as SemanticMatchReport["jobCanonical"]) ?? {
      competencies: [],
      seniority: null,
      yearsExperience: null,
      industries: [],
      accomplishments: [],
      quantifiedImpact: [],
    },
  };
}

export function normalizeSemanticCategoryScores(
  rows: SemanticCategoryScore[],
  weightOverrides?: MatchScoreWeights | null,
): SemanticCategoryScore[] {
  const buckets = new Map<
    SemanticCategoryKey,
    {
      scores: number[];
      weight: number | null;
      matched: CompetencyMatchResult[];
      partial: CompetencyMatchResult[];
      missing: CompetencyMatchResult[];
      reasonings: string[];
      legacyMerged: boolean;
    }
  >();

  for (const row of rows) {
    const key = remapSemanticCategoryKey(row.category);
    const legacyFlag = Boolean(
      (row as SemanticCategoryScore & { _legacyCategory?: string })._legacyCategory,
    );
    const existing = buckets.get(key) ?? {
      scores: [],
      weight: null,
      matched: [],
      partial: [],
      missing: [],
      reasonings: [],
      legacyMerged: false,
    };
    existing.scores.push(row.score);
    if (existing.scores.length > 1 || legacyFlag) {
      existing.legacyMerged = true;
    }
    if (
      existing.weight == null &&
      typeof row.weight === "number" &&
      Number.isFinite(row.weight) &&
      row.weight > 0
    ) {
      existing.weight = row.weight;
    }
    existing.matched.push(...row.matched);
    existing.partial.push(...row.partial);
    existing.missing.push(...row.missing);
    if (row.reasoning) existing.reasonings.push(row.reasoning);
    buckets.set(key, existing);
  }

  const override =
    weightOverrides && areMatchScoreWeightsValid(weightOverrides)
      ? weightOverrides
      : null;

  const preserved: Partial<Record<SemanticCategoryKey, number>> = {};
  let canPreserve = !override;
  for (const key of SEMANTIC_CATEGORY_ORDER) {
    const bucket = buckets.get(key);
    if (!bucket || bucket.legacyMerged || bucket.weight == null) {
      canPreserve = false;
      break;
    }
    preserved[key] = bucket.weight;
  }
  if (canPreserve && !isModernMatchScoreWeightSet(preserved)) {
    canPreserve = false;
  }

  const resolvedWeights: MatchScoreWeights = override
    ? { ...override }
    : canPreserve
      ? (preserved as MatchScoreWeights)
      : { ...SEMANTIC_CATEGORY_WEIGHTS };

  return SEMANTIC_CATEGORY_ORDER.map((key) => {
    const bucket = buckets.get(key);
    const weight = resolvedWeights[key];
    if (!bucket) {
      return {
        category: key,
        label: SEMANTIC_CATEGORY_LABELS[key],
        score: 0,
        weight,
        contribution: 0,
        matched: [],
        partial: [],
        missing: [],
        reasoning: "",
      };
    }
    const score = Math.round(
      bucket.scores.reduce((sum, s) => sum + s, 0) / bucket.scores.length,
    );
    return {
      category: key,
      label: SEMANTIC_CATEGORY_LABELS[key],
      score,
      weight,
      contribution: contributionFor(weight, score),
      matched: bucket.matched,
      partial: bucket.partial,
      missing: bucket.missing,
      reasoning: bucket.reasonings[0] ?? "",
    };
  });
}

export function buildSemanticCategoryRollups(report: SemanticMatchReport) {
  return normalizeSemanticCategoryScores(report.categoryScores).map((row) => ({
    id: row.category,
    title: row.label,
    score: row.score,
    weight: row.weight,
  }));
}

export function formatSemanticCategoryScoreOnTen(score: number | null): string {
  if (score == null) return "—";
  return formatScoreOnTen(score / 10);
}

export function importanceLabel(importance: ImportanceLevel): string {
  switch (importance) {
    case "required":
      return "Required";
    case "preferred":
      return "Preferred";
    case "bonus":
      return "Bonus";
    default:
      return "Required";
  }
}

export function matchKindLabel(kind: MatchKind): string {
  switch (kind) {
    case "exact":
      return "Exact match";
    case "strong":
      return "Strong match";
    case "partial":
      return "Partial match";
    case "weak":
      return "Weak match";
    case "missing":
      return "Missing";
    default:
      return "Match";
  }
}
