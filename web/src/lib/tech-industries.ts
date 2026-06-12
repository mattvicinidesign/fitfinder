/**
 * Canonical tech industries — keep in sync with supabase/functions/_shared/tech_industries.ts
 */

export const CANONICAL_TECH_INDUSTRIES = [
  "SaaS",
  "Enterprise Software",
  "AI",
  "AdTech",
  "MarTech",
  "FinTech",
  "HealthTech",
  "PropTech",
  "EdTech",
  "HRTech",
  "GovTech",
  "LegalTech",
  "InsurTech",
  "Developer Tools",
  "Analytics",
  "Business Intelligence",
  "Data Analytics",
  "Marketing Analytics",
  "Retail Analytics",
  "Cybersecurity",
  "Ecommerce",
  "Gaming",
  "Consumer Technology",
  "Social Media",
  "Travel Technology",
  "Supply Chain",
  "Manufacturing",
  "Retail",
  "CPG",
  "Beverage Technology",
  "Media & Publishing",
  "Telecommunications",
  "Construction Technology",
  "Energy",
  "Nonprofit",
  "Biotech",
  "Climate Technology",
  "Web3",
  "CivicTech",
  "Entertainment",
  "Political Technology",
  "Real Estate",
  "HOA Technology",
] as const;

export type CanonicalTechIndustry = (typeof CANONICAL_TECH_INDUSTRIES)[number];

export function normalizeIndustryToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NOT_INDUSTRY_PHRASES = new Set(
  [
    "web design",
    "mobile app development",
    "mobile development",
    "app development",
    "software development",
    "product design",
    "ux design",
    "ui design",
    "graphic design",
    "visual design",
    "interaction design",
    "design systems",
    "user research",
    "ux research",
    "prototyping",
    "wireframing",
    "front end",
    "frontend",
    "back end",
    "backend",
    "full stack",
    "fullstack",
    "data science",
    "project management",
    "program management",
    "content design",
    "brand design",
    "marketing design",
    "motion design",
    "animation",
    "devops",
    "customer success",
  ].map(normalizeIndustryToken),
);

const INDUSTRY_ALIASES: Record<string, CanonicalTechIndustry> = {
  saas: "SaaS",
  "b2b saas": "SaaS",
  "enterprise software": "Enterprise Software",
  enterprise: "Enterprise Software",
  b2b: "Enterprise Software",
  ai: "AI",
  "artificial intelligence": "AI",
  adtech: "AdTech",
  "ad tech": "AdTech",
  martech: "MarTech",
  "mar tech": "MarTech",
  fintech: "FinTech",
  "fin tech": "FinTech",
  healthtech: "HealthTech",
  healthcare: "HealthTech",
  proptech: "PropTech",
  edtech: "EdTech",
  hrtech: "HRTech",
  govtech: "GovTech",
  legaltech: "LegalTech",
  insurtech: "InsurTech",
  "developer tools": "Developer Tools",
  devtools: "Developer Tools",
  analytics: "Analytics",
  cybersecurity: "Cybersecurity",
  ecommerce: "Ecommerce",
  "e commerce": "Ecommerce",
  gaming: "Gaming",
  "consumer technology": "Consumer Technology",
  "social media": "Social Media",
  "travel technology": "Travel Technology",
  "supply chain": "Supply Chain",
  manufacturing: "Manufacturing",
  retail: "Retail",
  "media and publishing": "Media & Publishing",
  media: "Media & Publishing",
  publishing: "Media & Publishing",
  telecommunications: "Telecommunications",
  telecom: "Telecommunications",
  "construction technology": "Construction Technology",
  energy: "Energy",
  nonprofit: "Nonprofit",
  biotech: "Biotech",
  "climate technology": "Climate Technology",
  cleantech: "Climate Technology",
  web3: "Web3",
  crypto: "Web3",
  blockchain: "Web3",
  civictech: "CivicTech",
  "civic tech": "CivicTech",
  "voting and civic engagement": "CivicTech",
  cpg: "CPG",
  "consumer packaged goods": "CPG",
  "beverage industry technology": "Beverage Technology",
  entertainment: "Entertainment",
  "political technology": "Political Technology",
  "real estate": "Real Estate",
  "hoa technology": "HOA Technology",
  "business intelligence": "Business Intelligence",
  bi: "Business Intelligence",
  "retail analytics": "Retail Analytics",
  "marketing analytics": "Marketing Analytics",
  "digital advertising": "AdTech",
  "mobile gaming": "Gaming",
  "media technology": "Media & Publishing",
  "reporting and insights platforms": "Analytics",
};

