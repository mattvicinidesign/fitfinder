/**
 * Country match logic — keep in sync with
 * supabase/functions/_shared/scoring.ts scoreCountry()
 */

import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";

export type CountryOutcome =
  | "no_job_requirement"
  | "no_candidate_country"
  | "matched"
  | "mismatched";

export interface CountryDetail {
  outcome: CountryOutcome;
  jobRequirement: string | null;
  candidateCountry: string | null;
  candidateSource: "resume" | "profile" | null;
  /** Normalized tokens used for comparison */
  normalizedRequirement: string | null;
  normalizedCandidate: string | null;
  match: boolean;
  /** 100, 15, or null when unknown */
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

/** Same rules as scoring.ts normalizeCountry */
export function normalizeCountry(value: string): string {
  const n = normalizeToken(value);
  if (n === "us" || n === "usa" || n.includes("united states")) return "us";
  return n;
}

export function evaluateCountry(
  jobRequirement: string | null | undefined,
  candidateCountry: string | null | undefined,
): Pick<
  CountryDetail,
  "outcome" | "match" | "inferredScore" | "normalizedRequirement" | "normalizedCandidate"
> {
  const req = jobRequirement?.trim() ?? "";
  const cand = candidateCountry?.trim() ?? "";

  if (!req) {
    return {
      outcome: "no_job_requirement",
      match: false,
      inferredScore: null,
      normalizedRequirement: null,
      normalizedCandidate: null,
    };
  }
  if (!cand) {
    return {
      outcome: "no_candidate_country",
      match: false,
      inferredScore: null,
      normalizedRequirement: normalizeCountry(req),
      normalizedCandidate: null,
    };
  }

  const normalizedRequirement = normalizeCountry(req);
  const normalizedCandidate = normalizeCountry(cand);
  const match = normalizedRequirement === normalizedCandidate;

  return {
    outcome: match ? "matched" : "mismatched",
    match,
    inferredScore: match ? 100 : 15,
    normalizedRequirement,
    normalizedCandidate,
  };
}

export function buildCountryDetail(
  parsedJob?: ParsedJob,
  parsedResume?: ParsedResume | null,
  profileCountry?: string | null,
  category?: CategoryScore,
): CountryDetail {
  const jobRequirement = parsedJob?.countryRequirement?.trim() || null;

  const resumeCountry = parsedResume?.country?.trim() || null;
  const profileC = profileCountry?.trim() || null;
  const candidateCountry = resumeCountry ?? profileC;
  const candidateSource: CountryDetail["candidateSource"] = resumeCountry
    ? "resume"
    : profileC
      ? "profile"
      : null;

  const {
    outcome,
    match,
    inferredScore,
    normalizedRequirement,
    normalizedCandidate,
  } = evaluateCountry(jobRequirement, candidateCountry);

  const edgeNotes = [
    "Scored only when the job parse found an explicit country requirement and your country is known (resume parse or Profile).",
    "If the posting has no parsed requirement, this category is Unknown and does not count against qualification (2% weight when scored).",
    "Match is exact on normalized country tokens — US / USA / United States count as the same.",
    "100% on match; 15% when both are set but countries differ after normalization.",
  ];

  let summary: string;
  let matchLabel: string;

  switch (outcome) {
    case "no_job_requirement":
      summary =
        "No explicit country requirement was parsed from this job posting.";
      matchLabel = "Not required in posting";
      edgeNotes.push(
        "“Remote worldwide” or authorization lines may not populate countryRequirement — the parser can miss implicit location rules.",
      );
      break;
    case "no_candidate_country":
      summary =
        "This posting requires a country, but none was found on your resume parse or Profile.";
      matchLabel = "Your country not set";
      edgeNotes.push(
        "Add country under Profile or state it on your resume, then re-analyze.",
      );
      break;
    case "matched":
      summary = "Your country matches the posting’s stated requirement.";
      matchLabel = "Matched";
      break;
    case "mismatched":
      summary =
        "The posting’s country requirement does not match yours after normalization.";
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
    candidateCountry,
    candidateSource,
    normalizedRequirement,
    normalizedCandidate,
    match,
    inferredScore: pct ?? inferredScore,
    summary,
    matchLabel,
    edgeNotes,
  };
}
