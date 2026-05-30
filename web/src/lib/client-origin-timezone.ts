/**
 * Summary timezone pill: canonical client-origin IANA zone vs your timezone.
 */

import {
  canonicalTimezoneForCity,
  extractClientCityFromAboutClient,
  resolveCanonicalTimezoneFromClientCity,
} from "@/lib/client-location-parse";
import { normalizeCountry } from "@/lib/country-match";
import { timezoneOverlap } from "@/lib/timezone-match";

export type ClientOriginTimezoneTone = "match" | "same_country" | "neutral";

export interface ClientOriginTimezoneSummary {
  /** Canonical IANA timezone (e.g. America/New_York) for display */
  label: string;
  tone: ClientOriginTimezoneTone;
}

const IANA_TZ =
  /\b(America\/[A-Za-z_]+|US\/[A-Za-z_]+|Pacific\/[A-Za-z_]+|Europe\/[A-Za-z_]+|Asia\/[A-Za-z_]+|Australia\/[A-Za-z_]+|Africa\/[A-Za-z_]+)\b/;

const TZ_ABBREV =
  /\b(EST|EDT|CST|CDT|MST|MDT|PST|PDT|AKST|AKDT|HST|HDT)\b/i;

const ABBREV_TO_CANONICAL: Record<string, string> = {
  est: "America/New_York",
  edt: "America/New_York",
  cst: "America/Chicago",
  cdt: "America/Chicago",
  mst: "America/Denver",
  mdt: "America/Denver",
  pst: "America/Los_Angeles",
  pdt: "America/Los_Angeles",
  akst: "America/Anchorage",
  akdt: "America/Anchorage",
  hst: "Pacific/Honolulu",
  hdt: "Pacific/Honolulu",
};

const REGION_TO_CANONICAL: Record<string, string> = {
  eastern: "America/New_York",
  central: "America/Chicago",
  mountain: "America/Denver",
  pacific: "America/Los_Angeles",
  atlantic: "America/New_York",
  alaska: "America/Anchorage",
  hawaii: "Pacific/Honolulu",
  arizona: "America/Phoenix",
};

/** Default IANA zone when only a non-US country is known (no city line). */
const COUNTRY_TO_CANONICAL: Record<string, string> = {
  uk: "Europe/London",
  canada: "America/Toronto",
  germany: "Europe/Berlin",
  france: "Europe/Paris",
  india: "Asia/Kolkata",
  australia: "Australia/Sydney",
  netherlands: "Europe/Amsterdam",
  spain: "Europe/Madrid",
  italy: "Europe/Rome",
  brazil: "America/Sao_Paulo",
  mexico: "America/Mexico_City",
};

const US_STATE_TO_CANONICAL: Record<string, string> = {
  california: "America/Los_Angeles",
  washington: "America/Los_Angeles",
  oregon: "America/Los_Angeles",
  nevada: "America/Los_Angeles",
  arizona: "America/Phoenix",
  colorado: "America/Denver",
  texas: "America/Chicago",
  illinois: "America/Chicago",
  "new york": "America/New_York",
  florida: "America/New_York",
  georgia: "America/New_York",
  massachusetts: "America/New_York",
  pennsylvania: "America/New_York",
  virginia: "America/New_York",
  "north carolina": "America/New_York",
  ohio: "America/New_York",
  michigan: "America/Detroit",
  minnesota: "America/Chicago",
  missouri: "America/Chicago",
  tennessee: "America/Chicago",
  alaska: "America/Anchorage",
  hawaii: "Pacific/Honolulu",
};

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIana(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(IANA_TZ);
  if (!match) return trimmed;
  const [region, city] = match[0].split("/");
  const cityPart = city
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("_");
  return `${region}/${cityPart}`;
}

/** Map profile/resume timezone tokens to canonical IANA when possible. */
export function resolveCanonicalTimezone(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();

  const iana = raw.match(IANA_TZ);
  if (iana) return normalizeIana(iana[0]);

  const abbrev = raw.match(TZ_ABBREV);
  if (abbrev) {
    const key = abbrev[0].toLowerCase();
    if (ABBREV_TO_CANONICAL[key]) return ABBREV_TO_CANONICAL[key];
  }

  const n = normalizeToken(raw);
  for (const [region, ianaId] of Object.entries(REGION_TO_CANONICAL)) {
    if (n.includes(region)) return ianaId;
  }

  const countryKey = normalizeCountry(raw);
  if (countryKey === "us") return null;

  if (COUNTRY_TO_CANONICAL[countryKey]) {
    return COUNTRY_TO_CANONICAL[countryKey];
  }

  return null;
}

/** True when a timezone string looks US-based (IANA, abbrev, or region name). */
export function isUnitedStatesTimezone(value: string): boolean {
  const canonical = resolveCanonicalTimezone(value);
  if (canonical?.startsWith("America/") || canonical?.startsWith("US/")) {
    return true;
  }
  if (canonical === "Pacific/Honolulu") return true;

  const n = normalizeToken(value);
  if (!n) return false;
  if (normalizeCountry(value) === "us") return true;
  if (n.includes("united states")) return true;
  if (n.startsWith("america/") || n.startsWith("us/")) return true;
  if (
    /\b(eastern|central|mountain|pacific|atlantic|alaska|hawaii|arizona)\b/.test(
      n,
    )
  ) {
    return true;
  }
  if (/\b(est|edt|cst|cdt|mst|mdt|pst|pdt|akst|akdt|hst|hdt)\b/.test(n)) {
    return true;
  }
  return false;
}

