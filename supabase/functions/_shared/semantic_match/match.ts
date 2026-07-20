/**
 * Stage 3 — Match canonical job competencies to canonical resume competencies.
 * Produces 0–100 similarity scores (not binary).
 */

import type {
  CanonicalProfile,
  CompetencyMatchResult,
  ImportanceLevel,
} from "./types.ts";
import { remapSemanticCategoryKey } from "./types.ts";
import {
  clamp,
  evidenceBoost,
  importanceWeight,
  matchKindFromScore,
} from "./match_utils.ts";

const MATCH_SYSTEM = `You match JOB canonical competencies to RESUME canonical competencies using semantic similarity.

Compare ONLY canonical labels — not raw keywords.

Return JSON:
{
  "matches": [{
    "jobCompetencyId": string,
    "jobLabel": string,
    "resumeCompetencyId": string | null,
    "resumeLabel": string | null,
    "canonicalLabel": string,
    "category": SemanticCategoryKey,
    "importance": "required" | "preferred" | "bonus",
    "similarityScore": number,
    "matchKind": "exact" | "strong" | "partial" | "weak" | "missing",
    "evidenceCount": number,
    "reasoning": string
  }]
}

Scoring guidance:
- exact: same canonical competency (95–100)
- strong: closely related (80–94), e.g. Customer Interviews ↔ User Research → Research
- partial: related but gaps (50–79), e.g. Google Analytics ↔ Mixpanel → Analytics
- weak: tangential (20–49)
- missing: no credible resume evidence (0–19)

SemanticCategoryKey must be one of:
experience | skillsTools | responsibilities | domainBackground

Importance weighting (for your reasoning only — scoring happens downstream):
- required gaps matter most
- bonus gaps matter least

Evidence: higher evidenceCount on resume strengthens confidence.

Every JOB competency must appear exactly once in matches.`;

/** Deterministic fallback: label equality + substring overlap. */
export function matchProfilesDeterministic(
  resume: CanonicalProfile,
  job: CanonicalProfile,
): CompetencyMatchResult[] {
  const resumeByLabel = new Map(
    resume.competencies.map((c) => [c.canonicalLabel.toLowerCase(), c]),
  );

  return job.competencies.map((jobComp) => {
    const jobKey = jobComp.canonicalLabel.toLowerCase();
    let best = resume.competencies.find(
      (r) => r.canonicalLabel.toLowerCase() === jobKey,
    );

    if (!best) {
      best = resume.competencies.find((r) => {
        const rKey = r.canonicalLabel.toLowerCase();
        return rKey.includes(jobKey) || jobKey.includes(rKey);
      });
    }

    const similarityScore = best
      ? best.canonicalLabel.toLowerCase() === jobKey
        ? 98
        : 72
      : 0;

    return {
      jobCompetencyId: jobComp.id,
      jobLabel: jobComp.canonicalLabel,
      resumeCompetencyId: best?.id ?? null,
      resumeLabel: best?.canonicalLabel ?? null,
      canonicalLabel: jobComp.canonicalLabel,
      category: jobComp.category,
      importance: jobComp.importance,
      similarityScore,
      matchKind: matchKindFromScore(similarityScore),
      evidenceCount: best?.evidenceCount ?? 0,
      reasoning: best
        ? `Resume demonstrates "${best.canonicalLabel}" for job need "${jobComp.canonicalLabel}".`
        : `No resume evidence found for "${jobComp.canonicalLabel}".`,
    };
  });
}

export function applyEvidenceBoost(
  matches: CompetencyMatchResult[],
): CompetencyMatchResult[] {
  return matches.map((m) => {
    const boosted = clamp(
      m.similarityScore + evidenceBoost(m.evidenceCount),
      0,
      100,
    );
    return {
      ...m,
      similarityScore: Math.round(boosted),
      matchKind: matchKindFromScore(boosted),
    };
  });
}

export async function matchCanonicalProfiles(
  resume: CanonicalProfile,
  job: CanonicalProfile,
): Promise<CompetencyMatchResult[]> {
  if (job.competencies.length === 0) {
    return [];
  }

  try {
    const { completeJSON } = await import("../openai.ts");
    const result = await completeJSON<{ matches?: CompetencyMatchResult[] }>([
      { role: "system", content: MATCH_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({ resume, job }),
      },
    ]);

    const matches = (result.matches ?? []).map((m) => {
      const similarityScore = clamp(
        Math.round(Number(m.similarityScore) || 0),
        0,
        100,
      );
      return {
        ...m,
        category: remapSemanticCategoryKey(m.category),
        similarityScore,
        matchKind: matchKindFromScore(similarityScore),
        evidenceCount: Math.max(0, Number(m.evidenceCount) || 0),
      };
    });

    if (matches.length > 0) {
      return applyEvidenceBoost(matches);
    }
  } catch {
    // fall through
  }

  return applyEvidenceBoost(matchProfilesDeterministic(resume, job));
}

export function weightedMatchAverage(
  matches: CompetencyMatchResult[],
): number {
  if (matches.length === 0) return 50;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const m of matches) {
    const w = importanceWeight(m.importance);
    weightedSum += m.similarityScore * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}

export { importanceWeight };
