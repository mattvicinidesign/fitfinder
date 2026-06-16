import type { ParsedResume } from "@/lib/types";

const URL_PATTERN =
  /(?:https?:\/\/(?:www\.)?[a-z0-9][-a-z0-9._~:/?#[\]@!$&'()*+,;=%]*|www\.[a-z0-9][-a-z0-9._~:/?#[\]@!$&'()*+,;=%]*|\b[a-z0-9][-a-z0-9]*\.(?:com|design|io|me|co|net|org|dev)(?:\/[^\s)\]>"']*)?)/gi;

const NON_PORTFOLIO_HOST =
  /linkedin\.com|github\.com|twitter\.com|x\.com|behance\.net|dribbble\.com|instagram\.com|facebook\.com|medium\.com|notion\.com|notion\.so|google\.com|gmail\.com|upwork\.com|figma\.com|mailto:|\.pdf$/i;

const PORTFOLIO_LABEL =
  /\b(portfolio|personal site|personal website|website|web site|site)\b/i;

export function normalizePortfolioUrl(raw: string): string {
  const trimmed = raw.replace(/[.,;:!?)]+$/, "").trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `http://${trimmed}`;
  if (/^[a-z0-9][-a-z0-9]*\.[a-z]{2,}/i.test(trimmed)) return `http://${trimmed}`;
  return trimmed;
}

/** Display URL without scheme — e.g. www.mattvicinidesign.com */
export function formatPortfolioDisplayUrl(url: string): string {
  return url.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

/** Plain-text portfolio line for proposals: 🔗 Portfolio: www.example.com */
export function formatPortfolioLine(url: string): string {
  return `🔗 Portfolio: ${formatPortfolioDisplayUrl(url)}`;
}

function hostFromUrl(url: string): string {
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    return new URL(withScheme).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0]
      .toLowerCase();
  }
}

function hostKey(host: string): string {
  return host.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function workHistoryHostKeys(resume: ParsedResume): Set<string> {
  const keys = new Set<string>();
  for (const item of resume.workHistory) {
    for (const field of [item.company, item.title, item.summary ?? ""]) {
      if (!field.trim()) continue;
      const urls = field.match(URL_PATTERN) ?? [];
      for (const raw of urls) {
        keys.add(hostKey(hostFromUrl(normalizePortfolioUrl(raw))));
      }
      const bareDomains =
        field.match(/\b[a-z0-9][-a-z0-9]*\.(?:com|org|io|co|net|design|dev)\b/gi) ??
        [];
      for (const raw of bareDomains) {
        keys.add(hostKey(hostFromUrl(normalizePortfolioUrl(raw))));
      }
      keys.add(hostKey(field));
    }
  }
  return keys;
}

function isWorkOrProjectHost(host: string, resume?: ParsedResume | null): boolean {
  const key = hostKey(host);
  if (!key) return true;

  if (resume) {
    for (const workKey of workHistoryHostKeys(resume)) {
      if (!workKey) continue;
      if (key === workKey || key.includes(workKey) || workKey.includes(key)) {
        return true;
      }
    }
  }

  if (host.endsWith(".org") && !/(portfolio|design|personal)/.test(host)) {
    return true;
  }

  return false;
}

function portfolioScore(
  url: string,
  context: { labeled?: boolean; inHeader?: boolean; resume?: ParsedResume | null },
): number {
  const lower = url.toLowerCase();
  const host = hostFromUrl(url);
  let score = 0;

  if (context.labeled) score += 8;
  if (context.inHeader) score += 4;
  if (/portfolio|\.design\b|design\.com|designer|vicini|mattvicini/.test(lower)) {
    score += 5;
  }
  if (/^https?:\/\//i.test(url)) score += 1;
  if (/www\./i.test(url)) score += 1;
  if (NON_PORTFOLIO_HOST.test(lower)) score -= 20;
  if (isWorkOrProjectHost(host, context.resume)) score -= 15;

  return score;
}

function uniqueUrls(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.match(URL_PATTERN) ?? []) {
    const url = normalizePortfolioUrl(raw);
    const key = hostKey(hostFromUrl(url));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

function extractFromLabeledLines(
  text: string,
  resume?: ParsedResume | null,
): string | null {
  for (const line of text.split(/\n/)) {
    if (!PORTFOLIO_LABEL.test(line)) continue;
    for (const url of uniqueUrls(line)) {
      const host = hostFromUrl(url);
      if (NON_PORTFOLIO_HOST.test(url) || isWorkOrProjectHost(host, resume)) {
        continue;
      }
      return url;
    }
  }
  return null;
}

export function extractPortfolioFromText(
  text: string,
  resume?: ParsedResume | null,
): string | null {
  const labeled = extractFromLabeledLines(text, resume);
  if (labeled) return labeled;

  const header = text.slice(0, 1200);
  let best: string | null = null;
  let bestScore = -Infinity;

  const scoreCandidates = (
    urls: string[],
    opts: { labeled?: boolean; inHeader?: boolean },
  ) => {
    for (const url of urls) {
      if (NON_PORTFOLIO_HOST.test(url)) continue;
      const host = hostFromUrl(url);
      if (isWorkOrProjectHost(host, resume)) continue;
      const score = portfolioScore(url, { ...opts, resume });
      if (score > bestScore) {
        bestScore = score;
        best = url;
      }
    }
  };

  scoreCandidates(uniqueUrls(header), { inHeader: true });
  scoreCandidates(uniqueUrls(text), {});

  return best;
}

function resumeBlob(resume: ParsedResume, resumeText?: string | null): string {
  if (resumeText?.trim()) return resumeText;
  return [
    resume.portfolioUrl ?? "",
    ...resume.skills,
    ...resume.tools,
  ].join("\n");
}

function isValidPersonalPortfolio(
  url: string,
  resume?: ParsedResume | null,
): boolean {
  if (NON_PORTFOLIO_HOST.test(url)) return false;
  return !isWorkOrProjectHost(hostFromUrl(url), resume);
}

/** Resolve a portfolio URL from explicit input or resume content. */
export function resolvePortfolioUrl(input: {
  explicit?: string | null;
  parsedResume?: ParsedResume | null;
  resumeText?: string | null;
}): string | null {
  const resume = input.parsedResume ?? null;

  if (input.explicit?.trim()) {
    const url = normalizePortfolioUrl(input.explicit.trim());
    if (isValidPersonalPortfolio(url, resume)) return url;
  }

  if (resume?.portfolioUrl?.trim()) {
    const url = normalizePortfolioUrl(resume.portfolioUrl.trim());
    if (isValidPersonalPortfolio(url, resume)) return url;
  }

  if (input.resumeText?.trim()) {
    const fromText = extractPortfolioFromText(input.resumeText, resume);
    if (fromText) return fromText;
  }

  if (!resume) return null;

  return extractPortfolioFromText(resumeBlob(resume, null), resume);
}

export const MAX_RELEVANT_PROJECTS = 2;
