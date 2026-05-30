"use client";

import { BreakdownAccordion } from "@/components/breakdown-accordion";
import { BreakdownMatchSections } from "@/components/breakdown-match-sections";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { buildArchetypeDetail } from "@/lib/archetype-match";
import { scoreColor, scoreProgressClass } from "@/lib/score";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ArchetypeBreakdownRow({
  label,
  category,
  parsedJob,
  parsedResume,
  jobTitle,
}: {
  label: string;
  category: CategoryScore;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  jobTitle?: string | null;
}) {
  const pct = Math.round(category.score);
  const detail = parsedJob
    ? buildArchetypeDetail(parsedJob, parsedResume, jobTitle)
    : null;

  const best = detail?.comparisons.find((c) => c.isBest);
  const strongMatch = (detail?.bestScore ?? 0) >= 50;

  const summary = (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[15px] flex-1 min-w-0">{label}</span>
        <span className={cn("text-[15px] font-medium tabular-nums", scoreColor(pct))}>
          {pct}%
        </span>
      </div>
      <Progress value={pct} className="w-full gap-0">
        <ProgressTrack className="h-1.5">
          <ProgressIndicator className={scoreProgressClass(pct)} />
        </ProgressTrack>
      </Progress>
      {detail?.jobRole && best ? (
        <p className="text-[12px] text-muted-foreground leading-snug">
          Posting seeks <span className="font-medium text-foreground">{detail.jobRole}</span>
          {" · "}
          {strongMatch ? "matched via" : "closest on resume"}:{" "}
          <span className="font-medium text-foreground">{best.label}</span> ({best.score}%)
        </p>
      ) : null}
    </>
  );

  if (!detail?.jobRole) {
    return <div className="py-3 border-b border-border/80 space-y-2">{summary}</div>;
  }

  const matchedItems = strongMatch
    ? [
        {
          label: detail.jobRole,
          resumeMatch: best?.label,
          subtext: best ? `${best.score}% · ${best.source}` : undefined,
        },
      ]
    : [];

  const missingItems = !strongMatch
    ? [
        {
          label: detail.jobRole,
          subtext: best
            ? `Closest on resume: ${best.label} (${best.score}% — need 50%+ to match)`
            : "No comparable roles on resume",
        },
      ]
    : [];

  return (
    <BreakdownAccordion
      summary={summary}
      ariaLabel="Archetype match breakdown"
      expandHint="role comparison"
    >
      <div className="space-y-3 text-[13px] leading-snug">
        <BreakdownMatchSections
          matched={matchedItems}
          missing={missingItems}
          inPostingContext={
            strongMatch ? (
              <>
                <p className="text-[15px] font-medium text-foreground leading-snug">
                  {detail.jobRole}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Role title or archetype parsed from the job posting.
                </p>
              </>
            ) : null
          }
        />

        {detail.comparisons.length > 0 ? (
          <div className="space-y-1 border-t border-border/60 pt-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Compared on your resume
            </p>
            <ul className="space-y-1.5 text-[12px] text-muted-foreground">
              {detail.comparisons.map((c) => (
                <li key={`${c.label}-${c.source}`}>
                  {c.label} — {c.score}% ({c.source})
                  {c.isBest ? " · best match" : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            No role titles or archetypes found on your resume to compare.
          </p>
        )}
      </div>
    </BreakdownAccordion>
  );
}
