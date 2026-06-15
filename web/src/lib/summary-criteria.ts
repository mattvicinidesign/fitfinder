import {
  buildAiEmphasisDetail,
  isAiEmphasisPreferenceMatch,
} from "@/lib/ai-emphasis-match";
import {
  buildCompensationDetail,
  formatCompensation,
  isHourlyCompensationWithinProfileRange,
} from "@/lib/compensation-match";
import {
  buildClientOriginTimezoneSummary,
  clientOriginTimezoneToneToSummaryState,
} from "@/lib/client-origin-timezone";
import type {
  CategoryScore,
  Compensation,
  ParsedJob,
  ParsedResume,
} from "@/lib/types";

export type SummaryMatchState =
  | "match"
  | "mismatch"
  | "unknown"
  /** US client origin while your timezone is US-based but not a direct match */
  | "same_country"
  /** In a preferred region bucket but not an exact onboarding chip match */
  | "partial_match";

export interface SummaryCriterion {
  key: string;
  title: string;
  badgeLabel: string;
  state: SummaryMatchState;
}

/** Compact pay label for summary pills (e.g. 35-45/HR). */
export function formatCompensationShort(
  comp: Compensation | null | undefined,
): string | null {
  if (!comp) return null;
  const { min, max, period } = comp;
  const suffix =
    period === "hour" ? "/HR" : period === "month" ? "/MO" : "/YR";
  if (min != null && max != null) return `${min}-${max}${suffix}`;
  const single = max ?? min;
  if (single != null) return `${single}${suffix}`;
  return formatCompensation(comp)?.replace(/\$/g, "").trim() ?? null;
}

function categoryState(c?: CategoryScore): SummaryMatchState {
  if (!c || c.status === "unknown") return "unknown";
  return c.status === "match" ? "match" : "mismatch";
}

export function buildSummaryCriteria({
  parsedJob,
  parsedResume,
  profileDesiredCompensation,
  profileTimezone,
  jobDescription,
  breakdown,
  isGuest,
}: {
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileDesiredCompensation?: Compensation | null;
  profileTimezone?: string | null;
  jobDescription?: string | null;
  breakdown: CategoryScore[];
  isGuest: boolean;
}): SummaryCriterion[] {
  const lookup = (key: string) =>
    breakdown.find((c) => c.category === key);

  const criteria: SummaryCriterion[] = [];

  if (!isGuest) {
    const resumeAsk =
      parsedResume?.desiredCompensation ?? profileDesiredCompensation ?? null;
    const compDetail = buildCompensationDetail(
      parsedJob?.compensation,
      resumeAsk,
    );
    const compCategory = lookup("compensation");
    let compState = categoryState(compCategory);
    let compLabel =
      formatCompensationShort(resumeAsk) ??
      compDetail.resumeAskLabel?.replace(/\$/g, "").trim() ??
      "—";

    const jobOfferLabel =
      formatCompensationShort(parsedJob?.compensation) ??
      compDetail.jobOfferLabel?.replace(/\$/g, "").trim() ??
      null;

    const withinProfileRange = isHourlyCompensationWithinProfileRange(
      parsedJob?.compensation,
      resumeAsk,
    );

    if (withinProfileRange && jobOfferLabel) {
      compState = "match";
      compLabel = jobOfferLabel;
    } else if (compDetail.alignment === "within_range") {
      compState = "match";
      compLabel =
        formatCompensationShort(resumeAsk) ??
        jobOfferLabel ??
        compLabel;
    } else if (
      compDetail.alignment !== "unknown" &&
      compDetail.jobOfferLabel
    ) {
      compState = "mismatch";
      compLabel = jobOfferLabel ?? "—";
    } else if (compDetail.alignment === "unknown") {
      compState = "unknown";
      if (compLabel === "—" && compDetail.jobOfferLabel) {
        compLabel = compDetail.jobOfferLabel.replace(/\$/g, "").trim();
      }
    }

    criteria.push({
      key: "compensation",
      title: "Compensation",
      badgeLabel: compLabel,
      state: compState,
    });
  }

  const aiCategory = lookup("aiEmphasis");
  const aiDetail = buildAiEmphasisDetail(parsedJob, parsedResume, jobDescription);
  let aiState = categoryState(aiCategory);
  if (aiState === "unknown" && aiDetail) {
    if (isAiEmphasisPreferenceMatch(aiDetail)) {
      aiState = "match";
    } else if (aiDetail.missing.length > 0 && aiDetail.matched.length === 0) {
      aiState = "mismatch";
    }
  }
  criteria.push({
    key: "aiEmphasis",
    title: "AI Emphasis",
    badgeLabel:
      aiState === "unknown" ? "—" : aiState === "match" ? "YES" : "NO",
    state: aiState,
  });

  if (!isGuest) {
    const clientOrigin =
      parsedJob?.postingDetails?.clientOrigin?.trim() || null;
    const userTimezone =
      parsedResume?.timezone?.trim() || profileTimezone?.trim() || null;
    const tzSummary = buildClientOriginTimezoneSummary(clientOrigin, userTimezone, {
      jobDescription,
      clientCity: parsedJob?.postingDetails?.clientCity?.trim() || null,
    });
    criteria.push({
      key: "timezone",
      title: "Timezone",
      badgeLabel: tzSummary.label,
      state: clientOriginTimezoneToneToSummaryState(tzSummary.tone),
    });
  }

  return criteria;
}
