/**
 * Stage 4 — Weighted category scoring from competency matches.
 */

import { clamp, importanceWeight } from "./match_utils.ts";
import { weightedMatchAverage } from "./match.ts";
import type {
  CanonicalProfile,
  CompetencyMatchResult,
  SemanticCategoryKey,
  SemanticCategoryScore,
} from "./types.ts";
import {
  SEMANTIC_CATEGORY_LABELS,
  SEMANTIC_CATEGORY_WEIGHTS,
} from "./types.ts";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function experienceScore(
  resume: CanonicalProfile,
  job: CanonicalProfile,
): { score: number; reasoning: string } {
  const resumeYears = resume.yearsExperience;
  const jobYears = job.yearsExperience;

  if (resumeYears == null && jobYears == null) {
    return { score: 60, reasoning: "Experience years not specified on either side." };
  }
  if (jobYears == null || jobYears <= 0) {
    return {
      score: resumeYears != null ? 75 : 55,
      reasoning: "Job does not specify years of experience.",
    };
  }
  if (resumeYears == null) {
    return { score: 35, reasoning: "Resume years of experience unclear." };
  }

  const ratio = resumeYears / jobYears;
  let score: number;
  if (ratio >= 1) score = 95;
  else if (ratio >= 0.85) score = 85;
  else if (ratio >= 0.7) score = 72;
  else if (ratio >= 0.5) score = 55;
  else score = 35;

  const seniorityNote =
    resume.seniority && job.seniority
      ? ` Seniority: resume ${resume.seniority}, job ${job.seniority}.`
      : "";

  return {
    score,
    reasoning: `Resume ~${resumeYears}y vs job ~${jobYears}y required.${seniorityNote}`,
  };
}

function domainBackgroundScore(
  resume: CanonicalProfile,
  job: CanonicalProfile,
  matches: CompetencyMatchResult[],
): { score: number; reasoning: string } {
  const domainMatches = matches.filter((m) => m.category === "domainBackground");
  if (domainMatches.length > 0) {
    return {
      score: weightedMatchAverage(domainMatches),
      reasoning: "Domain & background scored from normalized competency matches.",
    };
  }

  const resumeIndustries = new Set(
    resume.industries.map((i) => i.toLowerCase()),
  );
  const jobIndustries = job.industries.map((i) => i.toLowerCase());

  if (jobIndustries.length === 0) {
    return { score: 65, reasoning: "Job industry not specified — neutral score." };
  }
  if (resumeIndustries.size === 0) {
    return {
      score: 45,
      reasoning: "Resume industry unclear — modest reduction (not catastrophic).",
    };
  }

  const overlap = jobIndustries.some((j) =>
    [...resumeIndustries].some((r) => r.includes(j) || j.includes(r))
  );

  return {
    score: overlap ? 82 : 58,
    reasoning: overlap
      ? "Industry overlap detected between resume and job."
      : "Different industry focus — modest score reduction.",
  };
}

function partitionMatches(matches: CompetencyMatchResult[]) {
  const matched: CompetencyMatchResult[] = [];
  const partial: CompetencyMatchResult[] = [];
  const missing: CompetencyMatchResult[] = [];

  for (const m of matches) {
    if (m.matchKind === "missing" || m.similarityScore < 20) {
      missing.push(m);
    } else if (m.matchKind === "partial" || m.matchKind === "weak") {
      partial.push(m);
    } else {
      matched.push(m);
    }
  }

  return { matched, partial, missing };
}

function scoreCategory(
  category: SemanticCategoryKey,
  matches: CompetencyMatchResult[],
  resume: CanonicalProfile,
  job: CanonicalProfile,
): SemanticCategoryScore {
  const weight = SEMANTIC_CATEGORY_WEIGHTS[category];
  const categoryMatches = matches.filter((m) => m.category === category);
  const { matched, partial, missing } = partitionMatches(categoryMatches);

  let score: number;
  let reasoning: string;

  if (category === "experience") {
    const exp = experienceScore(resume, job);
    score = exp.score;
    reasoning = exp.reasoning;
  } else if (category === "domainBackground") {
    const dom = domainBackgroundScore(resume, job, matches);
    score = dom.score;
    reasoning = dom.reasoning;
  } else if (categoryMatches.length === 0) {
    score = 55;
    reasoning = `No ${SEMANTIC_CATEGORY_LABELS[category]} competencies identified in job posting.`;
  } else {
    score = weightedMatchAverage(categoryMatches);
    reasoning = `${matched.length} strong, ${partial.length} partial, ${missing.length} missing (importance-weighted).`;
  }

  const contribution = round1(weight * (score / 100));

  return {
    category,
    label: SEMANTIC_CATEGORY_LABELS[category],
    score,
    weight,
    contribution,
    matched,
    partial,
    missing,
    reasoning,
  };
}

export function scoreSemanticCategories(
  matches: CompetencyMatchResult[],
  resume: CanonicalProfile,
  job: CanonicalProfile,
): SemanticCategoryScore[] {
  const categories = Object.keys(SEMANTIC_CATEGORY_WEIGHTS) as SemanticCategoryKey[];
  return categories.map((category) =>
    scoreCategory(category, matches, resume, job)
  );
}

export function computeOverallMatchPercent(
  categoryScores: SemanticCategoryScore[],
): number {
  let total = 0;
  for (const c of categoryScores) {
    total += c.contribution;
  }
  return Math.round(clamp(total, 0, 100));
}

export function topStrengths(matches: CompetencyMatchResult[]): string[] {
  return matches
    .filter((m) => m.similarityScore >= 80 && m.importance !== "bonus")
    .sort((a, b) => {
      const w = importanceWeight(b.importance) - importanceWeight(a.importance);
      if (w !== 0) return w;
      return b.similarityScore - a.similarityScore;
    })
    .slice(0, 6)
    .map(
      (m) =>
        `${m.canonicalLabel} (${m.similarityScore}%${m.resumeLabel && m.resumeLabel !== m.jobLabel ? ` — via ${m.resumeLabel}` : ""})`,
    );
}

export function topWeaknesses(matches: CompetencyMatchResult[]): string[] {
  return matches
    .filter(
      (m) =>
        m.similarityScore < 50 &&
        (m.importance === "required" || m.importance === "preferred"),
    )
    .sort((a, b) => {
      const w = importanceWeight(b.importance) - importanceWeight(a.importance);
      if (w !== 0) return w;
      return a.similarityScore - b.similarityScore;
    })
    .slice(0, 6)
    .map((m) => `${m.canonicalLabel} (${m.similarityScore}% — ${m.importance})`);
}
