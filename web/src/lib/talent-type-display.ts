import { resolveJobTalentType } from "@/lib/preferred-qualifications-parse";

export type TalentTypeKind = "independent" | "agency" | "other";

export interface TalentTypeDisplay {
  requirement: string;
  hasExplicitRequirement: boolean;
  badgeLabel: string;
  kind: TalentTypeKind | null;
  /** Green pill when the posting wants an independent freelancer. */
  positive: boolean;
  statusLine: string;
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classify Upwork Talent Type (Independent vs Agency, etc.). */
export function classifyTalentType(raw: string | null | undefined): TalentTypeKind | null {
  const value = raw?.trim();
  if (!value) return null;

  const n = normalizeToken(value);
  if (
    /\bindependent\b/.test(n) ||
    /\bfreelancer\b/.test(n) ||
    /\bcontractor\b/.test(n) ||
    /\bindividual\b/.test(n) ||
    /\bsolo\b/.test(n)
  ) {
    return "independent";
  }
  if (/\bagency\b|\bagencies\b/.test(n)) return "agency";
  return "other";
}

export function talentTypeDisplay(
  jobDescription?: string | null,
): TalentTypeDisplay {
  const requirement = resolveJobTalentType(jobDescription)?.trim() ?? "";
  const hasExplicitRequirement = requirement.length > 0;
  const kind = classifyTalentType(requirement);

  return {
    requirement,
    hasExplicitRequirement,
    badgeLabel: hasExplicitRequirement ? requirement : "Not specified",
    kind,
    positive: kind === "independent",
    statusLine: hasExplicitRequirement
      ? kind === "independent"
        ? "Posting prefers an independent freelancer"
        : kind === "agency"
          ? "Posting prefers an agency"
          : `Posting talent type: ${requirement}`
      : "No Talent Type in Preferred qualifications",
  };
}
