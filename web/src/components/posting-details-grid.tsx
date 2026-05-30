"use client";

import { SummaryFieldLabel } from "@/components/summary-field-label";
import { SummaryInfoBadge } from "@/components/summary-info-badge";
import {
  getPostingDetailBadgeIcon,
  isPostingDetailHighlightPositive,
  type PostingDetailHighlightContext,
} from "@/lib/posting-detail-highlights";
import type { PostingDetailRow } from "@/lib/posting-details";

export function PostingDetailFields({
  rows,
  highlightCtx,
  layout = "grid",
}: {
  rows: PostingDetailRow[];
  highlightCtx: PostingDetailHighlightContext;
  /** Single column for compact client cards; 2-col grid for role metadata. */
  layout?: "grid" | "stack";
}) {
  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-3 min-w-0"
          : "grid grid-cols-2 gap-x-4 gap-y-3 min-w-0"
      }
    >
      {rows.map((row) => (
        <div key={row.key} className="space-y-1.5 min-w-0">
          <SummaryFieldLabel>{row.title}</SummaryFieldLabel>
          <SummaryInfoBadge
            label={row.value}
            icon={getPostingDetailBadgeIcon(row.key, row.value)}
            muted={row.missing}
            positive={
              !row.missing &&
              isPostingDetailHighlightPositive(row.key, row.value, highlightCtx)
            }
          />
        </div>
      ))}
    </div>
  );
}