function usStateFromOrigin(raw: string): string | null {
  const beforeCountry = raw.split(",")[0]?.trim().toLowerCase() ?? "";
  if (US_STATE_TO_CANONICAL[beforeCountry]) return beforeCountry;
  for (const state of Object.keys(US_STATE_TO_CANONICAL)) {
    if (raw.toLowerCase().includes(state)) return state;
  }
  return null;
}

/**
 * Canonical IANA timezone for the client's origin (posting / About the client).
 */
function resolveFromAboutClientBlock(jobText: string): string | null {
  const ianaOrAbbrev = extractTimezoneFromAboutClient(jobText);
  if (ianaOrAbbrev) return ianaOrAbbrev;

  const city = extractClientCityFromAboutClient(jobText);
  if (city) {
    const fromCity = canonicalTimezoneForCity(city);
    if (fromCity) return fromCity;
  }

  return null;
}

export function resolveClientOriginCanonicalTimezone(
  clientOrigin: string | null | undefined,
  options?: { jobDescription?: string | null; clientCity?: string | null },
): string | null {
  if (options?.jobDescription) {
    const fromBlock = resolveFromAboutClientBlock(options.jobDescription);
    if (fromBlock) return fromBlock;
  }

  if (options?.clientCity?.trim()) {
    const fromCity = resolveCanonicalTimezoneFromClientCity(options.clientCity);
    if (fromCity) return fromCity;
  }

  if (!clientOrigin?.trim()) return null;
  const raw = clientOrigin.trim();

  const iana = raw.match(IANA_TZ);
  if (iana) return normalizeIana(iana[0]);

  const abbrev = raw.match(TZ_ABBREV);
  if (abbrev) {
    const key = abbrev[0].toLowerCase();
    if (ABBREV_TO_CANONICAL[key]) return ABBREV_TO_CANONICAL[key];
  }

  const region = raw.match(
    /\b(Eastern|Central|Mountain|Pacific|Atlantic|Alaska|Hawaii|Arizona)\b/i,
  );
  if (region) {
    const key = region[0].toLowerCase();
    if (REGION_TO_CANONICAL[key]) return REGION_TO_CANONICAL[key];
  }

  const state = usStateFromOrigin(raw);
  if (state && US_STATE_TO_CANONICAL[state]) {
    return US_STATE_TO_CANONICAL[state];
  }

  const countryKey = normalizeCountry(raw);
  if (countryKey !== "us" && COUNTRY_TO_CANONICAL[countryKey]) {
    return COUNTRY_TO_CANONICAL[countryKey];
  }

  return resolveCanonicalTimezone(raw);
}

/** Scan About the client for an explicit IANA or abbrev timezone. */
export function extractTimezoneFromAboutClient(jobText: string): string | null {
  const m = jobText.match(/\babout the client\b([\s\S]{0,2000})/i);
  const block = m?.[1];
  if (!block) return null;

  const iana = block.match(IANA_TZ);
  if (iana) return normalizeIana(iana[0]);

  const abbrev = block.match(TZ_ABBREV);
  if (abbrev) {
    const key = abbrev[0].toLowerCase();
    if (ABBREV_TO_CANONICAL[key]) return ABBREV_TO_CANONICAL[key];
  }

  return null;
}

function clientOriginIsUnitedStates(clientOrigin: string): boolean {
  return (
    normalizeCountry(clientOrigin) === "us" ||
    isUnitedStatesTimezone(clientOrigin)
  );
}

export function evaluateClientOriginTimezoneTone(
  clientOrigin: string | null | undefined,
  userTimezone: string | null | undefined,
  options?: { jobDescription?: string | null; clientCity?: string | null },
): ClientOriginTimezoneTone {
  const origin = clientOrigin?.trim() ?? "";
  const user = userTimezone?.trim() ?? "";
  const clientCanonical = resolveClientOriginCanonicalTimezone(origin, options);
  if (!clientCanonical && !origin) return "neutral";

  const userCanonical = resolveCanonicalTimezone(user);
  const originUS =
    clientOriginIsUnitedStates(origin) ||
    (clientCanonical != null && isUnitedStatesTimezone(clientCanonical));

  if (userCanonical || user) {
    const userCompare = userCanonical ?? user;
    if (
      clientCanonical &&
      (clientCanonical.toLowerCase() === userCompare.toLowerCase() ||
        timezoneOverlap(clientCanonical, userCompare) ||
        timezoneOverlap(clientCanonical, user))
    ) {
      return "match";
    }
    if (originUS && isUnitedStatesTimezone(userCompare)) {
      return "same_country";
    }
  }

  return "neutral";
}

export function buildClientOriginTimezoneSummary(
  clientOrigin: string | null | undefined,
  userTimezone: string | null | undefined,
  options?: { jobDescription?: string | null; clientCity?: string | null },
): ClientOriginTimezoneSummary {
  const canonical = resolveClientOriginCanonicalTimezone(clientOrigin, options);
  const label = canonical ?? "—";
  const tone = evaluateClientOriginTimezoneTone(
    clientOrigin,
    userTimezone,
    options,
  );
  return { label, tone };
}

export function clientOriginTimezoneToneToSummaryState(
  tone: ClientOriginTimezoneTone,
): "match" | "same_country" | "unknown" {
  switch (tone) {
    case "match":
      return "match";
    case "same_country":
      return "same_country";
    default:
      return "unknown";
  }
}
