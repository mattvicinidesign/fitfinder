"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatedScoreProgress } from "@/components/animated-score-progress";
import { FitScoreRatio } from "@/components/fit-score-ratio";
import { InfoTooltip } from "@/components/info-tooltip";
import {
  QUALIFICATION_SCORE_RING_SIZES,
  QualificationScoreCircle,
} from "@/components/qualification-score-circle";
import { resolveReportFitScore } from "@/lib/report-fit-score";
import { recommendFromFitScore } from "@/lib/recommendation-bands";
import {
  buildSemanticCategoryRollups,
  getSemanticReport,
  GLOBAL_SEMANTIC_SCORE_INFO,
} from "@/lib/semantic-report";
import { GLOBAL_SCORE_LABEL } from "@/lib/scoring-terminology";
import {
  scoreProgressClass,
  SCORE_PROGRESS_BAR_HEIGHT_CLASS,
  SCORE_PROGRESS_TRACK_CLASS,
} from "@/lib/score";
import { useAnimatedNumber } from "@/lib/use-score-reveal";
import type { ReportRollupOptions } from "@/lib/section-score-rollups";
import type { ScoreResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCORE_COLUMN_WIDTH = QUALIFICATION_SCORE_RING_SIZES.large;

function ScoringCategoryRollupRow({
  title,
  /** Weighted contribution toward overall (0–100 points). */
  contribution,
  animateDelay = 0,
}: {
  title: string;
  contribution: number | null;
  animateDelay?: number;
}) {
  const hasScore = contribution != null;
  const pct = hasScore ? Math.max(0, Math.min(100, contribution)) : 0;
  const scoreOnTen = hasScore ? pct / 10 : 0;
  const animatedScoreOnTen = useAnimatedNumber(scoreOnTen, {
    disabled: !hasScore,
    delay: animateDelay,
  });

  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-medium leading-snug text-foreground">
          {title}
        </span>
        {hasScore ? (
          <FitScoreRatio
            valueOnTen={animatedScoreOnTen}
            size="xs"
            equalParts
          />
        ) : (
          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-muted-foreground">
            —
          </span>
        )}
      </div>
      <AnimatedScoreProgress
        value={hasScore ? pct : 0}
        delay={animateDelay}
        trackClassName={cn(
          SCORE_PROGRESS_BAR_HEIGHT_CLASS,
          SCORE_PROGRESS_TRACK_CLASS,
        )}
        indicatorClassName={hasScore ? scoreProgressClass(pct) : "bg-transparent"}
      />
    </div>
  );
}

function WeightProfileBadge({
  label,
  weights,
}: {
  label: string;
  weights: { title: string; weight: number }[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={containerRef} className="relative inline-flex max-w-full">
      <button
        type="button"
        aria-label={`${label} weight profile. Show weighting details.`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-5 max-w-full items-center justify-center overflow-hidden rounded-4xl border border-primary/40 bg-primary/10 px-2 py-0.5",
          "text-[11px] font-medium whitespace-nowrap text-primary transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          open && "border-primary ring-2 ring-ring/40",
        )}
      >
        <span className="truncate">{label}</span>
      </button>
      {open ? (
        <span
          id={panelId}
          role="tooltip"
          className="absolute right-0 top-7 z-30 w-56 rounded-lg bg-white px-3 py-2.5 text-left shadow-xl ring-1 ring-black/10"
        >
          <span className="block text-[12px] font-semibold text-zinc-900">
            {label}
          </span>
          <span className="mt-1 block text-[11px] leading-snug text-zinc-600">
            Your selected Fit Score weighting profile. Change it anytime in
            Profile → Preferences.
          </span>
          <ul className="mt-2 space-y-1.5">
            {weights.map((row) => (
              <li
                key={row.title}
                className="flex items-center justify-between gap-3 text-[12px] text-zinc-900"
              >
                <span className="min-w-0 truncate">{row.title}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {Math.round(row.weight)}%
                </span>
              </li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}

/** Global score card: semantic category rollups (left) and 0–10 ring (right). */
export function QualificationScoreOverview({
  score,
  rollupOptions,
  weightProfileLabel,
}: {
  score: ScoreResult;
  rollupOptions: ReportRollupOptions;
  weightProfileLabel?: string;
}) {
  const report = getSemanticReport(score);
  const rollups = report ? buildSemanticCategoryRollups(report) : [];
  const reportFitScore = resolveReportFitScore(score, rollupOptions);

  const { recommendation, label: recommendationLabel } =
    recommendFromFitScore(reportFitScore);

  const titleId = `summary-${GLOBAL_SCORE_LABEL.replace(/\s+/g, "-").toLowerCase()}`;
  const weightRows = rollups
    .filter(
      (section) =>
        typeof section.weight === "number" && Number.isFinite(section.weight),
    )
    .map((section) => ({
      title: section.title,
      weight: section.weight,
    }));

  return (
    <section
      className="rounded-xl border border-border/80 bg-muted/35 px-3.5 py-3.5"
      aria-labelledby={titleId}
    >
      <div className="grid min-w-0 grid-cols-[1fr_auto] items-center gap-x-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            id={titleId}
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            {GLOBAL_SCORE_LABEL}
          </p>
          <InfoTooltip
            label={`About ${GLOBAL_SCORE_LABEL}`}
            text={GLOBAL_SEMANTIC_SCORE_INFO}
          />
        </div>
        <div
          className="flex shrink-0 justify-center"
          style={{ width: SCORE_COLUMN_WIDTH }}
        >
          {weightProfileLabel && weightRows.length > 0 ? (
            <WeightProfileBadge
              label={weightProfileLabel}
              weights={weightRows}
            />
          ) : weightProfileLabel ? (
            <span
              className={cn(
                "inline-flex h-5 max-w-full items-center justify-center overflow-hidden rounded-4xl border border-primary/40 bg-primary/10 px-2 py-0.5",
                "text-[11px] font-medium whitespace-nowrap text-primary",
              )}
              aria-label={`Weight profile: ${weightProfileLabel}`}
            >
              <span className="truncate">{weightProfileLabel}</span>
            </span>
          ) : null}
        </div>

        <div
          className="col-span-2 mt-5 grid min-w-0 grid-cols-[1fr_auto] items-start gap-x-4"
          role="region"
          aria-label={GLOBAL_SCORE_LABEL}
        >
          <div
            className="flex min-w-0 flex-col gap-3"
            role="list"
            aria-label="Weighted category contributions"
          >
            {rollups.map((section, index) => (
              <ScoringCategoryRollupRow
                key={section.id}
                title={section.title}
                contribution={section.contribution}
                animateDelay={index * 60}
              />
            ))}
          </div>
          <div
            className="flex shrink-0 justify-center"
            style={{ width: SCORE_COLUMN_WIDTH }}
          >
            <QualificationScoreCircle
              fitScore={reportFitScore}
              recommendationLabel={recommendationLabel}
              recommendation={recommendation}
              size="large"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
