"use client";

import type { ReactNode } from "react";
import { BreakdownMatchList, type BreakdownMatchItem } from "@/components/breakdown-match-lists";
import {
  IN_POSTING_HEADING,
  matchedSectionTitle,
  notMatchedSectionTitle,
  MATCHED_VIA_PREFIX,
} from "@/lib/breakdown-labels";

/** Standard accordion body order: Matched → In posting, not matched → optional In posting context. */
export function BreakdownMatchSections({
  matched,
  missing,
  inPostingContext,
  showBonusBadge = false,
  resumeHitPrefix = MATCHED_VIA_PREFIX,
}: {
  matched: BreakdownMatchItem[];
  missing: BreakdownMatchItem[];
  /** Optional “In posting” block shown after match lists (e.g. parsed posting role). */
  inPostingContext?: ReactNode;
  showBonusBadge?: boolean;
  resumeHitPrefix?: string;
}) {
  return (
    <>
      <BreakdownMatchList
        title={matchedSectionTitle(matched.length)}
        items={matched}
        variant="matched"
        resumeHitPrefix={resumeHitPrefix}
        showBonusBadge={showBonusBadge}
      />
      <BreakdownMatchList
        title={notMatchedSectionTitle(missing.length)}
        items={missing}
        variant="missing"
        resumeHitPrefix={resumeHitPrefix}
        showBonusBadge={showBonusBadge}
      />
      {inPostingContext ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {IN_POSTING_HEADING}
          </p>
          {inPostingContext}
        </div>
      ) : null}
    </>
  );
}
