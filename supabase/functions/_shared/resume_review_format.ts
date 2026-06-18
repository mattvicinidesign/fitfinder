import type {
  ResumeReviewCategory,
  ResumeReviewCategoryKey,
  ResumeReviewFinding,
  ResumeReviewFindingStatus,
  ResumeReviewImprovement,
  ResumeReviewResult,
} from "./types.ts";

const CATEGORY_ORDER: ResumeReviewCategoryKey[] = [
  "content",
  "structure",
  "ats",
  "completeness",
];

const CATEGORY_LABELS: Record<ResumeReviewCategoryKey, string> = {
  content: "Content Quality",
  structure: "Layout & Structure",
  ats: "ATS Compatibility",
  completeness: "Completeness",
};

const SUMMARY_MAX_WORDS = 11;
const CATEGORY_EXPLANATION_MAX_WORDS = 8;

function collapseWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function shortenResumeReviewCopy(text: string, maxWords: number): string {
  const cleaned = collapseWhitespace(text);
  if (!cleaned) return cleaned;

  const firstSentence =
    cleaned.split(/(?<=[.!?])\s+/)[0]?.trim() ?? cleaned;
  const words = firstSentence.split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return words.slice(0, maxWords).join(" ");
}

function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** AI often returns 7–9 meaning 70–90; detect 0–10 scale and convert to 0–100. */
function rescaleScoresToPercent(scores: number[]): number[] {
  if (scores.length === 0) return scores;
  const max = Math.max(...scores);
  const hasPositive = scores.some((score) => score > 0);
  const allOnTenScale = hasPositive && max <= 10;

  if (allOnTenScale) {
    return scores.map((score) => clampScore(score * 10));
  }

  return scores.map((score) =>
    score > 0 && score <= 10 ? clampScore(score * 10) : clampScore(score),
  );
}

function applyScoreScale(
  overallScore: number,
  categories: ResumeReviewCategory[],
): { overallScore: number; categories: ResumeReviewCategory[] } {
  const rawScores = [overallScore, ...categories.map((category) => category.score)];
  const scaled = rescaleScoresToPercent(rawScores);
  const [scaledOverall, ...scaledCategories] = scaled;

  return {
    overallScore: scaledOverall,
    categories: categories.map((category, index) => ({
      ...category,
      score: scaledCategories[index] ?? category.score,
    })),
  };
}

function normalizeStatus(value: unknown): ResumeReviewFindingStatus {
  if (value === "pass" || value === "warn" || value === "fail") return value;
  return "warn";
}

function normalizeFindings(value: unknown): ResumeReviewFinding[] {
  if (!Array.isArray(value)) return [];
  const out: ResumeReviewFinding[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label) continue;
    out.push({ label, status: normalizeStatus(row.status) });
  }
  return out;
}

function normalizeCategoryKey(value: unknown): ResumeReviewCategoryKey | null {
  if (
    value === "content" ||
    value === "structure" ||
    value === "ats" ||
    value === "completeness"
  ) {
    return value;
  }
  return null;
}

function normalizeCategories(value: unknown): ResumeReviewCategory[] {
  const byKey = new Map<ResumeReviewCategoryKey, ResumeReviewCategory>();

  if (Array.isArray(value)) {
    for (const raw of value) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const key = normalizeCategoryKey(row.key);
      if (!key) continue;
      byKey.set(key, {
        key,
        label: CATEGORY_LABELS[key],
        score: clampScore(row.score),
        explanation: shortenResumeReviewCopy(
          typeof row.explanation === "string" ? row.explanation.trim() : "",
          CATEGORY_EXPLANATION_MAX_WORDS,
        ),
        findings: normalizeFindings(row.findings),
      });
    }
  }

  return CATEGORY_ORDER.map((key) => {
    const existing = byKey.get(key);
    if (existing) return existing;
    return {
      key,
      label: CATEGORY_LABELS[key],
      score: 0,
      explanation: "Not evaluated.",
      findings: [],
    };
  });
}

