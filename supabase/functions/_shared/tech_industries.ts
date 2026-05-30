// Canonical tech industry taxonomy — used for parsing, normalization, and scoring.

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

/** Craft / discipline phrases that must never be treated as industries. */
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
    "machine learning engineering",
    "project management",
    "program management",
    "content design",
    "copywriting",
    "brand design",
    "marketing design",
    "campaign design",
    "video production",
    "motion design",
    "animation",
    "illustration",
    "devops",
    "cloud engineering",
    "quality assurance",
    "customer success",
    "sales",
    "business development",
  ].map(normalizeIndustryToken),
);

/** Normalized alias → canonical display label. */
const INDUSTRY_ALIASES: Record<string, CanonicalTechIndustry> = {
  saas: "SaaS",
  "b2b saas": "SaaS",
  "b2b software": "SaaS",
  "software as a service": "SaaS",
  "enterprise software": "Enterprise Software",
  enterprise: "Enterprise Software",
  "enterprise saas": "Enterprise Software",
  b2b: "Enterprise Software",
  ai: "AI",
  "artificial intelligence": "AI",
  "ai native": "AI",
  "ai products": "AI",
  adtech: "AdTech",
  "ad tech": "AdTech",
  "advertising technology": "AdTech",
  advertising: "AdTech",
  martech: "MarTech",
  "mar tech": "MarTech",
  "marketing technology": "MarTech",
  fintech: "FinTech",
  "fin tech": "FinTech",
  "financial technology": "FinTech",
  "financial services": "FinTech",
  banking: "FinTech",
  payments: "FinTech",
  healthtech: "HealthTech",
  "health tech": "HealthTech",
  healthcare: "HealthTech",
  "health care": "HealthTech",
  medtech: "HealthTech",
  proptech: "PropTech",
  "prop tech": "PropTech",
  "real estate tech": "PropTech",
  "real estate technology": "PropTech",
  edtech: "EdTech",
  "ed tech": "EdTech",
  education: "EdTech",
  "education technology": "EdTech",
  hrtech: "HRTech",
  "hr tech": "HRTech",
  "human resources technology": "HRTech",
  govtech: "GovTech",
  "gov tech": "GovTech",
  government: "GovTech",
  "public sector": "GovTech",
  legaltech: "LegalTech",
  "legal tech": "LegalTech",
  insurtech: "InsurTech",
  "insur tech": "InsurTech",
  insurance: "InsurTech",
  "developer tools": "Developer Tools",
  devtools: "Developer Tools",
  "dev tools": "Developer Tools",
  analytics: "Analytics",
  "data analytics": "Analytics",
  cybersecurity: "Cybersecurity",
  "cyber security": "Cybersecurity",
  "information security": "Cybersecurity",
  security: "Cybersecurity",
  ecommerce: "Ecommerce",
  "e commerce": "Ecommerce",
  "e-commerce": "Ecommerce",
  dtc: "Ecommerce",
  marketplace: "Ecommerce",
  gaming: "Gaming",
  games: "Gaming",
  "consumer technology": "Consumer Technology",
  "consumer tech": "Consumer Technology",
  "social media": "Social Media",
  "social networking": "Social Media",
  "travel technology": "Travel Technology",
  "travel tech": "Travel Technology",
  travel: "Travel Technology",
  hospitality: "Travel Technology",
  "supply chain": "Supply Chain",
  logistics: "Supply Chain",
  fulfillment: "Supply Chain",
  manufacturing: "Manufacturing",
  retail: "Retail",
  "media and publishing": "Media & Publishing",
  "media publishing": "Media & Publishing",
  media: "Media & Publishing",
  publishing: "Media & Publishing",
  telecommunications: "Telecommunications",
  telecom: "Telecommunications",
  "construction technology": "Construction Technology",
  "construction tech": "Construction Technology",
  energy: "Energy",
  utilities: "Energy",
  nonprofit: "Nonprofit",
  "non profit": "Nonprofit",
  ngo: "Nonprofit",
  biotech: "Biotech",
  biotechnology: "Biotech",
  "life sciences": "Biotech",
  "climate technology": "Climate Technology",
  "climate tech": "Climate Technology",
  cleantech: "Climate Technology",
  "clean tech": "Climate Technology",
  sustainability: "Climate Technology",
  web3: "Web3",
  crypto: "Web3",
  blockchain: "Web3",
  defi: "Web3",
  civictech: "CivicTech",
  "civic tech": "CivicTech",
  "civic technology": "CivicTech",
  "voting civic engagement": "CivicTech",
  "voting and civic engagement": "CivicTech",
  cpg: "CPG",
  "consumer packaged goods": "CPG",
  "beverage industry technology": "Beverage Technology",
  "beverage tech": "Beverage Technology",
  entertainment: "Entertainment",
  "political technology": "Political Technology",
  "political tech": "Political Technology",
  "real estate": "Real Estate",
  "hoa technology": "HOA Technology",
  "hoa tech": "HOA Technology",
  "business intelligence": "Business Intelligence",
  bi: "Business Intelligence",
  "retail analytics": "Retail Analytics",
  "marketing analytics": "Marketing Analytics",
  "digital advertising": "AdTech",
  "mobile gaming": "Gaming",
  "media technology": "Media & Publishing",
  "reporting insights": "Analytics",
  "reporting and insights": "Analytics",
  "reporting and insights platforms": "Analytics",
  "insights platforms": "Analytics",
};

