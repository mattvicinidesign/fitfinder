/**
 * Opportunity Engine — personalized career-fit scoring.
 * Not a keyword matcher: role archetype and qualifications drive the score;
 * preferences and client quality fine-tune the result.
 */

import { detectRoleArchetype } from "./archetype_detection.ts";
import {
  LOWER_INDUSTRIES,
  NEUTRAL_INDUSTRIES,
  OPPORTUNITY_CATEGORY_LABELS,
  OPPORTUNITY_RECOMMENDATION_BANDS,
  OPPORTUNITY_WEIGHTS,
  STRONG_INDUSTRIES,
  type OpportunityCategoryKey,
} from "./opportunity_engine_constants.ts";
import {
  computeOnboardingCareerFitAdjustment,
  type ProfileScoringRow,
} from "./profile_scoring.ts";
import { resumeSkillsForScoring } from "./qualified_skills.ts";
import type { PostingContext } from "./posting_context.ts";
import type {
  OpportunityCategoryScore,
  OpportunityEngineDebug,
  ParsedJob,
  ParsedResume,
  Recommendation,
  ScoreResult,
} from "./types.ts";
import { industrySimilarity, normalizeIndustryList } from "./tech_industries.ts";
import type { ScoringMode } from "./scoring_constants.ts";

export interface ScoreOpportunityOptions {
  mode?: ScoringMode;
  jobTitle?: string | null;
  jobText?: string | null;
  posting?: PostingContext | null;
  profile?: ProfileScoringRow | null;
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

function coverageCounts(
  required: string[],
  candidate: string[],
): { matched: number; total: number; matchedLabels: string[]; missingLabels: string[] } {
  const reqItems = [...new Set(required.map((r) => r.trim()).filter(Boolean))];
  if (reqItems.length === 0) {
    return { matched: 0, total: 0, matchedLabels: [], missingLabels: [] };
  }
  const cand = [...toSet(candidate)];
  const matchedLabels: string[] = [];
  const missingLabels: string[] = [];
  for (const raw of reqItems) {
    const r = normalize(raw);
    const hit = cand.some((c) => c === r || c.includes(r) || r.includes(c));
    if (hit) matchedLabels.push(raw);
    else missingLabels.push(raw);
  }
  return {
    matched: matchedLabels.length,
    total: reqItems.length,
    matchedLabels,
    missingLabels,
  };
}

function buildJobBlob(job: ParsedJob, jobTitle?: string | null, jobText?: string | null): string {
  return normalize(
    [
      jobTitle ?? "",
      job.roleTitle ?? "",
      jobText ?? "",
      job.postingContextDetail ?? "",
      ...(job.skills ?? []),
      ...(job.industries ?? []),
      ...(job.workflows ?? []),
      ...(job.toolRequirements ?? []),
      ...(job.aiRequirements ?? []),
      ...(job.softwareModels ?? []),
    ].join(" "),
  );
}

function scoreRoleAlignment(
  job: ParsedJob,
  jobTitle: string | null | undefined,
  jobBlob: string,
): OpportunityCategoryScore {
  const detected = detectRoleArchetype(jobTitle ?? job.roleTitle, jobBlob);
  const weight = OPPORTUNITY_WEIGHTS.roleAlignment;
  return {
    category: "roleAlignment",
    label: OPPORTUNITY_CATEGORY_LABELS.roleAlignment,
    score: detected.score,
    weight,
    contribution: round(weight * (detected.score / 100)),
    details: detected.label
      ? [`Archetype: ${detected.label} (${detected.tier})`]
      : ["Role archetype unclear"],
  };
}

function scoreQualificationsMatch(
  resume: ParsedResume,
  job: ParsedJob,
): OpportunityCategoryScore {
  const required = [
    ...(job.skills ?? []),
    ...(job.toolRequirements ?? []),
  ];
  const candidatePool = [
    ...resumeSkillsForScoring(resume.skills, []),
    ...(resume.tools ?? []),
    ...(resume.aiExperience ?? []),
  ];
  const { matched, total, matchedLabels, missingLabels } = coverageCounts(
    required,
    candidatePool,
  );

  const weight = OPPORTUNITY_WEIGHTS.qualificationsMatch;
  if (total === 0) {
    return {
      category: "qualificationsMatch",
      label: OPPORTUNITY_CATEGORY_LABELS.qualificationsMatch,
      score: 50,
      weight,
      contribution: round(weight * 0.5),
      matchedCount: 0,
      totalCount: 0,
      details: ["No explicit qualifications listed in posting"],
    };
  }

  const score = round((matched / total) * 100);
  return {
    category: "qualificationsMatch",
    label: OPPORTUNITY_CATEGORY_LABELS.qualificationsMatch,
    score,
    weight,
    contribution: round(weight * (score / 100)),
    matchedCount: matched,
    totalCount: total,
    matchedLabels,
    missingLabels,
    details: [`${matched}/${total} qualifications matched`],
  };
}

function industryTierScore(label: string): number {
  const norm = normalize(label);
  if (STRONG_INDUSTRIES.some((i) => normalize(i) === norm || norm.includes(normalize(i)))) {
    return 90;
  }
  if (NEUTRAL_INDUSTRIES.some((i) => normalize(i) === norm || norm.includes(normalize(i)))) {
    return 65;
  }
  if (LOWER_INDUSTRIES.some((i) => normalize(i) === norm || norm.includes(normalize(i)))) {
    return 35;
  }
  return 55;
}

function scoreIndustryAlignment(
  resume: ParsedResume,
  job: ParsedJob,
): OpportunityCategoryScore {
  const jobIndustries = normalizeIndustryList(job.industries).industries;
  const resumeIndustries = normalizeIndustryList(resume.industries).industries;
  const weight = OPPORTUNITY_WEIGHTS.industryAlignment;

  if (jobIndustries.length === 0) {
    return {
      category: "industryAlignment",
      label: OPPORTUNITY_CATEGORY_LABELS.industryAlignment,
      score: 50,
      weight,
      contribution: round(weight * 0.5),
      details: ["Industry not specified in posting"],
    };
  }

  if (resumeIndustries.length === 0) {
    const tierScore = Math.max(...jobIndustries.map(industryTierScore));
    return {
      category: "industryAlignment",
      label: OPPORTUNITY_CATEGORY_LABELS.industryAlignment,
      score: round(tierScore * 0.6),
      weight,
      contribution: round(weight * ((tierScore * 0.6) / 100)),
      details: jobIndustries.map((i) => `Posting industry: ${i}`),
    };
  }

  let best = 0;
  let bestPair = "";
  for (const j of jobIndustries) {
    for (const r of resumeIndustries) {
      const sim = industrySimilarity(j, r);
      if (sim > best) {
        best = sim;
        bestPair = `${r} ↔ ${j}`;
      }
    }
    best = Math.max(best, industryTierScore(j));
  }

  const score = round(clamp(best, 0, 100));
  return {
    category: "industryAlignment",
    label: OPPORTUNITY_CATEGORY_LABELS.industryAlignment,
    score,
    weight,
    contribution: round(weight * (score / 100)),
    details: bestPair ? [bestPair] : jobIndustries.map((i) => `Posting: ${i}`),
  };
}

function scorePreferenceAlignment(
  resume: ParsedResume,
  job: ParsedJob,
  profile: ProfileScoringRow | null | undefined,
  options: ScoreOpportunityOptions,
): OpportunityCategoryScore {
  const weight = OPPORTUNITY_WEIGHTS.preferenceAlignment;
  const adjustment = computeOnboardingCareerFitAdjustment(resume, job, profile, {
    jobTitle: options.jobTitle,
    jobText: options.jobText,
    posting: options.posting ?? null,
  });

  const hasPrefs = Boolean(
    profile?.preferred_engagement_types?.length ||
      profile?.preferred_company_types?.length ||
      profile?.preferred_regions?.length ||
      profile?.red_flags?.length ||
      profile?.desired_compensation_min,
  );

  if (!hasPrefs) {
    return {
      category: "preferenceAlignment",
      label: OPPORTUNITY_CATEGORY_LABELS.preferenceAlignment,
      score: 70,
      weight,
      contribution: round(weight * 0.7),
      details: ["No onboarding preferences set — neutral baseline"],
    };
  }

  const score = round(clamp(70 + adjustment.delta * 2, 0, 100));
  const details = [
    ...adjustment.positiveSignalsFound,
    ...adjustment.negativeSignalsFound,
  ];

  return {
    category: "preferenceAlignment",
    label: OPPORTUNITY_CATEGORY_LABELS.preferenceAlignment,
    score,
    weight,
    contribution: round(weight * (score / 100)),
    details: details.length ? details : ["Preferences applied"],
  };
}

function parseRating(label: string | null | undefined): number | null {
  if (!label?.trim()) return null;
  const m = label.match(/(\d+(?:\.\d+)?)\s*(?:out\s+of\s+5|\/\s*5)/i);
  if (m) return Number.parseFloat(m[1]);
  const bare = label.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return Number.parseFloat(bare[1]);
  return null;
}

function scoreClientQuality(job: ParsedJob, jobBlob: string): OpportunityCategoryScore {
  const weight = OPPORTUNITY_WEIGHTS.clientQuality;
  const details = job.postingDetails;
  let score = 50;
  const signals: string[] = [];

  const rating = parseRating(details?.clientRating ?? null);
  if (rating != null) {
    if (rating >= 4.5) {
      score += 25;
      signals.push(`Client rating ${rating}/5`);
    } else if (rating >= 3) {
      score += 12;
      signals.push(`Client rating ${rating}/5`);
    } else {
      score -= 15;
      signals.push(`Low client rating ${rating}/5`);
    }
  }

  const spend = details?.clientAverageHourlyRate ?? "";
  if (/\$0|no spend|0 spent/i.test(spend)) {
    score -= 20;
    signals.push("$0 client spend");
  } else if (/\$\d+/i.test(spend)) {
    score += 8;
    signals.push("Client spend history listed");
  }

  if (/\bunverified\b|\bnot verified\b/i.test(jobBlob)) {
    score -= 15;
    signals.push("Unverified payment");
  } else if (/\bpayment verified\b|\bverified payment\b/i.test(jobBlob)) {
    score += 15;
    signals.push("Payment verified");
  }

  if (/\bagency outsourcing\b|\bwhite label\b|\bsubcontract\b/i.test(jobBlob)) {
    score -= 12;
    signals.push("Agency outsourcing signals");
  }

  const skillCount = (job.skills?.length ?? 0) + (job.toolRequirements?.length ?? 0);
  if (skillCount >= 4 && jobBlob.length > 400) {
    score += 8;
    signals.push("Detailed job description");
  } else if (jobBlob.length < 120) {
    score -= 10;
    signals.push("Vague requirements");
  }

  if (/\b50\+ proposals\b|\b100\+ proposals\b|\bhigh competition\b/i.test(jobBlob)) {
    score -= 8;
    signals.push("High competition");
  }

  score = round(clamp(score, 0, 100));
  return {
    category: "clientQuality",
    label: OPPORTUNITY_CATEGORY_LABELS.clientQuality,
    score,
    weight,
    contribution: round(weight * (score / 100)),
    details: signals.length ? signals : ["Limited client quality signals"],
  };
}

function recommend(fitScore: number): { recommendation: Recommendation; label: string } {
  for (const band of OPPORTUNITY_RECOMMENDATION_BANDS) {
    if (fitScore >= band.min) {
      return { recommendation: band.recommendation, label: band.label };
    }
  }
  return OPPORTUNITY_RECOMMENDATION_BANDS[OPPORTUNITY_RECOMMENDATION_BANDS.length - 1];
}

export function scoreOpportunity(
  resume: ParsedResume,
  job: ParsedJob,
  options: ScoreOpportunityOptions = {},
): ScoreResult {
  const mode: ScoringMode = options.mode ?? "registered";
  const jobBlob = buildJobBlob(job, options.jobTitle, options.jobText);
  const roleDetected = detectRoleArchetype(options.jobTitle ?? job.roleTitle, jobBlob);

  const categories: OpportunityCategoryScore[] = [
    scoreRoleAlignment(job, options.jobTitle, jobBlob),
    scoreQualificationsMatch(resume, job),
    scoreIndustryAlignment(resume, job),
  ];

  if (mode === "registered") {
    categories.push(
      scorePreferenceAlignment(resume, job, options.profile, options),
      scoreClientQuality(job, jobBlob),
    );
  }

  let fitScore = 0;
  let totalWeight = 0;
  for (const c of categories) {
    fitScore += c.contribution;
    totalWeight += c.weight;
  }
  if (totalWeight > 0 && totalWeight !== 100) {
    fitScore = round((fitScore / totalWeight) * 100);
  } else {
    fitScore = round(fitScore);
  }

  const qual = categories.find((c) => c.category === "qualificationsMatch")!;
  const { recommendation, label: recommendationLabel } = recommend(fitScore);

  const onboarding = computeOnboardingCareerFitAdjustment(
    resume,
    job,
    options.profile,
    {
      jobTitle: options.jobTitle,
      jobText: options.jobText,
      posting: options.posting ?? null,
    },
  );

  const weightParts = categories.map(
    (c) => `${c.label} ${c.score}% × ${c.weight}% = ${c.contribution}`,
  );
  const finalReasoning = [
    `Role archetype: ${roleDetected.label ?? "unknown"} (${roleDetected.tier}).`,
    `Qualifications: ${qual.matchedCount ?? 0}/${qual.totalCount ?? 0}.`,
    `Weighted fit ${fitScore}/100 → ${recommendationLabel}.`,
  ].join(" ");

  const opportunityDebug: OpportunityEngineDebug = {
    detectedRoleArchetype: roleDetected.label,
    roleArchetypeTier: roleDetected.tier,
    detectedIndustries: normalizeIndustryList(job.industries).industries,
    matchedQualifications: qual.matchedLabels ?? [],
    missingQualifications: qual.missingLabels ?? [],
    preferencesApplied: onboarding.positiveSignalsFound,
    redFlagsTriggered: onboarding.negativeSignalsFound,
    categoryScores: categories,
    weightingCalculation: weightParts.join(" | "),
    finalReasoning,
    parsedJobMetadata: {
      roleTitle: job.roleTitle ?? options.jobTitle ?? null,
      employerType: job.employerType ?? null,
      hireTarget: job.hireTarget ?? null,
      industries: job.industries,
      skillCount: job.skills?.length ?? 0,
      toolCount: job.toolRequirements?.length ?? 0,
      postingDetails: job.postingDetails ?? null,
    },
  };

  return {
    qualificationScore: qual.score,
    confidenceScore: round(
      categories.filter((c) => c.score > 0).length / categories.length * 100,
    ),
    careerFitAdjustment: onboarding.delta,
    fitScore,
    recommendation,
    recommendationLabel,
    scoringMode: mode,
    categoryBreakdown: [],
    opportunityCategories: categories,
    opportunityDebug,
    unknownCategories: [],
    explanation: finalReasoning,
    strengths: qual.matchedLabels?.slice(0, 5) ?? [],
    gaps: qual.missingLabels?.slice(0, 5) ?? [],
    positiveSignalsFound: onboarding.positiveSignalsFound,
    negativeSignalsFound: onboarding.negativeSignalsFound,
  };
}