const CANONICAL_BY_TOKEN = new Map<string, CanonicalTechIndustry>(
  CANONICAL_TECH_INDUSTRIES.map((label) => [normalizeIndustryToken(label), label]),
);

for (const [alias, label] of Object.entries(INDUSTRY_ALIASES)) {
  CANONICAL_BY_TOKEN.set(alias, label);
}

export const CANONICAL_INDUSTRY_CLUSTERS: string[][] = [
  ["adtech", "martech", "marketing analytics"],
  ["saas", "enterprise software"],
  ["fintech", "insurtech"],
  ["healthtech", "biotech"],
  ["ecommerce", "retail", "retail analytics", "cpg"],
  ["proptech", "construction technology", "real estate", "hoa technology"],
  ["gaming", "consumer technology", "social media", "entertainment"],
  ["supply chain", "manufacturing"],
  ["analytics", "data analytics", "developer tools", "business intelligence"],
  ["climate technology", "energy"],
  ["legaltech", "govtech", "civictech", "political technology"],
  ["beverage technology", "cpg"],
];

export const CANONICAL_RELATED_INDUSTRY_PAIRS: [string, string][] = [
  ["saas", "analytics"],
  ["saas", "developer tools"],
  ["adtech", "media and publishing"],
  ["fintech", "saas"],
  ["healthtech", "saas"],
  ["ai", "saas"],
  ["cybersecurity", "enterprise software"],
  ["martech", "retail analytics"],
  ["civictech", "govtech"],
  ["proptech", "real estate"],
];

export function isBlockedNonIndustryPhrase(token: string): boolean {
  const n = normalizeIndustryToken(token);
  if (!n) return true;
  if (NOT_INDUSTRY_PHRASES.has(n)) return true;
  for (const blocked of NOT_INDUSTRY_PHRASES) {
    if (n.includes(blocked) || blocked.includes(n)) return true;
  }
  return false;
}

export function resolveCanonicalIndustry(raw: string): CanonicalTechIndustry | null {
  const trimmed = raw.trim();
  if (!trimmed || isBlockedNonIndustryPhrase(trimmed)) return null;

  const n = normalizeIndustryToken(trimmed);
  const direct = CANONICAL_BY_TOKEN.get(n);
  if (direct) return direct;

  for (const [token, label] of CANONICAL_BY_TOKEN) {
    if (n.includes(token) || token.includes(n)) return label;
  }

  return null;
}

export function normalizeIndustryList(
  industries: string[] | undefined | null,
): { industries: CanonicalTechIndustry[]; rehomedAsSkills: string[] } {
  const rehomedAsSkills: string[] = [];
  const seen = new Set<string>();
  const out: CanonicalTechIndustry[] = [];

  for (const raw of industries ?? []) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    const canonical = resolveCanonicalIndustry(trimmed);
    if (canonical) {
      if (!seen.has(canonical)) {
        seen.add(canonical);
        out.push(canonical);
      }
      continue;
    }

    if (!isBlockedNonIndustryPhrase(trimmed)) {
      rehomedAsSkills.push(trimmed);
    }
  }

  return { industries: out, rehomedAsSkills };
}

/** Scan free text (e.g. work history) for canonical industry labels. */
export function extractIndustriesFromText(text: string): CanonicalTechIndustry[] {
  const lower = text.toLowerCase();
  const seen = new Set<CanonicalTechIndustry>();
  const found: CanonicalTechIndustry[] = [];

  const tryAdd = (label: CanonicalTechIndustry) => {
    if (seen.has(label)) return;
    seen.add(label);
    found.push(label);
  };

  for (const label of CANONICAL_TECH_INDUSTRIES) {
    const token = normalizeIndustryToken(label);
    if (token.length >= 3 && lower.includes(token)) tryAdd(label);
  }

  for (const [alias, label] of Object.entries(INDUSTRY_ALIASES)) {
    if (alias.length >= 4 && lower.includes(alias)) tryAdd(label);
  }

  return found;
}

export function industrySimilarity(a: string, b: string): number {
  const resolvedA = resolveCanonicalIndustry(a) ?? a;
  const resolvedB = resolveCanonicalIndustry(b) ?? b;
  const na = normalizeIndustryToken(resolvedA);
  const nb = normalizeIndustryToken(resolvedB);
  if (!na || !nb) return 0;
  if (na === nb) return 100;

  for (const cluster of CANONICAL_INDUSTRY_CLUSTERS) {
    if (cluster.includes(na) && cluster.includes(nb)) return 85;
  }

  for (const [x, y] of CANONICAL_RELATED_INDUSTRY_PAIRS) {
    const hitA = na === x || na === y;
    const hitB = nb === x || nb === y;
    if (hitA && hitB) return 60;
  }

  return 25;
}
