/**
 * Canonical option lists for profile preferences and onboarding intent.
 *
 * Matching preferences (rate, employer type, rating, regions) live on Profile
 * and may still influence report UI / career-fit adjustments — they are NOT
 * collected during signup onboarding.
 *
 * Intent options (goals, search stage, help topics) are for personalization,
 * analytics, and product customization only. They must never feed the
 * resume + job-description job-fit score.
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

/** Profile / signup country — used for account localization. */
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

/** Minimum client star rating (0–5) quick picks for profile preferences. */
export const EMPLOYER_RATING_PRESETS = [3, 3.5, 4, 4.5, 5] as const;

/** Signup Step 3 — what brings you to OnlyFit (multi-select). */
export const JOB_SEARCH_GOAL_OPTIONS = [
  "Land my next full-time job",
  "Find contract/freelance work",
  "Improve my resume",
  "Practice interviewing",
  "Explore new career paths",
  "Compare opportunities",
  "Track my job search",
  "Just looking around",
] as const;

/** Signup Step 4 — where you are in your search (single-select). */
export const SEARCH_STAGE_OPTIONS = [
  "Actively applying every week",
  "Preparing to apply",
  "Open to opportunities",
  "Just browsing",
  "Employed but curious",
  "Career transition",
  "Student / New graduate",
] as const;

/** Signup Step 5 — what you'd like help with (multi-select). */
export const HELP_TOPIC_OPTIONS = [
  "Find better matching jobs",
  "Explain why I match",
  "Improve my resume",
  "Optimize for ATS",
  "Compare multiple jobs",
  "Identify missing skills",
  "Discover hidden opportunities",
  "Save time searching",
] as const;
