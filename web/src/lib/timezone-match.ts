/**
 * Timezone match logic — keep in sync with
 * supabase/functions/_shared/scoring.ts scoreTimezone()
 */

import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";

export type TimezoneOutcome =
  | "no_job_requirement"
  | "no_candidate_timezone"
  | "matched"
  | "mismatched";

export interface TimezoneDetail {
  outcome: TimezoneOutcome;
  jobRequirement: string | null;
  candidateTimezone: string | null;
  candidateSource: "resume" | "profile" | null;
  overlap: boolean;
  /** 100, 40, or null when unknown */
  inferredScore: number | null;
  summary: string;
  matchLabel: string;
  edgeNotes: string[];
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function timezoneOverlap(requirement: string, candidate: string): boolean {
  const nr = normalizeToken(requirement);
  const nc = normalizeToken(candidate);
  return nr === nc || nr.includes(nc) || nc.includes(nr);
}

export function evaluateTimezone(
  jobRequirement: string | null | undefined,
  candidateTimezone: string | null | undefined,
): Pick<TimezoneDetail, "outcome" | "overlap" | "inferredScore"> {
  const req = jobRequirement?.trim() ?? "";
  const cand = candidateTimezone?.trim() ?? "";

  if (!req) {
    return { outcome: "no_job_requirement", overlap: false, inferredScore: null };
  }
  if (!cand) {
    return { outcome: "no_candidate_timezone", overlap: false, inferredScore: null };
  }

  const overlap = timezoneOverlap(req, cand);
  return {
    outcome: overlap ? "matched" : "mismatched",
    overlap,
    inferredScore: overlap ? 100 : 40,
  };
}

export function buildTimezoneDetail(
  parsedJob?: ParsedJob,
  parsedResume?: ParsedResume | null,
  profileTimezone?: string | null,
  category?: CategoryScore,
): TimezoneDetail {
  const jobRequirement = parsedJob?.timezoneRequirement?.trim() || null;

  const resumeTz = parsedResume?.timezone?.trim() || null;
  const profileTz = profileTimezone?.trim() || null;
  const candidateTimezone = resumeTz ?? profileTz;
  const candidateSource: TimezoneDetail["candidateSource"] = resumeTz
    ? "resume"
    : profileTz
      ? "profile"
      : null;

  const { outcome, overlap, inferredScore } = evaluateTimezone(
    jobRequirement,
    candidateTimezone,
  );

  const edgeNotes = [
    "Scored only when the job parse found an explicit timezone requirement and your timezone is known (resume parse or Profile).",
    "If the posting has no parsed requirement, this category is Unknown and does not count against qualification (1% weight when scored).",
    "Match uses normalized text overlap (e.g. “EST” inside “US Eastern”), not UTC offset math.",
    "100% when requirement and yours overlap; 40% when both are set but strings do not overlap.",
  ];

  let summary: string;
  let matchLabel: string;

  switch (outcome) {
    case "no_job_requirement":
      summary =
        "No explicit timezone requirement was parsed from this job posting.";
      matchLabel = "Not required in posting";
      edgeNotes.push(
        "Remote roles often mention hours in prose without a timezone field — the parser may still miss implicit requirements.",
      );
      break;
    case "no_candidate_timezone":
      summary =
        "This posting requires a timezone, but none was found on your resume parse or Profile.";
      matchLabel = "Your timezone not set";
      edgeNotes.push(
        "Add timezone under Profile (e.g. America/New_York) or state it on your resume, then re-analyze.",
      );
      break;
    case "matched":
      summary = "Your timezone overlaps the posting’s stated requirement.";
      matchLabel = "Matched";
      break;
    case "mismatched":
      summary =
        "The posting states a timezone requirement that does not overlap your timezone (partial penalty).";
      matchLabel = "In posting, not matched";
      break;
  }

  const pct =
    category && category.status !== "unknown"
      ? Math.round(category.score)
      : inferredScore;

  if (pct != null && outcome === "mismatched") {
    summary = `${summary} Score: ${pct}%.`;
  } else if (pct === 100 && outcome === "matched") {
    summary = `${summary} Score: 100%.`;
  }

  return {
    outcome,
    jobRequirement,
    candidateTimezone,
    candidateSource,
    overlap,
    inferredScore: pct ?? inferredScore,
    summary,
    matchLabel,
    edgeNotes,
  };
}
