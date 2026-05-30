import type { Compensation } from "@/lib/types";

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

function formatMoney(amount: number, currency: string | null): string {
  const c = currency ?? "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${c}`;
  }
}

function periodLabel(period: Compensation["period"]): string {
  if (period === "hour") return "/hr";
  if (period === "month") return "/mo";
  return "/yr";
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
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}${pl}`;
  }
  const single = max ?? min;
  if (single != null) {
    return `${formatMoney(single, currency)}${pl}`;
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
