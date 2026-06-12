import { normalizeCountry } from "@/lib/country-match";
import { isNotSpecifiedDisplay } from "@/lib/not-specified";
import type { SectionFieldScore } from "@/lib/section-field-scoring";

const CLOCK_EMOJI = "🕒";
const ROBOT_EMOJI = "🤖";

const COUNTRY_ISO: Record<string, string> = {
  us: "US",
  uk: "GB",
  gb: "GB",
  ca: "CA",
  au: "AU",
  de: "DE",
  fr: "FR",
  in: "IN",
  nl: "NL",
  es: "ES",
  it: "IT",
  br: "BR",
  mx: "MX",
  jp: "JP",
  sg: "SG",
  ie: "IE",
  nz: "NZ",
  ph: "PH",
  pl: "PL",
  ua: "UA",
  se: "SE",
  no: "NO",
  dk: "DK",
  fi: "FI",
  ch: "CH",
  at: "AT",
  be: "BE",
  pt: "PT",
  il: "IL",
  za: "ZA",
};

function isoToFlagEmoji(iso: string): string {
  const code = iso.toUpperCase();
  if (code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.split("").map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function countryPreferenceFlagEmoji(countryLabel: string): string {
  const norm = normalizeCountry(countryLabel);
  const iso = COUNTRY_ISO[norm];
  if (iso) return isoToFlagEmoji(iso);

  if (norm.includes("united kingdom") || norm.includes("great britain")) {
    return isoToFlagEmoji("GB");
  }
  if (norm.includes("canada")) return isoToFlagEmoji("CA");
  if (norm.includes("australia")) return isoToFlagEmoji("AU");
  if (norm.includes("germany")) return isoToFlagEmoji("DE");
  if (norm.includes("france")) return isoToFlagEmoji("FR");
  if (norm.includes("india")) return isoToFlagEmoji("IN");

  return "";
}

export function formatTimezonePreferenceLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/\btime\s*zone\b/i.test(trimmed)) return trimmed;
  return `${trimmed} Timezone`;
}

function isPreferenceMatched(field: SectionFieldScore): boolean {
  return field.state === "match" || field.state === "same_country";
}

function formatLocationMatch(field: SectionFieldScore): string | null {
  if (!field.identified || !isPreferenceMatched(field)) return null;
  if (isNotSpecifiedDisplay(field.badgeLabel)) return null;

  const label = field.badgeLabel.trim();
  const flag = countryPreferenceFlagEmoji(label);
  return flag ? `${flag} ${label}` : label;
}

function formatTimezoneMatch(field: SectionFieldScore): string | null {
  if (!field.identified || !isPreferenceMatched(field)) return null;
  if (isNotSpecifiedDisplay(field.badgeLabel)) return null;

  const label = formatTimezonePreferenceLabel(field.badgeLabel);
  return label ? `${CLOCK_EMOJI} ${label}` : null;
}

function formatAiMatch(field: SectionFieldScore): string | null {
  if (!field.identified || !isPreferenceMatched(field)) return null;
  return `${ROBOT_EMOJI} AI Emphasis`;
}

/**
 * Matched client preferences only — location, timezone, AI.
 * Returns null when nothing matches (hide the subsection).
 */
export function formatPreferenceMatchSentence(
  fields: SectionFieldScore[],
): string | null {
  const parts: string[] = [];

  const location = fields.find((f) => f.key === "locationPreferred");
  const locationPart = location ? formatLocationMatch(location) : null;
  if (locationPart) parts.push(locationPart);

  const timezone = fields.find((f) => f.key === "timezonePreferred");
  const timezonePart = timezone ? formatTimezoneMatch(timezone) : null;
  if (timezonePart) parts.push(timezonePart);

  const ai = fields.find((f) => f.key === "aiEmphasis");
  const aiPart = ai ? formatAiMatch(ai) : null;
  if (aiPart) parts.push(aiPart);

  if (parts.length === 0) return null;

  return `${parts.join(", ")}.`;
}

/** @deprecated Use formatPreferenceMatchSentence */
export const formatClientPreferencesSentence = formatPreferenceMatchSentence;
