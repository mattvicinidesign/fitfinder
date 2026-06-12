/**
 * Job board platform detection — keep in sync with web/src/lib/job-platform.ts
 */

export type JobPlatform = "Upwork" | "Indeed" | "LinkedIn";

function platformFromUrl(url: string): JobPlatform | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("upwork.com")) return "Upwork";
    if (host.includes("indeed.com")) return "Indeed";
    if (host.includes("linkedin.com")) return "LinkedIn";
  } catch {
    /* invalid URL */
  }
  return null;
}

export function detectJobPlatform(jobText?: string | null): JobPlatform | null {
  const text = jobText?.trim() ?? "";
  if (!text) return null;

  const linkLine = text.match(/job posting link:\s*(https?:\/\/[^\s]+)/i)?.[1];
  if (linkLine) {
    const fromLink = platformFromUrl(linkLine);
    if (fromLink) return fromLink;
  }

  for (const url of text.match(/https?:\/\/[^\s]+/gi) ?? []) {
    const platform = platformFromUrl(url);
    if (platform) return platform;
  }

  if (
    /\babout the client\b/i.test(text) ||
    /\$[\d,.]+\s*\/\s*hr\s+avg\.?\s+hourly\s+rate\s+paid/i.test(text) ||
    /\bconnects?\s+required\b/i.test(text)
  ) {
    return "Upwork";
  }

  if (/\bindeed\.com\b/i.test(text) || /\bapply on indeed\b/i.test(text)) {
    return "Indeed";
  }

  if (/\blinkedin\.com\b/i.test(text) || /\bapply on linkedin\b/i.test(text)) {
    return "LinkedIn";
  }

  return null;
}
