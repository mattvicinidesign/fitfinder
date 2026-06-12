import type { Compensation, ParsedJob } from "@/lib/types";

export type CompensationAlignment =
  | "unknown"
  | "within_range"
  | "above_offer"
  | "below_offer";

export interface CompensationDetail {
  jobOffer: Compensation | null;
  resumeAsk: Compensation | null;
  jobOfferLabel: string | null;
  resumeAskLabel: string | null;
  annualOfferMin: number | null;
  annualOfferMax: number | null;
  annualAsk: number | null;
  alignment: CompensationAlignment;
  /** Mirrors scoring when both sides are known. */
  score: number | null;
  summary: string;
}

function annualize(comp: Compensation): number | null {
  const base = comp.max ?? comp.min;
  if (base == null) return null;
  if (comp.period === "month") return base * 12;
  if (comp.period === "hour") return base * 2080;
  return base;
}

function annualizeDesired(comp: Compensation): number | null {
  let base: number | null = null;
  if (comp.min != null && comp.max != null) {
    base = (comp.min + comp.max) / 2;
  } else {
    base = comp.max ?? comp.min ?? null;
  }
  if (base == null) return null;
  if (comp.period === "month") return base * 12;
  if (comp.period === "hour") return base * 2080;
  return base;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatMoney(
  amount: number,
  currency: string | null,
  period: Compensation["period"],
): string {
  const c = currency ?? "USD";
  const decimals = period === "hour" ? 2 : 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(decimals)}`;
  }
}

function periodDisplayLabel(period: Compensation["period"]): string {
  if (period === "hour") return "Hourly";
  if (period === "month") return "Monthly";
  if (period === "year") return "Annual";
  return "";
}

function periodLabel(period: Compensation["period"]): string {
  if (period === "hour") return "/hr";
  if (period === "month") return "/mo";
  return "/yr";
}

export interface CompensationDisplay {
  /** e.g. "$65.00 - $75.00" */
  amountLabel: string;
  /** e.g. "Hourly" */
  periodLabel: string;
}

function parseDollarAmount(raw: string): number | null {
  const n = Number.parseFloat(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function isExcludedRateContext(snippet: string): boolean {
  return (
    /avg\.?\s*hourly|avg hourly rate paid|\(job budget\)|bid range/i.test(
      snippet,
    ) ||
    /\|\s*avg\s*\$/i.test(snippet) ||
    /\bhigh\s*\$[\d,.]+.*\|\s*avg/i.test(snippet)
  );
}

/**
 * Upwork client-specified pay lives in the Featured Job header (hrs / duration /
 * expert / $min – $max). Stop before Activity, Preferred qualifications, or About the client.
 */
function upworkClientPaySearchRegion(text: string): string {
  let end = text.length;
  for (const marker of [
    /\bactivity on this job\b/i,
    /\babout the client\b/i,
    /\bpreferred qualifications\b/i,
    /\bskills and expertise\b/i,
    /\bsubmit a proposal\b/i,
    /\bsimilar jobs on upwork\b/i,
  ]) {
    const idx = text.search(marker);
    if (idx > 0) end = Math.min(end, idx);
  }

  const header = text.slice(0, end);

  const featuredIdx = header.search(/\bfeatured job\b/i);
  if (featuredIdx >= 0) {
    return header.slice(featuredIdx);
  }

  const hrsIdx = header.search(
    /\b(?:more|less) than \d+\s+hrs?\s*\/\s*week\b/i,
  );
  if (hrsIdx >= 0) {
    return header.slice(hrsIdx, Math.min(hrsIdx + 900, header.length));
  }

  return header.slice(0, Math.min(1500, header.length));
}

function compensationAmountsAppearInRegion(
  comp: Compensation,
  region: string,
): boolean {
  const amounts = [comp.min, comp.max].filter(
    (n): n is number => n != null && Number.isFinite(n),
  );
  if (amounts.length === 0) return false;

  return amounts.some((amount) => {
    const fixed = amount.toFixed(2);
    const flexible = amount.toString();
    return (
      region.includes(`$${fixed}`) ||
      region.includes(fixed) ||
      region.includes(flexible)
    );
  });
}

function extractCompensationFromRegion(
  search: string,
): Compensation | null {
  if (/bid range/i.test(search)) {
    const beforeBid = search.split(/\bbid range\b/i)[0] ?? search;
    if (beforeBid.trim().length > 0) {
      return extractCompensationFromRegion(beforeBid);
    }
    return null;
  }

  const rangePatterns: RegExp[] = [
    /\$(\d[\d,]*\.\d{2})\s*(?:\r?\n+\s*[-–—]\s*\r?\n+\s*|\s*[-–—]\s+)\$(\d[\d,]*\.\d{2})/,
    /\$(\d[\d,]*\.\d{2})\s*[-–—]\s*\$(\d[\d,]*\.\d{2})/,
  ];

  for (const re of rangePatterns) {
    const match = search.match(re);
    if (!match?.[1] || !match[2]) continue;
    const context = search.slice(
      Math.max(0, (match.index ?? 0) - 40),
      (match.index ?? 0) + match[0].length + 120,
    );
    if (isExcludedRateContext(context)) continue;

    const min = parseDollarAmount(match[1]);
    const max = parseDollarAmount(match[2]);
    if (min == null || max == null) continue;

    return {
      min: Math.min(min, max),
      max: Math.max(min, max),
      currency: "USD",
      period: "hour",
    };
  }

  const hourlySingle = search.match(/\$(\d[\d,]*\.\d{2})\s*\/\s*hr\b/i);
  if (hourlySingle?.[1]) {
    const context = search.slice(
      Math.max(0, (hourlySingle.index ?? 0) - 40),
      (hourlySingle.index ?? 0) + hourlySingle[0].length + 40,
    );
    if (!isExcludedRateContext(context)) {
      const rate = parseDollarAmount(hourlySingle[1]);
      if (rate != null) {
        return { min: rate, max: rate, currency: "USD", period: "hour" };
      }
    }
  }

  return null;
}

/** Pull client pay band from the Upwork Featured Job header when parse omitted it. */
export function extractCompensationFromJobText(
  jobText: string | null | undefined,
): Compensation | null {
  const text = jobText?.trim();
  if (!text) return null;

  const search = upworkClientPaySearchRegion(text);
  return extractCompensationFromRegion(search);
}

export function resolveJobCompensation(
  parsedJob: ParsedJob | null | undefined,
  jobText?: string | null,
): Compensation | null {
  const text = jobText?.trim() ?? "";
  const fromFeaturedHeader = extractCompensationFromJobText(text);
  if (fromFeaturedHeader) return fromFeaturedHeader;

  const fromParse = parsedJob?.compensation ?? null;
  if (!fromParse || !text) return null;

  const region = upworkClientPaySearchRegion(text);
  if (compensationAmountsAppearInRegion(fromParse, region)) {
    return fromParse;
  }

  return null;
}

/** Upwork-style primary amount + period subtext for Role Pay pills. */
export function formatCompensationDisplay(
  comp: Compensation | null | undefined,
): CompensationDisplay | null {
  if (!comp) return null;

  const { min, max, currency, period } = comp;
  let amountLabel: string | null = null;

  if (min != null && max != null && min !== max) {
    amountLabel = `${formatMoney(min, currency, period)} - ${formatMoney(max, currency, period)}`;
  } else {
    const single = max ?? min;
    if (single != null) {
      amountLabel = formatMoney(single, currency, period);
    }
  }

  if (!amountLabel) return null;

  return {
    amountLabel,
    periodLabel: periodDisplayLabel(period),
  };
}

/** Job offer hourly band overlaps profile desired hourly band. */
export function isHourlyCompensationWithinProfileRange(
  jobOffer: Compensation | null | undefined,
  profileAsk: Compensation | null | undefined,
): boolean {
  if (!jobOffer || !profileAsk) return false;
  if (jobOffer.period !== "hour" || profileAsk.period !== "hour") return false;

  const jMin = jobOffer.min ?? jobOffer.max;
  const jMax = jobOffer.max ?? jobOffer.min;
  const pMin = profileAsk.min ?? profileAsk.max;
  const pMax = profileAsk.max ?? profileAsk.min;

  if (
    jMin == null ||
    jMax == null ||
    pMin == null ||
    pMax == null ||
    !Number.isFinite(jMin) ||
    !Number.isFinite(jMax) ||
    !Number.isFinite(pMin) ||
    !Number.isFinite(pMax)
  ) {
    return false;
  }

  return jMax >= pMin && jMin <= pMax;
}

export function formatCompensation(comp: Compensation | null | undefined): string | null {
  if (!comp) return null;
  const { min, max, currency, period } = comp;
  const pl = periodLabel(period);

  if (min != null && max != null && min !== max) {
    return `${formatMoney(min, currency, period)} – ${formatMoney(max, currency, period)}${pl}`;
  }
  const single = max ?? min;
  if (single != null) {
    return `${formatMoney(single, currency, period)}${pl}`;
  }
  return null;
}

function computeScore(
  job: Compensation,
  desired: Compensation,
): { score: number; alignment: CompensationAlignment } {
  const want = annualizeDesired(desired);
  const offerMin = annualize({
    ...job,
    max: job.min,
    min: job.min,
  });
  const offerMax = annualize(job);

  if (want == null || offerMax == null) {
    return { score: 0, alignment: "unknown" };
  }

  const floor = offerMin ?? offerMax * 0.9;
  const ceiling = offerMax;

  let score = 100;
  let alignment: CompensationAlignment = "within_range";

  if (want > ceiling) {
    const over = (want - ceiling) / ceiling;
    score = clamp(100 - over * 80, 20, 100);
    alignment = "above_offer";
  } else if (want < floor * 0.85) {
    const under = (floor - want) / floor;
    score = clamp(100 - under * 60, 15, 100);
    alignment = "below_offer";
  }

  return { score: Math.round(score), alignment };
}

export function buildCompensationDetail(
  jobOffer: Compensation | null | undefined,
  resumeAsk: Compensation | null | undefined,
): CompensationDetail {
  const jobOfferLabel = formatCompensation(jobOffer);
  const resumeAskLabel = formatCompensation(resumeAsk);

  if (!jobOffer && !resumeAsk) {
    return {
      jobOffer: null,
      resumeAsk: null,
      jobOfferLabel: null,
      resumeAskLabel: null,
      annualOfferMin: null,
      annualOfferMax: null,
      annualAsk: null,
      alignment: "unknown",
      score: null,
      summary:
        "No compensation found in the posting parse and no desired compensation on your resume or profile.",
    };
  }

  if (!jobOffer) {
    return {
      jobOffer: null,
      resumeAsk: resumeAsk ?? null,
      jobOfferLabel: null,
      resumeAskLabel,
      annualOfferMin: null,
      annualOfferMax: null,
      annualAsk: resumeAsk ? annualize(resumeAsk) : null,
      alignment: "unknown",
      score: null,
      summary: resumeAskLabel
        ? `You are asking for ${resumeAskLabel} — the posting did not include parseable pay.`
        : "Posting did not include parseable compensation.",
    };
  }

  if (!resumeAsk) {
    const annualOfferMax = annualize(jobOffer);
    const annualOfferMin = jobOffer.min != null ? annualize({
      ...jobOffer,
      max: jobOffer.min,
      min: jobOffer.min,
    }) : null;

    return {
      jobOffer,
      resumeAsk: null,
      jobOfferLabel,
      resumeAskLabel: null,
      annualOfferMin,
      annualOfferMax,
      annualAsk: null,
      alignment: "unknown",
      score: null,
      summary: jobOfferLabel
        ? `Posting offers ${jobOfferLabel} — add desired compensation in Profile or your resume.`
        : "No desired compensation on file.",
    };
  }

  const annualOfferMax = annualize(jobOffer);
  const annualOfferMin =
    jobOffer.min != null
      ? annualize({ ...jobOffer, max: jobOffer.min, min: jobOffer.min })
      : null;
  const annualAsk = annualizeDesired(resumeAsk);
  const { score, alignment } = computeScore(jobOffer, resumeAsk);

  let summary: string;
  if (alignment === "within_range") {
    summary = `Your ask (${resumeAskLabel}) aligns with the posting (${jobOfferLabel}).`;
  } else if (alignment === "above_offer") {
    summary = `You are asking above the posting range — ${resumeAskLabel} vs ${jobOfferLabel}.`;
  } else {
    summary = `You are asking below the posting range — ${resumeAskLabel} vs ${jobOfferLabel}.`;
  }

  return {
    jobOffer,
    resumeAsk,
    jobOfferLabel,
    resumeAskLabel,
    annualOfferMin,
    annualOfferMax,
    annualAsk,
    alignment,
    score,
    summary,
  };
}
