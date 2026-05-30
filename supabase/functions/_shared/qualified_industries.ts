import {
  type CanonicalTechIndustry,
  normalizeIndustryList,
} from "./tech_industries.ts";

/**
 * Industries you are qualified in (profile-only; not shown on resume UI).
 * Job postings mentioning these (or aliases) will match during scoring.
 */
export const PROFILE_QUALIFIED_INDUSTRY_LABELS: CanonicalTechIndustry[] = [
  "AdTech",
  "MarTech",
  "PropTech",
  "CivicTech",
  "GovTech",
  "FinTech",
  "InsurTech",
  "AI",
  "SaaS",
  "Enterprise Software",
  "Analytics",
  "Business Intelligence",
  "Beverage Technology",
  "Gaming",
  "Entertainment",
  "Political Technology",
  "Real Estate",
  "HOA Technology",
  "Marketing Analytics",
  "Media & Publishing",
];

/** Not merged into resume industries for scoring or breakdown matching. */
export const PROFILE_INDUSTRY_MATCH_EXCLUSIONS: CanonicalTechIndustry[] = [
  "Ecommerce",
  "Retail",
  "CPG",
  "Retail Analytics",
];

export function isExcludedIndustryMatch(label: string): boolean {
  return (PROFILE_INDUSTRY_MATCH_EXCLUSIONS as readonly string[]).includes(
    label,
  );
}

/** Merge profile qualified industries into resume for scoring only. */
export function resumeWithQualifiedIndustries(
  resumeIndustries: string[] | undefined | null,
  profileQualified: string[] | null | undefined,
): CanonicalTechIndustry[] {
  const fromResume = normalizeIndustryList(resumeIndustries).industries.filter(
    (l) => !isExcludedIndustryMatch(l),
  );
  const fromProfile = normalizeIndustryList(profileQualified ?? [])
    .industries.filter((l) => !isExcludedIndustryMatch(l));

  const seen = new Set<string>(fromResume);
  const merged = [...fromResume];
  for (const label of fromProfile) {
    if (!seen.has(label)) {
      seen.add(label);
      merged.push(label);
    }
  }
  return merged;
}
