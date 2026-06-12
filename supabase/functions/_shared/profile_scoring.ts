/**
 * Bridge onboarding/profile data into resume parsing and scoring.
 * Onboarding preferences are additive signals — they never change category weights.
 */

import { compensationFromProfileRow } from "./profile_compensation.ts";
import { resumeWithQualifiedIndustries } from "./qualified_industries.ts";
import {
  qualifiedSkillLabelsFromResume,
  resumeSkillsForScoring,
} from "./qualified_skills.ts";
import type { ParsedJob, ParsedResume } from "./types.ts";
import type { PostingContext } from "./posting_context.ts";

export interface ProfileScoringRow {
  country?: string | null;
  timezone?: string | null;
  desired_compensation?: number | null;
  desired_compensation_min?: number | null;
  desired_compensation_max?: number | null;
  desired_compensation_currency?: string | null;
  desired_compensation_period?: string | null;
  qualified_industries?: string[] | null;
  qualified_skills?: string[] | null;
  preferred_engagement_types?: string[] | null;
  preferred_regions?: string[] | null;
  preferred_company_types?: string[] | null;
}

export interface OnboardingAdjustment {
  delta: number;
  negativeSignalsFound: string[];
  positiveSignalsFound: string[];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

/** Merge profile onboarding + qualified signals into the resume used for scoring. */
export function mergeProfileIntoResumeForScoring(
  resume: ParsedResume,
  profile: ProfileScoringRow | null | undefined,
): ParsedResume {
  const qualifiedForScoring = profile?.qualified_skills?.length
    ? profile.qualified_skills
    : qualifiedSkillLabelsFromResume(resume.skills);

  let merged: ParsedResume = {
    ...resume,
    skills: resumeSkillsForScoring(resume.skills, qualifiedForScoring),
  };

  if (!profile) return merged;

  const profileCountry =
    typeof profile.country === "string" && profile.country.trim()
      ? profile.country.trim()
      : null;
  const profileTimezone =
    typeof profile.timezone === "string" && profile.timezone.trim()
      ? profile.timezone.trim()
      : null;

  merged = {
    ...merged,
    country: resume.country?.trim() || profileCountry || resume.country,
    timezone: resume.timezone?.trim() || profileTimezone || resume.timezone,
    industries: resumeWithQualifiedIndustries(
      resume.industries,
      profile.qualified_industries,
    ),
  };

  const profileDesired = compensationFromProfileRow(profile);
  if (profileDesired && !merged.desiredCompensation) {
    merged = { ...merged, desiredCompensation: profileDesired };
  }

  return merged;
}

function inferJobEngagementTypes(
  job: ParsedJob,
  posting: PostingContext | null,
  blob: string,
): string[] {
  const labels = new Set<string>();

  if (
    posting?.engagementPath === "contract" ||
    posting?.engagementPath === "contract_to_hire" ||
    job.hireTarget === "freelancer" ||
    /\bfreelance\b|\bfreelancer\b|\b1099\b|\bcontractor\b/.test(blob)
  ) {
    labels.add("Freelance");
    labels.add("Contract");
  }

  if (/\bfractional\b|\bpart[- ]?time cpo\b|\bpart[- ]?time cto\b/.test(blob)) {
    labels.add("Fractional");
  }

  if (
    posting?.engagementPath === "direct_hire" ||
    posting?.payStructure === "salary" ||
    job.hireTarget === "direct_hire" ||
    /\bfull[- ]?time\b|\bw-?2\b|\bsalary\b|\bpermanent\b/.test(blob)
  ) {
    labels.add("Full-Time");
  }

  return [...labels];
}

function inferJobCompanyTypes(
  job: ParsedJob,
  posting: PostingContext | null,
  blob: string,
): string[] {
  const labels = new Set<string>();

  if (posting?.employerType === "agency" || job.employerType === "agency") {
    labels.add("Agency");
  }
  if (/\bstartup\b|\bearly[- ]?stage\b|\bseed stage\b/.test(blob)) {
    labels.add("Startup");
  }
  if (/\bscale[- ]?up\b|\bseries [abc]\b|\bgrowth stage\b/.test(blob)) {
    labels.add("Scale-Up");
  }
  if (/\benterprise\b|\bfortune 500\b|\bglobal company\b/.test(blob)) {
    labels.add("Enterprise");
  }
  if (/\bfounder[- ]?led\b|\bfounder led\b|\bfounder's vision\b/.test(blob)) {
    labels.add("Founder-Led");
  }

  return [...labels];
}

function inferJobRegions(job: ParsedJob, blob: string): string[] {
  const labels = new Set<string>();
  const location = [job.country, job.timezone, blob].filter(Boolean).join(" ");
  const lower = normalizeText(location);

  if (/\bunited states\b|\busa\b|\bu\.s\.?\b|\bamerica\b/.test(lower)) {
    labels.add("United States");
  }
  if (/\bcanada\b|\bcanadian\b/.test(lower)) labels.add("Canada");
  if (/\beurope\b|\beu\b|\bemea\b|\buk\b|\bunited kingdom\b/.test(lower)) {
    labels.add("Europe");
  }
  if (/\baustralia\b|\baustralian\b|\banz\b/.test(lower)) labels.add("Australia");
  if (/\bworldwide\b|\bglobal\b|\banywhere\b|\bremote worldwide\b/.test(lower)) {
    labels.add("Worldwide");
  }

  return [...labels];
}

function preferenceOverlap(selected: string[], inferred: string[]): string[] {
  if (selected.length === 0 || inferred.length === 0) return [];
  const inferredNorm = new Set(inferred.map(normalizeText));
  return selected.filter((label) => inferredNorm.has(normalizeText(label)));
}

/** User onboarding preferences adjust career fit (additive). */
export function computeOnboardingCareerFitAdjustment(
  resume: ParsedResume,
  job: ParsedJob,
  profile: ProfileScoringRow | null | undefined,
  options: {
    jobTitle?: string | null;
    jobText?: string | null;
    posting?: PostingContext | null;
  } = {},
): OnboardingAdjustment {
  if (!profile) {
    return { delta: 0, negativeSignalsFound: [], positiveSignalsFound: [] };
  }

  const blob = normalizeText(
    [
      options.jobTitle ?? "",
      job.roleTitle ?? "",
      options.jobText ?? "",
      job.postingContextDetail ?? "",
      ...(job.skills ?? []),
      ...(job.industries ?? []),
      ...(job.workflows ?? []),
      ...(job.toolRequirements ?? []),
      ...(job.aiRequirements ?? []),
      ...(job.softwareModels ?? []),
      ...(resume.skills ?? []),
      ...(resume.industries ?? []),
    ].join(" "),
  );

  let delta = 0;
  const negativeSignalsFound: string[] = [];
  const positiveSignalsFound: string[] = [];

  const engagementPrefs = stringArray(profile.preferred_engagement_types);
  const engagementInJob = inferJobEngagementTypes(job, options.posting ?? null, blob);
  const engagementOverlap = preferenceOverlap(engagementPrefs, engagementInJob);
  if (engagementPrefs.length > 0 && engagementInJob.length > 0) {
    if (engagementOverlap.length === 0) {
      delta -= 5;
      negativeSignalsFound.push(
        `Engagement mismatch (you prefer ${engagementPrefs.join(", ")})`,
      );
    } else {
      delta += 3;
      positiveSignalsFound.push(
        `Engagement match (${engagementOverlap.join(", ")})`,
      );
    }
  }

  const companyPrefs = stringArray(profile.preferred_company_types);
  const companyInJob = inferJobCompanyTypes(job, options.posting ?? null, blob);
  const companyOverlap = preferenceOverlap(companyPrefs, companyInJob);
  if (companyPrefs.length > 0 && companyInJob.length > 0) {
    if (companyOverlap.length === 0) {
      delta -= 4;
      negativeSignalsFound.push(
        `Company type mismatch (you prefer ${companyPrefs.join(", ")})`,
      );
    } else {
      delta += 2;
      positiveSignalsFound.push(
        `Company type match (${companyOverlap.join(", ")})`,
      );
    }
  }

  const regionPrefs = stringArray(profile.preferred_regions);
  const regionsInJob = inferJobRegions(job, blob);
  const regionOverlap = preferenceOverlap(regionPrefs, regionsInJob);
  if (regionPrefs.length > 0 && regionsInJob.length > 0) {
    if (regionOverlap.length === 0) {
      delta -= 4;
      negativeSignalsFound.push(
        `Region mismatch (you prefer ${regionPrefs.join(", ")})`,
      );
    } else {
      delta += 2;
      positiveSignalsFound.push(`Region match (${regionOverlap.join(", ")})`);
    }
  }

  return {
    delta: Math.max(-20, Math.min(10, delta)),
    negativeSignalsFound,
    positiveSignalsFound,
  };
}
