import {
  normalizeCountry,
  preferredLocationMatchesCandidate,
} from "@/lib/country-match";
import { NOT_SPECIFIED_LABEL } from "@/lib/not-specified";
import {
  resolveJobPreferredLocation,
  resolveJobTimezoneRequirement,
} from "@/lib/preferred-qualifications-parse";
import type { ParsedJob, ParsedResume } from "@/lib/types";

export interface JobPostingRequirementDisplay {
  requirement: string;
  hasExplicitRequirement: boolean;
  badgeLabel: string;
  statusLine: string;
  /** Green pill when the posting calls for the US / Americas. */
  positive?: boolean;
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the posting's country/location requirement includes US or Americas. */
export function postingRequiresAmericasRegion(requirement: string): boolean {
  const raw = requirement.trim();
  if (!raw) return false;
  if (normalizeCountry(raw) === "us") return true;

  const n = normalizeToken(raw);
  if (/\bamericas\b/.test(n)) return true;
  if (/\b(?:north|south|latin)\s+america\b/.test(n)) return true;
  if (/\bamerica\b/.test(n) && !/\bamerican\s+english\b/.test(n)) return true;

  return false;
}


export interface JobPostingRequirementsOptions {
  jobDescription?: string | null;
}

function toDisplay(
  requirement: string | null,
  kind: "location" | "timezone",
  matched = false,
): JobPostingRequirementDisplay {
  const value = requirement?.trim() ?? "";
  const hasExplicitRequirement = value.length > 0;
  const emptyLabel = NOT_SPECIFIED_LABEL;
  return {
    requirement: value,
    hasExplicitRequirement,
    badgeLabel: hasExplicitRequirement ? value : emptyLabel,
    statusLine: hasExplicitRequirement
      ? `Posting requires ${kind}: ${value}`
      : kind === "timezone"
        ? "No timezone field in Preferred qualifications"
        : "Posting has no Location in Preferred qualifications",
    positive: hasExplicitRequirement && matched,
  };
}

export interface JobPreferredLocationOptions extends JobPostingRequirementsOptions {
  parsedResume?: ParsedResume | null;
  profileCountry?: string | null;
}

export function jobPreferredLocationDisplay(
  parsedJob?: ParsedJob,
  options?: JobPreferredLocationOptions,
): JobPostingRequirementDisplay {
  const requirement = resolveJobPreferredLocation(
    parsedJob,
    options?.jobDescription,
  );
  const candidate =
    options?.parsedResume?.country?.trim() ??
    options?.profileCountry?.trim() ??
    null;
  const matched = requirement
    ? preferredLocationMatchesCandidate(requirement, candidate)
    : false;
  return toDisplay(requirement, "location", matched);
}

/** @deprecated Use jobPreferredLocationDisplay */
export function jobCountryRequirementDisplay(
  parsedJob?: ParsedJob,
  options?: JobPostingRequirementsOptions,
): JobPostingRequirementDisplay {
  return jobPreferredLocationDisplay(parsedJob, options);
}

export function jobTimezoneRequirementDisplay(
  parsedJob?: ParsedJob,
  options?: JobPostingRequirementsOptions,
): JobPostingRequirementDisplay {
  return toDisplay(
    resolveJobTimezoneRequirement(parsedJob, options?.jobDescription),
    "timezone",
  );
}
