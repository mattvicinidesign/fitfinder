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
} from "@/lib/types";
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
  const category = normalizeCategoryKey(c.category);
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
  };
}

export function normalizeSemanticMatchReport(raw: unknown): SemanticMatchReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SemanticMatchReport> & Record<string, unknown>;
  const categoryScores = asArray<unknown>(r.categoryScores).map(
    normalizeSemanticCategoryScore,
  );
  if (categoryScores.length === 0) return null;

  return {
    overallMatchPercent: Math.max(
      0,
      Math.min(100, Number(r.overallMatchPercent) || 0),
    ),
    categoryScores: normalizeSemanticCategoryScores(categoryScores),
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
): SemanticCategoryScore[] {
  const buckets = new Map<
    SemanticCategoryKey,
    {
      scores: number[];
      matched: CompetencyMatchResult[];
      partial: CompetencyMatchResult[];
      missing: CompetencyMatchResult[];
      reasonings: string[];
    }
  >();

  for (const row of rows) {
    const key = remapSemanticCategoryKey(row.category);
    const existing = buckets.get(key) ?? {
      scores: [],
      matched: [],
      partial: [],
      missing: [],
      reasonings: [],
    };
    existing.scores.push(row.score);
    existing.matched.push(...row.matched);
    existing.partial.push(...row.partial);
    existing.missing.push(...row.missing);
    if (row.reasoning) existing.reasonings.push(row.reasoning);
    buckets.set(key, existing);
  }

  return SEMANTIC_CATEGORY_ORDER.map((key) => {
    const bucket = buckets.get(key);
    const weight = SEMANTIC_CATEGORY_WEIGHTS[key];
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
      contribution: Math.round(weight * (score / 100) * 10) / 10,
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
