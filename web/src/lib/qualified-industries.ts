/**
 * Profile qualified industries — keep in sync with
 * supabase/functions/_shared/qualified_industries.ts
 */

export const PROFILE_QUALIFIED_INDUSTRY_LABELS = [
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
] as const;

/** Not used for industry matching (profile or resume). */
export const PROFILE_INDUSTRY_MATCH_EXCLUSIONS = [
  "Ecommerce",
  "Retail",
  "CPG",
  "Retail Analytics",
] as const;

export function isExcludedIndustryMatch(label: string): boolean {
  return (PROFILE_INDUSTRY_MATCH_EXCLUSIONS as readonly string[]).includes(
    label,
  );
}
