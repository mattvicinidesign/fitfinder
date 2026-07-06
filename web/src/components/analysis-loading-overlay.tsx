"use client";

import { cn } from "@/lib/utils";

const STATUS_COPY: Record<string, string> = {
  "Parsing resume…":
    "Extracting skills, experience, and work history from your resume.",
  "Scoring fit…":
    "Comparing your profile to the job and building your fit report.",
};

function loadingDetail(status: string): string {
  return (
    STATUS_COPY[status] ??
    "This usually takes a few seconds. Please keep the app open."
  );
}

export function AnalysisLoadingOverlay({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-30 flex flex-col items-center justify-center bg-background px-8",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={status}
    >
      <div className="relative size-14" aria-hidden>
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary" />
      </div>
      <p className="mt-6 text-center text-[18px] font-semibold text-foreground">
        {status}
      </p>
      <p className="mt-2 max-w-[18rem] text-center text-[14px] leading-snug text-muted-foreground">
        {loadingDetail(status)}
      </p>
    </div>
  );
}
