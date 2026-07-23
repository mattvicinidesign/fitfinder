"use client";

export function ReportSummaryHeader({ jobTitle }: { jobTitle: string }) {
  return (
    <div className="space-y-2 pt-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Job Fit Report Summary
      </p>
      <p className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">
        {jobTitle}
      </p>
    </div>
  );
}