function inferImprovementCategory(
  title: string,
  detail: string | null,
): ResumeReviewCategoryKey | null {
  const text = `${title} ${detail ?? ""}`.toLowerCase();
  if (
    /portfolio|quantified|achievement|action verb|summary|skill|impact|bullet|content|metric/.test(
      text,
    )
  ) {
    return "content";
  }
  if (
    /format|hierarchy|order|date|structure|section|spacing|layout|font|readability/.test(
      text,
    )
  ) {
    return "structure";
  }
  if (/ats|column|graphic|image|keyword|parse|dense|table|scan/.test(text)) {
    return "ats";
  }
  if (
    /education|certification|contact|complete|link|missing|degree|coursework|email|phone/.test(
      text,
    )
  ) {
    return "completeness";
  }
  return null;
}

function assignImprovementCategories(
  improvements: DraftImprovement[],
  categories: ResumeReviewCategory[],
): ResumeReviewImprovement[] {
  const assigned = new Map<ResumeReviewCategoryKey, ResumeReviewImprovement>();
  const unassigned: DraftImprovement[] = [];

  for (const item of improvements) {
    const resolved =
      item.categoryKey ??
      inferImprovementCategory(item.title, item.detail);
    if (resolved && !assigned.has(resolved)) {
      assigned.set(resolved, { ...item, categoryKey: resolved });
    } else {
      unassigned.push(item);
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.score - b.score);
  for (const item of unassigned) {
    const openKey =
      sortedCategories.find((category) => !assigned.has(category.key))?.key ??
      CATEGORY_ORDER.find((key) => !assigned.has(key));
    if (!openKey) break;
    assigned.set(openKey, { ...item, categoryKey: openKey });
  }

  return CATEGORY_ORDER.flatMap((key) => {
    const item = assigned.get(key);
    return item ? [item] : [];
  }).sort((a, b) => a.rank - b.rank);
}

type DraftImprovement = {
  rank: number;
  title: string;
  estimatedMatchImprovementPercent: number;
  detail: string | null;
  categoryKey?: ResumeReviewCategoryKey | null;
};

function normalizeImprovements(
  value: unknown,
  categories: ResumeReviewCategory[],
): ResumeReviewImprovement[] {
  if (!Array.isArray(value)) return [];
  const out: DraftImprovement[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const rankRaw =
      typeof row.rank === "number" ? row.rank : Number(row.rank);
    const pctRaw =
      typeof row.estimatedMatchImprovementPercent === "number"
        ? row.estimatedMatchImprovementPercent
        : Number(row.estimatedMatchImprovementPercent);
    out.push({
      rank: Number.isFinite(rankRaw)
        ? Math.max(1, Math.round(rankRaw))
        : out.length + 1,
      title,
      estimatedMatchImprovementPercent: Number.isFinite(pctRaw)
        ? Math.max(1, Math.min(15, Math.round(pctRaw)))
        : 3,
      detail:
        typeof row.detail === "string" && row.detail.trim()
          ? row.detail.trim()
          : null,
      categoryKey: normalizeCategoryKey(row.categoryKey),
    });
  }
  return assignImprovementCategories(
    out.sort((a, b) => a.rank - b.rank),
    categories,
  );
}

function normalizeLetterGrade(value: unknown, overallScore: number): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (overallScore >= 97) return "A+";
  if (overallScore >= 93) return "A";
  if (overallScore >= 90) return "A-";
  if (overallScore >= 87) return "B+";
  if (overallScore >= 83) return "B";
  if (overallScore >= 80) return "B-";
  if (overallScore >= 77) return "C+";
  if (overallScore >= 73) return "C";
  if (overallScore >= 70) return "C-";
  if (overallScore >= 60) return "D";
  return "F";
}

export function normalizeResumeReview(
  draft: unknown,
  resumeId: string | null,
): ResumeReviewResult {
  const row =
    draft && typeof draft === "object"
      ? (draft as Record<string, unknown>)
      : {};
  const overallScore = clampScore(row.overallScore);
  const summary = shortenResumeReviewCopy(
    typeof row.summary === "string" && row.summary.trim()
      ? row.summary.trim()
      : "Resume review complete.",
    SUMMARY_MAX_WORDS,
  );
  const categories = normalizeCategories(row.categories);
  const scaled = applyScoreScale(overallScore, categories);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    letterGrade: normalizeLetterGrade(row.letterGrade, scaled.overallScore),
    overallScore: scaled.overallScore,
    summary,
    categories: scaled.categories,
    improvements: normalizeImprovements(row.improvements, scaled.categories),
    resumeId,
  };
}
