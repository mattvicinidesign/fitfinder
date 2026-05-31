import { scoreColor } from "@/lib/score";
import type { AnalysisRecord } from "@/lib/types";

/** Single analysis row — iOS list style (canonical on Saved / History). */
export function IosAnalysisListRow({
  analysis: a,
  subtitle,
}: {
  analysis: AnalysisRecord;
  /** When set, replaces company name + recommendation (e.g. posting meta line). */
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 bg-background px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-semibold leading-tight truncate">
          {a.job_title ?? "Untitled role"}
        </p>
        {subtitle ? (
          <p className="text-[14px] text-muted-foreground leading-snug truncate mt-0.5">
            {subtitle}
          </p>
        ) : (
          <>
            {a.company_name ? (
              <p className="text-[15px] text-muted-foreground truncate">
                {a.company_name}
              </p>
            ) : null}
            {a.recommendation_label ? (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {a.recommendation_label}
              </p>
            ) : null}
          </>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`text-[28px] font-bold tabular-nums leading-none ${scoreColor(a.fit_score ?? 0)}`}>
          {Math.round(a.fit_score ?? 0)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Fit</p>
      </div>
    </div>
  );
}
