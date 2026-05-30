// Constants for the V1 Qualification Engine (weights, adjacency, signals).

import type { CategoryKey } from "./types.ts";

export type ScoringMode = "guest" | "registered";

/** Card sections sum to 100: Qualifications 50, Role 25, Client Profile 15, Preferences 10. */
export const REGISTERED_WEIGHTS: Record<CategoryKey, number> = {
  skills: 33,
  industry: 20,
  workflow: 0, // hidden in V1 UI — not scored until product defines workflow matching
  tools: 17,
  aiEmphasis: 8,
  archetype: 0,
  softwareModel: 0,
  compensation: 5,
  country: 2,
  timezone: 15,
};

/** Guest: same section split minus Client Profile (50 + 25 + 10 = 85, renormalized in engine). */
export const GUEST_WEIGHTS: Partial<Record<CategoryKey, number>> = {
  skills: 50,
  industry: 25,
  aiEmphasis: 10,
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  skills: "Skills",
  industry: "Industry",
  workflow: "Workflow",
  tools: "Tools",
  aiEmphasis: "AI emphasis",
  archetype: "Archetype",
  softwareModel: "Software model",
  compensation: "Compensation",
  country: "Country",
  timezone: "Timezone",
};

/** Industry clusters for adjacency scoring. */
export const INDUSTRY_CLUSTERS: string[][] = [
  ["adtech", "martech", "advertising", "marketing technology"],
  ["fintech", "banking", "financial services", "insurance", "payments"],
  ["proptech", "real estate", "property", "construction tech"],
  ["healthtech", "healthcare", "medtech", "life sciences", "biotech"],
  ["govtech", "government", "public sector"],
  ["ecommerce", "retail", "dtc", "marketplace"],
  ["supply chain", "logistics", "warehouse", "fulfillment"],
  ["saas", "b2b saas", "enterprise software", "software"],
  ["edtech", "education"],
  ["gaming", "entertainment"],
];

export const RELATED_INDUSTRY_PAIRS: [string, string][] = [
  ["fintech", "saas"],
  ["healthtech", "saas"],
  ["ecommerce", "retail"],
  ["adtech", "ecommerce"],
  ["martech", "ecommerce"],
];

export const SOFTWARE_MODELS = [
  "b2b saas",
  "enterprise software",
  "marketplace",
  "consumer mobile",
  "ecommerce",
  "internal tools",
  "platform",
];

export const HIGH_PENALTY_ROLES = [
  "brand designer",
  "marketing designer",
  "creative designer",
  "graphic designer",
  "art director",
  "ecommerce designer",
  "social media designer",
  "campaign designer",
  "email marketing designer",
];

export const HIGH_PENALTY_SIGNALS = [
  "brand guidelines",
  "creative assets",
  "ad creatives",
  "paid media",
  "social graphics",
  "email templates",
  "shopify",
  "conversion funnels",
  "growth marketing",
];

export const MEDIUM_PENALTY_ROLES = [
  "ui designer",
  "ui specialist",
  "visual designer",
  "production designer",
];

export const MEDIUM_PENALTY_SIGNALS = [
  "pixel-perfect execution",
  "visual polish",
  "marketing websites",
  "design mockups",
  "no workflow ownership",
  "no product strategy",
  "no ux research",
  "no information architecture",
];

export const CONSUMER_MOBILE_SIGNALS = [
  "creator economy",
  "social networking",
  "dating apps",
  "lifestyle apps",
  "influencer platforms",
  "engagement loops",
];

export const CONSUMER_MOBILE_MITIGATIONS = [
  "analytics",
  "dashboarding",
  "reporting",
  "ai",
  "admin systems",
  "internal tools",
  "enterprise workflows",
];

export const POSITIVE_SIGNALS = [
  "enterprise saas",
  "analytics",
  "dashboarding",
  "reporting",
  "data visualization",
  "workflow design",
  "information architecture",
  "internal tools",
  "admin systems",
  "operations software",
  "adtech",
  "martech",
  "proptech",
  "fintech",
  "healthtech",
  "supply chain",
  "ai-assisted workflows",
  "ai-native products",
  "ai native",
  "agentic experiences",
  "llm products",
];

/** Archetype similarity (0–100) for common product/design roles. */
export const ARCHETYPE_SIMILARITY: Record<string, Record<string, number>> = {
  "product designer": {
    "product designer": 100,
    "senior product designer": 100,
    "lead product designer": 95,
    "ux designer": 80,
    "design systems designer": 85,
    "ux researcher": 55,
    "product manager": 45,
    "marketing designer": 20,
    "brand designer": 15,
    "ui designer": 70,
  },
  "ux designer": {
    "ux designer": 100,
    "product designer": 80,
    "ux researcher": 75,
    "ui designer": 65,
    "marketing designer": 25,
  },
};

/**
 * Canonical recommendation bands (fitScore 0–100; display ÷10 for 0–10 ring).
 * 8.5–10.0 Highly Recommended | 7.0–8.4 Recommended | 5.0–6.9 Somewhat Recommended | 0.0–4.9 Not Recommended
 */
export const RECOMMENDATION_BANDS = [
  { min: 85, recommendation: "strong_apply" as const, label: "Highly Recommended" },
  { min: 70, recommendation: "apply" as const, label: "Recommended" },
  { min: 50, recommendation: "stretch" as const, label: "Somewhat Recommended" },
  { min: 0, recommendation: "not_recommended" as const, label: "Not Recommended" },
];
