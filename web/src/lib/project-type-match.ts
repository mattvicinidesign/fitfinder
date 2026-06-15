import { PROJECT_TYPE_OPTIONS } from "@/lib/onboarding-options";
import { resolveEngagementMetadata } from "@/lib/posting-context";
import type { ParsedJob, PostingContext } from "@/lib/types";

export type ProjectTypeLabel = (typeof PROJECT_TYPE_OPTIONS)[number];

export function engagementDurationToProjectType(
  duration: "ongoing" | "short_term" | "unknown" | null | undefined,
): ProjectTypeLabel | null {
  if (duration === "ongoing") return "Ongoing";
  if (duration === "short_term") return "One-Time";
  return null;
}

export function normalizePreferredProjectTypes(
  types: string[] | null | undefined,
): ProjectTypeLabel[] {
  const allowed = new Set<string>(PROJECT_TYPE_OPTIONS);
  const seen = new Set<string>();
  const out: ProjectTypeLabel[] = [];
  for (const raw of types ?? []) {
    const label = raw.trim();
    if (!label || !allowed.has(label) || seen.has(label)) continue;
    seen.add(label);
    out.push(label as ProjectTypeLabel);
  }
  return out;
}

export function resolveJobProjectType(
  parsedJob: ParsedJob | null | undefined,
  options?: {
    jobDescription?: string | null;
    postingContext?: PostingContext | null;
  },
): ProjectTypeLabel | null {
  const fromContext = options?.postingContext?.engagementDuration;
  if (fromContext === "ongoing" || fromContext === "short_term") {
    return engagementDurationToProjectType(fromContext);
  }

  const fromJob = parsedJob?.engagementDuration;
  if (fromJob === "ongoing" || fromJob === "short_term") {
    return engagementDurationToProjectType(fromJob);
  }

  if (parsedJob) {
    const meta = resolveEngagementMetadata(parsedJob, options?.jobDescription);
    return engagementDurationToProjectType(meta.engagementDuration);
  }

  return null;
}

export interface ProjectTypeMatchDetail {
  label: string;
  identified: boolean;
  /** Compare against onboarding prefs — show match/mismatch pills. */
  compareToProfile: boolean;
  matched: boolean;
  points: number | null;
}

export function buildProjectTypeMatchDetail({
  parsedJob,
  postingContext,
  jobDescription,
  profilePreferredProjectTypes,
}: {
  parsedJob?: ParsedJob | null;
  postingContext?: PostingContext | null;
  jobDescription?: string | null;
  profilePreferredProjectTypes?: string[] | null;
}): ProjectTypeMatchDetail {
  const jobType = resolveJobProjectType(parsedJob, {
    jobDescription,
    postingContext,
  });

  if (!jobType) {
    return {
      label: "",
      identified: false,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const userPrefs = normalizePreferredProjectTypes(profilePreferredProjectTypes);
  if (userPrefs.length === 0) {
    return {
      label: jobType,
      identified: true,
      compareToProfile: false,
      matched: false,
      points: null,
    };
  }

  const matched = userPrefs.includes(jobType);
  return {
    label: jobType,
    identified: true,
    compareToProfile: true,
    matched,
    points: matched ? 100 : 0,
  };
}
