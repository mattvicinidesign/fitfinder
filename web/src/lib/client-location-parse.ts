/**
 * Upwork "About the client" city line (e.g. "Corona Del Mar1:16 PM").
 * Keep extraction in sync with supabase/functions/_shared/client_location_parse.ts
 */

const COUNTRY_LINES =
  /^(United States|USA|U\.S\.A\.|Canada|United Kingdom|UK|Germany|France|India|Australia|Netherlands|Spain|Italy|Brazil|Mexico)$/i;

const LOCAL_TIME_SUFFIX = /(\d{1,2}:\d{2}\s*(?:AM|PM))$/i;

const SKIP_CLIENT_LINE =
  /payment method|verified|rating|reviews?|jobs?\s+posted|hire\s+rate|open\s+job|total\s+spent|hires|active|member\s+since|\$|avg\.?\s+hourly|hours$/i;

/** US cities → canonical IANA (Pacific-first for SoCal listings). */
const US_CITY_TO_CANONICAL: Record<string, string> = {
  "corona del mar": "America/Los_Angeles",
  "newport beach": "America/Los_Angeles",
  "laguna beach": "America/Los_Angeles",
  "huntington beach": "America/Los_Angeles",
  "irvine": "America/Los_Angeles",
  "anaheim": "America/Los_Angeles",
  "santa ana": "America/Los_Angeles",
  "costa mesa": "America/Los_Angeles",
  "los angeles": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  "san diego": "America/Los_Angeles",
  "oakland": "America/Los_Angeles",
  "san jose": "America/Los_Angeles",
  "sacramento": "America/Los_Angeles",
  "seattle": "America/Los_Angeles",
  "portland": "America/Los_Angeles",
  "las vegas": "America/Los_Angeles",
  "phoenix": "America/Phoenix",
  "scottsdale": "America/Phoenix",
  "denver": "America/Denver",
  "salt lake city": "America/Denver",
  "chicago": "America/Chicago",
  "houston": "America/Chicago",
  "dallas": "America/Chicago",
  "austin": "America/Chicago",
  "minneapolis": "America/Chicago",
  "nashville": "America/Chicago",
  "new orleans": "America/Chicago",
  "new york": "America/New_York",
  "new york city": "America/New_York",
  brooklyn: "America/New_York",
  manhattan: "America/New_York",
  boston: "America/New_York",
  philadelphia: "America/New_York",
  miami: "America/New_York",
  atlanta: "America/New_York",
  washington: "America/New_York",
  "washington dc": "America/New_York",
  baltimore: "America/New_York",
  detroit: "America/Detroit",
  anchorage: "America/Anchorage",
  honolulu: "Pacific/Honolulu",
};

const WORLD_CITY_TO_CANONICAL: Record<string, string> = {
  london: "Europe/London",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  montreal: "America/Toronto",
  berlin: "Europe/Berlin",
  paris: "Europe/Paris",
  amsterdam: "Europe/Amsterdam",
  madrid: "Europe/Madrid",
  rome: "Europe/Rome",
  mumbai: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  "sao paulo": "America/Sao_Paulo",
  "mexico city": "America/Mexico_City",
};

function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Parse "Corona Del Mar1:16 PM" → "Corona Del Mar". */
export function parseUpworkClientCityLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return null;
  if (COUNTRY_LINES.test(trimmed) || SKIP_CLIENT_LINE.test(trimmed)) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return null;

  const withoutTime = trimmed.replace(LOCAL_TIME_SUFFIX, "").trim();
  if (withoutTime.length < 2 || withoutTime.length > 60) return null;
  if (!/^[A-Za-z][A-Za-z .'-]+$/.test(withoutTime)) return null;

  return withoutTime;
}

export function extractClientCityFromAboutClient(
  jobText: string,
): string | null {
  const m = jobText.match(/\babout the client\b([\s\S]{0,2000})/i);
  if (!m) return null;

  const lines = linesOf(m[1]);
  for (let i = 0; i < lines.length; i++) {
    if (COUNTRY_LINES.test(lines[i])) {
      const next = parseUpworkClientCityLine(lines[i + 1] ?? "");
      if (next) return next;
    }
  }

  for (const line of lines) {
    const city = parseUpworkClientCityLine(line);
    if (city) return city;
  }

  return null;
}

export function canonicalTimezoneForCity(city: string): string | null {
  const key = normalizeCityKey(city);
  return (
    US_CITY_TO_CANONICAL[key] ??
    WORLD_CITY_TO_CANONICAL[key] ??
    null
  );
}

export function resolveCanonicalTimezoneFromClientCity(
  city: string | null | undefined,
): string | null {
  if (!city?.trim()) return null;
  return canonicalTimezoneForCity(city);
}
