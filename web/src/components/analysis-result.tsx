"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveJobButton } from "@/components/save-job-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { scoreColor } from "@/lib/score";
import {
  RECOMMENDATION_LABELS,
  type AnalysisResult,
  type Narrative,
} from "@/lib/types";

function ScoreStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-2xl font-semibold ${scoreColor(value)}`}>
          {Math.round(value)}
        </span>
      </div>
      <Progress value={value} className="mt-1.5" />
    </div>
  );
}

function NarrativeList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisResultView({
  result,
  analysisId = null,
}: {
  result: AnalysisResult;
  analysisId?: string | null;
}) {
  const { score, narrative } = result;
  const adj = score.careerFitAdjustment;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg">
              {result.jobTitle ?? "Job"}
              {result.companyName ? ` · ${result.companyName}` : ""}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Career-fit adjustment{" "}
              <span className={adj >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {adj >= 0 ? "+" : ""}
                {adj}
              </span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="text-sm">
              {RECOMMENDATION_LABELS[score.recommendation]}
            </Badge>
            <SaveJobButton analysisId={analysisId} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <ScoreStat label="Fit score" value={score.fitScore} />
          <ScoreStat label="Qualification" value={score.qualificationScore} />
          <ScoreStat label="Confidence" value={score.confidenceScore} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Narrative analysis</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <NarrativeList title="Strengths" items={narrative.strengths} />
          <NarrativeList title="Gaps" items={narrative.gaps} />
          <NarrativeList
            title="Recommendations"
            items={narrative.recommendations}
          />
          <NarrativeList
            title="Positive signals"
            items={narrative.positiveSignals}
          />
          <NarrativeList
            title="Negative signals"
            items={narrative.negativeSignals}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export type { Narrative };
