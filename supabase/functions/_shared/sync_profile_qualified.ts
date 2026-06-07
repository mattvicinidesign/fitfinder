/**
 * Sync resume-derived qualified industries/skills into the profile row.
 * These columns are analysis-managed — onboarding never writes them.
 */

import {
  PROFILE_QUALIFIED_INDUSTRY_LABELS,
  resumeWithQualifiedIndustries,
} from "./qualified_industries.ts";
import {
  qualifiedSkillLabelsFromResume,
} from "./qualified_skills.ts";
import { normalizeIndustryList } from "./tech_industries.ts";
import type { ParsedResume } from "./types.ts";

function qualifiedSkillsFromParsed(parsed: ParsedResume): string[] {
  return qualifiedSkillLabelsFromResume(parsed.skills);
}

function qualifiedIndustriesFromParsed(parsed: ParsedResume): string[] {
  const allowed = new Set<string>(PROFILE_QUALIFIED_INDUSTRY_LABELS);
  const parsedIndustries = normalizeIndustryList(parsed.industries).industries;
  return parsedIndustries.filter((label) => allowed.has(label));
}

/** Merge parsed resume signals into profile qualified_* arrays. */
export function mergeProfileQualifiedFromParsed(
  existing: {
    qualified_industries?: string[] | null;
    qualified_skills?: string[] | null;
  } | null | undefined,
  parsed: ParsedResume,
): { qualified_industries: string[]; qualified_skills: string[] } {
  const industries = resumeWithQualifiedIndustries(
    qualifiedIndustriesFromParsed(parsed),
    existing?.qualified_industries,
  );
  const skills = [...new Set([
    ...(existing?.qualified_skills ?? []),
    ...qualifiedSkillsFromParsed(parsed),
  ])];

  return { qualified_industries: industries, qualified_skills: skills };
}
