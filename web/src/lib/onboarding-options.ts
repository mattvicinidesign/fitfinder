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

export const COMPANY_TYPE_OPTIONS = [
  "Company",
  "Startup",
  "Agency",
] as const;

export const REGION_OPTIONS = [
  "United States",
  "Canada",
  "Europe",
  "Australia",
  "Worldwide",
] as const;

/** Profile / signup country — used for country-fit scoring on reports. */
export const LOCATION_OPTIONS = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "India",
  "Netherlands",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "Japan",
  "Singapore",
  "Ireland",
  "New Zealand",
  "Philippines",
  "Poland",
  "Ukraine",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Austria",
  "Belgium",
  "Portugal",
  "Israel",
  "South Africa",
] as const;

/** Ongoing retainer vs one-time project — maps to posting engagement duration. */
export const PROJECT_TYPE_OPTIONS = ["Ongoing", "One-Time"] as const;

/** Example minimum hourly rates used as quick-pick chips. */
export const HOURLY_RATE_PRESETS = [50, 75, 100, 125, 150] as const;

export const HOURLY_RATE_MIN = 25;
export const HOURLY_RATE_MAX = 200;
export const HOURLY_RATE_STEP = 5;
export const HOURLY_RATE_DEFAULT = 75;

/** Minimum client star rating (0–5) quick picks for onboarding. */
export const EMPLOYER_RATING_PRESETS = [3, 3.5, 4, 4.5, 5] as const;
