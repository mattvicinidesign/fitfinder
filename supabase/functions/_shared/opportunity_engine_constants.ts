import type { Recommendation } from "./types.ts";

/** Opportunity Engine category weights (sum = 100). */
export const OPPORTUNITY_WEIGHTS = {
  roleAlignment: 35,
  qualificationsMatch: 30,
  industryAlignment: 15,
  preferenceAlignment: 10,
  clientQuality: 10,
} as const;

export type OpportunityCategoryKey = keyof typeof OPPORTUNITY_WEIGHTS;

export const OPPORTUNITY_CATEGORY_LABELS: Record<OpportunityCategoryKey, string> = {
  roleAlignment: "Role Alignment",
  qualificationsMatch: "Qualifications",
  industryAlignment: "Industry Alignment",
  preferenceAlignment: "Preference Alignment",
  clientQuality: "Client Quality",
};

/** Strong product/design role positioning. */
export const POSITIVE_ROLE_ARCHETYPES = [
  "product designer",
  "senior product designer",
  "lead product designer",
  "principal product designer",
  "product ux",
  "ux strategist",
  "enterprise ux designer",
  "saas product designer",
  "ai product designer",
  "workflow designer",
  "analytics product designer",
  "design systems designer",
  "ux designer",
  "senior ux designer",
];

/** Roles that should not score highly even with keyword overlap. */
export const NEGATIVE_ROLE_ARCHETYPES = [
  "brand designer",
  "marketing designer",
  "graphic designer",
  "visual designer",
  "ecommerce designer",
  "website designer",
  "social media designer",
  "creative designer",
  "campaign designer",
  "email marketing designer",
  "art director",
];

export const STRONG_INDUSTRIES = [
  "AI",
  "SaaS",
  "AdTech",
  "MarTech",
  "Analytics",
  "Business Intelligence",
  "Data Platforms",
  "PropTech",
  "FinTech",
  "Enterprise Software",
  "Productivity Software",
  "Workflow Platforms",
  "B2B SaaS",
  "GovTech",
  "InsurTech",
  "Gaming",
  "Entertainment",
];

export const NEUTRAL_INDUSTRIES = [
  "Healthcare",
  "HealthTech",
  "Education",
  "EdTech",
  "Consumer Products",
];

export const LOWER_INDUSTRIES = [
  "Ecommerce",
  "Retail",
  "CPG",
  "Retail Analytics",
  "Local Business",
  "Small Business Marketing",
];

/**
 * Display scale 0–10 = fitScore ÷ 10 (stored fitScore 0–100).
 * 8.5–10.0 Strong Pursuit | 7.0–8.4 Good Opportunity | 5.0–6.9 Proceed With Caution | 0.0–4.9 Not Recommended
 */
export const OPPORTUNITY_RECOMMENDATION_BANDS: {
  min: number;
  recommendation: Recommendation;
  label: string;
}[] = [
  { min: 85, recommendation: "strong_apply", label: "Strong Pursuit" },
  { min: 70, recommendation: "apply", label: "Good Opportunity" },
  { min: 50, recommendation: "stretch", label: "Proceed With Caution" },
  { min: 0, recommendation: "not_recommended", label: "Not Recommended" },
];
