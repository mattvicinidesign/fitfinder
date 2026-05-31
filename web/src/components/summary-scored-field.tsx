"use client";

import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryInfoBadge } from "@/components/summary-info-badge";
import { SummaryMatchBadge } from "@/components/summary-match-badge";
import { getPostingDetailBadgeIcon } from "@/lib/posting-detail-highlights";
import type { SectionFieldScore } from "@/lib/section-field-scoring";
import { scoringItemAriaLabel } from "@/lib/scoring-terminology";

/** One scoring item inside a scoring category card (label + pill). */
export function SummaryScoredField({
  field: f,
  postingDetailKey,
}: {
  field: SectionFieldScore;
  /** When set, US flag etc. for posting detail keys. */
  postingDetailKey?: string;
}) {
  const icon =
    postingDetailKey && f.identified
      ? getPostingDetailBadgeIcon(postingDetailKey, f.badgeLabel)
      : undefined;

  return (
    <div
      className="space-y-1.5 min-w-0"
      role="group"
      aria-label={scoringItemAriaLabel(f.title, f.badgeLabel)}
    >
      <SummaryFieldLabel>{f.title}</SummaryFieldLabel>
      {!f.identified ? (
        <span className="text-[11px] font-medium text-muted-foreground">
          {f.badgeLabel}
        </span>
      ) : f.state === "unknown" ? (
        <SummaryMatchBadge label={f.badgeLabel} state="unknown" />
      ) : f.state === "match" ? (
        <SummaryInfoBadge label={f.badgeLabel} icon={icon} positive />
      ) : f.state === "same_country" ? (
        <SummaryMatchBadge label={f.badgeLabel} state="same_country" />
      ) : (
        <SummaryMatchBadge label={f.badgeLabel} state="mismatch" />
      )}
    </div>
  );
}
