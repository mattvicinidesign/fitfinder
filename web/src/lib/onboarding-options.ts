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
  "Freelance",
  "Contract",
  "Fractional",
  "Full-Time",
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

export const RED_FLAG_OPTIONS = [
  "Agency Hiring",
  "Marketing Designer Roles",
  "Brand Designer Roles",
  "Graphic Design Roles",
  "Visual Designer Roles",
  "Shopify/E-Commerce Roles",
  "WordPress Roles",
  "Consumer Mobile Roles",
] as const;

/** Example minimum hourly rates used as quick-pick chips. */
export const HOURLY_RATE_PRESETS = [50, 75, 100, 125, 150] as const;
