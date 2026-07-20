"use client";

import { AnimatedScoreProgress } from "@/components/animated-score-progress";
import { ReportRevealSection } from "@/components/report-reveal-section";
import { SummarySectionCard } from "@/components/summary-section-card";
import {
  GLOBAL_SEMANTIC_SCORE_INFO,
  importanceLabel,
  matchKindLabel,
  normalizeSemanticCategoryScores,
} from "@/lib/semantic-report";
import {
  scoreColor,
  scoreProgressClass,
  SCORE_PROGRESS_BAR_HEIGHT_CLASS,
  SCORE_PROGRESS_TRACK_CLASS,
} from "@/lib/score";
import type {
  CompetencyMatchResult,
  Narrative,
  SemanticCategoryScore,
  SemanticMatchReport,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function CompetencyRow({ item }: { item: CompetencyMatchResult }) {
  const via =
    item.resumeLabel && item.resumeLabel !== item.jobLabel
      ? ` via ${item.resumeLabel}`
      : "";

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[14px] font-medium text-foreground leading-snug">
            {item.canonicalLabel}
          </p>
          {item.jobLabel !== item.canonicalLabel ? (
            <p className="text-[12px] text-muted-foreground">
              Job: {item.jobLabel}
              {via}
            </p>
          ) : via ? (
            <p className="text-[12px] text-muted-foreground">Resume{via}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right space-y-0.5">
          <span
            className={cn(
              "text-[13px] font-semibold tabular-nums",
              scoreColor(item.similarityScore),
            )}
          >
            {item.similarityScore}%
          </span>
          <p className="text-[11px] text-muted-foreground">
            {matchKindLabel(item.matchKind)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span>{importanceLabel(item.importance)}</span>
        {item.evidenceCount > 0 ? (
          <span>Evidence ×{item.evidenceCount}</span>
        ) : null}
      </div>
      {item.reasoning ? (
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          {item.reasoning}
        </p>
      ) : null}
    </div>
  );
}

function CompetencyListSection({
  title,
  info,
  items,
  emptyLabel,
  animateDelay = 0,
}: {
  title: string;
  info: string;
  items: CompetencyMatchResult[];
  emptyLabel: string;
  animateDelay?: number;
}) {
  return (
    <ReportRevealSection>
      <SummarySectionCard title={title} info={info}>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <CompetencyRow key={item.jobCompetencyId} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground">{emptyLabel}</p>
        )}
      </SummarySectionCard>
    </ReportRevealSection>
  );
}

function SemanticCategoryCard({
  category,
  animateDelay = 0,
}: {
  category: SemanticCategoryScore;
  animateDelay?: number;
}) {
  const pct = Math.round(category.score);

  return (
    <SummarySectionCard
      title={category.label}
      info={category.reasoning || `${category.label} category score based on normalized competency matches.`}
    >
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-muted-foreground">
            Weight {category.weight}%
          </span>
          <span className={cn("text-[15px] font-semibold tabular-nums", scoreColor(pct))}>
            {pct}%
          </span>
        </div>
        <AnimatedScoreProgress
          value={pct}
          delay={animateDelay}
          trackClassName={cn(
            SCORE_PROGRESS_BAR_HEIGHT_CLASS,
            SCORE_PROGRESS_TRACK_CLASS,
          )}
          indicatorClassName={scoreProgressClass(pct)}
        />
        <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
          <div className="rounded-md bg-emerald-500/10 px-2 py-1.5">
            <div className="font-semibold text-foreground">{category.matched.length}</div>
            <div className="text-muted-foreground">Match</div>
          </div>
          <div className="rounded-md bg-amber-500/10 px-2 py-1.5">
            <div className="font-semibold text-foreground">{category.partial.length}</div>
            <div className="text-muted-foreground">Partial</div>
          </div>
          <div className="rounded-md bg-rose-500/10 px-2 py-1.5">
            <div className="font-semibold text-foreground">{category.missing.length}</div>
            <div className="text-muted-foreground">Missing</div>
          </div>
        </div>
      </div>
    </SummarySectionCard>
  );
}

function BulletListSection({
  title,
  info,
  items,
  emptyLabel,
}: {
  title: string;
  info: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <ReportRevealSection>
      <SummarySectionCard title={title} info={info}>
        {items.length > 0 ? (
          <ul className="space-y-2 text-[14px] text-foreground leading-relaxed">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-primary shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">{emptyLabel}</p>
        )}
      </SummarySectionCard>
    </ReportRevealSection>
  );
}

export function SemanticMatchReportSections({
  report,
  narrative,
}: {
  report: SemanticMatchReport;
  narrative?: Narrative;
}) {
  const categories = normalizeSemanticCategoryScores(report.categoryScores);

  const aiSummary =
    report.scoreReasoning?.trim() ||
    narrative?.recommendations?.join(" ") ||
    "";

  return (
    <div className="space-y-3 w-full">
      <ReportRevealSection>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((category, index) => (
            <SemanticCategoryCard
              key={category.category}
              category={category}
              animateDelay={index * 60}
            />
          ))}
        </div>
      </ReportRevealSection>

      <CompetencyListSection
        title="Matched Competencies"
        info="Job requirements with strong resume evidence after semantic normalization."
        items={report.matchedCompetencies}
        emptyLabel="No strong competency matches identified."
        animateDelay={200}
      />

      <CompetencyListSection
        title="Partial Matches"
        info="Related competencies where resume evidence is present but not a complete match."
        items={report.partialCompetencies}
        emptyLabel="No partial competency matches."
        animateDelay={250}
      />

      <CompetencyListSection
        title="Missing Competencies"
        info="Job requirements without credible resume evidence. Required gaps weigh more heavily."
        items={report.missingCompetencies}
        emptyLabel="No major competency gaps detected."
        animateDelay={300}
      />

      <BulletListSection
        title="Candidate Strengths"
        info="Top areas where your resume strongly supports this role."
        items={report.strengths}
        emptyLabel="Strengths will appear after analysis."
      />

      <BulletListSection
        title="Improvement Opportunities"
        info="Gaps and areas to address in your application or resume."
        items={report.weaknesses}
        emptyLabel="No major improvement areas flagged."
      />

      <ReportRevealSection>
        <SummarySectionCard
          title="AI Summary"
          info={GLOBAL_SEMANTIC_SCORE_INFO}
        >
          {aiSummary ? (
            <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap">
              {aiSummary}
            </p>
          ) : (
            <p className="text-[14px] text-muted-foreground">
              Summary will appear after analysis.
            </p>
          )}
        </SummarySectionCard>
      </ReportRevealSection>
    </div>
  );
}
