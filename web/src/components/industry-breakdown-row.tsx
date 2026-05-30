"use client";

import { BreakdownAccordion } from "@/components/breakdown-accordion";
import { BreakdownMatchSections } from "@/components/breakdown-match-sections";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { buildIndustryDetail, type IndustryJobMatch } from "@/lib/industry-match";
import { scoreColor, scoreProgressClass } from "@/lib/score";
import type { CategoryScore, ParsedJob, ParsedResume } from "@/lib/types";
import { cn } from "@/lib/utils";

export function IndustryBreakdownRow({
  label,
  category,
  parsedJob,
  parsedResume,
  profileQualifiedIndustries,
}: {
  label: string;
  category: CategoryScore;
  parsedJob?: ParsedJob;
  parsedResume?: ParsedResume | null;
  profileQualifiedIndustries?: string[] | null;
}) {
  const detail = parsedJob
    ? buildIndustryDetail(parsedJob, parsedResume, profileQualifiedIndustries)
    : null;
  const inferredPct = detail?.bestScore ?? 0;
  const hasComparable =
    (detail?.jobIndustries.length ?? 0) > 0 &&
    (detail?.resumeIndustries.length ?? 0) > 0;
  const pct =
    category.status !== "unknown"
      ? Math.round(category.score)
      : hasComparable
        ? Math.round(inferredPct)
        : 0;
  const showScore =
    category.status !== "unknown" || (hasComparable && inferredPct > 0);
  const bestJobMatch = detail?.matches.length
    ? [...detail.matches].sort((a, b) => b.score - a.score)[0]
    : null;

  const caption = (() => {
    if (!detail) {
      return category.status === "unknown"
        ? "No industries detected in the job posting or resume parse."
        : null;
    }
    if (detail.jobIndustries.length === 0) {
      return `Your resume lists ${detail.resumeIndustries.join(", ")} — posting did not specify target industries.`;
    }
    if (detail.resumeIndustries.length === 0) {
      return `Posting targets ${detail.jobIndustries.join(", ")} — matched via your profile qualifications.`;
    }
    if (bestJobMatch) {
      return (
        <>
          Posting: <span className="font-medium text-foreground">{bestJobMatch.jobIndustry}</span>
          {" · "}
          matched via:{" "}
          <span className="font-medium text-foreground">
            {bestJobMatch.bestResumeIndustry ?? "—"}
          </span>
          {" "}({bestJobMatch.score}%)
        </>
      );
    }
    return null;
  })();

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
          {showScore ? `${pct}%` : "Unknown"}
        </span>
      </div>
      {showScore ? (
        <Progress value={pct} className="w-full gap-0">
          <ProgressTrack className="h-1.5">
            <ProgressIndicator className={scoreProgressClass(pct)} />
          </ProgressTrack>
        </Progress>
      ) : null}
      {caption ? (
        <p className="text-[12px] text-muted-foreground leading-snug">{caption}</p>
      ) : null}
    </>
  );

  if (!detail) {
    return <div className="py-3 border-b border-border/80 space-y-2">{summary}</div>;
  }

  const matched = detail.matches.filter((m) => m.strongMatch);
  const missing = detail.matches.filter((m) => !m.strongMatch);

  function industryMatchHint(m: IndustryJobMatch): string | null {
    if (!m.bestResumeIndustry) return null;
    let hint = m.bestResumeIndustry;
    if (m.sameCluster && m.score >= 85 && m.score < 100) {
      hint += " (related vertical)";
    } else if (m.score === 60) {
      hint += " (adjacent vertical)";
    }
    return hint;
  }

  return (
    <BreakdownAccordion
      summary={summary}
      ariaLabel="Industry match breakdown"
      expandHint="industry list"
    >
      {detail.jobIndustries.length > 0 ? (
        <BreakdownMatchSections
          matched={matched.map((m) => ({
            label: m.jobIndustry,
            resumeMatch: industryMatchHint(m) ?? undefined,
            subtext: `${m.score}%`,
          }))}
          missing={missing.map((m) => ({ label: m.jobIndustry }))}
        />
      ) : (
        <BreakdownMatchSections
          matched={[]}
          missing={[]}
          inPostingContext={
            <p className="text-[15px] font-medium text-foreground leading-snug">
              No target industries parsed from the posting
            </p>
          }
        />
      )}

      <p className="text-[11px] text-muted-foreground leading-snug border-t border-border/60 pt-2">
        Posting verticals are matched against your profile qualifications and any
        industries parsed from your resume (qualifications are not listed on the resume).
        Score uses the strongest posting match (50%+ = match); related verticals
        (e.g. MarTech + AdTech) can score up to 85%.
      </p>
    </BreakdownAccordion>
  );
}
