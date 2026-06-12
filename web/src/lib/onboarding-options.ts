/**
 * Canonical option lists for the onboarding profile.
 *
 * Onboarding only collects PREFERENCES that a resume cannot provide
 * ("Do I want this job?"). Qualifications, skills, tools, industries, roles,
 * and seniority come from the resume + analysis engine ("Can I do this job?")
 * and are intentionally NOT asked here.
 *
 * Stored verbatim on the profile and used as additive matching signals only.
 */

export const ENGAGEMENT_TYPE_OPTIONS = [
  "Full-Time",
  "Part Time",
  "Contract",
  "Freelance",
] as const;

export const COMPANY_TYPE_OPTIONS = [
  "Startup",
  "Scale-Up",
  "Enterprise",
  "Founder-Led",
  "Agency",
] as const;

export const REGION_OPTIONS = [
  "United States",
  "Canada",
  "Europe",
  "Australia",
  "Worldwide",
] as const;

/** Example minimum hourly rates used as quick-pick chips. */
export const HOURLY_RATE_PRESETS = [50, 75, 100, 125, 150] as const;
