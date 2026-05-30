import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { scoreColor } from "@/lib/score";
import { RECOMMENDATION_LABELS, type AnalysisRecord } from "@/lib/types";

export function AnalysisCard({ analysis: a }: { analysis: AnalysisRecord }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-base leading-snug">
          {a.job_title ?? "Untitled role"}
          {a.company_name ? (
            <span className="block text-sm font-normal text-muted-foreground">
              {a.company_name}
            </span>
          ) : null}
        </CardTitle>
        {a.recommendation ? (
          <Badge variant="secondary">
            {RECOMMENDATION_LABELS[a.recommendation]}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="flex items-end gap-6">
        <div>
          <div className="text-xs text-muted-foreground">Fit</div>
          <div className={`text-3xl font-semibold ${scoreColor(a.fit_score ?? 0)}`}>
            {Math.round(a.fit_score ?? 0)}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <div>Qualification {Math.round(a.qualification_score ?? 0)}</div>
          <div>Confidence {Math.round(a.confidence_score ?? 0)}</div>
        </div>
        <time className="ml-auto text-xs text-muted-foreground">
          {new Date(a.created_at).toLocaleDateString()}
        </time>
      </CardContent>
    </Card>
  );
}
