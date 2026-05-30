import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { scoreColor } from "@/lib/score";
import { RECOMMENDATION_LABELS, type AnalysisRecord } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analyses")
    .select(
      "id, company_name, job_title, fit_score, qualification_score, confidence_score, recommendation, created_at",
    )
    .order("created_at", { ascending: false });

  const analyses = (data ?? []) as AnalysisRecord[];

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Saved analyses
          </h1>
          <p className="mt-1 text-muted-foreground">
            Every analysis you run is stored here for comparison.
          </p>
        </div>
        <Link href="/analyze" className={buttonVariants()}>
          New analysis
        </Link>
      </div>

      {analyses.length === 0 ? (
        <div className="mt-10 flex min-h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          No analyses yet. Run your first one from the Analyze tab.
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {analyses.map((a) => (
            <Card key={a.id}>
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
                  <div
                    className={`text-3xl font-semibold ${scoreColor(a.fit_score ?? 0)}`}
                  >
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
          ))}
        </div>
      )}
    </main>
  );
}
