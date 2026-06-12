/**
 * Opportunity Engine — personalized career-fit scoring.
 * Not a keyword matcher: role archetype and qualifications drive the score;
 * preferences and client quality fine-tune the result.
 */

import { detectRoleArchetype } from "./archetype_detection.ts";
import { clientQualityScoreFromJob } from "./client_quality_scoring.ts";
import { formatClientLocationDisplay } from "./client_location_parse.ts";
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
import { findSkillLabelMatch, resumeSkillMatchPool } from "./qualified_skills.ts";
import type { PostingContext } from "./posting_context.ts";
import { isContractToHirePosting } from "./posting_context.ts";
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
  options: Pick<ScoreOpportunityOptions, "jobText" | "posting"> = {},
): OpportunityCategoryScore {
  const detected = detectRoleArchetype(jobTitle ?? job.roleTitle, jobBlob);
  const weight = OPPORTUNITY_WEIGHTS.roleAlignment;
  const details = detected.label
    ? [`Archetype: ${detected.label} (${detected.tier})`]
    : ["Role archetype unclear"];
  if (
    isContractToHirePosting(job, {
      jobText: options.jobText,
      posting: options.posting,
    })
  ) {
    details.push("Contract-To-Hire");
  }
  return {
    category: "roleAlignment",
    label: OPPORTUNITY_CATEGORY_LABELS.roleAlignment,
    score: detected.score,
    weight,
    contribution: round(weight * (detected.score / 100)),
    details,
  };
}

function scoreQualificationsMatch(
  resume: ParsedResume,
  job: ParsedJob,
): OpportunityCategoryScore {
  const skillReqs = job.skills ?? [];
  const toolReqs = job.toolRequirements ?? [];
  const skillPool = resumeSkillMatchPool(resume, null);
  const toolPool = [
    ...(resume.tools ?? []),
    ...(resume.aiExperience ?? []),
  ];

  const matchedLabels: string[] = [];
  const missingLabels: string[] = [];
  let matched = 0;
  let total = 0;

  for (const req of skillReqs) {
    total++;
    if (findSkillLabelMatch(req, skillPool)) {
      matched++;
      matchedLabels.push(req);
    } else {
      missingLabels.push(req);
    }
  }

  if (toolReqs.length > 0) {
    const toolCounts = coverageCounts(toolReqs, toolPool);
    matched += toolCounts.matched;
    total += toolCounts.total;
    matchedLabels.push(...toolCounts.matchedLabels);
    missingLabels.push(...toolCounts.missingLabels);
  }

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

function scoreClientQuality(
  job: ParsedJob,
  profile: ProfileScoringRow | null | undefined,
  jobText?: string | null,
): OpportunityCategoryScore {
  const weight = OPPORTUNITY_WEIGHTS.clientQuality;
  const score = clientQualityScoreFromJob(job, profile, jobText) ?? 50;
  const details = job.postingDetails;
  const signals: string[] = [];

  const location = formatClientLocationDisplay(
    details?.clientCity,
    details?.clientOrigin,
  );
  if (location?.trim()) {
    signals.push(`Location: ${location.trim()}`);
  }
  if (details?.clientRating?.trim()) {
    signals.push(`Rating: ${details.clientRating.trim()}`);
  }
  if (details?.clientAverageHourlyRate?.trim()) {
    signals.push(`Avg pay: ${details.clientAverageHourlyRate.trim()}`);
  }

  return {
    category: "clientQuality",
    label: OPPORTUNITY_CATEGORY_LABELS.clientQuality,
    score,
    weight,
    contribution: round(weight * (score / 100)),
    details: signals.length ? signals : ["Limited About-the-client data"],
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
    scoreRoleAlignment(job, options.jobTitle, jobBlob, options),
    scoreQualificationsMatch(resume, job),
    scoreIndustryAlignment(resume, job),
  ];

  if (mode === "registered") {
    categories.push(
      scorePreferenceAlignment(resume, job, options.profile, options),
      scoreClientQuality(job, options.profile, options.jobText),
    );
  } else {
    categories.push(scoreClientQuality(job, options.profile, options.jobText));
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
    preferenceMismatches: onboarding.negativeSignalsFound,
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
