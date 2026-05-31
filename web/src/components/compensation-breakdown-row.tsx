"use client";

import { BreakdownAccordion } from "@/components/breakdown-accordion";
import { BreakdownMatchSections } from "@/components/breakdown-match-sections";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { buildCompensationDetail } from "@/lib/compensation-match";
import { scoreColor, scoreProgressClass } from "@/lib/score";
import type { CategoryScore, Compensation, ParsedJob, ParsedResume } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CompensationBreakdownRow({
  label,
  category,
  parsedJob,
  parsedResume,
  profileDesiredCompensation,
}: {
  label: string;
  category: CategoryScore;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileDesiredCompensation?: Compensation | null;
}) {
  const resumeAsk: Compensation | null | undefined =
    parsedResume?.desiredCompensation ?? profileDesiredCompensation ?? null;
  const askFromProfile =
    !parsedResume?.desiredCompensation && profileDesiredCompensation != null;

  const detail = buildCompensationDetail(parsedJob?.compensation, resumeAsk);
  const pct =
    category.status !== "unknown"
      ? Math.round(category.score)
      : detail.score != null
        ? detail.score
        : null;
  const showScore = pct != null;

  const offerLabel = detail.jobOfferLabel ?? "Not detected in job parse";
  const askLabel = detail.resumeAskLabel ?? "Not set";
  const canCompare = detail.alignment !== "unknown" && detail.jobOfferLabel != null && detail.resumeAskLabel != null;

  const matchedItems =
    canCompare && detail.alignment === "within_range"
      ? [{ label: offerLabel, resumeMatch: askLabel }]
      : [];

  const missingItems =
    canCompare && detail.alignment !== "within_range"
      ? [
          {
            label: offerLabel,
            subtext: `${askLabel} — ${alignmentNote(detail.alignment)}`,
          },
        ]
      : [];

  const summary = (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15px] flex-1 min-w-0">{label}</span>
        <span
          className={cn(
            "text-[15px] font-medium tabular-nums",
            showScore ? scoreColor(pct) : "text-muted-foreground",
          )}
        >
          {showScore && pct != null ? `${pct}%` : "Unknown"}
        </span>
      </div>
      {showScore && pct != null ? (
        <Progress value={pct} className="w-full gap-0">
          <ProgressTrack className="h-1.5">
            <ProgressIndicator className={scoreProgressClass(pct)} />
          </ProgressTrack>
        </Progress>
      ) : null}
      <p className="text-[12px] text-muted-foreground leading-snug">{detail.summary}</p>
    </>
  );

  return (
    <BreakdownAccordion
      summary={summary}
      ariaLabel="Compensation comparison"
      expandHint="compensation comparison"
    >
      <div className="space-y-3 text-[13px] leading-snug">
        <BreakdownMatchSections
          matched={matchedItems.map((item) => ({
            ...item,
            subtext:
              detail.annualOfferMax != null
                ? `~${formatAnnual(detail.annualOfferMin, detail.annualOfferMax)} / year (normalized)`
                : undefined,
          }))}
          missing={missingItems}
          inPostingContext={
            !detail.jobOfferLabel ? (
              <>
                <p className="text-[15px] font-medium text-foreground">
                  Not detected in job parse
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Paste a job description with salary or rate to compare compensation.
                </p>
              </>
            ) : null
          }
        />

        <div className="space-y-1 border-t border-border/60 pt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            You are asking for
          </p>
          <p className="text-[15px] font-medium text-foreground">{askLabel}</p>
          {askFromProfile ? (
            <p className="text-[11px] text-muted-foreground">
              From your Profile
            </p>
          ) : null}
          {detail.annualAsk != null ? (
            <p className="text-[11px] text-muted-foreground">
              ~{formatAnnual(detail.annualAsk, detail.annualAsk)} / year (midpoint of your range)
            </p>
          ) : null}
        </div>

        {detail.alignment !== "unknown" && detail.score != null ? (
          <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
            Score {detail.score}% (55%+ = match). Posting offer is compared to your ask using
            annualized midpoint of each range.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
            Set desired pay in Profile and paste a job description with salary or rate to score
            this category.
          </p>
        )}
      </div>
    </BreakdownAccordion>
  );
}

function formatAnnual(min: number | null, max: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(max);
}

function alignmentNote(alignment: string): string {
  switch (alignment) {
    case "within_range":
      return "within posting range";
    case "above_offer":
      return "above posting range";
    case "below_offer":
      return "below posting range";
    default:
      return "";
  }
}
