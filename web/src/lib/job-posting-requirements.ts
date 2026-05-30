import { normalizeCountry } from "@/lib/country-match";
import { NOT_SPECIFIED_LABEL } from "@/lib/not-specified";
import {
  resolveJobCountryRequirement,
  resolveJobTimezoneRequirement,
} from "@/lib/preferred-qualifications-parse";
import type { ParsedJob } from "@/lib/types";

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
  kind: "country" | "timezone",
  positive = false,
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
        : "Posting has no explicit country requirement",
    positive: hasExplicitRequirement && positive,
  };
}

export function jobCountryRequirementDisplay(
  parsedJob?: ParsedJob,
  options?: JobPostingRequirementsOptions,
): JobPostingRequirementDisplay {
  const requirement = resolveJobCountryRequirement(
    parsedJob,
    options?.jobDescription,
  );
  return toDisplay(
    requirement,
    "country",
    postingRequiresAmericasRegion(requirement ?? ""),
  );
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
