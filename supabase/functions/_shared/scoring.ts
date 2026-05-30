// The Fit Finder scoring engine.
//
// This is the single source of truth for how a resume is scored against a job.
// It is intentionally pure (no I/O, no randomness) so that the same inputs
// always yield the same outputs on every platform. The iOS and web clients
// MUST NOT reimplement any of this — they call the `analyze` Edge Function.

import type {
  ParsedJob,
  ParsedResume,
  Recommendation,
  ScoreBreakdown,
  ScoreResult,
} from "./types.ts";

// Relative weights for the qualification score. Must sum to 1.
const WEIGHTS = {
  skills: 0.5,
  tools: 0.25,
  ai: 0.25,
} as const;

// How far career-fit can move the score, in points.
const MAX_CAREER_FIT_ADJUSTMENT = 15;

/** Normalize a free-text token for comparison: lowercase, trimmed, de-punctuated. */
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

/**
 * Fraction of `required` items satisfied by `candidate`, using loose matching
 * (exact, substring either direction). Returns 0..1. If nothing is required,
 * the dimension is considered fully satisfied (1).
 */
function coverage(required: string[], candidate: string[]): number {
  const req = toSet(required);
  if (req.size === 0) return 1;
  const cand = [...toSet(candidate)];
  let matched = 0;
  for (const r of req) {
    const hit = cand.some((c) => c === r || c.includes(r) || r.includes(c));
    if (hit) matched += 1;
  }
  return matched / req.size;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Confidence reflects how much signal we actually had to score against.
 * Sparse resumes or sparse job posts lower confidence even when the overlap
 * that *does* exist is high.
 */
function computeConfidence(resume: ParsedResume, job: ParsedJob): number {
  const resumeSignals =
    resume.skills.length + resume.tools.length + resume.aiExperience.length +
    resume.workHistory.length;
  const jobSignals =
    job.skills.length + job.toolRequirements.length + job.aiRequirements.length;

  // Saturating curves: ~12 resume signals and ~8 job signals == full confidence.
  const resumeConfidence = clamp(resumeSignals / 12, 0, 1);
  const jobConfidence = clamp(jobSignals / 8, 0, 1);

  return round(100 * (0.6 * resumeConfidence + 0.4 * jobConfidence));
}

/**
 * Career-fit adjustment rewards industry alignment and matching archetypes,
 * and lightly penalizes a complete industry mismatch. Returns a signed value
 * in [-MAX, +MAX].
 */
function computeCareerFitAdjustment(
  resume: ParsedResume,
  job: ParsedJob,
): { adjustment: number; industryAlignment: number } {
  const industryAlignment = coverage(job.industries, resume.industries);
  // Archetypes appearing in the resume that align with job workflows.
  const archetypeAlignment = coverage(job.workflows, resume.archetypes);

  const alignment = 0.7 * industryAlignment + 0.3 * archetypeAlignment;
  // Map 0..1 alignment onto -MAX..+MAX, centered so ~0.5 is neutral.
  const adjustment = (alignment - 0.5) * 2 * MAX_CAREER_FIT_ADJUSTMENT;

  return {
    adjustment: round(adjustment),
    industryAlignment: round(industryAlignment * 100),
  };
}

function recommend(fitScore: number, confidence: number): Recommendation {
  // Low confidence demotes the recommendation by one tier.
  const lowConfidence = confidence < 50;
  if (fitScore >= 85 && !lowConfidence) return "strong_apply";
  if (fitScore >= 70) return lowConfidence ? "stretch" : "apply";
  if (fitScore >= 55) return "stretch";
  if (fitScore >= 40) return "long_shot";
  return "not_recommended";
}

/**
 * Score a parsed resume against a parsed job.
 *
 * qualification = weighted coverage of required skills/tools/AI.
 * fit           = qualification + careerFitAdjustment, blended toward a
 *                 neutral 50 when confidence is low.
 */
export function scoreFit(resume: ParsedResume, job: ParsedJob): ScoreResult {
  const skillsMatch = coverage(job.skills, resume.skills);
  const toolsMatch = coverage(job.toolRequirements, resume.tools);
  const aiMatch = coverage(
    job.aiRequirements,
    [...resume.aiExperience, ...resume.skills, ...resume.tools],
  );

  const qualificationScore = round(
    100 * (WEIGHTS.skills * skillsMatch + WEIGHTS.tools * toolsMatch + WEIGHTS.ai * aiMatch),
  );

  const confidenceScore = computeConfidence(resume, job);
  const { adjustment, industryAlignment } = computeCareerFitAdjustment(resume, job);

  // Blend the adjusted qualification toward 50 proportionally to (1 - confidence),
  // so uncertain analyses don't produce overconfident extremes.
  const adjusted = clamp(qualificationScore + adjustment, 0, 100);
  const confidenceWeight = confidenceScore / 100;
  const fitScore = round(adjusted * confidenceWeight + 50 * (1 - confidenceWeight));

  const recommendation = recommend(fitScore, confidenceScore);

  const requiredSignals = job.skills.length + job.toolRequirements.length +
    job.aiRequirements.length;

  const breakdown: ScoreBreakdown = {
    skillsMatch: round(skillsMatch * 100),
    toolsMatch: round(toolsMatch * 100),
    aiMatch: round(aiMatch * 100),
    industryAlignment,
    signalCoverage: requiredSignals,
  };

  return {
    qualificationScore,
    confidenceScore,
    careerFitAdjustment: adjustment,
    fitScore,
    recommendation,
    breakdown,
  };
}
