import { normalizeCountry } from "@/lib/country-match";
import { REGION_OPTIONS } from "@/lib/onboarding-options";

export type ClientLocationRegionMatchTier = "exact" | "partial" | "none";

export interface ClientLocationRegionMatchDetail {
  compareToProfile: boolean;
  tier: ClientLocationRegionMatchTier;
  matched: boolean;
  points: number | null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const EUROPE_MARKERS = [
  "europe",
  "eu",
  "emea",
  "uk",
  "united kingdom",
  "france",
  "french",
  "germany",
  "german",
  "spain",
  "italy",
  "netherlands",
  "belgium",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "poland",
  "portugal",
  "ireland",
  "switzerland",
  "austria",
  "greece",
  "czech",
  "romania",
  "hungary",
  "martinique",
  "guadeloupe",
  "reunion",
];

function inferRegionsFromLocationText(text: string): Set<string> {
  const lower = normalizeText(text);
  const regions = new Set<string>();
  if (!lower) return regions;

  if (/\bunited states\b|\busa\b|\bu s a\b|\bu s\b/.test(lower)) {
    regions.add("United States");
  }
  if (/\bcanada\b|\bcanadian\b/.test(lower)) regions.add("Canada");
  if (/\baustralia\b|\baustralian\b/.test(lower)) regions.add("Australia");
  if (/\bworldwide\b|\bglobal remote\b|\banywhere\b/.test(lower)) {
    regions.add("Worldwide");
  }
  if (/\beurope\b|\beu\b|\bemea\b/.test(lower)) regions.add("Europe");
  for (const marker of EUROPE_MARKERS) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\b`).test(lower)) {
      regions.add("Europe");
    }
  }

  return regions;
}

function isExactChipMatch(
  pref: string,
  locationDisplay: string,
  clientOrigin: string | null,
): boolean {
  const prefNorm = normalizeText(pref);
  if (normalizeText(locationDisplay) === prefNorm) return true;
  if (clientOrigin && normalizeText(clientOrigin) === prefNorm) return true;

  switch (pref) {
    case "United States": {
      const origin = clientOrigin?.trim() ?? "";
      if (origin && normalizeCountry(origin) === "us") return true;
      return /\bunited states\b/i.test(locationDisplay);
    }
    case "Canada":
      return /\bcanada\b/i.test(`${locationDisplay} ${clientOrigin ?? ""}`);
    case "Australia":
      return /\baustralia\b/i.test(`${locationDisplay} ${clientOrigin ?? ""}`);
    case "Europe":
      return normalizeText(locationDisplay) === "europe";
    case "Worldwide":
      return normalizeText(locationDisplay) === "worldwide";
    default:
      return false;
  }
}

export function buildClientLocationRegionMatchDetail({
  locationDisplay,
  clientOrigin,
  clientCity,
  profilePreferredRegions,
}: {
  locationDisplay?: string | null;
  clientOrigin?: string | null;
  clientCity?: string | null;
  profilePreferredRegions?: string[] | null;
}): ClientLocationRegionMatchDetail {
  const display = locationDisplay?.trim() ?? "";
  if (!display) {
    return {
      compareToProfile: false,
      tier: "none",
      matched: false,
      points: null,
    };
  }

  const prefs = (profilePreferredRegions ?? []).filter((region) =>
    (REGION_OPTIONS as readonly string[]).includes(region),
  );
  if (prefs.length === 0) {
    return {
      compareToProfile: false,
      tier: "none",
      matched: false,
      points: null,
    };
  }

  const blob = [display, clientCity, clientOrigin].filter(Boolean).join(" ");
  const inferred = inferRegionsFromLocationText(blob);
  const prefSet = new Set(prefs);

  for (const pref of prefs) {
    if (isExactChipMatch(pref, display, clientOrigin?.trim() ?? null)) {
      return {
        compareToProfile: true,
        tier: "exact",
        matched: true,
        points: 100,
      };
    }
  }

  if (prefSet.has("Worldwide")) {
    return {
      compareToProfile: true,
      tier: "partial",
      matched: true,
      points: 70,
    };
  }

  for (const region of inferred) {
    if (prefSet.has(region)) {
      return {
        compareToProfile: true,
        tier: "partial",
        matched: true,
        points: 70,
      };
    }
  }

  return {
    compareToProfile: true,
    tier: "none",
    matched: false,
    points: 0,
  };
}
