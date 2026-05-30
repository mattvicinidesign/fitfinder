"use client";

import {
  CoverageMatchPopover,
  SKILLS_POPOVER_LABELS,
} from "@/components/coverage-match-popover";
import type { CoverageMatchDetail } from "@/lib/types";

export function SkillsMatchPopover({
  items,
  children,
  className,
}: {
  items: CoverageMatchDetail[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CoverageMatchPopover
      items={items}
      labels={SKILLS_POPOVER_LABELS}
      className={className}
    >
      {children}
    </CoverageMatchPopover>
  );
}
