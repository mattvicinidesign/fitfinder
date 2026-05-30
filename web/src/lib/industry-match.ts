import { isExcludedIndustryMatch } from "@/lib/qualified-industries";
import {
  industrySimilarity,
  normalizeIndustryList,
  resolveCanonicalIndustry,
} from "@/lib/tech-industries";
import type { ParsedJob, ParsedResume } from "@/lib/types";

export { industrySimilarity };

export interface IndustryJobMatch {
  jobIndustry: string;
  bestResumeIndustry: string | null;
  score: number;
  /** Aligns with scoring: best pairwise score >= 50. */
  strongMatch: boolean;
  /** Same canonical vertical (or cluster). */
  sameCluster: boolean;
}

export interface IndustryDetail {
  jobIndustries: string[];
  resumeIndustries: string[];
  matches: IndustryJobMatch[];
  bestScore: number;
}

function mergeForMatching(
  resumeIndustries: string[],
  qualificationIndustries?: string[] | null,
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  const add = (label: string | undefined) => {
    if (!label || isExcludedIndustryMatch(label) || seen.has(label)) return;
    seen.add(label);
    merged.push(label);
  };

  for (const label of resumeIndustries) add(label);
  for (const raw of qualificationIndustries ?? []) {
    add(normalizeIndustryList([raw]).industries[0]);
  }
  return merged;
}

function normalizeParsedIndustries(
  job: ParsedJob,
  resume?: ParsedResume | null,
  qualificationIndustries?: string[] | null,
): {
  jobIndustries: string[];
  resumeIndustries: string[];
  matchIndustries: string[];
} {
  const jobNorm = normalizeIndustryList(job.industries);
  const resumeNorm = normalizeIndustryList(resume?.industries);
  const resumeIndustries = resumeNorm.industries.filter(
    (l) => !isExcludedIndustryMatch(l),
  );

  return {
    jobIndustries: jobNorm.industries,
    resumeIndustries,
    matchIndustries: mergeForMatching(
      resumeIndustries,
      qualificationIndustries,
    ),
  };
}

function isSameCluster(a: string, b: string, score: number): boolean {
  if (score >= 100) return true;
  if (score >= 85) return true;
  const ca = resolveCanonicalIndustry(a);
  const cb = resolveCanonicalIndustry(b);
  return ca != null && ca === cb;
}

export function buildIndustryDetail(
  job: ParsedJob,
  resume?: ParsedResume | null,
  qualificationIndustries?: string[] | null,
): IndustryDetail | null {
  const { jobIndustries, resumeIndustries, matchIndustries } =
    normalizeParsedIndustries(job, resume, qualificationIndustries);

  if (jobIndustries.length === 0 && matchIndustries.length === 0) {
    return null;
  }

  const matches: IndustryJobMatch[] = jobIndustries.map((jobIndustry) => {
    let bestScore = 0;
    let bestResumeIndustry: string | null = null;

    for (const r of matchIndustries) {
      const score = industrySimilarity(jobIndustry, r);
      if (score > bestScore) {
        bestScore = score;
        bestResumeIndustry = r;
      }
    }

    const rounded = Math.round(bestScore);
    return {
      jobIndustry,
      bestResumeIndustry,
      score: rounded,
      strongMatch: rounded >= 50,
      sameCluster: bestResumeIndustry
        ? isSameCluster(jobIndustry, bestResumeIndustry, rounded)
        : false,
    };
  });

  const bestScore =
    matches.length > 0 ? Math.max(...matches.map((m) => m.score)) : 0;

  return { jobIndustries, resumeIndustries, matches, bestScore };
}
