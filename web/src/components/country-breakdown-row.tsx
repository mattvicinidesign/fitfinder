"use client";

import { BreakdownAccordion } from "@/components/breakdown-accordion";
import { BreakdownMatchSections } from "@/components/breakdown-match-sections";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { buildCountryDetail } from "@/lib/country-match";
import { scoreColor, scoreProgressClass } from "@/lib/score";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CountryBreakdownRow({
  label,
  category,
  parsedJob,
  parsedResume,
  profileCountry,
}: {
  label: string;
  category?: CategoryScore;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileCountry?: string | null;
}) {
  const detail = buildCountryDetail(
    parsedJob,
    parsedResume,
    profileCountry,
    category,
  );

  const pct =
    category && category.status !== "unknown"
      ? Math.round(category.score)
      : detail.inferredScore;
  const showScore = pct != null;
  const showProgress =
    category?.status !== "unknown" ||
    (detail.outcome === "matched" || detail.outcome === "mismatched");

  const summary = (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15px] flex-1 min-w-0">{label}</span>
        <span
          className={cn(
            "text-[15px] font-medium tabular-nums",
            showScore ? scoreColor(pct!) : "text-muted-foreground",
          )}
        >
          {showScore ? `${pct}%` : "Unknown"}
        </span>
      </div>
      {showProgress && pct != null ? (
        <Progress value={pct} className="w-full gap-0">
          <ProgressTrack className="h-1.5">
            <ProgressIndicator className={scoreProgressClass(pct)} />
          </ProgressTrack>
        </Progress>
      ) : null}
      <p className="text-[12px] text-muted-foreground leading-snug">{detail.summary}</p>
    </>
  );

  const matchedItems =
    detail.outcome === "matched" && detail.jobRequirement
      ? [
          {
            label: detail.jobRequirement,
            resumeMatch: detail.candidateCountry ?? undefined,
          },
        ]
      : [];

  const missingItems =
    detail.outcome === "mismatched" && detail.jobRequirement
      ? [
          {
            label: detail.jobRequirement,
            subtext:
              detail.normalizedRequirement && detail.normalizedCandidate
                ? `Posting “${detail.normalizedRequirement}” vs yours “${detail.normalizedCandidate}”`
                : detail.candidateCountry
                  ? `Your country (${detail.candidateCountry}) does not match after normalization`
                  : null,
          },
        ]
      : [];

  const inPostingContext =
    detail.outcome === "no_job_requirement" ? (
      <>
        <p className="text-[15px] font-medium text-foreground leading-snug">
          No explicit requirement parsed
        </p>
        <p className="text-[11px] text-muted-foreground">
          The job parser did not extract countryRequirement — this row stays Unknown
          and is excluded from qualification weight.
        </p>
      </>
    ) : null;

  return (
    <BreakdownAccordion
      summary={summary}
      ariaLabel="Country match breakdown"
      expandHint="country details"
    >
      <div className="space-y-3 text-[13px] leading-snug">
        <BreakdownMatchSections
          matched={matchedItems}
          missing={missingItems}
          inPostingContext={inPostingContext}
        />

        <div className="space-y-1 border-t border-border/60 pt-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Your country
          </p>
          <p className="text-[15px] font-medium text-foreground leading-snug">
            {detail.candidateCountry ?? "Not detected"}
          </p>
          {detail.candidateSource === "resume" ? (
            <p className="text-[11px] text-muted-foreground">From resume parse</p>
          ) : detail.candidateSource === "profile" ? (
            <p className="text-[11px] text-muted-foreground">
              From Profile (resume parse omitted country)
            </p>
          ) : detail.outcome === "no_candidate_country" && detail.jobRequirement ? (
            <p className="text-[11px] text-muted-foreground">
              Set under Profile or on your resume, then re-analyze.
            </p>
          ) : null}
        </div>

        <ul className="text-[11px] text-muted-foreground leading-snug space-y-1.5 list-disc pl-4">
          {detail.edgeNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>
    </BreakdownAccordion>
  );
}
