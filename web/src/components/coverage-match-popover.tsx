"use client";

import { BreakdownAccordion } from "@/components/breakdown-accordion";
import { BreakdownMatchSections } from "@/components/breakdown-match-sections";
import {
  MATCHED_VIA_PREFIX,
  matchedSectionTitle,
  notMatchedSectionTitle,
} from "@/lib/breakdown-labels";
import type { CoverageMatchDetail } from "@/lib/types";

export interface CoverageMatchPopoverLabels {
  ariaLabel: string;
  expandHint: string;
  matchedSection: (count: number) => string;
  missingSection: (count: number) => string;
  resumeHitPrefix: string;
}

export function CoverageMatchPopover({
  items,
  labels,
  children,
  className,
  showBonusBadge = false,
}: {
  items: CoverageMatchDetail[];
  labels: CoverageMatchPopoverLabels;
  children: React.ReactNode;
  className?: string;
  showBonusBadge?: boolean;
}) {
  const matched = items.filter((i) => i.matched);
  const missing = items.filter((i) => !i.matched);

  return (
    <BreakdownAccordion
      summary={children}
      ariaLabel={labels.ariaLabel}
      expandHint={labels.expandHint}
      className={className}
    >
      <BreakdownMatchSections
        matched={matched}
        missing={missing}
        showBonusBadge={showBonusBadge}
        resumeHitPrefix={labels.resumeHitPrefix}
      />
    </BreakdownAccordion>
  );
}

export const SKILLS_POPOVER_LABELS: CoverageMatchPopoverLabels = {
  ariaLabel: "Skills match breakdown",
  expandHint: "skill list",
  matchedSection: matchedSectionTitle,
  missingSection: notMatchedSectionTitle,
  resumeHitPrefix: MATCHED_VIA_PREFIX,
};

export const WORKFLOW_POPOVER_LABELS: CoverageMatchPopoverLabels = {
  ariaLabel: "Workflow match breakdown",
  expandHint: "workflow list",
  matchedSection: matchedSectionTitle,
  missingSection: notMatchedSectionTitle,
  resumeHitPrefix: MATCHED_VIA_PREFIX,
};

export const TOOLS_POPOVER_LABELS: CoverageMatchPopoverLabels = {
  ariaLabel: "Tools match breakdown",
  expandHint: "tools list",
  matchedSection: matchedSectionTitle,
  missingSection: notMatchedSectionTitle,
  resumeHitPrefix: MATCHED_VIA_PREFIX,
};
