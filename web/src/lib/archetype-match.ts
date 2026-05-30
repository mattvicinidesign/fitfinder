import type { ParsedJob, ParsedResume } from "@/lib/types";

/** Mirrors supabase/functions/_shared/scoring_constants.ts */
const ARCHETYPE_SIMILARITY: Record<string, Record<string, number>> = {
  "product designer": {
    "product designer": 100,
    "senior product designer": 100,
    "lead product designer": 95,
    "ux designer": 80,
    "design systems designer": 85,
    "ux researcher": 55,
    "product manager": 45,
    "marketing designer": 20,
    "brand designer": 15,
    "ui designer": 70,
  },
  "ux designer": {
    "ux designer": 100,
    "product designer": 80,
    "ux researcher": 75,
    "ui designer": 65,
    "marketing designer": 25,
  },
};

function normalize(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Same logic as supabase scoring.ts archetypeSimilarity. */
export function archetypeSimilarity(roleA: string, roleB: string): number {
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

export interface ArchetypeComparison {
  label: string;
  source: string;
  score: number;
  isBest: boolean;
}

export interface ArchetypeDetail {
  jobRole: string;
  comparisons: ArchetypeComparison[];
  bestScore: number;
}

function collectResumeRoles(resume: ParsedResume): { label: string; source: string }[] {
  const entries: { label: string; source: string }[] = [];

  if (resume.roleTitle?.trim()) {
    entries.push({ label: resume.roleTitle.trim(), source: "Primary role on resume" });
  }

  for (const a of resume.archetypes ?? []) {
    if (a?.trim()) {
      entries.push({ label: a.trim(), source: "Archetype" });
    }
  }

  for (const job of resume.workHistory ?? []) {
    if (job.title?.trim()) {
      const company = job.company?.trim();
      entries.push({
        label: job.title.trim(),
        source: company ? `Role at ${company}` : "Work history",
      });
    }
  }

  const seen = new Set<string>();
  return entries.filter(({ label }) => {
    const key = normalize(label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildArchetypeDetail(
  job: ParsedJob,
  resume: ParsedResume | null | undefined,
  fallbackJobTitle?: string | null,
): ArchetypeDetail | null {
  const jobRole = (job.roleTitle ?? fallbackJobTitle ?? "").trim();
  if (!jobRole) return null;
  if (!resume) {
    return { jobRole, comparisons: [], bestScore: 0 };
  }

  const resumeRoles = collectResumeRoles(resume);
  if (resumeRoles.length === 0) {
    return { jobRole, comparisons: [], bestScore: 0 };
  }

  const comparisons = resumeRoles
    .map(({ label, source }) => ({
      label,
      source,
      score: Math.round(archetypeSimilarity(jobRole, label)),
      isBest: false,
    }))
    .sort((a, b) => b.score - a.score);

  const bestScore = comparisons[0]?.score ?? 0;
  if (comparisons.length > 0) {
    comparisons[0].isBest = true;
  }

  return { jobRole, comparisons, bestScore };
}
