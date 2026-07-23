"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatedScoreProgress } from "@/components/animated-score-progress";
import { FitScoreRatio } from "@/components/fit-score-ratio";
import { ReportRevealSection } from "@/components/report-reveal-section";
import {
  matchScoreWeightsFromCategoryScores,
  normalizeSemanticCategoryScores,
} from "@/lib/semantic-report";
import {
  scoreProgressClass,
  SCORE_PROGRESS_BAR_HEIGHT_CLASS,
  SCORE_PROGRESS_TRACK_CLASS,
} from "@/lib/score";
import { useAnimatedNumber } from "@/lib/use-score-reveal";
import type {
  CompetencyMatchResult,
  Narrative,
  SemanticCategoryScore,
  SemanticMatchReport,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function resolveJobSourcePhrases(
  item: CompetencyMatchResult,
  phrasesByCompetencyId: Map<string, string[]>,
): string[] {
  const fromId = item.jobCompetencyId
    ? phrasesByCompetencyId.get(item.jobCompetencyId)
    : undefined;
  if (fromId && fromId.length > 0) return fromId;

  const needle = (item.jobLabel || item.canonicalLabel).trim().toLowerCase();
  if (!needle) return [];
  for (const [id, phrases] of phrasesByCompetencyId) {
    if (id.toLowerCase() === needle) return phrases;
  }
  // Fall back to the job label itself so the user still sees what was sought.
  const fallback = item.jobLabel.trim() || item.canonicalLabel.trim();
  return fallback ? [fallback] : [];
}

function CompetencyRow({
  item,
  jobSourcePhrases,
}: {
  item: CompetencyMatchResult;
  jobSourcePhrases: string[];
}) {
  const quote = jobSourcePhrases[0]?.trim() ?? "";

  return (
    <div className="space-y-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <p className="text-[14px] font-medium leading-snug text-foreground">
        {item.canonicalLabel}
      </p>
      {quote ? (
        <blockquote className="border-l-2 border-primary/50 pl-2.5 text-[13px] italic leading-relaxed text-muted-foreground">
          “{quote}”
        </blockquote>
      ) : null}
    </div>
  );
}

function CategoryCompetencyGroup({
  title,
  tone,
  items,
  emptyLabel,
  phrasesByCompetencyId,
}: {
  title: string;
  tone: "match" | "partial" | "missing";
  items: CompetencyMatchResult[];
  emptyLabel: string;
  phrasesByCompetencyId: Map<string, string[]>;
}) {
  const toneClass =
    tone === "match"
      ? "text-emerald-400"
      : tone === "partial"
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <div className="space-y-2">
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.12em]",
          toneClass,
        )}
      >
        {title}
        <span className="ml-1.5 font-medium tabular-nums text-muted-foreground">
          ({items.length})
        </span>
      </p>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <CompetencyRow
              key={`${title}-${item.jobCompetencyId || item.canonicalLabel}`}
              item={item}
              jobSourcePhrases={resolveJobSourcePhrases(
                item,
                phrasesByCompetencyId,
              )}
            />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}

function SemanticCategoryCard({
  category,
  phrasesByCompetencyId,
  animateDelay = 0,
}: {
  category: SemanticCategoryScore;
  phrasesByCompetencyId: Map<string, string[]>;
  animateDelay?: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Weighted contribution toward Overall Match (updates when profile changes).
  const contribution = Math.max(
    0,
    Math.min(100, Number(category.contribution) || 0),
  );
  const scoreOnTen = contribution / 10;
  const animatedScoreOnTen = useAnimatedNumber(scoreOnTen, {
    delay: animateDelay,
  });
  const titleId = `category-${category.category}`;

  function toggleOpen() {
    setOpen((value) => !value);
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-border/80 bg-muted/35 transition-colors",
        "hover:bg-muted/45",
      )}
      aria-labelledby={titleId}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full cursor-pointer rounded-xl px-3.5 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleOpen();
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            id={titleId}
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            {category.label}
          </p>
        <FitScoreRatio
          valueOnTen={animatedScoreOnTen}
          size="xs"
          equalParts
        />
        </div>

        <div className="mt-2 space-y-3">
          <AnimatedScoreProgress
            value={contribution}
            delay={animateDelay}
            trackClassName={cn(
              SCORE_PROGRESS_BAR_HEIGHT_CLASS,
              SCORE_PROGRESS_TRACK_CLASS,
            )}
            indicatorClassName={scoreProgressClass(contribution)}
          />
          <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
            <div className="rounded-md bg-emerald-500/10 px-2 py-1.5">
              <div className="font-semibold text-foreground">
                {category.matched.length}
              </div>
              <div className="text-muted-foreground">Match</div>
            </div>
            <div className="rounded-md bg-amber-500/10 px-2 py-1.5">
              <div className="font-semibold text-foreground">
                {category.partial.length}
              </div>
              <div className="text-muted-foreground">Partial</div>
            </div>
            <div className="rounded-md bg-rose-500/10 px-2 py-1.5">
              <div className="font-semibold text-foreground">
                {category.missing.length}
              </div>
              <div className="text-muted-foreground">Missing</div>
            </div>
          </div>
          <span className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 pt-3 text-[11px] font-medium text-primary">
            <span>View Details</span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-primary transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </div>
      </div>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={`${category.label} competency details`}
          className="space-y-4 border-t border-border/60 px-3.5 pb-3.5 pt-3"
        >
          <CategoryCompetencyGroup
            title="Match"
            tone="match"
            items={category.matched}
            emptyLabel="No strong matches in this category."
            phrasesByCompetencyId={phrasesByCompetencyId}
          />
          <CategoryCompetencyGroup
            title="Partial"
            tone="partial"
            items={category.partial}
            emptyLabel="No partial matches in this category."
            phrasesByCompetencyId={phrasesByCompetencyId}
          />
          <CategoryCompetencyGroup
            title="Missing"
            tone="missing"
            items={category.missing}
            emptyLabel="No missing requirements in this category."
            phrasesByCompetencyId={phrasesByCompetencyId}
          />
        </div>
      ) : null}
    </section>
  );
}

export function SemanticMatchReportSections({
  report,
}: {
  report: SemanticMatchReport;
  narrative?: Narrative;
}) {
  const categories = normalizeSemanticCategoryScores(
    report.categoryScores,
    matchScoreWeightsFromCategoryScores(report.categoryScores),
  );

  const phrasesByCompetencyId = new Map<string, string[]>();
  for (const competency of report.jobCanonical?.competencies ?? []) {
    const phrases = (competency.sourcePhrases ?? [])
      .map((phrase) => phrase.trim())
      .filter(Boolean);
    if (phrases.length === 0) continue;
    phrasesByCompetencyId.set(competency.id, phrases);
    phrasesByCompetencyId.set(competency.canonicalLabel.toLowerCase(), phrases);
  }

  return (
    <div className="w-full space-y-3">
      {categories.map((category, index) => (
        <ReportRevealSection key={category.category}>
          <SemanticCategoryCard
            category={category}
            phrasesByCompetencyId={phrasesByCompetencyId}
            animateDelay={index * 60}
          />
        </ReportRevealSection>
      ))}
    </div>
  );
}