const CANONICAL_BY_TOKEN = new Map<string, CanonicalTechIndustry>(
  CANONICAL_TECH_INDUSTRIES.map((label) => [normalizeIndustryToken(label), label]),
);

for (const [alias, label] of Object.entries(INDUSTRY_ALIASES)) {
  CANONICAL_BY_TOKEN.set(alias, label);
}

/** Clusters use normalized canonical tokens for adjacency scoring. */
export const CANONICAL_INDUSTRY_CLUSTERS: string[][] = [
  ["adtech", "martech", "marketing analytics"],
  ["saas", "enterprise software"],
  ["fintech", "insurtech"],
  ["healthtech", "biotech"],
  ["ecommerce", "retail", "retail analytics", "cpg"],
  ["proptech", "construction technology", "real estate", "hoa technology"],
  ["gaming", "consumer technology", "social media", "mobile gaming", "entertainment"],
  ["supply chain", "manufacturing"],
  ["analytics", "data analytics", "developer tools", "business intelligence"],
  ["climate technology", "energy"],
  ["legaltech", "govtech", "civictech", "political technology"],
  ["beverage technology", "cpg"],
];

export const CANONICAL_RELATED_INDUSTRY_PAIRS: [string, string][] = [
  ["saas", "analytics"],
  ["saas", "developer tools"],
  ["martech", "ecommerce"],
  ["adtech", "ecommerce"],
  ["adtech", "media and publishing"],
  ["fintech", "saas"],
  ["healthtech", "saas"],
  ["ai", "saas"],
  ["ai", "enterprise software"],
  ["cybersecurity", "enterprise software"],
  ["travel technology", "ecommerce"],
  ["web3", "fintech"],
  ["martech", "retail analytics"],
  ["adtech", "media and publishing"],
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
      // Unknown label — treat as misclassified craft/skill, not an industry row.
      rehomedAsSkills.push(trimmed);
    }
  }

  return { industries: out, rehomedAsSkills };
}

/** Scan posting/resume text for canonical industry mentions. */
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
    const inA = cluster.includes(na);
    const inB = cluster.includes(nb);
    if (inA && inB) return 85;
  }

  for (const [x, y] of CANONICAL_RELATED_INDUSTRY_PAIRS) {
    const hitA = na === x || na === y;
    const hitB = nb === x || nb === y;
    if (hitA && hitB) return 60;
  }

  return 25;
}

export const CANONICAL_INDUSTRY_LIST_PROMPT = CANONICAL_TECH_INDUSTRIES.join(", ");
